import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { ar } from 'date-fns/locale';
import { keyframes } from '@mui/system';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ViewDayIcon from '@mui/icons-material/ViewDay';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import TodayIcon from '@mui/icons-material/Today';
import { electronAPI } from '../../utils/electron';
import DaySchedule from './components/DaySchedule';
import WeekSchedule from './components/WeekSchedule';
import CreateAdditionalSessionModal from './components/CreateAdditionalSessionModal';

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

const tabContentFade = keyframes`
  from {
    opacity: 0;
    transform: scale(0.99);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

// ─── API Function ─────────────────────────────────────────────
const fetchSessionsByDay = async (date) => {
  const response = await electronAPI.session.getByDay(date, { includeCancelled: false });

  if (!response.success) throw new Error(response.error);
  return response.data;
};

export default function Attendance() {
  const queryClient = useQueryClient();
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const dateStr = selectedDate.toISOString().split('T')[0];

  const { data: sessions, isLoading, refetch } = useQuery({
    queryKey: ['sessions', dateStr],
    queryFn: () => fetchSessionsByDay(dateStr),
    enabled: tabIndex === 0,
    staleTime: 1000 * 60,
  });

  const handleDateChange = (newDate) => {
    if (newDate) setSelectedDate(newDate);
  };

  const handleTabChange = (_, newIndex) => setTabIndex(newIndex);

  const onSessionUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
    refetch();
  };

  // Quick Date Shift Helpers
  const shiftDate = (days) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + days);
    setSelectedDate(next);
  };

  const setToday = () => setSelectedDate(new Date());

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ar}>
      <Box dir="rtl" sx={{ p: 1, animation: `${fadeInUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1)` }}>
        
        {/* ─── Header Section ─────────────────────────────────── */}
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
              إدارة الحضور
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              سجل حضور الطلاب، تتبع الجداول اليومية والأسبوعية، وأضف الحصص الإضافية
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
            حصة إضافية
          </Button>
        </Box>

        {/* ─── Controls & Navigation Bar ──────────────────────── */}
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            mb: 3,
            borderRadius: 3,
            border: '1px solid rgba(0, 0, 0, 0.08)',
            bgcolor: 'background.paper',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
          }}
        >
          {/* Pill Styled Tabs */}
          <Tabs
            value={tabIndex}
            onChange={handleTabChange}
            sx={{
              minHeight: 44,
              '& .MuiTabs-indicator': {
                height: '100%',
                borderRadius: 2,
                backgroundColor: 'primary.main',
                opacity: 0.12,
              },
              '& .MuiTab-root': {
                minHeight: 44,
                borderRadius: 2,
                fontWeight: 700,
                fontSize: '0.9rem',
                transition: 'all 0.2s ease',
                zIndex: 1,
                px: 2.5,
                '&.Mui-selected': {
                  color: 'primary.main',
                },
              },
            }}
          >
            <Tab icon={<ViewDayIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="حصص اليوم" />
            <Tab icon={<ViewWeekIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="الجدول الأسبوعي" />
          </Tabs>

          {/* Quick Date Control Bar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'action.hover', borderRadius: 2, p: 0.5 }}>
              <Tooltip title="اليوم السابق">
                <IconButton size="small" onClick={() => shiftDate(-1)}>
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="اليوم الحالي">
                <IconButton size="small" color="primary" onClick={setToday}>
                  <TodayIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="اليوم التالي">
                <IconButton size="small" onClick={() => shiftDate(1)}>
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <DatePicker
              label="اختر التاريخ"
              value={selectedDate}
              onChange={handleDateChange}
              slotProps={{
                textField: {
                  size: 'small',
                  sx: {
                    width: 170,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  },
                },
              }}
            />
          </Box>
        </Paper>

        {/* ─── Schedule Views Content ──────────────────────────── */}
        <Box
          key={`${tabIndex}-${dateStr}`}
          sx={{ animation: `${tabContentFade} 0.35s cubic-bezier(0.4, 0, 0.2, 1) both` }}
        >
          {tabIndex === 0 && (
            <DaySchedule
              date={dateStr}
              sessions={sessions}
              isLoading={isLoading}
              onUpdate={onSessionUpdate}
            />
          )}

          {tabIndex === 1 && (
            <WeekSchedule weekStart={dateStr} />
          )}
        </Box>

        {/* ─── Additional Session Modal ───────────────────────── */}
        <CreateAdditionalSessionModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={() => {
            setCreateModalOpen(false);
            onSessionUpdate();
          }}
        />
      </Box>
    </LocalizationProvider>
  );
}