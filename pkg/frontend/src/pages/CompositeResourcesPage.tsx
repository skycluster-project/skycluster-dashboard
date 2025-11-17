// src/pages/CompositeResourcesPage.tsx
import React, { useCallback, useEffect, useState } from "react";
import apiClient from "../api.ts";
import {
  CompositeResource,
  CompositeResourceExtended,
  ItemList,
  K8sResource,
  K8sReference,
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

const DEFINED_COMPOSITE_KINDS = [
  // { group: "skycluster.io", version: "v1alpha1", resource: "xsetups" },
  { group: "skycluster.io", version: "v1alpha1", resource: "xinstances" },
  { group: "skycluster.io", version: "v1alpha1", resource: "xproviders" },
  { group: "skycluster.io", version: "v1alpha1", resource: "xkubes" },
  { group: "skycluster.io", version: "v1alpha1", resource: "xkubemeshes" },
];

type TreeNode = {
  resource: any; // can be CompositeResourceExtended, composition object, managed resource, claim, root object, reference, etc.
  kind: string;
  title: string;
  children: TreeNode[];
};

const mkKey = (kind: string, name?: string) => `${kind}|${name ?? "<unnamed>"}`;

const isConditionTrue = (res: any | undefined, type: string) =>
  (res?.status?.conditions ?? []).some((c: any) => c.type === type && c.status === "True");

const StatusChips: React.FC<{ resource: any }> = ({ resource }) => {
  const ready = isConditionTrue(resource, "Ready");
  const synced = isConditionTrue(resource, "Synced");
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Chip
        size="small"
        label={ready ? "Ready" : "Not Ready"}
        color={ready ? "success" : "default"}
      />
      <Chip
        size="small"
        label={synced ? "Synced" : "Not Synced"}
        color={synced ? "info" : "default"}
      />
    </Stack>
  );
};

// Exclude providerconfig and Composition (case-insensitive)
const isExcludedKind = (kind?: string) => {
  if (!kind) return false;
  const k = kind.toLowerCase();
  return k === "providerconfig" || k === "composition";
};

type TreeNodeViewProps = {
  node: TreeNode;
  level?: number;
  onItemClick: (r: any) => void;
};

