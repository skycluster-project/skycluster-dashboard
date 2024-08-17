import { ExpandMore as ExpandMoreIcon} from '@mui/icons-material';
import {Tooltip, Paper, Box, Card, CardContent, Grid, CardActionArea, Button, Stack, Accordion, AccordionSummary, AccordionDetails} from '@mui/material';
import {ItemList, CM, K8sResource} from "../types.ts";
import Typography from "@mui/material/Typography";
import {useNavigate, useParams} from "react-router-dom";
import {useState} from "react";
import InfoTabs, {ItemContext} from "./InfoTabs.tsx";
import InfoDrawer from "./InfoDrawer.tsx";
import { Chip } from "@material-tailwind/react";
import { colors } from "@material-tailwind/react/types/generic";


type CMListItemProps = {
    item: CM;
    onItemClick: { (item: CM): void }
};

function getColorFromLabel(label: string): colors | undefined {
    const colors: colors[] = ["blue-gray", "gray", "brown", "deep-orange", "orange", "amber", "yellow", "lime", "light-green", "green", 
        "teal", "cyan", "light-blue", "blue", "indigo", "deep-purple", "purple", "pink", "red"];
    if (!label || typeof label !== 'string') return undefined;
  
    // Get the first two letters of the label
    const key = label.substring(0, 2).toLowerCase();
  
    // Create a hash from the key
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash += key.charCodeAt(i);
    }
  
    // Map the hash to an index in the colors 
    // There are 19 colors currently
    const index = hash % colors.length;
  
    return colors[index];
  }

function CMListItem({item, onItemClick}: CMListItemProps) {
    const itemConfigType = item.metadata.annotations?.["skycluster-manager.savitestbed.ca/config-type"];
    const providerName = item.metadata.annotations?.["skycluster-manager.savitestbed.ca/provider-name"];
    const providerRegion = item.metadata.annotations?.["skycluster-manager.savitestbed.ca/provider-region"];
    const providerZone = item.metadata.annotations?.["skycluster-manager.savitestbed.ca/provider-zone"];
    return (
       <Grid item xs={12} md={3} key={item.metadata.name} onClick={() => {onItemClick(item)}} >
            <Card variant="outlined" className="cursor-pointer">
                <CardActionArea>
                    <CardContent>
                        { itemConfigType == "provider-vars" && (
                            <>
                            <Stack direction="row" spacing={1} className="mb-1">
                                {providerRegion && (
                                    <>
                                    <Typography variant="body2">Region:</Typography>
                                    <Chip variant="ghost" size="sm" value={providerRegion} /> 
                                    </>
                                )}
                            </Stack>
                            <Stack direction="row" spacing={1}>
                                {providerZone && providerZone == "default" ? (
                                    <Chip variant="ghost" color="blue" size="sm" value={providerZone}/>
                                ) : (
                                    <>
                                    <Typography variant="body2">Zone:</Typography>
                                    <Chip variant="ghost" size="sm" value={providerZone}/>
                                    </>
                                )}
                            </Stack>
                            </>
                        )}
                        { itemConfigType == "optimizer" && (
                            <Typography variant="body2" display="inline">{item.metadata.name}</Typography>
                        )}
                        { itemConfigType == "region-vars" && (
                            <Typography variant="body2" display="inline">{item.metadata.name}</Typography>
                        )}
                    </CardContent>
                </CardActionArea>
            </Card>
        </Grid>
    );
}

type CMListProps = {
    items: ItemList<CM> | undefined;
};

