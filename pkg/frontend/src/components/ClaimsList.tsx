import {Stack, Box, Chip, Card, CardContent, Grid} from '@mui/material';
import {Info as InfoIcon, HelpOutline as HelpOutlineIcon, DeleteForever as DeleteForeverIcon} from '@mui/icons-material';
import {Claim, ItemList} from "../types.ts";
import Typography from "@mui/material/Typography";
import {useNavigate} from "react-router-dom";
import ReadySynced from "./ReadySynced.tsx";

type ItemProps = {
    item: Claim;
};

function ListItem({item}: ItemProps) {
    const navigate = useNavigate();
    const handleOnClick = () => {
        navigate(
            item.apiVersion + "/" + item.kind + "/" + item.metadata.namespace + "/" + item.metadata.name,
            {state: item}
        );
    };

    const copyToClipboard = (name: string) => {
        navigator.clipboard.writeText(name).then(() => {}, (err) => {
            console.error('Could not copy text: ', err);
        });
    };

    return (
        <Grid item xs={12} md={12} key={item.metadata.name}>
            <Card variant="outlined">
                <CardContent>
                    <Stack direction="row" spacing={1}>
                        <Typography variant="h6">{item.metadata.name}</Typography>
                        <Box>
                            <Chip sx={{ p: 0, mt: 0.5, ml: 1, '& > *': {ml: '8px !important', mr: '-8px !important',}, }}
                                icon={<InfoIcon />} size="small" variant="outlined" color="primary"
                                onClick={() => copyToClipboard("kubectl get " + item.kind + " " + item.metadata.name)} />
                            <Chip sx={{ p: 0, mt: 0.5, ml: 1, '& > *': {ml: '8px !important', mr: '-8px !important',}, }}
                                icon={<HelpOutlineIcon />} size="small" variant="outlined" color="secondary"
                                onClick={() => copyToClipboard("kubectl describe " + item.kind + " " + item.metadata.name)} />
                            <Chip sx={{ p: 0, mt: 0.5, ml: 1, '& > *': {ml: '8px !important', mr: '-8px !important',}, }}
                                icon={<DeleteForeverIcon />} size="small" variant="outlined" color="error"
                                onClick={() => copyToClipboard("kubectl delete " + item.kind + " " + item.metadata.name)} />
                        </Box>
                    </Stack>
                    <Typography variant="body1">Namespace: {item.metadata.namespace}</Typography>
                    <Typography variant="body1">XR: {item.kind}</Typography>
                    <Typography variant="body1">Composition: {item.spec.compositionRef?.name}</Typography>
                    <ReadySynced status={item.status?item.status:{}}></ReadySynced>
                    <Chip size="medium" variant="outlined" color="primary" label="Details"
                        onClick={handleOnClick} />
                </CardContent>
            </Card>
        </Grid>
    );
}

type ItemListProps = {
    items: ItemList<Claim> | undefined;
};

export default function ClaimsList({items}: ItemListProps) {
    if (!items || !items.items.length) {
        return (
            <Typography variant="h6">No items</Typography>
        )
    }

    return (
        <Grid container spacing={2}>
            {items?.items?.map((item: Claim) => (
                <ListItem item={item} key={item.metadata.name}/>
            ))}
        </Grid>
    );
}
