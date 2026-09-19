
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import Avatar from '@mui/material/Avatar';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { DataGrid } from '@mui/x-data-grid';

import { electronAPI } from '../../../utils/electron';

// ─────────────────────────────────────────────────────────────
// Arabic DataGrid locale
// ─────────────────────────────────────────────────────────────

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
  toolbarFiltersTooltipActive: (count) =>
    `${count} فلتر نشط`,

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
// Fetch student details
// ─────────────────────────────────────────────────────────────

const fetchStudentDetails = async (studentId) => {
  const statsResponse =
    await electronAPI.student.getStats(studentId);

  if (!statsResponse.success) {
    throw new Error(statsResponse.error);
  }

  const enrollmentsResponse =
    await electronAPI.student.getEnrollments(studentId);

  if (!enrollmentsResponse.success) {
    throw new Error(enrollmentsResponse.error);
  }

  const attendanceResponse =
    await electronAPI.student.getAttendance(studentId);

  if (!attendanceResponse.success) {
    throw new Error(attendanceResponse.error);
  }

  const invoicesResponse =
    await electronAPI.invoice.getByStudent(studentId);

  if (!invoicesResponse.success) {
    throw new Error(invoicesResponse.error);
  }

  return {
    stats: statsResponse.data,
    enrollments: enrollmentsResponse.data,
    attendance: attendanceResponse.data,
    invoices: invoicesResponse.data,
  };
};

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function StudentDetails({
  open,
  onClose,
  student,
}) {
  const [tabIndex, setTabIndex] = useState(0);

  // ───────────────────────────────────────────────────────────
  // Student details query
  //
  // IMPORTANT:
  // This hook MUST stay before any conditional return.
  // ───────────────────────────────────────────────────────────

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['student-details', student?.id],

    queryFn: () =>
      fetchStudentDetails(student.id),

    enabled: Boolean(student?.id && open),
  });

  // ───────────────────────────────────────────────────────────
  // Avatar query
  //
  // IMPORTANT:
  // This hook is also before the conditional return.
  // This fixes:
  // "Rendered more hooks than during the previous render"
  // ───────────────────────────────────────────────────────────

  const {
    data: avatarDataUrl,
    isLoading: avatarLoading,
  } = useQuery({
    queryKey: ['student-avatar', student?.id],

    queryFn: async () => {
      const res =
        await electronAPI.student.getAvatar(student.id);

      return res.success ? res.dataUrl : null;
    },

    enabled: Boolean(student?.id && open),

    staleTime: 1000 * 60 * 5,
  });

  // ───────────────────────────────────────────────────────────
  // Handlers
  // ───────────────────────────────────────────────────────────

  const handleTabChange = (_, newIndex) => {
    setTabIndex(newIndex);
  };

  // Safe to return here because ALL hooks are already executed.
  if (!student) {
    return null;
  }

  // ───────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: {
            xs: '100%',
            sm: 600,
            md: 700,
          },

          maxWidth: '100vw',
        },
      }}
      dir="rtl"
    >
      <Box
        sx={{
          p: 3,
          height: '100%',
          overflowY: 'auto',

          '&::-webkit-scrollbar': {
            width: 7,
          },

          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(120,120,120,0.35)',
            borderRadius: 10,
          },
        }}
      >
        {/* ─────────────────────────────────────────────
            Header
        ───────────────────────────────────────────── */}

        <Box
          sx={{
            mb: 3,

            animation:
              'detailsHeaderEnter 0.45s cubic-bezier(.22,1,.36,1)',

            '@keyframes detailsHeaderEnter': {
              from: {
                opacity: 0,
                transform: 'translateY(-10px)',
              },

              to: {
                opacity: 1,
                transform: 'translateY(0)',
              },
            },
          }}
        >
          <Typography
            variant="h5"
            fontWeight={800}
            gutterBottom
          >
            {student.firstName} {student.lastName}
          </Typography>

          <Box
            sx={{
              display: 'flex',
              gap: 1,
              alignItems: 'center',
            }}
          >
            <Chip
              label={
                student.isActive
                  ? 'نشط'
                  : 'موقوف'
              }
              color={
                student.isActive
                  ? 'success'
                  : 'error'
              }
              sx={{
                fontWeight: 700,
              }}
            />
          </Box>
        </Box>

        {/* ─────────────────────────────────────────────
            Loading
        ───────────────────────────────────────────── */}

        {isLoading ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 8,
              gap: 2,

              animation:
                'fadeIn 0.35s ease',

              '@keyframes fadeIn': {
                from: {
                  opacity: 0,
                },

                to: {
                  opacity: 1,
                },
              },
            }}
          >
            <CircularProgress />

            <Typography
              variant="body2"
              color="text.secondary"
            >
              جاري تحميل معلومات الطالب...
            </Typography>
          </Box>
        ) : error ? (
          /* ─────────────────────────────────────────
             Error
          ───────────────────────────────────────── */

          <Alert
            severity="error"
            sx={{
              borderRadius: 2,

              animation:
                'errorEnter 0.35s ease',

              '@keyframes errorEnter': {
                from: {
                  opacity: 0,
                  transform: 'translateY(8px)',
                },

                to: {
                  opacity: 1,
                  transform: 'translateY(0)',
                },
              },
            }}
          >
            حدث خطأ: {error.message}
          </Alert>
        ) : (
          /* ─────────────────────────────────────────
             Content
          ───────────────────────────────────────── */

          <>
            {/* Tabs */}

            <Tabs
              value={tabIndex}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                mb: 3,

                '& .MuiTab-root': {
                  fontWeight: 700,

                  transition:
                    'all 0.25s ease',

                  '&:hover': {
                    transform:
                      'translateY(-1px)',
                  },
                },
              }}
            >
              <Tab label="معلومات" />
              <Tab label="التسجيلات" />
              <Tab label="الحضور" />
              <Tab label="الفواتير" />
            </Tabs>

            {/* ═══════════════════════════════════════
                TAB 0 — INFORMATION
            ═══════════════════════════════════════ */}

            {tabIndex === 0 &&
              data?.stats && (
                <Box
                  sx={{
                    animation:
                      'tabEnter 0.35s ease',

                    '@keyframes tabEnter': {
                      from: {
                        opacity: 0,
                        transform:
                          'translateY(8px)',
                      },

                      to: {
                        opacity: 1,
                        transform:
                          'translateY(0)',
                      },
                    },
                  }}
                >
                  {/* Avatar Card */}

                  <Card
                    sx={{
                      mb: 3,
                      borderRadius: 3,

                      boxShadow:
                        '0 4px 16px rgba(0,0,0,0.06)',

                      transition:
                        'transform 0.25s ease, box-shadow 0.25s ease',

                      '&:hover': {
                        transform:
                          'translateY(-2px)',

                        boxShadow:
                          '0 8px 24px rgba(0,0,0,0.09)',
                      },
                    }}
                  >
                    <CardContent
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        p: 3,
                      }}
                    >
                      <Avatar
                        src={
                          avatarDataUrl ||
                          undefined
                        }
                        sx={{
                          width: 100,
                          height: 100,
                          bgcolor: 'primary.main',
                          fontSize: '2.5rem',
                          fontWeight: 700,
                          border:
                            '3px solid #fff',

                          boxShadow:
                            '0 4px 14px rgba(0,0,0,0.12)',

                          transition:
                            'transform 0.3s ease',

                          '&:hover': {
                            transform:
                              'scale(1.05)',
                          },
                        }}
                      >
                        {!avatarDataUrl &&
                          !avatarLoading &&
                          `${student.firstName?.[0] || ''}${
                            student.lastName?.[0] || ''
                          }`}
                      </Avatar>

                      <Box>
                        <Typography
                          variant="h5"
                          fontWeight={700}
                        >
                          {student.firstName}{' '}
                          {student.lastName}
                        </Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 0.5 }}
                        >
                          {student.isActive
                            ? 'نشط'
                            : 'موقوف'}
                        </Typography>

                        <Chip
                          label={`نسبة الحضور: ${
                            data.stats
                              .attendanceRate || 0
                          }%`}
                          size="small"
                          color="info"
                          sx={{
                            mt: 0.5,
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Student Information */}

                  <Card
                    sx={{
                      borderRadius: 3,
                      mb: 2,

                      boxShadow:
                        '0 3px 14px rgba(0,0,0,0.04)',
                    }}
                  >
                    <CardContent>
                      <Typography
                        variant="h6"
                        fontWeight={800}
                        sx={{ mb: 2 }}
                      >
                        المعلومات الشخصية
                      </Typography>

                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: '1fr',
                            sm: '1fr 1fr',
                          },
                          gap: 2,
                        }}
                      >
                        <Typography variant="body2">
                          <strong>
                            ولي الأمر:
                          </strong>{' '}
                          {student.guardianName ||
                            '-'}
                        </Typography>

                        <Typography variant="body2">
                          <strong>
                            هاتف ولي الأمر:
                          </strong>{' '}
                          {student.guardianPhone ||
                            '-'}
                        </Typography>

                        <Typography variant="body2">
                          <strong>
                            العنوان:
                          </strong>{' '}
                          {student.address ||
                            '-'}
                        </Typography>

                        <Typography variant="body2">
                          <strong>
                            تاريخ الميلاد:
                          </strong>{' '}
                          {student.dateOfBirth ||
                            '-'}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Invoice Stats */}

                  <Card
                    sx={{
                      borderRadius: 3,

                      boxShadow:
                        '0 3px 14px rgba(0,0,0,0.04)',
                    }}
                  >
                    <CardContent>
                      <Typography
                        variant="h6"
                        fontWeight={800}
                        sx={{ mb: 2 }}
                      >
                        الإحصائيات
                      </Typography>

                      <Typography variant="body2">
                        <strong>
                          إجمالي الفواتير المدفوعة:
                        </strong>{' '}
                        {data.stats
                          .invoiceStats
                          ?.paidCount || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              )}

            {/* ═══════════════════════════════════════
                TAB 1 — ENROLLMENTS
            ═══════════════════════════════════════ */}

            {tabIndex === 1 &&
              data?.enrollments && (
                <Box
                  sx={{
                    animation:
                      'tabEnter 0.35s ease',

                    '@keyframes tabEnter': {
                      from: {
                        opacity: 0,
                        transform:
                          'translateY(8px)',
                      },

                      to: {
                        opacity: 1,
                        transform:
                          'translateY(0)',
                      },
                    },
                  }}
                >
                  {/* Modules */}

                  <Typography
                    variant="h6"
                    fontWeight={800}
                    gutterBottom
                  >
                    الوحدات النشطة
                  </Typography>

                  <Card
                    sx={{
                      borderRadius: 3,
                      mb: 3,
                    }}
                  >
                    <List dense>
                      {data.enrollments.modules
                        ?.length > 0 ? (
                        data.enrollments.modules.map(
                          (enr) => (
                            <ListItem
                              key={enr.id}
                              sx={{
                                transition:
                                  'background-color 0.2s ease',

                                '&:hover': {
                                  backgroundColor:
                                    'action.hover',
                                },
                              }}
                            >
                              <ListItemText
                                primary={
                                  enr.moduleName
                                }
                                secondary={`المستوى: ${
                                  enr.level
                                } | تاريخ البدء: ${
                                  enr.enrolledAt
                                }`}
                              />
                            </ListItem>
                          )
                        )
                      ) : (
                        <ListItem>
                          <ListItemText
                            primary="لا توجد وحدات نشطة"
                            sx={{
                              color:
                                'text.secondary',
                            }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </Card>

                  <Divider sx={{ my: 3 }} />

                  {/* Courses */}

                  <Typography
                    variant="h6"
                    fontWeight={800}
                    gutterBottom
                  >
                    الدورات النشطة
                  </Typography>

                  <Card
                    sx={{
                      borderRadius: 3,
                    }}
                  >
                    <List dense>
                      {data.enrollments.courses
                        ?.length > 0 ? (
                        data.enrollments.courses.map(
                          (enr) => (
                            <ListItem
                              key={enr.id}
                              sx={{
                                transition:
                                  'background-color 0.2s ease',

                                '&:hover': {
                                  backgroundColor:
                                    'action.hover',
                                },
                              }}
                            >
                              <ListItemText
                                primary={
                                  enr.courseName
                                }
                                secondary={`تاريخ البدء: ${
                                  enr.enrolledAt
                                }`}
                              />
                            </ListItem>
                          )
                        )
                      ) : (
                        <ListItem>
                          <ListItemText
                            primary="لا توجد دورات نشطة"
                            sx={{
                              color:
                                'text.secondary',
                            }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </Card>
                </Box>
              )}

            {/* ═══════════════════════════════════════
                TAB 2 — ATTENDANCE
            ═══════════════════════════════════════ */}

            {tabIndex === 2 &&
              data?.attendance && (
                <Box
                  sx={{
                    height: 400,

                    animation:
                      'tabEnter 0.35s ease',

                    '@keyframes tabEnter': {
                      from: {
                        opacity: 0,
                        transform:
                          'translateY(8px)',
                      },

                      to: {
                        opacity: 1,
                        transform:
                          'translateY(0)',
                      },
                    },
                  }}
                >
                  <DataGrid
                    rows={data.attendance || []}
                    getRowId={(row) =>
                      row.id ||
                      `${row.date}-${row.startTime}-${row.moduleName}`
                    }
                    columns={[
                      {
                        field: 'date',
                        headerName: 'التاريخ',
                        width: 120,
                      },

                      {
                        field: 'moduleName',
                        headerName: 'الوحدة',
                        width: 150,
                      },

                      {
                        field: 'status',
                        headerName: 'الحالة',
                        width: 100,

                        renderCell: (
                          params
                        ) => (
                          <Chip
                            label={
                              params.value ===
                              'present'
                                ? 'حاضر'
                                : 'غائب'
                            }
                            color={
                              params.value ===
                              'present'
                                ? 'success'
                                : 'error'
                            }
                            size="small"
                            sx={{
                              fontWeight: 600,
                            }}
                          />
                        ),
                      },
                    ]}
                    pageSizeOptions={[5]}
                    disableRowSelectionOnClick
                    localeText={arLocaleText}
                  />
                </Box>
              )}

            {/* ═══════════════════════════════════════
                TAB 3 — INVOICES
            ═══════════════════════════════════════ */}

            {tabIndex === 3 &&
              data?.invoices && (
                <Box
                  sx={{
                    height: 400,

                    animation:
                      'tabEnter 0.35s ease',

                    '@keyframes tabEnter': {
                      from: {
                        opacity: 0,
                        transform:
                          'translateY(8px)',
                      },

                      to: {
                        opacity: 1,
                        transform:
                          'translateY(0)',
                      },
                    },
                  }}
                >
                  <DataGrid
                    rows={data.invoices || []}
                    getRowId={(row) =>
                      row.id
                    }
                    columns={[
                      {
                        field: 'id',
                        headerName:
                          'رقم الفاتورة',
                        width: 120,
                      },

                      {
                        field: 'amount',
                        headerName:
                          'المبلغ',
                        width: 120,

                        renderCell: (
                          params
                        ) =>
                          `${params.value ?? 0} دج`,
                      },

                      {
                        field: 'status',
                        headerName:
                          'الحالة',
                        width: 120,

                        renderCell: (
                          params
                        ) => (
                          <Chip
                            label={
                              params.value ===
                              'paid'
                                ? 'مدفوعة'
                                : 'غير مدفوعة'
                            }
                            color={
                              params.value ===
                              'paid'
                                ? 'success'
                                : 'warning'
                            }
                            size="small"
                            sx={{
                              fontWeight: 600,
                            }}
                          />
                        ),
                      },

                      {
                        field: 'issueDate',
                        headerName:
                          'تاريخ الإصدار',
                        width: 140,
                      },
                    ]}
                    pageSizeOptions={[5]}
                    disableRowSelectionOnClick
                    localeText={arLocaleText}
                  />
                </Box>
              )}
          </>
        )}
      </Box>
    </Drawer>
  );
}

