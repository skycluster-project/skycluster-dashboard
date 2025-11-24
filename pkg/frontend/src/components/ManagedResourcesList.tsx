// src/components/ManagedResourcesList.tsx
import React, { useEffect, useMemo, useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InfoIcon from "@mui/icons-material/Info";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Stack,
  Card,
  Chip,
  CardContent,
  Grid,
  IconButton,
  List,
  Accordion,
  AccordionSummary,
  Box,
  Alert,
  AccordionDetails,
  CircularProgress,
  Typography,
  Tooltip,
  Button,
} from "@mui/material";
import { ItemList, K8sResource, ManagedResource, ManagedResourceExtended } from "../types.ts";
import ReadySynced from "./ReadySynced.tsx";
import InfoDrawer from "./InfoDrawer.tsx";
import InfoTabs, { ItemContext } from "./InfoTabs.tsx";
import ConditionChips from "./ConditionChips.tsx";
import { NavigateFunction, useNavigate, useParams } from "react-router-dom";
import { GraphData, NodeTypes } from "./graph/data.ts";
import { logger } from "../logger.ts";
import apiClient from "../api.ts";

type Props = {
  items: ItemList<ManagedResource> | undefined;
};

/**
 * Small presentational item for a managed resource.
 * Keeps the same logic for refresh & copy-to-clipboard as before.
 */
