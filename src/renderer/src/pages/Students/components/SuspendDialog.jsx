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
import Typography from '@mui/material/Typography';
import { electronAPI } from '../../../utils/electron';

const fetchStudentEnrollments = async (studentId) => {
  const response = await electronAPI.student.getEnrollments(studentId);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

export default function SuspendDialog({ open, onClose, student, onSuccess }) {
  const [enrollmentType, setEnrollmentType] = useState('module'); // 'module' or 'course'
  const [enrollmentId, setEnrollmentId] = useState('');
  const [reason, setReason] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['student-enrollments', student?.id],
    queryFn: () => fetchStudentEnrollments(student?.id),
    enabled: !!student?.id && open,
  });

  const modules = data?.modules || [];
  const courses = data?.courses || [];

  const mutation = useMutation({
    mutationFn: async () => {
      if (enrollmentType === 'module') {
        const response = await electronAPI.student.suspendFromModule(student.id, enrollmentId, reason);
        if (!response.success) throw new Error(response.error);
        return response.data;
      } else {
        const response = await electronAPI.courseEnrollment.suspend(student.id, enrollmentId, reason);
        if (!response.success) throw new Error(response.error);
        return response.data;
      }
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      console.error('خطأ في الإيقاف:', error);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!enrollmentId) return;
    mutation.mutate();
  };

  useEffect(() => {
    if (!open) {
      setEnrollmentId('');
      setReason('');
      setEnrollmentType('module');
    }
  }, [open]);

  const enrollmentOptions = enrollmentType === 'module' ? modules : courses;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth dir="rtl">
      <DialogTitle>
        إيقاف {student?.firstName} {student?.lastName}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {mutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>{`حدث خطأ: ${mutation.error.message}`}</Alert>
          )}
          {isLoading ? (
            <Typography>جاري تحميل التسجيلات...</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>النوع</InputLabel>
                <Select
                  value={enrollmentType}
                  onChange={(e) => {
                    setEnrollmentType(e.target.value);
                    setEnrollmentId('');
                  }}
                  label="النوع"
                >
                  <MenuItem value="module">وحدة</MenuItem>
                  <MenuItem value="course">دورة</MenuItem>
                </Select>
              </FormControl>

              {enrollmentOptions.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                  {enrollmentType === 'module' ? 'لا توجد وحدات نشطة.' : 'لا توجد دورات نشطة.'}
                </Typography>
              ) : (
                <FormControl fullWidth>
                  <InputLabel>{enrollmentType === 'module' ? 'الوحدة' : 'الدورة'}</InputLabel>
                  <Select
                    value={enrollmentId}
                    onChange={(e) => setEnrollmentId(e.target.value)}
                    label={enrollmentType === 'module' ? 'الوحدة' : 'الدورة'}
                  >
                    {enrollmentOptions.map((item) => (
                      <MenuItem key={item.id} value={enrollmentType === 'module' ? item.moduleId : item.courseId}>
                        {enrollmentType === 'module' ? item.moduleName : item.courseName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <TextField
                label="السبب (اختياري)"
                fullWidth
                multiline
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>إلغاء</Button>
          <Button
            type="submit"
            variant="contained"
            color="warning"
            loading={mutation.isPending}
            disabled={!enrollmentId}
          >
            إيقاف
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}