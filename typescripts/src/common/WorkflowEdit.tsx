import React, { ReactNode, useMemo, useState } from "react";
import i18n from "./i18n.mjs";

import type { WidgetStructure, WidgetTableStructure, WidgetTableStructureGroup, WidgetTableStructureNode, WidgetTableValue } from "../types/sdppp/index.js";
import { computeUIWeightCSS, useTraceUpdate } from "./tsx/util.js";
import { WidgetTreeBuilder, TreeNode } from "./WidgetTreeBuilder.js";
import { WorkflowEditField } from "./tsx/WorkflowEditField.tsx";

interface WorkflowEditProps {
    widgetTableStructure: WidgetTableStructure;
    widgetTableValue: WidgetTableValue;
    widgetTableErrors: Record<number, string>;

    onWidgetRender?: (context: {
        keepRender: boolean;
        result: any[];
    }, widget: WidgetStructure, tableIndex: number) => boolean;
    onTitleRender?: (title: string, fieldInfo: WidgetTableStructureNode) => ReactNode;

    onWidgetChange: (widget: WidgetStructure, value: any) => void;
}

export default function WorkflowEdit({
    widgetTableStructure,
    widgetTableValue,
    widgetTableErrors,
    onWidgetRender,
    onWidgetChange,
    onTitleRender
}: WorkflowEditProps) {
    const [groupFilter, setGroupFilter] = useState<number>(0);

    function renderWidgetNode(indent: number, node: TreeNode | WidgetStructure, fieldInfo: WidgetTableStructureNode, groupColor: string): ReactNode | undefined {
        if (node && 'outputType' in node) {
            // 这是一个 widget
            const widget = node as WidgetStructure;
            const context = { keepRender: true, result: [] as any[] };
            onWidgetRender?.(context, widget, fieldInfo.widgets.indexOf(widget));
            //let rn = (
            //    <div className="workflow-edit-widget-item" data-indent={indent} style={{
            //        flex: '1 1 auto',
            //        marginBottom: '4px',
            //    }}>
            //        {context.result}
            //    </div>
            //);
            //return <WidgetRenderErrorBoundary key={widgetIndex}>{rn}</WidgetRenderErrorBoundary>
            return context.result[0];
        }else{
            let widgetElements: (ReactNode | undefined)[] = [];
            // 遍历节点的所有子元素
            for (let index = 0; index < node.nodes.length; index++) {
                const item = node.nodes[index];
                // 这是一个 TreeNode
                widgetElements.push(renderWidgetNode(node.indent, item, fieldInfo, groupColor));
            }

            widgetElements = widgetElements.filter(Boolean) as ReactNode[];
            if(widgetElements.length === 0) return undefined;
            // 生成容器
            return (
                <div className="workflow-edit-indent-container" data-indent={node.indent} style={{ 
                    borderColor: groupColor,
                    backgroundColor: 'rgba(52, 52, 52, .3)',
                    border: `1px solid ${groupColor}`,
                    borderRadius: '3px',
                    borderTopRightRadius: '0',
                    borderBottomRightRadius: '0',
                    flex: '1 1 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    paddingTop: '4px',
                    paddingBottom: '4px',
                    paddingLeft: '8px',
                }}>
                    {widgetElements}
                </div>
            );
        }
    }

    const allRenderedFields = useMemo(() => {
        return widgetTableStructure.nodeIndexes.map(nodeID => {
            const fieldInfo = widgetTableStructure.nodes[nodeID]
            const group = Object.values(widgetTableStructure.groups).find(group => group.nodeIDs.includes(fieldInfo.id))
            const groupColor = group?.color || 'rgba(127, 127, 127, .4)'
            if (groupFilter && group?.id !== groupFilter) return null;

            const useShortTitle = fieldInfo.uiWeightSum <= 8 && fieldInfo.widgets.length == 1 && (
                fieldInfo.widgets[0].outputType !== 'number' ||
                !widgetTableStructure.extraOptions?.useSliderForNumberWidget
            )
            
            const hasIndent = fieldInfo.widgets.some((w: any) => w.indent !== undefined);
            
            let widgetsContent: ReactNode[];
            if (hasIndent) {
                widgetsContent = [];
                const tree = WidgetTreeBuilder.buildTree(fieldInfo.widgets);
                for (let index = 0; index < tree.nodes.length; index++) {
                    const item = tree.nodes[index];
                    // 这是一个 TreeNode
                    widgetsContent.push(renderWidgetNode(tree.indent, item, fieldInfo, groupColor));
                }
                widgetsContent = widgetsContent.filter(Boolean) as ReactNode[];
            } else {
                const reduceWidgetRender = (context: {
                    keepRender: boolean;
                    result: any[];
                }, widget: WidgetStructure, widgetIndex: number) => {
                    if (!context.keepRender) return context;

                    if (widget.outputType === 'error') {
                        context.result.push(<span className="list-error-label">{widgetTableValue[fieldInfo.id][widgetIndex]}</span>)
                        return context;

                    } else if (onWidgetRender?.(context, widget, widgetIndex)) {
                    }
                    return context;
                }
                widgetsContent = fieldInfo.widgets.reduce(reduceWidgetRender, {
                    keepRender: true,
                    result: [] as any[]
                }).result.map((item: ReactNode, index: number) => {
                    return <WidgetRenderErrorBoundary key={index}>{item}</WidgetRenderErrorBoundary>
                });
            }

            return (
                <WorkflowEditField 
                    key={fieldInfo.id}
                    fieldInfo={fieldInfo}
                    groupColor={groupColor}
                    useShortTitle={useShortTitle}
                    widgetsContent={widgetsContent}
                    widgetTableErrors={widgetTableErrors}
                    onTitleRender={onTitleRender}
                />
            )
        }).filter(Boolean)
    }, [widgetTableStructure, widgetTableValue, widgetTableErrors, onWidgetRender, onWidgetChange, onTitleRender, groupFilter])

    const [
        nodeErrorsInWidgetTable,
        nodeErrorsNotInWidgetTable
    ] = useMemo(() => {
        return [
            Object.keys(widgetTableErrors).filter((key: any) => widgetTableStructure.nodes[parseInt(key)]),
            Object.keys(widgetTableErrors).filter((key: any) => !widgetTableStructure.nodes[parseInt(key)])
        ]
    }, [widgetTableErrors, widgetTableStructure]);
    let errorLabel = null;
    if (nodeErrorsNotInWidgetTable.length > 0) {
        errorLabel = <span className="list-error-label">{widgetTableErrors[+nodeErrorsNotInWidgetTable[0]]}</span>
    } else if (nodeErrorsInWidgetTable.length > 0) {
        errorLabel = <span className="list-error-label">{widgetTableErrors[+nodeErrorsInWidgetTable[0]]}</span>
    }

    return (
        <>
            {
                errorLabel
            }
            {
                !Object.keys(widgetTableStructure.nodes).length ?
                    (<span className="list-error-label">{i18n('no suitable node to control in this workflow')}</span>) : ''
            }
            {/* {
                (Object.keys(widgetTableStructure.groups).length > 1 || groupFilter > 0) && (
                    <GroupFilter
                        groups={Object.values(widgetTableStructure.groups)}
                        selectedGroupId={groupFilter}
                        onGroupSelect={setGroupFilter}
                    />
                )
            } */}
            <div className="workflow-edit-content">
                {
                    allRenderedFields
                }
            </div>
        </>
    );
}