function ManagedResourceListItem({ item: initialItem, onItemClick }: { item: ManagedResource; onItemClick: (i: K8sResource) => void }) {
  const [item, setItem] = useState<ManagedResource>(initialItem);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch((err) => console.error("Could not copy text: ", err));
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [group, version] = item.apiVersion.split("/");
      const refreshed = await apiClient.getManagedResource(group, version, item.kind, item.metadata.name);
      // keep behavior: drop composite & provConfig from state displayed (as original code did)
      const { composite, provConfig, ...dataWithoutComposite } = refreshed;
      setItem(dataWithoutComposite as ManagedResource);
    } catch (err) {
      console.error("Error refreshing managed resource:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const kubectlBase = `${item.kind}.${item.apiVersion.split("/")[0]} ${item.metadata.name}`;

  return (
    <Grid item xs={12} key={item.metadata.name}>
      <Card variant="outlined" sx={{ mb: 1 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6">{item.metadata.name}</Typography>
              <ReadySynced status={item.status ?? {}} />
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Refresh">
                <IconButton size="small" color="warning" onClick={refreshData}>
                  {isLoading ? <CircularProgress size={18} /> : <RefreshIcon />}
                </IconButton>
              </Tooltip>

              {/* <Tooltip title={`kubectl get ${kubectlBase}`}>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => copyToClipboard(`kubectl get ${kubectlBase}`)}
                >
                  <InfoIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title={`kubectl describe ${kubectlBase}`}>
                <IconButton size="small" color="secondary" onClick={() => copyToClipboard(`kubectl describe ${kubectlBase}`)}>
                  <HelpOutlineIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title={`kubectl delete ${kubectlBase}`}>
                <IconButton size="small" color="error" onClick={() => copyToClipboard(`kubectl delete ${kubectlBase}`)}>
                  <DeleteForeverIcon />
                </IconButton>
              </Tooltip> */}

              <Chip label="Details" size="small" color="info" onClick={() => onItemClick(item)} sx={{ cursor: "pointer" }} />
            </Stack>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 1 }} alignItems="center">
            <Typography variant="body2">Kind: {item.kind}</Typography>
            <Typography variant="body2">Group: {item.apiVersion}</Typography>
            <Typography variant="body2">Provider Config: {item.spec?.providerConfigRef?.name ?? "-"}</Typography>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );
}

export default function ManagedResourcesList({ items }: Props) {
  const { name: focusedName } = useParams();
  const navigate = useNavigate();

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [isDrawerOpen, setDrawerOpen] = useState<boolean>(Boolean(focusedName));
  const [focused, setFocused] = useState<K8sResource>({ metadata: { name: "" }, kind: "", apiVersion: "" });

  // ensure focused from route param is selected
  useEffect(() => {
    if (!focused.metadata.name && focusedName && items) {
      const found = items.items.find((it) => it.metadata.name === focusedName);
      if (found) setFocused(found);
    }
  }, [focusedName, focused, items]);

  const onClose = () => {
    setDrawerOpen(false);
    navigate("/managed", { state: focused });
  };

  const onItemClick = (item: K8sResource) => {
    setFocused(item);
    setDrawerOpen(true);
    navigate(`./${item.apiVersion}/${item.kind}/${item.metadata.name}`, { state: item });
  };

  // Bridge for InfoTabs / InfoDrawer graph fetching
  const bridge = new ItemContext();
  bridge.setCurrent(focused);
  bridge.getGraph = (setter, setError) => {
    if (!focused || !focused.metadata?.name) {
      return;
    }
    const setData = (res: ManagedResourceExtended) => {
      logger.log("recv from API", res);
      const data = resToGraph(res, navigate);
      logger.log("set graph data", data.nodes);
      setter(data);
    };

    const [group, version] = focused.apiVersion.split("/");
    apiClient
      .getManagedResource(group, version, focused.kind, focused.metadata.name)
      .then((data) => setData(data))
      .catch((err) => setError(err));
  };

  const title = (
    <>
      {focused.metadata.name}
      <ConditionChips status={focused.status ?? {}} />
    </>
  );

  if (!items || !items.items || items.items.length === 0) {
    return <Typography variant="h6">No items</Typography>;
  }

  // Group items by group/version/kind (keeps logic)
  const groupedItems = useMemo(() => {
    const groups: Record<string, ManagedResource[]> = {};
    (items.items || []).forEach((it) => {
      // aim to mimic previous unique key behavior (apiVersion parts + kind)
      const parts = it.apiVersion.split(".");
      const groupPart = parts[0] ?? "";
      const groupPart2 = parts[1] ?? "";
      const key = `${groupPart}.${groupPart2}.${it.kind}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(it);
    });
    return groups;
  }, [items]);

  const getApiVersionLabel = (list: ManagedResource[]) => {
    if (!list || list.length === 0) return "Unknown API";
    const words = list[0].apiVersion.split(".");
    if (words.length < 2) return "Unknown API";
    return `${words[0]}.${words[1]}`;
  };

  const expandAll = () => {
    const map = Object.keys(groupedItems).reduce<Record<string, boolean>>((acc, k) => {
      acc[k] = true;
      return acc;
    }, {});
    setExpandedItems(map);
  };

  const collapseAll = () => {
    setExpandedItems({});
  };

  const toggleAccordion = (key: string) => {
    setExpandedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // helpers for counts (unchanged logic semantics)
  const countReady = (arr: ManagedResource[]) =>
    arr.filter((item) => item.status?.conditions?.some((c) => c.type === "Ready" && c.status === "True")).length;

  const countNotReady = (arr: ManagedResource[]) =>
    arr.filter((item) => !item.status?.conditions?.some((c) => c.type === "Ready" && c.status === "True")).length;

  const countNotSynced = (arr: ManagedResource[]) =>
    arr.filter((item) => !item.status?.conditions?.some((c) => c.type === "Synced" && c.status === "True")).length;

  return (
    <>
      <Box sx={{ display: "flex", gap: 1, p: 0.5 }}>
        <Button variant="outlined" onClick={expandAll}>
          Expand All
        </Button>
        <Button variant="outlined" onClick={collapseAll}>
          Collapse All
        </Button>
      </Box>

      {Object.entries(groupedItems).map(([groupKey, groupList]) => {
        const kindLabel = groupKey.split(".")[2] ?? groupKey;
        const apiLabel = getApiVersionLabel(groupList);
        const anyProviderConfig = groupList.some((it) => it.kind === "ProviderConfig");

        return (
          <Box key={groupKey} m={1}>
            <Accordion expanded={!!expandedItems[groupKey]} onChange={() => toggleAccordion(groupKey)}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%" }}>
                  <Typography variant="overline" sx={{ pt: "3px" }}>
                    {apiLabel}:
                  </Typography>
                  <Typography variant="h6">{kindLabel}</Typography>

                  <Box sx={{ ml: 2 }}>
                    <Alert severity="success" sx={{ py: 0 }}>
                      Ready: {countReady(groupList)}
                    </Alert>
                  </Box>

                  {!anyProviderConfig && countNotReady(groupList) > 0 && (
                    <Box sx={{ mx: 0.5 }}>
                      <Alert severity="warning" sx={{ py: 0 }}>
                        Not Ready: {countNotReady(groupList)}
                      </Alert>
                    </Box>
                  )}

                  {!anyProviderConfig && countNotSynced(groupList) > 0 && (
                    <Box sx={{ mx: 0.5 }}>
                      <Alert severity="info" sx={{ py: 0 }}>
                        Not Synced: {countNotSynced(groupList)}
                      </Alert>
                    </Box>
                  )}
                </Stack>
              </AccordionSummary>

              <AccordionDetails>
                <List>
                  <Grid container spacing={0}>
                    {groupList.map((it) => (
                      <ManagedResourceListItem key={it.metadata.name} item={it} onItemClick={(i) => onItemClick(i)} />
                    ))}
                  </Grid>
                </List>
              </AccordionDetails>
            </Accordion>
          </Box>
        );
      })}

      <InfoDrawer key={focused.metadata.name} isOpen={isDrawerOpen} onClose={onClose} type="Managed Resource" title={title}>
        <InfoTabs bridge={bridge} initial="yaml" />
      </InfoDrawer>
    </>
  );
}

/**
 * Convert ManagedResourceExtended -> GraphData (same logic as before).
 */
function resToGraph(res: ManagedResourceExtended, navigate: NavigateFunction): GraphData {
  const data = new GraphData();
  const main = data.addNode(NodeTypes.ManagedResource, res, true, navigate);
  if (res.composite) {
    const comp = data.addNode(NodeTypes.CompositeResource, res.composite, false, navigate);
    data.addEdge(main, comp);
  }

  if (res.provConfig) {
    const provConfig = data.addNode(NodeTypes.ProviderConfig, res.provConfig, false, navigate);
    data.addEdge(provConfig, main);
  }

  return data;
}