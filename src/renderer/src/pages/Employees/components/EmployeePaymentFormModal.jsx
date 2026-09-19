import React, { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { electronAPI } from '../../../utils/electron';

const paymentSchema = z.object({
  employeeId: z.string().min(1, 'يرجى اختيار موظف'),
  amount: z.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  notes: z.string().optional(),
});

export default function EmployeePaymentFormModal({ open, onClose, editingPayment, employees, onSuccess }) {
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: { employeeId: '', amount: '', notes: '' },
  });

  useEffect(() => {
    if (editingPayment) {
      reset({
        employeeId: editingPayment.employeeId.toString(),
        amount: editingPayment.amount,
        notes: editingPayment.notes || '',
      });
    } else {
      reset({ employeeId: '', amount: '', notes: '' });
    }
  }, [editingPayment, reset, open]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        employeeId: parseInt(data.employeeId),
        amount: parseFloat(data.amount),
        notes: data.notes || null,
      };
      if (editingPayment) {
        const res = await electronAPI.employeePayment.update(editingPayment.id, payload);
        if (!res.success) throw new Error(res.error);
        return res.data;
      } else {
        const res = await electronAPI.employeePayment.create(payload);
        if (!res.success) throw new Error(res.error);
        return res.data;
      }
    },
    onSuccess: () => onSuccess(),
    onError: (err) => alert(err.message),
  });

  const onSubmit = (data) => mutation.mutate(data);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth dir="rtl">
      <DialogTitle>{editingPayment ? 'تعديل الدفعة' : 'إضافة دفعة جديدة'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {mutation.isError && <Alert severity="error" sx={{ mb: 2 }}>{mutation.error.message}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="employee-select-label">الموظف</InputLabel>
              <Controller
                name="employeeId"
                control={control}
                render={({ field }) => (
                  <Select
                    labelId="employee-select-label"
                    label="الموظف"
                    {...field}
                    error={!!errors.employeeId}
                    disabled={!!editingPayment}
                  >
                    {employees.map(emp => (
                      <MenuItem key={emp.id} value={emp.id.toString()}>
                        {emp.fullName}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              {errors.employeeId && <Typography color="error" variant="caption">{errors.employeeId.message}</Typography>}
            </FormControl>
            <Controller
              name="amount"
              control={control}
              render={({ field }) => (
                <TextField
                  label="المبلغ (د.ج)"
                  type="number"
                  fullWidth
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  error={!!errors.amount}
                  helperText={errors.amount?.message}
                  InputProps={{ inputProps: { step: '0.01', min: 0 } }}
                />
              )}
            />
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <TextField
                  label="ملاحظات"
                  fullWidth
                  multiline
                  rows={2}
                  {...field}
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>إلغاء</Button>
          <Button type="submit" variant="contained" loading={mutation.isPending}>
            {editingPayment ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}