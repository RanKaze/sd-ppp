import React, { ReactNode } from "react";
import type { WidgetTableStructureNode } from "../../types/sdppp/index.js";
import { computeUIWeightCSS } from "./util.js";

interface WorkflowEditFieldProps {
    fieldInfo: WidgetTableStructureNode;
    groupColor: string;
    useShortTitle: boolean;
    widgetsContent: ReactNode[];
    widgetTableErrors: Record<number, string>;
    onTitleRender?: (title: string, fieldInfo: WidgetTableStructureNode) => ReactNode;
}

export class WorkflowEditField extends React.Component<WorkflowEditFieldProps, {
    collapsed: boolean;
}> {
    constructor(props: WorkflowEditFieldProps) {
        super(props);
        this.state = {
            collapsed: false
        };
    }

    private toggleCollapse = () => {
        this.setState(prevState => ({
            collapsed: !prevState.collapsed
        }));
    };

    render() {
        const { fieldInfo, groupColor, useShortTitle, widgetsContent, widgetTableErrors, onTitleRender } = this.props;
        const { collapsed } = this.state;
        
        return (
            <div 
                className="workflow-edit-field" 
                style={{
                    borderLeft: `3px solid ${groupColor}`,
                    paddingLeft: "3px",
                    alignItems: "center",
                    alignContent: "flex-start",
                    justifyContent: "flex-start",
                }}
            >
                <div 
                    className="workflow-edit-field-title" 
                    title={fieldInfo.title} 
                    style={{
                        ...computeUIWeightCSS(useShortTitle ? 4 : 12),
                        borderColor: groupColor,
                        borderLeft: `3px solid`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingRight: "8px",
                        fontWeight: "bold",
                        height: "auto",
                        minHeight: "4px",
                        overflow: "visible",
                        backgroundColor: collapsed ? "rgb(30, 30, 30)" : "rgb(51, 51, 51)",
                        borderTopRightRadius: "12px",
                        borderBottomRightRadius: "12px",
                        transition: "all 0.3s ease-in-out"
                    }}
                >
                    <div 
                        style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            flex: 1, 
                            justifyContent: "center",
                            cursor: "pointer",
                            gap: "8px"
                        }}
                        onClick={this.toggleCollapse}
                        title={collapsed ? "Click to expand" : "Click to collapse"}
                    >
                        <span style={{ fontSize: "10px" }}>{collapsed ? "▼" : "▲"}</span>
                        {onTitleRender ?
                            onTitleRender(fieldInfo.title, fieldInfo) :
                            <span>{fieldInfo.title}</span>
                        }
                    </div>
                </div>
                {!collapsed && (
                    <>
                        {widgetsContent}
                        {
                            widgetTableErrors[fieldInfo.id] ?
                                <span className="list-error-label">{widgetTableErrors[fieldInfo.id]}</span> : ''
                        }
                    </>
                )}
            </div>
        );
    }
}
