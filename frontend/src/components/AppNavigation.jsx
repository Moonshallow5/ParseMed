import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import LogoutIcon from '@mui/icons-material/Logout';
import GroupIcon from '@mui/icons-material/Group';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SettingsIcon from '@mui/icons-material/Settings';

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

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

const StyledDrawer = styled(Drawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    ...(open && {
      ...openedMixin(theme),
      '& .MuiDrawer-paper': {
        ...openedMixin(theme),
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        overflowY: 'auto',
        backgroundColor: "#00917c",
        color: "white",
      },
    }),
    ...(!open && {
      ...closedMixin(theme),
      '& .MuiDrawer-paper': {
        ...closedMixin(theme),
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        overflowY: 'auto',
        backgroundColor: "#00917c",
        color: "white",
      },
    }),
  }),
);

const navigationItems = [
  { title: "Extraction Summary", route: "/summary", icon: <GroupIcon /> },
  // { title: "Document Upload", route: "/upload", icon: <UploadFileIcon /> },
  { title: "Document Upload Markdown", route: "/upload-markdown", icon: <UploadFileIcon /> },
  { title: "Create Configs", route: "/configuration", icon: <SettingsIcon /> },
  { title: "View Configs", route: "/view-configs", icon: <VisibilityIcon /> },
];

export default function AppNavigation({ onLogout, variant = "temporary", open = true, onClose, onToggleOpen }) {
  const navigate = useNavigate();
  const location = useLocation();

  const DrawerComponent = StyledDrawer;

  return (
    <DrawerComponent
      variant="permanent"
      anchor="left"
      open={open}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowX: 'hidden' }}>
        <div>
          <DrawerHeader>
            <IconButton
              onClick={() => {
                onToggleOpen && onToggleOpen();
              }}
              sx={{ color: 'white' }}
              size="small"
            >
              <ChevronLeftIcon sx={{ transform: open ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
            </IconButton>
          </DrawerHeader>
          <List>
            {navigationItems.map((item, idx) => {
              const isSelected = location.pathname === item.route;
              return (
                <React.Fragment key={idx}>
                  <ListItem disablePadding sx={{ display: 'block' }}>
                    <ListItemButton
                      onClick={() => {
                        navigate(item.route);
                      }}
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
                </React.Fragment>
              );
            })}
          </List>
        </div>
        <div style={{ marginTop: 'auto' }}>
          <Divider sx={{ background: "rgba(255,255,255,0.2)" }} />
          <List>
            <ListItem disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                onClick={() => {
                  onLogout && onLogout();
                }}
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
      </div>
    </DrawerComponent>
  );
}
