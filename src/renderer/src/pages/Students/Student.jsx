import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid } from '@mui/x-data-grid';
import Avatar from '@mui/material/Avatar';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SchoolIcon from '@mui/icons-material/School';
import ClassIcon from '@mui/icons-material/Class';
import BlockIcon from '@mui/icons-material/Block';
import VisibilityIcon from '@mui/icons-material/Visibility';

import { electronAPI } from '../../utils/electron';

import StudentForm from './components/StudentForm';
import EnrollModuleModal from './components/EnrollModuleModal';
import EnrollCourseModal from './components/EnrollCourseModal';
import StudentDetails from './components/StudentDetails';
import SuspendDialog from './components/SuspendDialog';

// ─────────────────────────────────────────────────────────────
// Arabic locale for DataGrid
// ─────────────────────────────────────────────────────────────

// ─── Student Name Cell with Avatar ──────────────────
function StudentNameCell({ student }) {
  const { data: avatarDataUrl, isLoading } = useQuery({
    queryKey: ['student-avatar', student.id],
    queryFn: async () => {
      const res = await electronAPI.student.getAvatar(student.id);
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
          bgcolor: 'primary.main',
          fontSize: '0.8rem',
          fontWeight: 600,
          transition: 'all 0.3s ease',
          '&:hover': { transform: 'scale(1.08)' },
        }}
      >
        {!avatarDataUrl && !isLoading && `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`}
      </Avatar>
      <Typography sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
        {student.firstName} {student.lastName}
      </Typography>
    </Box>
  );
}
const arLocaleText = {
  noRowsLabel: 'لا توجد صفوف',
  noResultsOverlayLabel: 'لا توجد نتائج',

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
  toolbarFiltersTooltipHide: 'إخفاء الفلاتر',
  toolbarFiltersTooltipShow: 'إظهار الفلاتر',
  toolbarFiltersTooltipActive: (count) => `${count} فلتر نشط`,

  toolbarExport: 'تصدير',
  toolbarExportLabel: 'تصدير',
  toolbarExportCSV: 'تنزيل CSV',
  toolbarExportPrint: 'طباعة',

  MuiTablePagination: {
    labelRowsPerPage: 'صفوف في الصفحة:',
    labelDisplayedRows: ({ from, to, count }) =>
      `${from}–${to} من ${
        count !== -1 ? count : `أكثر من ${to}`
      }`,
  },
};

// ─────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────

