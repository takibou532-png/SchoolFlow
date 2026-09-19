import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import { DataGrid } from '@mui/x-data-grid';
import { electronAPI, isElectronAvailable } from '../../../utils/electron';
import { useSchoolStore } from '../../../store/SchoolStore';

// ─── UI Translations (Arabic) ─────────────────────
const TEXTS = {
  headerTitle: { id: 'drawer.title', ar: 'تفاصيل الفوج', fr: 'Aperçu du module', en: 'Module Overview' },
  statusActive: { id: 'status.active', ar: 'نشط', fr: 'Actif', en: 'Active' },
  statusArchived: { id: 'status.archived', ar: 'مؤرشف', fr: 'Archivé', en: 'Archived' },
  sessionsCount: { id: 'label.sessions', ar: 'حصة/دورة', fr: 'séances/cycle', en: 'sessions/cycle' },
  enrolledStudents: { id: 'label.enrolled', ar: 'تلميذ مسجل', fr: 'Élèves inscrits', en: 'Enrolled Students' },
  tabInfo: { id: 'tab.info', ar: 'المعلومات العامة', fr: 'Informations', en: 'Information' },
  tabStudents: { id: 'tab.students', ar: 'قائمة التلاميذ', fr: 'Liste des élèves', en: 'Students List' },
  tabRevenue: { id: 'tab.revenue', ar: 'الملخص المالي', fr: 'Bilan financier', en: 'Financial Breakdown' },
  subject: { id: 'field.subject', ar: 'المادة', fr: 'Matière', en: 'Subject' },
  teacher: { id: 'field.teacher', ar: 'الأستاذ المعين', fr: 'Enseignant', en: 'Assigned Teacher' },
  period: { id: 'field.period', ar: 'فترة النشاط', fr: 'Période d\'activité', en: 'Active Period' },
  monthlyPrice: { id: 'field.monthly_price', ar: 'السعر الشهري', fr: 'Prix mensuel', en: 'Monthly Price' },
  sessionPrice: { id: 'field.session_price', ar: 'سعر الحصة الواحدة', fr: 'Prix par séance', en: 'Single Session Price' },
  totalRevenue: { id: 'rev.total', ar: 'إجمالي مداخيل الفوج', fr: 'Revenu total', en: 'Total Revenue' },
  paidRevenue: { id: 'rev.paid', ar: 'المداخيل المحصلة', fr: 'Revenu encaissé', en: 'Collected / Paid' },
  pendingRevenue: { id: 'rev.pending', ar: 'المبالغ المتبقية (غير مدفوعة)', fr: 'Reste à payer', en: 'Pending Balance' },
  colId: { id: 'col.id', ar: 'المعرف', fr: 'ID', en: 'ID' },
  colFirstName: { id: 'col.first_name', ar: 'الاسم', fr: 'Prénom', en: 'First Name' },
  colLastName: { id: 'col.last_name', ar: 'اللقب', fr: 'Nom', en: 'Last Name' },
  colGuardian: { id: 'col.guardian', ar: 'ولي الأمر', fr: 'Tuteur', en: 'Guardian' },
  colEnrolledAt: { id: 'col.enrolled_at', ar: 'تاريخ التسجيل', fr: 'Date d\'inscription', en: 'Enrolled Date' },
  printStudents: { id: 'action.print_students', ar: 'طباعة القائمة', fr: 'Imprimer la liste', en: 'Print List' },
};

const fetchModuleDetails = async (moduleId) => {
  const [detailsRes, studentsRes, revenueRes] = await Promise.all([
    electronAPI.module.getWithDetails(moduleId),
    electronAPI.module.getStudents(moduleId),
    electronAPI.module.getRevenue(moduleId),
  ]);
    console.log("students",studentsRes);
  if (!detailsRes.success) throw new Error(detailsRes.error);
  if (!studentsRes.success) throw new Error(studentsRes.error);
  if (!revenueRes.success) throw new Error(revenueRes.error);
  
  return {
    details: detailsRes.data,
    students: studentsRes.data,
    revenue: revenueRes.data,
  };
};

/**
 * Builds a printable HTML document listing students' full name + phone
 * number, with the school logo/name header — same visual language as the
 * invoice and teacher-payment printouts.
 */
