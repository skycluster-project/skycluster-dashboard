import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import {Link as RouterLink, useLocation} from "react-router-dom";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import CompositeIcon from "@mui/icons-material/PolylineTwoTone";
import ManagedIcon from "@mui/icons-material/HubTwoTone";
import ProvidersIcon from "@mui/icons-material/GridViewTwoTone";
import Divider from "@mui/material/Divider";
import CompositionsIcon from "@mui/icons-material/AccountTreeTwoTone";
import XRDsIcon from "@mui/icons-material/SchemaTwoTone";

export default function MainMenu() {
  const location = useLocation();

  const isLinkActive = (to: string) => {
    return location.pathname === to;
  };

  const styleHighLight = (path: string) => ({
    ...(isLinkActive(path)) && {
      backgroundColor:"#ffffff14",
      fontWeight: 700,
      borderLeft: 2,
      borderLeftColor: "#1347ff"
    }
  });

  return (<>
    <List>
      <ListItem key="Apps" disablePadding>
        <ListItemButton component={RouterLink} to="/apps" sx={styleHighLight("/apps")}>
          <ListItemIcon>
            <XRDsIcon/>
          </ListItemIcon>
          <ListItemText primary="Apps"/>
        </ListItemButton>
      </ListItem>
      <ListItem key="Profiles" disablePadding>
        <ListItemButton component={RouterLink} to="/providerprofiles" sx={styleHighLight("/providerprofiles")}>
          <ListItemIcon>
            <ProvidersIcon/>
          </ListItemIcon>
          <ListItemText primary="Provider Profiles"/>
        </ListItemButton>
      </ListItem>
      <ListItem key="Composite Resources" disablePadding>
        <ListItemButton component={RouterLink} to="/composite" sx={styleHighLight("/composite")}>
          <ListItemIcon>
            <CompositionsIcon/>
          </ListItemIcon>
          <ListItemText primary="Composite Resources"/>
        </ListItemButton>
      </ListItem>
      <ListItem key="Managed Resources" disablePadding>
        <ListItemButton component={RouterLink} to="/managed" sx={styleHighLight("/managed")}>
          <ListItemIcon>
            <ManagedIcon/>
          </ListItemIcon>
          <ListItemText primary="Managed Resources"/>
        </ListItemButton>
      </ListItem>
    </List>
    <Divider/>
    <ListItem key="CRDs" disablePadding>
      <ListItemButton component={RouterLink} to="/crds" sx={styleHighLight("/crds")}>
        <ListItemIcon>
          <CompositeIcon/>
        </ListItemIcon>
        <ListItemText primary="Internal Resources"/>
      </ListItemButton>
    </ListItem>
  </>)
}