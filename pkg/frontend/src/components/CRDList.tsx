import { Info as InfoIcon} from '@mui/icons-material';
import {Card, CardContent, Box, Grid, Chip} from '@mui/material';
import {ItemList, CRD} from "../types.ts";
import Typography from "@mui/material/Typography";
import {useNavigate} from "react-router-dom";
import ConditionChips from "./ConditionChips.tsx";


type CRDListItemProps = {
    crd: CRD;
};

function CRDListItem({crd}: CRDListItemProps) {
    const navigate = useNavigate();
    const handleOnClick = () => {
        let crdVersion = crd.spec.versions.find(v => v.served);
        if (!crdVersion) {
            crdVersion = {name: "v1alpha1"};
        }
        navigate(
            `/crs/${crd.spec.group}/${crdVersion.name}/${crd.spec.names.plural}`,
            {state: crd}
        );
    };

    const copyToClipboard = (name: string) => {
        navigator.clipboard.writeText(name).then(() => {}, (err) => {
            console.error('Could not copy text: ', err);
        });
    };

    return (
        <Grid item xs={12} md={6} lg={6} xl={4} key={crd.metadata.name}>
            <Card variant="outlined">
                <CardContent>
                    <Typography variant="h6">{crd.spec.names.kind}</Typography>
                    <Typography variant="body1" display="inline">{crd.metadata.name}</Typography>
                    <Box sx={{display: 'flex', flexDirection: 'row', p: 0, m: 0}}>
                        <Chip sx={{ p: 0, mt: 0.5, ml: 1, '& > *': {ml: '8px !important', mr: '-8px !important',}, }}
                            icon={<InfoIcon />} size="small" variant="outlined" color="primary"
                            onClick={() => copyToClipboard("kubectl get " + crd.spec.names.kind)} />
                        <Chip sx={{ p: 0, mt: 0.5, ml: 1, '& > *': {ml: '8px !important', mr: '-8px !important',}, }}
                            icon={<InfoIcon />} size="small" variant="outlined" color="primary"
                            onClick={handleOnClick} />
                        <ConditionChips status={crd.status}></ConditionChips>
                    </Box>
                </CardContent>
            </Card>
        </Grid>
    );
}

type CRDListProps = {
    crds: ItemList<CRD> | undefined;
};

export default function CRDList({crds}: CRDListProps) {
    if (!crds || !crds.items.length) {
        return (
            <Typography variant="h6">No items</Typography>
        )
    }

    return (
        <Grid container spacing={2}>
            {crds?.items?.map((crd: CRD) => (
                <CRDListItem crd={crd} key={crd.metadata.name}/>
            ))}
        </Grid>
    );
}
