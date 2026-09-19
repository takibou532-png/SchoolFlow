import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import BookIcon from '@mui/icons-material/Book';
import ClassIcon from '@mui/icons-material/Class';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ReceiptIcon from '@mui/icons-material/Receipt';
import SchoolIcon from '@mui/icons-material/School';
import SubjectIcon from '@mui/icons-material/Subject';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SettingsIcon from '@mui/icons-material/Settings';
import { electronAPI, isElectronAvailable } from '../../utils/electron';
import { useSchoolStore } from '../../store/SchoolStore';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionIcon from '@mui/icons-material/Description';

const drawerWidth = 240;

// ─── Arabic menu labels ──────────────────────────────
const menuItems = [
  { text: 'لوحة التحكم', icon: <DashboardIcon />, path: '/' },
  { text: 'المصروفات', icon: <AccountBalanceIcon />, path: '/expenses' },
  { text: 'الموظفون', icon: <PersonIcon />, path: '/employees' },
  { text: 'الطلاب', icon: <PeopleIcon />, path: '/students' },
  { text: 'الوحدات', icon: <BookIcon />, path: '/modules' },
  { text: 'الدورات', icon: <ClassIcon />, path: '/courses' },
  { text: 'الحضور', icon: <CalendarTodayIcon />, path: '/attendance' },
  { text: 'الماليات', icon: <ReceiptIcon />, path: '/financials' },
  { text: 'المعلمون', icon: <SchoolIcon />, path: '/teachers' },
  { text: 'المواد والقاعات', icon: <SubjectIcon />, path: '/subjects-classrooms' },
  { text: 'طلبات التوظيف', icon: <DescriptionIcon />, path: '/job-applications' },
  { text: 'الإعدادات', icon: <SettingsIcon />, path: '/settings' },
  
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { school } = useSchoolStore();
  const [logoPreview, setLogoPreview] = useState(null);

  // ─── Resolve saved logo to a displayable data URL ──
  useEffect(() => {
    if (!school?.logoPath) {
      setLogoPreview(null);
      return;
    }
    if (isElectronAvailable()) {
      electronAPI.school.getLogo(school.logoPath).then((res) => {
        if (res.success) setLogoPreview(res.dataUrl);
      });
    } else {
      setLogoPreview(school.logoPath);
    }
  }, [school?.logoPath]);

  return (
    <Drawer
      variant="permanent"
      anchor="right"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: '#1a1a2e',
          color: 'white',
          borderRight: 'none',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
        },
      }}
    >
      {/* ─── School Brand ────────────────────────── */}
      <Toolbar sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
          <Avatar
            src={logoPreview || ''}
            alt={school?.name || 'المدرسة'}
            sx={{
              width: 44,
              height: 44,
              bgcolor: '#1976d2',
              fontWeight: 700,
              '& img': { objectFit: 'contain' },
            }}
          >
            {!logoPreview && (school?.name?.charAt(0) || 'م')}
          </Avatar>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: 'white',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '0.95rem',
            }}
          >
            {school?.name || 'إدارة المدرسة'}
          </Typography>
        </Box>
      </Toolbar>
      <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.12)' }} />
      <List sx={{ px: 1, py: 1 }}>
        {menuItems.map((item) => {
          const selected = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => navigate(item.path)}
                selected={selected}
                sx={{
                  borderRadius: 1.5,
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(25, 118, 210, 0.3)',
                    borderRight: 'none',
                    borderLeft: '4px solid #1976d2',
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: selected ? '#64b5f6' : 'rgba(255,255,255,0.7)', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{ color: 'white', textAlign: 'right' }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Drawer>
  );
}