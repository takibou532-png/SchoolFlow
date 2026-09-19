import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid } from '@mui/x-data-grid';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import InputAdornment from '@mui/material/InputAdornment';
import Divider from '@mui/material/Divider';
import Fade from '@mui/material/Fade';
import Grow from '@mui/material/Grow';
import Avatar from '@mui/material/Avatar';
import TeacherPaymentPrintModal from './components/TeacherPaymentPrintModal';

import {
  alpha,
  keyframes,
} from '@mui/material/styles';

import { electronAPI } from '../../utils/electron';

import InvoicePrintModal from './components/InvoicePrintModal';
import PaymentMarkModal from './components/PaymentMarkmodal';
import ConfirmDialog from '../../components/ConfirmDialog';

import EditIcon from '@mui/icons-material/Edit';
import PaidIcon from '@mui/icons-material/Paid';
import PrintIcon from '@mui/icons-material/Print';
import SearchIcon from '@mui/icons-material/Search';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PaymentsIcon from '@mui/icons-material/Payments';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';

// ─────────────────────────────────────────────────────────────
// Animations
// ─────────────────────────────────────────────────────────────

const fadeUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(18px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
`;

const float = keyframes`
  0%, 100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-4px);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -500px 0;
  }

  100% {
    background-position: 500px 0;
  }
`;

const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.15);
  }

  70% {
    box-shadow: 0 0 0 10px rgba(25, 118, 210, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0);
  }
`;

// ─────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────

const fetchInvoices = async (options) => {
  const response = await electronAPI.invoice.getAll(options);

  if (!response.success) {
    throw new Error(response.error);
  }

  return response.data;
};

const fetchTeachers = async () => {
  const response = await electronAPI.teacher.getAll({
    where: { isActive: true },
  });

  if (!response.success) {
    throw new Error(response.error);
  }

  return response.data;
};

const fetchTeacherPayments = async (teacherId, options) => {
  const response = await electronAPI.payment.getTeacherHistory(
    teacherId,
    options
  );
  console.log("payments:",response);

  if (!response.success) {
    throw new Error(response.error);
  }

  return response.data;
};

const markInvoicePaid = async ({ invoiceId, paidAt }) => {
  const response = await electronAPI.invoice.markAsPaid(
    invoiceId,
    paidAt
  );

  if (!response.success) {
    throw new Error(response.error);
  }

  return response.data;
};

const markPaymentPaid = async ({
  paymentId,
  amountToPay,
  paidAt,
}) => {
  const response = await electronAPI.payment.markAsPaid(
    paymentId,
    amountToPay,
    paidAt
  );

  if (!response.success) {
    throw new Error(response.error);
  }

  return response.data;
};


const updateInvoice = async ({
  invoiceId,
  newAmount,
  reason,
}) => {
  const response = await electronAPI.invoice.update(
    invoiceId,
    newAmount,
    reason
  );

  if (!response.success) {
    throw new Error(response.error);
  }

  return response.data;
};

// ─────────────────────────────────────────────────────────────
// Reusable UI
// ─────────────────────────────────────────────────────────────

const SummaryCard = ({
  title,
  value,
  amount,
  icon,
  tone = 'primary',
  delay = 0,
}) => {
  const tones = {
    primary: {
      main: '#1976d2',
      background: '#e3f2fd',
    },
    warning: {
      main: '#ed6c02',
      background: '#fff4e5',
    },
    error: {
      main: '#d32f2f',
      background: '#ffebee',
    },
    success: {
      main: '#2e7d32',
      background: '#e8f5e9',
    },
    info: {
      main: '#0288d1',
      background: '#e1f5fe',
    },
    neutral: {
      main: '#64748b',
      background: '#f1f5f9',
    },
  };

  const currentTone = tones[tone] || tones.primary;

  return (
    <Grow
      in
      timeout={500 + delay}
      style={{ transformOrigin: 'center bottom' }}
    >
      <Paper
        elevation={0}
        sx={{
          position: 'relative',
          overflow: 'hidden',
          flex: '1 1 220px',
          minWidth: 210,
          p: 2.2,
          borderRadius: 3,
          border: '1px solid',
          borderColor: alpha(currentTone.main, 0.12),
          background: `linear-gradient(
            135deg,
            ${alpha('#fff', 1)} 0%,
            ${alpha(currentTone.background, 0.65)} 100%
          )`,
          transition:
            'transform .25s ease, box-shadow .25s ease, border-color .25s ease',
          animation: `${fadeUp} .5s ease both`,
          '&:hover': {
            transform: 'translateY(-5px)',
            borderColor: alpha(currentTone.main, 0.3),
            boxShadow: `0 14px 35px ${alpha(
              currentTone.main,
              0.12
            )}`,
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            width: 100,
            height: 100,
            borderRadius: '50%',
            right: -35,
            top: -45,
            background: alpha(currentTone.main, 0.06),
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Avatar
            sx={{
              width: 46,
              height: 46,
              bgcolor: alpha(currentTone.main, 0.1),
              color: currentTone.main,
              animation: `${float} 3s ease-in-out infinite`,
            }}
          >
            {icon}
          </Avatar>

          <Box sx={{ textAlign: 'right' }}>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                mb: 0.5,
              }}
            >
              {title}
            </Typography>

            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: 'text.primary',
                lineHeight: 1.1,
              }}
            >
              {value}
            </Typography>

            {amount !== undefined && amount !== null && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  color: currentTone.main,
                  fontWeight: 700,
                  mt: 0.7,
                }}
              >
                {amount} د.ج
              </Typography>
            )}
          </Box>
        </Box>
      </Paper>
    </Grow>
  );
};

