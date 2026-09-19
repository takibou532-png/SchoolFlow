import React, { useState, useEffect } from 'react';
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
import Typography from '@mui/material/Typography';
import { electronAPI } from '../../../utils/electron';

const fetchClassrooms = async () => {
  const response = await electronAPI.classroom.getAll({ where: { isActive: true } });
  if (!response.success) throw new Error(response.error);
  return response.data;
};

export default function EditSessionModal({ open, onClose, session, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    classroomId: '',
    price: '',
  });
  const [error, setError] = useState('');

  const { data: classrooms, isLoading: classroomsLoading } = useQuery({
    queryKey: ['classrooms', 'active'],
    queryFn: fetchClassrooms,
    enabled: open,
  });

  useEffect(() => {
    if (session) {
      setFormData({
        date: session.date || '',
        startTime: session.startTime || '',
        endTime: session.endTime || '',
        classroomId: session.classroomId || '',
        price: session.sessionPrice || '',
      });
    }
  }, [session]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      const payload = {};
      if (data.date !== session.date) payload.date = data.date;
      if (data.startTime !== session.startTime) payload.startTime = data.startTime;
      if (data.endTime !== session.endTime) payload.endTime = data.endTime;
      if (data.classroomId !== session.classroomId) payload.classroomId = parseInt(data.classroomId);
      if (data.price && data.price !== session.sessionPrice) payload.price = parseFloat(data.price);
      if (Object.keys(payload).length === 0) return;

      const response = await electronAPI.session.update(session.id, payload);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
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
    // Validate time
    if (formData.startTime >= formData.endTime) {
      setError('وقت البداية يجب أن يكون قبل وقت النهاية');
      return;
    }
    mutation.mutate(formData);
  };

  if (!session) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>تعديل الحصة</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="textSecondary">
              الوحدة: <strong>{session.moduleName || session.moduleId}</strong>
            </Typography>
            <Typography variant="body2" color="textSecondary">
              الحالة: <strong>{session.status === 'scheduled' ? 'مجدولة' : session.status}</strong>
            </Typography>

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
                label="وقت البداية"
                type="time"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={formData.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
                required
              />
              <TextField
                label="وقت النهاية"
                type="time"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={formData.endTime}
                onChange={(e) => handleChange('endTime', e.target.value)}
                required
              />
            </Box>

            <FormControl fullWidth>
              <InputLabel>القاعة</InputLabel>
              <Select
                value={formData.classroomId}
                onChange={(e) => handleChange('classroomId', e.target.value)}
                label="القاعة"
                required
                disabled={classroomsLoading}
              >
                {classrooms?.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {session.isAdditional && (
              <TextField
                label="السعر (DZD)"
                type="number"
                fullWidth
                value={formData.price}
                onChange={(e) => handleChange('price', e.target.value)}
                InputProps={{ inputProps: { step: '0.01', min: 0 } }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>إلغاء</Button>
          <Button type="submit" variant="contained" loading={mutation.isPending}>
            حفظ التعديلات
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}