const TreeNodeView: React.FC<TreeNodeViewProps> = ({ node, level = 0, onItemClick }) => {
  const [open, setOpen] = useState<boolean>(level < 1);
  const { resource, kind, title } = node;

  // hide nodes whose resource kind is excluded
  if (isExcludedKind(resource?.kind)) return null;

  // small header + status + details button + expand control
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
            <Button
              size="small"
              variant="outlined"
              startIcon={<InfoIcon />}
              onClick={() => onItemClick(resource)}
            >
              Details
            </Button>

            {node.children.filter(c => !isExcludedKind(c.resource?.kind)).length > 0 && (
              <IconButton size="small" onClick={() => setOpen((v) => !v)} aria-label="toggle children">
                {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            )}
          </Stack>
        </Stack>

        <Collapse in={open}>
          <Box sx={{ mt: 1 }}>
            {/* children */}
            {node.children.length > 0 && (
              <Box sx={{ mt: 1 }}>
                {node.children
                  .filter(child => !isExcludedKind(child.resource?.kind))
                  .map((child) => (
                    <TreeNodeView
                      key={mkKey(child.kind, child.resource?.metadata?.name ?? child.title)}
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

/**
 * Build a TreeNode from a composite extended object.
 * To prevent cycles (e.g., root appearing as a child of its referenced composites),
 * pass a 'seen' Set of keys (kind|name) representing ancestors. Any child matching
 * a key in 'seen' will be skipped.
 */
const buildTreeFromComposite = (xr: CompositeResourceExtended, seen: Set<string> = new Set()): TreeNode => {
  const rootKey = mkKey(xr.kind, xr.metadata?.name);
  // If this node is already in the seen set, return a minimal placeholder to avoid cycles.
  if (seen.has(rootKey)) {
    return {
      resource: xr,
      kind: `${xr.kind} (${xr.apiVersion})`,
      title: xr.metadata?.name ?? "<unnamed>",
      children: [],
    };
  }

  // Mark this node as seen for descendants
  const nextSeen = new Set(seen);
  nextSeen.add(rootKey);

  // root node
  const root: TreeNode = {
    resource: xr,
    kind: `${xr.kind} (${xr.apiVersion})`,
    title: xr.metadata?.name ?? "<unnamed>",
    children: [],
  };

  // claim (if present) - keep unless its kind is excluded
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

  // parentXR (if present)
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

  // composition (composition object is included in the extended XR response)
  if ((xr as any).composition) {
    const comp = (xr as any).composition;
    if (!isExcludedKind(comp?.kind)) {
      const compNode: TreeNode = {
        resource: comp,
        kind: `Composition (${comp.apiVersion ?? "n/a"})`,
        title: comp.metadata?.name ?? (xr.spec?.compositionRef?.name ?? "composition"),
        children: [],
      };

      // If composition has composedTemplates or resources, present them as children
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
    // composition missing but compositionRef exists — show ref as placeholder
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

  // managedResources: these are typically full objects included in the extended XR response
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
    // optionally, if resourceRefs exist in spec, show them as placeholders
    const resourceRefs = xr.spec?.resourceRefs ?? [];
    if (Array.isArray(resourceRefs) && resourceRefs.length > 0) {
      resourceRefs.forEach((ref: K8sReference) => {
        const refKey = mkKey(ref.kind, ref.name);
        if (!nextSeen.has(refKey) && !isExcludedKind(ref.kind)) {
          root.children.push({
            resource: ref,
            kind: `${ref.kind} (${ref.apiVersion})`,
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
  // items now represent the "root" custom resources (e.g., xsetups)
  const [items, setItems] = useState<ItemList<any> | null>(null);
  const [trees, setTrees] = useState<TreeNode[]>([]);
  const [error, setError] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Drawer/Details state
  const [isDrawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [focused, setFocused] = useState<any | null>(null);
  const bridge = new ItemContext();
  if (focused) bridge.setCurrent(focused);

  bridge.getGraph = (setter: (d: any) => void, setErrorCb: (e: any) => void) => {
    if (!focused) {
      setErrorCb("No focused resource");
      return;
    }
    // If focused is a CompositeResource, fetch extended form for graph; otherwise just pass focused
    const maybeApi = (focused as CompositeResource).apiVersion ? true : false;
    if (maybeApi) {
      const [group, version] = (focused as CompositeResource).apiVersion.split("/");
      apiClient
        .getCompositeResource(group, version, (focused as CompositeResource).kind, (focused as CompositeResource).metadata.name)
        .then((data) => {
          // For the drawer graph we just pass the extended composite as-is (InfoTabs will render)
          setter(data);
        })
        .catch((err) => setErrorCb(err));
    } else {
      setter(focused);
    }
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const treesOut: TreeNode[] = [];
      const rootItemsAggregate: any[] = [];

      // Cache fetched composite objects by key (kind|name) to avoid duplicate network calls.
      // We cache the CompositeResourceExtended (or placeholder) and build TreeNodes from it per-root,
      // passing ancestor 'seen' sets so the same composite won't re-include a root as a child.
      const fetchedComposites = new Map<string, CompositeResourceExtended>();

      for (const defKind of DEFINED_COMPOSITE_KINDS) {
        let roots;
        try {
          roots = await apiClient.getCustomResources(defKind.group, defKind.version, defKind.resource);
        } catch (err) {
          console.warn(`Failed to fetch custom resources for ${defKind.group}/${defKind.version} ${defKind.resource}:`, err);
          continue;
        }

        for (const rootItem of roots.items ?? []) {
          // Build a root node representing the custom root resource (e.g., an XSetup)
          const rootNode: TreeNode = {
            resource: rootItem,
            kind: `${rootItem.kind} (${rootItem.apiVersion})`,
            title: rootItem.metadata?.name ?? rootItem.name ?? "<unnamed-root>",
            children: [],
          };

          // Collect root item for items state
          rootItemsAggregate.push(rootItem);

          // If the root has spec.resourceRefs, attach them as children of this root node
          const resourceRefs: K8sReference[] = rootItem.spec?.resourceRefs ?? [];
          if (Array.isArray(resourceRefs) && resourceRefs.length > 0) {
            // prepare an ancestor set so descendants don't include this root back
            const rootKey = mkKey(rootItem.kind, rootItem.metadata?.name ?? rootItem.name);
            const ancestorSet = new Set<string>();
            ancestorSet.add(rootKey);

            for (const ref of resourceRefs) {
              if (!ref || !ref.kind || !ref.name) continue;

              if (isExcludedKind(ref.kind)) continue;

              const childKey = mkKey(ref.kind, ref.name);

              // If we've already fetched the composite object, reuse it but build the tree with current ancestor set
              if (fetchedComposites.has(childKey)) {
                const xr = fetchedComposites.get(childKey)!;
                const xrNode = buildTreeFromComposite(xr, new Set(ancestorSet));
                rootNode.children.push(xrNode);
                continue;
              }

              // If the ref has an apiVersion with group/version, try to fetch the extended composite
              const apiVer = ref.apiVersion ?? "";
              if (apiVer.includes("/")) {
                const [group, version] = apiVer.split("/");
                try {
                  const xr = await apiClient.getCompositeResource(group, version, ref.kind, ref.name) as CompositeResourceExtended;
                  // cache the fetched composite
                  fetchedComposites.set(childKey, xr);
                  // build the node while preventing cycles back to this root
                  const xrNode = buildTreeFromComposite(xr, new Set(ancestorSet));
                  rootNode.children.push(xrNode);
                } catch (err) {
                  // Create placeholder node with error status if fetching fails
                  const placeholder: CompositeResourceExtended = {
                    apiVersion: ref.apiVersion ?? "unknown/unknown",
                    kind: ref.kind,
                    metadata: { name: ref.name },
                    spec: { resourceRefs: [] },
                    status: { conditions: [{ type: "Error", status: "True", reason: "FetchFailed", message: String(err) }] },
                  } as any;
                  fetchedComposites.set(childKey, placeholder);
                  const phNode = buildTreeFromComposite(placeholder, new Set(ancestorSet));
                  rootNode.children.push(phNode);
                }
              } else {
                // No apiVersion given on the reference — treat as a placeholder child
                const placeholderChild: TreeNode = {
                  resource: ref,
                  kind: `${ref.kind} (${ref.apiVersion ?? "n/a"})`,
                  title: ref.name,
                  children: [],
                };
                rootNode.children.push(placeholderChild);
              }
            }
          }

          // Add this constructed root node to the output
          if (!isExcludedKind(rootNode.resource?.kind)) {
            treesOut.push(rootNode);
          }
        }
      }

      setItems({ items: rootItemsAggregate } as ItemList<any>);
      setTrees(treesOut);
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

  return (
    <>
      <HeaderBar title="Composite Resources" />
      <PageBody>
        <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
          <Chip sx={{ p: 0 }} label={loading ? "syncing" : "synced"} icon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />} />
          <Input
            className="w-full"
            type="text"
            placeholder="Search by name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Box sx={{ flex: "0 0 auto" }}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void fetchAll()} disabled={loading}>
              Refresh
            </Button>
          </Box>
        </Stack>

        <Stack spacing={2}>
          {filteredTrees.length === 0 ? (
            <Typography>No composite resources found.</Typography>
          ) : (
            filteredTrees.map((t) => (
              <Box key={mkKey(t.kind, t.title)}>
                <TreeNodeView node={t} onItemClick={onItemClick} level={0} />
              </Box>
            ))
          )}
        </Stack>

        <InfoDrawer
          key={focused?.metadata?.name ?? "infodrawer"}
          isOpen={isDrawerOpen}
          onClose={onCloseDrawer}
          type={focused?.kind ? "Composite Resource" : "Resource"}
          title={focused ? (
            <>
              {focused.metadata?.name ?? focused.name ?? "Details"}
              <Box sx={{ ml: 1, display: "inline-block" }}>
                {focused?.status && <ConditionChips status={focused.status ?? {}} />}
              </Box>
            </>
          ) : "Details"}
        >
          <InfoTabs bridge={bridge} initial="yaml" />
        </InfoDrawer>
      </PageBody>
    </>
  );
};

export default CompositeResourcesPage;