function buildStudentListHtml({ students, moduleName, moduleLevel, schoolName, logoDataUrl }) {
  const rows = (students || []).map((s, i) => `
    <tr>
      <td class="idx">${i + 1}</td>
      <td class="name">${s.firstName || ''} ${s.lastName || ''}</td>
      <td class="phone">${s.phoneNumber || '—'}</td>
    </tr>
  `).join('');

  return `
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8" />
        <title>قائمة التلاميذ - ${moduleName || ''}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 40px;
            direction: rtl;
            text-align: right;
            color: #0F172A;
          }
          .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #1976d2; padding-bottom: 16px; }
          .header img { max-width: 72px; max-height: 72px; object-fit: contain; margin-bottom: 10px; }
          .header h1 { margin: 0; font-size: 20px; }
          .header p { margin: 4px 0 0; font-size: 12px; color: #666; }
          .module-title { text-align: center; margin-bottom: 20px; }
          .module-title h2 { margin: 0; font-size: 16px; color: #1976d2; }
          .module-title span { font-size: 12px; color: #94A3B8; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #E2E8F0; padding: 10px; text-align: right; font-size: 13px; }
          th { background: #F8FAFC; font-weight: 700; color: #475569; }
          td.idx { width: 40px; text-align: center; color: #94A3B8; }
          td.phone { direction: ltr; text-align: right; }
          .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #94A3B8; }
          @media print {
            @page { margin: 14mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoDataUrl ? `<img src="${logoDataUrl}" alt="${schoolName || ''}" />` : ''}
          <h1>${schoolName || 'المؤسسة التعليمية'}</h1>
          <p>قائمة التلاميذ</p>
        </div>

        <div class="module-title">
          <h2>${moduleName || ''} ${moduleLevel ? `(${moduleLevel})` : ''}</h2>
          <span>${(students || []).length} تلميذ مسجل</span>
        </div>

        <table>
          <thead>
            <tr>
              <th class="idx">#</th>
              <th>الاسم الكامل</th>
              <th>رقم الهاتف</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <p class="footer">تم إصدار هذه القائمة بتاريخ ${new Date().toLocaleDateString('fr-DZ')}</p>
      </body>
    </html>
  `;
}

