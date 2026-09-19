import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid } from '@mui/x-data-grid';
import { keyframes } from '@mui/system';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PaymentsIcon from '@mui/icons-material/Payments';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { electronAPI } from '../../utils/electron';
import ConfirmDialog from '../../components/ConfirmDialog';

// ─── Keyframe Animations ──────────────────────────────────────
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// ─── Validation Schema ────────────────────────────
const expenseSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب ويجب أن يحتوي على حرفين على الأقل'),
  amount: z.number().min(0.01, 'يجب أن يكون المبلغ أكبر من 0'),
});

// ─── API Functions ──────────────────────────────────
const fetchExpenses = async (options) => {
  const response = await electronAPI.expense.getAll(options);
  console.log("expenses", response);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

const createExpense = async (data) => {
  const response = await electronAPI.expense.create(data);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

const updateExpense = async ({ id, data }) => {
  const response = await electronAPI.expense.update(id, data);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

const deleteExpense = async (id) => {
  const response = await electronAPI.expense.delete(id);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

// ─── Main Component ─────────────────────────────────
export default function Expenses() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  // ─── Query ─────────────────────────────────────────
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['expenses', { search: searchTerm }],
    queryFn: () => fetchExpenses({ search: searchTerm, orderBy: 'createdAt', orderDir: 'desc' }),
    staleTime: 1000 * 60,
  });

  // ─── Mutations ─────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      handleCloseModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      handleCloseModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setDeleteConfirmOpen(false);
      setExpenseToDelete(null);
    },
  });

  // ─── Handlers ──────────────────────────────────────
  const handleOpenModal = (expense = null) => {
    setEditingExpense(expense);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingExpense(null);
  };

  const handleDelete = (expense) => {
    setExpenseToDelete(expense);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (expenseToDelete) {
      deleteMutation.mutate(expenseToDelete.id);
    }
  };

  // ─── Format currency ────────────────────────────────
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalExpenses = data?.reduce((sum, e) => sum + e.amount, 0) || 0;
  const avgExpense = data?.length ? totalExpenses / data.length : 0;

  // ─── Columns ──────────────────────────────────────
  const columns = [
    {
      field: 'id',
      headerName: 'الرقم',
      width: 90,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={700} color="text.secondary">
          #{params.value}
        </Typography>
      ),
    },
    {
      field: 'name',
      headerName: 'بيان المصروف',
      flex: 1.5,
      minWidth: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptLongIcon sx={{ fontSize: 18, color: 'error.main', opacity: 0.8 }} />
          <Typography variant="body2" fontWeight={700}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'amount',
      headerName: 'المبلغ',
      width: 170,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={700} color="error.main">
          {formatCurrency(params.value)}
        </Typography>
      ),
    },
    {
      field: 'createdAt',
      headerName: 'التاريخ',
      width: 180,
      renderCell: (params) => {
        const formattedDate = new Date(params.row.createdAt || params.value).toLocaleDateString('ar-DZ');
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarTodayIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
            <Typography variant="body2">{formattedDate}</Typography>
          </Box>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'الإجراءات',
      width: 140,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ height: '100%' }}>
          <Tooltip title="تعديل">
            <IconButton
              size="small"
              onClick={() => handleOpenModal(params.row)}
              sx={{
                bgcolor: 'rgba(25, 118, 210, 0.08)',
                color: 'primary.main',
                '&:hover': { bgcolor: 'primary.main', color: '#fff' },
                transition: 'all 0.2s',
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="حذف">
            <IconButton
              size="small"
              onClick={() => handleDelete(params.row)}
              sx={{
                bgcolor: 'rgba(211, 47, 47, 0.08)',
                color: 'error.main',
                '&:hover': { bgcolor: 'error.main', color: '#fff' },
                transition: 'all 0.2s',
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  // ─── Render ──────────────────────────────────────
  return (
    <Box dir="rtl" sx={{ p: 1, animation: `${fadeInUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1)` }}>
      {/* ─── Header ─────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3.5,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: -0.5 }}>
            المصاريف والنفقات
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            متابعة وتوثيق كافة التكاليف والمصاريف التشغيلية للمؤسسة
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon sx={{ ml: 0.5, mr: -0.5 }} />}
          onClick={() => handleOpenModal()}
          sx={{
            borderRadius: 2.5,
            px: 3,
            py: 1.2,
            fontWeight: 700,
            boxShadow: '0 4px 14px 0 rgba(211, 47, 47, 0.35)',
            bgcolor: 'error.main',
            '&:hover': {
              bgcolor: 'error.dark',
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 20px 0 rgba(211, 47, 47, 0.5)',
            },
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          إضافة مصروف جديد
        </Button>
      </Box>

      {/* ─── Financial Summary Cards ────────────────── */}
      <Grid container spacing={3} sx={{ mb: 3.5 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card
            sx={{
              borderRadius: 3,
              border: '1px solid rgba(211, 47, 47, 0.15)',
              bgcolor: 'rgba(211, 47, 47, 0.03)',
              boxShadow: '0 4px 20px 0 rgba(0,0,0,0.02)',
              transition: 'transform 0.2s ease',
              '&:hover': { transform: 'translateY(-3px)' },
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    إجمالي المصاريف
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="error.main" sx={{ my: 0.5 }}>
                    {formatCurrency(totalExpenses)}
                  </Typography>
                  <Chip
                    icon={<TrendingDownIcon sx={{ fontSize: '14px !important' }} />}
                    label={`${data?.length || 0} عمليات مسجلة`}
                    size="small"
                    color="error"
                    variant="soft"
                    sx={{ borderRadius: 1.5, fontWeight: 700, bgcolor: 'rgba(211, 47, 47, 0.1)' }}
                  />
                </Box>
                <Box
                  sx={{
                    p: 1.8,
                    borderRadius: 3,
                    bgcolor: 'rgba(211, 47, 47, 0.12)',
                    color: 'error.main',
                    display: 'flex',
                  }}
                >
                  <AccountBalanceWalletIcon fontSize="large" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card
            sx={{
              borderRadius: 3,
              border: '1px solid rgba(0, 0, 0, 0.08)',
              bgcolor: 'background.paper',
              boxShadow: '0 4px 20px 0 rgba(0,0,0,0.02)',
              transition: 'transform 0.2s ease',
              '&:hover': { transform: 'translateY(-3px)' },
            }}
          >
            
          </Card>
        </Grid>
      </Grid>

      {/* ─── Search & Toolbar ───────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          border: '1px solid rgba(0, 0, 0, 0.08)',
          bgcolor: 'background.paper',
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
        }}
      >
        <TextField
          size="small"
          placeholder="بحث في بيان المصروفات..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
          sx={{
            width: { xs: '100%', sm: 340 },
            '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
          }}
        />
      </Paper>

      {/* ─── Error Alert ────────────────────────────── */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          خطأ في تحميل بيانات المصاريف: {error.message}
        </Alert>
      )}

      {/* ─── DataGrid Container ──────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          height: 520,
          width: '100%',
          borderRadius: 3,
          border: '1px solid rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          boxShadow: '0 4px 20px 0 rgba(0,0,0,0.03)',
        }}
      >
        <DataGrid
          rows={data || []}
          columns={columns}
          loading={isLoading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
              fontWeight: 700,
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 700,
            },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
            },
            '& .MuiDataGrid-row': {
              transition: 'background-color 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(211, 47, 47, 0.03)',
              },
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid rgba(0, 0, 0, 0.08)',
            },
          }}
        />
      </Paper>

      {/* ─── Add/Edit Modal ──────────────────────────── */}
      <ExpenseFormModal
        open={modalOpen}
        onClose={handleCloseModal}
        editingExpense={editingExpense}
        onSuccess={(formData) => {
          if (editingExpense) {
            updateMutation.mutate({ id: editingExpense.id, data: formData });
          } else {
            createMutation.mutate(formData);
          }
        }}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      {/* ─── Delete Confirmation ────────────────────── */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setExpenseToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="حذف المصروف"
        message={`هل أنت متأكد من رغبتك في حذف المصروف "${expenseToDelete?.name}"؟`}
        confirmText="حذف"
        cancelText="إلغاء"
        confirmColor="error"
        loading={deleteMutation.isPending}
        icon={<DeleteIcon />}
      />
    </Box>
  );
}

// ─── Expense Form Modal ────────────────────────────
function ExpenseFormModal({ open, onClose, editingExpense, onSuccess, loading }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      name: '',
      amount: '',
    },
  });

  React.useEffect(() => {
    if (editingExpense) {
      reset({
        name: editingExpense.name,
        amount: editingExpense.amount,
      });
    } else {
      reset({ name: '', amount: '' });
    }
  }, [editingExpense, reset, open]);

  const onSubmit = (formData) => {
    const payload = {
      ...formData,
      amount: parseFloat(formData.amount),
    };
    onSuccess(payload);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      dir="rtl"
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 800, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ReceiptLongIcon color="error" />
        {editingExpense ? 'تعديل المصروف' : 'إضافة مصروف جديد'}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="بيان المصروف"
              fullWidth
              placeholder="مثال: فاتورة كهرباء، أدوات مكتبية..."
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
              InputProps={{ sx: { borderRadius: 2 } }}
            />
            <TextField
              label="المبلغ"
              type="number"
              fullWidth
              InputProps={{
                startAdornment: <InputAdornment position="start">د.ج</InputAdornment>,
                inputProps: { step: '0.01' },
                sx: { borderRadius: 2 },
              }}
              {...register('amount', { valueAsNumber: true })}
              error={!!errors.amount}
              helperText={errors.amount?.message}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={onClose} disabled={loading} sx={{ borderRadius: 2 }}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="error"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
            sx={{ borderRadius: 2, px: 3, fontWeight: 700 }}
          >
            {editingExpense ? 'تحديث' : 'إنشاء'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}