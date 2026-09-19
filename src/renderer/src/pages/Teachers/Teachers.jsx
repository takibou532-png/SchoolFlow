import React, { useState, useMemo } from 'react';
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
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import InputAdornment from '@mui/material/InputAdornment';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/Restore';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import SchoolIcon from '@mui/icons-material/School';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import ArchiveIcon from '@mui/icons-material/Archive';
import PercentIcon from '@mui/icons-material/Percent';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import FilterListIcon from '@mui/icons-material/FilterList';

import { electronAPI } from '../../utils/electron';
import TeacherForm from './components/TeacherForm';
import TeacherDetailsDrawer from './components/TeacherDetailsDrawer';
import ConfirmDialog from './components/ConfirmDialog';


function TeacherNameCell({ teacher }) {
  const { data: avatarDataUrl } = useQuery({
    queryKey: ['teacher-avatar', teacher.id],
    queryFn: async () => {
      const res = await electronAPI.teacher.getAvatar(teacher.id);
      return res.success ? res.dataUrl : null;
    },
    staleTime: 1000 * 60 * 5,
  });

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Avatar
        src={avatarDataUrl || undefined}
        sx={{
          width: 34,
          height: 34,
          bgcolor: 'primary.light',
          color: 'primary.contrastText',
          fontSize: 14,
          fontWeight: 700,
          transition: 'all 0.3s ease',
          '&:hover': { transform: 'scale(1.08)' },
        }}
      >
        {!avatarDataUrl && `${teacher.firstName?.[0] || ''}${teacher.lastName?.[0] || ''}`}
      </Avatar>
      <Box>
        <Typography variant="body2" fontWeight={700}>
          {teacher.firstName} {teacher.lastName}
        </Typography>
      </Box>
    </Box>
  );
}

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

// ─── Arabic locale for DataGrid ─────────────────────
const arLocaleText = {
  noRowsLabel: 'لا يوجد معلمون',
  noResultsOverlayLabel: 'لا توجد نتائج مطابقة',
  columnMenuLabel: 'القائمة',
  columnMenuShowColumns: 'إظهار الأعمدة',
  columnMenuManageColumns: 'إدارة الأعمدة',
  columnMenuFilter: 'تصفية',
  columnMenuHideColumn: 'إخفاء العمود',
  columnMenuUnsort: 'إلغاء الفرز',
  columnMenuSortAsc: 'فرز تصاعدي',
  columnMenuSortDesc: 'فرز تنازلي',
  filterPanelAddFilter: 'إضافة فلتر',
  filterPanelDeleteIconLabel: 'حذف',
  filterPanelLinkOperator: 'عامل الربط',
  filterPanelOperators: 'المشغلات',
  filterPanelOperatorAnd: 'و',
  filterPanelOperatorOr: 'أو',
  filterPanelColumns: 'الأعمدة',
  filterPanelInputLabel: 'القيمة',
  filterPanelInputPlaceholder: 'قيمة الفلتر',
  toolbarDensity: 'الكثافة',
  toolbarDensityLabel: 'الكثافة',
  toolbarDensityCompact: 'مضغوط',
  toolbarDensityStandard: 'قياسي',
  toolbarDensityComfortable: 'مريح',
  toolbarColumns: 'الأعمدة',
  toolbarColumnsLabel: 'اختر الأعمدة',
  toolbarFilters: 'الفلاتر',
  toolbarFiltersLabel: 'إظهار الفلاتر',
  toolbarExport: 'تصدير',
  toolbarExportLabel: 'تصدير',
  toolbarExportCSV: 'تنزيل CSV',
  toolbarExportPrint: 'طباعة',
  MuiTablePagination: {
    labelRowsPerPage: 'صفوف في الصفحة:',
    labelDisplayedRows: ({ from, to, count }) => `${from}–${to} من ${count !== -1 ? count : `أكثر من ${to}`}`,
  },
};

