import Typography from "@mui/material/Typography";
import {Box, Grid} from "@mui/material";
import HomePageBlock from "../components/HomePageBlock.tsx";
import apiClient from "../api.ts";
import {useNavigate} from "react-router-dom";
import ClaimsIcon from '@mui/icons-material/PanToolTwoTone';
import ManagedIcon from '@mui/icons-material/HubTwoTone';
import ProvidersIcon from '@mui/icons-material/GridViewTwoTone';
import PageBody from "../components/PageBody.tsx";
import XRDsIcon from "@mui/icons-material/SchemaTwoTone";
import CompositionsIcon from "@mui/icons-material/AccountTreeTwoTone";
import CompositeIcon from "@mui/icons-material/PolylineTwoTone";
import HomePageClaimGraph from "../components/HomePageClaimGraph.tsx";

function Home() {
    const navigate = useNavigate();
    return (
        <>
            <PageBody>
                <Box className="mb-5">
                    <p className="font-extrabold text-3xl font-serif">SkyCluster</p>
                    <Typography variant="subtitle2">Any Service, Anywhere.</Typography>
                </Box>
                <Grid container spacing={2}>
                    <Grid item sm={12} md={6} lg={3} >
                        <HomePageBlock title="SkyCluster Services" getter={apiClient.getClaimList} onClick={() => {
                            navigate("claims")
                        }} icon={<ClaimsIcon fontSize={"large"}/>}/>
                    </Grid>
                    {/* <Grid item md={12}>
                        <HomePageClaimGraph title="SkyCluster Services" getter={apiClient.getClaimList}/>
                    </Grid> */}
                    <Grid item sm={12} md={6} lg={3}>
                        <HomePageBlock title="SkyCluster Configs" getter={apiClient.getCMsList} onClick={() => {
                            navigate("cms")
                        }} icon={<XRDsIcon fontSize={"large"}/>}/>
                    </Grid>
                    <Grid item sm={12} md={6} lg={3}>
                        <HomePageBlock title="SkyCluster Custom Resource Definitions" getter={apiClient.getCRDsList} onClick={() => {
                            navigate("crds")
                        }} icon={<XRDsIcon fontSize={"large"}/>}/>
                    </Grid>
                    <Grid item sm={12} md={6} lg={3}>
                        <HomePageBlock title="Composite Resources" getter={apiClient.getCompositeResourcesList} onClick={() => {
                            navigate("composite")
                        }} icon={<CompositeIcon fontSize={"large"}/>}/>
                    </Grid>
                    <Grid item sm={12} md={6} lg={3}>
                        <HomePageBlock title="Managed Resources" getter={apiClient.getManagedResourcesList}
                            onClick={() => {
                                navigate("managed")
                            }} icon={<ManagedIcon fontSize={"large"}/>}/>
                    </Grid>
                </Grid>
                {/* <Grid item md={4}>
                    <HomePageBlock title="Compositions" getter={apiClient.getCompositionsList}
                                    onClick={() => {
                                        navigate("compositions")
                                    }} icon={<CompositionsIcon fontSize={"large"}/>}/>
                </Grid>
                <Grid item md={4}>
                    <HomePageBlock title="XRDs" getter={apiClient.getXRDsList} onClick={() => {
                        navigate("xrds")
                    }} icon={<XRDsIcon fontSize={"large"}/>}/>
                </Grid>
                <Grid item md={4}>
                    <HomePageBlock title="Providers" getter={apiClient.getProviderList} onClick={() => {
                        navigate("providers")
                    }} icon={<ProvidersIcon fontSize={"large"}/>}/>
                </Grid> */}
            </PageBody>
        </>
    );
}

export default Home;
