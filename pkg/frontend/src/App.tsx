import {styled} from '@mui/material/styles';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import {Link as RouterLink, Route, Routes} from "react-router-dom";
import Home from "./pages/Home.tsx";
import ProvidersPage from "./pages/ProvidersPage.tsx";
import {CssBaseline, Link, ThemeProvider} from "@mui/material";
import ProviderPage from "./pages/ProviderPage.tsx";
import ClaimsPage from "./pages/ClaimsPage.tsx";
import ClaimPage from "./pages/ClaimPage.tsx";
import AppPage from "./pages/AppPage.tsx";
import ManagedResourcesPage from "./pages/ManagedResourcesPage.tsx";
import CompositeResourcesPage from "./pages/CompositeResourcesPage.tsx";
import CompositionsPage from "./pages/CompositionsPage.tsx";
import XRDsPage from "./pages/XRDsPage.tsx";
import {themeDark, themeLight} from "./theme.ts";
import MainMenu from "./components/MainMenu.tsx";
import CRDsPage from './pages/CRDsPage.tsx';
import CRsPage from './pages/CRsPage.tsx';
import CMsPage from './pages/CMsPage.tsx';
import SkyClusterResourcesPage from "./pages/SkyClusterResourcesPage.tsx";

const drawerWidth = 260;

const DrawerHeader = styled('div')(({theme}) => ({
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0, 1),
    // necessary for content to be below app bar
    ...theme.mixins.toolbar,
    justifyContent: 'center',
}));

export default function App() {
    // TODO: extract some components from here
    const XRDs = <XRDsPage/>
    const compositions = <CompositionsPage/>
    const composite = <CompositeResourcesPage/>
    const skycluster = <SkyClusterResourcesPage/>
    const managed = <ManagedResourcesPage/>

    return (
        <>
            <CssBaseline/>
            <Box className={"flex grow"}>
                <ThemeProvider theme={themeDark}>
                    <Drawer
                        sx={{
                            width: drawerWidth,
                            zIndex: 100,
                            '& .MuiDrawer-paper': {
                                backgroundColor: "#061431",
                                width: drawerWidth,
                            },
                        }}
                        hideBackdrop={true}
                        variant="persistent"
                        anchor="left"
                        open={true}
                        PaperProps={{sx: {backgroundColor: "transparent", color: "white"}}}
                    >
                        <Box className="flex flex-col grow justify-between">
                            <Box>
                                <DrawerHeader>
                                    <Box className="flex justify-between flex-row py-3 pb-5">
                                        <Link component={RouterLink} to="/" color={"#ffffff"} underline="none">
                                            <p className="font-extrabold text-4xl font-serif">SkyCluster</p>
                                        </Link>
                                    </Box>
                                </DrawerHeader>
                                <Divider/>
                                <MainMenu/>
                            </Box>
                        </Box>
                    </Drawer>
                </ThemeProvider>
                <Box className={"bg-gray-50"} sx={{
                    flexGrow: 1,
                    height: "100vh"
                }}>
                    <ThemeProvider theme={themeLight}>
                        <Routes>
                            <Route path="/" element={<Home/>}/>
                            <Route path="/providers" element={<ProvidersPage/>}/>
                            <Route path="/providers/:provider" element={<ProviderPage/>}/>
                            <Route path="/claims" element={<ClaimsPage/>}/>
                            <Route path="/claims/:group/:version/:kind/:namespace/:name" element={<ClaimPage/>}/>
                            <Route path="/remote/:group/:version/:kind/:namespace/:name" element={<AppPage/>}/>
                            <Route path="/remote/:group/:version/:kind/:namespace/:name/:deployName" element={<AppPage/>}/>
                            <Route path="/managed" element={managed}/>
                            <Route path="/managed/:group/:version/:kind/:name" element={managed}/>
                            <Route path="/skycluster" element={skycluster}/>
                            <Route path="/skycluster/:group/:version/:kind/:name" element={skycluster}/>
                            <Route path="/composite" element={composite}/>
                            <Route path="/composite/:group/:version/:kind/:name" element={composite}/>
                            <Route path="/compositions" element={compositions}/>
                            <Route path="/compositions/:name" element={compositions}/>
                            <Route path="/xrds" element={XRDs}/>
                            <Route path="/xrds/:name" element={XRDs}/>
                            <Route path="/cms" element={<CMsPage/>}/>
                            <Route path="/cms/:name" element={<CMsPage/>}/>
                            <Route path="/crds" element={<CRDsPage/>}/>
                            <Route path="/crs/:group/:version/:name" element={<CRsPage/>}/>
                            <Route path="/crs/:group/:version/:name/:focusedName" element={<CRsPage/>}/>
                            <Route path="*" element={<Typography>Page not found</Typography>}/>
                        </Routes>
                    </ThemeProvider>
                </Box>
            </Box>
        </>
    )
        ;
}