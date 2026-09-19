import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { DataGrid } from '@mui/x-data-grid';
import { electronAPI } from '../../../utils/electron';
import EnrollStudentModal from './EnrollStudentModal';
import CourseAttendanceSheetModal from './CourseAttendanceSheetModal';
import InvoicePrintModal from '../../Financials/components/InvoicePrintModal';
import PaymentMarkModal from '../../Financials/components/PaymentMarkmodal';
import TeacherCoursePaymentPrintModal from './TeacherCoursePaymentPrintModal';

// ─── Fetch course details ──────────────────────────
const fetchCourseDetails = async (courseId) => {
  const [courseRes, enrollmentsRes, invoicesRes, paymentsRes] = await Promise.all([
    electronAPI.course.getWithSessions(courseId),
    electronAPI.courseEnrollment.getCourseEnrollments(courseId),
    electronAPI.courseEnrollment.getCourseInvoices(courseId),
    electronAPI.coursePayment.getPaymentsByCourse(courseId),
  ]);
   console.log("get with sessions ",courseRes);
  if (!courseRes.success) throw new Error(courseRes.error);
  if (!enrollmentsRes.success) throw new Error(enrollmentsRes.error);
  if (!invoicesRes.success) throw new Error(invoicesRes.error);
  if (!paymentsRes.success) throw new Error(paymentsRes.error);

  return {
    course: courseRes.data,
    enrollments: enrollmentsRes.data,
    invoices: invoicesRes.data,
    payments: paymentsRes.data,
  };
};

