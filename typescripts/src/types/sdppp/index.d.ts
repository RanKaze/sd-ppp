
export type WidgetTableValue = Record<number, any[]>
export interface WidgetTableStructureNode {
    id: number;
    title: string;
    widgets: {
        // value: string;
        name?: string;
        outputType: string;
        options?: any;
        overrideId?: number;
        uiWeight?: number;
        overrideId?: number;
        indent?: number;
        split?: boolean;
    }[];
    blocks?: WidgetTableStructureBlock[];
    uiWeightSum: number
}
export interface WidgetTableStructureBlock {
    id: number;
    indent: number;
    split?: boolean;
    widgetModifiers?: {
        overrideName?: string;
        overrideWeight?: number;
    }[];
}
export interface WidgetTableStructureGroup {
    id: number;
    name: string,
    color: string,
    nodeIDs: number[]
}
export interface WidgetTableStructure {
    widgetTableID: string,
    widgetTablePath: string,
    widgetTablePersisted: boolean,
    nodes: Record<number, WidgetTableStructureNode>
    groups: Record<number, WidgetTableStructureGroup>
    nodeIndexes: number[]
    extraOptions: Record<string, any>
}

export interface ComfyStatus {
    progress: number;
    queueSize: number;
    lastError: string;
    executingNodeTitle: string;
    ssid?: string;
    sid?: string;
}
