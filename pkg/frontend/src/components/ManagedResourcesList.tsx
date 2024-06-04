import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {Card, CardActionArea, CardContent, Grid, Button, List, Accordion, AccordionSummary, Box, Alert, AccordionDetails} from '@mui/material';
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
    return (
        <Grid item xs={12} md={12} key={item.metadata.name} onClick={() => {
            onItemClick(item)
        }}>
            <Card variant="outlined" className="cursor-pointer">
                <CardActionArea>
                    <CardContent>
                        <Typography variant="h6">{item.metadata.name}</Typography>
                        <Typography variant="body1">Kind: {item.kind}</Typography>
                        <Typography variant="body1">Group: {item.apiVersion}</Typography>
                        <Typography variant="body1">Provider Config: {item.spec.providerConfigRef?.name}</Typography>
                        <ReadySynced status={item.status?item.status:{}}></ReadySynced>
                    </CardContent>
                </CardActionArea>
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
    const groupedItems: { [kind: string]: ManagedResource[] } = {};
    items.items.forEach((item) => {
        if (!groupedItems[item.kind]) {
            groupedItems[item.kind] = [];
        }
        groupedItems[item.kind].push(item);
    });

    const collapseAll = () => {
        setExpandedItems({});
    };

    const expandAll = () => {
        const expandedState = Object.keys(groupedItems).reduce((acc: Record<string, boolean>, kind: string) => {
          acc[kind] = true;
          return acc;
        }, {});
        setExpandedItems(expandedState);
      };
    const [expandedItems, setExpandedItems] = useState<{[kind: string]: boolean}>({});
    const handleAccordionChange = (kind: string) => {
        setExpandedItems((prevState) => ({
          ...prevState,
          [kind]: !prevState[kind],
        }));
      };

    return (
        <>
            <div className="m-2">
                <span className="mx-1"><Button variant="outlined" onClick={expandAll}>Expand All</Button></span>
                <span className="mx-1"><Button variant="outlined" onClick={collapseAll}>Collapse All</Button></span>
            </div>
            {Object.entries(groupedItems).map(([kind, items]) => (
                <Grid item xs={12} md={12} key={kind} m={1}>
                    <Accordion key={kind} expanded={expandedItems[kind] || false} onChange={() => handleAccordionChange(kind)}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
                            <Typography variant="h6">{kind}</Typography>
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
                        </AccordionSummary>
                        <AccordionDetails>
                            <List>
                                {items?.map((item: ManagedResource) => (
                                    <ListItem item={item} key={item.metadata.name} onItemClick={onItemClick}/>
                                ))}
                            </List>
                            <InfoDrawer
                                key={focused.metadata.name}
                                isOpen={isDrawerOpen}
                                onClose={onClose}
                                type="Managed Resource"
                                title={title}>
                                <InfoTabs bridge={bridge} initial="relations"></InfoTabs>
                            </InfoDrawer>
                        </AccordionDetails>
                    </Accordion>
                </Grid>
            ))}
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
