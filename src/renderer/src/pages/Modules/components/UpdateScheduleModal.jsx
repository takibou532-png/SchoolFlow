import React, { useState, useEffect } from 'react';
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
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { electronAPI } from '../../../utils/electron';

// أيام الأسبوع باللغة العربية
const DAYS = [
  { key: 'MONDAY', label: 'الإثنين' },
  { key: 'TUESDAY', label: 'الثلاثاء' },
  { key: 'WEDNESDAY', label: 'الأربعاء' },
  { key: 'THURSDAY', label: 'الخميس' },
  { key: 'FRIDAY', label: 'الجمعة' },
  { key: 'SATURDAY', label: 'السبت' },
  { key: 'SUNDAY', label: 'الأحد' },
];

const fetchClassrooms = async () => {
  const response = await electronAPI.classroom.getAll({ where: { isActive: true } });
  if (!response.success) throw new Error(response.error);
  return response.data;
};

const fetchScheduleSlots = async (moduleId) => {
  const response = await electronAPI.module.getScheduleSlots(moduleId);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

export default function UpdateScheduleModal({ open, onClose, module, onSuccess }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  const { data: classrooms } = useQuery({
    queryKey: ['classrooms'],
    queryFn: fetchClassrooms,
    enabled: open,
  });

  const { data: slots, isLoading: slotsLoading, error: slotsError } = useQuery({
    queryKey: ['module-schedule-slots', module?.id],
    queryFn: () => fetchScheduleSlots(module.id),
    enabled: !!module?.id && open,
  });

  // إعادة ضبط الحالة عند فتح/إغلاق النافذة أو تغيير المادة
  useEffect(() => {
    if (!open) {
      setError('');
      setRows([]);
      return;
    }

    if (slots) {
      setRows(
        slots.map((s) => ({
          slotIndex: s.slotIndex,
          day: s.day || '',
          startTime: s.startTime || '',
          endTime: s.endTime || '',
          classroomId: s.classroomId || '',
          hasFutureSessions: s.hasFutureSessions,
          included: Boolean(s.hasFutureSessions),
        }))
      );
    }
  }, [slots, open]);

  const mutation = useMutation({
    mutationFn: async (slotUpdates) => {
      const response = await electronAPI.module.updateSchedule(module.id, slotUpdates);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      setError('');
      onSuccess();
    },
    onError: (err) => setError(err.message || 'فشل في تحديث الجدول الزمني'),
  });

  const handleRowChange = (slotIndex, field, value) => {
    setRows((prev) =>
      prev.map((r) => (r.slotIndex === slotIndex ? { ...r, [field]: value } : r))
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const toSubmit = rows.filter((r) => r.included);

    if (toSubmit.length === 0) {
      setError('يرجى تحديد حصة واحدة على الأقل لتحديثها');
      return;
    }

    for (const r of toSubmit) {
      if (!r.day || !r.startTime || !r.endTime || !r.classroomId) {
        setError('جميع الحقول مطلوبة للحصص المحددة');
        return;
      }
    }

    const slotUpdates = toSubmit.map((r) => ({
      slotIndex: r.slotIndex,
      day: r.day,
      startTime: r.startTime,
      endTime: r.endTime,
      classroomId: Number(r.classroomId),
    }));

    mutation.mutate(slotUpdates);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth dir="rtl">
      <DialogTitle>تحديث الجدول الزمني - {module?.name}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {slotsError && <Alert severity="error" sx={{ mb: 2 }}>{slotsError.message}</Alert>}
          
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            قم بتحديد الحصص التي تريد تعديلها. سيتم تحديث الجلسات القادمة فقط للحصص المحددة — 
            حيث ستنتقل تواريخها إلى اليوم الجديد في نفس الأسبوع، مع الحفاظ على ترتيبها في التسلسل. 
            الحصص غير المحددة لن تتأثر.
          </Typography>

          {slotsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : rows.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              لا توجد حصص مبرمجة لهذه المادة.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {rows.map((row) => (
                <Box
                  key={row.slotIndex}
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'center',
                    opacity: row.hasFutureSessions ? 1 : 0.5,
                  }}
                >
                  <FormControlLabel
                    sx={{ minWidth: 40, ml: 0 }}
                    control={
                      <Checkbox
                        checked={row.included}
                        disabled={!row.hasFutureSessions}
                        onChange={(e) => handleRowChange(row.slotIndex, 'included', e.target.checked)}
                      />
                    }
                    label=""
                  />
                  <Typography variant="body2" sx={{ minWidth: 70, fontWeight: 'medium' }}>
                    الحصة {row.slotIndex}
                  </Typography>

                  <FormControl size="small" sx={{ minWidth: 130 }} disabled={!row.included}>
                    <InputLabel>اليوم</InputLabel>
                    <Select
                      value={row.day}
                      onChange={(e) => handleRowChange(row.slotIndex, 'day', e.target.value)}
                      label="اليوم"
                    >
                      {DAYS.map((d) => (
                        <MenuItem key={d.key} value={d.key}>{d.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    label="وقت البداية"
                    type="time"
                    size="small"
                    disabled={!row.included}
                    InputLabelProps={{ shrink: true }}
                    value={row.startTime}
                    onChange={(e) => handleRowChange(row.slotIndex, 'startTime', e.target.value)}
                    sx={{ width: 130 }}
                  />

                  <TextField
                    label="وقت النهاية"
                    type="time"
                    size="small"
                    disabled={!row.included}
                    InputLabelProps={{ shrink: true }}
                    value={row.endTime}
                    onChange={(e) => handleRowChange(row.slotIndex, 'endTime', e.target.value)}
                    sx={{ width: 130 }}
                  />

                  <FormControl size="small" sx={{ minWidth: 160 }} disabled={!row.included}>
                    <InputLabel>القاعة / القسم</InputLabel>
                    <Select
                      value={row.classroomId}
                      onChange={(e) => handleRowChange(row.slotIndex, 'classroomId', e.target.value)}
                      label="القاعة / القسم"
                    >
                      {classrooms?.map((c) => (
                        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {!row.hasFutureSessions && (
                    <Typography variant="caption" color="text.secondary">
                      لا توجد جلسات قادمة
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={mutation.isPending}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={slotsLoading || mutation.isPending || rows.every((r) => !r.hasFutureSessions)}
            startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {mutation.isPending ? 'جاري التحديث...' : 'تحديث الجدول'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}