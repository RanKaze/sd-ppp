
export type WidgetTableValue = Record<number, any[]>

export interface WidgetStructure{
    nodeId: number;
    widgetIndex: number;
    name?: string;
    outputType: string;
    options?: any;
    uiWeight?: number;
    indent?: number;
    split?: boolean;
}

export interface WidgetTableStructureNode {
    id: number;
    title: string;
    widgets: WidgetStructure[];
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
