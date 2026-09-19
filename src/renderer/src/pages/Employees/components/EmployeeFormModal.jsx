import React, { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
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
import { electronAPI } from '../../../utils/electron';

const employeeSchema = z.object({
  fullName: z.string().min(2, 'الاسم الكامل مطلوب'),
  phone: z.string().optional(),
  email: z.string().email('البريد الإلكتروني غير صحيح').optional(),
});

export default function EmployeeFormModal({ open, onClose, editingEmployee, onSuccess }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: { fullName: '', phone: '', email: '' },
  });

  useEffect(() => {
    if (editingEmployee) {
      reset(editingEmployee);
    } else {
      reset({ fullName: '', phone: '', email: '' });
    }
  }, [editingEmployee, reset, open]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (editingEmployee) {
        const res = await electronAPI.employee.update(editingEmployee.id, data);
        if (!res.success) throw new Error(res.error);
        return res.data;
      } else {
        const res = await electronAPI.employee.create(data);
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
      <DialogTitle>{editingEmployee ? 'تعديل الموظف' : 'إضافة موظف جديد'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {mutation.isError && <Alert severity="error" sx={{ mb: 2 }}>{mutation.error.message}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="الاسم الكامل"
              fullWidth
              {...register('fullName')}
              error={!!errors.fullName}
              helperText={errors.fullName?.message}
            />
            <TextField
              label="رقم الهاتف"
              fullWidth
              {...register('phone')}
              error={!!errors.phone}
              helperText={errors.phone?.message}
            />
            <TextField
              label="البريد الإلكتروني"
              fullWidth
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>إلغاء</Button>
          <Button type="submit" variant="contained" loading={mutation.isPending}>
            {editingEmployee ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}