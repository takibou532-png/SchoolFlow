import React, { useEffect, useState } from 'react';
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
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

import IconButton from '@mui/material/IconButton';
import ClearIcon from '@mui/icons-material/Clear';

const studentSchema = z.object({
  firstName: z.string().min(2, 'الاسم الأول مطلوب'),
  lastName: z.string().min(2, 'اسم العائلة مطلوب'),
  dateOfBirth: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  address: z.string().optional(),
});

const createStudent = async (data) => {
  const response = await electronAPI.student.create(data);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

const updateStudent = async ({ id, data }) => {
  const response = await electronAPI.student.update(id, data);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

export default function StudentForm({ open, onClose, onSuccess, mode = 'create', initialData = null }) {
  const queryClient = useQueryClient();
const [avatarFile, setAvatarFile] = useState(null);
const [avatarPreview, setAvatarPreview] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      guardianName: '',
      guardianPhone: '',
      address: '',
    },
  });

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      reset(initialData);
      setAvatarFile(null);
    setAvatarPreview(null);
    } else {
      reset({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        guardianName: '',
        guardianPhone: '',
        address: '',
      });
       setAvatarFile(null);
    setAvatarPreview(null);
    }
  }, [initialData, mode, reset, open]);

const handleSelectAvatar = async () => {
  try {
    const res = await electronAPI.student.selectAvatar();
    if (res.success) {
      setAvatarFile(res.filePath);
      setAvatarPreview(res.dataUrl); // ✅ directly use the dataUrl
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
    mutationFn: mode === 'create' ? createStudent : (data) => updateStudent({ id: initialData?.id, data }),
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      console.error('خطأ في نموذج الطالب:', error);
    },
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
      <DialogTitle>{mode === 'create' ? 'إضافة طالب' : 'تعديل طالب'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {mutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {`حدث خطأ: ${mutation.error.message}`}
            </Alert>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
  <Avatar
    src={avatarPreview || undefined}
    sx={{ width: 60, height: 60, bgcolor: 'primary.main', fontSize: '1.5rem' }}
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
              label="تاريخ الميلاد"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              {...register('dateOfBirth')}
            />
            <TextField
              label="اسم ولي الأمر"
              fullWidth
              {...register('guardianName')}
            />
            <TextField
              label="هاتف ولي الأمر"
              fullWidth
              {...register('guardianPhone')}
            />
            <TextField
              label="العنوان"
              fullWidth
              multiline
              rows={2}
              {...register('address')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>إلغاء</Button>
          <Button type="submit" variant="contained" loading={mutation.isPending}>
            {mode === 'create' ? 'إنشاء' : 'تحديث'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}