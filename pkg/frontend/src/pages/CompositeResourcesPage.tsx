// src/pages/CompositeResourcesPage.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import apiClient from "../api.ts";
import {
  CompositeResource,
  CompositeResourceExtended,
  ItemList,
  K8sReference,
  K8sResource,
} from "../types.ts";
import HeaderBar from "../components/HeaderBar.tsx";
import PageBody from "../components/PageBody.tsx";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Input from "@mui/material/Input";
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
import ConditionChips from "../components/ConditionChips.tsx";

const POLL_MS = 195000;
const NON_READY_POLL_MS = 15000;

const DEFINED_COMPOSITE_KINDS = [
  { group: "skycluster.io", version: "v1alpha1", resource: "xinstances" },
  { group: "skycluster.io", version: "v1alpha1", resource: "xproviders" },
  { group: "skycluster.io", version: "v1alpha1", resource: "xkubes" },
  { group: "skycluster.io", version: "v1alpha1", resource: "xkubemeshes" },
];

type TreeNode = {
  resource: any;
  kind: string;
  title: string;
  children: TreeNode[];
};

const mkKey = (kind: string | undefined, name?: string) => `${kind ?? "<unk-kind>"}|${name ?? "<unnamed>"}`;

const isConditionTrue = (res: any | undefined, type: string) =>
  (res?.status?.conditions ?? []).some((c: any) => c.type === type && c.status === "True");

const StatusChips: React.FC<{ resource: any }> = ({ resource }) => {
  const ready = isConditionTrue(resource, "Ready");
  const synced = isConditionTrue(resource, "Synced");
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Chip size="small" label={ready ? "Ready" : "Not Ready"} color={ready ? "success" : "default"} />
      <Chip size="small" label={synced ? "Synced" : "Not Synced"} color={synced ? "info" : "default"} />
    </Stack>
  );
};

const isExcludedKind = (kind?: string) => {
  if (!kind) return false;
  const k = kind.toLowerCase();
  return k === "providerconfig" || k === "composition";
};

