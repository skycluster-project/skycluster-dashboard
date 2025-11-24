// src/pages/ManagedResourcesPage.tsx
import React, { useEffect, useState, useMemo } from "react";
import { Alert, LinearProgress, Box, TextField, Paper, Stack, Typography, Button } from "@mui/material";
import apiClient from "../api.ts";
import { ItemList, ManagedResource } from "../types.ts";
import ManagedResourcesList from "../components/ManagedResourcesList.tsx";
import HeaderBar from "../components/HeaderBar.tsx";
import PageBody from "../components/PageBody.tsx";

const ManagedResourcesPage: React.FC = () => {
  const [items, setItems] = useState<ItemList<ManagedResource> | null>(null);
  const [error, setError] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    apiClient
      .getManagedResourcesList()
      .then((data) => setItems(data))
      .catch((err) => setError(err));
  }, []);

  const filteredItems = useMemo(() => {
    if (!items) return null;
    if (!searchQuery) return items;
    const lower = searchQuery.toLowerCase();
    return {
      ...items,
      items: items.items.filter((it) => (it.metadata.name ?? "").toLowerCase().includes(lower)),
    } as ItemList<ManagedResource>;
  }, [items, searchQuery]);

  if (error) {
    return (
      <>
        <HeaderBar title="Managed Resources" />
        <PageBody>
          <Alert severity="error">Failed: {String(error)}</Alert>
        </PageBody>
      </>
    );
  }

  if (!items) {
    return (
      <>
        <HeaderBar title="Managed Resources" />
        <PageBody>
          <LinearProgress />
        </PageBody>
      </>
    );
  }

  return (
    <>
      <HeaderBar title="Managed Resources" />
      <PageBody>
        <Paper elevation={0} sx={{ p: 2, mb: 2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by resource name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => setSearchQuery("")}>
                Clear
              </Button>
            </Stack>
          </Stack>

          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Showing {filteredItems?.items.length ?? 0} of {items.items.length} managed resources
            </Typography>
          </Box>
        </Paper>

        <ManagedResourcesList items={filteredItems ?? items} />
      </PageBody>
    </>
  );
};

export default ManagedResourcesPage;