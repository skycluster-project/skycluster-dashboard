// ProviderProfilesList.tsx
import InfoIcon from '@mui/icons-material/Info';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Stack,
  Card,
  Chip,
  CardContent,
  Grid,
  Box,
  Typography,
  CircularProgress,
  Divider,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem as MUIListItem,
  ListItemText
} from '@mui/material';
import ReadySynced from "./ReadySynced.tsx";
import { useState } from "react";
import InfoTabs, { ItemContext } from "./InfoTabs.tsx";
import ConditionChips from "./ConditionChips.tsx";
import InfoDrawer from "./InfoDrawer.tsx";
import { useNavigate, useParams } from "react-router-dom";
import apiClient from "../api.ts";
import { ProviderProfile, ItemList, K8sResource, ImageOffering, InstanceOffering } from "../types.ts";

type ItemProps = {
  item: ProviderProfile;
  onItemClick: { (item: ProviderProfile): void }
};

function shortText(val: any, fallback = "") {
  if (!val && val !== 0) return fallback;
  if (typeof val === "string") return val;
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

function groupByZone<T extends { zone?: string }>(items?: T[]) {
  const map = new Map<string, T[]>();
  if (!items) return map;
  for (const it of items) {
    const zone = (it.zone && it.zone !== "") ? it.zone : "unknown";
    if (!map.has(zone)) map.set(zone, []);
    map.get(zone)!.push(it);
  }
  return map;
}

/**
 * Parse a price value into a number for accurate sorting.
 * Non-numeric or missing values are treated as Infinity so they sort last.
 */
function parsePriceValue(val: any): number {
  if (val === null || val === undefined) return Infinity;
  // If it's already a number, return it
  if (typeof val === "number") {
    return isFinite(val) ? val : Infinity;
  }
  // Try to coerce strings like "0.12" or "$0.12" to numbers
  const cleaned = String(val).replace(/[^\d.\-]/g, "");
  const n = Number(cleaned);
  return isFinite(n) ? n : Infinity;
}

/**
 * Compare two InstanceOffering entries by price (ascending), then by spot price.
 * Offerings without a spot price will sort after those with a spot price.
 */
function compareInstanceOfferings(a: InstanceOffering, b: InstanceOffering): number {
  const aPrice = parsePriceValue(a.price);
  const bPrice = parsePriceValue(b.price);
  if (aPrice < bPrice) return -1;
  if (aPrice > bPrice) return 1;
  
  const aSpot = parsePriceValue(a.spot?.price);
  const bSpot = parsePriceValue(b.spot?.price);
  if (aSpot < bSpot) return -1;
  if (aSpot > bSpot) return 1;

  // As a final tiebreaker, compare by name (stable)
  const aName = (a.nameLabel ?? a.name ?? "").toString();
  const bName = (b.nameLabel ?? b.name ?? "").toString();
  return aName.localeCompare(bName);
}

/**
 * CompactList
 * Renders up to `max` items using the provided `renderItem` function.
 * renderItem should return the inner content (not an <MUIListItem />) because
 * CompactList will wrap it into <MUIListItem>.
 */
function CompactList({ items, renderItem, max = 3 }: { items?: any[]; renderItem: (it: any, idx: number) => JSX.Element; max?: number }) {
  if (!items || items.length === 0) {
    return <Typography variant="body2" color="text.secondary">—</Typography>;
  }
  const toShow = items.slice(0, max);
  return (
    <List dense>
      {toShow.map((it, idx) => <MUIListItem key={idx}>{renderItem(it, idx)}</MUIListItem>)}
      {items.length > max && <MUIListItem>
        <Typography variant="body2" color="text.secondary">{items.length - max} more…</Typography>
      </MUIListItem>}
    </List>
  );
}

/**
 * InstanceOfferingView
 * Modular component that renders the contents for an InstanceOffering.
 * It renders the same style whether used in compact or expanded views.
 * Return value is suitable to be placed inside a <MUIListItem>.
 */
function InstanceOfferingView({ offering }: { offering: InstanceOffering }) {
  const name = offering.nameLabel ?? offering.name ?? shortText(offering);

  return (
    <ListItemText
      primary={name}
      secondary={
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 0.3, flexWrap: 'wrap' }}>
          {/* On-Demand Price */}
          {offering.price ? (
            <Box
              component="span"
              sx={{
                px: 1, py: 0.2, borderRadius: "999px",
                bgcolor: "#f1be47", color: "black", fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              {offering.price} $/h
            </Box>
          ) : (
            <Box component="span" sx={{ fontSize: "0.75rem", opacity: 0.7 }}>
              -
            </Box>
          )}

          {/* Separator */}
          <Box component="span" sx={{ opacity: 0.6, fontSize: "0.75rem" }}>
            |
          </Box>

          {/* SPOT Label */}
          <Box component="span" sx={{ opacity: 0.7, fontSize: "0.75rem" }}>
            SPOT:
          </Box>

          {/* SPOT Price */}
          <Box
            component="span"
            sx={{
              px: 1, py: 0.2, borderRadius: "999px",
              bgcolor: offering.spot?.price ? "#8ed1eb" : "grey.500", color: "black",
              fontSize: "0.75rem", fontWeight: 600,
            }}
          >
            {offering.spot?.price ? `${offering.spot.price} $/h` : "-"}
          </Box>

          {/* Optional technical specs */}
          {(offering.vcpus || offering.ram) && (
            <Box component="span" sx={{ marginLeft: 1, fontSize: "0.8rem", color: "text.secondary" }}>
              {offering.vcpus ? `${offering.vcpus} vCPU` : ""}{offering.vcpus && offering.ram ? " • " : ""}{offering.ram ?? ""}
            </Box>
          )}
        </Box>
      }
    />
  );
}

function ZoneBlockCompact({
  zone,
  images,
  instanceOfferings,
  showAllImages,
  showAllInstances,
  onToggleImages,
  onToggleInstances
}: {
  zone: string;
  images?: ImageOffering[];
  instanceOfferings?: InstanceOffering[];
  showAllImages: boolean;
  showAllInstances: boolean;
  onToggleImages: () => void;
  onToggleInstances: () => void;
}) {
  const small = 3;

  // Sort instance offerings by spot price then demand price
  const sortedInstances = (instanceOfferings || []).slice().sort(compareInstanceOfferings);

  return (
    <Box sx={{ mt: 1, mb: 1 }}>

      <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Images</Typography>
          {showAllImages ? (
            <List dense>
              {(images || []).map((img, idx) => {
                const primary = [img.nameLabel, img.name].filter(Boolean).join(' — ');
                const gen = img.generation ? ` (${img.generation})` : "";
                return (
                  <MUIListItem key={idx}>
                    <ListItemText
                      primary={primary + gen}
                      secondary={img.pattern ? String(img.pattern) : undefined}
                    />
                  </MUIListItem>
                );
              })}
            </List>
          ) : (
            <CompactList items={images} max={small} renderItem={(img: ImageOffering, idx: number) => {
              const label = [img.nameLabel, img.name].filter(Boolean).join(' — ');
              const gen = img.generation ? ` (${img.generation})` : "";
              return <ListItemText primary={label + gen} secondary={img.pattern ? String(img.pattern) : undefined} />;
            }} />
          )}
          {images && images.length > small && (
            <Button size="small" onClick={onToggleImages}>
              {showAllImages ? "Show less" : `Show all (${images.length})`}
            </Button>
          )}
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary">Instance offerings</Typography>
          {showAllInstances ? (
            <List dense>
              {sortedInstances.map((it, idx) => {
                return (
                  <MUIListItem key={idx}>
                    {/* Use the modular InstanceOfferingView inside the list item */}
                    <InstanceOfferingView offering={it} />
                  </MUIListItem>
                );
              })}
            </List>
          ) : (
            <CompactList items={sortedInstances} max={small} renderItem={(it: InstanceOffering, idx: number) => {
              // CompactList will wrap this returned element in <MUIListItem />
              // We return the SAME InstanceOfferingView so collapsed and expanded
              // sections have identical style and format.
              return <InstanceOfferingView offering={it} />;
            }} />
          )}
          {instanceOfferings && instanceOfferings.length > small && (
            <Button size="small" onClick={onToggleInstances}>
              {showAllInstances ? "Show less" : `Show all (${instanceOfferings.length})`}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function ListItem({ item: initialItem, onItemClick }: ItemProps) {
  const [item] = useState<ProviderProfile>(initialItem);
  const [deps, setDeps] = useState<{ images?: ImageOffering[], instanceTypes?: InstanceOffering[] } | null>(() => {
    if (initialItem.dependencies) {
      return {
        images: (initialItem.dependencies.images as unknown) as ImageOffering[] | undefined,
        instanceTypes: (initialItem.dependencies.instanceTypes as unknown) as InstanceOffering[] | undefined,
      };
    }
    return null;
  });
  const [loadingDeps, setLoadingDeps] = useState<boolean>(false);

  // per-zone UI state: expanded accordions and "show all" toggles per zone/column
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({});
  const [showAllImages, setShowAllImages] = useState<Record<string, boolean>>({});
  const [showAllInstances, setShowAllInstances] = useState<Record<string, boolean>>({});

  const loadDeps = async (force = false) => {
    if (deps && !force) return;
    setLoadingDeps(true);
    try {
      const apiParts = (item.apiVersion || "").split("/");
      const group = apiParts[0] || "core.skycluster.io";
      const version = apiParts[1] || "v1alpha1";
      const kind = item.kind || "ProviderProfile";
      const name = item.metadata.name;

      const res = await apiClient.getProviderProfile(group, version, kind, name);
      setDeps({
        images: (res.dependencies?.images as unknown) as ImageOffering[] ?? [],
        instanceTypes: (res.dependencies?.instanceTypes as unknown) as InstanceOffering[] ?? []
      });
      // reset UI toggles so first view stays concise
      setExpandedZones({});
      setShowAllImages({});
      setShowAllInstances({});
    } catch (err) {
      console.error("Failed to load deps for provider", item.metadata.name, err);
    } finally {
      setLoadingDeps(false);
    }
  };

  const imagesByZone = groupByZone(deps?.images);
  const instancesByZone = groupByZone(deps?.instanceTypes);

  const zonesSet = new Set<string>();
  for (const k of imagesByZone.keys()) zonesSet.add(k);
  for (const k of instancesByZone.keys()) zonesSet.add(k);
  const zones = Array.from(zonesSet).sort((a, b) => {
    if (a === "unknown") return 1;
    if (b === "unknown") return -1;
    return a.localeCompare(b);
  });

  const toggleZone = (zone: string) => {
    setExpandedZones(prev => ({ ...prev, [zone]: !prev[zone] }));
  };

  const toggleShowAllImages = (zone: string) => {
    setShowAllImages(prev => ({ ...prev, [zone]: !prev[zone] }));
  };

  const toggleShowAllInstances = (zone: string) => {
    setShowAllInstances(prev => ({ ...prev, [zone]: !prev[zone] }));
  };

  return (
    <Grid item sx={{ mb: 1 }} m={1} xs={12} md={12} key={item.apiVersion + item.kind + item.metadata.name}>
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'row', p: 0, m: 0, justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6">{item.metadata.name}</Typography>
              <Typography variant="body2" color="text.secondary">{item.spec?.description ?? ""}</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ReadySynced status={item.status ? item.status : {}} />
              <>
                <Chip icon={<InfoIcon />} label="Details" variant="outlined" color="info"
                  onClick={() => onItemClick(item)} />
              </>
            </Box>
          </Box>

          <Typography variant="body2" sx={{ mt: 1 }}>Kind: {item.kind}</Typography>

          {deps ? (
            zones.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No dependency data</Typography>
            ) : (
              <Box sx={{ mt: 1 }}>
                <Divider sx={{ mb: 1 }} />
                {zones.map(zone => (
                  <Accordion key={zone} expanded={!!expandedZones[zone]} onChange={() => toggleZone(zone)}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%', justifyContent: 'space-between' }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle2">{zone}</Typography>
                          <Chip label={`Images: ${imagesByZone.get(zone)?.length ?? 0}`} size="small" />
                          <Chip label={`Offerings: ${instancesByZone.get(zone)?.length ?? 0}`} size="small" />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          { (imagesByZone.get(zone)?.length ?? 0) + (instancesByZone.get(zone)?.length ?? 0) } items
                        </Typography>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <ZoneBlockCompact
                        zone={zone}
                        images={imagesByZone.get(zone)}
                        instanceOfferings={instancesByZone.get(zone)}
                        showAllImages={!!showAllImages[zone]}
                        showAllInstances={!!showAllInstances[zone]}
                        onToggleImages={() => toggleShowAllImages(zone)}
                        onToggleInstances={() => toggleShowAllInstances(zone)}
                      />
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )
          ) : (
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">Dependencies not loaded. Press "Load deps" to fetch.</Typography>
              <Button size="small" onClick={() => loadDeps(false)} disabled={loadingDeps}>
                {loadingDeps ? <CircularProgress size={16} /> : "Load deps"}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Grid>
  );
}

type ItemListProps = {
  items: ItemList<ProviderProfile> | undefined;
};

export default function ProviderProfilesList({ items }: ItemListProps) {
  const { name: focusedName } = useParams();
  const [isDrawerOpen, setDrawerOpen] = useState<boolean>(focusedName != undefined);
  const nullFocused = { metadata: { name: "" }, kind: "", apiVersion: "" } as K8sResource;
  const [focused, setFocused] = useState<K8sResource>(nullFocused);
  const navigate = useNavigate();

  const onClose = () => {
    setDrawerOpen(false)
    setFocused(nullFocused)
    navigate("/providerprofiles", { state: focused })
  }

  const onItemClick = (item: K8sResource) => {
    setFocused(item)
    setDrawerOpen(true)
    navigate(
      "./" + item.apiVersion + "/" + item.metadata.name,
      { state: item }
    );
  }

  if (!items || !items.items.length) {
    return (
      <Typography variant="h6">No items</Typography>
    )
  }

  if (!focused.metadata.name && focusedName) {
    items?.items?.forEach((item) => {
      if (focusedName == item.metadata.name) {
        setFocused(item)
      }
    })
  }

  // Bridge used by InfoTabs to fetch full details when needed
  const bridge = new ItemContext()
  bridge.setCurrent(focused)

  return (
    <>
      <Grid container>
        {items.items.map((item: ProviderProfile) => (
          <ListItem item={item} key={item.metadata.name} onItemClick={(i) => onItemClick(i)} />
        ))}
      </Grid>

      <InfoDrawer
        key={focused.metadata.name}
        isOpen={isDrawerOpen}
        onClose={onClose}
        type="Provider Profile"
        title={<>{focused.metadata.name}<ConditionChips status={focused.status ? focused.status : {}}/></>}>
        <InfoTabs bridge={bridge} initial="yaml"></InfoTabs>
      </InfoDrawer>
    </>
  );
}