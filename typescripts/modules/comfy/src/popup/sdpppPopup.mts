import { createRoot } from "react-dom/client";
import { createElement } from "react";
import ComfyPopup from "./tsx/ComfyPopup";
import ComfySidebar from "./tsx/ComfySidebar";

let sdpppCanvasRendered: any = null
let sdpppSideBarRendered: any = null
let popupJSXElement: any = null
export default async function initPopup(app: any) {
    if (!sdpppCanvasRendered) {
        const sdpppCanvas = document.createElement('div');
        sdpppCanvas.id = "sdppp-popup-root";
        sdpppCanvas.style.display = "none";
        document.getElementById("graph-canvas-container")?.prepend(sdpppCanvas);

        app.extensionManager.registerSidebarTab({

            id: "sdppp",
            title: "SD-PPP",
            tooltip: "SD-PPP Workflow UI",
            icon: "sdppp-side-icon",
            type: "custom",
            render: (container: HTMLElement) => {
                if (!sdpppSideBarRendered) {
                    container.style.width = "100%";
                    container.style.height = "auto";
                    container.style.padding = "8px";
                    createRoot(container).render(createElement(ComfySidebar, {
                        onMaximize: () => {
                            showPopup("1")
                        },
                        onPhotoshop: () => {
                            showPopup("2")
                        }
                    }))
                }
                sdpppCanvas.style.display = "none";
                function showPopup(tab: string) {
                    // 窗口布局参数变量化
                    const config = {
                        fieldWidth: 280,      // 一列的宽度
                        fieldGap: 12,         // 列间距
                        minColumns: 1,        // 最小列数
                        defaultColumns: 2,    // 默认列数
                        padding: 60,          // 窗口内边距（增加以确保足够空间）
                    };
                    
                    // 计算派生参数
                    const resizeStep = config.fieldWidth + config.fieldGap;
                    const minWindowWidth = config.fieldWidth + config.padding;
                    
                    // 重新计算默认窗口宽度，确保能正确容纳两列布局
                    // 两列内容宽度: fieldWidth * 2 + fieldGap
                    // 加上内边距和额外的安全空间
                    const contentWidth = (config.fieldWidth * config.defaultColumns) + (config.fieldGap * (config.defaultColumns - 1));
                    const defaultWindowWidth = contentWidth + config.padding;
                    
                    // 调整步长，增加额外空间以确保布局正确
                    const adjustedResizeStep = resizeStep + 20; // 增加20px安全空间
                    
                    // 调试信息（可选）
                    console.log('SDPPP Window Config:', {
                        contentWidth,
                        defaultWindowWidth,
                        minWindowWidth,
                        resizeStep,
                        adjustedResizeStep,
                        fieldWidth: config.fieldWidth,
                        fieldGap: config.fieldGap,
                        padding: config.padding
                    });
                    
                    if (!sdpppCanvasRendered) {
                        popupJSXElement = createElement(ComfyPopup, {
                            onClose: () => {
                                sdpppCanvas.style.display = "none";
                            },
                            tab
                        });
                        createRoot(sdpppCanvas).render(popupJSXElement);

                        // 添加拖拽功能
                        let isDragging = false;
                        let startX: number, startY: number, startLeft: number, startTop: number;

                        sdpppCanvas.addEventListener('mousedown', (e) => {
                            // 检查是否在输入框上，避免触发拖拽
                            if (e.target instanceof Element && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                                return;
                            }
                            
                            // 只在标题栏区域允许拖拽
                            if (e.target instanceof Element && e.target.closest('.sdppp-menu-header')) {
                                // 防止文字选中
                                e.preventDefault();
                                e.stopPropagation();
                                
                                isDragging = true;
                                startX = e.clientX;
                                startY = e.clientY;
                                
                                // 获取当前位置
                                startLeft = parseInt(sdpppCanvas.style.left) || 0;
                                startTop = parseInt(sdpppCanvas.style.top) || 0;
                                sdpppCanvas.style.cursor = 'grabbing';
                            }
                        });

                        document.addEventListener('mousemove', (e) => {
                            if (isDragging) {
                                // 防止文字选中，但避免影响输入框
                                if (!e.target || !(e.target instanceof Element && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'))) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }
                                
                                const dx = e.clientX - startX;
                                const dy = e.clientY - startY;
                                sdpppCanvas.style.left = Math.max(0, startLeft + dx) + 'px';
                                sdpppCanvas.style.top = Math.max(0, startTop + dy) + 'px';
                            }
                        });

                        document.addEventListener('mouseup', () => {
                            isDragging = false;
                            sdpppCanvas.style.cursor = 'default';
                        });

                        // 添加窗口大小调整功能
                        let isResizing = false;
                        let resizeStartX: number, resizeStartY: number;
                        let resizeStartLeft: number, resizeStartTop: number;
                        let resizeStartWidth: number, resizeStartHeight: number;
                        let resizeEdge: string = '';

                        sdpppCanvas.addEventListener('mousedown', (e) => {
                            // 检查是否在输入框上，避免触发大小调整
                            if (e.target instanceof Element && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                                return;
                            }
                            
                            // 检查是否点击在窗口边缘（10px范围内）
                            const rect = sdpppCanvas.getBoundingClientRect();
                            const isLeftEdge = e.clientX - rect.left < 10;
                            const isRightEdge = rect.right - e.clientX < 10;
                            const isTopEdge = e.clientY - rect.top < 10;
                            const isBottomEdge = rect.bottom - e.clientY < 10;

                            // 确定拖拽边缘
                            let edgeFound = false;
                            if (isLeftEdge && isTopEdge) {
                                resizeEdge = 'nw';
                                isResizing = true;
                                edgeFound = true;
                            } else if (isRightEdge && isTopEdge) {
                                resizeEdge = 'ne';
                                isResizing = true;
                                edgeFound = true;
                            } else if (isLeftEdge && isBottomEdge) {
                                resizeEdge = 'sw';
                                isResizing = true;
                                edgeFound = true;
                            } else if (isRightEdge && isBottomEdge) {
                                resizeEdge = 'se';
                                isResizing = true;
                                edgeFound = true;
                            } else if (isLeftEdge) {
                                resizeEdge = 'w';
                                isResizing = true;
                                edgeFound = true;
                            } else if (isRightEdge) {
                                resizeEdge = 'e';
                                isResizing = true;
                                edgeFound = true;
                            } else if (isTopEdge) {
                                resizeEdge = 'n';
                                isResizing = true;
                                edgeFound = true;
                            } else if (isBottomEdge) {
                                resizeEdge = 's';
                                isResizing = true;
                                edgeFound = true;
                            }
                            
                            // 只有在找到边缘时才阻止默认行为
                            if (edgeFound) {
                                // 防止文字选中
                                e.preventDefault();
                                e.stopPropagation();
                            }

                            if (isResizing) {
                                resizeStartX = e.clientX;
                                resizeStartY = e.clientY;
                                resizeStartLeft = rect.left;
                                resizeStartTop = rect.top;
                                resizeStartWidth = rect.width;
                                resizeStartHeight = rect.height;
                                
                                // 设置相应的光标样式
                                switch (resizeEdge) {
                                    case 'nw':
                                    case 'se':
                                        sdpppCanvas.style.cursor = 'nwse-resize';
                                        break;
                                    case 'ne':
                                    case 'sw':
                                        sdpppCanvas.style.cursor = 'nesw-resize';
                                        break;
                                    case 'w':
                                    case 'e':
                                        sdpppCanvas.style.cursor = 'ew-resize';
                                        break;
                                    case 'n':
                                    case 's':
                                        sdpppCanvas.style.cursor = 'ns-resize';
                                        break;
                                }
                            }
                        });

                        document.addEventListener('mousemove', (e) => {
                            if (isResizing) {
                                // 防止文字选中，但避免影响输入框
                                if (!e.target || !(e.target instanceof Element && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'))) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }
                                
                                const dx = e.clientX - resizeStartX;
                                const dy = e.clientY - resizeStartY;
                                
                                let newLeft = resizeStartLeft;
                                let newTop = resizeStartTop;
                                let newWidth = resizeStartWidth;
                                let newHeight = resizeStartHeight;

                                // 根据拖拽边缘计算新尺寸
                                switch (resizeEdge) {
                                    case 'se':
                                    case 'ne':
                                    case 'e':
                                        // 右侧边缘拖拽
                                        // 计算目标宽度（基于鼠标位置）
                                        const targetWidthRight = resizeStartWidth + dx;
                                        // 四舍五入到最近的调整步长（包含安全空间）
                                        newWidth = Math.max(minWindowWidth, Math.round(targetWidthRight / adjustedResizeStep) * adjustedResizeStep);
                                        break;
                                        
                                    case 'nw':
                                    case 'sw':
                                    case 'w':
                                        // 左侧边缘拖拽
                                        // 计算目标宽度（基于鼠标位置）
                                        const targetWidthLeft = resizeStartWidth - dx;
                                        // 四舍五入到最近的调整步长（包含安全空间）
                                        newWidth = Math.max(minWindowWidth, Math.round(targetWidthLeft / adjustedResizeStep) * adjustedResizeStep);
                                        // 调整左侧位置以保持内容居中
                                        const widthDiff = resizeStartWidth - newWidth;
                                        newLeft = resizeStartLeft + widthDiff;
                                        break;
                                        
                                    default:
                                        // 上下边缘或其他情况
                                        break;
                                }
                                
                                // 上下边缘保持连续调整
                                if (['se', 'sw', 's'].includes(resizeEdge)) {
                                    newHeight = Math.max(400, resizeStartHeight + dy);
                                } else if (['nw', 'ne', 'n'].includes(resizeEdge)) {
                                    newHeight = Math.max(400, resizeStartHeight - dy);
                                    newTop = resizeStartTop + dy;
                                }

                                // 应用新尺寸和位置
                                sdpppCanvas.style.left = Math.max(0, newLeft - window.scrollX) + 'px';
                                sdpppCanvas.style.top = Math.max(0, newTop - window.scrollY) + 'px';
                                sdpppCanvas.style.width = newWidth + 'px';
                                sdpppCanvas.style.height = newHeight + 'px';
                                // 移除transform，因为我们现在使用直接的left/top定位
                                sdpppCanvas.style.transform = 'none';
                            } else {
                                // 鼠标悬停时显示相应的光标样式
                                const rect = sdpppCanvas.getBoundingClientRect();
                                const isLeftEdge = e.clientX - rect.left < 10;
                                const isRightEdge = rect.right - e.clientX < 10;
                                const isTopEdge = e.clientY - rect.top < 10;
                                const isBottomEdge = rect.bottom - e.clientY < 10;

                                // 检查是否在输入框上，避免改变光标样式
                                if (e.target instanceof Element && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                                    // 保持输入框的默认光标
                                    return;
                                }

                                if (isLeftEdge && isTopEdge) {
                                    sdpppCanvas.style.cursor = 'nwse-resize';
                                } else if (isRightEdge && isTopEdge) {
                                    sdpppCanvas.style.cursor = 'nesw-resize';
                                } else if (isLeftEdge && isBottomEdge) {
                                    sdpppCanvas.style.cursor = 'nesw-resize';
                                } else if (isRightEdge && isBottomEdge) {
                                    sdpppCanvas.style.cursor = 'nwse-resize';
                                } else if (isLeftEdge || isRightEdge) {
                                    sdpppCanvas.style.cursor = 'ew-resize';
                                } else if (isTopEdge || isBottomEdge) {
                                    sdpppCanvas.style.cursor = 'ns-resize';
                                } else if (e.target instanceof Element && e.target.closest('.sdppp-menu-header')) {
                                    sdpppCanvas.style.cursor = 'grab';
                                } else {
                                    sdpppCanvas.style.cursor = 'default';
                                }
                            }
                        });

                        document.addEventListener('mouseup', () => {
                            isResizing = false;
                            sdpppCanvas.style.cursor = 'default';
                        });

                    } else {
                        popupJSXElement.props.tab = tab
                    }
                    sdpppCanvas.style.display = "flex";
                    sdpppCanvas.style.width = "70vw";
                    sdpppCanvas.style.height = "70vh";
                    sdpppCanvas.style.position = "fixed";
                    sdpppCanvas.style.zIndex = "1000";
                    sdpppCanvas.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.3)";
                    sdpppCanvas.style.borderRadius = "8px";
                    sdpppCanvas.style.border = "1px solid rgb(50, 50, 50)";
                    
                    // 直接计算居中位置，避免使用 transform
                    const windowWidth = window.innerWidth;
                    const windowHeight = window.innerHeight;
                    // 使用配置的默认宽度，确保能显示默认列数
                    const canvasWidth = Math.max(minWindowWidth, Math.min(defaultWindowWidth, windowWidth * 0.8, 1400));
                    const canvasHeight = Math.max(400, Math.min(windowHeight * 0.8, 800));
                    
                    const left = (windowWidth - canvasWidth) / 2;
                    const top = (windowHeight - canvasHeight) / 2;
                    
                    sdpppCanvas.style.left = Math.max(0, left) + 'px';
                    sdpppCanvas.style.top = Math.max(0, top) + 'px';
                    sdpppCanvas.style.width = canvasWidth + 'px';
                    sdpppCanvas.style.height = canvasHeight + 'px';
                    document.querySelector(".sdppp-side-icon")?.parentElement?.click();
                }
            }
        });

    }
}

