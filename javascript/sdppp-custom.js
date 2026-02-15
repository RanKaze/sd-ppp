/**
 * This file defines how SDPPP reads ComfyUI workflow and converts it into a form with widgets.
 * 本文件用于定义SDPPP如何读取ComfyUI工作流并转换为控件式表单。包括如何控制控件的占用空间、换行方式等
 * 
 * 
 * ### outputType -- the type of the widget
 * ### outputType -- 控件的类型
 * toggle: 勾选框
 * number: 数字
 * string/customtext: 字符串
 * combo: 下拉框
 * IMAGE_PATH: 图片路径
 * MASK_PATH: 遮罩路径
 * PS_DOCUMENT: Photoshop 文档
 * PS_LAYER: Photoshop 图层
 * 
 * 
 * ### How to control the space of widgets and line breaks?
 * Each line can contain 12 uiWeight widgets, if it exceeds, it will break the line
 * For example, if there are two widgets with uiWeight of 8 and 4, they will occupy one line, occupying two-thirds and one-third of the space respectively
 * If there are three widgets with uiWeight of 4, 4, and 4, they will share the space of one line equally
 * The default uiWeight of each widget is 12, which means they will occupy one line by default
 * ### 如何控制控件的占用空间、换行方式?
 * 每一行，能容纳下uiWeight总和为12的控件，如果超了就会换行
 * 参见PrimitiveNumber有两个控件，uiWeight分别为8和4，那么这两个控件就会占用一行，分别占用三分之二和三分之一的空间
 * 如果有三个控件，uiWeight分别为4、4、4，那么它们就会平均分配一行的空间
 * 默认情况下，控件的uiWidget就是12，代表它们默认就会占用一行。
 */


