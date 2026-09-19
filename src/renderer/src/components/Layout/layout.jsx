import React from 'react';
import { Outlet } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Sidebar from './Sidebar';


const drawerWidth = 240;

const MainContent = styled('main')(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.default,
  minHeight: '100vh',
  marginInlineEnd: drawerWidth, // logical property: adapts to RTL/LTR automatically
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.enteringScreen,
  }),
}));

export default function Layout() {
  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar />
      <MainContent>
        <Outlet />
      </MainContent>
    </Box>
  );
}