// Settings.jsx (Arabic version) – with Logo + Stamp
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import { electronAPI, isElectronAvailable } from '../../utils/electron';
import { useSchoolStore } from '../../store/SchoolStore';

// ─── Validation Schema ────────────────────────────
const schoolSchema = z.object({
  name: z.string().min(2, 'اسم المدرسة مطلوب'),
});

// ─── API Functions ────────────────────────────────
const fetchSchool = async () => {
  if (!isElectronAvailable()) {
    console.warn('Electron API not available – using mock data');
    return { id: 1, name: 'مدرستي', logoPath: null, stampPath: null };
  }
  const response = await electronAPI.school.get();
  if (!response.success) throw new Error(response.error || 'فشل جلب بيانات المدرسة');
  return response.data;
};

const updateSchool = async ({ id, data }) => {
  if (!isElectronAvailable()) {
    console.warn('Electron API not available – mock update');
    return { id, ...data };
  }
  const response = await electronAPI.school.update( id, data );
  console.log(" update :",response)
  if (!response.success) throw new Error(response.error);
  return response.data;
};

// ─── Settings Component ───────────────────────────
export default function Settings() {
  const queryClient = useQueryClient();
  const { school, setSchool } = useSchoolStore();
  const [logoPreview, setLogoPreview] = useState(null);
  const [selectedLogoPath, setSelectedLogoPath] = useState(null);
  const [stampPreview, setStampPreview] = useState(null);
  const [selectedStampPath, setSelectedStampPath] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // ─── Electron availability ───────────────────────
  const [electronAvailable, setElectronAvailable] = useState(isElectronAvailable());

  // ─── Fetch School Data ──────────────────────────
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['school'],
    queryFn: fetchSchool,
    retry: 1,
    staleTime: 1000 * 60 * 5,
  });

  // ─── Fetch Logo and Stamp (if paths exist) ──────
  const { data: logoDataUrl } = useQuery({
    queryKey: ['school-logo'],
    queryFn: async () => {
      if (!data?.logoPath || !electronAvailable) return null;
      const res = await electronAPI.school.getLogo(data.logoPath);
      return res.success ? res.dataUrl : null;
    },
    enabled: !!data?.logoPath && electronAvailable,
    staleTime: 1000 * 60 * 5,
  });

  const { data: stampDataUrl } = useQuery({
    queryKey: ['school-stamp'],
    queryFn: async () => {
      if (!data?.stampPath || !electronAvailable) return null;
      const res = await electronAPI.school.getStamp();
      return res.success ? res.dataUrl : null;
    },
    enabled: !!data?.stampPath && electronAvailable,
    staleTime: 1000 * 60 * 5,
  });

  // ─── Update store and preview when data loads ──
  useEffect(() => {
    if (data) {
      setSchool(data);
    }
  }, [data, setSchool]);

  useEffect(() => {
    if (logoDataUrl) setLogoPreview(logoDataUrl);
  }, [logoDataUrl]);

  useEffect(() => {
    if (stampDataUrl) setStampPreview(stampDataUrl);
  }, [stampDataUrl]);

  // ─── Form ────────────────────────────────────────
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      name: data?.name || '',
    },
  });

  useEffect(() => {
    if (data) {
      reset({ name: data.name });
    }
  }, [data, reset]);

  // ─── Update Mutation ────────────────────────────
  const updateMutation = useMutation({
    mutationFn: updateSchool,
    onSuccess: (updatedSchool) => {
      setSchool(updatedSchool);
      queryClient.invalidateQueries({ queryKey: ['school'] });
      queryClient.invalidateQueries({ queryKey: ['school-logo'] });
      queryClient.invalidateQueries({ queryKey: ['school-stamp'] });
      setSnackbar({
        open: true,
        message: 'تم تحديث المدرسة بنجاح!',
        severity: 'success',
      });
      setSelectedLogoPath(null);
      setSelectedStampPath(null);
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.message || 'فشل تحديث المدرسة',
        severity: 'error',
      });
    },
  });

  // ─── Logo Selection ─────────────────────────────
  const handleSelectLogo = async () => {
    try {
      const response = await electronAPI.school.selectLogo();
      if (!response.success) return;
      setSelectedLogoPath(response.filePath);
      setLogoPreview(response.dataUrl);
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'فشل اختيار الشعار', severity: 'error' });
    }
  };

  // ─── Stamp Selection ────────────────────────────
  const handleSelectStamp = async () => {
    try {
      const response = await electronAPI.school.selectStamp();
      if (!response.success) return;
      setSelectedStampPath(response.filePath);
      setStampPreview(response.dataUrl);
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'فشل اختيار الختم', severity: 'error' });
    }
  };

  // ─── Submit ──────────────────────────────────────
  const onSubmit = (formData) => {
    if (!data) {
      setSnackbar({
        open: true,
        message: 'لم يتم العثور على سجل للمدرسة. يرجى التحديث.',
        severity: 'error',
      });
      return;
    }
    const updateData = { name: formData.name };
    if (selectedLogoPath) {
      updateData.logoFile = { path: selectedLogoPath, name: 'logo.png' };
    }
    if (selectedStampPath) {
      updateData.stampFile = { path: selectedStampPath, name: 'stamp.png' };
    }
    updateMutation.mutate({ id: data.id, data: updateData });
  };

  // ─── Loading ─────────────────────────────────────
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // ─── Error ───────────────────────────────────────
  if (error) {
    return (
      <Box sx={{ m: 2 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              إعادة المحاولة
            </Button>
          }
        >
          فشل تحميل إعدادات المدرسة: {error.message}
        </Alert>
      </Box>
    );
  }

  // ─── No School Record ───────────────────────────
  if (!data) {
    return (
      <Box sx={{ m: 2 }}>
        <Alert severity="warning">
          لم يتم العثور على سجل للمدرسة. سيقوم النظام بإنشاء سجل تلقائيًا عند إعادة التشغيل التالية.
        </Alert>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => refetch()}>
          تحديث
        </Button>
      </Box>
    );
  }

  // ─── Render ──────────────────────────────────────
  return (
    <Box dir="rtl">
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        إعدادات المدرسة
      </Typography>

      {!electronAvailable && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          ⚠️ وضع المتصفح قيد التشغيل. قد لا تعمل بعض الميزات.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* ─── Logo Section ────────────────────────── */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                شعار المدرسة
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 2 }}>
                <Avatar
                  src={logoPreview || ''}
                  alt="شعار المدرسة"
                  sx={{
                    width: 140,
                    height: 140,
                    border: '2px solid #e0e0e0',
                    '& img': { objectFit: 'contain' },
                  }}
                >
                  {!logoPreview && (
                    <Typography variant="h2" color="textSecondary">
                      {data.name.charAt(0).toUpperCase()}
                    </Typography>
                  )}
                </Avatar>
                <Button
                  variant="outlined"
                  onClick={handleSelectLogo}
                  disabled={updateMutation.isPending}
                  fullWidth
                >
                  {logoPreview ? 'تغيير الشعار' : 'اختيار شعار'}
                </Button>
                {selectedLogoPath && (
                  <Typography variant="caption" color="textSecondary">
                    سيتم تحديث الشعار عند الحفظ.
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ─── Stamp (Signature + Cachet) Section ── */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ختم وتوقيع المدرسة
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 2 }}>
                <Avatar
                  src={stampPreview || ''}
                  alt="ختم المدرسة"
                  sx={{
                    width: 140,
                    height: 140,
                    border: '2px solid #e0e0e0',
                    '& img': { objectFit: 'contain' },
                  }}
                >
                  {!stampPreview && (
                    <Typography variant="h2" color="textSecondary">
                      خ
                    </Typography>
                  )}
                </Avatar>
                <Button
                  variant="outlined"
                  onClick={handleSelectStamp}
                  disabled={updateMutation.isPending}
                  fullWidth
                >
                  {stampPreview ? 'تغيير الختم' : 'اختيار ختم'}
                </Button>
                {selectedStampPath && (
                  <Typography variant="caption" color="textSecondary">
                    سيتم تحديث الختم عند الحفظ.
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ─── School Info Section ────────────────── */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                معلومات المدرسة
              </Typography>
              <form onSubmit={handleSubmit(onSubmit)}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                  <TextField
                    label="اسم المدرسة"
                    fullWidth
                    {...register('name')}
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    disabled={updateMutation.isPending}
                  />

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={(!isDirty && !selectedLogoPath && !selectedStampPath) || updateMutation.isPending}
                      loading={updateMutation.isPending}
                    >
                      حفظ الإعدادات
                    </Button>
                  </Box>
                </Box>
              </form>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ─── Snackbar ──────────────────────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}