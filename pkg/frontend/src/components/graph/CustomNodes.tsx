import {Handle, NodeProps, Position} from 'reactflow';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import {Chip as MuChip, Box} from '@mui/material';
import { Chip } from "@material-tailwind/react";
import {Typography} from "@mui/material";
import IconUnhealthy from '@mui/icons-material/HeartBroken';
import IconNotFound from '@mui/icons-material/NotListedLocation';
import IconNotReady from '@mui/icons-material/ReportProblem';
import IconNoSync from '@mui/icons-material/SyncDisabled';
import { getColorFromLabel } from "../../utils.ts";

export enum NodeStatus {
    Ok = "Ok",
    NotSynced = "Not Synced",
    NotReady = "Not Ready",
    Unhealthy = "Unhealthy",
    NotFound = "Not Found",
}

function NodeStatusLine({data}: { data: { status: string, statusMsg: string } }) {
    let icon = (<></>)

    switch (data.status) {
        case NodeStatus.NotReady:
            icon = (<IconNotReady fontSize="small" color="error" titleAccess={data.statusMsg}/>)
            break
        case NodeStatus.Unhealthy:
            icon = (<IconUnhealthy fontSize="small" color="error" titleAccess={data.statusMsg}/>)
            break
        case NodeStatus.NotSynced:
            icon = (<IconNoSync fontSize="small" color="warning" titleAccess={data.statusMsg}/>)
            break
        case NodeStatus.NotFound:
            icon = (<IconNotFound fontSize="small" color="error" titleAccess={data.statusMsg}/>)
            break
        default:
            return (<></>)
    }

    return (
        <Typography color={icon.props.color} fontSize="small" className="pt-1">
            {icon} {data.status}
        </Typography>
    )
}

function CustomNode({data, sourcePosition, targetPosition}: NodeProps) {
    return (
        <Box className="border rounded border-gray-600" sx={{
            backgroundColor: data.bgcolor,
            maxWidth: 350,
            borderWidth: data.main ? 4 : null,
            cursor: data.onClick ? "pointer" : "grab"
        }}>
            <Box className="px-3 py-1 border-b border-gray-400 bg-gray-500 bg-opacity-20"
                 sx={{display: 'flex', justifyContent: 'space-between', flexDirection: 'row'}}>
                    <>
                    {data.provider ? (
                        <Chip className="mx-1 py-0 px-1 uppercase" variant="ghost" 
                            color={getColorFromLabel(data.provider, data.region)}
                            value={(data.provider ? "["+data.provider+"]" : "") + (data.region ? " / " + data.region : "")} />
                    ) : (
                        <Box></Box>
                    )} 
                    </>
                <Typography fontSize="x-small" className="text-xs" sx={{marginLeft: "0.5rem"}}
                            title={data.apiVersion}>{data.kind}</Typography>
            </Box>
            <Box className="px-3 py-1">
                <Typography variant="h6" sx={data.main ? {fontWeight: 'bold'} : {}}
                            title={data.compositionName ? data.label : ""}>
                    {data.compositionName ? data.compositionName : data.label}
                </Typography>
                <NodeStatusLine data={data}/>
            </Box>
            <Box className="px-1 mb-1">
                <MuChip sx={{ml: 1}}
                    icon={<HelpOutlineIcon />} label="Details" size="small" variant="outlined" color="secondary"
                    onClick={() => navigator.clipboard.writeText(
                        "kubectl describe " + data.kind + " " + data.label
                    ).then(() => {}, (err) => {
                        console.error('Could not copy text: ', err);
                    })} />
            </Box>
            <Handle type="target" position={targetPosition ? targetPosition : Position.Top}/>
            <Handle type="source" position={sourcePosition ? sourcePosition : Position.Bottom}/>
        </Box>
    );
}

export function ClaimNode(data: NodeProps) {
    data.data.type = "Claim"
    data.data.bgcolor = "#B6E1FF"
    return CustomNode(data)
}

export function CompositionNode(data: NodeProps) {
    data.data.type = "Composition"
    data.data.bgcolor = "#B893F5"
    return CustomNode(data)
}

export function MRNode(data: NodeProps) {
    data.data.type = "Managed Resource"
    data.data.bgcolor = "#90F4CE"
    return CustomNode(data)
}

export function XRNode(data: NodeProps) {
    data.data.type = "Composite Resource"
    data.data.bgcolor = "#FFCE85"
    return CustomNode(data)
}

export function ProviderConfigNode(data: NodeProps) {
    data.data.type = "Provider Config"
    data.data.bgcolor = "#B6E1FF"
    return CustomNode(data)
}

