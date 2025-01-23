import {Alert, Box, Grid, IconButton, LinearProgress, Paper, Typography} from "@mui/material";
import {useParams, NavigateFunction, NavigateOptions} from "react-router-dom";
import type {To} from "@remix-run/router";
import {Claim, ClaimExtended} from "../types.ts";
import {useEffect, useState} from "react";
import apiClient from "../api.ts";
import ConditionList from "../components/ConditionList.tsx";
import Events from "../components/Events.tsx";
import RelationsGraph from "../components/graph/RelationsGraph.tsx";
import HeaderBar from "../components/HeaderBar.tsx";
import PageBody from "../components/PageBody.tsx";
import InfoTabs, {ItemContext} from "../components/InfoTabs.tsx";
import ConditionChips from "../components/ConditionChips.tsx";
import InfoDrawer from "../components/InfoDrawer.tsx";
import YAMLIcon from '@mui/icons-material/DataObject';
import AppsIcon from '@mui/icons-material/Apps';
import {graphDataFromClaim} from "../components/graph/graphData.ts";


const navigateNewTab: NavigateFunction = (to: To | number, options?: NavigateOptions) => {
    if (typeof to === 'string') {
        window.open(to, '_blank');
    } 
    else {
        return;
    }
};


export default function ClaimPage() {
    const {group: group, version: version, kind: kind, namespace: namespace, name: name} = useParams();
    const [claim, setClaim] = useState<ClaimExtended | null>(null);
    const [error, setError] = useState<object | null>(null);
    // const navigate = useNavigate();
    const [isDrawerOpen, setDrawerOpen] = useState<boolean>(false);

    useEffect(() => {
        apiClient.getClaim(group, version, kind, namespace, name)
            .then((data) => setClaim(data))
            .catch((err) => setError(err))
    }, [group, version, kind, namespace, name])

    if (error) {
        return (<Alert severity="error">Failed: {error.toString()}</Alert>)
    }

    if (!claim) {
        return (<LinearProgress/>)
    }

    // const data = graphDataFromClaim(claim, () => {});
    let data;
    if (claim.compositeResource) {
        data = graphDataFromClaim(claim, navigateNewTab);
    }
    // const data = claim.compositeResource && graphDataFromClaim(claim, navigateNewTab);

    const onClose = () => {
        setDrawerOpen(false)
    }

    const claimClean: Claim = {...claim};
    delete claimClean['managedResources']
    delete claimClean['compositeResource']
    delete claimClean['composition']

    const bridge = new ItemContext()
    bridge.setCurrent(claimClean)

    const title = (<>
        {claim.metadata.name}
        <ConditionChips status={claim.status ? claim.status : {}}></ConditionChips>
    </>)

    const onYaml = () => {
        setDrawerOpen(true)
    }

    return (
        <>
            <HeaderBar title={claim.metadata.name} super="Claim"/>
            <PageBody>
                <Grid container spacing={2} alignItems="stretch">
                    <Grid item xs={12} md={6}>
                        <Paper className="p-4">
                            <Box className="flex justify-between">
                                <Typography variant="h6">Configuration</Typography>
                                <Box>
                                <IconButton onClick={onYaml} title="Show YAML">
                                    <YAMLIcon/>
                                </IconButton>
                                { claim.kind === "SkyK8SCluster" && (
                                    <IconButton onClick={()=>{
                                        const addr = group + "/" + version + "/" + kind + "/" + namespace + "/" + name;
                                        window.open("/remote/" + addr, '_blank')}} title="Show App">
                                        <AppsIcon/>
                                    </IconButton>
                                )}
                                </Box>
                            </Box>
                            <Typography variant="body1">
                                API Version: {claim.apiVersion}
                            </Typography>
                            <Typography variant="body1">
                                Kind: {claim.kind}
                            </Typography>
                            <Typography variant="body1">
                                Namespace: {claim.metadata.namespace}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Paper className="p-4">
                            <Typography variant="h6">Status</Typography>
                            <ConditionList conditions={claim.status?.conditions}></ConditionList>
                        </Paper>
                    </Grid>
                    {data && (
                        <Grid item xs={12} md={12}>
                            <Paper className="p-4 flex flex-col" sx={{height: '60rem'}}>
                                <Typography variant="h6">Relations</Typography>
                                <RelationsGraph nodes={data.nodes} edges={data.edges}></RelationsGraph>
                            </Paper>
                        </Grid>
                    )}
                    <Grid item xs={12} md={12}>
                        <Paper className="p-4">
                            <Typography variant="h6">Events</Typography>
                            <Events src={"providers/" + claim.metadata.name}></Events>
                        </Paper>
                    </Grid>
                </Grid>
            </PageBody>
            <InfoDrawer isOpen={isDrawerOpen} onClose={onClose} type="Claim" title={title}>
                <InfoTabs bridge={bridge} initial="yaml" noRelations={true} noEvents={true} noStatus={true}></InfoTabs>
            </InfoDrawer>
        </>
    );
}