const buildTreeFromComposite = (
  xr: CompositeResourceExtended,
  seen: Set<string> = new Set(),
  shallow: boolean = true
): TreeNode => {
  const rootKey = mkKey(xr.kind, xr.metadata?.name);
  if (seen.has(rootKey)) {
    return {
      resource: xr,
      kind: `${xr.kind} (${xr.apiVersion})`,
      title: xr.metadata?.name ?? "<unnamed>",
      children: [],
    };
  }

  const nextSeen = new Set(seen);
  nextSeen.add(rootKey);

  const root: TreeNode = {
    resource: xr,
    kind: `${xr.kind} (${xr.apiVersion})`,
    title: xr.metadata?.name ?? "<unnamed>",
    children: [],
  };

  if ((xr as any).claim && !isExcludedKind((xr as any).claim.kind)) {
    const claim = (xr as any).claim;
    const claimKey = mkKey(claim.kind, claim.name ?? claim.metadata?.name);
    if (!nextSeen.has(claimKey)) {
      root.children.push({
        resource: claim,
        kind: "Claim",
        title: claim.name ?? claim.metadata?.name ?? "claim",
        children: [],
      });
    }
  }

  if ((xr as any).parentXR && !isExcludedKind((xr as any).parentXR.kind)) {
    const p = (xr as any).parentXR;
    const pKey = mkKey(p.kind, p.metadata?.name);
    if (!nextSeen.has(pKey)) {
      root.children.push({
        resource: p,
        kind: `${p.kind} (${p.apiVersion})`,
        title: p.metadata?.name ?? "parentXR",
        children: [],
      });
    }
  }

  if ((xr as any).composition) {
    const comp = (xr as any).composition;
    if (!isExcludedKind(comp?.kind)) {
      const compNode: TreeNode = {
        resource: comp,
        kind: `Composition (${comp.apiVersion ?? "n/a"})`,
        title: comp.metadata?.name ?? (xr.spec?.compositionRef?.name ?? "composition"),
        children: [],
      };

      const compChildren: any[] = (comp?.resources ?? comp?.spec?.resources ?? comp?.composedTemplates ?? []);
      if (Array.isArray(compChildren) && compChildren.length > 0) {
        compChildren.forEach((c, idx) => {
          const cKey = mkKey(c?.kind, c?.name ?? c?.metadata?.name);
          if (!nextSeen.has(cKey) && !isExcludedKind(c?.kind)) {
            compNode.children.push({
              resource: c,
              kind: c?.kind ?? "ComposedTemplate",
              title: c?.name ?? c?.metadata?.name ?? `template-${idx}`,
              children: [],
            });
          }
        });
      }

      root.children.push(compNode);
    }
  } else if (xr.spec?.compositionRef?.name) {
    const compRef = xr.spec.compositionRef;
    const compRefKey = mkKey(compRef.kind ?? "CompositionRef", compRef.name);
    if (!nextSeen.has(compRefKey)) {
      root.children.push({
        resource: compRef,
        kind: `CompositionRef`,
        title: compRef.name,
        children: [],
      });
    }
  }

  if ((xr as any).managedResources && Array.isArray((xr as any).managedResources)) {
    const mrs = (xr as any).managedResources as K8sResource[];
    mrs.forEach((mr) => {
      const mrKey = mkKey(mr.kind, mr.metadata?.name);
      if (!nextSeen.has(mrKey) && !isExcludedKind(mr.kind)) {
        root.children.push({
          resource: mr,
          kind: `${mr.kind} (${mr.apiVersion})`,
          title: mr.metadata?.name ?? "<unnamed-managed>",
          children: [],
        });
      }
    });
  } else {
    const resourceRefs: K8sReference[] = xr.spec?.resourceRefs ?? [];
    if (Array.isArray(resourceRefs) && resourceRefs.length > 0) {
      resourceRefs.forEach((ref: K8sReference) => {
        const refKey = mkKey(ref.kind, ref.name);
        if (!nextSeen.has(refKey) && !isExcludedKind(ref.kind)) {
          root.children.push({
            resource: ref,
            kind: `${ref.kind} (${ref.apiVersion ?? "n/a"})`,
            title: ref.name,
            children: [],
          });
        }
      });
    }
  }

  return root;
};

