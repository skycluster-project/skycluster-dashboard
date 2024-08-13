import {Alert, LinearProgress} from "@mui/material";
import apiClient from "../api.ts";
import CMList from "../components/CMList.tsx";
import {useEffect, useState} from "react";
import {ItemList, CM} from "../types.ts";
import HeaderBar from "../components/HeaderBar.tsx";
import PageBody from "../components/PageBody.tsx";

const CMsPage = () => {
    const [cms, setCMs] = useState<ItemList<CM> | null>(null);
    const [error, setError] = useState<object | null>(null);

    useEffect(() => {
        apiClient.getCMsList()
            .then((data) => setCMs(data))
            .catch((error) => setError(error));
    }, []);

    if (error) {
        return (<Alert severity="error">Failed: {error.toString()}</Alert>)
    }

    if (!cms) return <LinearProgress/>;

    return (
        <>
            <HeaderBar title="SkyCluster ConfigMaps"/>
            <PageBody>
                <CMList items={cms}></CMList>
            </PageBody>
        </>
    );
};

export default CMsPage;
