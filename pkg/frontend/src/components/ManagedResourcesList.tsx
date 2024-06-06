import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import InfoIcon from '@mui/icons-material/Info';
import {Stack, Divider, Card, Chip, CardContent, Grid, Button, List, Accordion, AccordionSummary, Box, Alert, AccordionDetails} from '@mui/material';
import {ItemList, K8sResource, ManagedResource, ManagedResourceExtended} from "../types.ts";
import Typography from "@mui/material/Typography";
import ReadySynced from "./ReadySynced.tsx";
import InfoDrawer from "./InfoDrawer.tsx";
import InfoTabs, {ItemContext} from "./InfoTabs.tsx";
import {useState} from "react";
import ConditionChips from "./ConditionChips.tsx";
import {NavigateFunction, useNavigate, useParams} from "react-router-dom";
import {GraphData, NodeTypes} from "./graph/data.ts";
import {logger} from "../logger.ts";
import apiClient from "../api.ts";

type ItemProps = {
    item: ManagedResource;
    onItemClick: { (item: ManagedResource): void }
};

function ListItem({item, onItemClick}: ItemProps) {
    const copyToClipboard = (name: string) => {
        navigator.clipboard.writeText(name).then(() => {}, (err) => {
            console.error('Could not copy text: ', err);
        });
    };
    return (
        <Grid item sx={{mb: 1}} xs={12} md={12} key={item.metadata.name}>
            <Card variant="outlined">
                <CardContent>
                    <Box sx={{display: 'flex', flexDirection: 'row', p: 0, m: 0}}>
                        <Typography variant="h6">{item.metadata.name}</Typography>
                        <Chip sx={{ p: 0, mt: 0.5, ml: 1, '& > *': {ml: '8px !important', mr: '-8px !important',}, }}
                            icon={<ContentCopyIcon />} size="small" variant="outlined" color="secondary"
                            onClick={() => copyToClipboard(
                                item.kind + "." + item.apiVersion.split('/')[0] + " " + item.metadata.name)} />
                    </Box>
                    <Typography variant="body1">Kind: {item.kind}</Typography>
                    <Typography variant="body1">Group: {item.apiVersion}</Typography>
                    <Typography variant="body1">Provider Config: {item.spec.providerConfigRef?.name}</Typography>
                    <ReadySynced status={item.status?item.status:{}}></ReadySynced>
                    <Chip icon={<InfoIcon />} label="Details" variant="outlined" color="info" onClick={() => onItemClick(item)} />
                </CardContent>
            </Card>
        </Grid>
    );
}

type ItemListProps = {
    items: ItemList<ManagedResource> | undefined;
};

