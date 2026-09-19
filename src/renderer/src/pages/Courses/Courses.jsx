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
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';

import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArchiveIcon from '@mui/icons-material/Archive';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClassIcon from '@mui/icons-material/Class';
import SchoolIcon from '@mui/icons-material/School';
import FilterListIcon from '@mui/icons-material/FilterList';

import { electronAPI } from '../../utils/electron';

import CourseDetailsDrawer from './components/CourseDetailsDrawer';
import CreateCourseModal from './components/CreateCourseModal';
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

// ─── API Functions ──────────────────────────────────────────

const fetchCourses = async (options) => {
  const response = await electronAPI.course.getAll(options);
  console.log("courses:",response)
  if (!response.success) {
    throw new Error(response.error);
  }
  return response.data;
};

const archiveCourse = async (courseId) => {
  const response = await electronAPI.course.archive(courseId);
  if (!response.success) {
    throw new Error(response.error);
  }
  return response.data;
};

const cancelCourse = async ({ courseId, reason }) => {
  const response = await electronAPI.course.cancel(courseId, reason);
  if (!response.success) {
    throw new Error(response.error);
  }
  return response.data;
};

// ─── Main Component ─────────────────────────────────────────

export default function Courses() {
  const queryClient = useQueryClient();

  // ─── State ────────────────────────────────────────

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const [actionTarget, setActionTarget] = useState(null);

  // ─── Query ────────────────────────────────────────

  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      'courses',
      {
        search: searchTerm,
        status: filterStatus,
      },
    ],
    queryFn: () =>
      fetchCourses({
        search: searchTerm,
        where:
          filterStatus === 'all'
            ? {}
            : {
                isActive: filterStatus === 'active',
              },
      }),
    staleTime: 1000 * 60,
  });

  // ─── Mutations ────────────────────────────────────

  const archiveMutation = useMutation({
    mutationFn: archiveCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['courses'],
      });
      setArchiveConfirmOpen(false);
      setActionTarget(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['courses'],
      });
      setCancelConfirmOpen(false);
      setActionTarget(null);
    },
  });

  // ─── Handlers ─────────────────────────────────────

  const handleViewDetails = (course) => {
    setSelectedCourse(course);
    setDetailsOpen(true);
  };

  const handleArchive = (course) => {
    setActionTarget(course);
    setArchiveConfirmOpen(true);
  };

  const handleCancel = (course) => {
    setActionTarget(course);
    setCancelConfirmOpen(true);
  };

  const confirmArchive = () => {
    if (!actionTarget) return;
    archiveMutation.mutate(actionTarget.id);
  };

  const confirmCancel = () => {
    if (!actionTarget) return;
    cancelMutation.mutate({
      courseId: actionTarget.id,
      reason: 'تم الإلغاء بواسطة المسؤول',
    });
  };

  // ─── Columns ──────────────────────────────────────

  const columns = [
    {
      field: 'id',
      headerName: 'المعرف',
      width: 90,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={700} color="text.secondary">
          #{params.value}
        </Typography>
      ),
    },
    {
      field: 'name',
      headerName: 'اسم الدورة',
      flex: 1.2,
      minWidth: 180,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ClassIcon sx={{ fontSize: 18, color: 'primary.main', opacity: 0.8 }} />
          <Typography variant="body2" fontWeight={700}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'subjectName',
      headerName: 'المادة',
      flex: 1,
      minWidth: 140,
    },
    {
      field: 'level',
      headerName: 'المستوى',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value || 'غير محدد'}
          size="small"
          variant="outlined"
          sx={{ borderRadius: 1.5, fontWeight: 600 }}
        />
      ),
    },
 {
  field: 'teacherName',
  headerName: 'الأستاذ',
  flex: 1,
  minWidth: 160,
  renderCell: (params) => {
    const name = params.row.teacherName;
    const teacherId = params.row.teacherId;
    let label = 'غير محدد';
    if (name) {
      label = name;
    } else if (teacherId) {
      label = `الأستاذ رقم ${teacherId}`;
    }
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SchoolIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="body2">{label}</Typography>
      </Box>
    );
  },
},
    {
      field: 'maxStudents',
      headerName: 'أقصى عدد للطلاب',
      width: 140,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={600}>
          {params.value} طالباً
        </Typography>
      ),
    },
    {
      field: 'isActive',
      headerName: 'الحالة',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'نشط' : 'مؤرشف'}
          color={params.value ? 'success' : 'default'}
          size="small"
          sx={{
            fontWeight: 700,
            borderRadius: 2,
            px: 0.5,
            bgcolor: params.value ? 'rgba(46, 125, 50, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            color: params.value ? 'success.main' : 'text.secondary',
          }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'الإجراءات',
      width: 160,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const course = params.row;
        return (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ height: '100%' }}>
            <Tooltip title="عرض التفاصيل">
              <IconButton
                size="small"
                onClick={() => handleViewDetails(course)}
                sx={{
                  bgcolor: 'action.hover',
                  '&:hover': { bgcolor: 'primary.main', color: '#fff' },
                  transition: 'all 0.2s',
                }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {course?.isActive && (
              <>
                <Tooltip title="أرشفة">
                  <IconButton
                    size="small"
                    onClick={() => handleArchive(course)}
                    sx={{
                      bgcolor: 'rgba(237, 108, 2, 0.1)',
                      color: 'warning.main',
                      '&:hover': { bgcolor: 'warning.main', color: '#fff' },
                      transition: 'all 0.2s',
                    }}
                  >
                    <ArchiveIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="إلغاء (قبل البدء)">
                  <IconButton
                    size="small"
                    onClick={() => handleCancel(course)}
                    sx={{
                      bgcolor: 'rgba(211, 47, 47, 0.1)',
                      color: 'error.main',
                      '&:hover': { bgcolor: 'error.main', color: '#fff' },
                      transition: 'all 0.2s',
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Stack>
        );
      },
    },
  ];

  // ─── Render ───────────────────────────────────────

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
            الدورات التعليمية
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            إدارة وتتبع الدورات التدريبية والتعليمية بالمؤسسة
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon sx={{ ml: 0.5, mr: -0.5 }} />}
          onClick={() => setCreateModalOpen(true)}
          sx={{
            borderRadius: 2.5,
            px: 3,
            py: 1.2,
            fontWeight: 700,
            boxShadow: '0 4px 14px 0 rgba(25, 118, 210, 0.39)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 20px 0 rgba(25, 118, 210, 0.54)',
            },
          }}
        >
          إنشاء دورة جديدة
        </Button>
      </Box>

      {/* ─── Search & Filters Bar ───────────────────── */}
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
          flexWrap: 'wrap',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
        }}
      >
        <TextField
          size="small"
          placeholder="بحث بجميع الحقول..."
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
            width: { xs: '100%', sm: 320 },
            '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
          }}
        />

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="status-filter-label" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <FilterListIcon fontSize="small" /> الحالة
          </InputLabel>
          <Select
            labelId="status-filter-label"
            value={filterStatus}
            label="الحالة"
            onChange={(e) => setFilterStatus(e.target.value)}
            sx={{ borderRadius: 2.5 }}
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="active">نشط</MenuItem>
            <MenuItem value="archived">مؤرشف</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {/* ─── Error Alert ────────────────────────────── */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          خطأ في تحميل الدورات: {error.message}
        </Alert>
      )}

      {/* ─── DataGrid Container ──────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          height: 600,
          width: '100%',
          borderRadius: 3,
          border: '1px solid rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          boxShadow: '0 4px 20px 0 rgba(0,0,0,0.03)',
        }}
      >
        <DataGrid
          rows={Array.isArray(data) ? data : []}
          columns={columns}
          loading={isLoading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 10,
                page: 0,
              },
            },
          }}
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
                backgroundColor: 'rgba(25, 118, 210, 0.04)',
              },
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid rgba(0, 0, 0, 0.08)',
            },
          }}
        />
      </Paper>

      {/* ─── Create Course Modal ─────────────────── */}
      <CreateCourseModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false);
          queryClient.invalidateQueries({
            queryKey: ['courses'],
          });
        }}
      />

      {/* ─── Course Details Drawer ───────────────── */}
      <CourseDetailsDrawer
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedCourse(null);
        }}
        course={selectedCourse}
        onUpdate={() => {
          queryClient.invalidateQueries({
            queryKey: ['courses'],
          });
        }}
      />

      {/* ─── Archive Confirmation ────────────────── */}
      <ConfirmDialog
        open={archiveConfirmOpen}
        onClose={() => {
          setArchiveConfirmOpen(false);
          setActionTarget(null);
        }}
        onConfirm={confirmArchive}
        title="أرشفة الدورة"
        message={`هل أنت متأكد من أنك تريد أرشفة "${
          actionTarget?.name ?? ''
        }"؟ سيتم تعليم جميع الجلسات كملغاة.`}
        confirmText="أرشفة"
        confirmColor="warning"
        loading={archiveMutation.isPending}
      />

      {/* ─── Cancel Confirmation ─────────────────── */}
      <ConfirmDialog
        open={cancelConfirmOpen}
        onClose={() => {
          setCancelConfirmOpen(false);
          setActionTarget(null);
        }}
        onConfirm={confirmCancel}
        title="إلغاء الدورة"
        message={`هل أنت متأكد من أنك تريد إلغاء "${
          actionTarget?.name ?? ''
        }"؟ سيؤدي هذا إلى حذف الدورة وجلساتها وتسجيلاتها وفواتيرها ومدفوعاتها نهائيًا (مسموح فقط قبل تاريخ البدء).`}
        confirmText="إلغاء"
        confirmColor="error"
        loading={cancelMutation.isPending}
      />
    </Box>
  );
}