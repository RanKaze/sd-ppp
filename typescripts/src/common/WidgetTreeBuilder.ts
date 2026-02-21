import type { WidgetTableStructureNode } from "../types/sdppp/index.js";

/**
 * 树节点接口
 */
export interface TreeNode {
    indent: number;
    nodes: (TreeNode  | WidgetTableStructureNode['widgets'][number]) [];
}

/**
 * 树结构维护类
 * 负责根据 widget 的 indent 构建和维护树状结构
 */
export class WidgetTreeBuilder {
    /**
     * 构建树结构
     * @param widgets widget 数组
     * @returns 树结构数组
     */
    static buildTree(widgets: WidgetTableStructureNode['widgets']): TreeNode {
        const rootNode: TreeNode = {
            indent: 0,
            nodes: []
        };

        if (!widgets || widgets.length === 0) {
            return rootNode;
        }
        
        let currentPath: TreeNode[] = [];
        let currentNode: TreeNode = rootNode;

        let prevIndent = 0;
        for (let index = 0; index < widgets.length; index++) {
            const widget = widgets[index];
            const indent = (widget as any).indent ?? 0;

            let indentDiff = indent - prevIndent;
            while(indentDiff > 0){
                // 新增子节点
                const newNode: TreeNode = {
                    indent: indent,
                    nodes: []
                };
                currentPath.push(newNode);
                currentNode.nodes.push(newNode);
                currentNode = newNode;
                indentDiff--;
            }
            while(indentDiff < 0){
                // 回退到上一级节点
                currentPath.pop();
                currentNode = currentPath[currentPath.length - 1] || rootNode;
                indentDiff++;
            }

            if(widget.split !== undefined && widget.split){
                // 如果分裂,那么创造一个同级节点
                const newNode: TreeNode = {
                    indent: indent,
                    nodes: []
                };
                currentPath.pop();
                currentNode = currentPath[currentPath.length - 1] || rootNode;
                // 上一级的节点
                currentNode.nodes.push(newNode);
                currentPath.push(newNode);
                currentNode = newNode;
            }

            currentNode.nodes.push(widget);
            prevIndent = indent;
        }

        return rootNode;
    }
}