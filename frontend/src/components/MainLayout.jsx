import React, { useState } from 'react';
import AppNavigation from './AppNavigation';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
 
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

const drawerWidth = 290;

const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
});

const closedMixin = (theme) => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const StyledAppBar = ({ theme, open, isSmallScreen }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
  ...(!open && {
    marginLeft: `calc(${theme.spacing(7)} + 1px)`,
    width: `calc(100% - ${theme.spacing(7)} - 1px)`,
    [theme.breakpoints.up('sm')]: {
      marginLeft: `calc(${theme.spacing(8)} + 1px)`,
      width: `calc(100% - ${theme.spacing(8)} - 1px)`,
    },
  }),
});

export default function MainLayout({ children, ...navProps }) {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(true);

  // Keep drawer state persistent across breakpoint changes

  const handleDrawerToggle = () => {
    setDrawerOpen((open) => !open);
  };

  return (
    <div style={{ display: 'flex', width: '100%', overflowX: 'hidden' }}>
      <AppNavigation
        {...navProps}
        variant={'temporary'}
        open={drawerOpen}
        onClose={() => {
          // Return focus to the menu button after closing for a11y
          setDrawerOpen(false);
        }}
        onToggleOpen={() => setDrawerOpen((prev) => !prev)}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
        <AppBar
          sx={{
            ...StyledAppBar({ theme, open: drawerOpen, isSmallScreen }),
            backgroundColor: '#f7f5f1',
            color: '#222',
            boxShadow: 'none',
          }}
        >
          <Toolbar>
            <Typography variant="h6"  component="div" sx={{ fontWeight: 'bold' }}>
              Parse Med
            </Typography>
          </Toolbar>
        </AppBar>
        {/* Spacer to offset fixed AppBar height */}
        <Toolbar />
        <main
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            minHeight: '100vh',
            padding: '15px',
            width: '100%',
            textAlign: 'center',
            overflowX: 'hidden'
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
} 