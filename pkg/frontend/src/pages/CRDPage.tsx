import { Info as InfoIcon} from '@mui/icons-material';
import {Alert, Grid, LinearProgress, Chip, Paper, Typography} from "@mui/material";
import {useParams} from "react-router-dom";
import {CRD} from "../types.ts";
import {useEffect, useState} from "react";
import apiClient from "../api.ts";
import ConditionChips from "../components/ConditionChips.tsx";
import HeaderBar from "../components/HeaderBar.tsx";
import PageBody from "../components/PageBody.tsx";

const CRDPage = () => {
    const {crd: crdName} = useParams();
    const [crd, setCRD] = useState<CRD | null>(null);
    const [error, setError] = useState<object | null>(null);

    const copyToClipboard = (name: string) => {
        navigator.clipboard.writeText(name).then(() => {}, (err) => {
            console.error('Could not copy text: ', err);
        });
    };

    useEffect(() => {
        apiClient.getCRD(crdName as string)
            .then((data) => {
                setCRD(data);
            })
            .catch((err) => {
                setError(err);
            })
    }, [crdName])

    if (error) {
        return (<Alert severity="error">Failed: {error.toString()}</Alert>)
    }

    if (!crd) {
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
                        <Chip sx={{ p: 0, mt: 0.5, ml: 1, '& > *': {ml: '8px !important', mr: '-8px !important',}, }}
                            icon={<InfoIcon />} size="small" variant="outlined" color="primary"
                            onClick={() => copyToClipboard("kubectl get " + crd.spec.names.kind)} />
                        <ConditionChips status={crd.status}></ConditionChips>
                        </Paper>
                    </Grid>
                </Grid>
            </PageBody>
        </>
    );
};

export default CRDPage;
