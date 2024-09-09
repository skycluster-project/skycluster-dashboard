import { ExpandMore as ExpandMoreIcon, DeleteForever as DeleteForeverIcon} from '@mui/icons-material';
import {Chip as MuChip, Tooltip, Paper, Box, Card, CardContent, Grid, CardActionArea, Button, Stack, Accordion, AccordionSummary, AccordionDetails} from '@mui/material';
import {ItemList, CM, K8sResource} from "../types.ts";
import Typography from "@mui/material/Typography";
import {useNavigate, useParams} from "react-router-dom";
import {useState} from "react";
import InfoTabs, {ItemContext} from "./InfoTabs.tsx";
import InfoDrawer from "./InfoDrawer.tsx";
import { Chip } from "@material-tailwind/react";
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
    // e.g. { "provider-vars-aws": [CM1, CM2], "optimizer": [CM3, CM4] }
    const groupedCMs: { [itemIndex: string]: CM[] } = {};

    type ProviderData = {
        identifier: string
        name: string
        skyClusterRegion?: string
        region?: string
        zone?: string
        type?: string
    }
    const providers: { [providerName: string]: ProviderData[] } = {};
    const providerNames: { [providerName: string]: string[] } = {};
    let defaultProviderCount = 0;

    // define a list of strings
    const regionList: CM[] = [];
    
    // Prepare the variables
    items.items.forEach((item) => {
        const pConfigType = "skycluster-manager.savitestbed.ca/config-type"
        const pNameSelector = "skycluster-manager.savitestbed.ca/provider-name"
        const pRegionSelector = "skycluster-manager.savitestbed.ca/provider-region"
        const pTypeSelector = "skycluster-manager.savitestbed.ca/provider-type"
        const pZoneSelector = "skycluster-manager.savitestbed.ca/provider-zone"
        const pSkyClusterRegion = "skycluster-manager.savitestbed.ca/skycluster-region"
        let configType = item.metadata?.annotations?.[pConfigType] ?? 'NoType';
        
        // check if configType is "provider-vars" and if so append the provider-name
        if (configType == "provider-vars") {
            // This is a provider configmap, we should group by provider name
            const providerIdentifier = item.metadata.name
            const providerName = item.metadata?.labels?.[pNameSelector] ?? "";
            const providerRegion = item.metadata?.annotations?.[pRegionSelector];
            const providerType = item.metadata?.annotations?.[pTypeSelector];
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
                providerNames[providerName] = [];
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
                    type: providerType,
                });
            }

            // providers names: 
            // e.g. providerNames["aws"] = ["vars-aws-us-east1-cac1-az1", "vars-aws-us-east1-cac1-az2"]
            if (!providerNames[providerName].includes(providerIdentifier)) {
                providerNames[providerName].push(providerIdentifier);
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

    type objectData = {
        apiVersion: string,
        name: string,
    }

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
                        <Typography variant="h6" className="py-2">Regions Overview</Typography>
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
                        <Card variant="outlined" className="my-1 p-1">
                            <Stack direction="row"> 
                                <Box className="p-1">
                                <Typography variant="caption">Color Guide:</Typography>
                                </Box>
                                <Box className="p-1">
                                <Typography className="px-1" variant="caption" sx={{'border-left': 'solid .25rem rgb(3 169 244 / 0.8)' }}>Cloud (&lt;50ms)</Typography>
                                </Box>
                                <Box className="p-1">
                                <Typography className="px-1" variant="caption" sx={{'border-left': 'solid .25rem rgb(65 189 104 / 0.8)' }}>Near The Edge (&lt;10ms)</Typography>
                                </Box>
                                <Box className="p-1">
                                <Typography className="px-1" variant="caption" sx={{'border-left': 'solid .25rem rgb(244 67 54 / 0.8)' }}>Edge (&lt;1ms)</Typography>
                                </Box>
                            </Stack>
                        </Card>
                    </Paper>
                </Box>
                <Box>
                    <Paper className="p-2">
                    <Typography variant="h6" className="py-2">Providers Overview</Typography>
                    <Grid container spacing={0.5} alignItems="stretch">
                    {Object.entries(providers).map(([providerName, pdata]) => (
                        <Grid item xs="auto" key={providerName}>
                        <Card variant="outlined" className="p-0">
                            <Typography className="px-2" variant="h6">{providerName}</Typography>
                            {Object.entries(pdata).find(([_, data]) => data.type == "cloud") &&
                                <Box className="m-1" sx={{ padding: '0.005rem','border-left': 'solid .25rem rgb(3 169 244 / 0.8)' }}>
                                {Object.entries(pdata).filter(([_, data]) => data.type == "cloud").map(([_, data]) => (
                                    data.region != "global" &&
                                    <Tooltip title={data.skyClusterRegion} key={data.identifier}>
                                    <Chip variant="ghost" color={getColorFromLabel(data.skyClusterRegion)} className="m-1" size="sm" value={data.region} />
                                    </Tooltip>
                                ))}
                                </Box>
                            }
                            {Object.entries(pdata).find(([_, data]) => data.type == "near-the-edge") &&
                                <Box className="m-1" sx={{ padding: '0.005rem', 'border-left': 'solid .25rem rgb(65 189 104 / 0.8)' }}>
                                {Object.entries(pdata).filter(([_, data]) => data.type == "near-the-edge").map(([_, data]) => (
                                    data.region != "global" &&
                                    <Tooltip title={data.skyClusterRegion} key={data.identifier}>
                                    <Chip variant="ghost" color={getColorFromLabel(data.skyClusterRegion)} className="m-1" size="sm" value={data.region} />
                                    </Tooltip>
                                ))}
                                </Box>
                            }
                            {Object.entries(pdata).find(([_, data]) => data.type == "edge") &&
                                <Box className="m-1" sx={{ padding: '0.005rem', 'border-left': 'solid .25rem rgb(244 67 54 / 0.8)' }}>
                                {Object.entries(pdata).filter(([_, data]) => data.type == "edge").map(([_, data]) => (
                                    data.region != "global" &&
                                    <Tooltip title={data.skyClusterRegion} key={data.identifier}>
                                    <Chip variant="ghost" color={getColorFromLabel(data.skyClusterRegion)} className="m-1" size="sm" value={data.region} />
                                    </Tooltip>
                                ))}
                                </Box>
                            }
                        </Card></Grid>
                    ))}
                    </Grid>
                    </Paper>
                </Box>
                
                <Paper className="p-4">
                    <Typography variant="h6" className="py-2">Providers Details</Typography>
                    {Object.entries(groupedCMs).filter(([idx, _]) => idx.includes('provider-vars')).map(([itemIndex, items]) => (
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
                            <Box className="mt-2"><MuChip 
                                icon={<DeleteForeverIcon />} size="small" label="Delete All" variant="outlined" color="error"
                                onClick={() => 
                                    copyToClipboard(
                                "kubectl delete cm " + providerNames[getApiVersion(items).toLowerCase()].join(' '))} />
                            </Box>
                        </AccordionDetails>
                        </Accordion>
                    ))}
                </Paper>
                <Paper className="p-4">
                {Object.entries(groupedCMs).filter(([idx, _]) => idx.includes('region-vars')).map(([itemIndex, items]) => (
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
                        <Box className="mt-2"><MuChip 
                            icon={<DeleteForeverIcon />} size="small" label="Delete All" variant="outlined" color="error"
                            onClick={() => 
                                copyToClipboard(
                            "kubectl delete cm " + providerNames[getApiVersion(items).toLowerCase()].join(' '))} />
                        </Box>
                    </AccordionDetails>
                    </Accordion>
                ))}
                </Paper>
                <Paper className="p-4">
                {Object.entries(groupedCMs).filter(([idx, _]) => idx.includes('optimizer')).map(([itemIndex, items]) => (
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
                        <Box className="mt-2"><MuChip 
                            icon={<DeleteForeverIcon />} size="small" label="Delete All" variant="outlined" color="error"
                            onClick={() => 
                                copyToClipboard(
                            "kubectl delete cm " + providerNames[getApiVersion(items).toLowerCase()].join(' '))} />
                        </Box>
                    </AccordionDetails>
                    </Accordion>
                ))}
                </Paper>
            </Stack>
        </div>
        <InfoDrawer isOpen={isDrawerOpen} onClose={onClose} type="ConfigMaps" title={bridge.curItem.metadata.name}>
            <InfoTabs bridge={bridge} noStatus={true} noEvents={true} noRelations={true} initial="yaml"></InfoTabs>
        </InfoDrawer>
        </>
    );
}