export default function ModuleDetailsDrawer({ open, onClose, moduleId }) {
  const [tabIndex, setTabIndex] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState(null);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const { school } = useSchoolStore();

  // ─── Resolve saved logo to a displayable data URL ──
  // Same pattern as Sidebar.jsx / InvoicePrintModal.jsx.
  useEffect(() => {
    if (!school?.logoPath) {
      setLogoDataUrl(null);
      return;
    }
    if (isElectronAvailable()) {
      electronAPI.school.getLogo(school.logoPath).then((res) => {
        if (res.success) setLogoDataUrl(res.dataUrl);
      });
    } else {
      setLogoDataUrl(school.logoPath);
    }
  }, [school?.logoPath]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['module-details', moduleId],
    queryFn: () => fetchModuleDetails(moduleId),
    enabled: !!moduleId && open,
  });

  const handleTabChange = (_, newIndex) => setTabIndex(newIndex);

  const handlePrintStudents = async () => {
    if (!data) return;
    setPrintError(null);
    setIsPrinting(true);
    try {
      const html = buildStudentListHtml({
        students: data.students,
        moduleName: data.details.module.name,
        moduleLevel: data.details.module.level,
        schoolName: school?.name,
        logoDataUrl,
      });

      const result = await electronAPI.printAPI.openPdf(html, {
        fileName: `قائمة-تلاميذ-${data.details.module.name || moduleId}`,
      });

      if (!result.success) {
        throw new Error(result.error || 'فشلت عملية الطباعة');
      }
    } catch (err) {
      console.error('Student list print failed:', err);
      setPrintError('تعذرت طباعة القائمة. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsPrinting(false);
    }
  };

  if (!moduleId) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 600, md: 700 } } }}
    >
      <Box sx={{ p: 3 }} dir="rtl">
        {/* Header Bar */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="div">
            {TEXTS.headerTitle.ar}
          </Typography>
          <IconButton onClick={onClose} edge="start">
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error.message}</Alert>
        ) : data ? (
          <>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" fontWeight="bold">
                {data.details.module.name} ({data.details.module.level})
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={data.details.module.isActive ? TEXTS.statusActive.ar : TEXTS.statusArchived.ar}
                  color={data.details.module.isActive ? 'success' : 'default'}
                  size="small"
                />
                <Chip
                  label={`${data.details.module.sessionsPerMonth || 0} ${TEXTS.sessionsCount.ar}`}
                  variant="outlined"
                  size="small"
                />
                <Chip
                  label={`${data.students?.length || 0} ${TEXTS.enrolledStudents.ar}`}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Tabs value={tabIndex} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', flex: 1 }}>
                <Tab label={TEXTS.tabInfo.ar} />
                <Tab label={`${TEXTS.tabStudents.ar} (${data.students?.length || 0})`} />
                <Tab label={TEXTS.tabRevenue.ar} />
              </Tabs>

              {tabIndex === 1 && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handlePrintStudents}
                  disabled={isPrinting || !data.students?.length}
                  startIcon={isPrinting ? <CircularProgress size={16} /> : <PrintIcon />}
                  sx={{ ml: 2, mb: 1, whiteSpace: 'nowrap' }}
                >
                  {isPrinting ? 'جارٍ التحضير...' : TEXTS.printStudents.ar}
                </Button>
              )}
            </Box>

            {printError && tabIndex === 1 && (
              <Alert severity="error" sx={{ mb: 2 }}>{printError}</Alert>
            )}

            {/* Tab 0: Información */}
            {tabIndex === 0 && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      {TEXTS.subject.ar}
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {data.details.subject?.name || '-'}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      {TEXTS.teacher.ar}
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {data.details.teacher
                        ? `${data.details.teacher.firstName} ${data.details.teacher.lastName}`
                        : '-'}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      {TEXTS.period.ar}
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      من {data.details.module.startDate} إلى {data.details.module.endDate}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      {TEXTS.monthlyPrice.ar}
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {Number(data.details.module.monthlyPrice).toLocaleString()} د.ج
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      {TEXTS.sessionPrice.ar}
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {Number(data.details.module.sessionPrice).toLocaleString()} د.ج
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {/* Tab 1: قائمة التلاميذ */}
            {tabIndex === 1 && (
              <Box sx={{ height: 450, width: '100%' }}>
                <DataGrid
                  rows={data.students || []}
                  columns={[
                    { field: 'id', headerName: TEXTS.colId.ar, width: 70 },
                    { field: 'firstName', headerName: TEXTS.colFirstName.ar, flex: 1, minWidth: 120 },
                    { field: 'lastName', headerName: TEXTS.colLastName.ar, flex: 1, minWidth: 120 },
                    { field: 'guardianName', headerName: TEXTS.colGuardian.ar, flex: 1, minWidth: 130 },
                    { field: 'enrolledAt', headerName: TEXTS.colEnrolledAt.ar, width: 130 },
                  ]}
                  pageSizeOptions={[5, 10, 25]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 10 } },
                  }}
                  disableRowSelectionOnClick
                />
              </Box>
            )}

            {/* Tab 2: المداخيل */}
            {tabIndex === 2 && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'primary.50' }}>
                    <Typography variant="caption" color="text.secondary">
                      {TEXTS.totalRevenue.ar}
                    </Typography>
                    <Typography variant="h5" color="primary.main" fontWeight="bold">
                      {(data.revenue?.total || 0).toLocaleString()} د.ج
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2, borderRight: '4px solid #2e7d32' }}>
                    <Typography variant="caption" color="text.secondary">
                      {TEXTS.paidRevenue.ar}
                    </Typography>
                    <Typography variant="h6" color="success.main" fontWeight="bold">
                      {(data.revenue?.paid || 0).toLocaleString()} د.ج
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2, borderRight: '4px solid #ed6c02' }}>
                    <Typography variant="caption" color="text.secondary">
                      {TEXTS.pendingRevenue.ar}
                    </Typography>
                    <Typography variant="h6" color="warning.main" fontWeight="bold">
                      {(data.revenue?.pending || 0).toLocaleString()} د.ج
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            )}
          </>
        ) : null}
      </Box>
    </Drawer>
  );
}