export default function CourseDetailsDrawer({ open, onClose, course, onUpdate }) {
  const queryClient = useQueryClient();
  const [tabIndex, setTabIndex] = useState(0);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentMarkOpen, setPaymentMarkOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [teacherPaymentPrintOpen, setTeacherPaymentPrintOpen] = useState(false);
  const [selectedTeacherPayment, setSelectedTeacherPayment] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['course-details', course?.id],
    queryFn: () => fetchCourseDetails(course.id),
    enabled: !!course?.id && open,
    staleTime: 0,
  });

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['course-details', course?.id] });
    refetch();
    onUpdate?.();
  };

  // ─── Mutations ──────────────────────────────────────
  const markInvoicePaidMutation = useMutation({
    mutationFn: ({ invoiceId, paidAt }) => electronAPI.courseEnrollment.markInvoicePaid(invoiceId, paidAt),
    onSuccess: () => refreshData(),
  });

  const markPaymentPaidMutation = useMutation({
    mutationFn: ({ paymentId, amountToPay, paidAt }) => electronAPI.coursePayment.markAsPaid(paymentId, amountToPay, paidAt),
    onSuccess: () => refreshData(),
  });

  if (!course) return null;

  const handleEnroll = () => setEnrollModalOpen(true);
  const handleMarkAttendance = (session) => {
    setSelectedSession(session);
    setAttendanceModalOpen(true);
  };
  const handlePrintInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setPrintModalOpen(true);
  };
  const handleMarkInvoicePaid = (invoice) => {
    markInvoicePaidMutation.mutate({ invoiceId: invoice.id, paidAt: null });
  };
  const handleMarkPaymentPaid = (payment, amountToPay, paidAt) => {
    markPaymentPaidMutation.mutate({ paymentId: payment.id, amountToPay, paidAt });
  };
  const handlePrintTeacherPayment = (payment) => {
    setSelectedTeacherPayment(payment);
    setTeacherPaymentPrintOpen(true);
  };

  const renderTabContent = () => {
    if (isLoading) return <CircularProgress />;
    if (error) return <Alert severity="error">{error.message}</Alert>;
    if (!data) return null;

    const { course, enrollments, invoices, payments } = data;
    const sessions = course.sessions || [];

    switch (tabIndex) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>معلومات الدورة</Typography>
            <Typography variant="body2"><strong>الاسم:</strong> {course.name}</Typography>
            <Typography variant="body2"><strong>المادة:</strong> {course.subjectName}</Typography>
            <Typography variant="body2"><strong>المستوى:</strong> {course.level || 'غير محدد'}</Typography>
           <Typography variant="body2">
  <strong>الأستاذ:</strong> {course.teacherName || (course.teacherId ? `الأستاذ رقم ${course.teacherId}` : 'غير محدد')}
</Typography>
            <Typography variant="body2"><strong>السعر الإجمالي:</strong> {course.totalPrice} د.ج</Typography>
            <Typography variant="body2"><strong>سعر الحصة:</strong> {course.sessionPrice} د.ج</Typography>
            <Typography variant="body2"><strong>الفترة الزمنية:</strong> من {course.startDate} إلى {course.endDate}</Typography>
            <Typography variant="body2"><strong>أقصى عدد للطلاب:</strong> {course.maxStudents || 'غير محدود'}</Typography>
            <Typography variant="body2"><strong>المسجلون:</strong> {enrollments?.length || 0}</Typography>
            <Typography variant="body2"><strong>عدد الحصص:</strong> {sessions?.length || 0}</Typography>

            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>الحصص / الجلسات</Typography>
              <Box sx={{ height: 300 }}>
                <DataGrid
                  rows={sessions}
                  getRowId={(row) => row.id || row.sessionIndex}
                  columns={[
                    { field: 'sessionIndex', headerName: 'الرقم', width: 80 },
                    { field: 'date', headerName: 'التاريخ', width: 120 },
                    { field: 'startTime', headerName: 'البدء', width: 100 },
                    { field: 'endTime', headerName: 'الانتهاء', width: 100 },
                    {
                      field: 'status',
                      headerName: 'الحالة',
                      width: 120,
                      renderCell: (params) => (
                        <Chip
                          label={params.value === 'scheduled' ? 'مبرمجة' : 'ملغاة'}
                          color={params.value === 'scheduled' ? 'success' : 'error'}
                          size="small"
                        />
                      ),
                    },
                  ]}
                  pageSizeOptions={[5]}
                  disableRowSelectionOnClick
                />
              </Box>
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>الطلاب المسجلون</Typography>
              <Box sx={{ height: 300 }}>
                <DataGrid
                  rows={enrollments}
                  getRowId={(row) => row.id || row.studentId || `${row.firstName}-${row.lastName}`}
                  columns={[
                    {
                      field: 'firstName',
                      headerName: 'الاسم الأول',
                      width: 150,
                      valueGetter: (value, row) => row.firstName || row.student?.firstName || ''
                    },
                    {
                      field: 'lastName',
                      headerName: 'اللقب',
                      width: 150,
                      valueGetter: (value, row) => row.lastName || row.student?.lastName || ''
                    },
                    { field: 'enrolledAt', headerName: 'تاريخ التسجيل', width: 150 },
                    { field: 'price', headerName: 'السعر', width: 120, renderCell: (params) => `${params.value} د.ج` },
                    {
                      field: 'isActive',
                      headerName: 'الحالة',
                      width: 100,
                      renderCell: (params) => (
                        <Chip
                          label={params.value ? 'نشط' : 'معلق'}
                          color={params.value ? 'success' : 'default'}
                          size="small"
                        />
                      ),
                    },
                  ]}
                  pageSizeOptions={[5]}
                  disableRowSelectionOnClick
                />
              </Box>
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>متابعة الحضور والغياب</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {sessions.length > 0 ? (
                sessions.map((sess) => (
                  <Box
                    key={sess.id || sess.sessionIndex}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 2,
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      backgroundColor: '#fafafa',
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2">الحصة #{sess.sessionIndex}</Typography>
                      <Typography variant="body2" color="textSecondary">{sess.date} • {sess.startTime} – {sess.endTime}</Typography>
                      <Chip
                        label={sess.status === 'scheduled' ? 'مبرمجة' : 'ملغاة'}
                        size="small"
                        color={sess.status === 'scheduled' ? 'success' : 'error'}
                      />
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleMarkAttendance(sess)}
                      disabled={sess.status === 'cancelled'}
                    >
                      تسجيل الحضور
                    </Button>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>لا توجد حصص مسجلة.</Typography>
              )}
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ height: 400 }}>
            <DataGrid
              rows={invoices}
              getRowId={(row) => row.invoice?.id || row.id}
              columns={[
                {
                  field: 'id',
                  headerName: 'رقم الفاتورة',
                  width: 110,
                  valueGetter: (value, row) => row.invoice?.id || row.id
                },
                {
                  field: 'studentName',
                  headerName: 'الطالب',
                  width: 150,
                  valueGetter: (value, row) => {
                    const student = row.student;
                    return student ? `${student.firstName} ${student.lastName}` : 'غير معروف';
                  }
                },
                {
                  field: 'amount',
                  headerName: 'المبلغ',
                  width: 120,
                  valueGetter: (value, row) => row.invoice?.amount ?? row.amount,
                  renderCell: (params) => `${params.value} د.ج`
                },
                {
                  field: 'status',
                  headerName: 'الحالة',
                  width: 120,
                  valueGetter: (value, row) => row.invoice?.status || row.status,
                  renderCell: (params) => (
                    <Chip
                      label={params.value === 'paid' ? 'مدفوعة' : 'معلقة'}
                      color={params.value === 'paid' ? 'success' : 'warning'}
                      size="small"
                    />
                  )
                },
                {
                  field: 'issueDate',
                  headerName: 'تاريخ الإصدار',
                  width: 120,
                  valueGetter: (value, row) => {
                    const date = row.invoice?.issueDate || row.issueDate;
                    return date ? date.split('T')[0] : '';
                  }
                },
                {
                  field: 'actions',
                  headerName: 'الإجراءات',
                  width: 150,
                  renderCell: (params) => {
                    const inv = params.row.invoice || params.row;
                    return (
                      <Box>
                        {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                          <Tooltip title="تعليم كمدفوع">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleMarkInvoicePaid(inv)}
                              disabled={markInvoicePaidMutation.isPending}
                            >
                              💰
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="طباعة">
                          <IconButton size="small" onClick={() => handlePrintInvoice(inv)}>🖨️</IconButton>
                        </Tooltip>
                      </Box>
                    );
                  }
                }
              ]}
              pageSizeOptions={[5]}
              disableRowSelectionOnClick
            />
          </Box>
        );

      case 3:
        return (
          <Box sx={{ height: 400 }}>
            <DataGrid
              rows={payments}
              getRowId={(row) => row.id}
              columns={[
                { field: 'id', headerName: 'رقم الدفعة', width: 100 },
                { field: 'amount', headerName: 'المبلغ', width: 120, renderCell: (params) => `${params.value} د.ج` },
                {
                  field: 'status',
                  headerName: 'الحالة',
                  width: 120,
                  renderCell: (params) => (
                    <Chip
                      label={params.value === 'paid' ? 'مكتملة' : 'قيد الانتظار'}
                      color={params.value === 'paid' ? 'success' : 'warning'}
                      size="small"
                    />
                  )
                },
                { field: 'createdAt', headerName: 'تاريخ الإنشاء', width: 150 },
                {
                  field: 'actions',
                  headerName: 'الإجراءات',
                  width: 140,
                  renderCell: (params) => (
                    <Box>
                      {params.row.status === 'pending' && (
                        <Tooltip title="تعليم كمدفوع">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => { setSelectedPayment(params.row); setPaymentMarkOpen(true); }}
                          >
                            💰
                          </IconButton>
                        </Tooltip>
                      )}
                      {params.row.status === 'paid' && (
                        <Tooltip title="طباعة">
                          <IconButton size="small" onClick={() => handlePrintTeacherPayment(params.row)}>🖨️</IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  )
                }
              ]}
              pageSizeOptions={[5]}
              disableRowSelectionOnClick
            />
          </Box>
        );

      default: return null;
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 600, md: 700 } } }}>
      <Box sx={{ p: 3 }} dir="rtl">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">{course.name}</Typography>
          <Button variant="outlined" size="small" onClick={handleEnroll}>تسجيل طالب</Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip label={course.isActive ? 'نشط' : 'مؤرشف'} color={course.isActive ? 'success' : 'default'} />
          <Chip label={`${data?.course?.sessions?.length || 0} حصة`} variant="outlined" />
          <Chip label={`${data?.enrollments?.length || 0} طالب`} variant="outlined" />
        </Box>

        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 2 }}>
          <Tab label="نظرة عامة" />
          <Tab label="الحضور والغياب" />
          <Tab label="الفواتير" />
          <Tab label="المدفوعات" />
        </Tabs>

        {renderTabContent()}
      </Box>

      <EnrollStudentModal open={enrollModalOpen} onClose={() => setEnrollModalOpen(false)} course={course} onSuccess={refreshData} />
      <CourseAttendanceSheetModal open={attendanceModalOpen} onClose={() => { setAttendanceModalOpen(false); setSelectedSession(null); }} session={selectedSession} onSuccess={refreshData} />
      <InvoicePrintModal open={printModalOpen} onClose={() => { setPrintModalOpen(false); setSelectedInvoice(null); }} invoice={selectedInvoice} />
      <PaymentMarkModal open={paymentMarkOpen} onClose={() => { setPaymentMarkOpen(false); setSelectedPayment(null); }} payment={selectedPayment} onConfirm={(amount, paidAt) => handleMarkPaymentPaid(selectedPayment, amount, paidAt)} loading={markPaymentPaidMutation.isPending} />
      <TeacherCoursePaymentPrintModal
        open={teacherPaymentPrintOpen}
        onClose={() => { setTeacherPaymentPrintOpen(false); setSelectedTeacherPayment(null); }}
        payment={selectedTeacherPayment}
        course={data?.course}
      />
    </Drawer>
  );
}