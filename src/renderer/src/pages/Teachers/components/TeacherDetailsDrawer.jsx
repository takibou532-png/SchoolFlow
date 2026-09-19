
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

import { DataGrid } from '@mui/x-data-grid';

import { electronAPI } from '../../../utils/electron';

// ─────────────────────────────────────────────────────────────
// Arabic locale for DataGrid
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
// API Functions
// ─────────────────────────────────────────────────────────────

const fetchTeacherAttendance = async (teacherId) => {
  const now = new Date();

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  )
    .toISOString()
    .split('T')[0];

  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  )
    .toISOString()
    .split('T')[0];

  const response =
    await electronAPI.attendance.teacherGetByDateRange(
      teacherId,
      start,
      end
    );

  if (!response.success) {
    throw new Error(response.error);
  }

  return response.data;
};

const fetchRegularPayments = async (teacherId) => {
  const response =
    await electronAPI.payment.getTeacherHistory(
      teacherId,
      {
        includeInvoices: false,
      }
    );

  if (!response.success) {
    throw new Error(response.error);
  }

  return response.data;
};

const fetchCoursePayments = async (teacherId) => {
  const response =
    await electronAPI.coursePayment.getTeacherPayments(
      teacherId,
      {
        includeInvoices: false,
      }
    );

  if (!response.success) {
    throw new Error(response.error);
  }

  return response.data;
};

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export default function TeacherDetailsDrawer({
  open,
  onClose,
  teacher,
}) {
  const [tabIndex, setTabIndex] = useState(0);

  // ═══════════════════════════════════════════════════════════
  // IMPORTANT:
  // ALL HOOKS MUST BE ABOVE `if (!teacher) return null`
  // ═══════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────
  // Attendance
  // ─────────────────────────────────────────────────────────

  const attendanceQuery = useQuery({
    queryKey: ['teacher-attendance', teacher?.id],

    queryFn: () =>
      fetchTeacherAttendance(teacher.id),

    enabled: Boolean(teacher?.id && open),

    staleTime: 1000 * 60,
  });

  // ─────────────────────────────────────────────────────────
  // Regular Payments
  // ─────────────────────────────────────────────────────────

  const regularPaymentsQuery = useQuery({
    queryKey: [
      'teacher-regular-payments',
      teacher?.id,
    ],

    queryFn: () =>
      fetchRegularPayments(teacher.id),

    enabled: Boolean(teacher?.id && open),

    staleTime: 1000 * 60,
  });

  // ─────────────────────────────────────────────────────────
  // Course Payments
  // ─────────────────────────────────────────────────────────

  const coursePaymentsQuery = useQuery({
    queryKey: [
      'teacher-course-payments',
      teacher?.id,
    ],

    queryFn: () =>
      fetchCoursePayments(teacher.id),

    enabled: Boolean(teacher?.id && open),

    staleTime: 1000 * 60,
  });

  // ─────────────────────────────────────────────────────────
  // Teacher Avatar
  //
  // FIX:
  // This query used to be BELOW `if (!teacher) return null`.
  // It is now BEFORE it.
  // ─────────────────────────────────────────────────────────

  const {
    data: avatarDataUrl,
    isLoading: avatarLoading,
  } = useQuery({
    queryKey: [
      'teacher-avatar',
      teacher?.id,
    ],

    queryFn: async () => {
      const res =
        await electronAPI.teacher.getAvatar(
          teacher.id
        );

      return res.success
        ? res.dataUrl
        : null;
    },

    enabled: Boolean(teacher?.id && open),

    staleTime: 1000 * 60 * 5,
  });

  // ─────────────────────────────────────────────────────────
  // IMPORTANT:
  // Safe now because every hook has already executed.
  // ─────────────────────────────────────────────────────────

  if (!teacher) {
    return null;
  }

  // ─────────────────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────────────────

  const isLoading =
    attendanceQuery.isLoading ||
    regularPaymentsQuery.isLoading ||
    coursePaymentsQuery.isLoading;

  // ─────────────────────────────────────────────────────────
  // ONLY MARKED ATTENDANCES
  // ─────────────────────────────────────────────────────────

  const attendanceRows = (
    attendanceQuery.data?.sessions || []
  )
    .filter(
      (item) =>
        item.attendance !== null
    )
    .map((item) => ({
      id: item.session.session.id,

      date:
        item.session.session.date,

      startTime:
        item.session.session.startTime,

      endTime:
        item.session.session.endTime,

      moduleName:
        item.session.module.name,

      sessionStatus:
        item.session.session.status,

      attendanceStatus:
        item.attendance.status,

      attendance:
        item.attendance,

      sessionPrice:
        item.session.session.sessionPrice,

      isAdditional:
        item.session.session.isAdditional,
    }));

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────

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
            backgroundColor:
              'rgba(120,120,120,0.35)',

            borderRadius: 10,
          },
        }}
      >
        {/* ═════════════════════════════════════════════════════
            HEADER
        ═════════════════════════════════════════════════════ */}

        <Box
          sx={{
            mb: 3,

            animation:
              'teacherHeaderEnter 0.45s cubic-bezier(.22,1,.36,1)',

            '@keyframes teacherHeaderEnter': {
              from: {
                opacity: 0,
                transform:
                  'translateY(-10px)',
              },

              to: {
                opacity: 1,
                transform:
                  'translateY(0)',
              },
            },
          }}
        >
          <Typography
            variant="h5"
            fontWeight={800}
            gutterBottom
          >
            {teacher.firstName}{' '}
            {teacher.lastName}
          </Typography>

          <Box
            sx={{
              display: 'flex',
              gap: 1,
              mb: 2,
              flexWrap: 'wrap',
            }}
          >
            <Chip
              label={
                teacher.isActive
                  ? 'نشط'
                  : 'مؤرشف'
              }
              color={
                teacher.isActive
                  ? 'success'
                  : 'default'
              }
              sx={{
                fontWeight: 700,
              }}
            />

            <Chip
              label={`نسبة الدفع ${teacher.paymentPercentage}%`}
              variant="outlined"
              sx={{
                fontWeight: 600,
              }}
            />
          </Box>
        </Box>

        {/* ═════════════════════════════════════════════════════
            TABS
        ═════════════════════════════════════════════════════ */}

        <Tabs
          value={tabIndex}
          onChange={(_, value) =>
            setTabIndex(value)
          }
          variant="scrollable"
          scrollButtons="auto"
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
     
          <Tab label="المدفوعات العادية" />
          <Tab label="مدفوعات الدورات" />
        </Tabs>

        {/* ═════════════════════════════════════════════════════
            LOADING
        ═════════════════════════════════════════════════════ */}

        {isLoading ? (
          <Box
            sx={{
              minHeight: 300,

              display: 'flex',

              flexDirection: 'column',

              alignItems: 'center',

              justifyContent: 'center',

              gap: 2,

              animation:
                'fadeIn 0.3s ease',

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
              جاري تحميل معلومات الأستاذ...
            </Typography>
          </Box>
        ) : (
          <>
            {/* ══════════════════════════════════════════════════
                TAB 0 — INFO
            ══════════════════════════════════════════════════ */}

            {tabIndex === 0 && (
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

                      alignItems:
                        'center',

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

                        bgcolor:
                          'primary.main',

                        fontSize:
                          '2.5rem',

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
                        `${
                          teacher.firstName?.[0] ||
                          ''
                        }${
                          teacher.lastName?.[0] ||
                          ''
                        }`}
                    </Avatar>

                    <Box>
                      <Typography
                        variant="h5"
                        fontWeight={700}
                      >
                        {teacher.firstName}{' '}
                        {teacher.lastName}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 0.5,
                        }}
                      >
                        {teacher.isActive
                          ? 'نشط'
                          : 'موقوف'}
                      </Typography>

                      <Chip
                        label={`نسبة الدفع: ${
                          teacher.paymentPercentage
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

                {/* Information */}

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
                      sx={{
                        mb: 2,
                      }}
                    >
                      المعلومات الشخصية
                    </Typography>

                    <Box
                      sx={{
                        display: 'grid',

                        gridTemplateColumns:
                          {
                            xs: '1fr',
                            sm: '1fr 1fr',
                          },

                        gap: 2,
                      }}
                    >
                      <Typography variant="body2">
                        <strong>
                          الهاتف:
                        </strong>{' '}
                        {teacher.phone ||
                          '-'}
                      </Typography>

                      <Typography variant="body2">
                        <strong>
                          البريد الإلكتروني:
                        </strong>{' '}
                        {teacher.email ||
                          '-'}
                      </Typography>

                     

                      <Typography variant="body2">
                        <strong>
                          نسبة الدفع:
                        </strong>{' '}
                        {teacher.paymentPercentage ??
                          0}
                        %
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )}

            {/* ══════════════════════════════════════════════════
                TAB 1 — ATTENDANCE
            ══════════════════════════════════════════════════ */}

       

            {tabIndex === 1 && (
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
                {regularPaymentsQuery.isError && (
                  <Alert
                    severity="error"
                    sx={{
                      mb: 2,
                      borderRadius: 2,
                    }}
                  >
                    {
                      regularPaymentsQuery
                        .error?.message
                    }
                  </Alert>
                )}

                {regularPaymentsQuery.data
                  ?.payments?.length >
                0 ? (
                  <Box
                    sx={{
                      height: 400,
                      width: '100%',
                    }}
                  >
                    <DataGrid
                      rows={
                        regularPaymentsQuery
                          .data.payments
                      }
                      columns={[
                        {
                          field: 'id',
                          headerName:
                            'رقم الدفعة',
                          width: 100,
                        },

                        {
                          field: 'amount',
                          headerName:
                            'المبلغ',
                          width: 120,

                          renderCell: (
                            params
                          ) =>
                            `${
                              params.value ??
                              0
                            } دج`,
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
                                params.value
                              }
                              color={
                                params.value ===
                                'paid'
                                  ? 'success'
                                  : 'warning'
                              }
                              size="small"
                              sx={{
                                fontWeight:
                                  600,
                              }}
                            />
                          ),
                        },

                        {
                          field:
                            'createdAt',
                          headerName:
                            'تاريخ الإنشاء',
                          width: 150,
                        },
                      ]}
                      pageSizeOptions={[
                        5,
                        10,
                      ]}
                      disableRowSelectionOnClick
                      localeText={
                        arLocaleText
                      }
                    />
                  </Box>
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    لا توجد مدفوعات عادية.
                  </Typography>
                )}
              </Box>
            )}

            {/* ══════════════════════════════════════════════════
                TAB 3 — COURSE PAYMENTS
            ══════════════════════════════════════════════════ */}

            {tabIndex === 2 && (
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
                {coursePaymentsQuery.isError && (
                  <Alert
                    severity="error"
                    sx={{
                      mb: 2,
                      borderRadius: 2,
                    }}
                  >
                    {
                      coursePaymentsQuery
                        .error?.message
                    }
                  </Alert>
                )}

                {coursePaymentsQuery.data
                  ?.payments?.length >
                0 ? (
                  <Box
                    sx={{
                      height: 400,
                      width: '100%',
                    }}
                  >
                    <DataGrid
                      rows={
                        coursePaymentsQuery
                          .data.payments
                      }
                      columns={[
                        {
                          field: 'id',
                          headerName:
                            'رقم الدفعة',
                          width: 100,
                        },

                        {
                          field: 'amount',
                          headerName:
                            'المبلغ',
                          width: 120,

                          renderCell: (
                            params
                          ) =>
                            `${
                              params.value ??
                              0
                            } دج`,
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
                                params.value
                              }
                              color={
                                params.value ===
                                'paid'
                                  ? 'success'
                                  : 'warning'
                              }
                              size="small"
                              sx={{
                                fontWeight:
                                  600,
                              }}
                            />
                          ),
                        },

                        {
                          field:
                            'createdAt',
                          headerName:
                            'تاريخ الإنشاء',
                          width: 150,
                        },
                      ]}
                      pageSizeOptions={[
                        5,
                        10,
                      ]}
                      disableRowSelectionOnClick
                      localeText={
                        arLocaleText
                      }
                    />
                  </Box>
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    لا توجد مدفوعات دورات.
                  </Typography>
                )}
              </Box>
            )}
          </>
        )}
      </Box>
    </Drawer>
  );
}

