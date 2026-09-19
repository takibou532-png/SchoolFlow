import React, { useEffect, useRef, useState } from 'react';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Avatar from '@mui/material/Avatar';

import PrintIcon from '@mui/icons-material/Print';

import { useSchoolStore } from '../../../store/SchoolStore';
import {
  electronAPI,
  isElectronAvailable,
} from '../../../utils/electron';

export default function InvoicePrintModal({
  open,
  onClose,
  invoice,
}) {
  const { school } = useSchoolStore();

  const printRef = useRef();

  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState(null);

  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [stampDataUrl, setStampDataUrl] = useState(null);

  // =========================================================
  // FETCH SCHOOL LOGO
  // =========================================================

  useEffect(() => {
    if (!school?.logoPath) {
      setLogoDataUrl(null);
      return;
    }

    if (isElectronAvailable()) {
      electronAPI.school
        .getLogo(school.logoPath)
        .then((res) => {
          if (res.success) {
            setLogoDataUrl(res.dataUrl);
          } else {
            setLogoDataUrl(null);
          }
        })
        .catch((err) => {
          console.error('Failed to load school logo:', err);
          setLogoDataUrl(null);
        });
    } else {
      setLogoDataUrl(school.logoPath);
    }
  }, [school?.logoPath]);

  // =========================================================
  // FETCH SCHOOL STAMP
  // =========================================================

  useEffect(() => {
    if (!isElectronAvailable()) {
      setStampDataUrl(null);
      return;
    }

    electronAPI.school
      .getStamp()
      .then((res) => {
        if (res.success) {
          setStampDataUrl(res.dataUrl);
        } else {
          setStampDataUrl(null);
        }
      })
      .catch((err) => {
        console.error('Failed to load school stamp:', err);
        setStampDataUrl(null);
      });
  }, []);

  // =========================================================
  // SAFETY CHECK
  // =========================================================

  if (!invoice) {
    return null;
  }

  // =========================================================
  // STATUS LABEL
  // =========================================================

  const getStatusLabel = (status) => {
    switch (status) {
      case 'paid':
        return 'مدفوعة';

      case 'pending':
        return 'معلقة';

      case 'overdue':
        return 'متأخرة';

      case 'cancelled':
        return 'ملغاة';

      default:
        return status || '';
    }
  };

  // =========================================================
  // PRINT / OPEN PDF
  // =========================================================

  const handlePrint = async () => {
    const content = printRef.current;

    if (!content) {
      return;
    }

    setPrintError(null);
    setIsPrinting(true);

    try {
      /*
       * IMPORTANT:
       *
       * MUI sx styles are NOT included when we use:
       *
       *     content.innerHTML
       *
       * Therefore the print HTML needs its own CSS.
       *
       * The stamp is a MUI Avatar:
       *
       * <div class="stamp-print">
       *    <img ... />
       * </div>
       *
       * So we explicitly style BOTH the container
       * and the actual img element.
       */

      const html = `
        <!DOCTYPE html>

        <html
          dir="rtl"
          lang="ar"
        >
          <head>

            <meta charset="UTF-8" />

            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />

            <title>
              فاتورة رقم #${invoice.id}
            </title>

            <style>

              /* =====================================================
                 PAGE
                 ===================================================== */

              @page {
                size: A4;
                margin: 20mm;
              }

              /* =====================================================
                 GLOBAL
                 ===================================================== */

              * {
                box-sizing: border-box;
              }

              html,
              body {
                width: 100%;
                margin: 0;
                padding: 0;
              }

              body {
                font-family:
                  "Segoe UI",
                  Tahoma,
                  Geneva,
                  Verdana,
                  sans-serif;

                direction: rtl;
                text-align: right;

                color: #222;

                font-size: 14px;

                line-height: 1.7;
              }

              /* =====================================================
                 HEADER
                 ===================================================== */

              .header {
                width: 100%;

                text-align: center;

                margin-bottom: 25px;

                padding-bottom: 15px;

                border-bottom: 2px solid #1976d2;
              }

              .header img {
                max-width: 80px !important;
                max-height: 80px !important;

                width: auto !important;
                height: auto !important;

                object-fit: contain;

                margin-bottom: 10px;
              }

              .header h1 {
                margin: 0;

                font-size: 24px;

                font-weight: 700;
              }

              /* =====================================================
                 DETAILS
                 ===================================================== */

              .details {
                width: 100%;

                margin-bottom: 20px;
              }

              .details table {
                width: 100%;

                border-collapse: collapse;
              }

              .details td {
                padding: 8px;
              }

              /* =====================================================
                 INVOICE TABLE
                 ===================================================== */

              .invoice-table {
                width: 100%;

                border-collapse: collapse;

                margin-top: 20px;
              }

              .invoice-table th,
              .invoice-table td {
                border: 1px solid #ddd;

                padding: 8px;

                text-align: right;
              }

              .invoice-table th {
                background-color: #f5f5f5;

                font-weight: 700;
              }

              /* =====================================================
                 STAMP
                 
                 THIS IS THE IMPORTANT PART.
                 ===================================================== */

              .stamp-container {
                width: 100%;

                text-align: center;

                margin-top: 18px;
              }

              /*
               * MUI Avatar becomes a DIV.
               *
               * We force the container to remain small.
               */

              .stamp-print {
                width: 100px !important;
                height: 50px !important;

                min-width: 100px !important;
                min-height: 50px !important;

                max-width: 100px !important;
                max-height: 50px !important;

                display: inline-flex !important;

                align-items: center !important;
                justify-content: center !important;

                overflow: hidden !important;

                border-radius: 0 !important;

                background: transparent !important;
              }

              /*
               * MOST IMPORTANT:
               *
               * Target the actual image INSIDE Avatar.
               */

              .stamp-print img {
                width: 100px !important;
                height: 50px !important;

                min-width: 0 !important;
                min-height: 0 !important;

                max-width: 100px !important;
                max-height: 50px !important;

                object-fit: contain !important;

                object-position: center !important;

                display: block !important;

                margin: 0 !important;

                padding: 0 !important;
              }

              /*
               * Prevent any generic image rule from
               * making the stamp large.
               */

              .stamp-container img {
                width: 100px !important;
                height: 50px !important;

                max-width: 100px !important;
                max-height: 50px !important;

                object-fit: contain !important;
              }

              /* =====================================================
                 FOOTER
                 ===================================================== */

              .footer {
                text-align: center;

                margin-top: 20px;

                font-size: 12px;

                color: #666;
              }

              /* =====================================================
                 PRINT
                 ===================================================== */

              @media print {

                body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }

                .stamp-print {
                  width: 150px !important;
                  height: 100px !important;

                  max-width: 150px !important;
                  max-height: 100px !important;
                }

                .stamp-print img {
                  width: 150px !important;
                  height: 100px !important;

                  max-width: 150px !important;
                  max-height: 100px !important;

                  object-fit: contain !important;
                }
              }

            </style>

          </head>

          <body>

            ${content.innerHTML}

          </body>

        </html>
      `;

      // =========================================================
      // OPEN PDF
      // =========================================================

      if (!isElectronAvailable()) {
        throw new Error(
          'Electron غير متوفر. لا يمكن فتح نافذة الطباعة.'
        );
      }

      const result = await electronAPI.printAPI.openPdf(
        html,
        {
          fileName: `فاتورة-${invoice.id}`,
        }
      );

      if (!result?.success) {
        throw new Error(
          result?.error || 'فشلت عملية الطباعة'
        );
      }

      // Close the dialog after successfully opening PDF
      onClose();

    } catch (err) {
      console.error('Print failed:', err);

      setPrintError(
        'تعذرت الطباعة. يرجى التحقق من إعدادات النظام والمحاولة مرة أخرى.'
      );

    } finally {
      setIsPrinting(false);
    }
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      dir="rtl"
    >

      {/* =====================================================
          TITLE
          ===================================================== */}

      <DialogTitle>
        معاينة الفاتورة قبل الطباعة
      </DialogTitle>

      {/* =====================================================
          CONTENT
          ===================================================== */}

      <DialogContent>

        <Box
          ref={printRef}
          sx={{
            p: 3,
          }}
        >

          {/* ===================================================
              HEADER
              =================================================== */}

          <Box
            className="header"
            sx={{
              textAlign: 'center',
              mb: 3,
            }}
          >

            {/* SCHOOL LOGO */}

            {logoDataUrl && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  mb: 1.5,
                }}
              >

                <Avatar
                  src={logoDataUrl}
                  alt={
                    school?.name ||
                    'المدرسة'
                  }
                  variant="rounded"
                  sx={{
                    width: 64,
                    height: 64,

                    '& img': {
                      objectFit: 'contain',
                    },
                  }}
                />

              </Box>
            )}

            {/* SCHOOL NAME */}

            <Typography
              variant="h5"
              fontWeight="bold"
            >
              {school?.name ||
                'المؤسسة التعليمية'}
            </Typography>

            {/* INVOICE NUMBER */}

            <Typography
              variant="subtitle2"
              color="textSecondary"
            >
              فاتورة رقم #{invoice.id}
            </Typography>

          </Box>

          {/* ===================================================
              DIVIDER
              =================================================== */}

          <Divider
            sx={{
              mb: 2,
            }}
          />

          {/* ===================================================
              INVOICE DETAILS
              =================================================== */}

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              mb: 3,
              gap: 3,
            }}
          >

            {/* LEFT SIDE */}

            <Box>

              <Typography variant="body2">
                <strong>
                  الطالب:
                </strong>{' '}
                {invoice.studentName}
              </Typography>

              <Typography variant="body2">
                <strong>
                  المادة / الموديول:
                </strong>{' '}
                {invoice.moduleName}
              </Typography>

              <Typography variant="body2">
                <strong>
                  الدورة:
                </strong>{' '}
                #{invoice.cycleNumber}
              </Typography>

            </Box>

            {/* RIGHT SIDE */}

            <Box>

              <Typography variant="body2">
                <strong>
                  تاريخ الإصدار:
                </strong>{' '}
                {invoice.issueDate}
              </Typography>

              <Typography variant="body2">
                <strong>
                  تاريخ الاستحقاق:
                </strong>{' '}
                {invoice.dueDate ||
                  'غير محدد'}
              </Typography>

              <Typography variant="body2">
                <strong>
                  الحالة:
                </strong>{' '}
                {getStatusLabel(
                  invoice.status
                )}
              </Typography>

            </Box>

          </Box>

          {/* ===================================================
              AMOUNT
              =================================================== */}

          <Box
            sx={{
              mb: 2,
            }}
          >

            <Typography variant="body2">

              <strong>
                المبلغ المستحق:
              </strong>{' '}

              {invoice.amount} د.ج

            </Typography>

            {/* CREDIT */}

            {invoice.creditApplied > 0 && (
              <Typography
                variant="body2"
                color="textSecondary"
              >

                الرصيد المستغل:{' '}
                {invoice.creditApplied} د.ج

              </Typography>
            )}

          </Box>

          {/* ===================================================
              DIVIDER
              =================================================== */}

          <Divider />

          {/* ===================================================
              FOOTER / STAMP
              =================================================== */}

          <Box
            className="stamp-container"
            sx={{
              textAlign: 'center',
              mt: 3,
            }}
          >

            {/* THANK YOU */}

            <Typography
              variant="caption"
              color="textSecondary"
            >
              شكراً لتعاملكم معنا!
            </Typography>

            {/* SCHOOL STAMP */}

            {stampDataUrl && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  mt: 1.5,
                }}
              >

                <Avatar
                  src={stampDataUrl}
                  alt="ختم المدرسة"
                  variant="rounded"
                  className="stamp-print"
                  sx={{
                    width: 90,
                    height: 45,

                    '& img': {
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    },
                  }}
                />

              </Box>
            )}

          </Box>

        </Box>

        {/* =====================================================
            ERROR
            ===================================================== */}

        {printError && (
          <Typography
            variant="body2"
            color="error"
            sx={{
              mt: 1,
            }}
          >
            {printError}
          </Typography>
        )}

      </DialogContent>

      {/* =======================================================
          ACTIONS
          ======================================================= */}

      <DialogActions>

        {/* CLOSE */}

        <Button
          onClick={onClose}
          disabled={isPrinting}
        >
          إغلاق
        </Button>

        {/* PRINT */}

        <Button
          onClick={handlePrint}
          variant="contained"
          disabled={isPrinting}
          startIcon={
            isPrinting ? (
              <CircularProgress
                size={18}
                color="inherit"
              />
            ) : (
              <PrintIcon />
            )
          }
        >

          {isPrinting
            ? 'جارٍ التحضير...'
            : 'طباعة'}

        </Button>

      </DialogActions>

    </Dialog>
  );
}