export default function (sdppp, version = 1) {
    /**
     * Handle SDPPP Get Document
     * 处理 SDPPP Get Document
     * 
     * only keep the first widget, set the output type to PS_DOCUMENT
     * 只保留第一个控件, 将输出类型设置为 PS_DOCUMENT
     */
    sdppp.widgetable.add('SDPPP Get Document', {
        formatter: (node) => {
            return {
                title: getTitle(node),
                widgets: [{
                    value: node.widgets[0].value,
                    outputType: "PS_DOCUMENT",
                    options: {
                        values: typeof node.widgets[0].options.values == 'function' ? node.widgets[0].options.values() : node.widgets[0].options.values
                    }
                }]
            }
        }
    })
    /**
     * Handle SDPPP Get Layer By ID
     * 处理 SDPPP Get Layer By ID
     * 
     * only keep the first widget, set the output type to PS_LAYER
     * 只保留第一个控件, 将输出类型设置为 PS_LAYER
     */
    sdppp.widgetable.add('SDPPP Get Layer By ID', {
        formatter: (node) => {
            return {
                title: getTitle(node),
                widgets: [{
                    value: node.widgets[0].value,
                    outputType: "PS_LAYER",
                    options: {
                        values: node.widgets[0].options.values,
                        documentNodeID: sdpppX.findDocumentNodeRecursive(node)?.id || 0
                    }
                }]
            }
        }
    })
    /**
     * Handle PrimitiveNode
     * 处理 PrimitiveNode
     * 
     * first use the name of the connected output as title, if not connected then use the node title
     * 首先标题优先使用它所连接的输出的名称，如果没有连接就使用节点的标题
     * 
     * Then, if there are multiple widgets, only keep the first two
     * 其次，如果有多个控件，则只保留前两个控件。
     * 
     * If the first widget is a number type and suitable for dragging, only keep the first widget
     * 如果第一个控件是数字类型且其精度适用拖动控件，则只保留第一个控件
     */
    sdppp.widgetable.add('PrimitiveNode', {
        formatter: (node) => {
            let title = node.title.startsWith("Primitive") ? nameByConnectedOutputOrTitle(node) : getTitle(node);
            if (!node.widgets || node.widgets.length == 0) {
                return null;
            }
            let sliceNum = 2;
            if (node.widgets.length == 2 && node.widgets[1].name == "control_after_generate" && node.widgets[1].value == 'fixed') {
                sliceNum = 1;
            }
            let widgets = node.widgets.slice(0, sliceNum)
                .map((widget, index) => {
                    const ret = {
                        value: widget.value,
                        outputType: widget.type || "string",
                        options: widget.options,
                        uiWeight: 12
                    }
                    if (widget.type == "number" || widget.type == "combo") {
                        ret.uiWeight = index == 0 ? (sliceNum == 2 ? 8 : 6) : 4
                    }
                    if (widget.type == "toggle") {
                        ret.uiWeight = 4;
                        ret.name = widget.label || widget.name
                    }
                    return ret
                })
                .filter(Boolean)
            return {
                title,
                widgets
            }
        }
    })
    /**
     * Handle rgthree nodes
     * 处理 rgthree 系列节点
     * 
     * FastMute nodes only have one checkbox, so we can omit the widget name
     * FastMute节点只有一个勾选框，所以可以不保留控件名字
     */
    sdppp.widgetable.add('*rgthree*', {
        formatter: (node) => {
            if (node.type.startsWith('Power Lora Loader')) {
                return {
                    title: getTitle(node),
                    widgets: node.widgets
                        .filter(widget => widget.name.startsWith('lora_'))
                        .map((widget) => ({
                            value: widget.value.on,
                            name: widget.value.lora,
                            outputType: 'toggle',
                            options: { on: true, off: false },
                            uiWeight: 12
                        }))
                }
            }
            if (node.properties['toggleRestriction'] == 'always one' && node.widgets.length > 1) {
                const selected = node.widgets.find(widget => {
                    return fixRGthreeWidgetValue(widget.type, widget.value)
                }) || node.widgets[0];
                return {
                    title: getTitle(node),
                    widgets: [{
                        value: removeEnablePrefix(selected.label || selected.name),
                        name: '',
                        outputType: node.widgets.length == 2 ? 'segment' : 'combo',
                        options: {
                            values: node.widgets.map((widget) => (
                                removeEnablePrefix(widget.label || widget.name)
                            ))
                        },
                        uiWeight: 12
                    }]
                }
            }
            return {
                title: getTitle(node),
                widgets: node.widgets.map((widget) => ({
                    value: fixRGthreeWidgetValue(widget.type, widget.value),
                    name: removeEnablePrefix(widget.label || widget.name),
                    outputType: fixRGthreeWidgetType(widget.type),
                    options: widget.options,
                    uiWeight: 12
                }))
            }
            function fixRGthreeWidgetValue(type, value) {
                if (type == 'custom') {
                    return value.toggled
                }
                return value
            }
            function fixRGthreeWidgetType(type) {
                if (type == 'custom') {
                    return 'toggle'
                }
                return type || 'toggle'
            }
            function removeEnablePrefix(value) {
                return value.replace(/^(enable[-_ ]?)?/gi, '');
            }
        },
        setter: (node, widgetIndex, value) => {
            if (node.type.startsWith('Power Lora Loader')) {
                const ws = node.widgets.filter(widget => widget.name.startsWith('lora_'));
                if (ws[widgetIndex].name.startsWith('lora_')) {
                    if (ws[widgetIndex].value.on != value) {
                        ws[widgetIndex].value.on = value;
                    }
                }
                return true;

            } else if (
                node.properties['toggleRestriction'] == 'always one'
            ) {
                const groupName = value;
                node.widgets.forEach((widget, index) => {
                    if ((widget.label || widget.name) == 'Enable ' + groupName) {
                        if (!fixRGthreeWidgetValue(widget.type, widget.value)) {
                            changeRGthreeWidgetValue(widget, true);
                        }
                    } else {
                        if (fixRGthreeWidgetValue(widget.type, widget.value)) {
                            changeRGthreeWidgetValue(widget, false);
                        }
                    }
                });
                return true;

            } else if (node.widgets[widgetIndex].type == 'custom') {
                if (node.widgets[widgetIndex].value.toggled != value) {
                    node.widgets[widgetIndex].doModeChange();
                }
                return true
            } else {
                node.widgets[widgetIndex].value = value;
                node.widgets[widgetIndex].callback?.(value)
            }
            return false;
            function fixRGthreeWidgetValue(type, value) {
                if (type == 'custom') {
                    return value.toggled
                }
                return value
            }
            function changeRGthreeWidgetValue(widget, value) {
                if (widget.type == 'custom') {
                    if (widget.value.toggled != value) {
                        widget.doModeChange();
                    }
                } else {
                    if (widget.doModeChange && widget.value != value) {
                        widget.doModeChange();

                    } else {
                        widget.value = value;
                        widget.callback();
                    }
                }
            }
        }
    })

    function switchFormatter(node) {
        if (!node.widgets.length || node.widgets[0].options.max > 50) return null;
        const max = node.widgets[0].options.max;
        const ret = {
            title: getTitle(node),
            widgets: [
                {
                    value: node.widgets[0].value,
                    outputType: "combo",
                    options: {
                        values: Array.from({ length: max }, (_, i) => i + 1)
                    },
                    uiWeight: 12
                }
            ]
        }
        return ret;

    }
    sdppp.widgetable.add("ImpactInversedSwitch", {
        formatter: switchFormatter
    })
    sdppp.widgetable.add("ImpactSwitch", {
        formatter: switchFormatter
    })

    /**
     * Handle LoadVideos
     * 处理 LoadVideos 节点
     */
    sdppp.widgetable.add('LoadVideo', {
        formatter: (node) => {
            if (!node.widgets?.length) {
                return null;
            }
            return {
                title: getTitle(node),
                widgets: [{
                    value: node.widgets[0].value,
                    outputType: "video",
                    options: node.widgets[0].options,
                    uiWeight: 12
                }]
            }
        },
        setter: () => false
    })
    /**
     * Handle LoadImage
     * 处理 LoadImage 节点
     * 
     */
    sdppp.widgetable.add('LoadImage', {
        formatter: (node) => {
            initNodeProperty(node, "#sdppp_variant", {
                default: "default",
                type: "combo",
                values: ["default", "simple", "file"]
            });
            initNodeProperty(node, "#sdppp_simple_content", {
                default: "canvas",
                type: "combo",
                values: ["canvas", "curlayer"],
            });
            initNodeProperty(node, "#sdppp_simple_mask", {
                default: "canvas",
                type: "combo",
                values: ["canvas", "curlayer", "selection", "smart_selection"],
            });
            initNodeProperty(node, "#sdppp_simple_boundary", {
                default: "canvas",
                type: "combo",
                values: ["canvas", "curlayer", "selection"],
            });
            initNodeProperty(node, "#sdppp_label", {
                default: "",
                type: "string",
            });

            if (version == 2) {
                return {
                    title: getTitle(node),
                    widgets: [{
                        value: node.widgets[0].value,
                        outputType: "images",
                        options: {
                            ...node.widgets[0].options,
                            ['#sdppp_variant']: node.properties["#sdppp_variant"],
                            ['#sdppp_simple_content']: node.properties["#sdppp_simple_content"],
                            ['#sdppp_simple_mask']: node.properties["#sdppp_simple_mask"],
                            ['#sdppp_simple_boundary']: node.properties["#sdppp_simple_boundary"],
                            ['#sdppp_label']: node.properties["#sdppp_label"],
                        }
                    }]
                }

            } else if (version == 1) {
                return {
                    title: getTitle(node),
                    widgets: [{
                        value: node.widgets[0].value,
                        outputType: "IMAGE_PATH",
                        options: node.widgets[0].options
                    }]
                }

            }
        },
        setter: (node, widgetIndex, value) => {
            return false;
        }
    })
    /**
     * Handle LoadImageMask
     * 处理 LoadImageMask
     * 
     */
    sdppp.widgetable.add('LoadImageMask', {
        formatter: (node) => {
            if (version == 2) {
                return {
                    title: getTitle(node),
                    widgets: [{
                        value: node.widgets[0].value,
                        outputType: "masks",
                        options: node.widgets[0].options
                    }]
                }

            } else if (version == 1) {
                return {
                    title: getTitle(node),
                    widgets: [{
                        value: node.widgets[0].value,
                        outputType: "MASK_PATH",
                        options: node.widgets[0].options
                    }]
                }

            }
        },
        setter: (node, widgetIndex, value) => {
            return false;
        }
    })

    sdppp.widgetable.add("CheckpointLoaderSimple", {
        formatter: (node) => {
            return {
                title: getTitle(node),
                widgets: [{
                    value: node.widgets[0].value,
                    outputType: "combo",
                    options: node.widgets[0].options
                }]
            }
        }
    })

    // krita的
    sdppp.widgetable.add('ETN_Parameter', {
        formatter: (node) => {
            const outputTypeMap = {
                'number (integer)': { type: "number", step: 1 },
                'prompt (positive)': { type: "text", subType: "positive-prompt" },
                'toggle': { type: "toggle" },
                // ...其他类型映射
            };

            const paramType = node.widgets[1].value;
            const mappedType = outputTypeMap[paramType] || { type: paramType } || { type: "string" };

            return {
                title: getTitle(node),
                widgets: [{
                    value: node.widgets[2].value, // 主值widget
                    name: node.widgets[0].value,   // 参数名widget
                    outputType: mappedType.type,
                    options: {
                        ...node.widgets[2].options,
                        min: node.widgets[3].value,
                        max: node.widgets[4].value,
                        ...mappedType
                    },
                    uiWeight: 12 // 独占整行
                }]
            }
        }
    });

    const floatFormatter = (node) => {
        if (!('sdppp_max' in node.properties)) {
            node.setProperty('sdppp_max', 100);
        }
        if (!('sdppp_min' in node.properties)) {
            node.setProperty('sdppp_min', 0);
        }
        if (!('sdppp_step' in node.properties)) {
            node.setProperty('sdppp_step', 0.01);
        }
        return {
            title: getTitle(node),
            widgets: [{
                value: node.widgets[0].value, // 主值widget
                name: '',   // 参数名widget
                outputType: "number",
                options: {
                    max: node.properties.sdppp_max,
                    min: node.properties.sdppp_min,
                    step: node.properties.sdppp_step,
                    slider: true
                },
                uiWeight: 12 // 独占整行
            }]
        }
    }
    sdppp.widgetable.add("easy float", {
        formatter: floatFormatter
    })
    sdppp.widgetable.add("ImpactFloat", {
        formatter: floatFormatter
    })
    function intFormatter(node) {
        if (!('sdppp_max' in node.properties)) {
            node.setProperty('sdppp_max', 100);
        }
        if (!('sdppp_min' in node.properties)) {
            node.setProperty('sdppp_min', 0);
        }
        return {
            title: getTitle(node),
            widgets: [{
                value: node.widgets[0].value, // 主值widget
                name: '',   // 参数名widget
                outputType: "number",
                options: {
                    max: node.properties.sdppp_max,
                    min: node.properties.sdppp_min,
                    step: 1,
                    slider: true
                },
                uiWeight: 12 // 独占整行
            }]
        }
    }
    sdppp.widgetable.add("easy int", {
        formatter: intFormatter
    })
    sdppp.widgetable.add("ImpactInt", {
        formatter: intFormatter
    })
    sdppp.widgetable.add('easy seed', {
        formatter: (node) => {
            return {
                title: getTitle(node),
                widgets: [{
                    value: node.widgets[0].value, // 主值widget
                    name: '',   // 参数名widget
                    outputType: "number",
                    options: {
                        step: 1,
                        slider: false
                    },
                    uiWeight: 12 // 独占整行
                }]
            }
        },
        setter: (node, widgetIndex, value) => {
            // it should be implemented.
            // otherwise the roll button will be trigger and make a queuePrompt.
            return widgetIndex == 2;
        }
    })



    sdppp.widgetable.add("ImpactStringSelector", {
        formatter: (node) => {
            node.constructor["@sdppp_variant"] = {
                type: "combo",
                values: ["combo", "segment"],
            };

            if (node.widgets[1] && node.widgets[1].value) {
                throw new Error("multiline string selector is not supported");
            }
            if (!node.properties["sdppp_variant"]) {
                node.setProperty("sdppp_variant", "combo");
            }
            const options = node.widgets[0].value.split('\n');
            const selecting = node.widgets[2].value;

            return {
                title: getTitle(node),
                widgets: [{
                    value: options[selecting], // 主值widget
                    name: '',   // 参数名widget
                    outputType: node.properties["sdppp_variant"] || "combo",
                    options: {
                        values: options
                    },
                    uiWeight: 12 // 独占整行
                }]
            }
        },
        setter: (node, widgetIndex, value) => {
            const options = node.widgets[0].value.split('\n');
            const index = options.indexOf(value);
            node.widgets[2].value = index == -1 ? 0 : index;
            return true;
        }
    })

    sdppp.widgetable.add("ShowText|pysssss", {
        formatter: (node) => {
            return {
                title: getTitle(node),
                widgets: [{
                    value: node.widgets[1]?.value || node.widgets[0]?.value || '',
                    outputType: "string"
                }]
            }
        }
    })





    sdppp.widgetable.add('__DEFAULT__', {
        formatter: (node) => {
            return {
                id: node.id,
                title: getTitle(node),
                widgets: node.widgets.map((widget) => {
                    if (widget.type == "speak_and_recognation_type") return null;
                    const ret = {
                        outputType: widget.type || "string",
                        value: widget.value,
                        options: widget.options,
                        uiWeight: widget.uiWeight || 12
                    }
                    if (node.widgets.length != 1) {
                        ret.name = widget.label || widget.name;
                    }

                    return ret;
                }).filter(Boolean)
            };
        }
    })

/// Kolid Begin


    if (!('kolidLoraManager_LayoutDict' in window)) {
        window.kolidLoraManager_LayoutDict = new Map();
    }

    sdppp.widgetable.add("TriggerWord Toggle (LoraManager)", {
        formatter: (node) => {
            window.kolidLoraManager_LayoutDict.set(node, []);
            let widgetRemappingArr = window.kolidLoraManager_LayoutDict.get(node);
            const widgets = [];

            widgetRemappingArr.push({
                index: 0,
                type: 0,
                node: node,
            });
            // 添加 group_mode 切换
            widgets.push({
                value: node.widgets[0].value,
                name: "Group Mode",
                outputType: "toggle",
                uiWeight: 4
            });
            widgetRemappingArr.push({
                index: 1,
                type: 0,
                node: node,
            });
            // 添加 default_active 切换
            widgets.push({
                value: node.widgets[1].value,
                name: "Default Active",
                outputType: "toggle",
                uiWeight: 4
            });
            widgetRemappingArr.push({
                index: 2,
                type: 0,
                node: node,
            });
            // 添加 allow_strength_adjustment 切换
            widgets.push({
                value: node.widgets[2].value,
                name: "Allow Strength",
                outputType: "toggle",
                uiWeight: 4
            });

            let widgetValues = node.widgets[3].value;
            for(let i = 0; i < widgetValues.length; i++){
                let wigetValue = widgetValues[i];
                widgetRemappingArr.push({
                    index: i,
                    type: 1,
                    node: node,
                });
                widgets.push({
                    value: wigetValue.active,
                    name: wigetValue.text,
                    outputType: "toggle",
                    uiWeight: 12
                });
            }

            return {
                title: getTitle(node),
                widgets: widgets
            };
        },
        setter: (node, widgetIndex, value) => {
            let widgetRemappingArr = window.kolidLoraManager_LayoutDict.get(node);
            let o = widgetRemappingArr[widgetIndex];
            let targetNode = o.node;

            if(targetNode.type == 'TriggerWord Toggle (LoraManager)'){
                if(o.type == 0){
                    targetNode.widgets[o.index].value = value;
                    targetNode.widgets[o.index].callback?.(targetNode.widgets[o.index].value);
                }else if(o.type == 1){
                    const tag = targetNode.widgets[3].element.children[0].children[o.index];
                    tag.click();
                    let widgetValues = targetNode.widgets[3].value;
                    widgetValues[o.index].active = value;
                    targetNode.widgets[3].callback?.(widgetValues);
                }
                return true;
            }
        }
    })

    /**
     * Handle Lora Loader (LoraManager) nodes
     * 处理 Lora Loader (LoraManager) 节点
     */
    sdppp.widgetable.add('Lora Loader (LoraManager)', {
        formatter: (node) => {

            window.kolidLoraManager_LayoutDict.set(node, []);
            let widgetRemappingArr = window.kolidLoraManager_LayoutDict.get(node);
            
            const widgets = [];
            const lorasData = node.lorasWidget.value;
            lorasData.forEach((lora, loraIndex) => {
                widgetRemappingArr.push({
                    loraIndex: loraIndex,
                    type: 0,
                    node: node,
                });
                widgets.push({
                    value: lora.active,
                    name: lora.name,
                    outputType: "toggle",
                    uiWeight: 4
                });
                
                widgetRemappingArr.push({
                    loraIndex: loraIndex,
                    type: 1,
                    node: node,
                });
                widgets.push({
                    value: lora.strength,
                    name: ``,
                    outputType: "number",
                    options: {
                        min: 0.0,
                        max: 2.0,
                        step: 0.01,
                        slider: true
                    },
                    uiWeight: 8
                });
            });
            return {
                title: getTitle(node),
                widgets: widgets
            };
        },
        setter: (node, widgetIndex, value) => {
            let widgetRemappingArr = window.kolidLoraManager_LayoutDict.get(node);
            let o = widgetRemappingArr[widgetIndex];
            let targetNode = o.node;

            if(targetNode.type == 'Lora Loader (LoraManager)'){
                let index = o.loraIndex;

                const loraEntry = node.lorasWidget.element.children[1 + index];
                const widget = node.lorasWidget;
                const lorasData = parseLoraValue(widget.value);

                if(o.type == 0){
                    // 计算对应条目的 DOM 路径
                    const toggleElement = loraEntry.children[0].children[1];
                    toggleElement.click();
                    lorasData[index].active = value;

                    let tempNodes = [];
                    let triggerWordSlot = targetNode.outputs.find((output) => output.name == "trigger_words");
                    for(let i = 0; i < triggerWordSlot.links.length; i++){
                        let link = targetNode.graph.getLink(triggerWordSlot.links[i]);
                        let tmpNode = targetNode.graph.getNodeById(link.target_id);
                        if(tmpNode.type == 'TriggerWord Toggle (LoraManager)'){
                            tempNodes.push(tmpNode);
                        }
                    }

                    setTimeout(() => {
                        for(let i = 0; i < tempNodes.length; i++){
                            let tmpNode = tempNodes[i];
                        }
                    }, 100);
                }else if(o.type == 1){
                    loraEntry.children[1].children[1].value = value;
                    lorasData[index].strength = value;
                    lorasData[index].clipStrength = value;
                }
                if (typeof widget.callback === "function") {
                    widget.callback(lorasData);
                }
                return true;
            }
        }
    });

    if (!('kolidSDPPP_LayoutDict' in window)) {
        window.kolidSDPPP_LayoutDict = new Map();
    }

    sdppp.widgetable.add("SDPPPLayout", {

        formatter: (node) => {
            // 为SDPPPLayout节点添加@branch_mode元数据，定义属性为combo类型
            if (node.constructor && !node.constructor["@branch_mode"]) {
                node.constructor["@branch_mode"] = {
                    type: "combo",
                    values: ["Default", "MaxOne", "AlwaysOne"]
                };
            }
            
            window.kolidSDPPP_LayoutDict.set(node, []);
            let widgetRemappingArr = window.kolidSDPPP_LayoutDict.get(node);

            if (!('collect_LoadLoraPackNode' in node.properties)) {
                node.setProperty('collect_LoadLoraPackNode', true);
            }
            if (!('collect_BranchToggleNode' in node.properties)) {
                node.setProperty('collect_BranchToggleNode', true);
            }
            if (!('collect_BranchBooleanNode' in node.properties)) {
                node.setProperty('collect_BranchBooleanNode', true);
            }
            if (!('match_regex' in node.properties)) {
                node.setProperty('match_regex', '');
            }

            if (!node.properties["branch_mode"]) {
                node.setProperty("branch_mode", "Default");
            }
            
            // 为SDPPPLayout节点添加expand_nodes属性
            if (!('expand_nodes' in node.properties)) {
                node.setProperty('expand_nodes', '');
            }

            let matchStr = node.properties.match_regex;
            let matchColor = node.color;

            const widgets = [];
            const exposedLoadLoraPackNodes = [];
            const exposedBranchToggleNodes = [];
            let branchToggleInit = false;

            for (let index = 0; index < node.graph.nodes.length; index++) {
                const targetNode = node.graph.nodes[index];
                
                
                if(node.properties.collect_LoadLoraPackNode && targetNode.type == "LoadLoraPackNode"){
                    let toMatch = targetNode.widgets[0].value;
                    if(!toMatch.match(matchStr)) continue;
                    if(targetNode.color != matchColor) continue;

                    if (!('show_strength' in targetNode.properties)) {
                        targetNode.setProperty('show_strength', false);
                    }
                    if (!('sdppp_max' in targetNode.properties)) {
                        targetNode.setProperty('sdppp_max', 1.0);
                    }
                    if (!('sdppp_min' in targetNode.properties)) {
                        targetNode.setProperty('sdppp_min', 0.0);
                    }
                    if (!('sdppp_step' in targetNode.properties)) {
                        targetNode.setProperty('sdppp_step', 0.01);
                    }

                    if (!('json_positive' in targetNode.properties)) {
                        targetNode.setProperty('json_positive', '');
                    }
                    if (!('json_positive_toggles' in targetNode.properties)) {
                        targetNode.setProperty('json_positive_toggles', '');
                    }
                    
                    exposedLoadLoraPackNodes.push(targetNode);
                }
                else if((node.properties.collect_BranchToggleNode && targetNode.type == "BranchToggleNode") || (node.properties.collect_BranchBooleanNode && targetNode.type == "BranchBooleanNode")){
                    
                    if(!branchToggleInit){
                        window.branchToggleNodesTitleMap = new Map();
                        window.branchToggleNodesRelayMap = new Map();
                        window.branchToggleNodesBeRelayed = new Map();
                        window.allbranchToggleNodes = [];
                        branchToggleInit = true;
                    }

                    if (!('relay_expression' in targetNode.properties)) {
                        targetNode.setProperty('relay_expression', '');
                    }
                    if (!('expand_nodes' in targetNode.properties)) {
                        targetNode.setProperty('expand_nodes', '');
                    }
                    if (!('active_nodes' in targetNode.properties)) {
                        targetNode.setProperty('active_nodes', '');
                    }
                    if (!('foldout_nodes' in targetNode.properties)) {
                        targetNode.setProperty('foldout_nodes', '');
                    }
                    if (!('hide' in targetNode.properties)) {
                        targetNode.setProperty('hide', false);
                    }

                    window.branchToggleNodesTitleMap.set(targetNode.title, targetNode);
                    const expr = targetNode.properties.relay_expression;
                    const relays = extractVariables(expr);
                    window.branchToggleNodesRelayMap.set(targetNode, relays);
                    
                    
                    window.allbranchToggleNodes.push(targetNode);

                    for (let index = 0; index < relays.length; index++) {
                        const relay = relays[index];
                        let table = window.branchToggleNodesBeRelayed.get(relay);
                        if(!table){
                            table = [];
                            window.branchToggleNodesBeRelayed.set(relay, table);
                        }
                        table.push(targetNode);
                    }

                    // 初始化activeNodes
                    let activeNodes = targetNode.properties.active_nodes;
                    if(activeNodes){
                        let nodeNames = activeNodes.split('/');
                        for(let nodeName of nodeNames){
                            let activeNode = targetNode.graph.nodes.find(n => n.title === nodeName || n.type === nodeName);
                            if(activeNode){
                                // 设置节点mode: true时为0，false时为2
                                activeNode.mode = targetNode.widgets[0].value ? 0 : 2;
                            }
                        }
                    }
                    // 初始化foldoutNodes
                    let foldoutNodes = targetNode.properties.foldout_nodes;
                    if(foldoutNodes){
                        let nodeNames = foldoutNodes.split('/');
                        for(let nodeName of nodeNames){
                            let foldoutNode = targetNode.graph.nodes.find(n => n.title === nodeName || n.type === nodeName);
                            if(foldoutNode){
                                // 控制节点折叠状态
                                if(foldoutNode.collapsed == targetNode.widgets[0].value) {
                                    foldoutNode.collapse();
                                }
                            }
                        }
                    }
                }
            }

            // 对LoadLoraPackNode进行排序
            exposedLoadLoraPackNodes.sort((n0,n1)=>n0.widgets[0].value.localeCompare(n1.widgets[0].value));

            for (let index = 0; index < exposedLoadLoraPackNodes.length; index++) {
                const targetNode = exposedLoadLoraPackNodes[index];
                
                widgetRemappingArr.push({
                    node: targetNode,
                    widgetIndex: 1
                });

                let toMatch = targetNode.widgets[0].value;

                widgets.push({
                    value: targetNode.widgets[1].value,
                    name: toMatch.match(/[^\\/]+(?=\.)/g)?.[0] || "None",
                    outputType: "toggle",
                    uiWeight: 12,
                });
                
                if(targetNode.widgets[1].value){
                    if(targetNode.properties.json_positive){
                        let jsonPos = JSON.parse(targetNode.properties.json_positive);
                        let jsonToggles = {};

                        try {
                            jsonToggles = targetNode.properties?.json_positive_toggles 
                                ? JSON.parse(targetNode.properties.json_positive_toggles) 
                                : {};
                        } catch {
                            jsonToggles = {};
                        }
                    
                        for (const key in jsonPos) {
                            if (jsonPos.hasOwnProperty(key)) {      // 防止遍历到原型链上的属性
                                if(!jsonToggles.hasOwnProperty(key)){
                                    jsonToggles[key] = true;
                                }
                                widgetRemappingArr.push({
                                    node: targetNode,
                                    widgetIndex: -1,
                                    toggleName: key
                                })
                                widgets.push({
                                    value: jsonToggles[key],
                                    name: key,
                                    outputType: "toggle",
                                    uiWeight: 4
                                })
                            }
                        }

                        targetNode.properties.json_positive_toggles = JSON.stringify(jsonToggles);
                    }
                    
                    if(targetNode.properties.show_strength){
                        widgetRemappingArr.push({
                            node: targetNode,
                            widgetIndex: 4
                        })

                        widgets.push({
                            value: targetNode.widgets[4].value, // 主值widget
                            name: 'Strength',   // 参数名widget
                            outputType: "number",
                            options: {
                                max: targetNode.properties.sdppp_max,
                                min: targetNode.properties.sdppp_min,
                                step: targetNode.properties.sdppp_step,
                                slider: true 
                            },
                            uiWeight: 12 // 独占整行
                        });
                    }
                }
            }

            // 对BranchToggleNode进行排序
            window.allbranchToggleNodes.sort((n0,n1)=>n0.title.localeCompare(n1.title));

            // 用于检测循环调用的集合
            const processedNodes = new Set();
            
            function processNodeForExpansion(currentNode, expandNode) {
                
                // 检测循环调用：如果已经处理过这个节点，或者这个节点正在处理中，就跳过
                if(processedNodes.has(expandNode.id)) {
                    return;
                }
                
                processedNodes.add(expandNode.id);
                
                let widgetableResult = {
                    title: getTitle(expandNode),
                    widgets: []
                };
                
                if (expandNode.widgets && expandNode.widgets.length > 0) {
                    // 特殊处理LoadImage节点，与专门的formatter保持一致
                    if (expandNode.type === "LoadImage") {
                        // 初始化节点属性
                        initNodeProperty(expandNode, "#sdppp_variant", {
                            default: "default",
                            type: "combo",
                            values: ["default", "simple", "file"]
                        });
                        initNodeProperty(expandNode, "#sdppp_simple_content", {
                            default: "canvas",
                            type: "combo",
                            values: ["canvas", "curlayer"],
                        });
                        initNodeProperty(expandNode, "#sdppp_simple_mask", {
                            default: "canvas",
                            type: "combo",
                            values: ["canvas", "curlayer", "selection", "smart_selection"],
                        });
                        initNodeProperty(expandNode, "#sdppp_simple_boundary", {
                            default: "canvas",
                            type: "combo",
                            values: ["canvas", "curlayer", "selection"],
                        });
                        initNodeProperty(expandNode, "#sdppp_label", {
                            default: "",
                            type: "string",
                        });

                        if (version == 2) {
                            widgetableResult.widgets = [{
                                value: expandNode.widgets[0].value,
                                outputType: "images",
                                options: {
                                    ...expandNode.widgets[0].options,
                                    ['#sdppp_variant']: expandNode.properties["#sdppp_variant"],
                                    ['#sdppp_simple_content']: expandNode.properties["#sdppp_simple_content"],
                                    ['#sdppp_simple_mask']: expandNode.properties["#sdppp_simple_mask"],
                                    ['#sdppp_simple_boundary']: expandNode.properties["#sdppp_simple_boundary"],
                                    ['#sdppp_label']: expandNode.properties["#sdppp_label"],
                                }
                            }];
                        } else if (version == 1) {
                            widgetableResult.widgets = [{
                                value: expandNode.widgets[0].value,
                                outputType: "IMAGE_PATH",
                                options: expandNode.widgets[0].options
                            }];
                        }
                    } 
                    // 特殊处理LoadImageMask节点
                    else if (expandNode.type === "LoadImageMask") {
                        if (version == 2) {
                            widgetableResult.widgets = [{
                                value: expandNode.widgets[0].value,
                                outputType: "masks",
                                options: expandNode.widgets[0].options
                            }];
                        } else if (version == 1) {
                            widgetableResult.widgets = [{
                                value: expandNode.widgets[0].value,
                                outputType: "MASK_PATH",
                                options: expandNode.widgets[0].options
                            }];
                        }
                    }
                    // 特殊处理CheckpointLoaderSimple节点
                    else if (expandNode.type === "CheckpointLoaderSimple") {
                        widgetableResult.widgets = [{
                            value: expandNode.widgets[0].value,
                            outputType: "combo",
                            options: expandNode.widgets[0].options
                        }];
                    }
                    // 处理PrimitiveNode节点
                    else if (expandNode.type === "PrimitiveNode") {
                        let title = expandNode.title.startsWith("Primitive") ? nameByConnectedOutputOrTitle(expandNode) : getTitle(expandNode);
                        widgetableResult.title = title;
                        
                        if (expandNode.widgets.length == 0) {
                            widgetableResult.widgets = [];
                        } else {
                            let sliceNum = 2;
                            if (expandNode.widgets.length == 2 && expandNode.widgets[1].name == "control_after_generate" && expandNode.widgets[1].value == 'fixed') {
                                sliceNum = 1;
                            }
                            let widgets = expandNode.widgets.slice(0, sliceNum)
                                .map((widget, index) => {
                                    const ret = {
                                        value: widget.value,
                                        outputType: widget.type || "string",
                                        options: widget.options,
                                        uiWeight: 12
                                    }
                                    if (widget.type == "number" || widget.type == "combo") {
                                        ret.uiWeight = index == 0 ? (sliceNum == 2 ? 8 : 6) : 4
                                    }
                                    if (widget.type == "toggle") {
                                        ret.uiWeight = 4;
                                        ret.name = widget.label || widget.name
                                    }
                                    return ret
                                })
                                .filter(Boolean);
                            widgetableResult.widgets = widgets;
                        }
                    }
                    // 处理其他节点的默认逻辑
                    else {
                        widgetableResult.widgets = expandNode.widgets.map((widget) => {
                            if (widget.type == "speak_and_recognation_type") return null;
                            const ret = {
                                outputType: widget.type || "string",
                                value: widget.value,
                                options: widget.options,
                                uiWeight: widget.uiWeight || 12
                            };
                            if (expandNode.widgets.length != 1) {
                                ret.name = widget.label || widget.name;
                            }
                            return ret;
                        }).filter(Boolean);
                    }
                }
                    
                // 处理格式化结果
                if(widgetableResult && widgetableResult.widgets && widgetableResult.widgets.length > 0){
                    for(let widget of widgetableResult.widgets){
                        // 如果该widget对应的输入端存在，则跳过，不放入
                        if (expandNode.inputs && expandNode.inputs.some(input => {
                            if(input.label){
                                return input.label === widget.name && input.link !== null;
                            }else{
                                return input.name === widget.name && input.link !== null;
                            }
                        })) {
                            continue;
                        }
                        widgetRemappingArr.push({
                            node: expandNode,
                            widgetIndex: widgetableResult.widgets.indexOf(widget)
                        });
                        let tmpOptions = widget.options;
                        if(widget.outputType == "number"){
                            tmpOptions.slider = false;
                            tmpOptions.min = -18446744073709552000;
                            tmpOptions.max = 18446744073709552000;
                            tmpOptions.step = 0.0001;
                            tmpOptions.step2 = 0.00001;
                            tmpOptions.precision = 5;
                        }
                        widgets.push({
                            value: widget.value,
                            name: widget.name ? widget.name : expandNode.title,
                            outputType: widget.outputType,
                            options: tmpOptions,
                            uiWeight: widget.uiWeight || 12
                        });
                    }
                }
                
                // 如果展开的节点是BranchToggleNode或BranchBooleanNode，递归展开它的expand_nodes
                if ((expandNode.type === "BranchToggleNode" || expandNode.type === "BranchBooleanNode") && expandNode.widgets[0].value) {
                    let expandNodes = expandNode.properties.expand_nodes;
                    if(expandNodes){
                        let nodeNames = expandNodes.split('/');
                        for(let nodeName of nodeNames){
                            let subExpandNode = node.graph.nodes.find(n => n.title === nodeName || n.type === nodeName);
                            if(subExpandNode){
                                // 递归展开子节点，不应用主节点的过滤条件
                                processNodeForExpansion(expandNode, subExpandNode);
                            }
                        }
                    }
                }

                processedNodes.delete(expandNode.id);
            }
            
            // 过滤出符合条件的BranchNode
            let filteredBranchNodes = [];
            for (let index = 0; index < window.allbranchToggleNodes.length; index++) {
                const targetNode = window.allbranchToggleNodes[index];
                let toMatch = targetNode.title;
                if(!toMatch.match(matchStr)) continue;
                if(targetNode.color != matchColor) continue;
                filteredBranchNodes.push(targetNode);
            }
            
            // 对BranchNode进行排序
            filteredBranchNodes.sort((n0,n1)=>n0.title.localeCompare(n1.title));
            
            // 获取SDPPPLayout节点自身的branch_mode
            const layoutBranchMode = node.properties.branch_mode || 'Default';
            
            // Default模式：保持原有逻辑，每个节点作为独立的toggle控件显示
            if (layoutBranchMode === 'Default' || filteredBranchNodes.length === 0) {
                for (const targetNode of filteredBranchNodes) {
                    // 仅当hide属性为false时才添加widget到界面
                    if(!targetNode.properties.hide){
                        widgetRemappingArr.push({ 
                            node: targetNode,
                            widgetIndex: 0
                        });

                        widgets.push({
                            value: targetNode.widgets[0].value,
                            name: targetNode.title,
                            outputType: "toggle",
                            uiWeight: 12,
                        });
                    }
                    
                    // 初始化expand_nodes
                    if(targetNode.widgets[0].value){
                        let expandNodes = targetNode.properties.expand_nodes;
                        if(expandNodes){
                            let nodeNames = expandNodes.split('/');
                            for(let nodeName of nodeNames){
                                let expandNode = node.graph.nodes.find(n => n.title === nodeName || n.type === nodeName);
                                if(expandNode){
                                    processNodeForExpansion(targetNode, expandNode);
                                }
                            }
                        }
                    }
                }
            } 
            // AlwaysOne模式：将所有BranchNode打包成一个combo控件
            else if (layoutBranchMode === 'AlwaysOne') {
                if (filteredBranchNodes.length > 0) {
                    // 收集所有节点，包括hide为true的节点
                    let allNodes = filteredBranchNodes;
                    
                    // 收集仅hide为false的节点标题，用于combo控件
                    let visibleNodeTitles = allNodes.filter(n => !n.properties.hide).map(n => n.title);
                    
                    // 找出当前选中的节点
                    let selectedNode = allNodes.find(n => n.widgets[0].value);
                    let currentValue = selectedNode ? selectedNode.title : (visibleNodeTitles[0] || '');
                    
                    // 确保currentValue在visibleNodeTitles中
                    if(!visibleNodeTitles.includes(currentValue) && visibleNodeTitles.length > 0){
                        currentValue = visibleNodeTitles[0];
                    }
                    
                    // 添加Enum类型的widget
                    widgetRemappingArr.push({
                        node: allNodes, // 传递所有节点，包括hide为true的
                        widgetIndex: -1, // 特殊标记，表示这是一个分组widget
                        mode: layoutBranchMode
                    });
                    
                    widgets.push({
                        value: currentValue,
                        name: ``,
                        outputType: "combo",
                        options: {
                            values: visibleNodeTitles // 仅显示hide为false的节点
                        },
                        uiWeight: 12,
                    });
                    
                    // 自动展开选中节点的子节点
                    let expandNode = allNodes.find(n => n.title === currentValue);
                    if(expandNode){
                        // 初始化activeNodes
                        let activeNodes = expandNode.properties.active_nodes;
                        if(activeNodes){
                            let nodeNames = activeNodes.split('/');
                            for(let nodeName of nodeNames){
                                let activeNode = node.graph.nodes.find(n => n.title === nodeName || n.type === nodeName);
                                if(activeNode){
                                    // 设置节点mode: true时为0，false时为2
                                    activeNode.mode = expandNode.widgets[0].value ? 0 : 2;
                                }
                            }
                        }
                        // 初始化foldoutNodes
                        let foldoutNodes = expandNode.properties.foldout_nodes;
                        if(foldoutNodes){
                            let nodeNames = foldoutNodes.split('/');
                            for(let nodeName of nodeNames){
                                let foldoutNode = node.graph.nodes.find(n => n.title === nodeName || n.type === nodeName);
                                if(foldoutNode){
                                    // 控制节点折叠状态
                                    if(foldoutNode.collapsed == expandNode.widgets[0].value) {
                                        foldoutNode.collapse();
                                    }
                                }
                            }
                        }
                        // 初始化expand_nodes
                        let expandNodes = expandNode.properties.expand_nodes;
                        if(expandNodes){
                            let nodeNames = expandNodes.split('/');
                            for(let nodeName of nodeNames){
                                let subExpandNode = node.graph.nodes.find(n => n.title === nodeName || n.type === nodeName);
                                if(subExpandNode){
                                    processNodeForExpansion(expandNode, subExpandNode);
                                }
                            }
                        }
                    }
                }
            }
            // MaxOne模式：确保最多只有一个节点被选中
            else if (layoutBranchMode === 'MaxOne') {
                // 检查当前选中的节点数量
                let selectedNodes = filteredBranchNodes.filter(n => n.widgets[0].value);
                if (selectedNodes.length > 1) {
                    // 如果超过一个节点被选中，只保留第一个，其他设为false
                    for (let i = 1; i < selectedNodes.length; i++) {
                        selectedNodes[i].widgets[0].value = false;
                    }
                }
                
                // 显示所有节点，但确保最多只有一个被选中
                for (const targetNode of filteredBranchNodes) {
                    // 仅当hide属性为false时才添加widget到界面
                    if(!targetNode.properties.hide){
                        widgetRemappingArr.push({
                            node: targetNode,
                            widgetIndex: 0,
                            mode: layoutBranchMode
                        });

                        widgets.push({
                            value: targetNode.widgets[0].value,
                            name: targetNode.title,
                            outputType: "toggle",
                            uiWeight: 12,
                        });
                    }

                    // 初始化activeNodes
                    let activeNodes = targetNode.properties.active_nodes;
                    if(activeNodes){
                        let nodeNames = activeNodes.split('/');
                        for(let nodeName of nodeNames){
                            let activeNode = node.graph.nodes.find(n => n.title === nodeName || n.type === nodeName);
                            if(activeNode){
                                // 设置节点mode: true时为0，false时为2
                                activeNode.mode = targetNode.widgets[0].value ? 0 : 2;
                            }
                        }
                    }
                    // 初始化foldoutNodes
                    let foldoutNodes = targetNode.properties.foldout_nodes;
                    if(foldoutNodes){
                        let nodeNames = foldoutNodes.split('/');
                        for(let nodeName of nodeNames){
                            let foldoutNode = node.graph.nodes.find(n => n.title === nodeName || n.type === nodeName);
                            if(foldoutNode){
                                // 控制节点折叠状态
                                if(foldoutNode.collapsed == targetNode.widgets[0].value) {
                                    foldoutNode.collapse();
                                }
                            }
                        }
                    }
                    // 初始化expand_nodes
                    if(targetNode.widgets[0].value){
                        let expandNodes = targetNode.properties.expand_nodes;
                        if(expandNodes){
                            let nodeNames = expandNodes.split('/');
                            for(let nodeName of nodeNames){
                                let expandNode = node.graph.nodes.find(n => n.title === nodeName || n.type === nodeName);
                                if(expandNode){
                                    processNodeForExpansion(targetNode, expandNode);
                                }
                            }
                        }
                    }
                }
            }

            // 处理SDPPPLayout节点自身的expand_nodes
            let layoutExpandNodes = node.properties.expand_nodes;
            if(layoutExpandNodes){
                let nodeNames = layoutExpandNodes.split('/');
                for(let nodeName of nodeNames){
                    let expandNode = node.graph.nodes.find(n => n.title === nodeName || n.type === nodeName);
                    if(expandNode){
                        processNodeForExpansion(node, expandNode);
                    }
                }
            }

            return {
                title: getTitle(node),
                widgets: widgets
            };
        },
        setter: (node, widgetIndex, value) => {
            let widgetRemappingArr = window.kolidSDPPP_LayoutDict.get(node);
            let o = widgetRemappingArr[widgetIndex];
            let targetIndex = o.widgetIndex;
            let targetNode = o.node;
            
            if(targetNode.type == "LoadLoraPackNode"){
                if(targetIndex == -1){
                    let jsonPos = JSON.parse(targetNode.properties.json_positive);
                    let jsonToggles = {};
                    try {
                        jsonToggles = targetNode.properties?.json_positive_toggles 
                            ? JSON.parse(targetNode.properties.json_positive_toggles) 
                            : {};
                    } catch {
                        jsonToggles = {};
                    }
                    jsonToggles[o.toggleName] = value;

                    let strs = [];

                    for (const key in jsonPos) {
                        if (jsonPos.hasOwnProperty(key)) {      // 防止遍历到原型链上的属性
                            if(!jsonToggles.hasOwnProperty(key)){
                                jsonToggles[key] = true;
                            }
                            if(jsonToggles[key]){
                                strs.push(jsonPos[key]);
                            }
                        }
                    }

                    targetNode.properties.json_positive_toggles = JSON.stringify(jsonToggles);
                    targetNode.widgets[2].value = strs.join(', ');
                }else if(targetIndex == 4){
                    targetNode.widgets[4].value = value;
                    targetNode.widgets[5].value = value;
                }else{
                    targetNode.widgets[targetIndex].value = value;
                }
            }
            
            // 检查是否是分组节点（widgetIndex为-1表示分组）
            else if(Array.isArray(targetNode) && targetIndex === -1){
                // 分组节点处理，主要是AlwaysOne模式的combo控件更新
                if(o.mode === 'AlwaysOne'){
                    let nodes = targetNode;
                    let selectedTitle = value;
                    
                    // 确保只有选中的节点为true，其他为false
                    for(let node of nodes){
                        let shouldBeSelected = node.title === selectedTitle;
                        if(node.widgets[0].value !== shouldBeSelected){
                            node.widgets[0].value = shouldBeSelected;
                            
                            // 调用回调函数
                            if(node.widgets[0].callback){
                                node.widgets[0].callback(shouldBeSelected);
                            }
                            
                            let updateSet = new Set();
                            initUpdateSet(node, updateSet);
                            updateSet.delete(node);
                            updateRelays(node, updateSet);
                        }
                    }
                }
            }
            
            // 单个BranchNode处理
            else if(targetNode.type == "BranchToggleNode" || targetNode.type == "BranchBooleanNode"){
                // 检查SDPPPLayout节点的branch_mode
                const widgetRemappingArr = window.kolidSDPPP_LayoutDict.get(node);
                const layoutNode = widgetRemappingArr[0]?.node?.graph?.nodes?.find(n => n.type === 'SDPPPLayout');
                const layoutBranchMode = layoutNode?.properties?.branch_mode || 'Default';
                
                // MaxOne模式：确保最多只有一个节点被选中
                if(layoutBranchMode === 'MaxOne'){
                    // 如果当前节点被选中，将同组其他节点设为false
                    if(value === true){
                        // 查找同组的其他节点
                        for(let widgetMapping of widgetRemappingArr){
                            let otherNode = widgetMapping.node;
                            if(otherNode !== targetNode && 
                               (otherNode.type === 'BranchToggleNode' || otherNode.type === 'BranchBooleanNode') &&
                               widgetMapping.widgetIndex === 0){
                                
                                if(otherNode.widgets[0].value === true){
                                    // 取消其他节点的选中状态
                                    otherNode.widgets[0].value = false;
                                    
                                    if(otherNode.widgets[0].callback){
                                        otherNode.widgets[0].callback(false);
                                    }
                                    
                                    // 更新依赖的节点
                                    let updateSet = new Set();
                                    initUpdateSet(otherNode, updateSet);
                                    updateSet.delete(otherNode);
                                    updateRelays(otherNode, updateSet);
                                }
                            }
                        }
                    }
                }
                
                // 更新当前节点的值
                targetNode.widgets[targetIndex].value = value;
            
                // 更新依赖的节点
                let updateSet = new Set();
                initUpdateSet(targetNode, updateSet);
                updateSet.delete(targetNode);
                updateRelays(targetNode, updateSet);
            }
            
            // 特殊处理LoadImage节点的值更新
            else if(targetNode.type === "LoadImage"){
                if (targetIndex === 0) {
                    let oldValue = targetNode.widgets[0].value;
                    let newValue = value;
                    
                    // 如果value是对象（version 2格式），只取url
                    if (typeof value === 'object' && value.url) {
                        newValue = value.url;
                        
                        // 同时更新其他属性
                        if (value.source) {
                            targetNode.properties.source = value.source;
                        }
                        if (value.auto !== undefined) {
                            targetNode.properties.auto = value.auto;
                        }
                    }
                    
                    if(oldValue !== newValue){
                        targetNode.widgets[0].value = newValue;
                        if(targetNode.widgets[0].callback){
                            targetNode.widgets[0].callback(newValue);
                        }
                    }
                }
            }
            
            // 特殊处理LoadImageMask节点的值更新
            else if(targetNode.type === "LoadImageMask"){
                if (targetIndex === 0) {
                    let oldValue = targetNode.widgets[0].value;
                    let newValue = value;
                    
                    // 如果value是对象（version 2格式），只取url
                    if (typeof value === 'object' && value.url) {
                        newValue = value.url;
                        
                        // 同时更新其他属性
                        if (value.source) {
                            targetNode.properties.source = value.source;
                        }
                        if (value.auto !== undefined) {
                            targetNode.properties.auto = value.auto;
                        }
                    }
                    
                    if(oldValue !== newValue){
                        targetNode.widgets[0].value = newValue;
                        if(targetNode.widgets[0].callback){
                            targetNode.widgets[0].callback(newValue);
                        }
                    }
                }
            }
            
            // 其他节点的默认处理
            else {
                targetNode.widgets[targetIndex].value = value;
                
                // 调用回调函数
                if(targetNode.widgets[targetIndex].callback){
                    targetNode.widgets[targetIndex].callback(value);
                }
            }
            
            for (let index = 0; index < window.allbranchToggleNodes.length; index++) {
                const branchNode = window.allbranchToggleNodes[index];
                // 初始化activeNodes
                let activeNodes = branchNode.properties.active_nodes;
                if(activeNodes){
                    let nodeNames = activeNodes.split('/');
                    for(let nodeName of nodeNames){
                        let activeNode = branchNode.graph.nodes.find(n => n.title === nodeName || n.type === nodeName);
                        if(activeNode){
                            // 设置节点mode: true时为0，false时为2
                            activeNode.mode = branchNode.widgets[0].value ? 0 : 2;
                        }
                    }
                }
                // 初始化foldoutNodes
                let foldoutNodes = branchNode.properties.foldout_nodes;
                if(foldoutNodes){
                    let nodeNames = foldoutNodes.split('/');
                    for(let nodeName of nodeNames){
                        let foldoutNode = branchNode.graph.nodes.find(n => n.title === nodeName || n.type === nodeName);
                        if(foldoutNode){
                            // 控制节点折叠状态
                            if(foldoutNode.collapsed == branchNode.widgets[0].value) {
                                foldoutNode.collapse();
                            }
                        }
                    }
                }
            }
            return true;
        }
    })



    
    function initUpdateSet(node, updateSet) {
        // 如果已经放入了updateSet那么就返回.
        if(updateSet.has(node)) 
            return;

        updateSet.add(node);
        // 下游节点列表.
        let beRelayeds = window.branchToggleNodesBeRelayed.get(node.title);
        // 如果没有下游节点,则返回.
        if(!beRelayeds) return;

        for (let index = 0; index < beRelayeds.length; index++) {
            const beRelayed = beRelayeds[index];
            initUpdateSet(beRelayed, updateSet);
        }
    }

    function updateRelays(node, updateSet) {
        // 下游节点列表.
        let beRelayeds = window.branchToggleNodesBeRelayed.get(node.title);
        // 如果没有下游节点,则返回.
        if(!beRelayeds) return;
        
        // 那些没被更新的会在那些节点的更新中顺带着更新.
        for (let index = 0; index < beRelayeds.length; index++) {
            const beRelayed = beRelayeds[index];
            // 找到所有上游节点不存在updateSet中的节点.
            const relayTitles = window.branchToggleNodesRelayMap.get(beRelayed);
            let flag = true;

            for (let j = 0; j < relayTitles.length; j++) {
                const relayTitle = relayTitles[j];
                const relayNode = window.branchToggleNodesTitleMap.get(relayTitle);
                if(updateSet.has(relayNode)){
                    flag = false;
                    break;
                }
            }
            
            // 这个节点可以更新了.
            if(flag){
                // 如果这个节点已经被更新过了,这就意味着遇到了循环依赖,得跳过..
                if(!updateSet.has(beRelayed)) continue;
                // 正常更新
                updateSet.delete(beRelayed);

                let parameters = new Map();
                for (let j = 0; j < relayTitles.length; j++) {
                    const relayTitle = relayTitles[j];
                    const relayNode = window.branchToggleNodesTitleMap.get(relayTitle);
                    parameters.set(relayTitle, relayNode.widgets[0].value)
                }

                beRelayed.widgets[0].value = solveExpression(beRelayed.properties.relay_expression, parameters);

                updateRelays(beRelayed, updateSet);
            }
        }
    }
}