const SectionHeader = ({
  icon,
  title,
  subtitle,
}) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      mb: 2,
    }}
  >
    <Avatar
      sx={{
        width: 42,
        height: 42,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        boxShadow: '0 6px 18px rgba(25, 118, 210, .18)',
      }}
    >
      {icon}
    </Avatar>

    <Box>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 800,
          lineHeight: 1.2,
        }}
      >
        {title}
      </Typography>

      {subtitle && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.35 }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  </Box>
);

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function Financials() {
  const queryClient = useQueryClient();

  const [tabIndex, setTabIndex] = useState(0);

  // ───────────────────────────────────────────────────────────
  // Invoices State
  // ───────────────────────────────────────────────────────────

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selectedInvoice, setSelectedInvoice] =
    useState(null);

  const [printModalOpen, setPrintModalOpen] =
    useState(false);

  const [markPaidDialogOpen, setMarkPaidDialogOpen] =
    useState(false);

  const [invoiceToMark, setInvoiceToMark] =
    useState(null);

  const [editModalOpen, setEditModalOpen] =
    useState(false);

  const [invoiceToEdit, setInvoiceToEdit] =
    useState(null);

  const [editAmount, setEditAmount] = useState('');
  const [editReason, setEditReason] = useState('');
  const [paymentPrintOpen, setPaymentPrintOpen] = useState(false);
  const [paymentToPrint, setPaymentToPrint] = useState(null);

  // ───────────────────────────────────────────────────────────
  // Teacher Payments State
  // ───────────────────────────────────────────────────────────

  const [selectedTeacherId, setSelectedTeacherId] =
    useState('');

  const [paymentMarkOpen, setPaymentMarkOpen] =
    useState(false);

  const [selectedPayment, setSelectedPayment] =
    useState(null);

  // ───────────────────────────────────────────────────────────
  // Queries
  // ───────────────────────────────────────────────────────────

  const invoicesQuery = useQuery({
    queryKey: [
      'invoices',
      {
        search,
        status: statusFilter,
        startDate,
        endDate,
      },
    ],

    queryFn: () =>
      fetchInvoices({
        search,
        status: statusFilter,
        startDate,
        endDate,
        includeCancelled: statusFilter !== 'all',
      }),

    staleTime: 1000 * 60,
  });

  const teachersQuery = useQuery({
    queryKey: ['teachers'],
    queryFn: fetchTeachers,
    staleTime: 1000 * 60 * 5,
  });

  const paymentsQuery = useQuery({
    queryKey: ['teacher-payments', selectedTeacherId],

    queryFn: () =>
      fetchTeacherPayments(selectedTeacherId, {
        includeInvoices: true,
      }),

    enabled: !!selectedTeacherId,

    staleTime: 1000 * 60,
  });

  // ───────────────────────────────────────────────────────────
  // Mutations
  // ───────────────────────────────────────────────────────────

  const markPaidMutation = useMutation({
    mutationFn: markInvoicePaid,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['invoices'],
      });

      setMarkPaidDialogOpen(false);
      setInvoiceToMark(null);
    },
  });

  const markPaymentMutation = useMutation({
    mutationFn: markPaymentPaid,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['teacher-payments'],
      });

      setPaymentMarkOpen(false);
      setSelectedPayment(null);
    },
  });

  const editInvoiceMutation = useMutation({
    mutationFn: updateInvoice,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['invoices'],
      });

      setEditModalOpen(false);
      setInvoiceToEdit(null);
      setEditAmount('');
      setEditReason('');
    },

    onError: (error) => {
      alert('فشل تحديث الفاتورة: ' + error.message);
    },
  });

  // ───────────────────────────────────────────────────────────
  // Handlers
  // ───────────────────────────────────────────────────────────

  const handleMarkPaid = (invoice) => {
    setInvoiceToMark(invoice);
    setMarkPaidDialogOpen(true);
  };
  
  const handlePrintPayment = (payment) => {
  setPaymentToPrint(payment);
  setPaymentPrintOpen(true);
};

  const confirmMarkPaid = () => {
    if (invoiceToMark) {
      markPaidMutation.mutate({
        invoiceId: invoiceToMark.id,
      });
    }
  };

  const handlePrint = (invoice) => {
    setSelectedInvoice(invoice);
    setPrintModalOpen(true);
  };

  const handleMarkPaymentPaid = (payment) => {
    setSelectedPayment(payment);
    setPaymentMarkOpen(true);
  };

  const confirmPaymentPaid = (amountToPay, paidAt) => {
    if (selectedPayment) {
      markPaymentMutation.mutate({
        paymentId: selectedPayment.id,
        amountToPay,
        paidAt,
      });
    }
  };

  const handleEditInvoice = (invoice) => {
    setInvoiceToEdit(invoice);
    setEditAmount(invoice.amount.toString());
    setEditReason('');
    setEditModalOpen(true);
  };

  const confirmEditInvoice = () => {
    const newAmount = parseFloat(editAmount);

    if (isNaN(newAmount) || newAmount < 0) {
      alert('يرجى إدخال مبلغ صحيح');
      return;
    }

    editInvoiceMutation.mutate({
      invoiceId: invoiceToEdit.id,
      newAmount,
      reason: editReason || null,
    });
  };

  const clearDateFilters = () => {
    setStartDate('');
    setEndDate('');
  };

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
        return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'success';

      case 'overdue':
        return 'error';

      case 'cancelled':
        return 'default';

      default:
        return 'warning';
    }
  };

  // ───────────────────────────────────────────────────────────
  // Invoice Columns
  // ───────────────────────────────────────────────────────────

  const invoiceColumns = [
    {
      field: 'id',
      headerName: 'رقم الفاتورة #',
      width: 125,
      headerAlign: 'right',
      align: 'right',
    },

    {
      field: 'studentName',
      headerName: 'الطالب',
      width: 190,
      headerAlign: 'right',
      align: 'right',
      renderCell: (params) => (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            width: '100%',
          }}
        >
          <Avatar
            sx={{
              width: 30,
              height: 30,
              fontSize: 13,
              bgcolor: alpha('#1976d2', 0.1),
              color: 'primary.main',
            }}
          >
            {params.value?.charAt(0)?.toUpperCase() || '?'}
          </Avatar>

          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {params.value}
          </Typography>
        </Box>
      ),
    },

    {
      field: 'moduleName',
      headerName: 'المادة / الموديول',
      width: 170,
      headerAlign: 'right',
      align: 'right',
    },

    {
      field: 'amount',
      headerName: 'المبلغ',
      width: 135,
      headerAlign: 'right',
      align: 'right',

      renderCell: (params) => (
        <Typography
          sx={{
            fontWeight: 800,
            color: 'text.primary',
          }}
        >
          {params.value} د.ج
        </Typography>
      ),
    },

    {
      field: 'status',
      headerName: 'الحالة',
      width: 130,
      headerAlign: 'right',
      align: 'right',

      renderCell: (params) => (
        <Chip
          label={getStatusLabel(params.value)}
          color={getStatusColor(params.value)}
          size="small"
          icon={
            params.value === 'paid' ? (
              <CheckCircleIcon />
            ) : params.value === 'overdue' ? (
              <WarningAmberIcon />
            ) : params.value === 'cancelled' ? (
              <CancelIcon />
            ) : (
              <PaymentsIcon />
            )
          }
          sx={{
            fontWeight: 700,
            '& .MuiChip-icon': {
              fontSize: 16,
            },
          }}
        />
      ),
    },

    {
      field: 'issueDate',
      headerName: 'تاريخ الإصدار',
      width: 140,
      headerAlign: 'right',
      align: 'right',
    },

    {
      field: 'dueDate',
      headerName: 'تاريخ الاستحقاق',
      width: 145,
      headerAlign: 'right',
      align: 'right',
    },

    {
      field: 'actions',
      headerName: 'الإجراءات',
      width: 175,
      sortable: false,
      headerAlign: 'center',
      align: 'center',

      renderCell: (params) => (
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            alignItems: 'center',
          }}
        >
          {params.row.status !== 'paid' &&
            params.row.status !== 'cancelled' && (
              <>
                <Tooltip title="تعديل المبلغ">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() =>
                      handleEditInvoice(params.row)
                    }
                    sx={{
                      transition: 'all .2s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        bgcolor: alpha('#1976d2', 0.1),
                      },
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="تحديد كمدفوع">
                  <IconButton
                    size="small"
                    color="success"
                    onClick={() =>
                      handleMarkPaid(params.row)
                    }
                    sx={{
                      transition: 'all .2s ease',
                      '&:hover': {
                        transform: 'translateY(-2px) scale(1.05)',
                        bgcolor: alpha('#2e7d32', 0.1),
                      },
                    }}
                  >
                    <PaidIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}

          <Tooltip title="طباعة الفاتورة">
            <IconButton
              size="small"
              onClick={() => handlePrint(params.row)}
              sx={{
                transition: 'all .2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  bgcolor: alpha('#64748b', 0.1),
                },
              }}
            >
              <PrintIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // ───────────────────────────────────────────────────────────
  // Payment Columns
  // ───────────────────────────────────────────────────────────

  const paymentColumns = [
    {
      field: 'id',
      headerName: 'رقم الدفعة #',
      width: 125,
      headerAlign: 'right',
      align: 'right',
    },

    {
      field: 'amount',
      headerName: 'المبلغ',
      width: 145,
      headerAlign: 'right',
      align: 'right',

      renderCell: (params) => (
        <Typography
          sx={{
            fontWeight: 800,
          }}
        >
          {params.value} د.ج
        </Typography>
      ),
    },

    {
      field: 'status',
      headerName: 'الحالة',
      width: 130,
      headerAlign: 'right',
      align: 'right',

      renderCell: (params) => (
        <Chip
          label={
            params.value === 'paid'
              ? 'مدفوعة'
              : 'معلقة'
          }
          color={
            params.value === 'paid'
              ? 'success'
              : 'warning'
          }
          size="small"
          icon={
            params.value === 'paid' ? (
              <CheckCircleIcon />
            ) : (
              <PaymentsIcon />
            )
          }
          sx={{
            fontWeight: 700,
            '& .MuiChip-icon': {
              fontSize: 16,
            },
          }}
        />
      ),
    },

    {
      field: 'periodStart',
      headerName: 'بداية الفترة',
      width: 140,
      headerAlign: 'right',
      align: 'right',
    },

    {
      field: 'periodEnd',
      headerName: 'نهاية الفترة',
      width: 140,
      headerAlign: 'right',
      align: 'right',
    },

    {
      field: 'createdAt',
      headerName: 'تاريخ الإنشاء',
      width: 155,
      headerAlign: 'right',
      align: 'right',
    },

    {
      field: 'actions',
      headerName: 'الإجراءات',
      width: 120,
      sortable: false,
      headerAlign: 'center',
      align: 'center',
renderCell: (params) => (
  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
    {params.row.status === 'pending' && (
      <Tooltip title="تحديد كمدفوع">
        <IconButton
          size="small"
          color="success"
          onClick={() =>
            handleMarkPaymentPaid(params.row)
          }
          sx={{
            transition: 'all .2s ease',
            '&:hover': {
              transform: 'translateY(-2px) scale(1.05)',
              bgcolor: alpha('#2e7d32', 0.1),
            },
          }}
        >
          <PaidIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    )}

    {params.row.status === 'paid' && (
      <Tooltip title="طباعة وصل الاستحقاق">
        <IconButton
          size="small"
          onClick={() => handlePrintPayment(params.row)}
          sx={{
            transition: 'all .2s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              bgcolor: alpha('#64748b', 0.1),
            },
          }}
        >
          <PrintIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    )}
  </Box>
),
    },
  ];

  // ───────────────────────────────────────────────────────────
  // Data
  // ───────────────────────────────────────────────────────────

  const invoiceSummary =
    invoicesQuery.data?.summary;

  const paymentSummary =
    paymentsQuery.data?.summary;

  const hasDateFilters =
    startDate || endDate;

  // ───────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────

  return (
    <Box
      dir="rtl"
      sx={{
        minHeight: '100%',
        pb: 4,

        '& .MuiTextField-root, & .MuiFormControl-root': {
          direction: 'rtl',
        },
      }}
    >
      {/* ─────────────────────────────────────────────────────
          Header
      ───────────────────────────────────────────────────── */}

      <Fade in timeout={500}>
        <Box
          sx={{
            mb: 3,
            animation: `${fadeUp} .55s ease both`,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: {
                xs: 'flex-start',
                md: 'center',
              },
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.2,
                }}
              >
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: alpha('#1976d2', 0.1),
                    color: 'primary.main',
                    animation: `${pulse} 2.5s infinite`,
                  }}
                >
                  <AccountBalanceWalletIcon />
                </Avatar>

                <Box>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 900,
                      letterSpacing: '-0.5px',
                    }}
                  >
                    إدارة المالية
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.4 }}
                  >
                    إدارة الفواتير والمدفوعات والمستحقات
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Chip
              icon={<TrendingUpIcon />}
              label="النظام المالي"
              color="primary"
              variant="outlined"
              sx={{
                fontWeight: 700,
                px: 1,
                borderRadius: 2,
              }}
            />
          </Box>
        </Box>
      </Fade>

      {/* ─────────────────────────────────────────────────────
          Tabs
      ───────────────────────────────────────────────────── */}

      <Fade in timeout={650}>
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            background:
              'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
          }}
        >
          <Tabs
            value={tabIndex}
            onChange={(_, value) =>
              setTabIndex(value)
            }
            variant="fullWidth"
            sx={{
              minHeight: 64,

              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
              },

              '& .MuiTab-root': {
                minHeight: 64,
                fontWeight: 700,
                fontSize: '0.95rem',
                transition: 'all .25s ease',

                '&:hover': {
                  bgcolor: alpha('#1976d2', 0.04),
                },
              },
            }}
          >
            <Tab
              icon={<ReceiptLongIcon />}
              iconPosition="start"
              label="فواتير الطلاب"
            />

            <Tab
              icon={<PeopleAltIcon />}
              iconPosition="start"
              label="مستحقات الأساتذة"
            />
          </Tabs>
        </Paper>
      </Fade>

      {/* ═════════════════════════════════════════════════════
          INVOICES TAB
      ═════════════════════════════════════════════════════ */}

      {tabIndex === 0 && (
        <Box
          sx={{
            animation: `${fadeUp} .45s ease both`,
          }}
        >
          {/* ─────────────────────────────────────────────────
              Summary Cards
          ───────────────────────────────────────────────── */}

          {invoiceSummary && (
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                mb: 3,
                flexWrap: 'wrap',
              }}
            >
              <SummaryCard
                title="الفواتير المعلقة"
                value={invoiceSummary.pending}
                amount={
                  invoiceSummary.totalPendingAmount
                }
                icon={<PaymentsIcon />}
                tone="warning"
                delay={0}
              />

              <SummaryCard
                title="الفواتير المتأخرة"
                value={invoiceSummary.overdue}
                amount={
                  invoiceSummary.totalOverdueAmount
                }
                icon={<WarningAmberIcon />}
                tone="error"
                delay={80}
              />

              <SummaryCard
                title="الفواتير المدفوعة"
                value={invoiceSummary.paid}
                amount={
                  invoiceSummary.totalPaidAmount
                }
                icon={<CheckCircleIcon />}
                tone="success"
                delay={160}
              />

              <SummaryCard
                title="الفواتير الملغاة"
                value={invoiceSummary.cancelled}
                icon={<CancelIcon />}
                tone="neutral"
                delay={240}
              />
            </Box>
          )}

          {/* ─────────────────────────────────────────────────
              Filters
          ───────────────────────────────────────────────── */}

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 2.5 },
              mb: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              background: '#fff',
              animation: `${fadeUp} .55s ease both`,
            }}
          >
            <SectionHeader
              icon={<CalendarMonthIcon />}
              title="تصفية الفواتير"
              subtitle="ابحث عن الفواتير حسب الطالب أو الحالة أو التاريخ"
            />

            <Divider sx={{ mb: 2.5 }} />

            <Box
              sx={{
                display: 'flex',
                gap: 1.5,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <TextField
                size="small"
                label="البحث باسم الطالب"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                sx={{
                  width: {
                    xs: '100%',
                    sm: 250,
                  },

                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon
                        fontSize="small"
                        color="action"
                      />
                    </InputAdornment>
                  ),
                }}
              />

              <FormControl
                size="small"
                sx={{
                  width: {
                    xs: '100%',
                    sm: 155,
                  },
                }}
              >
                <InputLabel>الحالة</InputLabel>

                <Select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value)
                  }
                  label="الحالة"
                  sx={{
                    borderRadius: 2,
                  }}
                >
                  <MenuItem value="all">
                    الكل
                  </MenuItem>

                  <MenuItem value="pending">
                    معلقة
                  </MenuItem>

                  <MenuItem value="paid">
                    مدفوعة
                  </MenuItem>

                  <MenuItem value="overdue">
                    متأخرة
                  </MenuItem>

                  <MenuItem value="cancelled">
                    ملغاة
                  </MenuItem>
                </Select>
              </FormControl>

              <TextField
                size="small"
                label="من"
                type="date"
                InputLabelProps={{
                  shrink: true,
                }}
                value={startDate}
                onChange={(e) =>
                  setStartDate(e.target.value)
                }
                sx={{
                  width: {
                    xs: '100%',
                    sm: 155,
                  },

                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />

              <TextField
                size="small"
                label="إلى"
                type="date"
                InputLabelProps={{
                  shrink: true,
                }}
                value={endDate}
                onChange={(e) =>
                  setEndDate(e.target.value)
                }
                sx={{
                  width: {
                    xs: '100%',
                    sm: 155,
                  },

                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />

              {hasDateFilters && (
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={
                    <FilterAltOffIcon />
                  }
                  onClick={clearDateFilters}
                  size="small"
                  sx={{
                    height: 40,
                    borderRadius: 2,
                    fontWeight: 700,
                    color: 'text.secondary',
                    borderColor: 'divider',

                    '&:hover': {
                      borderColor: 'text.secondary',
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  مسح التواريخ
                </Button>
              )}
            </Box>
          </Paper>

          {/* ─────────────────────────────────────────────────
              Invoice DataGrid
          ───────────────────────────────────────────────── */}

          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
              animation: `${fadeUp} .65s ease both`,
            }}
          >
            <Box
              sx={{
                px: 2.5,
                py: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                  }}
                >
                  قائمة الفواتير
                </Typography>

                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  جميع فواتير الطلاب المسجلة
                </Typography>
              </Box>

              <Chip
                size="small"
                label={
                  invoicesQuery.data?.invoices
                    ?.length ?? 0
                }
                sx={{
                  fontWeight: 800,
                  bgcolor: alpha('#1976d2', 0.08),
                  color: 'primary.main',
                }}
              />
            </Box>

            <Divider />

            <Box
              sx={{
                height: 530,
                width: '100%',
              }}
            >
              <DataGrid
                rows={
                  invoicesQuery.data?.invoices || []
                }
                columns={invoiceColumns}
                loading={invoicesQuery.isLoading}
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                  pagination: {
                    paginationModel: {
                      pageSize: 10,
                    },
                  },
                }}
                disableRowSelectionOnClick
                rowHeight={62}
                sx={{
                  border: 0,

                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    fontWeight: 800,
                  },

                  '& .MuiDataGrid-columnHeaderTitle': {
                    fontWeight: 800,
                  },

                  '& .MuiDataGrid-row': {
                    transition:
                      'background-color .2s ease, transform .2s ease',

                    '&:hover': {
                      backgroundColor:
                        alpha('#1976d2', 0.035),
                    },
                  },

                  '& .MuiDataGrid-cell': {
                    borderBottom: '1px solid',
                    borderColor: alpha(
                      '#000',
                      0.055
                    ),
                  },

                  '& .MuiDataGrid-footerContainer': {
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: '#fafafa',
                  },

                  '& .MuiTablePagination-root': {
                    direction: 'ltr',
                  },

                  '& .MuiDataGrid-overlay': {
                    backgroundColor: alpha(
                      '#fff',
                      0.85
                    ),
                  },
                }}
              />
            </Box>
          </Paper>
        </Box>
      )}

      {/* ═════════════════════════════════════════════════════
          TEACHER PAYMENTS TAB
      ═════════════════════════════════════════════════════ */}

      {tabIndex === 1 && (
        <Box
          sx={{
            animation: `${fadeUp} .45s ease both`,
          }}
        >
          {/* Teacher selector */}

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 2.5 },
              mb: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              animation: `${fadeUp} .5s ease both`,
            }}
          >
            <SectionHeader
              icon={<PeopleAltIcon />}
              title="مستحقات الأساتذة"
              subtitle="اختر أستاذًا لعرض سجل مستحقاته ودفعاته"
            />

            <Divider sx={{ mb: 2.5 }} />

            <FormControl
              size="small"
              sx={{
                width: {
                  xs: '100%',
                  sm: 300,
                },
              }}
            >
              <InputLabel>الأستاذ</InputLabel>

              <Select
                value={selectedTeacherId}
                onChange={(e) =>
                  setSelectedTeacherId(
                    e.target.value
                  )
                }
                label="الأستاذ"
                sx={{
                  borderRadius: 2,
                }}
              >
                {teachersQuery.data?.map((teacher) => (
                  <MenuItem
                    key={teacher.id}
                    value={teacher.id}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 28,
                          height: 28,
                          fontSize: 12,
                          bgcolor: alpha(
                            '#1976d2',
                            0.1
                          ),
                          color: 'primary.main',
                        }}
                      >
                        {teacher.firstName
                          ?.charAt(0)}
                      </Avatar>

                      <span>
                        {teacher.firstName}{' '}
                        {teacher.lastName}
                      </span>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>

          {selectedTeacherId ? (
            <Fade
              in={!!selectedTeacherId}
              timeout={450}
            >
              <Box>
                {/* Teacher summary */}

                {paymentSummary && (
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 2,
                      mb: 3,
                      flexWrap: 'wrap',
                    }}
                  >
                    <SummaryCard
                      title="المستحقات المعلقة"
                      value={
                        paymentSummary.totalPending
                      }
                      icon={<PaymentsIcon />}
                      tone="warning"
                      delay={0}
                    />

                    <SummaryCard
                      title="المدفوع"
                      value={
                        paymentSummary.totalPaid
                      }
                      icon={<CheckCircleIcon />}
                      tone="success"
                      delay={100}
                    />

                    <SummaryCard
                      title="الإجمالي"
                      value={
                        paymentSummary.grandTotal
                      }
                      icon={
                        <AccountBalanceWalletIcon />
                      }
                      tone="info"
                      delay={200}
                    />
                  </Box>
                )}

                {/* Empty state */}

                {paymentsQuery.data?.payments
                  ?.length === 0 && (
                  <Fade in timeout={500}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 6,
                        textAlign: 'center',
                        borderRadius: 3,
                        border: '1px dashed',
                        borderColor: 'divider',
                        bgcolor: '#fafafa',
                        mb: 3,
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 64,
                          height: 64,
                          mx: 'auto',
                          mb: 2,
                          bgcolor: alpha(
                            '#64748b',
                            0.08
                          ),
                          color: 'text.secondary',
                        }}
                      >
                        <PaymentsIcon />
                      </Avatar>

                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 800,
                          mb: 0.7,
                        }}
                      >
                        لا توجد مستحقات
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        لا توجد مستحقات مسجلة لهذا
                        الأستاذ حاليًا.
                      </Typography>
                    </Paper>
                  </Fade>
                )}

                {/* Payments table */}

                {paymentsQuery.data?.payments
                  ?.length > 0 && (
                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      overflow: 'hidden',
                      animation: `${fadeUp} .6s ease both`,
                    }}
                  >
                    <Box
                      sx={{
                        px: 2.5,
                        py: 2,
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 800,
                          }}
                        >
                          سجل الدفعات
                        </Typography>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          تفاصيل مستحقات ودفعات الأستاذ
                        </Typography>
                      </Box>

                      <Chip
                        size="small"
                        label={
                          paymentsQuery.data
                            ?.payments?.length ?? 0
                        }
                        sx={{
                          fontWeight: 800,
                          bgcolor: alpha(
                            '#1976d2',
                            0.08
                          ),
                          color: 'primary.main',
                        }}
                      />
                    </Box>

                    <Divider />

                    <Box
                      sx={{
                        height: 530,
                        width: '100%',
                      }}
                    >
                      <DataGrid
                        rows={
                          paymentsQuery.data
                            ?.payments || []
                        }
                        columns={paymentColumns}
                        loading={
                          paymentsQuery.isLoading
                        }
                        pageSizeOptions={[
                          10,
                          25,
                          50,
                        ]}
                        initialState={{
                          pagination: {
                            paginationModel: {
                              pageSize: 10,
                            },
                          },
                        }}
                        disableRowSelectionOnClick
                        rowHeight={62}
                        sx={{
                          border: 0,

                          '& .MuiDataGrid-columnHeaders':
                            {
                              backgroundColor:
                                '#f8fafc',
                              borderBottom:
                                '1px solid',
                              borderColor:
                                'divider',
                            },

                          '& .MuiDataGrid-columnHeaderTitle':
                            {
                              fontWeight: 800,
                            },

                          '& .MuiDataGrid-row':
                            {
                              transition:
                                'background-color .2s ease',

                              '&:hover': {
                                backgroundColor:
                                  alpha(
                                    '#1976d2',
                                    0.035
                                  ),
                              },
                            },

                          '& .MuiDataGrid-cell':
                            {
                              borderBottom:
                                '1px solid',
                              borderColor:
                                alpha(
                                  '#000',
                                  0.055
                                ),
                            },

                          '& .MuiDataGrid-footerContainer':
                            {
                              borderTop:
                                '1px solid',
                              borderColor:
                                'divider',
                              backgroundColor:
                                '#fafafa',
                            },

                          '& .MuiTablePagination-root':
                            {
                              direction: 'ltr',
                            },
                        }}
                      />
                    </Box>
                  </Paper>
                )}
              </Box>
            </Fade>
          ) : (
            /* ───────────────────────────────────────────────
               Teacher empty state
            ─────────────────────────────────────────────── */

            <Fade in timeout={600}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 4, md: 7 },
                  textAlign: 'center',
                  borderRadius: 3,
                  border: '1px dashed',
                  borderColor: alpha(
                    '#1976d2',
                    0.25
                  ),
                  bgcolor: alpha(
                    '#1976d2',
                    0.018
                  ),
                  animation: `${fadeIn} .6s ease both`,
                }}
              >
                <Avatar
                  sx={{
                    width: 76,
                    height: 76,
                    mx: 'auto',
                    mb: 2.5,
                    bgcolor: alpha(
                      '#1976d2',
                      0.09
                    ),
                    color: 'primary.main',
                    animation: `${float} 3s ease-in-out infinite`,
                  }}
                >
                  <PeopleAltIcon
                    sx={{ fontSize: 34 }}
                  />
                </Avatar>

                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    mb: 1,
                  }}
                >
                  اختر أستاذًا
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    maxWidth: 420,
                    mx: 'auto',
                    lineHeight: 1.8,
                  }}
                >
                  اختر أستاذًا من القائمة أعلاه
                  لعرض مستحقاته وسجل الدفعات
                  بالتفصيل.
                </Typography>

                <ArrowBackRoundedIcon
                  sx={{
                    mt: 3,
                    color: 'primary.main',
                    opacity: 0.5,
                  }}
                />
              </Paper>
            </Fade>
          )}
        </Box>
      )}

      {/* ═════════════════════════════════════════════════════
          MODALS
      ═════════════════════════════════════════════════════ */}

      <ConfirmDialog
        open={markPaidDialogOpen}
        onClose={() => {
          setMarkPaidDialogOpen(false);
          setInvoiceToMark(null);
        }}
        onConfirm={confirmMarkPaid}
        title="تأكيد تسديد الفاتورة"
        message={`هل أنت تأكد من تحديد الفاتورة رقم #${invoiceToMark?.id} الخاصة بالطالب (${invoiceToMark?.studentName}) كمدفوعة؟`}
        confirmText="تأكيد الدفع"
        cancelText="إلغاء"
        confirmColor="success"
        loading={markPaidMutation.isPending}
      />

      <PaymentMarkModal
        open={paymentMarkOpen}
        onClose={() => {
          setPaymentMarkOpen(false);
          setSelectedPayment(null);
        }}
        payment={selectedPayment}
        onConfirm={confirmPaymentPaid}
        loading={markPaymentMutation.isPending}
      />
      <TeacherPaymentPrintModal
  open={paymentPrintOpen}
  onClose={() => {
    setPaymentPrintOpen(false);
    setPaymentToPrint(null);
  }}
  payment={paymentToPrint}
  teacher={paymentsQuery.data?.teacher}
