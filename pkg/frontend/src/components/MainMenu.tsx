import React from "react";
import { alpha } from "@mui/material/styles";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import { Link as RouterLink, useLocation } from "react-router-dom";

import CompositeIcon from "@mui/icons-material/PolylineTwoTone";
import ManagedIcon from "@mui/icons-material/HubTwoTone";
import ProvidersIcon from "@mui/icons-material/GridViewTwoTone";
import CompositionsIcon from "@mui/icons-material/AccountTreeTwoTone";
import XRDsIcon from "@mui/icons-material/SchemaTwoTone";

export default function MainMenu() {
  const location = useLocation();

  const isLinkActive = (to: string) => {
    // exact match or nested route
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  const itemSx = (selected: boolean) => (theme: any) => ({
    borderRadius: 1,
    px: 1,
    py: 0.5,
    color: selected ? "text.primary" : "text.secondary",
    "&:hover": {
      backgroundColor: alpha(theme.palette.action.hover, 0.06),
    },
    "&.Mui-selected": {
      backgroundColor: alpha(theme.palette.primary.main, 0.12),
      fontWeight: 700,
      borderLeft: `4px solid ${theme.palette.primary.main}`,
      pl: `calc(1rem - 4px)`, // maintain padding after left border
    },
  });

  const iconSx = { minWidth: 44, color: "inherit" };

  return (
    <>
      <List component="nav" dense>
        <ListItem disablePadding>
          <ListItemButton
            component={RouterLink}
            to="/apps"
            selected={isLinkActive("/apps")}
            sx={itemSx(isLinkActive("/apps"))}
          >
            <ListItemIcon sx={iconSx}>
              <XRDsIcon />
            </ListItemIcon>
            <ListItemText primary="Apps" primaryTypographyProps={{ noWrap: true }} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton
            component={RouterLink}
            to="/providerprofiles"
            selected={isLinkActive("/providerprofiles")}
            sx={itemSx(isLinkActive("/providerprofiles"))}
          >
            <ListItemIcon sx={iconSx}>
              <ProvidersIcon />
            </ListItemIcon>
            <ListItemText primary="Provider Profiles" primaryTypographyProps={{ noWrap: true }} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton
            component={RouterLink}
            to="/composite"
            selected={isLinkActive("/composite")}
            sx={itemSx(isLinkActive("/composite"))}
          >
            <ListItemIcon sx={iconSx}>
              <CompositionsIcon />
            </ListItemIcon>
            <ListItemText primary="Composite Resources" primaryTypographyProps={{ noWrap: true }} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton
            component={RouterLink}
            to="/managed"
            selected={isLinkActive("/managed")}
            sx={itemSx(isLinkActive("/managed"))}
          >
            <ListItemIcon sx={iconSx}>
              <ManagedIcon />
            </ListItemIcon>
            <ListItemText primary="Managed Resources" primaryTypographyProps={{ noWrap: true }} />
          </ListItemButton>
        </ListItem>
      </List>

      <Divider sx={{ my: 1 }} />

      <List dense>
        <ListItem disablePadding>
          <ListItemButton
            component={RouterLink}
            to="/crds"
            selected={isLinkActive("/crds")}
            sx={itemSx(isLinkActive("/crds"))}
          >
            <ListItemIcon sx={iconSx}>
              <CompositeIcon />
            </ListItemIcon>
            <ListItemText primary="Internal Resources" primaryTypographyProps={{ noWrap: true }} />
          </ListItemButton>
        </ListItem>
      </List>
    </>
  );
}