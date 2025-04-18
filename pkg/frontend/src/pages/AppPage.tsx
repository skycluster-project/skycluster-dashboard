import {Alert, Grid, Paper, Typography} from "@mui/material";
import { useLocation } from 'react-router-dom';
import {useNavigate, useParams} from "react-router-dom";
import {ItemList, K8sResource} from "../types.ts";
import {useEffect, useState} from "react";
import apiClient from "../api.ts";
import RelationsGraph from "../components/graph/RelationsGraph.tsx";
import HeaderBar from "../components/HeaderBar.tsx";
import PageBody from "../components/PageBody.tsx";
import InfoTabs, {ItemContext} from "../components/InfoTabs.tsx";
import InfoDrawer from "../components/InfoDrawer.tsx";
import {graphDataFromDeployments} from "../components/graph/graphData.ts";


export default function AppPage() {
    const {group: group, version: version, kind: kind, namespace: namespace, name: name, deployName: deployName} = useParams();
    const [deploys, setDeploys] = useState<ItemList<K8sResource> | null>(null);
    const location = useLocation();
    const [deploy, setDeploy] = useState<K8sResource | null>(null);
    const [isDrawerOpen, setDrawerOpen] = useState<boolean>(false);
    const [error, setError] = useState<object | null>(null);
    const navigate = useNavigate();

    if (!group || !version || !kind || !namespace || !name) {
        return (<Alert severity="error">Invalid URL</Alert>)
    }

    const addrBase = `remote/${group}/${version}/${kind}/${namespace}/${name}`;
    const bridge = new ItemContext()


    useEffect(() => {
        apiClient.getRemoteResources(group, version, kind, namespace, name)
            .then((deploys) => setDeploys(deploys))
            .catch((err) => setError(err))
    }, [group, version, kind, namespace, name])


    useEffect(() => {
        if (location.state && location.state.deploy) {
          setDeploy(location.state.deploy);
        }
      }, [location]);

    useEffect(() => {
        if (deployName && deploy && deploy.metadata && deploy.metadata.name) {
            bridge.setCurrent(deploy)
            setDrawerOpen(true)
        }
    }, [deployName, deploy])

    if (error) {
        return (<Alert severity="error">Failed: {error.toString()}</Alert>)
    }

    if (!deploys || !deploys.items.length) {
        return (
            <Typography variant="h6">No items</Typography>
        )
    }

    const data = graphDataFromDeployments(addrBase, deploys, navigate);

    const onClose = () => {
        setDrawerOpen(false)
        navigate(`/${addrBase}`)
    }

    return (
        <>
            <HeaderBar title={name} super="Sky Application"/>
            <PageBody>
                <Grid container spacing={2} alignItems="stretch">
                    {
                    <Grid item xs={12} md={12}>
                        <Paper className="p-4 flex flex-col" sx={{height: '60rem'}}>
                            <Typography variant="h6">Relations</Typography>
                            <RelationsGraph nodes={data.nodes} edges={data.edges}></RelationsGraph>
                        </Paper>
                    </Grid>
                    }
                </Grid>
            </PageBody>
            <InfoDrawer isOpen={isDrawerOpen} onClose={onClose} type="Deployment" title={name}>
                <InfoTabs bridge={bridge} initial="yaml" noRelations={true} noEvents={true} noStatus={true}></InfoTabs>
            </InfoDrawer>
        </>
    );
}