export type WidgetTableValue = Record<string, any[]>

export interface WidgetStructure{
    path: string;
    widgetIndex: number;
    name?: string;
    outputType: string;
    options?: any;
    uiWeight?: number;
    indent?: number;
    split?: boolean;
}

export interface WidgetTableStructureNode {
    path: string;
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
    nodePaths: string[]
}

export interface WidgetTableStructure {
    widgetTableID: string,
    widgetTablePath: string,
    widgetTablePersisted: boolean,
    nodes: Record<string, WidgetTableStructureNode>
    groups: Record<number, WidgetTableStructureGroup>
    nodeIndexes: string[]
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
