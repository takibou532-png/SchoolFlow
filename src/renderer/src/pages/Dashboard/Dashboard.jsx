import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { keyframes } from '@mui/system';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import PeopleIcon from '@mui/icons-material/People';
import BookIcon from '@mui/icons-material/Book';
import ClassIcon from '@mui/icons-material/Class';
import SchoolIcon from '@mui/icons-material/School';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { electronAPI } from '../../utils/electron';

// ─── Keyframe Animations ──────────────────────────────────────
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
  100% { transform: translateY(0px); }
`;

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.2); }
  70% { box-shadow: 0 0 0 10px rgba(25, 118, 210, 0); }
  100% { box-shadow: 0 0 0 0 rgba(25, 118, 210, 0); }
`;

// ─── API Function ─────────────────────────────────────────────
const fetchDashboardStats = async (period) => {
  const response = await electronAPI.school.getDashboardStats({ period });
  console.log("stats: ",response);
  if (!response.success) {
    throw new Error(response.error);
  }
  return response.data;
};

// ─── Stat Card Component ──────────────────────────────────────
function StatCard({ title, value, icon, color, subtitle, delay = 0 }) {
  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: 3,
        border: '1px solid rgba(0, 0, 0, 0.06)',
        boxShadow: '0 4px 20px 0 rgba(0,0,0,0.03)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        animation: `${fadeInUp} 0.5s ease-out ${delay}s both`,
        '&:hover': {
          transform: 'translateY(-6px)',
          boxShadow: `0 12px 28px -4px ${color}25`,
          borderColor: `${color}40`,
          '& .icon-box': {
            transform: 'scale(1.1) rotate(-4deg)',
            backgroundColor: color,
            color: '#fff',
          },
        },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="text.secondary" variant="body2" fontWeight={500} gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" fontWeight={700} sx={{ letterSpacing: -0.5, my: 0.5 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            className="icon-box"
            sx={{
              p: 1.5,
              borderRadius: 2.5,
              backgroundColor: `${color}15`,
              color: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard Component ────────────────────────────────
export default function Dashboard() {
  const [period, setPeriod] = useState('current_month');

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardStats', period],
    queryFn: () => fetchDashboardStats(period),
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
          gap: 2,
        }}
      >
        <CircularProgress size={50} thickness={4} sx={{ animationDuration: '1s' }} />
        <Typography variant="body2" color="text.secondary" sx={{ animation: `${float} 2s ease-in-out infinite` }}>
          جاري تحميل بيانات لوحة التحكم...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2, borderRadius: 2, animation: `${fadeInUp} 0.4s ease-out` }}>
        فشل في تحميل بيانات لوحة التحكم: {error.message}
      </Alert>
    );
  }

  if (!data) return null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const { students, modules, courses, teachers, invoices, teacherPayments, revenue } = data;

  return (
    <Box dir="rtl" sx={{ p: 1, animation: `${fadeInUp} 0.4s ease-out` }}>
      {/* ─── Header ─────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          mb: 4,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" fontWeight={800} sx={{ letterSpacing: -0.5 }}>
            لوحة التحكم
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            متابعة شاملة للأداء المالي والأكاديمي للمؤسسة
          </Typography>
        </Box>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="period-select-label">الفترة الزمنية</InputLabel>
          <Select
            labelId="period-select-label"
            value={period}
            label="الفترة الزمنية"
            onChange={(e) => setPeriod(e.target.value)}
            sx={{
              borderRadius: 2.5,
              bgcolor: 'background.paper',
              '& .MuiOutlinedInput-notchedOutline': { transition: 'border-color 0.2s' },
            }}
          >
            <MenuItem value="current_month">الشهر الحالي</MenuItem>
            <MenuItem value="last_3_months">آخر 3 أشهر</MenuItem>
            <MenuItem value="last_6_months">آخر 6 أشهر</MenuItem>
            <MenuItem value="last_year">السنة الماضية</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* ─── Summary Cards ──────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            delay={0.05}
            title="إجمالي الطلاب"
            value={students.total}
            icon={<PeopleIcon fontSize="medium" />}
            color="#1976d2"
            subtitle={`${students.active} نشط • ${students.inactive} غير نشط`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            delay={0.1}
            title="المواد التعليمية"
            value={modules.active}
            icon={<BookIcon fontSize="medium" />}
            color="#2e7d32"
            subtitle={`${modules.total} الإجمالي • ${modules.archived} مؤرشف`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            delay={0.15}
            title="الدورات التدريبية"
            value={courses.active}
            icon={<ClassIcon fontSize="medium" />}
            color="#ed6c02"
            subtitle={`${courses.total} الإجمالي • ${courses.archived} مؤرشف`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            delay={0.2}
            title="الأساتذة"
            value={teachers.active}
            icon={<SchoolIcon fontSize="medium" />}
            color="#9c27b0"
            subtitle={`${teachers.total} الإجمالي • ${teachers.inactive} غير نشط`}
          />
        </Grid>
      </Grid>

      {/* ─── Financial Cards ────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Revenue Summary */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: '100%',
              borderRadius: 3,
              border: '1px solid rgba(0, 0, 0, 0.06)',
              boxShadow: '0 4px 20px 0 rgba(0,0,0,0.03)',
              animation: `${fadeInUp} 0.5s ease-out 0.25s both`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>
                  ملخص الإيرادات
                </Typography>
                <Chip label={data.period.label} size="small" color="primary" variant="soft" sx={{ borderRadius: 2 }} />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">إجمالي الإيرادات</Typography>
                  <Typography variant="body1" fontWeight={700}>{formatCurrency(revenue.grossRevenue)}</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">إجمالي المصاريف</Typography>
                  <Typography variant="body1" fontWeight={700} color="error.main">
                    {formatCurrency(revenue.totalExpenses)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <Typography variant="body2" color="text.secondary">مدفوعات الموظفين</Typography>
  <Typography variant="body1" fontWeight={700} color="error.main">
    {formatCurrency(revenue.totalEmployeePayments || 0)}
  </Typography>
</Box>

                <Divider sx={{ borderStyle: 'dashed' }} />

                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: revenue.netRevenue >= 0 ? 'rgba(76, 175, 80, 0.08)' : 'rgba(244, 67, 54, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      صافي الإيرادات ({revenue.netRevenuePercentage.toFixed(1)}%)
                    </Typography>
                    <Typography
                      variant="h5"
                      fontWeight={800}
                      color={revenue.netRevenue >= 0 ? 'success.main' : 'error.main'}
                    >
                      {formatCurrency(revenue.netRevenue)}
                    </Typography>
                  </Box>
                  {revenue.netRevenue >= 0 ? (
                    <TrendingUpIcon color="success" sx={{ fontSize: 36 }} />
                  ) : (
                    <TrendingDownIcon color="error" sx={{ fontSize: 36 }} />
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                  <Chip
                    label={`حصة الأساتذة: ${formatCurrency(revenue.teacherShare)}`}
                    size="small"
                    variant="outlined"
                    sx={{ borderRadius: 1.5 }}
                  />
                  <Chip
                    label={`مبلغ الفواتير: ${formatCurrency(revenue.totalInvoiceAmount)}`}
                    size="small"
                    variant="outlined"
                    sx={{ borderRadius: 1.5 }}
                  />
                  <Chip
  label={`مدفوعات الموظفين: ${formatCurrency(revenue.totalEmployeePayments || 0)}`}
  size="small"
  variant="outlined"
  sx={{ borderRadius: 1.5 }}
/>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Invoice Status */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: '100%',
              borderRadius: 3,
              border: '1px solid rgba(0, 0, 0, 0.06)',
              boxShadow: '0 4px 20px 0 rgba(0,0,0,0.03)',
              animation: `${fadeInUp} 0.5s ease-out 0.3s both`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={700}>
                  حالة الفواتير
                </Typography>
                <Chip label={data.period.label} size="small" color="primary" variant="soft" sx={{ borderRadius: 2 }} />
              </Box>

              <Grid container spacing={2}>
                {[
                  { label: 'مدفوعة', count: invoices.paidCount, amount: invoices.paidAmount, color: '#4caf50' },
                  { label: 'قيد الانتظار', count: invoices.pendingCount, amount: invoices.pendingAmount, color: '#ff9800' },
                  { label: 'متأخرة', count: invoices.overdueCount, amount: invoices.overdueAmount, color: '#f44336' },
                  { label: 'ملغاة', count: invoices.cancelledCount, amount: null, color: '#9e9e9e' },
                ].map((item, idx) => (
                  <Grid item xs={12} sm={6} key={idx}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2.5,
                        border: '1px solid rgba(0, 0, 0, 0.06)',
                        bgcolor: 'background.paper',
                        transition: 'transform 0.2s',
                        '&:hover': { transform: 'translateY(-2px)' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <Box sx={{ width: 10, height: 10, bgcolor: item.color, borderRadius: '50%' }} />
                        <Typography variant="body2" fontWeight={600}>
                          {item.label} ({item.count})
                        </Typography>
                      </Box>
                      {item.amount !== null && (
                        <Typography variant="subtitle1" fontWeight={700} sx={{ pl: 2.5 }}>
                          {formatCurrency(item.amount)}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ─── Teacher Payments ────────────────────────── */}
      <Card
        sx={{
          mb: 4,
          borderRadius: 3,
          border: '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: '0 4px 20px 0 rgba(0,0,0,0.03)',
          animation: `${fadeInUp} 0.5s ease-out 0.35s both`,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
            مدفوعات الأساتذة ({data.period.label})
          </Typography>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm={4} md={3}>
              <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: 'rgba(255, 152, 0, 0.08)' }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>قيد الانتظار</Typography>
                <Typography variant="h6" fontWeight={700} color="warning.dark">
                  {formatCurrency(teacherPayments.combined.pendingAmount)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {teacherPayments.combined.pendingCount} عمليات دفع
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={4} md={3}>
              <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: 'rgba(76, 175, 80, 0.08)' }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>مدفوعة</Typography>
                <Typography variant="h6" fontWeight={700} color="success.dark">
                  {formatCurrency(teacherPayments.combined.paidAmount)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {teacherPayments.combined.paidCount} عمليات دفع
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={4} md={3}>
              <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: 'rgba(25, 118, 210, 0.08)' }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>الإجمالي</Typography>
                <Typography variant="h6" fontWeight={700} color="primary.dark">
                  {formatCurrency(teacherPayments.combined.totalAmount)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {teacherPayments.combined.totalCount} عمليات دفع
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Chip
                  label={`العادية: ${formatCurrency(teacherPayments.regular.pendingAmount)} معلقة`}
                  color="info"
                  variant="outlined"
                  sx={{ borderRadius: 2, justifyContent: 'flex-start' }}
                />
                <Chip
                  label={`الدورات: ${formatCurrency(teacherPayments.course.pendingAmount)} معلقة`}
                  color="warning"
                  variant="outlined"
                  sx={{ borderRadius: 2, justifyContent: 'flex-start' }}
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ─── Top Students ────────────────────────────── */}
      {data.topStudents && data.topStudents.length > 0 && (
        <Card
          sx={{
            mb: 2,
            borderRadius: 3,
            border: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: '0 4px 20px 0 rgba(0,0,0,0.03)',
            animation: `${fadeInUp} 0.5s ease-out 0.4s both`,
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <EmojiEventsIcon sx={{ color: '#ffc107' }} />
              <Typography variant="h6" fontWeight={700}>
                أعلى الطلاب من حيث الإيرادات
              </Typography>
            </Box>

            <Grid container spacing={2}>
              {data.topStudents.map((student, index) => (
                <Grid item xs={12} sm={6} md={2.4} key={student.id}>
                  <Box
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      borderRadius: 2.5,
                      border: '1px solid rgba(0,0,0,0.06)',
                      bgcolor: 'background.paper',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                        borderColor: 'primary.main',
                      },
                    }}
                  >
                    <Avatar
                      sx={{
                        mx: 'auto',
                        mb: 1,
                        bgcolor: index === 0 ? '#ffc107' : index === 1 ? '#b0bec5' : index === 2 ? '#cd7f32' : 'primary.main',
                        fontWeight: 700,
                        width: 42,
                        height: 42,
                        boxShadow: index === 0 ? '0 0 12px rgba(255,193,7,0.5)' : 'none',
                      }}
                    >
                      {index + 1}
                    </Avatar>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {student.firstName} {student.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {formatCurrency(student.totalAmount)}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}