export default function CMList({items}: CMListProps) {
    const {name: focusedName} = useParams();
    const [isDrawerOpen, setDrawerOpen] = useState<boolean>(focusedName != undefined);
    const [focused, setFocused] = useState<K8sResource>({metadata: {name: ""}, kind: "", apiVersion: ""});
    const navigate = useNavigate();

    const onClose = () => {
        setDrawerOpen(false)
        navigate("/cms", {state: focused})
    }

    const onItemClick = (item: K8sResource) => {
        setFocused(item)
        setDrawerOpen(true)
        navigate(
            "./" + item.metadata.name,
            {state: item}
        );
    }

    if (!focused.metadata.name && focusedName) {
        items?.items?.forEach((item) => {
            if (focusedName == item.metadata.name) {
                setFocused(item)
            }
        })
    }

    const bridge = new ItemContext()
    bridge.setCurrent(focused)

    if (!items || !items.items.length) {
        return (
            <Typography variant="h6">No items</Typography>
        )
    }

    if (!items || !items.items.length) {
        return (
            <Typography variant="h6">No items</Typography>
        )
    }


    // Define Grouped ConfigMaps
    const groupedCMs: { [itemIndex: string]: CM[] } = {};

    type ProviderData = {
        identifier: string
        name: string
        skyClusterRegion?: string
        region?: string
        zone?: string
    }
    const providers: { [providerName: string]: ProviderData[] } = {};
    let defaultProviderCount = 0;

    // define a list of strings
    const regionList: CM[] = [];
    
    items.items.forEach((item) => {
        const pConfigType = "skycluster-manager.savitestbed.ca/config-type"
        const pNameSelector = "skycluster-manager.savitestbed.ca/provider-name"
        const pRegionSelector = "skycluster-manager.savitestbed.ca/provider-region"
        const pZoneSelector = "skycluster-manager.savitestbed.ca/provider-zone"
        const pSkyClusterRegion = "skycluster-manager.savitestbed.ca/skycluster-region"
        let configType = item.metadata?.annotations?.[pConfigType] ?? 'NoType';
        
        // check if configType is "provider-vars" and if so append the provider-name
        if (configType == "provider-vars") {
            // This is a provider configmap, we should group by provider name
            const providerName = item.metadata?.labels?.[pNameSelector] ?? "";
            const providerRegion = item.metadata?.annotations?.[pRegionSelector];
            const providerZone = item.metadata?.annotations?.[pZoneSelector];
            const providerSkyClusterRegion = item.metadata?.annotations?.[pSkyClusterRegion];

            if (providerName != "") {
                // Construct the configs for this provider (e.g. provider-vars-aws)
                configType += `${providerName}`;
            }

            // Add the provider to the list of providers if it doesn't exist
            // e.g. providers["aws"] = []
            if (!providers[providerName]) {
                providers[providerName] = [];
            }
            // Add the current provider to the list of providers if it doesn't exist
            // e.g. providers["aws"] = [{name: "aws", region: "us-west-2", skyClusterRegion: "us-west"}]
            // console.log(providerName, providerRegion, providerZone, providerSkyClusterRegion)
            if (!providers[providerName].find((pdata) => pdata.identifier == providerName + providerRegion)) {                
                providers[providerName].push({
                    identifier: providerName + providerRegion, 
                    name: providerName, 
                    region: providerRegion,
                    skyClusterRegion: providerSkyClusterRegion,
                });
            }
            // Ignore if the zone is "default" or the region is "global"
            // These are used for internal purposes and should not be displayed
            providerZone == "default" && providerRegion != "global" ? defaultProviderCount++ : null;

        } else if (configType === "region-vars") {
            // This is a region configmap, we should keep the region name
            regionList.push(item);
        }
        if (!groupedCMs[configType]) {
            groupedCMs[configType] = [];
        }
        groupedCMs[configType].push(item);
    });

    const collapseAll = () => {
        setExpandedItems({});
    };

    const getApiVersion = (items: CM[]): string => {
        if (items.length === 0) {
          return "NoType"; // or handle empty object case appropriately
        }
      
        let configType = items[0].metadata.annotations?.["skycluster-manager.savitestbed.ca/config-type"] ?? "NoType";  
        if (configType === "provider-vars") {
            const providerName = items[0].metadata?.labels?.["provider-name"];
            if (providerName) {
                configType = `${providerName.toUpperCase()}`;
            }
        } else if (configType === "optimizer") {
            configType = "Optimizer";
        } else if (configType === "region-vars") {
            configType = "Regions Configs";
        }
        return configType;
    };

    const expandAll = () => {
        const expandedState = Object.keys(groupedCMs).reduce((acc: Record<string, boolean>, itemIndex: string) => {
            acc[itemIndex] = true;
            return acc;
        }, {});
        setExpandedItems(expandedState);
    };
    const [expandedItems, setExpandedItems] = useState<{[itemIndex: string]: boolean}>({});
    const handleAccordionChange = (itemIndex: string) => {
        setExpandedItems((prevState) => ({
            ...prevState,
            [itemIndex]: !prevState[itemIndex],
        }));
    };

    return (
        <><div className="m-2">
            <Stack spacing={1} direction="row">
                <span><Button variant="outlined" onClick={expandAll}>Expand All</Button></span>
                <span><Button variant="outlined" onClick={collapseAll}>Collapse All</Button></span>
            </Stack>
            <Stack spacing={1} className="my-2" direction="row">
                <Typography variant="button">
                    {`Total Active Providers: ${defaultProviderCount}`}
                </Typography>
            </Stack>
            <Stack spacing={2} className="my-8">
                <Box>
                    <Paper className="p-2">
                        <Typography variant="h6" className="py-2">Regions</Typography>
                        <Card variant="outlined" className="p-1">
                        <Grid container spacing={1} alignItems="stretch" className="py-1" >
                        {Object.entries(regionList).map(([_, item]) => (
                            <Grid item xs="auto" key={item.data["region-name"]}>
                                <Box display="flex" alignItems="center" >
                                <Tooltip title={item.data["region-fullname"]} >
                                    <Chip className="mx-1" variant="ghost" 
                                        color={getColorFromLabel(item.data["region-name"])}
                                        value={item.data["region-name"]} />
                                </Tooltip>
                                </Box>
                            </Grid>
                        ))}
                        </Grid>
                        </Card>
                    </Paper>
                </Box>
                <Box>
                    <Paper className="p-2">
                    <Typography variant="h6" className="py-2">Providers</Typography>
                    <Grid container spacing={0.5} alignItems="stretch">
                    {Object.entries(providers).map(([providerName, pdata]) => (
                        <Grid item xs="auto" key={providerName}>
                        <Card variant="outlined" className="p-0">
                            <Typography className="px-2" variant="h6">{providerName}</Typography>
                            <Box className="p-2">
                            {Object.entries(pdata).map(([_, data]) => (
                                data.region != "global" &&
                                <Tooltip title={data.skyClusterRegion} key={data.identifier}>
                                <Chip variant="ghost" className="m-1" size="sm" value={data.region} />
                                </Tooltip>
                            ))}
                            </Box>
                        </Card></Grid>
                    ))}
                    </Grid>
                    </Paper>
                </Box>
            </Stack>
                
            <Stack spacing={2} className="my-8">
            {Object.entries(groupedCMs).map(([itemIndex, items]) => (
                <Accordion key={itemIndex} expanded={expandedItems[itemIndex] || false} onChange={() => handleAccordionChange(itemIndex)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
                    <Typography variant="h6">{getApiVersion(items)}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Grid container spacing={2}>
                    {items?.map((item: CM) => (
                        <CMListItem item={item} key={item.metadata.name} onItemClick={onItemClick}/>
                    ))}
                    </Grid>
                </AccordionDetails>
                </Accordion>
            ))}
            </Stack>
        </div>
        <InfoDrawer isOpen={isDrawerOpen} onClose={onClose} type="ConfigMaps" title={bridge.curItem.metadata.name}>
            <InfoTabs bridge={bridge} noStatus={true} noEvents={true} noRelations={true} initial="yaml"></InfoTabs>
        </InfoDrawer>
        </>
    );
}
