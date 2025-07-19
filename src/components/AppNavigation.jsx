import React from "react";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import LogoutIcon from "@mui/icons-material/Logout";
import GroupIcon from "@mui/icons-material/Group";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Toolbar from '@mui/material/Toolbar';
import { useNavigate, useLocation } from 'react-router-dom';

const navigationItems = [
  {
    icon: <GroupIcon />,
    title: "Extraction Summary",
    route: "/summary",
  },
  {
    icon: <UploadFileIcon />,
    title: "Document Extraction",
    route: "/upload",
  },
];

export default function AppNavigation({ onLogout, variant = "permanent", open = true, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Drawer
      variant={variant}
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { backgroundColor: "#00917c", color: "white", width: 260 },
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div>
          <Toolbar />
          <List>
            {navigationItems.map((item, idx) => {
              const isSelected = location.pathname === item.route;
              return (
                <React.Fragment key={idx}>
                  {idx === 0 && (
                    <Divider sx={{ background: "rgba(255,255,255,0.2)" }} />
                  )}
                  <ListItem
                    button
                    onClick={() => {
                      navigate(item.route);
                      if (variant === 'temporary' && onClose) {
                        onClose();
                      }
                    }}
                    sx={{
                      backgroundColor: isSelected ? "#006e5c" : "transparent",
                      color: "white",
                      "&:hover": {
                        backgroundColor: isSelected ? "#006e5c" : "rgba(255,255,255,0.1)",
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: "white" }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.title} />
                  </ListItem>
                </React.Fragment>
              );
            })}
          </List>
        </div>
        <div>
          <Divider sx={{ background: "rgba(255,255,255,0.2)" }} />
          <List>
            <ListItem
              button
              onClick={() => {
                onLogout && onLogout();
                if (variant === 'temporary' && onClose) {
                  onClose();
                }
              }}
              sx={{ color: "#ff5252" }}
            >
              <ListItemIcon sx={{ color: "#ff5252" }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItem>
          </List>
        </div>
      </div>
    </Drawer>
  );
}
