import {Alert, Input, LinearProgress, Box} from "@mui/material";
import apiClient from "../api.ts";
import {useEffect, useState} from "react";
import {CompositeResource, ItemList} from "../types.ts";
import CompositeResourcesList from "../components/CompositeResourcesList.tsx";
import HeaderBar from "../components/HeaderBar.tsx";
import PageBody from "../components/PageBody.tsx";

const CompositeResourcesPage = () => {
    const [items, setItems] = useState<ItemList<CompositeResource> | null>(null);
    const [error, setError] = useState<object | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');

    useEffect(() => {
        apiClient.getCompositeResourcesList()
            .then((data) => setItems(data))
            .catch((error) => setError(error));
    }, []);

    if (error) {
        return (<Alert severity="error">Failed: {error.toString()}</Alert>)
    }

    if (!items) {
        return <LinearProgress/>;
    }

    const filterItems = (items: ItemList<CompositeResource>, searchQuery: string) => {
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
            <HeaderBar title="Composite Resources"/>
            <PageBody>
                <Box m={1}>
                    <Input 
                    className="w-full" 
                    type="text"
                    placeholder="Search" 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)}/>
                </Box>
                <CompositeResourcesList items={
                    // TODO: Fix the undefined filterItems return value
                    filterItems(items, searchQuery).items.length > 0 ? filterItems(items, searchQuery) : items
                }></CompositeResourcesList>
            </PageBody>
        </>
    );
};

export default CompositeResourcesPage;