function parseLoraValue(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [];
}


/**
 * get the name of the input where this node is connected to, or the title of the node if not connected
 * 获取到这个节点连接的输入的名称，或者如果没有连接就返回节点的标题
 * 
 * @param {*} node 
 * @returns 
 */
function nameByConnectedOutputOrTitle(node) {
    return sdpppX.getNodeTitle(node, node.outputs?.[0].widget?.name);
}
/**
 * get the title of the node, with priority to avoid conflicts with the hidden property sdppp_widgetable_title
 * 获取节点的标题, 优先用于规避冲突的隐藏属性sdppp_widgetable_title
 * 
 * @param {*} node 
 * @returns 
 */
function getTitle(node) {
    return sdpppX.getNodeTitle(node);
}

/**
 * 
 * @param {*} node 
 * @param {*} key 
 * @param {*} settings 
 */
function initNodeProperty(node, key, settings) {
    if (!node.properties[key]) {
        node.setProperty(key, settings.default);
    }
    if (settings.type) {
        node.constructor['@' + key] = {
            type: settings.type,
            values: settings.values || []
        };
    }
}


/**
 * 从布尔表达式中提取所有变量名（支持中英文、_ $ 数字）
 * 示例：
 *   "(!已登录&&有权限)||是管理员&&!已封禁" 
 *   → ['已登录', '有权限', '是管理员', '已封禁']
 */
