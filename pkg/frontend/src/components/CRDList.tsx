import {Card, CardActionArea, CardContent, Grid} from '@mui/material';
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
        navigate(
            crd.metadata.name,
            {state: crd}
        );
    };

    return (
        <Grid item xs={12} md={6} lg={6} xl={4} key={crd.metadata.name} onClick={handleOnClick}>
            <Card variant="outlined" className="cursor-pointer">
                <CardActionArea>
                    <CardContent>
                        <Typography variant="h6">{crd.spec.names.kind}</Typography>
                        <Typography variant="body1" display="inline">{crd.metadata.name}</Typography>
                        <ConditionChips status={crd.status}></ConditionChips>
                    </CardContent>
                </CardActionArea>
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
