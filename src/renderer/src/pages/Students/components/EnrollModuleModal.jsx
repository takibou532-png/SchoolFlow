import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import { electronAPI } from '../../../utils/electron';

const fetchModules = async () => {
  const response = await electronAPI.module.getAll({ where: { isActive: true } });
  if (!response.success) throw new Error(response.error);
  return response.data;
};

export default function EnrollModuleModal({ open, onClose, student, onSuccess }) {
  const queryClient = useQueryClient();
  const [moduleId, setModuleId] = useState('');
  const [notes, setNotes] = useState('');

  const { data: modules, isLoading, error } = useQuery({
    queryKey: ['modules', 'active'],
    queryFn: fetchModules,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await electronAPI.student.enrollToModule(student.id, moduleId, notes);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      console.error('خطأ في التسجيل:', error);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!moduleId) return;
    mutation.mutate();
  };

  useEffect(() => {
    if (!open) {
      setModuleId('');
      setNotes('');
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth dir="rtl">
      <DialogTitle>
        تسجيل {student?.firstName} {student?.lastName} في وحدة
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {mutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>{`حدث خطأ: ${mutation.error.message}`}</Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>الوحدة</InputLabel>
              <Select
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                label="الوحدة"
                disabled={isLoading}
              >
                {modules?.map((mod) => (
                  <MenuItem key={mod.id} value={mod.id}>
                    {mod.name} - {mod.level}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="ملاحظات (اختياري)"
              fullWidth
              multiline
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>إلغاء</Button>
          <Button type="submit" variant="contained" loading={mutation.isPending}>
            تسجيل
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}