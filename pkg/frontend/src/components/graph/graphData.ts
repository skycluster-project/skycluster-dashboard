import {Node} from "reactflow";
import {GraphData, GraphDataApplication, NodeTypes} from "./data.ts";
import {ClaimExtended, K8sResource, ManagedResourceExtended, ItemList} from "../../types.ts";
import {NavigateFunction} from "react-router-dom";

export function graphDataFromClaim(claim: ClaimExtended, navigate: NavigateFunction): GraphData {
  const graphData = new GraphData()

  const claimId = graphData.addNode(NodeTypes.Claim, claim, true, navigate)

  // We don't need the compositions for now
  // const compId = graphData.addNode(NodeTypes.Composition, claim.composition, false, navigate);
  // graphData.addEdge(claimId, compId)

  const xrId = graphData.addNode(NodeTypes.CompositeResource, claim.compositeResource, false, navigate);
  graphData.addEdge(claimId, xrId)

  // TODO: check that composite resource points to the same composition and draw line between them

  // Each composite object (xr) has a list of resources (managed and composite resources)
  // stored within managedResources fields
  claim.compositeResource.managedResources?.map(res => {
      // Draw recursively
      // To identidy the type we need to check external-name annotation
      // if it's present, it's a managed resource
      let resType: NodeTypes;
      if (res.metadata.annotations && res.metadata.annotations['crossplane.io/external-name']) {
          resType = NodeTypes.ManagedResource;
      } else {
          resType = NodeTypes.CompositeResource;
      }
      const resId = graphData.addNode(resType, res, false, navigate);
      graphData.addEdge(xrId, resId)

      graphDataFromComposition(graphData, res, resId, navigate)
  })

  return graphData;
}

export function graphDataFromComposition(graphData: GraphData, mngRes: ManagedResourceExtended, mngResId: Node, navigate: NavigateFunction) {
  mngRes.managedResources?.map((res: ManagedResourceExtended) => {
      const resId = graphData.addNode(NodeTypes.ManagedResource, res, false, navigate);
      graphData.addEdge(mngResId, resId)
      // Recursively draw the graph
      graphDataFromComposition(graphData, res, resId, navigate)
  })
}



export function graphDataFromDeployments(addrBase: String, deploys: ItemList<K8sResource>, navigate: NavigateFunction): GraphDataApplication {
  const graphData = new GraphDataApplication()

  deploys.items.map((deploy: K8sResource) => {
      graphData.addNode(deploy, addrBase, navigate)
      // TODO: Add edge between deployments
  })

  return graphData;
}