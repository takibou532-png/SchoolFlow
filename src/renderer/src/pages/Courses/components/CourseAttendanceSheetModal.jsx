import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import { electronAPI } from '../../../utils/electron';

const fetchCourseAttendanceSheet = async (courseSessionId) => {
  const response = await electronAPI.courseAttendance.getSheet(courseSessionId);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

const markCourseAttendance = async ({ courseSessionId, attendanceList }) => {
  const response = await electronAPI.courseAttendance.mark({ courseSessionId, attendanceList });
  console.log("attendance:", response);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

export default function CourseAttendanceSheetModal({ open, onClose, session, onSuccess }) {
  const queryClient = useQueryClient();
  const [attendanceState, setAttendanceState] = useState({});

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['course-attendance-sheet', session?.id],
    queryFn: () => fetchCourseAttendanceSheet(session.id),
    enabled: !!session?.id && open,
    staleTime: 0,
  });

  useEffect(() => {
    if (data?.students) {
      const initialState = {};
      data.students.forEach((s) => {
        initialState[s.student.id] = s.status || 'absent';
      });
      setAttendanceState(initialState);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: markCourseAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-attendance-sheet', session?.id] });
      queryClient.invalidateQueries({ queryKey: ['course-details', session?.courseId] });
      refetch();
      onSuccess();
    },
    onError: (error) => alert('فشل حفظ الحضور: ' + error.message),
  });

  const handleToggle = (studentId, currentStatus) => {
    setAttendanceState(prev => ({
      ...prev,
      [studentId]: currentStatus === 'present' ? 'absent' : 'present',
    }));
  };

  const handleSave = () => {
    const attendanceList = Object.entries(attendanceState).map(([studentId, status]) => ({
      studentId: parseInt(studentId, 10),
      status,
    }));
    mutation.mutate({ courseSessionId: session.id, attendanceList });
  };

  if (!session) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth dir="rtl">
      <DialogTitle>ورقة الحضور: {session.date} • الحصة #{session.sessionIndex}</DialogTitle>
      <DialogContent>
        {isLoading ? (
          <CircularProgress />
        ) : error ? (
          <Alert severity="error">{error.message}</Alert>
        ) : data ? (
          <>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              إجمالي الطلاب: {data.students.length}
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell align="right">الطالب</TableCell>
                    <TableCell align="right">ولي الأمر</TableCell>
                    <TableCell align="right">حالة الحضور</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.students.map((s) => (
                    <TableRow key={s.student.id}>
                      <TableCell align="right">{s.student.firstName} {s.student.lastName}</TableCell>
                      <TableCell align="right">{s.student.guardianName || '-'}</TableCell>
                      <TableCell align="right">
                        <FormControlLabel
                          control={
                            <Switch
                              checked={attendanceState[s.student.id] === 'present'}
                              onChange={() => handleToggle(s.student.id, attendanceState[s.student.id])}
                              color="success"
                            />
                          }
                          label={attendanceState[s.student.id] === 'present' ? 'حاضر' : 'غائب'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={mutation.isPending}>
          إغلاق
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isLoading || !!error || mutation.isPending}
          startIcon={mutation.isPending ? <CircularProgress size={20} color="inherit" /> : null}
        >
          حفظ الحضور
        </Button>
      </DialogActions>
    </Dialog>
  );
}