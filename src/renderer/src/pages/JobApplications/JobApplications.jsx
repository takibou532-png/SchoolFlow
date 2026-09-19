import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid } from '@mui/x-data-grid';
import { keyframes } from '@mui/system';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Paper from '@mui/material/Paper';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FilterListIcon from '@mui/icons-material/FilterList';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import { electronAPI } from '../../utils/electron';
import JobApplicationFormModal from './components/JobApplicationFormModal';
import ConfirmDialog from '../../components/ConfirmDialog';

// ─── Keyframe Animations ──────────────────────────────────────
const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ─── Helper: Format date ────────────────────────────────────
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return dateStr.split('T')[0];
};

// ─── API Functions ──────────────────────────────────────────
const fetchApplications = async (options) => {
  const response = await electronAPI.jobApplication.getAll(options);
  console.log("job ", response)
  if (!response.success) throw new Error(response.error);
  return response.data;
};

const fetchApplicationsBySubject = async (subjectId) => {
  const response = await electronAPI.jobApplication.getBySubject(subjectId);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

const deleteApplication = async (id) => {
  const response = await electronAPI.jobApplication.delete(id);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

// ─── Main Component ─────────────────────────────────────────
export default function JobApplications() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [applicationToDelete, setApplicationToDelete] = useState(null);

  // ─── Fetch subjects for filter ────────────────────────────
  const { data: subjects } = useQuery({
    queryKey: ['subjects', 'active'],
    queryFn: async () => {
      const res = await electronAPI.subject.getAll({ where: { isActive: true } });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // ─── Fetch applications ────────────────────────────────────
  const queryKey = ['job-applications', { search: searchTerm, subject: subjectFilter }];
  const queryFn = async () => {
    if (subjectFilter !== 'all') {
      return fetchApplicationsBySubject(subjectFilter);
    }
    return fetchApplications({ search: searchTerm, orderBy: 'createdAt', orderDir: 'desc' });
  };

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn,
    staleTime: 1000 * 60,
  });

  // ─── Mutations ────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: deleteApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      setDeleteConfirmOpen(false);
      setApplicationToDelete(null);
    },
    onError: (err) => alert('فشل الحذف: ' + err.message),
  });

  // ─── Handlers ─────────────────────────────────────────────
  const handleAdd = () => {
    setEditingApplication(null);
    setFormOpen(true);
  };

  const handleEdit = (app) => {
    setEditingApplication(app);
    setFormOpen(true);
  };

  const handleDelete = (app) => {
    setApplicationToDelete(app);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (applicationToDelete) {
      deleteMutation.mutate(applicationToDelete.id);
    }
  };

  const handleOpenCv = async (id) => {
    try {
      const res = await electronAPI.jobApplication.openCv(id);
      if (!res.success) throw new Error(res.error);
    } catch (err) {
      alert('فشل فتح الملف: ' + err.message);
    }
  };

  // ─── Columns ──────────────────────────────────────────────
  const columns = [
    { field: 'id', headerName: 'المعرف', width: 80 },
    { field: 'fullName', headerName: 'الاسم الكامل', flex: 1.2 },
    { field: 'phone', headerName: 'رقم الهاتف', width: 150 },
    {
      field: 'subjectName',
      headerName: 'المادة',
      width: 150,
      valueGetter: (value, row) => row.subjectName || 'غير محدد',
    },
    {
      field: 'createdAt',
      headerName: 'تاريخ التقديم',
      width: 130,
      valueGetter: (value) => formatDate(value),
    },
    {
      field: 'actions',
      headerName: 'الإجراءات',
      width: 220,
      sortable: false,
      renderCell: (params) => {
        const app = params.row;
        return (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tooltip title="فتح السيرة الذاتية (PDF)">
              <IconButton size="small" color="primary" onClick={() => handleOpenCv(app.id)}>
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="تعديل">
              <IconButton size="small" color="info" onClick={() => handleEdit(app)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="حذف">
              <IconButton size="small" color="error" onClick={() => handleDelete(app)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        );
      },
    },
  ];

  // ─── Render ────────────────────────────────────────────────
  return (
    <Box dir="rtl" sx={{ p: 1, animation: `${fadeInUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1)` }}>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 1.5, letterSpacing: -0.5 }}>
        طلبات التوظيف
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        إدارة طلبات التوظيف المقدمة من الأساتذة المحتملين
      </Typography>

      {/* ─── Search, Filter & Add Bar ───────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="بحث بالاسم أو رقم الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ width: 280 }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="subject-filter-label">
              <FilterListIcon fontSize="small" sx={{ mr: 0.5 }} /> المادة
            </InputLabel>
            <Select
              labelId="subject-filter-label"
              value={subjectFilter}
              label="المادة"
              onChange={(e) => setSubjectFilter(e.target.value)}
              sx={{ borderRadius: 2.5 }}
            >
              <MenuItem value="all">جميع المواد</MenuItem>
              {subjects?.map((sub) => (
                <MenuItem key={sub.id} value={sub.id.toString()}>
                  {sub.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          sx={{ borderRadius: 2.5, px: 3, fontWeight: 700 }}
        >
          إضافة طلب جديد
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          خطأ في تحميل الطلبات: {error.message}
        </Alert>
      )}

      {/* ─── DataGrid ───────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          height: 550,
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
          getRowId={(row) => row.id}
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
              fontWeight: 700,
            },
            '& .MuiDataGrid-cell': { borderBottom: '1px solid rgba(0, 0, 0, 0.04)' },
            '& .MuiDataGrid-row:hover': { backgroundColor: 'rgba(25, 118, 210, 0.04)' },
          }}
        />
      </Paper>

      {/* ─── Modals ────────────────────────────────────────── */}
      <JobApplicationFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editingApplication={editingApplication}
        onSuccess={() => {
          setFormOpen(false);
          queryClient.invalidateQueries({ queryKey: ['job-applications'] });
        }}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="حذف الطلب"
        message={`هل أنت متأكد من حذف طلب التوظيف لـ "${applicationToDelete?.fullName}"؟`}
        confirmText="حذف"
        confirmColor="error"
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}