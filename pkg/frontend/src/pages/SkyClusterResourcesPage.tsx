import {Alert, Input, LinearProgress, Box} from "@mui/material";
import apiClient from "../api.ts";
import {useEffect, useState} from "react";
import {SkyClusterResource, ItemList} from "../types.ts";
import SkyClusterResourcesList from "../components/SkyClusterResourcesList.tsx";
import HeaderBar from "../components/HeaderBar.tsx";
import PageBody from "../components/PageBody.tsx";

const SkyClusterResourcesPage = () => {
    const [items, setItems] = useState<ItemList<SkyClusterResource> | null>(null);
    const [error, setError] = useState<object | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');

    useEffect(() => {
        apiClient.getSkyClusterResourcesList()
            .then((data) => setItems(data))
            .catch((error) => setError(error));
    }, []);

    if (error) {
        return (<Alert severity="error">Failed: {error.toString()}</Alert>)
    }

    if (!items) {
        return <LinearProgress/>;
    }

    const filterItems = (items: ItemList<SkyClusterResource>, searchQuery: string) => {
        if (searchQuery === '') {
            return items;
        }
        return {
            items: items.items.filter((item) => {
                return item.metadata.name.includes(searchQuery);
            }),
        };
    }

    return (
        <>
            <HeaderBar title="SkyCluster Resources"/>
            <PageBody>
                <Box m={1}>
                    <Input 
                    className="w-full" 
                    type="text"
                    placeholder="Search" 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)}/>
                </Box>
                <SkyClusterResourcesList items={
                    // TODO: Fix the undefined filterItems return value
                    filterItems(items, searchQuery).items.length > 0 ? filterItems(items, searchQuery) : items
                }></SkyClusterResourcesList>
            </PageBody>
        </>
    );
};

export default SkyClusterResourcesPage;
