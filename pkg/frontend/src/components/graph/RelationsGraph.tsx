import ReactFlow, {
    Background, Connection,
    ConnectionLineType,
    Controls,
    Edge,
    addEdge,
    Node,
    Position,
    useEdgesState,
    useNodesState,
    BackgroundVariant,
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import {BaseSyntheticEvent, useCallback, useEffect} from "react";
import {ClaimNode, CompositionNode, MRNode, ProviderConfigNode, XRNode} from "./CustomNodes.tsx"

// const nodeWidth = 250;
// const nodeHeight = 50;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph({directed: true});
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const isHorizontal = direction === 'LR' || direction === "RL";
    dagreGraph.setGraph({rankdir: direction, ranksep: 400, nodesep: 100});

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, {});
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = isHorizontal ? Position.Left : Position.Top;
        node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

        // We are shifting the dagre node position (anchor=center center) to the top left
        // so it matches the React Flow node anchor point (top left).
        node.position = {
            x: nodeWithPosition.x,
            y: nodeWithPosition.y,
        };

        return node;
    });

    return {nodes, edges};
};


type GraphProps = {
    nodes: Node[];
    edges: Edge[];
};

const nodeTypes = {
    claim: ClaimNode,
    composed: XRNode,
    managed: MRNode,
    composition: CompositionNode,
    provConfig: ProviderConfigNode,
};

const RelationsGraph = ({nodes: initialNodes, edges: initialEdges}: GraphProps) => {

    // FIXME: something wrong is happening here or in the calling code, not always layouted properly
    const {nodes: layoutedNodes, edges: layoutedEdges} = getLayoutedElements(
        initialNodes,
        initialEdges,
        "LR"
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

    useEffect(() => {
        setNodes([...layoutedNodes]);
        setEdges([...layoutedEdges]);
    }, [layoutedEdges, layoutedNodes, setEdges, setNodes]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    const onNodeClick = (_: BaseSyntheticEvent, element: Node | Edge) => {
        if (element.data.onClick) {
            element.data.onClick()
        }
    }


    return (
        <ReactFlow
            nodeTypes={nodeTypes}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            connectionLineType={ConnectionLineType.SmoothStep}
            nodesConnectable={false}
            fitView
        >
            <Background variant={BackgroundVariant.Dots} gap={15} size={1} />
            <Controls showInteractive={true} showZoom={true} showFitView={true} position={"top-right"}/>
        </ReactFlow>
    );
};

export default RelationsGraph;