export default function ManagedResourcesList({items}: ItemListProps) {
    const {name: focusedName} = useParams();
    const [isDrawerOpen, setDrawerOpen] = useState<boolean>(focusedName != undefined);
    const [focused, setFocused] = useState<K8sResource>({metadata: {name: ""}, kind: "", apiVersion: ""});
    const navigate = useNavigate();

    const onClose = () => {
        setDrawerOpen(false)
        navigate("/managed", {state: focused})
    }

    const onItemClick = (item: K8sResource) => {
        setFocused(item)
        setDrawerOpen(true)
        navigate(
            "./" + item.apiVersion + "/" + item.kind + "/" + item.metadata.name,
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
    bridge.getGraph = (setter, setError) => {
        const setData = (res: ManagedResourceExtended) => {
            logger.log("recv from API", res)
            const data = resToGraph(res, navigate)
            logger.log("set graph data", data.nodes)
            setter(data)
        }

        const [group, version] = focused.apiVersion.split("/")
        apiClient.getManagedResource(group, version, focused.kind, focused.metadata.name)
            .then((data) => setData(data))
            .catch((err) => setError(err))
    }

    const title = (<>
        {focused.metadata.name}
        <ConditionChips status={focused.status ? focused.status : {}}></ConditionChips>
    </>)

    if (!items || !items.items.length) {
        return (
            <Typography variant="h6">No items</Typography>
        )
    }

    // Define groupedItems
    const groupedItems: { [itemIndex: string]: ManagedResource[] } = {};
    items.items.forEach((item) => {
        const itemIndex = item.apiVersion.split('.')[0] + "." + item.apiVersion.split('.')[1] + "." + item.kind
        if (!groupedItems[itemIndex]) {
            groupedItems[itemIndex] = [];
        }
        groupedItems[itemIndex].push(item);
    });

    const getApiVersion = (items: ManagedResource[]): string => {
        if (items.length === 0) {
          return "Undefined api version!"; // or handle empty object case appropriately
        }
      
        const apiWords = items[0].apiVersion.split('.');
        if (apiWords.length < 2) { 
            return "Undefined api version!";
        }
        return apiWords[0] + '.' + apiWords[1];
    };

    const collapseAll = () => {
        setExpandedItems({});
    };

    const expandAll = () => {
        const expandedState = Object.keys(groupedItems).reduce((acc: Record<string, boolean>, itemIndex: string) => {
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
                <span className="mx-1"><Button variant="outlined" onClick={expandAll}>Expand All</Button></span>
                <span className="mx-1"><Button variant="outlined" onClick={collapseAll}>Collapse All</Button></span>
            </div>
            {Object.entries(groupedItems).map(([itemIndex, items]) => (
                <Grid item xs={12} md={12} key={itemIndex} m={1}>
                    <Accordion key={itemIndex} expanded={expandedItems[itemIndex] || false} onChange={() => handleAccordionChange(itemIndex)}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
                            <Stack direction="row" spacing={1}>
                                <Typography sx={{pt: '3px'}} variant="overline">{getApiVersion(items) + ": "}</Typography>
                                <Typography variant="h6">{itemIndex.split(".")[2]}</Typography>
                                <Box sx={{mx: 0.5}}>
                                    <Alert sx={{py: 0, 
                                            '& > *': {
                                                py: '4px !important',
                                            },}} 
                                        severity="success">
                                        Ready: {items.filter((item) => item.status?.conditions?.find((condition) => 
                                            condition.status === "True" && condition.type === "Ready")).length}
                                    </Alert>
                                </Box>
                                {
                                items.filter((item) => !item.status?.conditions?.find((condition) =>
                                    condition.status === "True" && condition.type === "Ready")).length > 0 ? (
                                    <Box sx={{mx: 0.5}}>
                                        <Alert sx={{py: 0, 
                                                '& > *': {
                                                    py: '4px !important', 
                                                },}} 
                                            severity="error" color="warning">
                                            Not Ready: {items.filter((item) => !item.status?.conditions?.find((condition) =>
                                                condition.status === "True" && condition.type === "Ready")).length}
                                        </Alert>
                                    </Box>
                                    ) : null
                                }
                            </Stack>
                        </AccordionSummary>
                        <AccordionDetails>
                            <List>
                                {items?.map((item: ManagedResource) => (
                                    <ListItem item={item} key={item.metadata.name} onItemClick={onItemClick}/>
                                ))}
                            </List>
                        </AccordionDetails>
                    </Accordion>
                </Grid>
            ))}
            <InfoDrawer
                key={focused.metadata.name}
                isOpen={isDrawerOpen}
                onClose={onClose}
                type="Managed Resource"
                title={title}>
                <InfoTabs bridge={bridge} initial="relations"></InfoTabs>
            </InfoDrawer>
        </>
    );
}


function resToGraph(res: ManagedResourceExtended, navigate: NavigateFunction): GraphData {
    const data = new GraphData()
    const main = data.addNode(NodeTypes.ManagedResource, res, true, navigate)
    if (res.composite) {
        const provConfig = data.addNode(NodeTypes.CompositeResource, res.composite, false, navigate)
        data.addEdge(main, provConfig)
    }

    if (res.provConfig) {
        const provConfig = data.addNode(NodeTypes.ProviderConfig, res.provConfig, false, navigate)
        data.addEdge(provConfig, main)
    }

    return data
}
