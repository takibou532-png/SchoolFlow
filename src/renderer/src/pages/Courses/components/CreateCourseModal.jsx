import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
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
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { electronAPI } from '../../../utils/electron';

const fetchTeachers = async () => {
  const response = await electronAPI.teacher.getAll({ where: { isActive: true } });
  if (!response.success) throw new Error(response.error);
  return response.data;
};

const createCourse = async (dto) => {
  const response = await electronAPI.course.createWithSessions(dto);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

export default function CreateCourseModal({ open, onClose, onSuccess }) {
  const initialFormState = {
    name: '',
    subjectName: '',
    level: '',
    maxStudents: '',
    teacherId: '',
    totalPrice: '',
    sessionPrice: '',
    startDate: '',
    endDate: '',
    sessions: [{ date: '', startTime: '', endTime: '' }],
  };

  const [formData, setFormData] = useState(initialFormState);
  const [error, setError] = useState('');

  const teachersQuery = useQuery({
    queryKey: ['teachers'],
    queryFn: fetchTeachers,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: createCourse,
    onSuccess: () => {
      setFormData(initialFormState);
      onSuccess();
    },
    onError: (err) => setError(err.message),
  });

  const handleChange = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSessionChange = (index, field, value) => {
    const newSessions = [...formData.sessions];
    newSessions[index][field] = value;
    setFormData((prev) => ({ ...prev, sessions: newSessions }));
  };

  const addSession = () =>
    setFormData((prev) => ({
      ...prev,
      sessions: [...prev.sessions, { date: '', startTime: '', endTime: '' }],
    }));

  const removeSession = (index) => {
    if (formData.sessions.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name) { setError('اسم الدورة مطلوب'); return; }
    if (!formData.subjectName) { setError('اسم المادة مطلوب'); return; }
    if (!formData.teacherId) { setError('يرجى اختيار الأستاذ'); return; }
    if (!formData.totalPrice) { setError('السعر الإجمالي مطلوب'); return; }
    if (!formData.sessionPrice) { setError('سعر الحصة مطلوب'); return; }
    if (!formData.startDate) { setError('تاريخ البدء مطلوب'); return; }
    if (!formData.endDate) { setError('تاريخ الانتهاء مطلوب'); return; }

    for (const s of formData.sessions) {
      if (!s.date || !s.startTime || !s.endTime) {
        setError('جميع حقول الحصص مطلوبة');
        return;
      }
    }

    const dto = {
      ...formData,
      maxStudents: formData.maxStudents ? parseInt(formData.maxStudents, 10) : null,
      totalPrice: parseFloat(formData.totalPrice),
      sessionPrice: parseFloat(formData.sessionPrice),
      sessions: formData.sessions,
    };
    mutation.mutate(dto);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth dir="rtl">
      <DialogTitle>إنشاء دورة جديد</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="اسم الدورة"
              fullWidth
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
            <TextField
              label="اسم المادة"
              fullWidth
              value={formData.subjectName}
              onChange={(e) => handleChange('subjectName', e.target.value)}
              required
            />
            <TextField
              label="المستوى"
              fullWidth
              value={formData.level}
              onChange={(e) => handleChange('level', e.target.value)}
            />
            <TextField
              label="أقصى عدد للطلاب"
              type="number"
              fullWidth
              value={formData.maxStudents}
              onChange={(e) => handleChange('maxStudents', e.target.value)}
            />
            
            <FormControl fullWidth required>
              <InputLabel id="teacher-select-label">الأستاذ</InputLabel>
              <Select
                labelId="teacher-select-label"
                label="الأستاذ"
                value={formData.teacherId}
                onChange={(e) => handleChange('teacherId', e.target.value)}
              >
                {teachersQuery.data?.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="السعر الإجمالي (د.ج)"
                type="number"
                fullWidth
                value={formData.totalPrice}
                onChange={(e) => handleChange('totalPrice', e.target.value)}
                required
              />
              <TextField
                label="سعر الحصة (د.ج)"
                type="number"
                fullWidth
                value={formData.sessionPrice}
                onChange={(e) => handleChange('sessionPrice', e.target.value)}
                required
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="تاريخ البدء"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                required
              />
              <TextField
                label="تاريخ الانتهاء"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={formData.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                required
              />
            </Box>

            <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 'bold' }}>
              الحصص / الجلسات
            </Typography>
            
            {formData.sessions.map((s, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  label="التاريخ"
                  type="date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={s.date}
                  onChange={(e) => handleSessionChange(idx, 'date', e.target.value)}
                  required
                  sx={{ width: 170 }}
                />
                <TextField
                  label="وقت البدء"
                  type="time"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={s.startTime}
                  onChange={(e) => handleSessionChange(idx, 'startTime', e.target.value)}
                  required
                  sx={{ width: 130 }}
                />
                <TextField
                  label="وقت الانتهاء"
                  type="time"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={s.endTime}
                  onChange={(e) => handleSessionChange(idx, 'endTime', e.target.value)}
                  required
                  sx={{ width: 130 }}
                />
                <IconButton
                  onClick={() => removeSession(idx)}
                  disabled={formData.sessions.length <= 1}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            
            <Button
              startIcon={<AddIcon />}
              onClick={addSession}
              size="small"
              sx={{ alignSelf: 'flex-start' }}
            >
              إضافة حصة
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={mutation.isPending}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={mutation.isPending}
            startIcon={mutation.isPending ? <CircularProgress size={20} color="inherit" /> : null}
          >
            إنشاء
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}