function extractVariables(expr) {
  // 匹配：字母、中文、数字、下划线、$，且必须以字母/中文/_/$ 开头
  const regex = /[^\(|\)&!]+/gu;
  
  const matches = expr.match(regex) || [];
  
  // 去重 + 过滤掉数字常量
  const variables = [...new Set(matches)].filter(v => 
    isNaN(Number(v)) && v !== 'true' && v !== 'false'
  );
  
  return variables;
}

/**
 * 安全计算布尔表达式（支持中英文变量名！）
 * 示例：
 *   solveExpression("已登录 && !已封禁 || 是管理员", {
 *     已登录: true,
 *     已封禁: false,
 *     是管理员: true
 *   }) → true
 */
function solveExpression(expr, variables) {
    // 支持 Map 和普通对象
    const vars = variables instanceof Map ? Object.fromEntries(variables) : variables;

    let result = expr;

    // 精准替换变量：关键是构造支持中文的“单词边界”
    for (const [key, value] of Object.entries(vars)) {
        if (typeof key !== 'string' || !key) continue;

        // 方法一：最推荐 —— 使用 Unicode 词边界 \b (JS 正则已支持，需 u 标志)
        // \b 在 u 模式下能正确识别中文边界！
        const regex = new RegExp(`(^|(?<=[^\u4E00-\u9FA5A-Za-z0-9_]))${escapeRegExp(key)}($|(?=[^\u4E00-\u9FA5A-Za-z0-9_]))`, 'gu');

        result = result.replace(regex, value === true ? 'true' : 'false');
    }

    // 此时 result 已经是纯布尔表达式
    try {
        // 严格模式执行，安全无污染
        return new Function(`"use strict"; return ${result}`)();
    } catch (e) {
        throw new Error(`表达式语法错误: ${expr}\n详细信息: ${e.message}`);
    }
}

// 辅助函数：转义正则特殊字符
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}