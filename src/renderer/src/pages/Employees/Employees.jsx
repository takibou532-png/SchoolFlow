import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid } from '@mui/x-data-grid';
import { keyframes } from '@mui/system';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Paper from '@mui/material/Paper';
import InputAdornment from '@mui/material/InputAdornment';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/Restore';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import PersonIcon from '@mui/icons-material/Person';

import { electronAPI } from '../../utils/electron';
import EmployeeFormModal from './components/EmployeeFormModal';
import EmployeePaymentFormModal from './components/EmployeePaymentFormModal';
import EmployeePaymentsDrawer from './components/EmployeepaymentDrawer';
import ConfirmDialog from '../../components/ConfirmDialog';

// ─── Keyframe Animations ──────────────────────────────────────
const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ─── API Functions ──────────────────────────────────────────
const fetchEmployees = async (options) => {
  const response = await electronAPI.employee.getAll(options);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

const fetchEmployeePayments = async (options) => {
  const response = await electronAPI.employeePayment.getAll(options);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

const deleteEmployee = async (id) => {
  const response = await electronAPI.employee.delete(id);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

const restoreEmployee = async (id) => {
  const response = await electronAPI.employee.restore(id);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

const markPaymentPaid = async ({ id, paidAt }) => {
  const response = await electronAPI.employeePayment.markPaid(id, paidAt);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

const deletePayment = async (id) => {
  const response = await electronAPI.employeePayment.delete(id);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

// ─── Main Component ─────────────────────────────────────────
export default function Employees() {
  const queryClient = useQueryClient();
  const [tabIndex, setTabIndex] = useState(0);

  // ─── Employees State ─────────────────────────────────────
  const [searchEmployee, setSearchEmployee] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFormOpen, setEmployeeFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [paymentsDrawerOpen, setPaymentsDrawerOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // ─── Payments State ─────────────────────────────────────
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [paymentDeleteConfirmOpen, setPaymentDeleteConfirmOpen] = useState(false);
  const [paymentToMark, setPaymentToMark] = useState(null);
  const [markPaidConfirmOpen, setMarkPaidConfirmOpen] = useState(false);

  // ─── Queries ─────────────────────────────────────────────
  const employeesQuery = useQuery({
    queryKey: ['employees', { search: searchEmployee, status: statusFilter }],
    queryFn: () => fetchEmployees({
      search: searchEmployee,
      where: statusFilter === 'all' ? {} : { isActive: statusFilter === 'active' },
    }),
    staleTime: 1000 * 60,
  });

  const paymentsQuery = useQuery({
    queryKey: ['employee-payments', { employee: employeeFilter, status: paymentStatusFilter }],
    queryFn: () => {
      const where = {};
      if (employeeFilter !== 'all') where.employeeId = parseInt(employeeFilter);
      if (paymentStatusFilter !== 'all') where.status = paymentStatusFilter;
      return fetchEmployeePayments({ where, orderBy: 'createdAt', orderDir: 'desc' });
    },
    staleTime: 1000 * 60,
    enabled: tabIndex === 1,
  });

  // ─── Mutations ──────────────────────────────────────────
  const deleteEmployeeMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setDeleteConfirmOpen(false);
      setEmployeeToDelete(null);
    },
  });

  const restoreEmployeeMutation = useMutation({
    mutationFn: restoreEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setRestoreConfirmOpen(false);
    },
  });

  const markPaymentMutation = useMutation({
    mutationFn: markPaymentPaid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setMarkPaidConfirmOpen(false);
      setPaymentToMark(null);
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: deletePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-payments'] });
      setPaymentDeleteConfirmOpen(false);
      setPaymentToDelete(null);
    },
  });

  // ─── Handlers ────────────────────────────────────────────
  const handleViewPayments = (employee) => {
    setSelectedEmployee(employee);
    setPaymentsDrawerOpen(true);
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setEmployeeFormOpen(true);
  };

  const handleDeleteEmployee = (employee) => {
    setEmployeeToDelete(employee);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteEmployee = () => {
    if (employeeToDelete) deleteEmployeeMutation.mutate(employeeToDelete.id);
  };

  const handleRestoreEmployee = (employee) => {
    setEmployeeToDelete(employee);
    setRestoreConfirmOpen(true);
  };

  const confirmRestoreEmployee = () => {
    if (employeeToDelete) restoreEmployeeMutation.mutate(employeeToDelete.id);
    setRestoreConfirmOpen(false);
  };

  const handleEditPayment = (payment) => {
    setEditingPayment(payment);
    setPaymentFormOpen(true);
  };

  const handleDeletePayment = (payment) => {
    setPaymentToDelete(payment);
    setPaymentDeleteConfirmOpen(true);
  };

  const confirmDeletePayment = () => {
    if (paymentToDelete) deletePaymentMutation.mutate(paymentToDelete.id);
  };

  const handleMarkPaid = (payment) => {
    setPaymentToMark(payment);
    setMarkPaidConfirmOpen(true);
  };

  const confirmMarkPaid = () => {
    if (paymentToMark) markPaymentMutation.mutate({ id: paymentToMark.id });
  };

  // ─── Employees Columns ────────────────────────────────
  const employeeColumns = [
    { field: 'id', headerName: 'المعرف', width: 80 },
    { field: 'fullName', headerName: 'الاسم الكامل', flex: 1.2 },
    { field: 'phone', headerName: 'الهاتف', width: 150 },
    { field: 'email', headerName: 'البريد الإلكتروني', width: 180 },
    {
      field: 'isActive',
      headerName: 'الحالة',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'نشط' : 'غير نشط'}
          color={params.value ? 'success' : 'default'}
          size="small"
          sx={{ fontWeight: 600 }}
        />
      ),
    },
   
    {
      field: 'actions',
      headerName: 'الإجراءات',
      width: 220,
      sortable: false,
      renderCell: (params) => {
        const employee = params.row;
        return (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tooltip title="عرض المدفوعات">
              <IconButton size="small" onClick={() => handleViewPayments(employee)}>
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {employee.isActive ? (
              <>
                <Tooltip title="تعديل">
                  <IconButton size="small" color="primary" onClick={() => handleEditEmployee(employee)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="أرشفة">
                  <IconButton size="small" color="warning" onClick={() => handleDeleteEmployee(employee)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <Tooltip title="استعادة">
                <IconButton size="small" color="success" onClick={() => handleRestoreEmployee(employee)}>
                  <RestoreIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        );
      },
    },
  ];

  // ─── Payments Columns ──────────────────────────────────
  const paymentColumns = [
    { field: 'id', headerName: 'المعرف', width: 80 },
   {
    field: 'employeeName',
    headerName: 'الموظف',
    flex: 1,
    valueGetter: (value, row) => row.employee?.fullName || 'غير معروف',
  },
  {
    field: 'amount',
    headerName: 'المبلغ',
    width: 120,
    renderCell: (params) => `${params.value} د.ج`,
  },
  {
    field: 'status',
    headerName: 'الحالة',
    width: 120,
    renderCell: (params) => (
      <Chip
        label={params.value === 'paid' ? 'مدفوعة' : 'معلقة'}
        color={params.value === 'paid' ? 'success' : 'warning'}
        size="small"
      />
    ),
  },
  {
    field: 'createdAt',
    headerName: 'تاريخ الإنشاء',
    width: 120,
    valueGetter: (value) => value || '—',
  },
  {
    field: 'paidAt',
    headerName: 'تاريخ الدفع',
    width: 120,
    valueGetter: (value) => value || '—',
  },
    {
      field: 'actions',
      headerName: 'الإجراءات',
      width: 200,
      sortable: false,
      renderCell: (params) => {
        const payment = params.row;
        return (
          <Stack direction="row" spacing={0.5} alignItems="center">
            {payment.status === 'pending' ? (
              <>
                <Tooltip title="تعديل">
                  <IconButton size="small" color="primary" onClick={() => handleEditPayment(payment)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="تعليم كمدفوع">
                  <IconButton size="small" color="success" onClick={() => handleMarkPaid(payment)}>
                    💰
                  </IconButton>
                </Tooltip>
                <Tooltip title="حذف">
                  <IconButton size="small" color="error" onClick={() => handleDeletePayment(payment)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <Tooltip title="مدفوعة">
                <Chip label="مكتملة" color="success" size="small" />
              </Tooltip>
            )}
          </Stack>
        );
      },
    },
  ];

  // ─── Render ────────────────────────────────────────────
  return (
    <Box dir="rtl" sx={{ p: 1, animation: `${fadeInUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1)` }}>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 1.5, letterSpacing: -0.5 }}>
        الموظفون والمدفوعات
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        إدارة الموظفين وتسجيل المدفوعات الشهرية
      </Typography>

      <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 2 }}>
        <Tab label="الموظفون" />
        <Tab label="المدفوعات" />
      </Tabs>

      {/* ─── Employees Tab ─────────────────────────────────── */}
      {tabIndex === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                placeholder="بحث بالاسم أو الهاتف..."
                value={searchEmployee}
                onChange={(e) => setSearchEmployee(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: 280 }}
              />
              <FormControl size="small" sx={{ width: 150 }}>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="الحالة"
                >
                  <MenuItem value="all">الكل</MenuItem>
                  <MenuItem value="active">نشط</MenuItem>
                  <MenuItem value="inactive">غير نشط</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { setEditingEmployee(null); setEmployeeFormOpen(true); }}
            >
              إضافة موظف
            </Button>
          </Box>

          {employeesQuery.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>خطأ في تحميل الموظفين</Alert>
          )}

          <Paper sx={{ height: 500, borderRadius: 2, overflow: 'hidden' }}>
            <DataGrid
              rows={employeesQuery.data || []}
              columns={employeeColumns}
              loading={employeesQuery.isLoading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              disableRowSelectionOnClick
              getRowId={(row) => row.id}
            />
          </Paper>
        </Box>
      )}

      {/* ─── Payments Tab ──────────────────────────────────── */}
      {tabIndex === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ width: 200 }}>
                <InputLabel>الموظف</InputLabel>
                <Select
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  label="الموظف"
                >
                  <MenuItem value="all">الكل</MenuItem>
                  {employeesQuery.data?.filter(e => e.isActive).map(emp => (
                    <MenuItem key={emp.id} value={emp.id}>{emp.fullName}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ width: 150 }}>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  label="الحالة"
                >
                  <MenuItem value="all">الكل</MenuItem>
                  <MenuItem value="pending">معلقة</MenuItem>
                  <MenuItem value="paid">مدفوعة</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { setEditingPayment(null); setPaymentFormOpen(true); }}
            >
              إضافة دفعة
            </Button>
          </Box>

          {paymentsQuery.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>خطأ في تحميل المدفوعات</Alert>
          )}

          <Paper sx={{ height: 500, borderRadius: 2, overflow: 'hidden' }}>
            <DataGrid
              rows={paymentsQuery.data || []}
              columns={paymentColumns}
              loading={paymentsQuery.isLoading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              disableRowSelectionOnClick
              getRowId={(row) => row.id}
            />
          </Paper>
        </Box>
      )}

      {/* ─── Modals & Drawers ───────────────────────────────── */}
      <EmployeeFormModal
        open={employeeFormOpen}
        onClose={() => setEmployeeFormOpen(false)}
        editingEmployee={editingEmployee}
        onSuccess={() => {
          setEmployeeFormOpen(false);
          queryClient.invalidateQueries({ queryKey: ['employees'] });
        }}
      />

      <EmployeePaymentFormModal
        open={paymentFormOpen}
        onClose={() => setPaymentFormOpen(false)}
        editingPayment={editingPayment}
        employees={employeesQuery.data?.filter(e => e.isActive) || []}
        onSuccess={() => {
          setPaymentFormOpen(false);
          queryClient.invalidateQueries({ queryKey: ['employee-payments'] });
          queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        }}
      />

      <EmployeePaymentsDrawer
        open={paymentsDrawerOpen}
        onClose={() => setPaymentsDrawerOpen(false)}
        employee={selectedEmployee}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteEmployee}
        title="أرشفة الموظف"
        message={`هل أنت متأكد من أرشفة "${employeeToDelete?.fullName}"؟ سيتم إلغاء تنشيطه.`}
        confirmText="أرشفة"
        confirmColor="warning"
        loading={deleteEmployeeMutation.isPending}
      />

      <ConfirmDialog
        open={restoreConfirmOpen}
        onClose={() => setRestoreConfirmOpen(false)}
        onConfirm={confirmRestoreEmployee}
        title="استعادة الموظف"
        message={`هل أنت متأكد من استعادة "${employeeToDelete?.fullName}"؟`}
        confirmText="استعادة"
        confirmColor="success"
        loading={restoreEmployeeMutation.isPending}
      />

      <ConfirmDialog
        open={markPaidConfirmOpen}
        onClose={() => setMarkPaidConfirmOpen(false)}
        onConfirm={confirmMarkPaid}
        title="تعليم الدفعة كمدفوعة"
        message={`هل أنت متأكد من تعليم دفعة ${paymentToMark?.amount} د.ج للموظف ${paymentToMark?.employee?.fullName} كمدفوعة؟`}
        confirmText="تعليم كمدفوعة"
        confirmColor="success"
        loading={markPaymentMutation.isPending}
      />

      <ConfirmDialog
        open={paymentDeleteConfirmOpen}
        onClose={() => setPaymentDeleteConfirmOpen(false)}
        onConfirm={confirmDeletePayment}
        title="حذف الدفعة"
        message={`هل أنت متأكد من حذف دفعة ${paymentToDelete?.amount} د.ج؟ (لا يمكن حذف الدفعات المدفوعة)`}
        confirmText="حذف"
        confirmColor="error"
        loading={deletePaymentMutation.isPending}
      />
    </Box>
  );
}