import React from "react";
import { Box, Grid, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

import HomePageBlock from "../components/HomePageBlock";
import PageBody from "../components/PageBody";
import apiClient from "../api";

import ManagedIcon from "@mui/icons-material/HubTwoTone";
import CloudIcon from "@mui/icons-material/Cloud";
import AssessmentIcon from "@mui/icons-material/Assessment";

import AppsIcon from "@mui/icons-material/Apps";
import CompositionsIcon from "@mui/icons-material/AccountTreeTwoTone";

/**
 * Modernized Home page layout: theme-aware spacing, clearer typography,
 * responsive grid and consistent icon sizing/color.
 */
export default function Home() {
  const navigate = useNavigate();

  const iconProps = { fontSize: "medium", sx: { color: "primary.main", fontSize: 36 } };

  return (
    <PageBody>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
            SkyCluster
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 0.5 }}>
            Unified Workload Platform
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={6} lg={6}>
          <HomePageBlock
            title="System Status"
            getter={apiClient.getSystemComposites}
            onClick={() => navigate("system")}
            icon={<AssessmentIcon {...iconProps} />}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={6} lg={6}>
          <HomePageBlock
            title="Apps"
            getter={apiClient.getProviderProfilesList}
            onClick={() => navigate("apps")}
            icon={<AppsIcon {...iconProps} />}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={6} lg={6}>
          <HomePageBlock
            title="Provider Profiles"
            getter={apiClient.getProviderProfilesList}
            onClick={() => navigate("providerprofiles")}
            icon={<CloudIcon {...iconProps} />}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={6} lg={6}>
          <HomePageBlock
            title="Composite Resources"
            getter={apiClient.getCompositeResourcesList}
            onClick={() => navigate("composite")}
            icon={<CompositionsIcon {...iconProps} />}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={6} lg={6}>
          <HomePageBlock
            title="Managed Resources"
            getter={apiClient.getManagedResourcesList}
            onClick={() => navigate("managed")}
            icon={<ManagedIcon {...iconProps} />}
          />
        </Grid>
      </Grid>
    </PageBody>
  );
}