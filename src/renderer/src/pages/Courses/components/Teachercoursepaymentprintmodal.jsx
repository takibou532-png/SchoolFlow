import React, { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import PrintIcon from '@mui/icons-material/Print';
import { useSchoolStore } from '../../../store/SchoolStore';
import { electronAPI, isElectronAvailable } from '../../../utils/electron';

/**
 * Prints a receipt for a teacher's course payment (coursePayment row),
 * as opposed to TeacherPaymentPrintModal which prints a period-based
 * teacher payment ("factor") with a percentage cut.
 *
 * Expects:
 *   payment: { id, courseId, teacherId, amount, status, createdAt, paidAt }
 *     — straight from coursePayment.getPaymentsByCourse(courseId), no shape changes
 *   course: { name, subjectName, sessionPrice, sessions: [...], teacherId, ... }
 *     — straight from course.getWithSessions(courseId) (already loaded by CourseDetailsDrawer)
 *
 * There's no dedicated teacher record here (only course.teacherId), so the
 * teacher is shown as "الأستاذ رقم {teacherId}" — consistent with how the
 * rest of CourseDetailsDrawer already displays teachers.
 */
export default function TeacherCoursePaymentPrintModal({ open, onClose, payment, course }) {
  const { school } = useSchoolStore();
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState(null);
  const [logoDataUrl, setLogoDataUrl] = useState(null);

  // ─── Resolve saved logo to a displayable data URL ──
  // Same pattern as Sidebar.jsx / InvoicePrintModal.jsx / TeacherPaymentPrintModal.jsx.
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

  if (!payment || !course) return null;

  const teacherLabel = course?.teacherName || (course?.teacherId ? `الأستاذ رقم ${course.teacherId}` : 'غير محدد');
  const sessionCount = course.sessions?.length ?? '—';

  const handlePrint = async () => {
    setPrintError(null);
    setIsPrinting(true);

    const html = `
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8" />
          <title>وصل استحقاق أستاذ #${payment.id}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 40px;
              direction: rtl;
              text-align: right;
              color: #0F172A;
            }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1976d2; padding-bottom: 16px; }
            .header img { max-width: 72px; max-height: 72px; object-fit: contain; margin-bottom: 10px; }
            .header h1 { margin: 0; font-size: 20px; }
            .header p { margin: 4px 0 0; font-size: 12px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            td { padding: 10px 4px; font-size: 14px; border-bottom: 1px solid #F1F5F9; }
            td:first-child { color: #64748B; width: 45%; }
            td:last-child { font-weight: 600; text-align: left; }
            .amount-box {
              background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 10px;
              padding: 18px 22px; display: flex; align-items: center; justify-content: space-between;
              margin-top: 28px;
            }
            .amount-label { font-size: 13px; color: #64748B; }
            .amount-value { font-size: 22px; font-weight: 800; color: #059669; }
            .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #94A3B8; }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoDataUrl ? `<img src="${logoDataUrl}" alt="${school?.name || ''}" />` : ''}
            <h1>${school?.name || 'المؤسسة التعليمية'}</h1>
            <p>وصل استحقاق أستاذ #${payment.id}</p>
          </div>

          <table>
            <tr><td>الأستاذ</td><td>${teacherLabel}</td></tr>
            <tr><td>الدورة</td><td>${course.name || '—'}</td></tr>
            <tr><td>المادة</td><td>${course.subjectName || '—'}</td></tr>
            <tr><td>عدد الحصص</td><td>${sessionCount}</td></tr>
            <tr><td>تاريخ الإنشاء</td><td>${payment.createdAt || '—'}</td></tr>
            <tr><td>تاريخ الدفع</td><td>${payment.paidAt || '—'}</td></tr>
          </table>

          <div class="amount-box">
            <span class="amount-label">المبلغ المدفوع</span>
            <span class="amount-value">${payment.amount} د.ج</span>
          </div>

          <p class="footer">تم إصدار هذا الوصل بتاريخ ${new Date().toLocaleDateString('fr-DZ')}</p>
        </body>
      </html>
    `;

    try {
      const result = await electronAPI.printAPI.openPdf(html, {
        fileName: `وصل-استحقاق-${teacherLabel}-${payment.id}`,
      });

      if (!result.success) {
        throw new Error(result.error || 'فشلت عملية الطباعة');
      }

      onClose();
    } catch (err) {
      console.error('Teacher course payment print failed:', err);
      setPrintError('تعذرت الطباعة. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth dir="rtl">
      <DialogTitle>معاينة وصل الاستحقاق</DialogTitle>
      <DialogContent>
        <Box sx={{ p: 1 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            {logoDataUrl && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
                <Box
                  component="img"
                  src={logoDataUrl}
                  alt={school?.name || 'المدرسة'}
                  sx={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 1 }}
                />
              </Box>
            )}
            <Typography variant="h6" fontWeight="bold">{teacherLabel}</Typography>
            <Typography variant="body2" color="textSecondary">وصل استحقاق #{payment.id}</Typography>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2"><strong>الدورة:</strong> {course.name}</Typography>
            <Typography variant="body2"><strong>المادة:</strong> {course.subjectName}</Typography>
            <Typography variant="body2"><strong>عدد الحصص:</strong> {sessionCount}</Typography>
            <Typography variant="body2"><strong>تاريخ الدفع:</strong> {payment.paidAt || '—'}</Typography>
            <Typography variant="body2"><strong>المبلغ:</strong> {payment.amount} د.ج</Typography>
          </Box>
        </Box>

        {printError && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {printError}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPrinting}>إغلاق</Button>
        <Button
          onClick={handlePrint}
          variant="contained"
          disabled={isPrinting}
          startIcon={isPrinting ? <CircularProgress size={18} color="inherit" /> : <PrintIcon />}
        >
          {isPrinting ? 'جارٍ التحضير...' : 'طباعة'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}