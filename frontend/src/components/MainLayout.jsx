import React, { useState, useEffect } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import MuiDrawer from '@mui/material/Drawer';
import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useNavigate, useLocation } from 'react-router-dom';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import LogoutIcon from '@mui/icons-material/Logout';
import GroupIcon from '@mui/icons-material/Group';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SettingsIcon from '@mui/icons-material/Settings';
import useMediaQuery from '@mui/material/useMediaQuery';

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
  width: `calc(${theme.spacing(8)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
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
}));

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    ...(open && {
      ...openedMixin(theme),
      '& .MuiDrawer-paper': {
        ...openedMixin(theme),
        backgroundColor: "#00917c",
        color: "white",
      },
    }),
    ...(!open && {
      ...closedMixin(theme),
      '& .MuiDrawer-paper': {
        ...closedMixin(theme),
        backgroundColor: "#00917c",
        color: "white",
      },
    }),
  }),
);

const navigationItems = [
  { title: "Extraction Summary", route: "/summary", icon: <GroupIcon /> },
  { title: "Document Upload Markdown", route: "/upload-markdown", icon: <UploadFileIcon /> },
  { title: "Create Configs", route: "/configuration", icon: <SettingsIcon /> },
  { title: "View Configs", route: "/view-configs", icon: <VisibilityIcon /> },
];

export default function MainLayout({ children, onLogout, ...navProps }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [open, setOpen] = useState(!isSmallScreen);

  useEffect(() => {
    if (isSmallScreen) {
      setOpen(false);
    }
  }, [isSmallScreen]);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" open={open}>
      <Toolbar>
  {!open && (
    <IconButton
      color="inherit"
      aria-label="open drawer"
      onClick={handleDrawerOpen}
      edge="start"
      sx={{
        marginRight: 2,
        display: { xs: 'none', sm: 'flex' }, // Hide on small screens, show on sm+
      }}
    >
      <MenuIcon />
    </IconButton>
  )}
  <Typography
    variant="h6"
    noWrap
    component="div"
    sx={{ fontWeight: 'bold' }}
  >
    Parse Med
  </Typography>
</Toolbar>
      </AppBar>
      <Drawer variant="permanent" open={open}>
        
        <DrawerHeader>
          <IconButton onClick={handleDrawerClose}>
            <ChevronLeftIcon />
          </IconButton>
        </DrawerHeader>
        
        <Divider sx={{ background: "rgba(255,255,255,0.2)" }} />
        <List>
          {navigationItems.map((item, idx) => {
            const isSelected = location.pathname === item.route;
            return (
              <ListItem key={idx} disablePadding sx={{ display: 'block' }}>
                <ListItemButton
                  onClick={() => navigate(item.route)}
                  sx={{
                    backgroundColor: isSelected ? "#006e5c" : "transparent",
                    color: "white",
                    "&:hover": {
                      backgroundColor: isSelected ? "#006e5c" : "rgba(255,255,255,0.1)",
                    },
                    minHeight: 48,
                    px: 2.5,
                    ...(open
                      ? {
                          justifyContent: 'initial',
                        }
                      : {
                          justifyContent: 'center',
                        }),
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: "white",
                      minWidth: 0,
                      justifyContent: 'center',
                      ...(open
                        ? {
                            mr: 3,
                          }
                        : {
                            mr: 'auto',
                          }),
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    sx={{
                      ...(open
                        ? {
                            opacity: 1,
                          }
                        : {
                            opacity: 0,
                          }),
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
        <div style={{ marginTop: 'auto' }}>

        <Divider sx={{ background: "rgba(255,255,255,0.2)" }} />
        <List>
          <ListItem disablePadding sx={{ display: 'block' }}>
            <ListItemButton
              onClick={onLogout}
              sx={{
                color: "#ff5252",
                minHeight: 48,
                px: 2.5,
                ...(open
                  ? {
                      justifyContent: 'initial',
                    }
                  : {
                      justifyContent: 'center',
                    }),
              }}
            >
              <ListItemIcon
                sx={{
                  color: "#ff5252",
                  minWidth: 0,
                  justifyContent: 'center',
                  ...(open
                    ? {
                        mr: 3,
                      }
                    : {
                        mr: 'auto',
                      }),
                }}
              >
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText
                primary="Logout"
                sx={{
                  ...(open
                    ? {
                        opacity: 1,
                      }
                    : {
                        opacity: 0,
                      }),
                }}
              />
            </ListItemButton>
          </ListItem>
        </List>
        </div>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, overflowX: 'auto' }}>
        <DrawerHeader />
        <Box sx={{ textAlign: 'center' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}