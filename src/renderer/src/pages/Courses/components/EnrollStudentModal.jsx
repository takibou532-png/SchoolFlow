import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import { electronAPI } from '../../../utils/electron';

const fetchStudents = async () => {
  const response = await electronAPI.student.getAll({ where: { isActive: true } });
  if (!response.success) throw new Error(response.error);
  return response.data;
};

export default function EnrollStudentModal({ open, onClose, course, onSuccess }) {
  const [mode, setMode] = useState('existing');
  const [studentId, setStudentId] = useState('');
  const [newStudentData, setNewStudentData] = useState({
    firstName: '',
    lastName: '',
    guardianName: '',
    guardianPhone: '',
    address: '',
  });
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const studentsQuery = useQuery({
    queryKey: ['students'],
    queryFn: fetchStudents,
    enabled: open && mode === 'existing',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === 'existing') {
        const res = await electronAPI.courseEnrollment.enrollStudent(studentId, course.id, notes);
        if (!res.success) throw new Error(res.error);
        return res.data;
      } else {
        const res = await electronAPI.courseEnrollment.createAndEnroll(newStudentData, course.id, notes);
        if (!res.success) throw new Error(res.error);
        return res.data;
      }
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'existing' && !studentId) {
      setError('يرجى اختيار طالب');
      return;
    }
    if (mode === 'new' && (!newStudentData.firstName || !newStudentData.lastName)) {
      setError('الاسم الأول واللقب مطلوبان');
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth dir="rtl">
      <DialogTitle>تسجيل طالب في {course?.name ?? 'الدورة'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <Box sx={{ mb: 2 }}>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(_, val) => val && setMode(val)}
              size="small"
            >
              <ToggleButton value="existing">طالب حالي</ToggleButton>
              <ToggleButton value="new">طالب جديد</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {mode === 'existing' ? (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="select-student-label">الطالب</InputLabel>
              <Select
                labelId="select-student-label"
                value={studentId}
                label="الطالب"
                onChange={(e) => setStudentId(e.target.value)}
                required
              >
                {studentsQuery.data?.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="الاسم الأول"
                fullWidth
                value={newStudentData.firstName}
                onChange={(e) => setNewStudentData({ ...newStudentData, firstName: e.target.value })}
                required
              />
              <TextField
                label="اللقب"
                fullWidth
                value={newStudentData.lastName}
                onChange={(e) => setNewStudentData({ ...newStudentData, lastName: e.target.value })}
                required
              />
              <TextField
                label="اسم ولي الأمر"
                fullWidth
                value={newStudentData.guardianName}
                onChange={(e) => setNewStudentData({ ...newStudentData, guardianName: e.target.value })}
              />
              <TextField
                label="رقم هاتف ولي الأمر"
                fullWidth
                value={newStudentData.guardianPhone}
                onChange={(e) => setNewStudentData({ ...newStudentData, guardianPhone: e.target.value })}
              />
              <TextField
                label="العنوان"
                fullWidth
                value={newStudentData.address}
                onChange={(e) => setNewStudentData({ ...newStudentData, address: e.target.value })}
              />
            </Box>
          )}

          <TextField
            label="ملاحظات"
            fullWidth
            multiline
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ mt: 2 }}
          />
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
            تسجيل
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}