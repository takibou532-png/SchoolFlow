import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import { electronAPI } from '../../../utils/electron';

const fetchModules = async () => {
  const response = await electronAPI.module.getAll({ where: { isActive: true } });
  if (!response.success) throw new Error(response.error);
  return response.data;
};

const fetchClassrooms = async () => {
  const response = await electronAPI.classroom.getAll({ where: { isActive: true } });
  if (!response.success) throw new Error(response.error);
  return response.data;
};

const createAdditionalSession = async (dto) => {
  const response = await electronAPI.session.createAdditional(dto);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

// ─── Arabic field labels for the required-field check ──
const fieldLabels = {
  moduleId: 'الوحدة',
  date: 'التاريخ',
  startTime: 'وقت البدء',
  endTime: 'وقت الانتهاء',
  price: 'السعر',
  classroomId: 'القاعة',
};

export default function CreateAdditionalSessionModal({ open, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    moduleId: '',
    date: '',
    startTime: '',
    endTime: '',
    price: '',
    classroomId: '',
  });
  const [error, setError] = useState('');

  const modulesQuery = useQuery({
    queryKey: ['modules', 'active'],
    queryFn: fetchModules,
    enabled: open,
  });

  const classroomsQuery = useQuery({
    queryKey: ['classrooms', 'active'],
    queryFn: fetchClassrooms,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: createAdditionalSession,
    onSuccess: () => {
      onSuccess();
    },
    onError: (err) => setError(err.message),
  });

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const required = ['moduleId', 'date', 'startTime', 'endTime', 'price', 'classroomId'];
    for (const field of required) {
      if (!formData[field]) {
        setError(`حقل "${fieldLabels[field]}" مطلوب`);
        return;
      }
    }
    mutation.mutate({
      ...formData,
      price: parseFloat(formData.price),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>إضافة حصة إضافية</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>الوحدة</InputLabel>
              <Select
                value={formData.moduleId}
                onChange={(e) => handleChange('moduleId', e.target.value)}
                label="الوحدة"
                required
              >
                {modulesQuery.data?.map((m) => (
                  <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>القاعة</InputLabel>
              <Select
                value={formData.classroomId}
                onChange={(e) => handleChange('classroomId', e.target.value)}
                label="القاعة"
                required
              >
                {classroomsQuery.data?.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="التاريخ"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              required
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="وقت البدء"
                type="time"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={formData.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
                required
              />
              <TextField
                label="وقت الانتهاء"
                type="time"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={formData.endTime}
                onChange={(e) => handleChange('endTime', e.target.value)}
                required
              />
            </Box>
            <TextField
              label="السعر (دج)"
              type="number"
              fullWidth
              value={formData.price}
              onChange={(e) => handleChange('price', e.target.value)}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>إلغاء</Button>
          <Button type="submit" variant="contained" loading={mutation.isPending}>
            إنشاء
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}