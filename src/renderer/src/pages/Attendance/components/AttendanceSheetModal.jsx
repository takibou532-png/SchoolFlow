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

const fetchAttendanceSheet = async (sessionId) => {
  const response = await electronAPI.attendance.getSheet(sessionId);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

const markAttendance = async ({ sessionId, attendanceList }) => {
  const response = await electronAPI.attendance.mark(sessionId, attendanceList);
  console.log("mark :",response);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

export default function AttendanceSheetModal({ open, onClose, session, onSuccess }) {
  const queryClient = useQueryClient();
  const [attendanceState, setAttendanceState] = useState({});

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['attendance-sheet', session?.id],
    queryFn: () => fetchAttendanceSheet(session.id),
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
    mutationFn: markAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-sheet', session?.id] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      refetch();
      onSuccess();
    },
    onError: (error) => {
      alert('فشل حفظ الحضور: ' + error.message);
    },
  });

  const handleToggle = (studentId, currentStatus) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: currentStatus === 'present' ? 'absent' : 'present',
    }));
  };

  const handleSave = () => {
    const attendanceList = Object.entries(attendanceState).map(([studentId, status]) => ({
      studentId: parseInt(studentId),
      status,
    }));
    mutation.mutate({ sessionId: session.id, attendanceList });
  };

  if (!session) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        كشف الحضور: {session.moduleName || 'الوحدة'} – {session.date}
      </DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error.message}</Alert>
        ) : data ? (
          <>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              عدد الطلاب: {data.students.length}
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>الطالب</TableCell>
                    <TableCell>ولي الأمر</TableCell>
                    <TableCell>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.students.map((s) => (
                    <TableRow key={s.student.id}>
                      <TableCell>
                        {s.student.firstName} {s.student.lastName}
                      </TableCell>
                      <TableCell>{s.student.guardianName || '—'}</TableCell>
                      <TableCell>
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
        <Button onClick={onClose}>إغلاق</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          loading={mutation.isPending}
          disabled={isLoading || !!error}
        >
          حفظ الحضور
        </Button>
      </DialogActions>
    </Dialog>
  );
}