import {
    AppStatus,
    CompositeResource,
    CompositeResourceExtended,
    ItemList,
    K8sEvent,
    ManagedResource,
    ManagedResourceExtended,
    ProviderProfile,
    CRD,
    CM,
    K8sResource,
} from "./types.ts";
import {sendStatsToHeap} from "./utils.ts";

class APIClient {
    constructor(
        protected readonly baseUrl: string,
    ) {
    }

    innterFetch = async (path: string) => {
        const response = await fetch(`${this.baseUrl}${path}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch data from API. Status code: ${response.status}`);
        }
        return response
    };

    getCMsList = async () => {
        const response = await this.innterFetch(`/api/cms`);
        const data: ItemList<CM> = await response.json();
        sendStatsToHeap('List CMs', {count: data.items.length});
        return data;
    };

    getCRDsList = async () => {
        const response = await this.innterFetch(`/api/crds`);
        const data: ItemList<CRD> = await response.json();
        sendStatsToHeap('List CRDs', {count: data.items.length});
        return data;
    };
    
    getCRD = async (name: string) => {
        const response = await this.innterFetch(`/api/crds/${name}`);
        const data: CRD = await response.json();
        return data;
    }

    getCustomResources = async (group: string, version: string, resource: string) => {
        const response = await this.innterFetch(`/api/crs/${group}/${version}/${resource}`);
        const data: ItemList<CompositeResourceExtended> = await response.json();
        return data;
    };

    getEvents = async (path: string) => {
        const response = await this.innterFetch(`/api/events/${path}`);
        const data: ItemList<K8sEvent> = await response.json();
        return data;
    };
    
    getRemoteResource = async (group?: string, version?: string, kind?: string, namespace?: string, name?: string, deployName?: string) => {
        const response = await this.innterFetch(`/api/remote/`+ group + "/" + version + "/" + kind + "/" + namespace + "/" + name + "/" + deployName);
        const data: K8sResource = await response.json();
        return data;
    };

    getRemoteResources = async (group?: string, version?: string, kind?: string, namespace?: string, name?: string) => {
        const response = await this.innterFetch(`/api/remote/`+ group + "/" + version + "/" + kind + "/" + namespace + "/" + name);
        const data: ItemList<K8sResource> = await response.json();
        return data;
    };

    getManagedResourcesList = async () => {
        const response = await this.innterFetch(`/api/managed`);
        const data: ItemList<ManagedResource> = await response.json();
        sendStatsToHeap('List MRs', {count: data.items.length});
        return data;
    };

    getManagedResource = async (group?: string, version?: string, kind?: string, name?: string) => {
        const response = await this.innterFetch(`/api/managed/` + group + "/" + version + "/" + kind + "/" + name + "?full=1");
        const data: ManagedResourceExtended = await response.json();
        return data;
    };

    getProviderProfilesList = async () => {
        const response = await this.innterFetch(`/api/providerprofiles`);
        const data: ItemList<ProviderProfile> = await response.json();
        sendStatsToHeap('List ProviderProfiles', {count: data.items.length});
        return data;
    };

    getProviderProfile = async (group?: string, version?: string, kind?: string, name?: string) => {
        const response = await this.innterFetch(`/api/providerprofiles/` + group + "/" + version + "/" + kind + "/" + name + "?full=1");
        const data: ProviderProfile = await response.json();
        return data;
    };

    getCompositeResourcesList = async () => {
        const response = await this.innterFetch(`/api/composite`);
        const data: ItemList<CompositeResource> = await response.json();
        sendStatsToHeap('List XRs', {count: data.items.length});
        return data;
    };

    getCompositeResource = async (group?: string, version?: string, kind?: string, name?: string) => {
        const response = await this.innterFetch(`/api/composite/` + group + "/" + version + "/" + kind + "/" + name + "?full=1");
        const data: CompositeResourceExtended = await response.json();
        return data;
    };

    getSystemComposites = async () => {
        const response = await this.innterFetch(`/api/system`);
        const data: ItemList<CompositeResource> = await response.json();
        sendStatsToHeap('List System Composites', {count: data.items.length});
        return data;
    };

    // getCompositionsList = async () => {
    //     const response = await this.innterFetch(`/api/compositions`);
    //     const data: ItemList<Composition> = await response.json();
    //     sendStatsToHeap('List Compositions', {count: data.items.length});
    //     return data;
    // };

    // getXRDsList = async () => {
    //     const response = await this.innterFetch(`/api/xrds`);
    //     const data: ItemList<XRD> = await response.json();
    //     sendStatsToHeap('List XRDs', {count: data.items.length});
    //     return data;
    // };

    getStatus = async () => {
        const response = await this.innterFetch(`/status`);
        const data: AppStatus = await response.json();
        return data;
    }
}

let baseURL = ""

if (import.meta.env.DEV) {
    baseURL = "http://localhost:8090"
}

const apiClient = new APIClient(baseURL);

export default apiClient;
