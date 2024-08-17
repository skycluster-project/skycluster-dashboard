import { ExpandMore as ExpandMoreIcon} from '@mui/icons-material';
import {Tooltip, Paper, Box, Card, Chip, CardContent, Grid, CardActionArea, Button, Stack, Accordion, AccordionSummary, AccordionDetails} from '@mui/material';
import {ItemList, CM, K8sResource} from "../types.ts";
import Typography from "@mui/material/Typography";
import {useNavigate, useParams} from "react-router-dom";
import {useState} from "react";
import InfoTabs, {ItemContext} from "./InfoTabs.tsx";
import InfoDrawer from "./InfoDrawer.tsx";


type CMListItemProps = {
    item: CM;
    onItemClick: { (item: CM): void }
};

function CMListItem({item, onItemClick}: CMListItemProps) {
    const providerName = item.metadata.annotations?.["skycluster-manager.savitestbed.ca/provider-name"];
    const providerRegion = item.metadata.annotations?.["skycluster-manager.savitestbed.ca/provider-region"];
    const providerZone = item.metadata.annotations?.["skycluster-manager.savitestbed.ca/provider-zone"];
    return (
       <Grid item xs={12} md={6} lg={6} xl={4} key={item.metadata.name} onClick={() => {onItemClick(item)}} >
            <Card variant="outlined" className="cursor-pointer">
                <CardActionArea>
                    <CardContent>
                        <Typography variant="h6" display="inline" style={{ textTransform: 'uppercase' }}>{providerName}</Typography>
                        {providerRegion && (
                            <Chip className="mx-2" size="small" 
                            label={providerRegion} />
                        )}
                        {providerZone == "default" && (
                            <Chip className="mx-1" color="primary" size="small" label="DEFAULT"/>
                        )}
                        <Typography variant="body1">{item.metadata.name}</Typography>
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
                configType += `-${providerName}`;
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
                configType += `-${providerName}`;
            }
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
        <>
            <div className="m-2">
            <Stack spacing={2}>
                <Box>
                    <span className="mx-1"><Button variant="outlined" onClick={expandAll}>Expand All</Button></span>
                    <span className="mx-1"><Button variant="outlined" onClick={collapseAll}>Collapse All</Button></span>
                </Box>
                <Box>
                    <Typography variant="button">
                        {`Total Active Providers: ${defaultProviderCount}`}
                    </Typography>
                </Box>
                <Box>
                    <Paper className="p-2">
                        <Typography variant="h6">Regions</Typography>
                        <Card variant="outlined">
                        <Grid container spacing={0.5} alignItems="stretch" className="py-1" >
                        {Object.entries(regionList).map(([_, item]) => (
                            <Grid item xs="auto" className="py-1" >
                                <Box display="flex" alignItems="center" >
                                <Tooltip title={item.data["region-fullname"]} >
                                    <Chip className="mx-1" label={item.data["region-name"]} />
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
                    <Typography variant="h6">Providers</Typography>
                    <Grid container spacing={0.5} alignItems="stretch">
                    {Object.entries(providers).map(([providerName, pdata]) => (
                        <Grid item xs="auto">
                        <Card variant="outlined" className="p-0">
                            <Typography className="px-2" variant="h6">{providerName}</Typography>
                            <Box className="p-2">
                            {Object.entries(pdata).map(([_, data]) => (
                                data.region != "global" &&
                                <Tooltip title={data.skyClusterRegion} >
                                <Chip className="mx-1" size="small" 
                                    label={data.region} />
                                </Tooltip>
                            ))}
                            </Box>
                        </Card></Grid>
                    ))}
                    </Grid>
                    </Paper>
                </Box>
            </Stack>
                
            </div>
            {Object.entries(groupedCMs).map(([itemIndex, items]) => (
                <Grid item xs={12} md={12} key={itemIndex} m={1}>
                    <Accordion key={itemIndex} expanded={expandedItems[itemIndex] || false} onChange={() => handleAccordionChange(itemIndex)}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
                        <Stack direction="row" spacing={1}>
                            <Typography sx={{pt: '3px'}} variant="overline">{getApiVersion(items)}</Typography>
                        </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                            {items?.map((item: CM) => (
                                <CMListItem item={item} key={item.metadata.name} onItemClick={onItemClick}/>
                            ))}
                    </AccordionDetails>
                    </Accordion>
                </Grid>
            ))}
            <InfoDrawer isOpen={isDrawerOpen} onClose={onClose} type="ConfigMaps" title={bridge.curItem.metadata.name}>
                <InfoTabs bridge={bridge} noStatus={true} noEvents={true} noRelations={true} initial="yaml"></InfoTabs>
            </InfoDrawer>
        </>
    );
}
