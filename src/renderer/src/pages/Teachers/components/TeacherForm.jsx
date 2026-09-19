import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
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
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ClearIcon from '@mui/icons-material/Clear';
import { electronAPI } from '../../../utils/electron';

const teacherSchema = z.object({
  firstName: z.string().min(2, 'الاسم الأول مطلوب'),
  lastName: z.string().min(2, 'اسم العائلة مطلوب'),
  phone: z.string().optional(),
  email: z.string().email('بريد إلكتروني غير صالح').optional(),
  paymentPercentage: z.number().min(0, 'يجب أن يكون >= 0').max(100, 'يجب أن يكون <= 100').default(70),
});

const createTeacher = async (data) => {
  const response = await electronAPI.teacher.create(data);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

const updateTeacher = async ({ id, data }) => {
  const response = await electronAPI.teacher.update(id, data);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

export default function TeacherForm({ open, onClose, editingTeacher, onSuccess }) {
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      paymentPercentage: 70,
    },
  });

  useEffect(() => {
    if (editingTeacher) {
      reset(editingTeacher);
      setAvatarFile(null);
      setAvatarPreview(null);
    } else {
      reset({ firstName: '', lastName: '', phone: '', email: '', paymentPercentage: 70 });
      setAvatarFile(null);
      setAvatarPreview(null);
    }
  }, [editingTeacher, open, reset]);

  // ─── Avatar handlers ──────────────────────────────
  const handleSelectAvatar = async () => {
    try {
      const res = await electronAPI.teacher.selectAvatar();
      if (res.success) {
        setAvatarFile(res.filePath);
        setAvatarPreview(res.dataUrl); // use dataUrl directly
      }
    } catch (err) {
      alert('فشل اختيار الصورة: ' + err.message);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const mutation = useMutation({
    mutationFn: editingTeacher
      ? (data) => updateTeacher({ id: editingTeacher.id, data })
      : createTeacher,
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => console.error(error),
  });

  const onSubmit = (data) => {
    const submitData = { ...data };
    if (avatarFile) {
      submitData.avatarFile = { path: avatarFile, name: avatarFile.split('/').pop() };
    }
    mutation.mutate(submitData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth dir="rtl">
      <DialogTitle>{editingTeacher ? 'تعديل معلم' : 'إضافة معلم'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {mutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>{mutation.error.message}</Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* ─── Avatar Section ────────────────────── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Avatar
                src={avatarPreview || undefined}
                sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: '1.2rem' }}
              >
                {!avatarPreview && 'صورة'}
              </Avatar>
              <Box>
                <Button variant="outlined" size="small" onClick={handleSelectAvatar}>
                  {avatarPreview ? 'تغيير الصورة' : 'اختيار صورة'}
                </Button>
                {avatarPreview && (
                  <IconButton size="small" color="error" onClick={handleRemoveAvatar} sx={{ ml: 1 }}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                )}
                <Typography variant="caption" display="block" color="textSecondary">
                  {avatarFile ? 'تم اختيار صورة جديدة' : 'يُفضل اختيار صورة مربعة'}
                </Typography>
              </Box>
            </Box>

            <TextField
              label="الاسم الأول"
              fullWidth
              {...register('firstName')}
              error={!!errors.firstName}
              helperText={errors.firstName?.message}
            />
            <TextField
              label="اسم العائلة"
              fullWidth
              {...register('lastName')}
              error={!!errors.lastName}
              helperText={errors.lastName?.message}
            />
            <TextField
              label="الهاتف"
              fullWidth
              {...register('phone')}
            />
            <TextField
              label="البريد الإلكتروني"
              fullWidth
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
            <TextField
              label="نسبة الدفع"
              type="number"
              fullWidth
              {...register('paymentPercentage', { valueAsNumber: true })}
              error={!!errors.paymentPercentage}
              helperText={errors.paymentPercentage?.message}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>إلغاء</Button>
          <Button type="submit" variant="contained" loading={mutation.isPending}>
            {editingTeacher ? 'تحديث' : 'إنشاء'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}