const CompositeResourcesPage = () => {
  const [items, setItems] = useState<ItemList<any> | null>(null);
  const [trees, setTrees] = useState<TreeNode[]>([]);
  const [error, setError] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [isDrawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [focused, setFocused] = useState<any | null>(null);

  const compositeCacheRef = useRef<Map<string, CompositeResourceExtended>>(new Map());
  const refreshingKeysRef = useRef<Set<string>>(new Set());
  const loadedKeysRef = useRef<Set<string>>(new Set());
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const bridgeRef = useRef<ItemContext | null>(null);
  if (bridgeRef.current === null) bridgeRef.current = new ItemContext();
  const bridge = bridgeRef.current;

  if (focused) bridge.setCurrent(focused);

  bridge.getGraph = (setter: (d: any) => void, setErrorCb: (e: any) => void) => {
    if (!focused) {
      setErrorCb("No focused resource");
      return;
    }
    const maybeApi = (focused as CompositeResource).apiVersion ? true : false;
    if (maybeApi) {
      const [group, version] = (focused as CompositeResource).apiVersion.split("/");
      apiClient
        .getCompositeResource(group, version, (focused as CompositeResource).kind, (focused as CompositeResource).metadata.name)
        .then((data) => setter(data))
        .catch((err) => setErrorCb(err));
    } else {
      setter(focused);
    }
  };

  const refreshSingleComposite = useCallback(async (resource: any) => {
    if (!resource || !resource.apiVersion || !resource.kind) return null;
    const name = resource.metadata?.name ?? resource.name;
    if (!name) return null;

    const key = mkKey(resource.kind, name);
    const refreshing = refreshingKeysRef.current;
    if (refreshing.has(key)) return null;
    refreshing.add(key);

    try {
      if (!resource.apiVersion.includes("/")) return null;
      const [group, version] = resource.apiVersion.split("/");
      const xr = await apiClient.getCompositeResource(group, version, resource.kind, name) as CompositeResourceExtended;
      compositeCacheRef.current.set(key, xr);
      return { key, xr };
    } catch (err) {
      const placeholder: CompositeResourceExtended = {
        apiVersion: resource.apiVersion ?? "unknown/unknown",
        kind: resource.kind,
        metadata: { name },
        spec: { resourceRefs: [] },
        status: { conditions: [{ type: "Error", status: "True", reason: "FetchFailed", message: String(err) }] },
      } as any;
      compositeCacheRef.current.set(key, placeholder);
      return { key, xr: placeholder };
    } finally {
      refreshing.delete(key);
    }
  }, []);

  const replaceNodeWithXR = useCallback((prevTrees: TreeNode[], targetKey: string, xr: CompositeResourceExtended): TreeNode[] => {
    const cloneAndReplace = (nodes: TreeNode[], ancestors: Set<string>): TreeNode[] => {
      return nodes.map((n) => {
        const res = n.resource;
        const name = res?.metadata?.name ?? res?.name;
        const nodeKey = mkKey(res?.kind, name);
        const nextAncestors = new Set(ancestors);
        if (res?.kind && name) nextAncestors.add(nodeKey);

        if (nodeKey === targetKey) {
          const ancestorsForXR = new Set(ancestors);
          const newNode = buildTreeFromComposite(xr, ancestorsForXR, true);

          const existingChildren = n.children ?? [];
          const newChildren = newNode.children ?? [];

          const newChildKeys = new Set(newChildren.map((c) => {
            const rn = c.resource;
            const rname = rn?.metadata?.name ?? rn?.name ?? c.title;
            const rkind = rn?.kind ?? c.kind;
            return mkKey(rkind, rname);
          }));

          const mergedChildren = [...newChildren];
          for (const ec of existingChildren) {
            const ern = ec.resource;
            const ername = ern?.metadata?.name ?? ern?.name ?? ec.title;
            const erkind = ern?.kind ?? ec.kind;
            const eKey = mkKey(erkind, ername);
            if (!newChildKeys.has(eKey)) {
              mergedChildren.push(ec);
            }
          }

          return { ...newNode, children: mergedChildren };
        }

        const newChildren = n.children && n.children.length > 0 ? cloneAndReplace(n.children, nextAncestors) : n.children;
        if (newChildren !== n.children) return { ...n, children: newChildren };
        return n;
      });
    };

    return cloneAndReplace(prevTrees, new Set<string>());
  }, []);

  const replaceChildrenForKey = useCallback((prevTrees: TreeNode[], targetKey: string, newChildren: TreeNode[]): TreeNode[] => {
    const cloneAndReplace = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map((n) => {
        const res = n.resource;
        const name = res?.metadata?.name ?? res?.name;
        const nodeKey = mkKey(res?.kind, name);

        if (nodeKey === targetKey) {
          return { ...n, children: newChildren };
        }

        const children = n.children && n.children.length > 0 ? cloneAndReplace(n.children) : n.children;
        if (children !== n.children) return { ...n, children };
        return n;
      });
    };
    return cloneAndReplace(prevTrees);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const treesOut: TreeNode[] = [];
      const rootItemsAggregate: any[] = [];

      for (const defKind of DEFINED_COMPOSITE_KINDS) {
        let roots;
        try {
          roots = await apiClient.getCustomResources(defKind.group, defKind.version, defKind.resource);
        } catch (err) {
          console.warn(`Failed to fetch custom resources for ${defKind.group}/${defKind.version} ${defKind.resource}:`, err);
          continue;
        }

        for (const rootItem of roots.items ?? []) {
          const rootNode: TreeNode = {
            resource: rootItem,
            kind: `${rootItem.kind} (${rootItem.apiVersion})`,
            title: rootItem.metadata?.name ?? rootItem.name ?? "<unnamed-root>",
            children: [],
          };

          rootItemsAggregate.push(rootItem);
          if (!isExcludedKind(rootNode.resource?.kind)) treesOut.push(rootNode);
        }
      }

      setItems({ items: rootItemsAggregate } as ItemList<any>);
      setTrees(treesOut);
      // Ensure top-level nodes start collapsed after refresh
      setExpandedKeys(new Set());
      setLastUpdated(new Date());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
    const id = setInterval(() => void fetchAll(), POLL_MS);
    return () => clearInterval(id);
  }, [fetchAll]);

  useEffect(() => {
    let stopped = false;
    const id = setInterval(async () => {
      if (stopped) return;
      const currentTrees = trees;
      if (!currentTrees || currentTrees.length === 0) return;

      const candidates: { resource: any; key: string }[] = [];

      const walk = (nodes: TreeNode[]) => {
        for (const n of nodes) {
          const r = n.resource;
          if (!r) continue;
          const name = r?.metadata?.name ?? r?.name;
          const nodeKey = mkKey(r?.kind, name);
          if (r?.apiVersion && typeof r.apiVersion === "string" && r.apiVersion.includes("/")) {
            const ready = isConditionTrue(r, "Ready");
            if (!ready) candidates.push({ resource: r, key: nodeKey });
          }
          if (n.children && n.children.length > 0) walk(n.children);
        }
      };
      walk(currentTrees);

      if (candidates.length === 0) return;

      for (const c of candidates) {
        if (refreshingKeysRef.current.has(c.key)) continue;
        void (async () => {
          const result = await refreshSingleComposite(c.resource);
          if (!result) return;
          const { key, xr } = result;
          setTrees((prev) => replaceNodeWithXR(prev, key, xr));
          const focusedKey = focused ? mkKey(focused.kind, focused.metadata?.name ?? focused.name) : null;
          if (focusedKey === key) setFocused(xr);
        })();
      }
    }, NON_READY_POLL_MS);

    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [trees, refreshSingleComposite, replaceNodeWithXR, focused]);

  const onExpandNode = useCallback(async (node: TreeNode) => {
    const rootRes = node.resource;
    const rootName = rootRes?.metadata?.name ?? rootRes?.name;
    const rootKey = mkKey(rootRes?.kind, rootName);
    if (!rootRes) return;

    // If already loaded, just expand (ensure expanded state)
    if (loadedKeysRef.current.has(rootKey)) {
      setExpandedKeys((prev) => {
        const next = new Set(prev);
        next.add(rootKey);
        return next;
      });
      return;
    }

    const refs: K8sReference[] = Array.isArray(rootRes.spec?.resourceRefs) ? rootRes.spec.resourceRefs : [];
    if (refs.length === 0) {
      loadedKeysRef.current.add(rootKey);
      setExpandedKeys((prev) => {
        const next = new Set(prev);
        next.add(rootKey);
        return next;
      });
      return;
    }

    const needsFetch = refs.some((ref) => {
      if (!ref || !ref.kind || !ref.name) return false;
      const childKey = mkKey(ref.kind, ref.name);
      const apiVer = ref.apiVersion ?? "";
      return apiVer.includes("/") && !compositeCacheRef.current.has(childKey);
    });

    if (needsFetch) {
      setLoadingKeys((prev) => {
        const next = new Set(prev);
        next.add(rootKey);
        return next;
      });
    }

    const newChildren: TreeNode[] = [];

    try {
      for (const ref of refs) {
        if (!ref || !ref.kind || !ref.name) continue;
        if (isExcludedKind(ref.kind)) continue;

        const childKey = mkKey(ref.kind, ref.name);

        if (compositeCacheRef.current.has(childKey)) {
          const xr = compositeCacheRef.current.get(childKey)!;
          newChildren.push(buildTreeFromComposite(xr, new Set([rootKey]), true));
          continue;
        }

        const apiVer = ref.apiVersion ?? "";
        if (apiVer.includes("/")) {
          const [group, version] = apiVer.split("/");
          try {
            const xr = await apiClient.getCompositeResource(group, version, ref.kind, ref.name) as CompositeResourceExtended;
            compositeCacheRef.current.set(childKey, xr);
            newChildren.push(buildTreeFromComposite(xr, new Set([rootKey]), true));
          } catch (err) {
            const placeholder: CompositeResourceExtended = {
              apiVersion: ref.apiVersion ?? "unknown/unknown",
              kind: ref.kind,
              metadata: { name: ref.name },
              spec: { resourceRefs: [] },
              status: { conditions: [{ type: "Error", status: "True", reason: "FetchFailed", message: String(err) }] },
            } as any;
            compositeCacheRef.current.set(childKey, placeholder);
            newChildren.push(buildTreeFromComposite(placeholder, new Set([rootKey]), true));
          }
        } else {
          newChildren.push({
            resource: ref,
            kind: `${ref.kind} (${ref.apiVersion ?? "n/a"})`,
            title: ref.name,
            children: [],
          });
        }
      }

      setTrees((prev) => replaceChildrenForKey(prev, rootKey, newChildren));
      loadedKeysRef.current.add(rootKey);

      // ensure expanded after children are loaded
      setExpandedKeys((prev) => {
        const next = new Set(prev);
        next.add(rootKey);
        return next;
      });
    } finally {
      if (needsFetch) {
        setLoadingKeys((prev) => {
          const next = new Set(prev);
          next.delete(rootKey);
          return next;
        });
      }
    }
  }, [replaceChildrenForKey]);

  const onItemClick = (resource: any) => {
    setFocused(resource);
    setDrawerOpen(true);
  };

  const onCloseDrawer = () => {
    setDrawerOpen(false);
    setFocused(null);
  };

  if (error) {
    return (
      <>
        <HeaderBar title="Composite Resources" />
        <PageBody>
          <Alert severity="error">Failed: {String(error)}</Alert>
        </PageBody>
      </>
    );
  }

  if (!items || loading) {
    return (
      <>
        <HeaderBar title="Composite Resources" />
        <PageBody>
          <LinearProgress />
        </PageBody>
      </>
    );
  }

  const filteredTrees = searchQuery
    ? trees.filter((t) => (t.title ?? "").toLowerCase().includes(searchQuery.toLowerCase()))
    : trees;

  type TreeNodeViewProps = { node: TreeNode; level?: number; };

  const TreeNodeView: React.FC<TreeNodeViewProps> = ({ node, level = 0 }) => {
    const { resource, kind, title } = node;
    if (isExcludedKind(resource?.kind)) return null;

    const name = resource?.metadata?.name ?? resource?.name;
    const key = mkKey(resource?.kind, name);

    const hasLazyChildren = Array.isArray(resource?.spec?.resourceRefs) && resource.spec.resourceRefs.length > 0;
    const visibleChildren = node.children.filter(c => !isExcludedKind(c.resource?.kind));

    const expanded = expandedKeys.has(key);
    const isLoading = loadingKeys.has(key);

    const handleToggle = async () => {
      const next = !expanded;
      if (next) {
        // set expanded immediately so Collapse opens (prevents having to close/reopen)
        setExpandedKeys((prev) => {
          const nextSet = new Set(prev);
          nextSet.add(key);
          return nextSet;
        });

        if (hasLazyChildren && visibleChildren.length === 0) {
          await onExpandNode(node);
        }
      } else {
        setExpandedKeys((prev) => {
          const nextSet = new Set(prev);
          nextSet.delete(key);
          return nextSet;
        });
      }
    };

    return (
      <Box sx={{ ml: level * 3, mt: 1 }}>
        <Paper variant="outlined" sx={{ p: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center">
              <Box>
                <Typography variant={level === 0 ? "subtitle1" : "body1"} sx={{ fontWeight: level === 0 ? 700 : 600 }}>
                  {kind}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {title}
                </Typography>
              </Box>
              <StatusChips resource={resource} />
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Button size="small" variant="outlined" startIcon={<InfoIcon />} onClick={() => onItemClick(resource)}>
                Details
              </Button>

              {(visibleChildren.length > 0 || hasLazyChildren) && (
                <IconButton size="small" onClick={handleToggle} aria-label={expanded ? "collapse" : "expand"} aria-expanded={expanded}>
                  {/* Correct icon mapping: when expanded -> show ExpandLess (collapse icon), when collapsed -> show ExpandMore */}
                  {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              )}
            </Stack>
          </Stack>

          {hasLazyChildren && visibleChildren.length === 0 && !isLoading && (
            <Box sx={{ mt: 1, ml: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Click expand to load {resource.spec.resourceRefs.length} child(ren)...
              </Typography>
            </Box>
          )}

          <Collapse in={expanded}>
            <Box sx={{ mt: 1 }}>
              {isLoading && visibleChildren.length === 0 ? (
                <Box sx={{ ml: 2 }}>
                  <Paper variant="outlined" sx={{ p: 1, display: "flex", alignItems: "center", gap: 1 }}>
                    <CircularProgress size={18} />
                    <Typography variant="body2" color="text.secondary">Loading child(ren)...</Typography>
                  </Paper>
                </Box>
              ) : visibleChildren.length > 0 ? (
                <Box sx={{ mt: 1 }}>
                  {visibleChildren.map((child) => {
                    const childRes = child.resource;
                    const childName = childRes?.metadata?.name ?? childRes?.name ?? child.title;
                    const childKind = childRes?.kind ?? child.kind;
                    const childKey = mkKey(childKind, childName);
                    return <TreeNodeView key={childKey} node={child} level={level + 1} />;
                  })}
                </Box>
              ) : null}
            </Box>
          </Collapse>
        </Paper>
      </Box>
    );
  };

  return (
    <>
      <HeaderBar title="Composite Resources" />
      <PageBody>
        <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
          <Chip sx={{ p: 0 }} label={loading ? "syncing" : "synced"} icon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />} />
          <Input className="w-full" type="text" placeholder="Search by name" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          <Box sx={{ flex: "0 0 auto" }}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void fetchAll()} disabled={loading}>Refresh</Button>
          </Box>
        </Stack>

        <Stack spacing={2}>
          {filteredTrees.length === 0 ? (
            <Typography>No composite resources found.</Typography>
          ) : (
            filteredTrees.map((t) => {
              const tRes = t.resource;
              const tName = tRes?.metadata?.name ?? tRes?.name ?? t.title;
              const tKind = tRes?.kind ?? t.kind;
              const tKey = mkKey(tKind, tName);
              return (
                <Box key={tKey}>
                  <TreeNodeView node={t} level={0} />
                </Box>
              );
            })
          )}
        </Stack>

        <InfoDrawer key={focused ? mkKey(focused.kind, focused.metadata?.name ?? focused.name) : "infodrawer"} isOpen={isDrawerOpen} onClose={onCloseDrawer}
          type={focused?.kind ? "Composite Resource" : "Resource"}
          title={focused ? (<>{focused.metadata?.name ?? focused.name ?? "Details"}<Box sx={{ ml: 1, display: "inline-block" }}>{focused?.status && <ConditionChips status={focused.status ?? {}} />}</Box></>) : "Details"}>
          <InfoTabs bridge={bridge} initial="yaml" />
        </InfoDrawer>
      </PageBody>
    </>
  );
};

export default CompositeResourcesPage;