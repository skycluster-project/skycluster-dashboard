import { Info as InfoIcon, HelpOutline as HelpOutlineIcon, DeleteForever as DeleteForeverIcon} from '@mui/icons-material';
import {Tooltip, Stack, Alert, Box, Grid, Chip as MuChip, Paper, Typography} from "@mui/material";
import {useNavigate, useParams} from "react-router-dom";
import {SkyClusterResource, CRD, ItemList} from "../types.ts";
import {useEffect, useState} from "react";
import apiClient from "../api.ts";
import ConditionChips from "../components/ConditionChips.tsx";
import HeaderBar from "../components/HeaderBar.tsx";
import PageBody from "../components/PageBody.tsx";
import InfoTabs, {ItemContext} from "../components/InfoTabs.tsx";
import InfoDrawer from "../components/InfoDrawer.tsx";
import { Chip } from "@material-tailwind/react";

const CRDPage = () => {
    const {group: crdGroup, version: crdVersion, name: crdName, focusedName: focusedName} = useParams();
    const [crd, setCRD] = useState<CRD | null>(null);
    const [crs, setCRs] = useState<ItemList<SkyClusterResource> | null>(null);
    const [error, setError] = useState<object | null>(null);

    const navigate = useNavigate();
    const [isDrawerOpen, setDrawerOpen] = useState<boolean>(focusedName != undefined);
    const [focused, setFocused] = useState<SkyClusterResource>({metadata: {name: ""}, kind: "", apiVersion: ""});


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

    const getColorFromType = (pType: string) => {
        switch (pType.toLowerCase()) {
            case "cloud":
                return "light-blue"
            case "near-the-edge":
                return "lime"
            case "edge":
                return "red"
            default:
                return "gray"
        }
    }

    const onItemClick = (item: SkyClusterResource) => {
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

    const renderValue = (value: any, level = 0) => {
        if (typeof value === 'object' && value !== null) {
          return (
            <div style={{ marginLeft: `${level * 20}px` }}>
              {Object.entries(value).map(([key, nestedValue]) => (
                <>
                    <Stack direction="row" className={level === 0 ? "mb-1 p-2" : ""} 
                        sx={{ 'border-bottom' : level == 0 ? '0.5px dashed gray' : "" }} key={key}>
                        <>
                        <strong className="mr-1">{key}:</strong>
                        {renderValue(nestedValue, level + 1)}
                        </>
                    </Stack>
                </>
              ))}
            </div>
          );
        } else {
          return <span>{value.toString()}</span>;
        }
    };

    return (
        <>
            <HeaderBar title={crd.spec.names.kind} super="CRD"/>
            <PageBody>
                <Grid container spacing={2} alignItems="stretch">
                    <Grid item xs={12}>
                        <Paper className="p-4">
                            <Typography variant="h6">{crd.spec.names.kind}</Typography>
                            <Typography variant="body1" display="inline">{crd.metadata.name}</Typography>
                            <MuChip sx={{ p: 0, mt: 0.5, ml: 1, '& > *': { ml: '8px !important', mr: '-8px !important' } }}
                                icon={<InfoIcon />} size="small" variant="outlined" color="primary"
                                onClick={() => copyToClipboard("kubectl get " + crd.spec.names.kind + " | less")} />
                            <ConditionChips status={crd.status} />
                            <MuChip variant="outlined" className="mr-1 ml-1"
                                label={"Delete All"} color={("error")} 
                                onClick={() => {
                                    copyToClipboard("kubectl delete " + crd.metadata.name + " " + crNames)
                                }}/>
                        </Paper>
                    </Grid>
                    <Grid item xs={12}>
                        <Paper className="p-3">
                            <Grid container spacing={2}>
                            {crs.items.map((cr) => (
                                <Grid item key={cr.metadata.name}>
                                <Box className="p-1" sx={{border: '0.5px dashed gray'}} key={cr.metadata.name}>
                                    <Typography variant="h6" display="inline">{cr.metadata.name}</Typography>
                                    {cr.metadata?.annotations?.['skycluster.io/config-type'] == "provattr-config" && (
                                        <>
                                        <Chip variant="ghost" className="m-1" color="light-blue" size="sm" 
                                        value={cr.metadata?.annotations?.['skycluster.io/provider-name']} />
                                        <Stack direction="row" spacing={1}>
                                        <Chip variant="ghost" className="rounded-full m-1" size="sm" 
                                        value={cr.metadata?.annotations?.['skycluster.io/provider-region']} />
                                        <Chip variant="ghost" className="rounded-full m-1" size="sm" 
                                        value={cr.metadata?.annotations?.['skycluster.io/provider-type']} />
                                        </Stack>
                                        </>
                                    )}
                                    {cr.metadata?.annotations?.['skycluster.io/config-type'] == "vs-config" && (
                                        <>
                                        {cr.spec?.vserviceCompositions && (
                                            <Box className="m-1 p-1" sx={{'background-color':'#f0f0f0'}}>
                                            <Typography variant="body2" className="mb-1">Compositions:</Typography>
                                            <Stack className="ml-2" >
                                                {cr.spec?.vserviceCompositions?.map((vsc) => (
                                                    <Stack className="pl-1 mb-2" sx={{'border-left': '2px solid gray', }}>
                                                    <Typography variant="caption" display="inline">{vsc.apiVersion}</Typography>
                                                    <Typography variant="caption" display="inline">{vsc.kind}</Typography>
                                                    </Stack>
                                                ))}
                                            </Stack>
                                            </Box>
                                        )}
                                        <Grid container>
                                            <Grid item>
                                                {cr.spec?.vservicecosts?.map((vsc) => (
                                                    (
                                                        <Tooltip title={vsc.providerReference.region}>
                                                        <Chip variant="ghost" className="m-1" 
                                                            color={getColorFromType(vsc.providerReference.type)} size="sm" 
                                                        value={vsc.providerReference.name +" ["+ vsc.providerReference.region+"]" + " ("+ vsc.providerReference.type+")"} />
                                                        </Tooltip>
                                                    )
                                                ))}
                                            </Grid>
                                        </Grid>
                                        </>
                                    )}
                                    {cr.metadata?.annotations?.['skycluster.io/config-type'] == "ilp-task" && (
                                        <>
                                        <Box>
                                        {Object.entries(JSON.parse(cr.status?.solution || '{}')).map(([key, value]) => (
                                            <Box className="m-2 p-1"  key={key}>
                                                <strong className="mr-1">{key.toUpperCase()}:</strong>
                                                {renderValue(value)}
                                            </Box>
                                            ))
                                        }
                                        </Box>
                                        </>
                                    )}
                                    <Box sx={{display: 'flex', flexDirection: 'row', p: 0, m: 0}}>
                                        <MuChip sx={{ p: 0, mt: 0.5, ml: 1, '& > *': {ml: '8px !important', mr: '-8px !important',}, }}
                                            icon={<InfoIcon />} size="small" variant="outlined" color="primary"
                                            onClick={() => copyToClipboard("kubectl get " + cr.kind + " " + cr.metadata.name)} />
                                        <MuChip sx={{ p: 0, mt: 0.5, ml: 1, '& > *': {ml: '8px !important', mr: '-8px !important',}, }}
                                            icon={<HelpOutlineIcon />} size="small" variant="outlined" color="secondary"
                                            onClick={() => onItemClick(cr)}
                                        />
                                        <MuChip sx={{ p: 0, mt: 0.5, ml: 1, '& > *': {ml: '8px !important', mr: '-8px !important',}, }}
                                            icon={<DeleteForeverIcon />} size="small" variant="outlined" color="error"
                                            onClick={() => copyToClipboard("kubectl delete " + cr.kind + " " + cr.metadata.name)} />
                                    </Box>
                                </Box>
                            </Grid>
                            ))}
                            </Grid>
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
