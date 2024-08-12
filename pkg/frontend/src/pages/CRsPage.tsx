import { Info as InfoIcon} from '@mui/icons-material';
import {Alert, Grid, LinearProgress, Chip, Paper, Typography} from "@mui/material";
import {useParams} from "react-router-dom";
import {K8sResource, CRD, ItemList} from "../types.ts";
import {useEffect, useState} from "react";
import apiClient from "../api.ts";
import ConditionChips from "../components/ConditionChips.tsx";
import HeaderBar from "../components/HeaderBar.tsx";
import PageBody from "../components/PageBody.tsx";

const CRDPage = () => {
    const {group: crdGroup, version: crdVersion, name: crdName} = useParams();
    const [crd, setCRD] = useState<CRD | null>(null);
    const [crs, setCRs] = useState<ItemList<K8sResource> | null>(null);
    const [error, setError] = useState<object | null>(null);

    useEffect(() => {
        apiClient.getCRD(crdName as string + "." + crdGroup as string)
            .then((data) => setCRD(data))
            .catch((err) => setError(err));
        apiClient.getCustomResources(crdGroup as string, crdVersion as string, crdName as string)
            .then((data) => {
                setCRs(data);
            })
            .catch((err) => {
                setError(err);
            });
    }, [crdGroup, crdVersion, crdName])

    if (error) {
        return (<Alert severity="error">Failed: {error.toString()}</Alert>)
    }

    if (!crs || !crd) {
        return <LinearProgress/>
    }

    return (
        <>
            <HeaderBar title={crd.metadata.name} super="CRD"/>
            <PageBody>
                <Grid container spacing={2} alignItems="stretch">
                    <Grid item xs={12} md={6}>
                        <Paper className="p-4">
                            <Typography variant="h6">{crd.spec.names.kind}</Typography>
                            <Typography variant="body1" display="inline">{crd.metadata.name}</Typography>
                            <Chip sx={{ p: 0, mt: 0.5, ml: 1, '& > *': { ml: '8px !important', mr: '-8px !important' } }}
                                icon={<InfoIcon />} size="small" variant="outlined" color="primary" />
                            <ConditionChips status={crd.status} />
                        </Paper>
                    </Grid>
                    {crs.items.map((cr) => (
                        <Grid item xs={12} key={cr.metadata.name}>
                            <Paper className="p-4">
                                <Typography variant="h6">{cr.metadata.name}</Typography>
                                <Typography variant="body1">{JSON.stringify(cr.metadata)}</Typography>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            </PageBody>
        </>
    );
};

export default CRDPage;
