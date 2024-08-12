import {Alert, LinearProgress} from "@mui/material";
import apiClient from "../api.ts";
import CRDList from "../components/CRDList.tsx";
import {useEffect, useState} from "react";
import {ItemList, CRD} from "../types.ts";
import HeaderBar from "../components/HeaderBar.tsx";
import PageBody from "../components/PageBody.tsx";

const CRDsPage = () => {
    const [crds, setCRDs] = useState<ItemList<CRD> | null>(null);
    const [error, setError] = useState<object | null>(null);

    useEffect(() => {
        apiClient.getCRDList()
            .then((data) => setCRDs(data))
            .catch((error) => setError(error));
    }, []);

    if (error) {
        return (<Alert severity="error">Failed: {error.toString()}</Alert>)
    }

    if (!crds) return <LinearProgress/>;

    return (
        <>
            <HeaderBar title="SkyCluster CRDs"/>
            <PageBody>
                <CRDList crds={crds}></CRDList>
            </PageBody>
        </>
    );
};

export default CRDsPage;