const fetchStudents = async (options) => {
  const response = await electronAPI.student.getAll(options);
  console.log("student: ",response);

  if (!response.success) {
    throw new Error(response.error);
  }

  return response.data;
};

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function Students() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // ───────────────────────────────────────────────────────────
  // Modals State
  // ───────────────────────────────────────────────────────────

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState(null);

  const [enrollModuleOpen, setEnrollModuleOpen] = useState(false);
  const [enrollCourseOpen, setEnrollCourseOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // ───────────────────────────────────────────────────────────
  // Query
  // ───────────────────────────────────────────────────────────

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'students',
      {
        search: searchTerm,
        status: filterStatus,
      },
    ],

    queryFn: () =>
      fetchStudents({
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

  // ───────────────────────────────────────────────────────────
  // Mutations
  // ───────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: async ({
      studentId,
      moduleId,
      reason,
    }) => {
      const response =
        await electronAPI.student.suspendFromModule(
          studentId,
          moduleId,
          reason
        );

      if (!response.success) {
        throw new Error(response.error);
      }

      return response.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['students'],
      });
    },
  });

  // ───────────────────────────────────────────────────────────
  // Handlers
  // ───────────────────────────────────────────────────────────

  const handleAddStudent = () => {
    setAddModalOpen(true);
  };

  const handleEditStudent = (student) => {
    setSelectedStudent(student);
    setEditModalOpen(true);
  };

  const handleEnrollModule = (student) => {
    setSelectedStudent(student);
    setEnrollModuleOpen(true);
  };

  const handleEnrollCourse = (student) => {
    setSelectedStudent(student);
    setEnrollCourseOpen(true);
  };

  const handleSuspend = (student) => {
    setSelectedStudent(student);
    setSuspendOpen(true);
  };

  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    setDetailsOpen(true);
  };

  // ───────────────────────────────────────────────────────────
  // DataGrid Columns
  // ───────────────────────────────────────────────────────────

  const columns = useMemo(
    () => [
   {
  field: 'firstName',
  headerName: 'الاسم',
  width: 220,
  renderCell: (params) => <StudentNameCell student={params.row} />,
},

      {
        field: 'guardianName',
        headerName: 'ولي الأمر',
        width: 150,
      },

      {
        field: 'guardianPhone',
        headerName: 'هاتف ولي الأمر',
        width: 130,
      },

      {
        field: 'isActive',
        headerName: 'الحالة',
        width: 120,

        renderCell: (params) => (
          <Chip
            label={params.value ? 'نشط' : 'موقوف'}
            color={
              params.value
                ? 'success'
                : 'error'
            }
            size="small"
            sx={{
              fontWeight: 700,
              borderRadius: '8px',

              transition:
                'transform 0.25s ease, box-shadow 0.25s ease',

              animation: params.value
                ? 'statusPulse 2.8s ease-in-out infinite'
                : 'none',

              '@keyframes statusPulse': {
                '0%, 100%': {
                  transform: 'scale(1)',
                },

                '50%': {
                  transform: 'scale(1.04)',
                },
              },

              '&:hover': {
                transform:
                  'translateY(-2px) scale(1.05)',

                boxShadow:
                  '0 4px 12px rgba(0,0,0,0.12)',
              },
            }}
          />
        ),
      },

      {
        field: 'actions',
        headerName: 'إجراءات',
        width: 280,
        sortable: false,

        renderCell: (params) => (
          <Box
            sx={{
              display: 'flex',
              gap: 0.7,
              alignItems: 'center',
              height: '100%',
            }}
          >
            {/* View */}
            <Tooltip title="عرض التفاصيل" arrow>
              <IconButton
                size="small"
                onClick={() =>
                  handleViewDetails(params.row)
                }
                sx={{
                  transition:
                    'all 0.25s cubic-bezier(.4,0,.2,1)',

                  '&:hover': {
                    transform:
                      'translateY(-3px) scale(1.08)',

                    backgroundColor:
                      'rgba(25,118,210,0.10)',

                    boxShadow:
                      '0 4px 10px rgba(25,118,210,0.12)',
                  },

                  '&:active': {
                    transform: 'scale(0.92)',
                  },
                }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Edit */}
            <Tooltip title="تعديل" arrow>
              <IconButton
                size="small"
                onClick={() =>
                  handleEditStudent(params.row)
                }
                sx={{
                  transition:
                    'all 0.25s cubic-bezier(.4,0,.2,1)',

                  '&:hover': {
                    transform:
                      'translateY(-3px) rotate(-8deg) scale(1.08)',

                    backgroundColor:
                      'rgba(156,39,176,0.10)',

                    boxShadow:
                      '0 4px 10px rgba(156,39,176,0.12)',
                  },

                  '&:active': {
                    transform: 'scale(0.92)',
                  },
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Module */}
            <Tooltip title="تسجيل في وحدة" arrow>
              <IconButton
                size="small"
                onClick={() =>
                  handleEnrollModule(params.row)
                }
                sx={{
                  transition:
                    'all 0.25s cubic-bezier(.4,0,.2,1)',

                  '&:hover': {
                    transform:
                      'translateY(-3px) scale(1.1)',

                    backgroundColor:
                      'rgba(46,125,50,0.10)',

                    boxShadow:
                      '0 4px 10px rgba(46,125,50,0.12)',
                  },

                  '&:active': {
                    transform: 'scale(0.92)',
                  },
                }}
              >
                <SchoolIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Course */}
            <Tooltip title="تسجيل في دورة" arrow>
              <IconButton
                size="small"
                onClick={() =>
                  handleEnrollCourse(params.row)
                }
                sx={{
                  transition:
                    'all 0.25s cubic-bezier(.4,0,.2,1)',

                  '&:hover': {
                    transform:
                      'translateY(-3px) rotate(5deg) scale(1.08)',

                    backgroundColor:
                      'rgba(237,108,2,0.10)',

                    boxShadow:
                      '0 4px 10px rgba(237,108,2,0.12)',
                  },

                  '&:active': {
                    transform: 'scale(0.92)',
                  },
                }}
              >
                <ClassIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Suspend */}
            {params.row.isActive && (
              <Tooltip title="إيقاف من وحدة" arrow>
                <IconButton
                  size="small"
                  color="warning"
                  onClick={() =>
                    handleSuspend(params.row)
                  }
                  sx={{
                    transition:
                      'all 0.25s cubic-bezier(.4,0,.2,1)',

                    '&:hover': {
                      transform:
                        'translateY(-3px) scale(1.1)',

                      backgroundColor:
                        'rgba(237,108,2,0.14)',

                      boxShadow:
                        '0 4px 12px rgba(237,108,2,0.18)',
                    },

                    '&:active': {
                      transform: 'scale(0.92)',
                    },
                  }}
                >
                  <BlockIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        ),
      },
    ],
    []
  );

  // ───────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────

  return (
    <Box
      dir="rtl"
      sx={{
        width: '100%',

        animation:
          'pageEnter 0.55s cubic-bezier(.22,1,.36,1)',

        '@keyframes pageEnter': {
          from: {
            opacity: 0,
            transform: 'translateY(12px)',
          },

          to: {
            opacity: 1,
            transform: 'translateY(0)',
          },
        },
      }}
    >
      {/* ═══════════════════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════════════════ */}

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,

          animation:
            'headerEnter 0.65s cubic-bezier(.22,1,.36,1)',

          '@keyframes headerEnter': {
            from: {
              opacity: 0,
              transform: 'translateY(-12px)',
            },

            to: {
              opacity: 1,
              transform: 'translateY(0)',
            },
          },
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            letterSpacing: '-0.5px',

            background:
              'linear-gradient(90deg, currentColor, rgba(100,100,100,0.7))',

            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',

            transition:
              'letter-spacing 0.3s ease, transform 0.3s ease',

            '&:hover': {
              letterSpacing: '0px',
              transform: 'translateX(-2px)',
            },
          }}
        >
          الطلاب
        </Typography>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddStudent}
          sx={{
            borderRadius: '10px',

            px: 2.2,
            py: 1.1,

            fontWeight: 700,

            boxShadow:
              '0 5px 14px rgba(25,118,210,0.20)',

            transition:
              'transform 0.25s cubic-bezier(.4,0,.2,1), box-shadow 0.25s ease',

            '&:hover': {
              transform: 'translateY(-3px)',

              boxShadow:
                '0 9px 22px rgba(25,118,210,0.28)',
            },

            '&:active': {
              transform:
                'translateY(0) scale(0.97)',
            },

            '& .MuiButton-startIcon': {
              transition:
                'transform 0.3s ease',
            },

            '&:hover .MuiButton-startIcon': {
              transform:
                'rotate(90deg)',
            },
          }}
        >
          إضافة طالب
        </Button>
      </Box>

      {/* ═══════════════════════════════════════════════════════
          FILTERS
      ═══════════════════════════════════════════════════════ */}

      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 2,

          p: 1.5,

          borderRadius: '12px',

          backgroundColor:
            'background.paper',

          border: '1px solid',
          borderColor: 'divider',

          boxShadow:
            '0 3px 14px rgba(0,0,0,0.04)',

          animation:
            'filtersEnter 0.7s 0.08s both ease-out',

          '@keyframes filtersEnter': {
            from: {
              opacity: 0,
              transform: 'translateY(10px)',
            },

            to: {
              opacity: 1,
              transform: 'translateY(0)',
            },
          },

          transition:
            'box-shadow 0.3s ease, transform 0.3s ease',

          '&:hover': {
            boxShadow:
              '0 6px 20px rgba(0,0,0,0.07)',
          },
        }}
      >
        <TextField
          size="small"
          label="بحث"
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(e.target.value)
          }
          sx={{
            width: 300,

            '& .MuiOutlinedInput-root': {
              borderRadius: '9px',

              transition:
                'all 0.25s ease',

              '&:hover': {
                transform:
                  'translateY(-1px)',
              },

              '&.Mui-focused': {
                boxShadow:
                  '0 0 0 3px rgba(25,118,210,0.10)',
              },
            },
          }}
        />

        <TextField
          size="small"
          select
          label="الحالة"
          value={filterStatus}
          onChange={(e) =>
            setFilterStatus(e.target.value)
          }
          SelectProps={{
            native: true,
          }}
          sx={{
            width: 150,

            '& .MuiOutlinedInput-root': {
              borderRadius: '9px',

              transition:
                'all 0.25s ease',

              '&:hover': {
                transform:
                  'translateY(-1px)',
              },

              '&.Mui-focused': {
                boxShadow:
                  '0 0 0 3px rgba(25,118,210,0.10)',
              },
            },
          }}
        >
          <option value="all">
            الكل
          </option>

          <option value="active">
            نشط
          </option>

          <option value="suspended">
            موقوف
          </option>
        </TextField>
      </Box>

      {/* ═══════════════════════════════════════════════════════
          DATAGRID
      ═══════════════════════════════════════════════════════ */}

      <Box
        sx={{
          height: 600,
          width: '100%',

          borderRadius: '14px',
          overflow: 'hidden',

          backgroundColor:
            'background.paper',

          border: '1px solid',
          borderColor: 'divider',

          boxShadow:
            '0 5px 20px rgba(0,0,0,0.05)',

          animation:
            'gridEnter 0.75s 0.15s both cubic-bezier(.22,1,.36,1)',

          '@keyframes gridEnter': {
            from: {
              opacity: 0,
              transform:
                'translateY(16px) scale(0.99)',
            },

            to: {
              opacity: 1,
              transform:
                'translateY(0) scale(1)',
            },
          },

          '& .MuiDataGrid-root': {
            border: 'none',
            backgroundColor:
              'transparent',
          },

          // Header
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor:
              'action.hover',

            borderBottom:
              '1px solid',

            borderColor:
              'divider',

            fontWeight: 800,

            minHeight:
              '56px !important',

            maxHeight:
              '56px !important',
          },

          '& .MuiDataGrid-columnHeader': {
            transition:
              'background-color 0.2s ease',

            '&:hover': {
              backgroundColor:
                'action.selected',
            },
          },

          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 800,
          },

          // Rows
          '& .MuiDataGrid-row': {
            transition:
              'background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',

            '&:hover': {
              backgroundColor:
                'action.hover',

              transform:
                'translateX(-2px)',

              boxShadow:
                'inset -3px 0 0 rgba(25,118,210,0.35)',
            },
          },

          // Cells
          '& .MuiDataGrid-cell': {
            borderColor:
              'divider',

            transition:
              'background-color 0.2s ease',
          },

          '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within':
            {
              outline: 'none',
            },

          // Footer
          '& .MuiDataGrid-footerContainer': {
            borderTop:
              '1px solid',

            borderColor:
              'divider',

            minHeight: '52px',

            backgroundColor:
              'action.hover',
          },

          // Pagination
          '& .MuiTablePagination-root': {
            direction: 'rtl',
          },

          '& .MuiTablePagination-actions button': {
            transition:
              'all 0.2s ease',

            '&:hover': {
              transform:
                'scale(1.1)',
            },
          },

          // Loading overlay
          '& .MuiDataGrid-overlay': {
            backgroundColor:
              'rgba(255,255,255,0.65)',

            backdropFilter:
              'blur(3px)',
          },

          // Scrollbar
          '& .MuiDataGrid-virtualScroller::-webkit-scrollbar':
            {
              width: '7px',
              height: '7px',
            },

          '& .MuiDataGrid-virtualScroller::-webkit-scrollbar-thumb':
            {
              backgroundColor:
                'rgba(120,120,120,0.35)',

              borderRadius: '10px',

              transition:
                'background-color 0.2s ease',
            },

          '& .MuiDataGrid-virtualScroller::-webkit-scrollbar-thumb:hover':
            {
              backgroundColor:
                'rgba(120,120,120,0.55)',
            },
        }}
      >
        <DataGrid
          rows={data || []}
          columns={columns}
          loading={isLoading}
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
          localeText={arLocaleText}
        />
      </Box>

      {/* ═══════════════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════════════ */}

      <StudentForm
        open={addModalOpen}
        onClose={() =>
          setAddModalOpen(false)
        }
        onSuccess={() => {
          setAddModalOpen(false);

          queryClient.invalidateQueries({
            queryKey: ['students'],
          });
        }}
        mode="create"
      />

      <StudentForm
        open={editModalOpen}
        onClose={() =>
          setEditModalOpen(false)
        }
        onSuccess={() => {
          setEditModalOpen(false);

          queryClient.invalidateQueries({
            queryKey: ['students'],
          });
        }}
        mode="edit"
        initialData={selectedStudent}
      />

      <EnrollModuleModal
        open={enrollModuleOpen}
        onClose={() =>
          setEnrollModuleOpen(false)
        }
        student={selectedStudent}
        onSuccess={() => {
          setEnrollModuleOpen(false);

          queryClient.invalidateQueries({
            queryKey: ['students'],
          });
        }}
      />

      <EnrollCourseModal
        open={enrollCourseOpen}
        onClose={() =>
          setEnrollCourseOpen(false)
        }
        student={selectedStudent}
        onSuccess={() => {
          setEnrollCourseOpen(false);

          queryClient.invalidateQueries({
            queryKey: ['students'],
          });
        }}
      />

      <SuspendDialog
        open={suspendOpen}
        onClose={() =>
          setSuspendOpen(false)
        }
        student={selectedStudent}
        onSuccess={() => {
          setSuspendOpen(false);

          queryClient.invalidateQueries({
            queryKey: ['students'],
          });
        }}
      />

      <StudentDetails
        open={detailsOpen}
        onClose={() =>
          setDetailsOpen(false)
        }
        student={selectedStudent}
      />
    </Box>
  );
}