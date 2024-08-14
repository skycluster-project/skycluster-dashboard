import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import {Card, CardContent, Grid, CardActionArea, Button, Stack, Accordion, AccordionSummary, AccordionDetails} from '@mui/material';
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
    
    return (
       <Grid item xs={12} md={6} lg={6} xl={4} key={item.metadata.name} onClick={() => {onItemClick(item)}} >
            <Card variant="outlined" className="cursor-pointer">
                <CardActionArea>
                    <CardContent>
                        <Typography variant="h6">{item.metadata.name}</Typography>
                        <Typography variant="body1" display="inline">{item.metadata.name}</Typography>
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


    // Define groupedItems
    const groupedItems: { [itemIndex: string]: CM[] } = {};
    items.items.forEach((item) => {
        const itemIndex = item.metadata?.annotations?.["skycluster-manager.savitestbed.ca/config-type"] ?? 'NoType';
        if (!groupedItems[itemIndex]) {
            groupedItems[itemIndex] = [];
        }
        groupedItems[itemIndex].push(item);
    });

    const collapseAll = () => {
        setExpandedItems({});
    };

    const getApiVersion = (items: CM[]): string => {
        if (items.length === 0) {
          return "NoType"; // or handle empty object case appropriately
        }
      
        const configType = items[0].metadata.annotations?.["skycluster-manager.savitestbed.ca/config-type"] ?? "NoType";  
        return configType;
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
