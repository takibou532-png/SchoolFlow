import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { electronAPI } from '../../../utils/electron';

const applicationSchema = z.object({
  fullName: z.string().min(2, 'الاسم الكامل مطلوب'),
  phone: z.string().min(6, 'رقم الهاتف مطلوب'),
  subjectId: z.string().min(1, 'يرجى اختيار مادة'),
});

export default function JobApplicationFormModal({ open, onClose, editingApplication, onSuccess }) {
  const queryClient = useQueryClient();
  const [cvFile, setCvFile] = useState(null);
  const [cvFileName, setCvFileName] = useState('');
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(applicationSchema),
    defaultValues: { fullName: '', phone: '', subjectId: '' },
  });

  const subjectIdValue = watch('subjectId');

  // ─── Fetch subjects ──────────────────────────────────────
  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects', 'active'],
    queryFn: async () => {
      const res = await electronAPI.subject.getAll({ where: { isActive: true } });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: open,
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (editingApplication) {
      reset({
        fullName: editingApplication.fullName,
        phone: editingApplication.phone,
        subjectId: editingApplication.subjectId?.toString() ?? '',
      });
      if (editingApplication.cvPath) {
        setCvFileName(editingApplication.cvPath.split('/').pop() || 'CV موجود');
      }
    } else {
      reset({ fullName: '', phone: '', subjectId: '' });
      setCvFile(null);
      setCvFileName('');
    }
  }, [editingApplication, reset, open]);

  // ─── Mutation ────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        fullName: data.fullName.trim(),
        phone: data.phone.trim(),
        subjectId: parseInt(data.subjectId, 10),
      };
      // If a new CV is selected, include its path
      if (cvFile) {
        payload.cvFile = { path: cvFile, name: cvFile.split('/').pop() || 'cv.pdf' };
      }
      if (editingApplication) {
        const res = await electronAPI.jobApplication.update(editingApplication.id, payload);
        if (!res.success) throw new Error(res.error);
        return res.data;
      } else {
        const res = await electronAPI.jobApplication.create(payload);
        if (!res.success) throw new Error(res.error);
        return res.data;
      }
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (err) => setError(err.message),
  });

  // ─── CV Selection ────────────────────────────────────────
  const handleSelectCv = async () => {
    try {
      const res = await electronAPI.jobApplication.selectCv();
      if (res.success) {
        setCvFile(res.filePath);
        setCvFileName(res.filePath.split('/').pop() || 'CV.pdf');
      }
    } catch (err) {
      setError('فشل اختيار الملف: ' + err.message);
    }
  };

  const onSubmit = (data) => {
    setError('');
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth dir="rtl">
      <DialogTitle>{editingApplication ? 'تعديل الطلب' : 'إضافة طلب توظيف جديد'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
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
            <FormControl fullWidth error={!!errors.subjectId}>
              <InputLabel>المادة</InputLabel>
              <Select
                label="المادة"
                value={subjectIdValue || ''}
                onChange={(e) => setValue('subjectId', e.target.value, { shouldValidate: true })}
                disabled={subjectsLoading}
              >
                {subjects?.map((sub) => (
                  <MenuItem key={sub.id} value={String(sub.id)}>{sub.name}</MenuItem>
                ))}
              </Select>
              {errors.subjectId && (
                <Typography color="error" variant="caption">{errors.subjectId.message}</Typography>
              )}
            </FormControl>

            {/* ─── CV Upload ───────────────────────────── */}
            <Box>
              <Typography variant="body2" fontWeight={600} gutterBottom>السيرة الذاتية (PDF)</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleSelectCv}
                  disabled={mutation.isPending}
                >
                  {cvFileName ? 'تغيير الملف' : 'اختيار ملف'}
                </Button>
                {cvFileName && (
                  <Chip label={cvFileName} size="small" variant="outlined" />
                )}
              </Box>
              {!cvFileName && !editingApplication && (
                <Typography variant="caption" color="textSecondary">(اختياري، يمكن إضافة الملف لاحقاً)</Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>إلغاء</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {editingApplication ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}