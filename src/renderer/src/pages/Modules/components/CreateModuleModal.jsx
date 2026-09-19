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
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { electronAPI } from '../../../utils/electron';

// ─── UI Translations (Arabic) ─────────────────────
const TEXTS = {
  title: { id: 'modal.create_title', ar: 'إضافة فوج جديد', fr: 'Créer un nouveau module', en: 'Create New Module' },
  name: { id: 'field.name', ar: 'اسم الفوج', fr: 'Nom du module', en: 'Module Name' },
  level: { id: 'field.level', ar: 'المستوى الدراسي', fr: 'Niveau d\'étude', en: 'Level / Grade' },
  subject: { id: 'field.subject', ar: 'المادة', fr: 'Matière', en: 'Subject' },
  teacher: { id: 'field.teacher', ar: 'الأستاذ', fr: 'Enseignant', en: 'Teacher' },
  monthlyPrice: { id: 'field.monthly_price', ar: 'السعر الشهري (د.ج)', fr: 'Prix mensuel (DZD)', en: 'Monthly Price (DZD)' },
  sessionPrice: { id: 'field.session_price', ar: 'سعر الحصة (د.ج)', fr: 'Prix par séance (DZD)', en: 'Session Price (DZD)' },
  startDate: { id: 'field.start_date', ar: 'تاريخ البداية', fr: 'Date de début', en: 'Start Date' },
  endDate: { id: 'field.end_date', ar: 'تاريخ النهاية', fr: 'Date de fin', en: 'End Date' },
  scheduleTitle: { id: 'section.schedule', ar: 'برنامج الحصص الأسبوعي', fr: 'Emploi du temps', en: 'Schedule Sessions' },
  day: { id: 'field.day', ar: 'اليوم', fr: 'Jour', en: 'Day' },
  startTime: { id: 'field.start_time', ar: 'وقت البداية', fr: 'Heure de début', en: 'Start Time' },
  endTime: { id: 'field.end_time', ar: 'وقت النهاية', fr: 'Heure de fin', en: 'End Time' },
  classroom: { id: 'field.classroom', ar: 'القاعة', fr: 'Salle de classe', en: 'Classroom' },
  addSchedule: { id: 'btn.add_schedule', ar: 'إضافة حصة جديدة', fr: 'Ajouter un créneau', en: 'Add Schedule Slot' },
  cancel: { id: 'btn.cancel', ar: 'إلغاء', fr: 'Annuler', en: 'Cancel' },
  create: { id: 'btn.create', ar: 'إنشاء الفوج', fr: 'Créer', en: 'Create Module' },
  creating: { id: 'btn.creating', ar: 'جاري الإنشاء...', fr: 'Création...', en: 'Creating...' },
  fillAllError: { id: 'err.fill_all', ar: 'يرجى ملء جميع الحقول المطلوبة', fr: 'Veuillez remplir tous les champs requis', en: 'Please fill in all required fields' },
  scheduleError: { id: 'err.schedule', ar: 'يرجى إكمال تفاصيل جميع الحصص', fr: 'Veuillez remplir tous les champs du planning', en: 'All schedule fields must be completely filled out' },
};

const DAYS_AR = [
  { value: 'MONDAY', label: 'الإثنين' },
  { value: 'TUESDAY', label: 'الثلاثاء' },
  { value: 'WEDNESDAY', label: 'الأربعاء' },
  { value: 'THURSDAY', label: 'الخميس' },
  { value: 'FRIDAY', label: 'الجمعة' },
  { value: 'SATURDAY', label: 'السبت' },
  { value: 'SUNDAY', label: 'الأحد' },
];

const fetchSubjects = async () => {
  const response = await electronAPI.subject.getAll({ where: { isActive: true } });
  if (!response.success) throw new Error(response.error);
  return response.data;
};

const fetchTeachers = async () => {
  const response = await electronAPI.teacher.getAll({ where: { isActive: true } });
  if (!response.success) throw new Error(response.error);
  return response.data;
};

const fetchClassrooms = async () => {
  const response = await electronAPI.classroom.getAll({ where: { isActive: true } });
  if (!response.success) throw new Error(response.error);
  return response.data;
};

