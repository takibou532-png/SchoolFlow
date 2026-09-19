import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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

const fetchActiveCourses = async () => {
  const response = await electronAPI.course.getAll({ where: { isActive: true } });
  if (!response.success) throw new Error(response.error);
  return response.data;
};

export default function EnrollCourseModal({ open, onClose, student, onSuccess }) {
  const [courseId, setCourseId] = useState('');
  const [notes, setNotes] = useState('');

  const { data: courses, isLoading, error } = useQuery({
    queryKey: ['courses', 'active'],
    queryFn: fetchActiveCourses,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await electronAPI.courseEnrollment.enrollStudent(student.id, courseId, notes);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      console.error('خطأ في تسجيل الدورة:', error);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!courseId) return;
    mutation.mutate();
  };

  useEffect(() => {
    if (!open) {
      setCourseId('');
      setNotes('');
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth dir="rtl">
      <DialogTitle>
        تسجيل {student?.firstName} {student?.lastName} في دورة
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {mutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>{`حدث خطأ: ${mutation.error.message}`}</Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>الدورة</InputLabel>
              <Select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                label="الدورة"
                disabled={isLoading}
              >
                {courses?.map((course) => (
                  <MenuItem key={course.id} value={course.id}>
                    {course.name} - {course.subjectName}
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