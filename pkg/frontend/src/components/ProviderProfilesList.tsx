// ProviderProfilesList.tsx
import InfoIcon from '@mui/icons-material/Info';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {Stack, Card, Chip, CardContent, Grid, Box, Typography, CircularProgress, Divider, Button, Accordion, AccordionSummary, AccordionDetails, List, ListItem as MUIListItem, ListItemText} from '@mui/material';
import ReadySynced from "./ReadySynced.tsx";
import { useState } from "react";
import InfoTabs, {ItemContext} from "./InfoTabs.tsx";
import ConditionChips from "./ConditionChips.tsx";
import InfoDrawer from "./InfoDrawer.tsx";
import {useNavigate, useParams} from "react-router-dom";
import apiClient from "../api.ts";
import {ProviderProfile, ItemList, K8sResource, ImageOffering, InstanceOffering} from "../types.ts";

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
  return (
    <Box sx={{ mt: 1, mb: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle2">{zone}</Typography>
          <Chip label={`Images: ${images?.length ?? 0}`} size="small" />
          <Chip label={`Offerings: ${instanceOfferings?.length ?? 0}`} size="small" />
        </Stack>
      </Stack>

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
              {(instanceOfferings || []).map((it, idx) => {
                const name = it.nameLabel ?? it.name ?? shortText(it);
                const specs = `${it.vcpus ? `${it.vcpus} vCPU` : ""}${it.ram ? ` ${it.ram}` : ""}${it.price ? ` • ${it.price}` : ""}`;
                return (
                  <MUIListItem key={idx}>
                    <ListItemText primary={`${name}`} secondary={specs} />
                  </MUIListItem>
                );
              })}
            </List>
          ) : (
            <CompactList items={instanceOfferings} max={small} renderItem={(it: InstanceOffering, idx: number) => {
              const name = it.nameLabel ?? it.name ?? shortText(it);
              const specs = `${it.vcpus ? `${it.vcpus} vCPU` : ""}${it.ram ? ` ${it.ram}` : ""}${it.price ? ` • ${it.price}$/h` : ""}`;
              return <ListItemText primary={`${name}`} secondary={specs} />;
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

function ListItem({item: initialItem, onItemClick}: ItemProps) {
  const [item] = useState<ProviderProfile>(initialItem);
  const [deps, setDeps] = useState<{images?: ImageOffering[], instanceTypes?: InstanceOffering[]}|null>(() => {
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
  const zones = Array.from(zonesSet).sort((a,b) => {
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
    <Grid item sx={{mb: 1}} m={1} xs={12} md={12} key={item.apiVersion + item.kind + item.metadata.name}>
      <Card variant="outlined">
        <CardContent>
          <Box sx={{display: 'flex', flexDirection: 'row', p: 0, m: 0, justifyContent: 'space-between', alignItems: 'center'}}>
            <Box>
              <Typography variant="h6">{item.metadata.name}</Typography>
              <Typography variant="body2" color="text.secondary">{item.spec?.description ?? ""}</Typography>
            </Box>

            <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
              <ReadySynced status={item.status ? item.status : {}} />
              <>
                <Chip icon={<InfoIcon />} label="Details" variant="outlined" color="info"
                  onClick={() => onItemClick(item)} />
              </>
            </Box>
          </Box>

          <Typography variant="body2" sx={{mt: 1}}>Kind: {item.kind}</Typography>

          {deps ? (
            zones.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{mt:1}}>No dependency data</Typography>
            ) : (
              <Box sx={{ mt: 1 }}>
                <Divider sx={{ mb: 1 }} />
                {zones.map(zone => (
                  <Accordion key={zone} expanded={!!expandedZones[zone]} onChange={() => toggleZone(zone)}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{width: '100%', justifyContent: 'space-between'}}>
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
            <Typography variant="body2" color="text.secondary" sx={{mt:1}}>Dependencies not loaded. Press "Load deps" to fetch.</Typography>
          )}
        </CardContent>
      </Card>
    </Grid>
  );
}

type ItemListProps = {
  items: ItemList<ProviderProfile> | undefined;
};

export default function ProviderProfilesList({items}: ItemListProps) {
  const {name: focusedName} = useParams();
  const [isDrawerOpen, setDrawerOpen] = useState<boolean>(focusedName != undefined);
  const nullFocused = {metadata: {name: ""}, kind: "", apiVersion: ""} as K8sResource;
  const [focused, setFocused] = useState<K8sResource>(nullFocused);
  const navigate = useNavigate();

  const onClose = () => {
    setDrawerOpen(false)
    setFocused(nullFocused)
    navigate("/providerprofiles", {state: focused})
  }

  const onItemClick = (item: K8sResource) => {
    setFocused(item)
    setDrawerOpen(true)
    navigate(
      "./" + item.apiVersion + "/" + item.metadata.name,
      {state: item}
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