const createModule = async (dto) => {
  const response = await electronAPI.module.createWithSessions(dto);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

const initialFormState = {
  name: '',
  level: '',
  subjectId: '',
  teacherId: '',
  monthlyPrice: '',
  sessionPrice: '',
  startDate: '',
  endDate: '',
  schedules: [{ day: '', startTime: '', endTime: '', classroomId: '' }],
};

export default function CreateModuleModal({ open, onClose, onSuccess }) {
  const [formData, setFormData] = useState(initialFormState);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (open) {
      setFormData(initialFormState);
      setFormError('');
    }
  }, [open]);

  const { data: subjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: fetchSubjects,
    enabled: open,
  });

  const { data: teachers = [], isLoading: loadingTeachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: fetchTeachers,
    enabled: open,
  });

  const { data: classrooms = [], isLoading: loadingClassrooms } = useQuery({
    queryKey: ['classrooms'],
    queryFn: fetchClassrooms,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: createModule,
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error) => setFormError(error.message || TEXTS.fillAllError.ar),
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleScheduleChange = (index, field, value) => {
    const updated = [...formData.schedules];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, schedules: updated }));
  };

  const addSchedule = () => {
    setFormData((prev) => ({
      ...prev,
      schedules: [...prev.schedules, { day: '', startTime: '', endTime: '', classroomId: '' }],
    }));
  };

  const removeSchedule = (index) => {
    if (formData.schedules.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      schedules: prev.schedules.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    const required = ['name', 'level', 'subjectId', 'teacherId', 'monthlyPrice', 'sessionPrice', 'startDate', 'endDate'];
    for (const field of required) {
      if (!formData[field]) {
        setFormError(TEXTS.fillAllError.ar);
        return;
      }
    }

    for (const s of formData.schedules) {
      if (!s.day || !s.startTime || !s.endTime || !s.classroomId) {
        setFormError(TEXTS.scheduleError.ar);
        return;
      }
    }

    const dto = {
      name: formData.name.trim(),
      level: formData.level.trim(),
      subjectId: Number(formData.subjectId),
      teacherId: Number(formData.teacherId),
      monthlyPrice: parseFloat(formData.monthlyPrice),
      sessionPrice: parseFloat(formData.sessionPrice),
      startDate: formData.startDate,
      endDate: formData.endDate,
      schedules: formData.schedules.map((s) => ({
        day: s.day,
        startTime: s.startTime,
        endTime: s.endTime,
        classroomId: Number(s.classroomId),
      })),
    };

    mutation.mutate(dto);
  };

  const isLoadingData = loadingSubjects || loadingTeachers || loadingClassrooms;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth dir="rtl">
      <DialogTitle>{TEXTS.title.ar}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}

          {isLoadingData ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label={TEXTS.name.ar}
                fullWidth
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />

              <TextField
                label={TEXTS.level.ar}
                fullWidth
                value={formData.level}
                onChange={(e) => handleChange('level', e.target.value)}
                required
              />

              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <FormControl fullWidth required>
                  <InputLabel>{TEXTS.subject.ar}</InputLabel>
                  <Select
                    value={formData.subjectId}
                    onChange={(e) => handleChange('subjectId', e.target.value)}
                    label={TEXTS.subject.ar}
                  >
                    {subjects.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth required>
                  <InputLabel>{TEXTS.teacher.ar}</InputLabel>
                  <Select
                    value={formData.teacherId}
                    onChange={(e) => handleChange('teacherId', e.target.value)}
                    label={TEXTS.teacher.ar}
                  >
                    {teachers.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.firstName} {t.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  label={TEXTS.monthlyPrice.ar}
                  type="number"
                  fullWidth
                  value={formData.monthlyPrice}
                  onChange={(e) => handleChange('monthlyPrice', e.target.value)}
                  required
                  inputProps={{ min: 0, step: 'any' }}
                />
                <TextField
                  label={TEXTS.sessionPrice.ar}
                  type="number"
                  fullWidth
                  value={formData.sessionPrice}
                  onChange={(e) => handleChange('sessionPrice', e.target.value)}
                  required
                  inputProps={{ min: 0, step: 'any' }}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  label={TEXTS.startDate.ar}
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  required
                />
                <TextField
                  label={TEXTS.endDate.ar}
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  required
                />
              </Box>

              <Typography variant="h6" sx={{ mt: 2 }}>
                {TEXTS.scheduleTitle.ar}
              </Typography>

              {formData.schedules.map((schedule, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'center',
                    flexWrap: { xs: 'wrap', sm: 'nowrap' },
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <FormControl sx={{ minWidth: 130, flex: 1 }}>
                    <InputLabel>{TEXTS.day.ar}</InputLabel>
                    <Select
                      value={schedule.day}
                      onChange={(e) => handleScheduleChange(index, 'day', e.target.value)}
                      label={TEXTS.day.ar}
                      required
                    >
                      {DAYS_AR.map((d) => (
                        <MenuItem key={d.value} value={d.value}>
                          {d.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    label={TEXTS.startTime.ar}
                    type="time"
                    InputLabelProps={{ shrink: true }}
                    value={schedule.startTime}
                    onChange={(e) => handleScheduleChange(index, 'startTime', e.target.value)}
                    required
                    sx={{ width: { xs: '48%', sm: 130 } }}
                  />

                  <TextField
                    label={TEXTS.endTime.ar}
                    type="time"
                    InputLabelProps={{ shrink: true }}
                    value={schedule.endTime}
                    onChange={(e) => handleScheduleChange(index, 'endTime', e.target.value)}
                    required
                    sx={{ width: { xs: '48%', sm: 130 } }}
                  />

                  <FormControl sx={{ minWidth: 140, flex: 1 }}>
                    <InputLabel>{TEXTS.classroom.ar}</InputLabel>
                    <Select
                      value={schedule.classroomId}
                      onChange={(e) => handleScheduleChange(index, 'classroomId', e.target.value)}
                      label={TEXTS.classroom.ar}
                      required
                    >
                      {classrooms.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <IconButton
                    color="error"
                    onClick={() => removeSchedule(index)}
                    disabled={formData.schedules.length <= 1}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}

              <Button
                startIcon={<AddIcon />}
                onClick={addSchedule}
                variant="outlined"
                sx={{ alignSelf: 'flex-start', mt: 1 }}
              >
                {TEXTS.addSchedule.ar}
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={mutation.isPending}>
            {TEXTS.cancel.ar}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={mutation.isPending || isLoadingData}
            startIcon={mutation.isPending && <CircularProgress size={20} color="inherit" />}
          >
            {mutation.isPending ? TEXTS.creating.ar : TEXTS.create.ar}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}