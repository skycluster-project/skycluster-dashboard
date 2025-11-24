import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import {Chip as MuChip, Tooltip, Paper, Box, Card, CardContent, Grid, CardActionArea, Stack, Accordion, AccordionSummary, AccordionDetails} from '@mui/material';
import {ItemList, CM, K8sResource} from "../types.ts";
import Typography from "@mui/material/Typography";
import {useNavigate, useParams} from "react-router-dom";
import {useState} from "react";
import InfoTabs, {ItemContext} from "./InfoTabs.tsx";
import InfoDrawer from "./InfoDrawer.tsx";
import { Chip } from "@material-tailwind/react";
import { Button } from "@material-tailwind/react";
import { getColorFromLabel } from "../utils.ts";


type CMListItemProps = {
    item: CM;
    onItemClick: { (item: CM): void }
};

const copyToClipboard = (name: string) => {
    navigator.clipboard.writeText(name).then(() => {}, (err) => {
        console.error('Could not copy text: ', err);
    });
};

function CMListItem({item, onItemClick}: CMListItemProps) {
    // const itemConfigType = item.metadata.labels?.["skycluster.io/config-type"];
    // const providerName = item.metadata.labels?.["skycluster.io/provider-name"];
    const providerType = item.metadata.labels?.["skycluster.io/provider-type"];
    const providerRegion = item.metadata.labels?.["skycluster.io/provider-region"];
    const providerRegionAlias = item.metadata.labels?.["skycluster.io/provider-region-alias"];
    const providerZone = item.metadata.labels?.["skycluster.io/provider-zone"];
    const providerLocName = item.metadata.labels?.["skycluster.io/provider-loc-name"];
    const itemEnabled = item.metadata.labels?.["skycluster.io/provider-enabled"] ?? 'false';
    let pLocName = providerLocName? "\n" + providerLocName : "";

    return (
            <Box onClick={() => {onItemClick(item)}} className="m-1" 
                sx={{ cursor: 'pointer', padding: '0.005rem' }}>
                <Tooltip title={providerZone + ', ' + pLocName}>
                <Chip variant="ghost" color={getColorFromLabel(itemEnabled, providerRegionAlias)} className="m-0" size="sm" 
                    value={`${providerRegion} (${providerType})`} />
                </Tooltip>
            </Box>
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
    // e.g. { "provider-mappings-aws": [CM1, CM2], "optimizer": [CM3, CM4] }
    const groupedCMs: { [itemIndex: string]: CM[] } = {};

    type ProviderRegion = {
        name: string
        locName: string
        regionAlias?: string
        region?: string
        enabled?: string
    }

    type ProviderData = {
        identifier: string
        name: string
        locName: string
        regionAlias?: string
        region?: string
        zone?: string
        type?: string
        enabled?: string
    }

    const providerRegions: { [id: string]: ProviderRegion } = {};
    const providers: { [providerName: string]: ProviderData[] } = {};
    const providerNames: { [providerName: string]: string[] } = {};
    let defaultProviderCount = 0;

    // Get the default provider regions data and their enabled status
    items.items.forEach((item) => {
        const pConfigType = "skycluster.io/config-type"
        const pNameSelector = "skycluster.io/provider-name"
        const pLocNameSelector = "skycluster.io/provider-loc-name"
        const pRegionSelector = "skycluster.io/provider-region"
        const pTypeSelector = "skycluster.io/provider-type"
        const pEnabledSelector = "skycluster.io/provider-enabled"
        const pRegionAliasSelector = "skycluster.io/provider-region-alias"
        let itemEnabled = item.metadata?.labels?.[pEnabledSelector] ?? 'false';
        let configType = item.metadata?.labels?.[pConfigType] ?? 'NoType';
        let providerType = item.metadata?.labels?.[pTypeSelector];
        let providerName = item.metadata?.labels?.[pNameSelector] ?? "";
        let providerRegion = item.metadata?.labels?.[pRegionSelector];
        let providerRegionAlias = item.metadata?.labels?.[pRegionAliasSelector];
        let providerLocName = item.metadata?.labels?.[pLocNameSelector] ?? "";
        let providerId = providerName + providerRegion
        
        if (configType == "provider-mappings" && providerType == "global") {
            providerRegions[providerId] = {
                name: providerName,
                locName: providerLocName,
                regionAlias: providerRegionAlias,
                region: providerRegion,
                enabled: itemEnabled,
            }        
        }
    });

    
    // Prepare the variables
    items.items.forEach((item) => {
        const pConfigType = "skycluster.io/config-type"
        const pNameSelector = "skycluster.io/provider-name"
        const pLocNameSelector = "skycluster.io/provider-loc-name"
        const pRegionSelector = "skycluster.io/provider-region"
        const pTypeSelector = "skycluster.io/provider-type"
        const pZoneSelector = "skycluster.io/provider-zone"
        const pRegionAliasSelector = "skycluster.io/provider-region-alias"
        const pEnabledSelector = "skycluster.io/provider-enabled"
        let configType = item.metadata?.labels?.[pConfigType] ?? 'NoType';
        
        // check if configType is "provider-mappings" and if so append the provider-name
        if (configType == "provider-mappings") {
            // This is a provider configmap, we should group by provider name
            const providerIdentifier = item.metadata.name
            const providerName = item.metadata?.labels?.[pNameSelector] ?? "";
            const providerLocName = item.metadata?.labels?.[pLocNameSelector] ?? "";
            const providerRegion = item.metadata?.labels?.[pRegionSelector];
            const providerType = item.metadata?.labels?.[pTypeSelector];
            const providerZone = item.metadata?.labels?.[pZoneSelector];
            const providerRegionAlias = item.metadata?.labels?.[pRegionAliasSelector];
            
            const regionalItemEnabled = providerRegions[providerName + providerRegion].enabled
            if (regionalItemEnabled == "false") {
                // set the metadata.label.enabled to false
                item.metadata.labels = item.metadata.labels ?? {};
                item.metadata.labels[pEnabledSelector] = "false";
            }

            // Construct the configs for this provider (e.g. provider-mappings-aws)
            if (providerName != "") {
                configType += `${providerName}`;
            }

            // Add the provider to the list of providers if it doesn't exist
            // e.g. providers["aws"] = []
            if (!providers[providerName]) {
                providers[providerName] = [];
                providerNames[providerName] = [];
            }

            // Add the current provider to the list of providers if it doesn't exist
            // e.g. providers["aws"] = [{name: "aws", region: "us-west-2", regionAlias: "us-west"}]
            // console.log(providerName, providerRegion, providerZone, providerRegionAlias)
            if (!providers[providerName].find((pdata) => pdata.identifier == providerName + providerRegion + providerZone + providerType)) {                
                providers[providerName].push({
                    identifier: providerName + providerRegion + providerZone + providerType, 
                    name: providerName, 
                    locName: providerLocName,
                    region: providerRegion,
                    regionAlias: providerRegionAlias,
                    zone: providerZone,
                    type: providerType,
                    enabled: item.metadata.labels?.[pEnabledSelector] ?? 'false',
                });
            }

            // providers names: 
            // e.g. providerNames["aws"] = ["vars-aws-us-east1-cac1-az1", "vars-aws-us-east1-cac1-az2"]
            if (!providerNames[providerName].includes(providerIdentifier)) {
                providerNames[providerName].push(providerIdentifier);
            }
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
      
        let configType = items[0].metadata.labels?.["skycluster.io/config-type"] ?? "NoType";  
        if (configType === "provider-mappings") {
            const providerName = items[0].metadata?.labels?.["skycluster.io/provider-name"];
            if (providerName) {
                configType = `${providerName.toUpperCase()}`;
            }
        } else if (configType === "optimizer") {
            configType = "Optimizer";
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
                        <Card variant="outlined" className="my-1 p-1">
                            <Box className="p-1">
                            <Typography variant="h6">Color Guide:</Typography>
                            </Box>
                            <Stack direction="row"> 
                                <Box className="p-1">
                                <Typography className="px-1" variant="caption" sx={{borderLeft: 'solid 0.75rem gray', borderTopLeftRadius: '0.375rem', borderBottomLeftRadius: '0.375rem' }}>Disabled</Typography>
                                </Box>
                                <Box className="p-1">
                                <Typography className="px-1" variant="caption" sx={{borderLeft: 'solid 0.75rem rgba(3, 169, 244, 0.8)', borderTopLeftRadius: '0.375rem', borderBottomLeftRadius: '0.375rem' }}>Cloud</Typography>
                                </Box>
                                <Box className="p-1">
                                <Typography className="px-1" variant="caption" sx={{borderLeft: 'solid .75rem rgb(65 189 104 / 0.8)', borderTopLeftRadius: '0.375rem', borderBottomLeftRadius: '0.375rem' }}>Near The Edge</Typography>
                                </Box>
                                <Box className="p-1">
                                <Typography className="px-1" variant="caption" sx={{borderLeft: 'solid .75rem rgb(244 67 54 / 0.8)', borderTopLeftRadius: '0.375rem', borderBottomLeftRadius: '0.375rem' }}>Edge</Typography>
                                </Box>
                            </Stack>
                        </Card>
                    </Paper>
                </Box>
                
                <Paper className="p-4">
                    <Typography variant="h6" className="py-2">Providers Details</Typography>
                    <Grid container spacing={2}>
                    {Object.entries(groupedCMs).filter(([idx, _]) => idx.includes('provider-mappings')).map(([_, items]) => (
                        <Grid item xs={3} key={getApiVersion(items)}>
                        <Typography variant="h6" className="py-2">{getApiVersion(items)}</Typography>
                        {Object.entries(items).find(([_, item]) => item.metadata.labels?.["skycluster.io/provider-type"] == "cloud") &&
                            <Box className="m-1" sx={{ padding: '0.005rem', borderLeft: 'solid .25rem rgb(3 169 244 / 0.8)' }}>
                                {Object.entries(items).filter(([_, item]) => item.metadata.labels?.["skycluster.io/provider-type"] == "cloud").map(([_, item]) =>  (
                                <CMListItem item={item} key={item.metadata.name} onItemClick={onItemClick}/>
                            ))}
                            </Box>
                        }
                        {Object.entries(items).find(([_, item]) => item.metadata.labels?.["skycluster.io/provider-type"] == "nte") &&
                            <Box className="m-1" sx={{ padding: '0.005rem', borderLeft: 'solid .25rem rgb(65 189 104 / 0.8)' }}>
                                {Object.entries(items).filter(([_, item]) => item.metadata.labels?.["skycluster.io/provider-type"] == "nte").map(([_, item]) =>  (
                                <CMListItem item={item} key={item.metadata.name} onItemClick={onItemClick}/>
                            ))}
                            </Box>
                        }
                        {Object.entries(items).find(([_, item]) => item.metadata.labels?.["skycluster.io/provider-type"] == "edge") &&
                            <Box className="m-1" sx={{ padding: '0.005rem', borderLeft: 'solid .25rem rgb(244 67 54 / 0.8)' }}>
                                {Object.entries(items).filter(([_, item]) => item.metadata.labels?.["skycluster.io/provider-type"] == "edge").map(([_, item]) =>  (
                                <CMListItem item={item} key={item.metadata.name} onItemClick={onItemClick}/>
                            ))}
                            </Box>
                        }
                        </Grid>
                    ))}
                    </Grid>
                </Paper>


                <Paper className="p-4">
                    <Typography variant="h6" className="py-2">Providers Details (Globals and Defaults)</Typography>
                    <Accordion key="provider-mappings-default" expanded={expandedItems["provider-mappings-default"] || false} onChange={() => handleAccordionChange("provider-mappings-default")}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
                            <Typography variant="h6">All Providers</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                        <Grid container spacing={2}>
                        {Object.entries(groupedCMs).filter(([idx, _]) => idx.includes('provider-mappings')).map(([itemIndex, items]) => (
                                <Grid item xs={3} key={itemIndex}>
                                {items?.filter((item) => item.metadata.labels?.["skycluster.io/provider-type"] == "global").map((item: CM) => (
                                        <CMListItem item={item} key={item.metadata.name} onItemClick={onItemClick}/>
                                ))}
                                </Grid>
                            ))}
                        </Grid>
                        </AccordionDetails>
                    </Accordion>
                </Paper>
                
                
                
            </Stack>
        </div>
        <InfoDrawer isOpen={isDrawerOpen} onClose={onClose} type="ConfigMaps" title={bridge.curItem.metadata.name}>
            <InfoTabs bridge={bridge} noStatus={true} noEvents={true} noRelations={true} initial="yaml"></InfoTabs>
        </InfoDrawer>
        </>
    );
}
