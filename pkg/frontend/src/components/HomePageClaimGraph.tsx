import {Alert, Stack, Box, LinearProgress, Paper, Typography} from "@mui/material";
import {useEffect, useState} from "react";
import {Claim, ClaimExtended, ItemList} from "../types.ts";
import RelationsGraph from "../components/graph/RelationsGraph.tsx";
import {graphDataFromClaim} from "../components/graph/graphData.ts";
import apiClient from "../api.ts";

type Props = {
    title: string
    getter: () => Promise<ItemList<Claim>>
};

const HomePageClaimGraph = ({title, getter}: Props) => {
    const [items, setItems] = useState<ItemList<Claim> | null>(null);
    const [claimResponses, setClaimResponses] = useState<Record<string, ClaimExtended>>({});
    const [error, setError] = useState<object | null>(null);

    useEffect(() => {
        getter()
            .then((data) => setItems(data))
            .catch((error) => setError(error));
    }, [getter]);

    useEffect(() => {
        if (items) {
            items.items.forEach(item => {
                apiClient.getClaim(item.apiVersion.split('/')[0], item.apiVersion.split('/')[1], item.kind, item.metadata.namespace, item.metadata.name)
                .then((claimResponse) => {
                    setClaimResponses(prev => ({
                        ...prev,
                        [item.metadata.name]: claimResponse
                    }));
                }).catch((error) => setError(error));
            });
        }
      }, [items]);

    if (error) {
        return (<Alert severity="error">Failed: {error.toString()}</Alert>)
    }

    const dataGraphMap = claimResponses ? Object.entries(claimResponses).reduce((acc, [key, claim]) => {
        acc[key] = graphDataFromClaim(claim, () => {});
        return acc;
    }, {} as Record<string, ReturnType<typeof graphDataFromClaim>>) : {};
    
    const dataGraphList = claimResponses ? Object.values(claimResponses).map((c) => {
        return graphDataFromClaim(c, () => {})}
    ) : [];
    
    if (items == null || dataGraphList == null || dataGraphList.length == 0) {
        return <Paper className="p-5"><Typography variant="h5" className="pb-5">{title}</Typography><LinearProgress/></Paper>
    }

    return (
        <Paper className="p-5">
            <Stack>
                <Typography variant="h5" className="pb-5">{title}</Typography>
                { dataGraphMap && Object.entries(dataGraphMap).map(([key, data]) => {
                    return (
                        <>
                        <Box className="p-4 m-2" sx={{'height': '20rem', border: '1px dashed gray'}}>
                            <Typography variant="h6">{key}</Typography>
                            <RelationsGraph nodes={data.nodes} edges={data.edges}></RelationsGraph>
                        </Box>
                        </>
                    );
                })}
            </Stack>
        </Paper>
    );
};

export default HomePageClaimGraph;
