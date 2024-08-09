import {Alert, Grid, LinearProgress, Paper, Typography} from "@mui/material";
import {useParams} from "react-router-dom";
import {CRD} from "../types.ts";
import {useEffect, useState} from "react";
import apiClient from "../api.ts";
import ConditionList from "../components/ConditionList.tsx";
import Events from "../components/Events.tsx";
// import CRDConfigs from "../components/CRDConfigs.tsx";
import HeaderBar from "../components/HeaderBar.tsx";
import PageBody from "../components/PageBody.tsx";

const CRDPage = () => {
    const {crd: crdName} = useParams();
    const [crd, setCRD] = useState<CRD | null>(null);
    const [error, setError] = useState<object | null>(null);

    useEffect(() => {
        apiClient.getCRD(crdName as string)
            .then((data) => setCRD(data))
            .catch((err) => setError(err))
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
                            <Typography variant="h5">Configuration</Typography>
                            <Typography variant="body1">
                                Package: 
                            </Typography>
                            {"" ? (
                                <Typography variant="body1">
                                    Controller Config: 
                                </Typography>
                            ) : (<></>)}

                            <Typography variant="h6">CRD Configs</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Paper className="p-4">
                            <Typography variant="h6">Status</Typography>
                            <ConditionList conditions={crd.status?.conditions}></ConditionList>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={12}>
                        <Paper className="p-4">
                            <Typography variant="h6">Events</Typography>
                            <Events src={"crds/" + crd.metadata.name}></Events>
                        </Paper>
                    </Grid>
                </Grid>
            </PageBody>
        </>
    );
};

export default CRDPage;
