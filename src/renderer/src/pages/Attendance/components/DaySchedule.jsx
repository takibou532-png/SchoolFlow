import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import AttendanceSheetModal from './AttendanceSheetModal';
import EditSessionModal from './EditSessionModal';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { electronAPI } from '../../../utils/electron';

// ─── Arabic status/type labels ──────────────────────
const statusLabels = {
  scheduled: 'مجدولة',
  cancelled: 'ملغاة',
  completed: 'منتهية',
};

export default function DaySchedule({ date, sessions, isLoading, onUpdate }) {
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState(null);
  const [sheetModalOpen, setSheetModalOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [sessionToCancel, setSessionToCancel] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState(null);

  const handleMarkAttendance = (session) => {
    setSelectedSession(session);
    setSheetModalOpen(true);
  };

  const handleCancelClick = (session) => {
    setSessionToCancel(session);
    setCancelDialogOpen(true);
  };

  const handleEditClick = (session) => {
    setSessionToEdit(session);
    setEditModalOpen(true);
  };

  const cancelMutation = useMutation({
    mutationFn: async (sessionId) => {
      const response = await electronAPI.session.cancel(sessionId);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      setCancelDialogOpen(false);
      setSessionToCancel(null);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      onUpdate();
    },
    onError: (error) => {
      alert('فشل إلغاء الحصة: ' + error.message);
    },
  });

  const confirmCancel = () => {
    if (sessionToCancel) {
      cancelMutation.mutate(sessionToCancel.id);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        لا توجد حصص بتاريخ {date}.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        حصص يوم {date}
      </Typography>
      <Grid container spacing={2}>
        {sessions.map((session) => (
          <Grid item xs={12} md={6} lg={4} key={session.id}>
          <Card variant="outlined">
  <CardContent>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
      <Typography variant="subtitle1" fontWeight="bold">
        {session.moduleName || `الوحدة #${session.moduleId}`}
      </Typography>
      <Chip
        label={session.isAdditional ? 'إضافية' : 'عادية'}
        size="small"
        color={session.isAdditional ? 'secondary' : 'primary'}
      />
    </Box>
    <Typography variant="body2" color="textSecondary">
      رقم الحصة: {session.sessionIndex ?? '—'}
    </Typography>
    <Typography variant="body2" color="textSecondary">
      {session.startTime} – {session.endTime}
    </Typography>
    <Typography variant="body2" color="textSecondary">
      القاعة: {session.classroomName || 'غير محدد'}
    </Typography>
    <Typography variant="body2" color="textSecondary">
      المعلم: {session.teacherName || 'غير محدد'}
    </Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
      <Typography variant="body2" color="textSecondary">الحالة:</Typography>
      <Chip
        label={statusLabels[session.status] || session.status}
        size="small"
        color={session.status === 'scheduled' ? 'success' : 'error'}
      />
    </Box>
    <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      <Button
        variant="outlined"
        size="small"
        onClick={() => handleMarkAttendance(session)}
        disabled={session.status === 'cancelled'}
      >
        تسجيل الحضور
      </Button>
      {session.status === 'scheduled' && (
        <>
          <Button
            variant="outlined"
            size="small"
            color="primary"
            onClick={() => handleEditClick(session)}
          >
            تعديل
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="error"
            onClick={() => handleCancelClick(session)}
          >
            إلغاء
          </Button>
        </>
      )}
    </Box>
  </CardContent>
</Card>
          </Grid>
        ))}
      </Grid>

      <AttendanceSheetModal
        open={sheetModalOpen}
        onClose={() => {
          setSheetModalOpen(false);
          setSelectedSession(null);
        }}
        session={selectedSession}
        onSuccess={() => {
          setSheetModalOpen(false);
          onUpdate();
        }}
      />

      <ConfirmDialog
        open={cancelDialogOpen}
        onClose={() => {
          setCancelDialogOpen(false);
          setSessionToCancel(null);
        }}
        onConfirm={confirmCancel}
        title="إلغاء الحصة"
        message={`هل أنت متأكد من إلغاء حصة ${sessionToCancel?.moduleName || 'الوحدة'} بتاريخ ${sessionToCancel?.date} الساعة ${sessionToCancel?.startTime}؟`}
        confirmText="إلغاء الحصة"
        confirmColor="error"
        loading={cancelMutation.isPending}
      />

      <EditSessionModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSessionToEdit(null);
        }}
        session={sessionToEdit}
        onSuccess={() => {
          setEditModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['sessions'] });
          onUpdate();
        }}
      />
    </Box>
  );
}