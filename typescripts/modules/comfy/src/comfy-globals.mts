import { WidgetStructure } from "../../../src/types/sdppp";

const app = (window as any).comfyAPI.app.app;
const api = (window as any).comfyAPI.api.api;

// 递归遍历所有下级节点
function* graphIterateAllNodes(graph: any): Generator<any> {
    for (const node of graph.nodes) {
        yield node;
        if (node.subgraph && node.subgraph.nodes) {
            yield* graphIterateAllNodes(node.subgraph);
        }
    }
}

// 递归遍历所有下级组（仅返回 group，不混入 node）
function* graphIterateAllGroups(graph: any): Generator<any> {
    if (graph.groups) {
        for (const group of graph.groups) {
            yield group;
        }
    }
    // 继续深入子图查找 group
    if (graph.nodes) {
        for (const node of graph.nodes) {
            if (node.subgraph) {
                yield* graphIterateAllGroups(node.subgraph);
            }
        }
    }
}

function getNodeFromPath(rootGraph: any, path: string): any {
    const ids = path.split('/');
    let graph = rootGraph;
    for(let i = 0; i < ids.length - 1; i++){
        const id = ids[i];
        if(!graph.subgraphs.has(id)) throw new Error('Node not found');
        graph = graph.subgraphs.get(id);
    } 
    return graph.getNodeById(Number.parseInt(ids[ids.length - 1]));
}

function getPathFromNode(node: any): string {
    let paths = [];
    let graph = node.graph;
    while (graph != graph.rootGraph) {
        paths.push(graph.id);
        graph = graph.rootGraph;
    }

    let path = paths.length == 0 ? node.id.toString() : paths.join("/") + "/" + node.id;
    return path;
}

function getPathFromGroup(group: any): string {
    let paths = [];
    let graph = group.graph;
    while (graph != graph.rootGraph) {
        paths.push(graph.id);
        graph = graph.rootGraph;
    }

    let path = paths.length == 0 ? group.id.toString() : paths.join("/") + "/" + group.id;
    return path;
}

// 寻找同级节点
function findSiblingNodeById(node: any, id: number): any {
    const g = node.graph;
    for (const node of g.nodes) {
        if (node.id == id) return node;
    }
    return undefined;
}

// 寻找同级节点
function findSiblingNode(node: any, predict: (n: any) => boolean): any {
    const g = node.graph;
    for (const node of g.nodes) {
        if (predict(node)) return node;
    }
    return undefined;
}

// 遍历所有同级节点
function* iterateSiblingNodes(node: any): Generator<any> {
    const g = node.graph;
    for (const n of g.nodes) {
        yield* n;
    }
}

export {
    app, api, graphIterateAllNodes, graphIterateAllGroups, findSiblingNodeById, findSiblingNode, iterateSiblingNodes, getNodeFromPath, getPathFromNode, getPathFromGroup
}