/>

      <InvoicePrintModal
        open={printModalOpen}
        onClose={() => {
          setPrintModalOpen(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
      />

      {/* ═════════════════════════════════════════════════════
          Edit Invoice Dialog
      ═════════════════════════════════════════════════════ */}

      <Dialog
        open={editModalOpen}
        onClose={() =>
          !editInvoiceMutation.isPending &&
          setEditModalOpen(false)
        }
        maxWidth="sm"
        fullWidth
        dir="rtl"
        TransitionComponent={Grow}
        transitionDuration={300}
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow:
              '0 24px 70px rgba(0,0,0,.18)',
          },
        }}
      >
        <DialogTitle
          sx={{
            p: 3,
            pb: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Avatar
              sx={{
                bgcolor: alpha(
                  '#1976d2',
                  0.1
                ),
                color: 'primary.main',
              }}
            >
              <EditIcon />
            </Avatar>

            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                }}
              >
                تعديل الفاتورة
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                الفاتورة رقم #{invoiceToEdit?.id}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ p: 3 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2.2,
              mt: 0.5,
            }}
          >
            <TextField
              label="المبلغ الجديد (د.ج)"
              type="number"
              fullWidth
              value={editAmount}
              onChange={(e) =>
                setEditAmount(e.target.value)
              }
              InputProps={{
                inputProps: {
                  step: '0.01',
                  min: 0,
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />

            <TextField
              label="السبب (اختياري)"
              fullWidth
              multiline
              rows={3}
              value={editReason}
              onChange={(e) =>
                setEditReason(e.target.value)
              }
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />

            <Paper
              elevation={0}
              sx={{
                p: 1.8,
                borderRadius: 2,
                bgcolor: alpha(
                  '#1976d2',
                  0.045
                ),
                border: '1px solid',
                borderColor: alpha(
                  '#1976d2',
                  0.1
                ),
              }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
              >
                المبلغ الحالي
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: 'primary.main',
                  mt: 0.3,
                }}
              >
                {invoiceToEdit?.amount} د.ج
              </Typography>
            </Paper>
          </Box>
        </DialogContent>

        <Divider />

        <DialogActions
          sx={{
            p: 2.5,
            gap: 1,
          }}
        >
          <Button
            onClick={() =>
              setEditModalOpen(false)
            }
            disabled={
              editInvoiceMutation.isPending
            }
            sx={{
              borderRadius: 2,
              fontWeight: 700,
            }}
          >
            إلغاء
          </Button>

          <Button
            onClick={confirmEditInvoice}
            variant="contained"
            disabled={
              editInvoiceMutation.isPending
            }
            startIcon={
              editInvoiceMutation.isPending ? (
                <CircularProgress
                  size={19}
                  color="inherit"
                />
              ) : (
                <EditIcon />
              )
            }
            sx={{
              borderRadius: 2,
              px: 2.5,
              fontWeight: 800,
              boxShadow:
                '0 6px 18px rgba(25,118,210,.2)',
              transition: 'all .2s ease',

              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow:
                  '0 9px 25px rgba(25,118,210,.28)',
              },
            }}
          >
            تحديث الفاتورة
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─────────────────────────────────────────────────────
          Global animation helpers
      ───────────────────────────────────────────────────── */}

      <Box
        sx={{
          display: 'none',

          '@keyframes shimmer': {
            from: {
              backgroundPosition:
                '-500px 0',
            },

            to: {
              backgroundPosition:
                '500px 0',
            },
          },

          animation: `${shimmer} 2s linear infinite`,
        }}
      />
    </Box>
  );
}