import {Alert, LinearProgress, Box, Input} from "@mui/material";
import apiClient from "../api.ts";
import {useEffect, useState} from "react";
import {ItemList, ManagedResource} from "../types.ts";
import ManagedResourcesList from "../components/ManagedResourcesList.tsx";
import HeaderBar from "../components/HeaderBar.tsx";
import PageBody from "../components/PageBody.tsx";

const ManagedResourcesPage = () => {
    const [items, setItems] = useState<ItemList<ManagedResource> | null>(null);
    const [error, setError] = useState<object | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');

    useEffect(() => {
        apiClient.getManagedResourcesList()
            .then((data) => setItems(data))
            .catch((error) => setError(error));
    }, []);

    if (error) {
        return (<Alert severity="error">Failed: {error.toString()}</Alert>)
    }

    if (!items) {
        return <LinearProgress/>;
    }

    const filterItems = (items: ItemList<ManagedResource>, searchQuery: string) => {
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
            <HeaderBar title="Managed Resources"/>
            <PageBody>
            <Box m={1}>
                <Input 
                    className="w-full" 
                    type="text"
                    placeholder="Search" 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)}/>
                </Box>
                <ManagedResourcesList items={
                    filterItems(items, searchQuery).items.length > 0 ? filterItems(items, searchQuery) : items
                }></ManagedResourcesList>
            </PageBody>
        </>
    );
};

export default ManagedResourcesPage;