class WidgetRenderErrorBoundary extends React.Component<{
    children: React.ReactNode;
}, {
    hasError: boolean;
    error: Error | null;
}> {
    constructor(props: {
        children: React.ReactNode;
    }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState({ hasError: true, error });
    }

    render() {
        if (this.state.hasError) {
            return <span className="list-error-label">{this.state.error?.stack || this.state.error?.message || this.state.error?.toString()}</span>
        }
        return this.props.children;
    }
}




interface GroupFilterProps {
    groups: WidgetTableStructureGroup[];
    selectedGroupId: number;
    onGroupSelect: (groupId: number) => void;
}

function GroupFilter({ groups, selectedGroupId, onGroupSelect }: GroupFilterProps) {
    return (
        <div className="group-filter">
            <div
                className={`group-filter-item all-groups`}
                style={{
                    backgroundColor: adjustColorOpacity('#777', selectedGroupId === 0 ? 1 : 0.6),
                    color: adjustColorOpacity(isDarkColor('#777') ? '#fff' : '#000', selectedGroupId === 0 ? 1 : 0.6),
                }}
                onClick={() => onGroupSelect(0)}
            >
                {i18n("Show All Groups")}
            </div>
            {groups.sort((a, b) => a.name.length - b.name.length).map(group => (
                <div
                    key={group.id}
                    className={`group-filter-item`}
                    style={{
                        backgroundColor: adjustColorOpacity(group.color, selectedGroupId === group.id ? 1 : 0.6),
                        color: adjustColorOpacity(isDarkColor(group.color) ? '#fff' : '#000', selectedGroupId === group.id ? 1 : 0.6),
                    }}
                    onClick={() => onGroupSelect(group.id)}
                >
                    {group.name}
                </div>
            ))}
        </div>
    );
}
/**
 * Adjusts the opacity of a color value
 * @param color The color value (can be hex, rgb, rgba)
 * @param opacity The opacity value between 0 and 1
 * @returns The color with adjusted opacity
 */
function adjustColorOpacity(color: string, opacity: number): string {
    // Handle rgba colors
    if (color.startsWith('rgba')) {
        return color.split(',').map((item, index) => {
            if (index === 3) {
                return opacity.toString();
            }
            return item;
        }).join(',');
    }

    // Handle rgb colors
    if (color.startsWith('rgb')) {
        return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
    }

    // Handle hex colors
    if (color.startsWith('#')) {
        // Handle both 3-digit and 6-digit hex colors
        const hex = color.slice(1);
        const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.slice(0, 2), 16);
        const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.slice(2, 4), 16);
        const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    // Return original color if format not supported
    return color;
}


function isDarkColor(color: string): boolean {
    let r: number, g: number, b: number;
    
    // Handle rgba colors
    const rgba = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (rgba) {
        r = parseInt(rgba[1]);
        g = parseInt(rgba[2]);
        b = parseInt(rgba[3]);
    } else {
        // Handle hex colors
        const hex = color.startsWith('#') ? color.slice(1) : color;
        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
        } else {
            return false;
        }
    }
    return r * 0.299 + g * 0.587 + b * 0.114 < 186;
}