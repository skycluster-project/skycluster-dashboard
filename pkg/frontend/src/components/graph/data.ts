import {EdgeMarkerType} from "@reactflow/core/dist/esm/types/edges";
import {Edge, MarkerType, Node} from "reactflow";
import {NodeStatus} from "./CustomNodes.tsx";
import {K8sResource} from "../../types.ts";
import {logger} from "../../logger.ts";
import {NavigateFunction} from "react-router-dom";

export enum NodeTypes {
    Claim = "claim",
    Composition = "composition",
    CompositeResource = "composed",
    ManagedResource = "managed",
    ProviderConfig = "provConfig",
}

const NOOP = () => {
    // noop
}

export class GraphData {
    private id = 0;
    public nodes: Node[] = []
    public edges: Edge[] = []

    public addNode(ntype: NodeTypes, res: K8sResource, isMain: boolean, navigate: NavigateFunction): Node {
        const status = this.getStatus(res)
        const onClick = this.genOnClick(ntype, res, isMain, navigate)
        const compositionName = res?.metadata.annotations ? res.metadata.annotations["crossplane.io/composition-resource-name"] : null
        const node = {
            id: (++this.id).toString(),
            type: ntype,
            data: {
                label: res?.metadata.name,
                apiVersion: res?.apiVersion,
                kind: res?.kind,
                compositionName: compositionName,
                status: status[0],
                statusMsg: status[1],
                provider: res?.metadata.labels ? res.metadata.labels["skycluster.io/provider-name"] : null,
                region: res?.metadata.labels ? res.metadata.labels["skycluster.io/provider-region"] : null,
                main: isMain,
                onClick: onClick == NOOP ? undefined : onClick,
            },
            position: {x: 0, y: 0},
        };
        this.nodes.push(node)
        return node
    }

    addEdge(src: Node, tgt: Node): void {
        const edge: Edge = {
            id: (++this.id).toString(),
            source: src.id,
            target: tgt.id,
            animated: true,
        };

        const marker: EdgeMarkerType = {type: MarkerType.ArrowClosed, width: 20, height: 20}

        switch (src.data.status) {
            case NodeStatus.NotFound:
                edge.style = {stroke: 'maroon'}
                marker.color = "maroon"
                break
            case NodeStatus.NotReady:
                edge.style = {stroke: 'red'}
                marker.color = "red"
                break
            case NodeStatus.Unhealthy:
                edge.style = {stroke: 'red'}
                marker.color = "red"
                break
            case NodeStatus.NotSynced:
                edge.style = {stroke: 'orange'}
                marker.color = "orange"
                break
            default:
                break;
        }

        edge.markerEnd = marker

        this.edges.push(edge)
    }

    private getStatus(res: K8sResource): [NodeStatus, string] {
        if (!res) {
            return [NodeStatus.NotFound, "Not Specified"]
        }

        const problems: { [key: string]: string } = {}

        res.status?.conditions?.forEach((element) => {
            if (element.status != "True") {
                problems[element.type] = element.reason
            }
        });


        if (problems["Found"]) {
            return [NodeStatus.NotFound, problems["Found"]]
        } else if (problems["Healthy"]) {
            return [NodeStatus.Unhealthy, problems["Healthy"]]
        } else if (problems["Synced"]) {
            return [NodeStatus.NotSynced, problems["Synced"]]
        } else if (problems["Ready"]) {
            return [NodeStatus.NotReady, problems["Ready"]]
        }

        return [NodeStatus.Ok, ""]
    }

    private genOnClick(ntype: NodeTypes, res: K8sResource, isMain: boolean | undefined, navigate: NavigateFunction): () => void {
        const [status,] = this.getStatus(res)

        if (isMain || status == NodeStatus.NotFound) {
            return NOOP
        }

        let url = "/"
        switch (ntype) {
            case NodeTypes.Claim:
                url = "/claims/" + res.apiVersion + '/' + res.kind + '/' + res.metadata.namespace + '/' + res.metadata.name
                break;
            case NodeTypes.Composition:
                url = "/compositions/" + res.metadata.name
                break;
            case NodeTypes.CompositeResource:
                url = "/composite/" + res.apiVersion + "/" + res.kind + "/" + res.metadata.name
                break;
            case NodeTypes.ManagedResource:
                url = "/managed/" + res.apiVersion + "/" + res.kind + "/" + res.metadata.name
                break;
            default:
                logger.warn("Unhandled node type", ntype)
                return NOOP
        }

        return () => {
            navigate(url)
        }
    }
}

export class GraphDataApplication {
    private id = 0;
    public nodes: Node[] = []
    public edges: Edge[] = []

    public addNode(res: K8sResource, addr: String, navigate: NavigateFunction): Node {
        const status = this.getStatus(res)
        const onClick = ()=> {
            navigate(res.metadata.name, {state: {deploy: res}});
        }
        const node = {
            id: (++this.id).toString(),
            type: NodeTypes.Claim,
            data: {
                label: res?.metadata.name,
                apiVersion: res?.apiVersion,
                kind: res?.kind,
                status: status[0],
                statusMsg: status[1],
                provider: res?.metadata.labels ? res.metadata.labels["skycluster.io/provider-name"] : null,
                region: res?.metadata.labels ? res.metadata.labels["skycluster.io/provider-region"] : null,
                main: false,
                onClick: onClick == NOOP ? undefined : onClick,
            },
            position: {x: 0, y: 0},
        };
        this.nodes.push(node)
        return node
    }

    addEdge(src: Node, tgt: Node): void {
        const edge: Edge = {
            id: (++this.id).toString(),
            source: src.id,
            target: tgt.id,
            animated: true,
        };

        const marker: EdgeMarkerType = {type: MarkerType.ArrowClosed, width: 20, height: 20}

        switch (src.data.status) {
            case NodeStatus.NotFound:
                edge.style = {stroke: 'maroon'}
                marker.color = "maroon"
                break
            case NodeStatus.NotReady:
                edge.style = {stroke: 'red'}
                marker.color = "red"
                break
            case NodeStatus.Unhealthy:
                edge.style = {stroke: 'red'}
                marker.color = "red"
                break
            case NodeStatus.NotSynced:
                edge.style = {stroke: 'orange'}
                marker.color = "orange"
                break
            default:
                break;
        }

        edge.markerEnd = marker

        this.edges.push(edge)
    }

    private getStatus(res: K8sResource): [NodeStatus, string] {
        if (!res) {
            return [NodeStatus.NotFound, "Not Specified"]
        }

        const problems: { [key: string]: string } = {}

        res.status?.conditions?.forEach((element) => {
            if (element.status != "True") {
                problems[element.type] = element.reason
            }
        });


        if (problems["Found"]) {
            return [NodeStatus.NotFound, problems["Found"]]
        } else if (problems["Healthy"]) {
            return [NodeStatus.Unhealthy, problems["Healthy"]]
        } else if (problems["Synced"]) {
            return [NodeStatus.NotSynced, problems["Synced"]]
        } else if (problems["Ready"]) {
            return [NodeStatus.NotReady, problems["Ready"]]
        }

        return [NodeStatus.Ok, ""]
    }

}