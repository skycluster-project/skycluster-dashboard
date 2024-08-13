import { Info as InfoIcon, HelpOutline as HelpOutlineIcon, DeleteForever as DeleteForeverIcon} from '@mui/icons-material';
import {Alert, Box, Grid, Chip, Paper, Typography} from "@mui/material";
import {useNavigate, useParams} from "react-router-dom";
import {K8sResource, CRD, ItemList} from "../types.ts";
import {useEffect, useState} from "react";
import apiClient from "../api.ts";
import ConditionChips from "../components/ConditionChips.tsx";
import HeaderBar from "../components/HeaderBar.tsx";
import PageBody from "../components/PageBody.tsx";
import InfoTabs, {ItemContext} from "../components/InfoTabs.tsx";
import InfoDrawer from "../components/InfoDrawer.tsx";

const CRDPage = () => {
    const {group: crdGroup, version: crdVersion, name: crdName, focusedName: focusedName} = useParams();
    const [crd, setCRD] = useState<CRD | null>(null);
    const [crs, setCRs] = useState<ItemList<K8sResource> | null>(null);
    const [error, setError] = useState<object | null>(null);

    const navigate = useNavigate();
    const [isDrawerOpen, setDrawerOpen] = useState<boolean>(focusedName != undefined);
    const [focused, setFocused] = useState<K8sResource>({metadata: {name: ""}, kind: "", apiVersion: ""});


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
        return (
            <Typography variant="h6">No items</Typography>
        )
    }

    // create a list of all cr.metadata.name separated by spaces
    const crNames = crs.items.map((cr) => cr.metadata.name).join(" ");

    const onClose = () => {
        setDrawerOpen(false)
        navigate(
            "/crs/" + crdGroup + "/" + crdVersion + "/" + crdName, 
            {state: focused})
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
        crs?.items?.forEach((item) => {
            if (focusedName == item.metadata.name) {
                setFocused(item)
            }
        })
    }

    const bridge = new ItemContext()
    bridge.setCurrent(focused)
    
    const copyToClipboard = (name: string) => {
        navigator.clipboard.writeText(name).then(() => {}, (err) => {
            console.error('Could not copy text: ', err);
        });
    };

    return (
        <>
            <HeaderBar title={crd.spec.names.kind} super="CRD"/>
            <PageBody>
                <Grid container spacing={2} alignItems="stretch">
                    <Grid item xs={12} md={6}>
                        <Paper className="p-4">
                            <Typography variant="h6">{crd.spec.names.kind}</Typography>
                            <Typography variant="body1" display="inline">{crd.metadata.name}</Typography>
                            <Chip sx={{ p: 0, mt: 0.5, ml: 1, '& > *': { ml: '8px !important', mr: '-8px !important' } }}
                                icon={<InfoIcon />} size="small" variant="outlined" color="primary"
                                onClick={() => copyToClipboard("kubectl get " + crd.spec.names.kind + " | less")} />
                            <ConditionChips status={crd.status} />
                            <Chip variant="outlined" className="mr-1 ml-1"
                                label={"Delete All"} color={("error")} 
                                onClick={() => {
                                    copyToClipboard("kubectl delete " + crd.metadata.name + " " + crNames)
                                }}></Chip>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Paper className="p-3">
                        {crs.items.map((cr) => (
                        <Box sx={{display: 'flex', flexDirection: 'row', p: 0, m: 0}} key={cr.metadata.name}>
                            <Typography variant="h6">{cr.metadata.name}</Typography>
                                <Box sx={{display: 'flex', flexDirection: 'row', p: 0, m: 0}}>
                                    <Chip sx={{ p: 0, mt: 0.5, ml: 1, '& > *': {ml: '8px !important', mr: '-8px !important',}, }}
                                        icon={<InfoIcon />} size="small" variant="outlined" color="primary"
                                        onClick={() => copyToClipboard("kubectl get " + cr.kind + " " + cr.metadata.name)} />
                                    <Chip sx={{ p: 0, mt: 0.5, ml: 1, '& > *': {ml: '8px !important', mr: '-8px !important',}, }}
                                        icon={<HelpOutlineIcon />} size="small" variant="outlined" color="secondary"
                                        onClick={() => onItemClick(cr)}
                                    />
                                    <Chip sx={{ p: 0, mt: 0.5, ml: 1, '& > *': {ml: '8px !important', mr: '-8px !important',}, }}
                                        icon={<DeleteForeverIcon />} size="small" variant="outlined" color="error"
                                        onClick={() => copyToClipboard("kubectl delete " + cr.kind + " " + cr.metadata.name)} />
                                </Box>
                        </Box>
                        ))}
                        </Paper>
                    </Grid>
                </Grid>
                <InfoDrawer isOpen={isDrawerOpen} onClose={onClose} type="Custom Resource" title={bridge.curItem.metadata.name}>
                    <InfoTabs bridge={bridge} noStatus={true} noEvents={true} noRelations={true} initial="yaml"></InfoTabs>
                </InfoDrawer>
            </PageBody>
        </>
    );
};

export default CRDPage;
