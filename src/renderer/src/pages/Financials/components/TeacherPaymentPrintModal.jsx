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

export default function TeacherPaymentPrintModal({ open, onClose, payment, teacher }) {
  const { school } = useSchoolStore();
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState(null);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [stampDataUrl, setStampDataUrl] = useState(null);

  // ─── Fetch logo ──────────────────────────────────
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

  // ─── Fetch stamp ──────────────────────────────────
  useEffect(() => {
    if (!isElectronAvailable()) {
      setStampDataUrl(null);
      return;
    }
    electronAPI.school.getStamp().then((res) => {
      if (res.success) setStampDataUrl(res.dataUrl);
    });
  }, []);

  if (!payment || !teacher) return null;

  const fullName = `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || 'غير معروف';
  const percentage = teacher.paymentPercentage != null ? `${teacher.paymentPercentage}%` : '—';
  const sessionCount = payment.totalSessions ?? payment.sessionCount ?? '—';

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
           .stamp-container { text-align: center; margin-top: 30px; }
.stamp-container img { width: 150px; height: 100px; object-fit: contain; }
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
            <tr><td>اسم الأستاذ</td><td>${fullName}</td></tr>
            <tr><td>الفترة</td><td>${payment.periodStart || '—'} إلى ${payment.periodEnd || '—'}</td></tr>
            <tr><td>نسبة الأستاذ</td><td>${percentage}</td></tr>
            <tr><td>عدد الحصص في هذه الفترة</td><td>${sessionCount}</td></tr>
            <tr><td>تاريخ الدفع</td><td>${payment.paidAt || '—'}</td></tr>
          </table>

          <div class="amount-box">
            <span class="amount-label">المبلغ المدفوع</span>
            <span class="amount-value">${payment.amount} د.ج</span>
          </div>

          <div class="stamp-container">
            ${stampDataUrl ? `<img src="${stampDataUrl}" alt="ختم وتوقيع المدرسة" />` : ''}
          </div>

          <p class="footer">تم إصدار هذا الوصل بتاريخ ${new Date().toLocaleDateString('fr-DZ')}</p>
        </body>
      </html>
    `;

    try {
      const result = await electronAPI.printAPI.openPdf(html, {
        fileName: `وصل-استحقاق-${fullName}-${payment.id}`,
      });

      if (!result.success) {
        throw new Error(result.error || 'فشلت عملية الطباعة');
      }

      onClose();
    } catch (err) {
      console.error('Teacher payment print failed:', err);
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
            <Typography variant="h6" fontWeight="bold">{fullName}</Typography>
            <Typography variant="body2" color="textSecondary">وصل استحقاق #{payment.id}</Typography>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2"><strong>الفترة:</strong> {payment.periodStart} إلى {payment.periodEnd}</Typography>
            <Typography variant="body2"><strong>نسبة الأستاذ:</strong> {percentage}</Typography>
            <Typography variant="body2"><strong>عدد الحصص:</strong> {sessionCount}</Typography>
            <Typography variant="body2"><strong>المبلغ:</strong> {payment.amount} د.ج</Typography>
          </Box>

          {stampDataUrl && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Box
                component="img"
                src={stampDataUrl}
                alt="ختم المدرسة"
                sx={{ maxWidth: 140, maxHeight: 70, objectFit: 'contain' }}
              />
            </Box>
          )}
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