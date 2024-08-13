import {Card, CardContent, Chip, Grid, CardActionArea} from '@mui/material';
import {ItemList, CM, K8sResource} from "../types.ts";
import Typography from "@mui/material/Typography";
import {useNavigate, useParams} from "react-router-dom";
import {DeleteForever as DeleteForeverIcon} from "@mui/icons-material";
import {useState} from "react";
import InfoTabs, {ItemContext} from "./InfoTabs.tsx";
import InfoDrawer from "./InfoDrawer.tsx";


type CMListItemProps = {
    item: CM;
    onItemClick: { (item: CM): void }
};

function CMListItem({item, onItemClick}: CMListItemProps) {
    
    const copyToClipboard = (name: string) => {
        navigator.clipboard.writeText(name).then(() => {}, (err) => {
            console.error('Could not copy text: ', err);
        });
    };

    return (
        // onClick={handleOnClick}
       <Grid item xs={12} md={6} lg={6} xl={4} key={item.metadata.name} onClick={() => {onItemClick(item)}} >
            <Card variant="outlined" className="cursor-pointer">
                <CardActionArea>
                    <CardContent>
                        <Typography variant="h6">{item.metadata.name}</Typography>
                        <Typography variant="body1" display="inline">{item.metadata.name}</Typography>
                        <Chip sx={{ p: 0, mt: 0.5, ml: 1, '& > *': {ml: '8px !important', mr: '-8px !important',}, }}
                            icon={<DeleteForeverIcon />} size="small" variant="outlined" color="error"
                            onClick={() => copyToClipboard("kubectl delete cm " + item.metadata.name)} />
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

    return (
        <>
            <Grid container spacing={2}>
                {items?.items?.map((item: CM) => (
                    <CMListItem item={item} key={item.metadata.name} onItemClick={onItemClick}/>
                ))}
            </Grid>
            <InfoDrawer isOpen={isDrawerOpen} onClose={onClose} type="ConfigMaps" title={bridge.curItem.metadata.name}>
                <InfoTabs bridge={bridge} noStatus={true} noEvents={true} noRelations={true} initial="yaml"></InfoTabs>
            </InfoDrawer>
        </>
    );
}