// ─── API Functions ──────────────────────────────────
const fetchTeachers = async (options) => {
  const response = await electronAPI.teacher.getAll(options);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

const deleteTeacher = async (id) => {
  const response = await electronAPI.teacher.delete(id);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

const restoreTeacher = async (id) => {
  const response = await electronAPI.teacher.restore(id);
  if (!response.success) throw new Error(response.error);
  return response.data;
};

// ─── Main Component ─────────────────────────────────
export default function Teachers() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState(null);

  // ─── Query ─────────────────────────────────────────
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['teachers', { search: searchTerm, status: filterStatus }],
    queryFn: () =>
      fetchTeachers({
        search: searchTerm,
        where: filterStatus === 'all' ? {} : { isActive: filterStatus === 'active' },
      }),
    staleTime: 1000 * 60,
  });

  // ─── Mutations ─────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: deleteTeacher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setConfirmOpen(false);
      setTeacherToDelete(null);
    },
    onError: (error) => alert(error.message),
  });

  const restoreMutation = useMutation({
    mutationFn: restoreTeacher,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teachers'] }),
  });

  // ─── Handlers ──────────────────────────────────────
  const handleAdd = () => {
    setEditingTeacher(null);
    setFormOpen(true);
  };
  const handleEdit = (row) => {
    setEditingTeacher(row);
    setFormOpen(true);
  };
  const handleDelete = (row) => {
    setTeacherToDelete(row);
    setConfirmOpen(true);
  };
  const handleRestore = (row) => {
    restoreMutation.mutate(row.id);
  };
  const handleViewDetails = (row) => {
    setSelectedTeacher(row);
    setDetailsOpen(true);
  };
  const confirmDelete = () => {
    if (teacherToDelete) {
      deleteMutation.mutate(teacherToDelete.id);
    }
  };

  // ─── Metrics Calculations ──────────────────────────
  const totalTeachers = data?.length || 0;
  const activeTeachers = data?.filter((t) => t.isActive).length || 0;
  const archivedTeachers = data?.filter((t) => !t.isActive).length || 0;
  const avgPercentage = totalTeachers
    ? Math.round(data.reduce((acc, t) => acc + (t.paymentPercentage || 0), 0) / totalTeachers)
    : 0;

  // ─── Columns ──────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        field: 'id',
        headerName: 'المعرف',
        width: 90,
        renderCell: (params) => (
          <Typography variant="body2" fontWeight={700} color="text.secondary">
            {params.value}
          </Typography>
        ),
      },
      {
        field: 'fullName',
        headerName: 'الأستاذ / المعلم',
        flex: 1.3,
        minWidth: 220,
        valueGetter: (value, row) => `${row.firstName} ${row.lastName}`,
        renderCell: (params) => <TeacherNameCell teacher={params.row} />,
      },
      {
        field: 'phone',
        headerName: 'رقم الهاتف',
        width: 150,
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2">{params.value || 'غير محدد'}</Typography>
          </Box>
        ),
      },
      {
        field: 'email',
        headerName: 'البريد الإلكتروني',
        width: 200,
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>
              {params.value || 'غير محدد'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'paymentPercentage',
        headerName: 'نسبة المستحقات',
        width: 140,
        renderCell: (params) => (
          <Chip
            label={`${params.value}%`}
            size="small"
            color="primary"
            variant="soft"
            sx={{ fontWeight: 800, borderRadius: 2, bgcolor: 'rgba(25, 118, 210, 0.1)', color: 'primary.main' }}
          />
        ),
      },
      {
        field: 'isActive',
        headerName: 'الحالة',
        width: 130,
        renderCell: (params) => (
          <Chip
            icon={params.value ? <CheckCircleOutlineOutlinedIcon sx={{ fontSize: '15px !important' }} /> : <ArchiveIcon sx={{ fontSize: '15px !important' }} />}
            label={params.value ? 'نشط' : 'مؤرشف'}
            color={params.value ? 'success' : 'default'}
            size="small"
            sx={{ fontWeight: 700, borderRadius: 2 }}
          />
        ),
      },
      {
        field: 'actions',
        headerName: 'الإجراءات',
        width: 170,
        sortable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ height: '100%' }}>
            <Tooltip title="عرض التفاصيل">
              <IconButton
                size="small"
                onClick={() => handleViewDetails(params.row)}
                sx={{
                  bgcolor: 'rgba(0, 0, 0, 0.04)',
                  color: 'text.secondary',
                  '&:hover': { bgcolor: 'text.primary', color: '#fff' },
                  transition: 'all 0.2s',
                }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {params.row.isActive ? (
              <>
                <Tooltip title="تعديل البيانات">
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(params.row)}
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
                <Tooltip title="أرشفة الحساب">
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(params.row)}
                    sx={{
                      bgcolor: 'rgba(237, 108, 2, 0.08)',
                      color: 'warning.main',
                      '&:hover': { bgcolor: 'warning.main', color: '#fff' },
                      transition: 'all 0.2s',
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <Tooltip title="استعادة الحساب">
                <IconButton
                  size="small"
                  onClick={() => handleRestore(params.row)}
                  sx={{
                    bgcolor: 'rgba(46, 125, 50, 0.08)',
                    color: 'success.main',
                    '&:hover': { bgcolor: 'success.main', color: '#fff' },
                    transition: 'all 0.2s',
                  }}
                >
                  <RestoreIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        ),
      },
    ],
    []
  );

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
            الطاقم التعليمي
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            إدارة بيانات الأساتذة، نسب الأرباح، وتوثيق ملفات الأداء السنوية
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon sx={{ ml: 0.5, mr: -0.5 }} />}
          onClick={handleAdd}
          sx={{
            borderRadius: 2.5,
            px: 3,
            py: 1.2,
            fontWeight: 700,
            boxShadow: '0 4px 14px 0 rgba(25, 118, 210, 0.35)',
            bgcolor: 'primary.main',
            '&:hover': {
              bgcolor: 'primary.dark',
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 20px 0 rgba(25, 118, 210, 0.45)',
            },
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          إضافة معلم جديد
        </Button>
      </Box>

      {/* ─── Summary Metrics Grid ────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 3,
              border: '1px solid rgba(0, 0, 0, 0.08)',
              bgcolor: 'background.paper',
              boxShadow: '0 4px 18px rgba(0,0,0,0.02)',
            }}
          >
            <CardContent sx={{ p: 2.2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    إجمالي المعلمين
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ my: 0.5 }}>
                    {totalTeachers}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    مسجلون بالمركز
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'rgba(25, 118, 210, 0.12)', color: 'primary.main', display: 'flex' }}>
                  <SchoolIcon fontSize="medium" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 3,
              border: '1px solid rgba(46, 125, 50, 0.2)',
              bgcolor: 'rgba(46, 125, 50, 0.03)',
              boxShadow: '0 4px 18px rgba(0,0,0,0.02)',
            }}
          >
            <CardContent sx={{ p: 2.2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    الأساتذة النشطون
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="success.main" sx={{ my: 0.5 }}>
                    {activeTeachers}
                  </Typography>
                  <Typography variant="caption" color="success.main" fontWeight={600}>
                    على قيد التدريس
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'rgba(46, 125, 50, 0.12)', color: 'success.main', display: 'flex' }}>
                  <CheckCircleOutlineOutlinedIcon fontSize="medium" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 3,
              border: '1px solid rgba(237, 108, 2, 0.2)',
              bgcolor: 'rgba(237, 108, 2, 0.03)',
              boxShadow: '0 4px 18px rgba(0,0,0,0.02)',
            }}
          >
            <CardContent sx={{ p: 2.2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    الحسابات المؤرشفة
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="warning.main" sx={{ my: 0.5 }}>
                    {archivedTeachers}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    غير متاحين حالياً
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'rgba(237, 108, 2, 0.12)', color: 'warning.main', display: 'flex' }}>
                  <ArchiveIcon fontSize="medium" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 3,
              border: '1px solid rgba(0, 0, 0, 0.08)',
              bgcolor: 'background.paper',
              boxShadow: '0 4px 18px rgba(0,0,0,0.02)',
            }}
          >
            <CardContent sx={{ p: 2.2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    متوسط نسبة الدفع
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ my: 0.5 }}>
                    {avgPercentage}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    نسبة العقد المتفق عليها
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'action.hover', color: 'text.secondary', display: 'flex' }}>
                  <PercentIcon fontSize="medium" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ─── Search & Filters Bar ────────────────────── */}
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
          flexWrap: 'wrap',
          alignItems: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
        }}
      >
        <TextField
          size="small"
          placeholder="بحث بالاسم، رقم الهاتف أو البريد..."
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
            minWidth: 280,
            flex: { xs: '1 1 100%', sm: '1 1 auto' },
            '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
          }}
        />

        
      </Paper>

      {/* ─── DataGrid Container ──────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          height: 520,
          width: '100%',
          borderRadius: 3,
          border: '1px solid rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        }}
      >
        <DataGrid
          rows={data || []}
          columns={columns}
          loading={isLoading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
          localeText={arLocaleText}
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
              fontWeight: 700,
            },
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700 },
            '& .MuiDataGrid-cell': { borderBottom: '1px solid rgba(0, 0, 0, 0.04)' },
            '& .MuiDataGrid-row': {
              transition: 'background-color 0.2s ease',
              '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.03)' },
            },
          }}
        />
      </Paper>

      {/* ─── Drawers & Dialogs ────────────────────────── */}
      <TeacherForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editingTeacher={editingTeacher}
        onSuccess={() => {
          setFormOpen(false);
          queryClient.invalidateQueries({ queryKey: ['teachers'] });
        }}
      />

      <TeacherDetailsDrawer
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        teacher={selectedTeacher}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setTeacherToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="أرشفة حساب المعلم"
        message={`هل أنت متأكد من أرشفة المعلم "${teacherToDelete?.firstName} ${teacherToDelete?.lastName}"؟ سيتم تعطيل تعيينه في الوحدات الدراسية المستقبلية.`}
        confirmText="تأكيد الأرشفة"
        cancelText="إلغاء"
        confirmColor="warning"
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}