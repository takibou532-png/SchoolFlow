import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { DataGrid } from '@mui/x-data-grid';
import { electronAPI } from '../../../utils/electron';

const fetchEmployeePayments = async (employeeId) => {
  const response = await electronAPI.employeePayment.getByEmployee(employeeId);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

export default function EmployeePaymentsDrawer({ open, onClose, employee }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['employee-payments', employee?.id],
    queryFn: () => fetchEmployeePayments(employee.id),
    enabled: !!employee?.id && open,
    staleTime: 1000 * 60,
  });

  if (!employee) return null;

  const totalPending = data?.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0) || 0;
  const totalPaid = data?.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) || 0;

 const columns = [
  { field: 'id', headerName: 'المعرف', width: 80 },
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

];

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 500 } }}>
      <Box sx={{ p: 3, dir: 'rtl' }}>
        <Typography variant="h5" gutterBottom>مدفوعات {employee.fullName}</Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Chip label={`إجمالي المدفوعات: ${data?.length || 0}`} variant="outlined" />
          <Chip label={`معلقة: ${totalPending} د.ج`} color="warning" />
          <Chip label={`مدفوعة: ${totalPaid} د.ج`} color="success" />
        </Box>

        {isLoading ? (
          <CircularProgress />
        ) : error ? (
          <Alert severity="error">{error.message}</Alert>
        ) : data?.length === 0 ? (
          <Typography color="textSecondary">لا توجد مدفوعات لهذا الموظف.</Typography>
        ) : (
          <Box sx={{ height: 400 }}>
            <DataGrid
              rows={data}
              columns={columns}
              pageSizeOptions={[5, 10]}
              initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
              disableRowSelectionOnClick
            />
          </Box>
        )}
      </Box>
    </Drawer>
  );
}