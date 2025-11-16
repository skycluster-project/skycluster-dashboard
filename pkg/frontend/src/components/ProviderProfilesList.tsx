import InfoIcon from '@mui/icons-material/Info';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import RefreshIcon from '@mui/icons-material/Refresh';
import {CircularProgress, Stack, Card, Chip, CardContent, Grid, List, Button, Box, Alert} from '@mui/material';
import Typography from "@mui/material/Typography";
import ReadySynced from "./ReadySynced.tsx";
import { useState } from "react";
import InfoTabs, {ItemContext} from "./InfoTabs.tsx";
import ConditionChips from "./ConditionChips.tsx";
import InfoDrawer from "./InfoDrawer.tsx";
import {useNavigate, useParams} from "react-router-dom";
import apiClient from "../api.ts";
import {ProviderProfile, ItemList, K8sResource} from "../types.ts";

type ItemProps = {
  item: ProviderProfile;
  onItemClick: { (item: ProviderProfile): void }
};

const copyToClipboard = (name: string) => {
  navigator.clipboard.writeText(name).then(() => {}, (err) => {
    console.error('Could not copy text: ', err);
  });
};

function ListItem({item: initialItem, onItemClick}: ItemProps) {
  const [item, setItem] = useState<ProviderProfile>(initialItem);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [group, version] = item.apiVersion.split("/");
      const refreshedData = await apiClient.getProviderProfile(group, version, item.metadata.name);
      setItem(refreshedData);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Grid item sx={{mb: 1}} m={1} xs={12} md={12} key={item.apiVersion + item.kind + item.metadata.name}>
      <Card variant="outlined">
        <CardContent>
          <Box sx={{display: 'flex', flexDirection: 'row', p: 0, m: 0, justifyContent: 'space-between', alignItems: 'center'}}>
            <Box>
              <Typography variant="h6">{item.metadata.name}</Typography>
              <Typography variant="body2" color="text.secondary">{item.spec?.description ?? ""}</Typography>
            </Box>
            <Box>
              <Chip sx={{ p: 0, mt: 0.5, ml: 1 }}
                icon={isLoading ? <CircularProgress size={20} /> : <RefreshIcon />}
                size="small" variant="outlined" color="warning" onClick={() => refreshData()}  />
              <Chip sx={{ p: 0, mt: 0.5, ml: 1 }}
                icon={<InfoIcon />} size="small" variant="outlined" color="primary"
                onClick={() => copyToClipboard("kubectl get " + item.kind + "." + item.apiVersion.split('/')[0] + " " + item.metadata.name)} />
              <Chip sx={{ p: 0, mt: 0.5, ml: 1 }}
                icon={<HelpOutlineIcon />} size="small" variant="outlined" color="secondary"
                onClick={() => copyToClipboard("kubectl describe " + item.kind + "." + item.apiVersion.split('/')[0] + " " + item.metadata.name)} />
              <Chip sx={{ p: 0, mt: 0.5, ml: 1 }}
                icon={<DeleteForeverIcon />} size="small" variant="outlined" color="error"
                onClick={() => copyToClipboard("kubectl delete " + item.kind + "." + item.apiVersion.split('/')[0] + " " + item.metadata.name)} />
            </Box>
          </Box>

          <Typography variant="body1">Kind: {item.kind}</Typography>
          <Typography variant="body1">Group/Version: {item.apiVersion}</Typography>

          <ReadySynced status={item.status ? item.status : {}} />
          <Stack direction="row" spacing={1} sx={{mt:1}}>
            <Chip icon={<InfoIcon />} label="Details" variant="outlined" color="info"
              onClick={() => onItemClick(item)} />
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );
}

type ItemListProps = {
  items: ItemList<ProviderProfile> | undefined;
};

export default function ProviderProfilesList({items}: ItemListProps) {
  const {name: focusedName} = useParams();
  const [isDrawerOpen, setDrawerOpen] = useState<boolean>(focusedName != undefined);
  const nullFocused = {metadata: {name: ""}, kind: "", apiVersion: ""} as K8sResource;
  const [focused, setFocused] = useState<K8sResource>(nullFocused);
  const navigate = useNavigate();

  const onClose = () => {
    setDrawerOpen(false)
    setFocused(nullFocused)
    navigate("/providerprofiles", {state: focused})
  }

  const onItemClick = (item: K8sResource) => {
    setFocused(item)
    setDrawerOpen(true)
    navigate(
      "./" + item.apiVersion + "/" + item.metadata.name,
      {state: item}
    );
  }

  if (!items || !items.items.length) {
    return (
      <Typography variant="h6">No items</Typography>
    )
  }

  if (!focused.metadata.name && focusedName) {
    items?.items?.forEach((item) => {
      if (focusedName == item.metadata.name) {
        setFocused(item)
      }
    })
  }

  // Bridge used by InfoTabs to fetch full details when needed
  const bridge = new ItemContext()
  bridge.setCurrent(focused)
  // bridge.getGraph = (setter, setError) => {
  //     const setData = (res: ProviderProfile) => {
  //         // InfoTabs likely expects the full object; pass through
  //         setter(res)
  //     }

  //     if (!focused || !focused.metadata?.name) {
  //         setError(new Error("No focused item"))
  //         return
  //     }

  //     const [group, version] = focused.apiVersion.split("/")
  //     apiClient.getProviderProfile(group, version, focused.kind, focused.metadata.name)
  //         .then((data) => setData(data))
  //         .catch((err) => setError(err))
  // }

  return (
    <>
      <Grid container>
        {items.items.map((item: ProviderProfile) => (
          <ListItem item={item} key={item.metadata.name} onItemClick={(i) => onItemClick(i)} />
        ))}
      </Grid>

      <InfoDrawer
        key={focused.metadata.name}
        isOpen={isDrawerOpen}
        onClose={onClose}
        type="Provider Profile"
        title={<>{focused.metadata.name}<ConditionChips status={focused.status ? focused.status : {}}/></>}>
          <InfoTabs bridge={bridge} initial="yaml"></InfoTabs>
      </InfoDrawer>
    </>
  );
}