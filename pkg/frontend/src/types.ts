export type AppStatus = {
    CrossplaneInstalled: boolean;
    CurVer: string;
    LatestVer: string;
    Analytics: boolean;
}

export type ItemList<S> = {
    items: S[]
}

export type Metadata = {
    managedFields?: object[];
    name: string
    namespace?: string
    annotations?: { [key: string]: string; }
    labels?: { [key: string]: string; }
}

export type Condition = {
    "type": string,
    "status": string,
    "lastTransitionTime": string,
    "reason": string
    message?: string;
}

export type Status = {
    users?: number
    conditions?: Condition[]
}

export type Reference = {
    name: string
    namespace: string
}

export type TypeReference = {
    kind: string
    apiVersion: string
}

export type K8sReference = Reference & TypeReference


export type K8sResource = {
    kind: string
    apiVersion: string
    metadata: Metadata,
    status?: Status
}

// export type SkyClusterResource = K8sResource & {
//     spec?: {
//         vservicecosts?: {
//             providerReference: {
//                 name: string
//                 region: string
//                 type: string
//             }
//         }[]
//         vserviceCompositions?: {
//             apiVersion: string
//             kind: string
//         }[]
//     }
//     status?: {
//         // For ILP Task
//         result?: string
//         solution?: string
//     }
// }

export type CM = K8sResource & {
    data: { [key: string]: string }
}

export type CRD = K8sResource & {
    spec: {
        group: string
        names: {
            kind: string
            plural: string
        }
        versions: {
            name: string
            served?: boolean
        }[]
        resourceRefs: Reference[]
    }
    status: Status
}

export type Provider = K8sResource & {
    spec: {
        package: string
        controllerConfigRef: Reference
    }
    status: Status
}

export type K8sEvent = K8sResource & {
    reason: string
    count: number
    message: string
    type: string
    firstTimestamp: string
    lastTimestamp: string
}

export type ProviderConfig = K8sResource

export type Claim = K8sResource & {
    spec: {
        compositionRef?: Reference
        resourceRef: Reference
    }
    status: Status
    [key: string]: object
}

export type ClaimExtended = Claim & {
    managedResources: ManagedResource[]
    compositeResource: CompositeResourceExtended
    composition: Composition
}

export type ManagedResource = K8sResource & {
    spec: {
        providerConfigRef?: Reference
    }
    status?: Status
}

export type ManagedResourceExtended = ManagedResource & {
    managedResources: ManagedResourceExtended[]
    composite?: CompositeResource
    provConfig?: ProviderConfig
}

export type CompositeResource = K8sResource & {
    spec: {
        claimRef?: Reference
        compositionRef?: Reference
        resourceRefs: Reference[]
    }
    status?: Status
}

export type CompositeResourceExtended = CompositeResource & {
    managedResources: ManagedResourceExtended[]
    managedResourcesXRs: K8sReference[]
    managedResourcesClaims: K8sReference[]
    composition: Composition
    claim?: Claim
    parentXR?: CompositeResource
}

export type Composition = K8sResource & {
    spec: {
        compositeTypeRef: TypeReference
        resources?: {
            name: string
            base: K8sResource
            patches: object[] // TODO
        }[]
    }
    status: never
}

export type Names = {
    kind: string
    plural: string
}

export type Version = {
    name: string
    schema: object
}

export type XRD = K8sResource & {
    spec: {
        group: string
        claimNames?: Names
        names: Names
        versions: Version[]
    }
    status: Status
}

export type SkyClusterResource = K8sResource 