import apiClient from "../api.ts";
import {useEffect, useState} from "react";
import {CompositeResource, ItemList} from "../types.ts";
import CompositeResourcesList from "../components/CompositeResourcesList.tsx";
import HeaderBar from "../components/HeaderBar.tsx";
import PageBody from "../components/PageBody.tsx";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Input from '@mui/material/Input';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const CompositeResourcesPage = () => {
    const [items, setItems] = useState<ItemList<CompositeResource> | null>(null);
    const [error, setError] = useState<object | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');

    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        const fetchItems = () => {
            setLoading(true);
            apiClient
              .getCompositeResourcesList()
              .then((data) => setItems(data))
              .catch((error) => setError(error))
              .finally(()=> setLoading(false));
        };
        
        fetchItems();
        const intervalId = setInterval(fetchItems, 15000); // Refresh every 30 seconds
    
        return () => clearInterval(intervalId); // Cleanup on component unmount
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
                <Stack direction="row" spacing={2}>
                    <Chip sx={{ p: 0, mt: '5px', ml: 1, mr: 2 }}
                          label={loading ? "syncing":"synced"}  icon={loading ? <CircularProgress size={20} />:<CheckCircleIcon />} />
                    <Input 
                    className="w-full" 
                    type="text"
                    placeholder="Search" 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)}/>
                </Stack>
                
                <CompositeResourcesList items={
                    // TODO: Fix the undefined filterItems return value
                    filterItems(items, searchQuery).items.length > 0 ? filterItems(items, searchQuery) : items
                }></CompositeResourcesList>
            </PageBody>
        </>
    );
};

export default CompositeResourcesPage;
