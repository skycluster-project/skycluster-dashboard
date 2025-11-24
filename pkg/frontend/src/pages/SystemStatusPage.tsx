// src/pages/SystemStatusPage.tsx
import React, { useCallback, useEffect, useState } from "react";
import apiClient from "../api.ts";
import {
  CompositeResourceExtended,
} from "../types.ts";
import ReadySynced from "../components/ReadySynced.tsx";
import HeaderBar from "../components/HeaderBar.tsx";
import PageBody from "../components/PageBody.tsx";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RefreshIcon from "@mui/icons-material/Refresh";
import InfoIcon from '@mui/icons-material/Info';
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import InfoDrawer from "../components/InfoDrawer.tsx";
import InfoTabs, { ItemContext } from "../components/InfoTabs.tsx";

const XSETUP_GROUP = "xsetup.skycluster.io";
const POLL_MS = 195000;

type NodeKey = string;

type TreeNode = {
  resource: CompositeResourceExtended;
  children: TreeNode[];
};

const mkKey = (group: string, version: string, kind: string, name: string) =>
  `${group}|${version}|${kind}|${name}`;

const parseApiVersion = (apiVersion?: string): { group: string; version: string } => {
  if (!apiVersion) return { group: "", version: "" };
  const parts = apiVersion.split("/");
  if (parts.length === 1) return { group: parts[0], version: "" };
  return { group: parts[0], version: parts[1] ?? "" };
};

// kinds we want to hide from display
const isExcludedKind = (kind?: string) => {
  if (!kind) return false;
  return kind === "ProviderConfig" || kind === "Unknown";
};

