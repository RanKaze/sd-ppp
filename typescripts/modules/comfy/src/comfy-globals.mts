
const app = (window as any).comfyAPI.app.app;
const $el = (window as any).comfyAPI.ui.$el;
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

function getRootGraph(graph: any): any {
    while (graph != graph.rootGraph) {
        graph = graph.rootGraph;
    }
    return graph;
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
    app, $el, api, graphIterateAllNodes, graphIterateAllGroups, findSiblingNodeById, findSiblingNode, iterateSiblingNodes, getRootGraph
}