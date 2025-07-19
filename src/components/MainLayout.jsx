import React from 'react';
import AppNavigation from './AppNavigation';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import { useState } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

export default function MainLayout({ children, ...navProps }) {
  const drawerWidth = 260;
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(!isSmallScreen);

  // Update drawer open state when screen size changes
  React.useEffect(() => {
    setDrawerOpen(!isSmallScreen);
  }, [isSmallScreen]);

  const handleDrawerToggle = () => {
    setDrawerOpen((open) => !open);
  };

  return (
    <div style={{ display: 'flex' }}>
      <AppNavigation
        {...navProps}
        variant={isSmallScreen ? 'temporary' : 'permanent'}
        open={drawerOpen}
        onClose={handleDrawerToggle}
      />
      <div style={{ flex: 1, marginLeft: isSmallScreen ? 0 : drawerWidth }}>
        <AppBar
          position="fixed"
          sx={{
            width: isSmallScreen ? '100%' : `calc(100% - ${drawerWidth}px)`,
            ml: isSmallScreen ? 0 : `${drawerWidth}px`,
            backgroundColor: '#f7f5f1',
            color: '#222',
            boxShadow: 'none',
            zIndex: 1201,
          }}
        >
          <Toolbar>
            {isSmallScreen && (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
              Parse Med
            </Typography>
          </Toolbar>
        </AppBar>
        <main style={{ padding: 24, marginTop: 64 }}>
          {children}
        </main>
      </div>
    </div>
  );
} 