type TreeNodeViewProps = {
  node: TreeNode;
  level?: number;
  onItemClick: (r: CompositeResourceExtended) => void;
};
const TreeNodeView: React.FC<TreeNodeViewProps> = ({ node, level = 0, onItemClick }) => {
  const [open, setOpen] = useState<boolean>(level < 1); // expand root by default, collapse deeper nodes
  // const [open, setOpen] = useState<boolean>(false);
  const r = node.resource;
  const kind = r.kind ?? "<unknown>";
  const apiVersion = r.apiVersion ?? "";
  const subtitle = `${kind}`;
  const name = `${apiVersion} - ${r?.metadata?.name ?? "<unknown>"}`;

  // hide this node entirely in UI if excluded
  if (isExcludedKind(kind)) return null;

  return (
    <Box sx={{ ml: level * 3, mt: 1 }}>
      <Paper variant="outlined" sx={{ p: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <Stack>
              <Typography variant={level === 0 ? "subtitle1" : "body1"} sx={{ fontWeight: level === 0 ? 700 : 600 }}>
                {subtitle}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {name}
              </Typography>
            </Stack>
            <ReadySynced status={r.status ?? {}} />
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              size="small"
              variant="outlined"
              startIcon={<InfoIcon />}
              onClick={() => onItemClick(r)}
            >
              Details
            </Button>

            <IconButton size="small" onClick={() => setOpen((v) => !v)} aria-label="toggle children">
              {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Stack>
        </Stack>

        {/* metadata/status details */}
        <Collapse in={open}>
          <Box sx={{ mt: 1 }}>
            {/* display children, skipping excluded kinds */}
            {node.children.length > 0 && (
              <Box sx={{ mt: 1 }}>
                {node.children
                  .filter(child => !isExcludedKind(child.resource.kind))
                  .map((child) => (
                  <TreeNodeView
                    key={mkKey(
                      parseApiVersion(child.resource.apiVersion).group,
                      parseApiVersion(child.resource.apiVersion).version,
                      child.resource.kind ?? "",
                      child.resource.metadata?.name ?? ""
                    )}
                    node={child}
                    level={level + 1}
                    onItemClick={onItemClick}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
};

const SystemStatusPage = () => {
  const [trees, setTrees] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<unknown | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Drawer / details state
  const [isDrawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [focused, setFocused] = useState<CompositeResourceExtended | null>(null);
  const bridge = new ItemContext();
  // set current for InfoTabs context
  if (focused) bridge.setCurrent(focused);

  // implement getGraph for InfoTabs bridge (similar shape as ManageResourceList)
  bridge.getGraph = (setter: (d: any) => void, setError: (e: any) => void) => {
    if (!focused) {
      setError("No focused resource");
      return;
    }
    const [group, version] = focused.apiVersion.split("/");
    apiClient
      .getCompositeResource(group, version, focused.kind, focused.metadata.name)
      .then((data) => {
        // InfoTabs expects bridge.getGraph to call setter with some data.
        // We don't have a graph transformation helper here; pass the raw composite as-is.
        // If InfoTabs expects a GraphData structure, adapt here accordingly.
        setter(data);
      })
      .catch((err) => {
        setError(err);
      });
  };

  const onItemClick = (r: CompositeResourceExtended) => {
    setFocused(r);
    setDrawerOpen(true);
  };

  const onCloseDrawer = () => {
    setDrawerOpen(false);
    setFocused(null);
  };

  // Fetch single composite resource using provided API
  const fetchComposite = useCallback(
    async (group: string, version: string, kind: string, name: string) => {
      return await apiClient.getCompositeResource(group, version, kind, name) as CompositeResourceExtended;
    },
    []
  );

  // Build tree for a given root composite resource. Iteratively fetch compositionRef and resourceRefs.
  const buildTreeForRoot = useCallback(
    async (root: CompositeResourceExtended, visited: Set<NodeKey>) : Promise<TreeNode> => {
      const rootKey = mkKey(
        parseApiVersion(root.apiVersion).group,
        parseApiVersion(root.apiVersion).version,
        root.kind ?? "",
        root.metadata?.name ?? ""
      );

      // nodesMap to hold created TreeNode objects by key
      const nodesMap = new Map<NodeKey, TreeNode>();
      const queue: CompositeResourceExtended[] = [];

      const makeNode = (r: CompositeResourceExtended) => {
        const k = mkKey(
          parseApiVersion(r.apiVersion).group,
          parseApiVersion(r.apiVersion).version,
          r.kind ?? "",
          r.metadata?.name ?? ""
        );
        if (!nodesMap.has(k)) nodesMap.set(k, { resource: r, children: [] });
        return nodesMap.get(k)!;
      };

      // seed
      makeNode(root);
      queue.push(root);
      visited.add(rootKey);

      while (queue.length > 0) {
        const current = queue.shift()!;
        const parentNode = makeNode(current);

        // look at spec.compositionRef (single) first
        const compRef = (current.spec as any)?.compositionRef;
        if (compRef && compRef.name) {
          const { apiVersion, kind, name } = compRef;
          const { group, version } = parseApiVersion(apiVersion);
          const childKey = mkKey(group, version, kind ?? "", name ?? "");
          if (!visited.has(childKey)) {
            // skip fetching/displaying excluded kinds
            if (isExcludedKind(kind)) {
              // mark visited but do not add node
              visited.add(childKey);
            } else {
              try {
                const fetched = await fetchComposite(group, version, kind ?? "", name ?? "");
                const childNode = makeNode(fetched);
                parentNode.children.push(childNode);
                visited.add(childKey);
                queue.push(fetched);
              } catch (err) {
                const placeholder: CompositeResourceExtended = {
                  apiVersion: apiVersion ?? `${group}/${version}`,
                  kind: kind ?? "Unknown",
                  metadata: { name: name ?? "<unknown>" },
                  spec: { resourceRefs: [] },
                  status: { conditions: [{ type: "Error", status: "True", reason: "FetchFailed", message: String(err) }] },
                } as any;
                if (!isExcludedKind(placeholder.kind)) {
                  const childNode = makeNode(placeholder);
                  parentNode.children.push(childNode);
                }
                visited.add(childKey);
              }
            }
          } else {
            // if already visited, attach existing node if present and not excluded
            const existing = nodesMap.get(childKey);
            if (existing && !isExcludedKind(existing.resource.kind)) parentNode.children.push(existing);
          }
        }

        // then handle resourceRefs array (0..N)
        const resourceRefs = (current.spec as any)?.resourceRefs ?? [];
        for (const ref of resourceRefs) {
          if (!ref || !ref.name) continue;
          const { apiVersion, kind, name } = ref;
          const { group, version } = parseApiVersion(apiVersion);
          const childKey = mkKey(group, version, kind ?? "", name ?? "");
          if (!visited.has(childKey)) {
            if (isExcludedKind(kind)) {
              visited.add(childKey);
            } else {
              try {
                const fetched = await fetchComposite(group, version, kind ?? "", name ?? "");
                const childNode = makeNode(fetched);
                parentNode.children.push(childNode);
                visited.add(childKey);
                queue.push(fetched);
              } catch (err) {
                const placeholder: CompositeResourceExtended = {
                  apiVersion: apiVersion ?? `${group}/${version}`,
                  kind: kind ?? "Unknown",
                  metadata: { name: name ?? "<unknown>" },
                  spec: { resourceRefs: [] },
                  status: { conditions: [{ type: "Error", status: "True", reason: "FetchFailed", message: String(err) }] },
                } as any;
                if (!isExcludedKind(placeholder.kind)) {
                  const childNode = makeNode(placeholder);
                  parentNode.children.push(childNode);
                }
                visited.add(childKey);
              }
            }
          } else {
            const existing = nodesMap.get(childKey);
            if (existing && !isExcludedKind(existing.resource.kind)) parentNode.children.push(existing);
          }
        }
      }

      // return the node corresponding to rootKey
      return nodesMap.get(rootKey)!;
    },
    [fetchComposite]
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const allResp = await apiClient.getSystemComposites(); // ItemList<CompositeResource>

      // Keep only xsetup candidates by group parsed from apiVersion
      const xsetupCandidates = allResp.items ?? [];

      // For each candidate, fetch the full composite resource and then build its tree
      const treesOut: TreeNode[] = [];
      const visited = new Set<NodeKey>();

      for (const cand of xsetupCandidates) {
        const { group, version } = parseApiVersion(cand.apiVersion);
        const kind = cand.kind ?? "XSetup";
        const name = cand.metadata?.name;
        if (!name) continue;

        // skip root entirely if excluded
        if (isExcludedKind(kind)) continue;

        try {
          // fetch the full composite for the xsetup root
          const fullRoot = await fetchComposite(group || XSETUP_GROUP, version, kind, name);
          const tree = await buildTreeForRoot(fullRoot, visited);
          // ensure root is not excluded before pushing
          if (!isExcludedKind(tree.resource.kind)) treesOut.push(tree);
        } catch (err) {
          const placeholder: CompositeResourceExtended = {
            apiVersion: cand.apiVersion ?? `${XSETUP_GROUP}/v1alpha`,
            kind: cand.kind ?? "XSetup",
            metadata: { name: name },
            spec: { resourceRefs: [] },
            status: { conditions: [{ type: "Error", status: "True", reason: "FetchFailed", message: String(err) }] },
          } as any;
          const tree = await buildTreeForRoot(placeholder, visited);
          if (!isExcludedKind(tree.resource.kind)) treesOut.push(tree);
        }
      }

      setTrees(treesOut);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [buildTreeForRoot, fetchComposite]);

  useEffect(() => {
    void fetchAll();
    const id = setInterval(() => void fetchAll(), POLL_MS);
    return () => clearInterval(id);
  }, [fetchAll]);

  const refreshAll = async () => {
    void fetchAll();
  };

  if (error) {
    return (
      <>
        <HeaderBar title="System Status" />
        <PageBody>
          <Alert severity="error">Failed to load system status: {String(error)}</Alert>
        </PageBody>
      </>
    );
  }

  if (loading && trees.length === 0) {
    return (
      <>
        <HeaderBar title="System Status" />
        <PageBody>
          <LinearProgress />
        </PageBody>
      </>
    );
  }

  return (
    <>
      <HeaderBar title="System Status" />
      <PageBody>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Chip label={loading ? "Syncing" : "Synced"} icon={loading ? <CircularProgress size={18} /> : <CheckCircleIcon />} color={loading ? "default" : "success"} sx={{ fontWeight: 600 }} />
            <Typography variant="h6">SkyCluster Setup</Typography>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ textAlign: "right", mr: 2 }}>
              <Typography variant="subtitle2">Last updated</Typography>
              <Typography variant="body2">{lastUpdated ? lastUpdated.toLocaleString() : "—"}</Typography>
            </Box>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refreshAll} disabled={loading}>
              Refresh
            </Button>
          </Stack>
        </Stack>

        <Stack spacing={2}>
          {trees.length === 0 && <Typography>No XSetup objects found.</Typography>}
          {trees.map((t) => {
            const root = t.resource;
            const name = root.metadata?.name ?? "<unknown>";
            const key = mkKey(
              parseApiVersion(root.apiVersion).group,
              parseApiVersion(root.apiVersion).version,
              root.kind ?? "",
              name
            );
            // skip excluded root
            if (isExcludedKind(root.kind)) return null;
            return (
              <Box key={key}>
                <TreeNodeView node={t} level={0} onItemClick={onItemClick} />
              </Box>
            );
          })}
        </Stack>

        <InfoDrawer
          key={focused?.metadata?.name ?? "infodrawer"}
          isOpen={isDrawerOpen}
          onClose={onCloseDrawer}
          type="Composite Resource"
          title={focused ? (
            <>
              {focused.metadata?.name}
              {/* Optionally include small status chips here if you have ConditionChips component */}
            </>
          ) : "Details"}
        >
          <InfoTabs bridge={bridge} initial="yaml" />
        </InfoDrawer>
      </PageBody>
    </>
  );
};

export default SystemStatusPage;