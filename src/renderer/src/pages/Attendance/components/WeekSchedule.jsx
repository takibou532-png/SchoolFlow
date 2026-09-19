import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { styled } from '@mui/material/styles';
import PrintIcon from '@mui/icons-material/Print';
import { useSchoolStore } from '../../../store/SchoolStore';
import { electronAPI, isElectronAvailable } from '../../../utils/electron';

const fetchSessionsByWeek = async (weekStart) => {
  const response = await electronAPI.session.getByWeek(weekStart, { includeCancelled: false });
  if (!response.success) throw new Error(response.error);
  return response.data;
};

const DayCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  minHeight: 150,
  backgroundColor: theme.palette.background.paper,
  borderRadius: 8,
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
}));

const SessionTime = styled(Typography)({
  fontWeight: 500,
  fontSize: '0.9rem',
  color: '#1976d2',
});

const SessionModule = styled(Typography)({
  fontSize: '0.8rem',
  color: '#666',
});

// ─── Saturday-first week order (Arabic/Algerian calendar) ──
// Internal keys stay in English (used only as lookup keys, never rendered)
const days = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const dayLabels = {
  Saturday: 'السبت',
  Sunday: 'الأحد',
  Monday: 'الإثنين',
  Tuesday: 'الثلاثاء',
  Wednesday: 'الأربعاء',
  Thursday: 'الخميس',
  Friday: 'الجمعة',
};

/**
 * Builds a full, self-contained HTML document for the weekly schedule,
 * mirroring the on-screen layout (RTL, 7-day grid) so the generated PDF
 * looks like what the admin sees in the app. Header mirrors the invoice
 * printer: school logo (if any) + school name, then the report title.
 */
function buildScheduleHtml(sessionsByDay, weekStart, school, logoDataUrl) {
  const dayColumns = days.map((day) => {
    const sessions = sessionsByDay[day] || [];
    const rows = sessions.length === 0
      ? `<p class="empty">لا توجد حصص</p>`
      : sessions.map((s) => `
          <div class="session">
            <p class="time">${s.startTime} – ${s.endTime}</p>
            <p class="module">${s.moduleName || `الوحدة #${s.moduleId}`}</p>
          </div>
        `).join('');

    return `
      <div class="day-col">
        <h3>${dayLabels[day]}</h3>
        ${rows}
      </div>
    `;
  }).join('');

  return `
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8" />
        <title>الجدول الأسبوعي</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 32px;
            direction: rtl;
            color: #0F172A;
          }
          .header {
            text-align: center;
            margin-bottom: 24px;
            border-bottom: 2px solid #1976d2;
            padding-bottom: 14px;
          }
          .header img {
            max-width: 70px;
            max-height: 70px;
            object-fit: contain;
            margin-bottom: 8px;
          }
          .header h1 { margin: 0; font-size: 20px; }
          .header p { margin: 4px 0 0; font-size: 12px; color: #666; }
          .grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 8px;
          }
          .day-col {
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 10px;
            min-height: 140px;
          }
          .day-col h3 {
            font-size: 13px;
            margin: 0 0 8px;
            border-bottom: 1px solid #F1F5F9;
            padding-bottom: 6px;
          }
          .session {
            margin-bottom: 8px;
            border-bottom: 1px solid #F1F5F9;
            padding-bottom: 6px;
          }
          .time { font-weight: 600; font-size: 11px; color: #1976d2; margin: 0; }
          .module { font-size: 10px; color: #666; margin: 2px 0 0; }
          .empty { font-size: 11px; color: #94A3B8; font-style: italic; margin: 0; }
          @media print {
            @page { size: landscape; margin: 12mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoDataUrl ? `<img src="${logoDataUrl}" alt="${school?.name || ''}" />` : ''}
          <h1>${school?.name || 'المؤسسة التعليمية'}</h1>
          <p>الجدول الأسبوعي${weekStart ? ` — أسبوع ${weekStart}` : ''}</p>
        </div>
        <div class="grid">
          ${dayColumns}
        </div>
      </body>
    </html>
  `;
}

export default function WeekSchedule({ weekStart }) {
  const { school } = useSchoolStore();
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState(null);

  // ─── Resolve saved logo to a displayable data URL ──
  // Same pattern as InvoicePrintModal / Sidebar.jsx: getLogo() already
  // returns a base64 data URL, which is exactly what we need to embed
  // directly into the printed HTML with no file path / CORS concerns.
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
    queryKey: ['sessions-week', weekStart],
    queryFn: () => fetchSessionsByWeek(weekStart),
    enabled: !!weekStart,
    staleTime: 0,
  });

  const sessionsByDay = {};
  days.forEach(day => { sessionsByDay[day] = []; });

  (data || []).forEach(session => {
    const day = new Date(session.date).toLocaleDateString('en-US', { weekday: 'long' });
    if (sessionsByDay[day]) {
      sessionsByDay[day].push(session);
    } else {
      sessionsByDay[day] = [session];
    }
  });

  const handlePrint = async () => {
    setPrintError(null);
    setIsPrinting(true);
    try {
      const html = buildScheduleHtml(sessionsByDay, weekStart, school, logoDataUrl);
      // Same "Option B" flow as invoices: generate a PDF and open it in the
      // OS default viewer. One click, no dialogs, no page navigation —
      // the admin never has to touch anything else on the page.
      const result = await electronAPI.printAPI.openPdf(html, {
        fileName: `الجدول-الأسبوعي-${weekStart || ''}`,
        pdfOptions: { landscape: true, pageSize: 'A4' },
      });

      if (!result.success) {
        throw new Error(result.error || 'فشلت عملية الطباعة');
      }
    } catch (err) {
      console.error('Schedule print failed:', err);
      setPrintError('تعذرت طباعة الجدول. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsPrinting(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error.message}</Alert>;
  }

  if (!data || data.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        لا توجد حصص عادية لهذا الأسبوع.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>الجدول الأسبوعي</Typography>
        <Button
          variant="outlined"
          onClick={handlePrint}
          disabled={isPrinting}
          startIcon={isPrinting ? <CircularProgress size={16} /> : <PrintIcon />}
        >
          {isPrinting ? 'جارٍ التحضير...' : 'طباعة الجدول'}
        </Button>
      </Box>

      {printError && (
        <Alert severity="error" sx={{ mb: 2 }}>{printError}</Alert>
      )}

      <Grid container spacing={2}>
        {days.map((day) => {
          const sessions = sessionsByDay[day] || [];
          return (
            <Grid item xs={12} md={6} lg={12 / 7} key={day}>
              <DayCard variant="outlined">
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                  {dayLabels[day]}
                </Typography>
                {sessions.length === 0 ? (
                  <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                    لا توجد حصص
                  </Typography>
                ) : (
                  sessions.map((session) => (
                    <Box key={session.id} sx={{ mb: 1, borderBottom: '1px solid #f0f0f0', pb: 1 }}>
                      <SessionTime>
                        {session.startTime} – {session.endTime}
                      </SessionTime>
                      <SessionModule>
                        {session.moduleName || `الوحدة #${session.moduleId}`}
                      </SessionModule>
                    </Box>
                  ))
                )}
              </DayCard>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}