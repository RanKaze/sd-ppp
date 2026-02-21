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


function parseLoraValue(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [];
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
  // 去重
  const variables = [...new Set(matches)];
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

function initUpdateSet(node, updateSet) {
    // 如果已经放入了updateSet那么就返回.
    //如果node是列表，那么就遍历列表，递归调用initUpdateSet
    if(updateSet.has(node)) 
        return;

    updateSet.add(node);
    // 下游节点列表.
    let beRelayeds = window.sdppp_data.branchBeRelayedMap.get("{"+node.id+"}");
    if(!beRelayeds) {
        beRelayeds = window.sdppp_data.branchBeRelayedMap.get(node.title);
        // 如果没有下游节点,则返回.
        if(!beRelayeds) return;
    }

    for (let index = 0; index < beRelayeds.length; index++) {
        const beRelayed = beRelayeds[index];
        initUpdateSet(beRelayed, updateSet);
    }
}

function updateRelays(node, updateSet) {
    // 下游节点列表.
    let beRelayeds = window.sdppp_data.branchBeRelayedMap.get("{"+node.id+"}");
    if(!beRelayeds) {
        beRelayeds = window.sdppp_data.branchBeRelayedMap.get(node.title);
        // 如果没有下游节点,则返回.
        if(!beRelayeds) return;
    }
    
    // 那些没被更新的会在那些节点的更新中顺带着更新.
    for (let index = 0; index < beRelayeds.length; index++) {
        const beRelayed = beRelayeds[index];
        // 找到所有上游节点不存在updateSet中的节点.
        const relayMarks = window.sdppp_data.branchRelayMap.get(beRelayed);
        let flag = true;

        for (let j = 0; j < relayMarks.length; j++) {
            const relayMark = relayMarks[j];
            let id = nodeMarkToId(relayMark);
            let relayNode = null;
            if (id !== undefined){
                relayNode = node.graph.getNodeById(id);
            }else{
                relayNode = window.sdppp_data.branchTitleMap.get(relayMark);
            }
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
            for (let j = 0; j < relayMarks.length; j++) {
                const relayMark = relayMarks[j];
                let id = nodeMarkToId(relayMark);
                if (id !== undefined){
                    const relayNode = node.graph.getNodeById(id);
                    parameters.set(relayMark, relayNode.widgets[0].value)
                }else{
                    const relayNode = window.sdppp_data.branchTitleMap.get(relayMark);
                    parameters.set(relayMark, relayNode.widgets[0].value)
                }
            }

            beRelayed.widgets[0].value = solveExpression(beRelayed.properties.relay_expression, parameters);

            updateRelays(beRelayed, updateSet);
        }
    }
}

function updateBranchNode(node){
    // 更新依赖的节点
    let updateSet = new Set();
    initUpdateSet(node, updateSet);
    updateSet.delete(node);
    updateRelays(node, updateSet);
}

function updateActiveAndFoldout(){
    for (let index = 0; index < window.sdppp_data.branchNodes.length; index++) {
        const branchNode = window.sdppp_data.branchNodes[index];
        // 初始化activeNodes
        let activeNodes = branchNode.properties.active_nodes;
        if(activeNodes){
            for(let activeNode of getNodes(branchNode, activeNodes)){
                activeNode.mode = branchNode.widgets[0].value ? 0 : 2;
            }
        }
        // 初始化foldoutNodes
        let foldoutNodes = branchNode.properties.foldout_nodes;
        if(foldoutNodes){
            for(let foldoutNode of getNodes(branchNode, foldoutNodes)){
                if(foldoutNode.collapsed == branchNode.widgets[0].value) {
                    foldoutNode.collapse();
                }
            }
        }
    }
}

function getNodeTitles(nodeTitles) {
    return nodeTitles.split('/');
}

function nodeMarkToId(nodeMark){
    const matches = nodeMark.match(/(?<=\{)\d+(?=\})/g);
    if (matches){
        //把match的第一个值转变为id:number
        let id = Number(matches[0]);
        return id;
    }
    return undefined;
}

function* getNodes(node, nodeString){
    let nodeMarks = getNodeTitles(nodeString);
    for(let nodeMark of nodeMarks){
        let id = nodeMarkToId(nodeMark);
        if(id !== undefined){
            let subNode = node.graph.getNodeById(id);
            if(subNode){
                yield subNode;
            }
        }else{
            let subNode = node.graph.nodes.find(n => n.title === nodeMark || n.type === nodeMark);
            if(subNode){
                yield subNode;
            }
        }
    }
}

function* ExpandNode(currentNode, expandNode, processedNodes, indent) {
    // 检测循环调用：如果已经处理过这个节点，或者这个节点正在处理中，就跳过
    if(processedNodes.has(expandNode.id)) {
        return;
    }
    processedNodes.add(expandNode.id);
    
    let addFlag = true;
    let hide = false;
    if('hide' in expandNode.properties && expandNode.properties.hide){
        addFlag = false;
        hide = true;
    }
    let added = false;

    let block = {
        indent : indent,
        id: expandNode.id,
    };
    
    // 如果展开的节点是BranchToggleNode或BranchBooleanNode，递归展开它的expand_nodes
    let value = layoutValue(expandNode);
    if(value !== undefined){
        if (value) {
            let expandNodes = expandNode.properties.expand_nodes;
            if(expandNodes){
                if(addFlag){
                    added = true;
                    block.indent = indent + 1;
                    block.split = true;
                    yield block;
                }
                let nextIndent = hide ? indent : indent + 1;
                for(let subExpandNode of getNodes(expandNode, expandNodes)){
                    yield* ExpandNode(expandNode, subExpandNode, processedNodes, nextIndent);
                }
            }
        }
    }

    if(addFlag && !added){
        yield block;
    }
}

function layoutValue(node){
    if (node.type === "Branch Switch" || node.type === "Branch Boolean"){
        return node.widgets[0].value;
    }
    return undefined;
}


function* allNodes(graph){
    for (let index = 0; index < graph.nodes.length; index++) {
        const node = graph.nodes[index];
        yield node;
        if(node.subgraph){
            yield* allNodes(node.subgraph);
        }
    }
}

export default function (sdppp, version = 1) {

    if (window.sdppp_data === undefined){
        window.sdppp_data = {};
        window.sdppp_data.LayoutDict = new Map();
        window.sdppp_data.branchTitleMap = new Map();
        window.sdppp_data.branchRelayMap = new Map();
        window.sdppp_data.branchBeRelayedMap = new Map();
    }

    sdppp.widgetable.add("sdppp_layout_参数更新", {
        onRefresh: (app) => {
            const graph = app.graph;

            window.sdppp_data.branchNodes = [];
            window.sdppp_data.branchTitleMap.clear();
            window.sdppp_data.branchRelayMap.clear();
            window.sdppp_data.branchBeRelayedMap.clear();

            for (let node of allNodes(graph)) {
                if(node.type == "Branch Switch" || node.type == "Branch Boolean"){    

                    if (!('relay_expression' in node.properties)) {
                        node.setProperty('relay_expression', '');
                    }
                    if (!('expand_nodes' in node.properties)) {
                        node.setProperty('expand_nodes', '');
                    }
                    if (!('active_nodes' in node.properties)) {
                        node.setProperty('active_nodes', '');
                    }
                    if (!('foldout_nodes' in node.properties)) {
                        node.setProperty('foldout_nodes', '');
                    }
                    if (!('hide' in node.properties)) {
                        node.setProperty('hide', false);
                    }

                    window.sdppp_data.branchTitleMap.set(node.title, node);
                    const expr = node.properties.relay_expression;
                    const relays = extractVariables(expr);
                    window.sdppp_data.branchRelayMap.set(node, relays);
                    
                    window.sdppp_data.branchNodes.push(node);
                    

                    for (let index = 0; index < relays.length; index++) {
                        const relay = relays[index];
                        let table = window.sdppp_data.branchBeRelayedMap.get(relay);
                        if(!table){
                            table = [];
                            window.sdppp_data.branchBeRelayedMap.set(relay, table);
                        }
                        table.push(node);
                    }

                    // 初始化activeNodes
                    let activeNodes = node.properties.active_nodes;
                    if(activeNodes){
                        let nodeNames = activeNodes.split('/');
                        for(let nodeName of nodeNames){
                            let activeNode = node.graph.nodes.find(n => n.title === nodeName || n.type === nodeName);
                            if(activeNode){
                                // 设置节点mode: true时为0，false时为2
                                activeNode.mode = node.widgets[0].value ? 0 : 2;
                            }
                        }
                    }

                    // 初始化foldoutNodes
                    let foldoutNodes = node.properties.foldout_nodes;
                    if(foldoutNodes){
                        let nodeNames = foldoutNodes.split('/');
                        for(let nodeName of nodeNames){
                            let foldoutNode = node.graph.nodes.find(n => n.title === nodeName || n.type === nodeName);
                            if(foldoutNode){
                                // 控制节点折叠状态
                                if(foldoutNode.collapsed == node.widgets[0].value) {
                                    foldoutNode.collapse();
                                }
                            }
                        }
                    }
                }
            }

            // 对BranchToggleNode进行排序
            window.sdppp_data.branchNodes.sort((n0,n1)=>n0.title.localeCompare(n1.title));
        }
    });

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
                name: node.title,
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
                name: node.title,   // 参数名widget
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

    sdppp.widgetable.add("TriggerWord Toggle (LoraManager)", {
        formatter: (node) => {
            window.sdppp_data.LayoutDict.set(node, []);
            let widgetRemappingArr = window.sdppp_data.LayoutDict.get(node);
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
                    outputType: "text_toggle",
                    uiWeight: 0
                });
            }

            return {
                title: getTitle(node),
                widgets: widgets
            };
        },
        setter: (node, widgetIndex, value) => {
            let widgetRemappingArr = window.sdppp_data.LayoutDict.get(node);
            let o = widgetRemappingArr[widgetIndex];
            let targetNode = o.node;

            if(targetNode.type == 'TriggerWord Toggle (LoraManager)'){
                if(o.type == 0){
                    targetNode.widgets[o.index].value = value;
                    targetNode.widgets[o.index].callback?.(targetNode.widgets[o.index].value);
                }else if(o.type == 1){
                    const tag = targetNode.widgets[3].element.children[o.index];
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

            window.sdppp_data.LayoutDict.set(node, []);
            let widgetRemappingArr = window.sdppp_data.LayoutDict.get(node);
            
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
                    outputType: "text_toggle",
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
            let widgetRemappingArr = window.sdppp_data.LayoutDict.get(node);
            let o = widgetRemappingArr[widgetIndex];
            let targetNode = o.node;

            if(targetNode.type == 'Lora Loader (LoraManager)'){
                let index = o.loraIndex;

                const loraEntry = node.lorasWidget.element.children[1 + index];
                const widget = node.lorasWidget;
                const lorasData = parseLoraValue(widget.value);

                if(o.type == 0){
                    const toggleElement = loraEntry.children[0].children[1];
                    toggleElement.click();
                    lorasData[index].active = value;
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

    sdppp.widgetable.add("Branch Switch", {
        asNormalNode: true,
        formatter: (node) => {
            return {
                title: getTitle(node),
                widgets: [
                    {
                        value: node.widgets[0].value,
                        name: getTitle(node),
                        outputType: "toggle",
                        uiWeight: 4
                    }
                ]
            };
        },
        setter: (node, widgetIndex, value) => {
            let widget = node.widgets[widgetIndex];
            widget.value = value;
            widget.callback?.(value);
            updateBranchNode(node);
            updateActiveAndFoldout();
            return true;
        }
    });

    sdppp.widgetable.add("Branch Boolean", {
        asNormalNode: true,
        formatter: (node) => {
            return {
                title: getTitle(node),
                widgets: [
                    {
                        value: node.widgets[0].value,
                        name: getTitle(node),
                        outputType: "toggle",
                        uiWeight: 4
                    }
                ]
            };
        },
        setter: (node, widgetIndex, value) => {
            let widget = node.widgets[widgetIndex];
            widget.value = value;
            widget.callback?.(value);
            updateBranchNode(node);
            updateActiveAndFoldout();
            return true;
        }
    });



    sdppp.widgetable.add("Branch Group", {

        formatter: (node) => {
            // 为Branch Group节点添加@branch_mode元数据，定义属性为combo类型
            if (node.constructor && !node.constructor["@branch_mode"]) {
                node.constructor["@branch_mode"] = {
                    type: "combo",
                    values: ["Default", "MaxOne", "AlwaysOne"]
                };
            }
            window.sdppp_data.LayoutDict.set(node, []);
            let widgetRemappingArr = window.sdppp_data.LayoutDict.get(node);

            if (!('collect_BranchSwitchNode' in node.properties)) {
                node.setProperty('collect_BranchSwitchNode', true);
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
            if (!('expand_nodes' in node.properties)) {
                node.setProperty('expand_nodes', '');
            }

            let matchStr = node.properties.match_regex;
            let matchColor = node.color;
            let graph = node.graph;

            const widgets = [];
            const blocks = [];

            let collect_BranchSwitchNode = node.properties.collect_BranchSwitchNode;
            let collect_BranchBooleanNode = node.properties.collect_BranchBooleanNode;

            // 过滤出符合条件的BranchNode
            let filteredBranchNodes = window.sdppp_data.branchNodes
            .filter(n=>{
                if(graph != n.graph) return false;
                if(n.type == 'Branch Switch'){
                    return collect_BranchSwitchNode;
                }
                else if(n.type == 'Branch Boolean'){
                    return collect_BranchBooleanNode;
                }
                return false;
            })
            .filter(n => {
                let toMatch = n.title;
                if(!toMatch.match(matchStr)) return false;
                if(n.color != matchColor) return false;
                return true;
            });
            
            // 获取Branch Group节点自身的branch_mode
            const layoutBranchMode = node.properties.branch_mode || 'Default';
            
            // Default模式：保持原有逻辑，每个节点作为独立的toggle控件显示
            if (layoutBranchMode === 'Default' || filteredBranchNodes.length === 0) {
                for (const targetNode of filteredBranchNodes) {
                    let addFlag = true;

                    if('hide' in targetNode.properties && targetNode.properties.hide) {
                        addFlag = false;
                    }
                    if(addFlag){
                        blocks.push({
                            indent : 0,
                            id : targetNode.id
                        });
                    }
                    // 初始化expand_nodes
                    if(targetNode.widgets[0].value){
                        let expandNodes = targetNode.properties.expand_nodes;
                        if(expandNodes){
                            if(addFlag){
                                blocks[blocks.length - 1].indent = 1;
                                blocks[blocks.length - 1].split = true;
                            }
                            let processNodes = new Set();
                            for(let expandNode of getNodes(targetNode, expandNodes)){
                                blocks.push(...ExpandNode(targetNode, expandNode, processNodes, 1));
                            }
                        }
                    }
                }
            } 
            // AlwaysOne模式：将所有BranchNode打包成一个combo控件
            else if (layoutBranchMode === 'AlwaysOne') {
                if (filteredBranchNodes.length > 0) {
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
                    if(!expandNode && allNodes.length > 0){
                        expandNode = allNodes[0];
                        expandNode.widgets[0].value = true;
                        updateBranchNode(expandNode);
                        updateActiveAndFoldout();
                    }
                    if(expandNode){
                        // 初始化activeNodes
                        let activeNodes = expandNode.properties.active_nodes;
                        if(activeNodes){
                            for(let activeNode of getNodes(node, activeNodes)){
                                activeNode.mode = expandNode.widgets[0].value ? 0 : 2;
                            }
                        }
                        let foldoutNodes = expandNode.properties.foldout_nodes;
                        if(foldoutNodes){
                            for(let foldoutNode of getNodes(node, foldoutNodes)){
                                if(foldoutNode.collapsed == expandNode.widgets[0].value) {
                                    foldoutNode.collapse();
                                }
                            }
                        }
                        let expandNodes = expandNode.properties.expand_nodes;
                        if(expandNodes){
                            let processNodes = new Set();
                            for(let subExpandNode of getNodes(node, expandNodes)){
                                blocks.push(...ExpandNode(expandNode, subExpandNode, processNodes, 1));
                            }
                        }
                    }
                }
            }
            // MaxOne模式：确保最多只有一个节点被选中
            else if (layoutBranchMode === 'MaxOne') {
                if (filteredBranchNodes.length > 0) {
                    // 收集所有节点，包括hide为true的节点
                    let allNodes = filteredBranchNodes;
                    
                    let visibleNodeTitles = [];

                    // 收集仅hide为false的节点标题，用于combo控件
                    visibleNodeTitles.push('[None]');
                    let tempTitles = allNodes
                        .filter(n => !n.properties.hide)
                        .map(n => n.title);
                    visibleNodeTitles.push(...tempTitles);
                    
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
                        widgetIndex: -2, // 特殊标记，表示这是一个分组widget
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
                            for(let activeNode of getNodes(node, activeNodes)){
                                activeNode.mode = expandNode.widgets[0].value ? 0 : 2;
                            }
                        }
                        let foldoutNodes = expandNode.properties.foldout_nodes;
                        if(foldoutNodes){
                            for(let foldoutNode of getNodes(node, foldoutNodes)){
                                if(foldoutNode.collapsed == expandNode.widgets[0].value) {
                                    foldoutNode.collapse();
                                }
                            }
                        }
                        let expandNodes = expandNode.properties.expand_nodes;
                        if(expandNodes){
                            let processNodes = new Set();
                            for(let subExpandNode of getNodes(node, expandNodes)){
                                blocks.push(...ExpandNode(expandNode, subExpandNode, processNodes, 1));
                            }
                        }
                    }
                }
            }

            // 处理Branch Group节点自身的expand_nodes
            let layoutExpandNodes = node.properties.expand_nodes;
            if(layoutExpandNodes){
                let processNodes = new Set();
                for(let expandNode of getNodes(node, layoutExpandNodes)){
                    blocks.push(...ExpandNode(node, expandNode, processNodes, 1));
                }
            }

            return {
                title: getTitle(node),
                widgets: widgets,
                blocks: blocks,
            };
        },
        setter: (node, widgetIndex, value) => {
            let widgetRemappingArr = window.sdppp_data.LayoutDict.get(node);
            let o = widgetRemappingArr[widgetIndex];
            let targetIndex = o.widgetIndex;
            let targetNode = o.node;
        
            
            // 检查是否是分组节点（widgetIndex为-1表示分组）
            if(Array.isArray(targetNode)){
                if(targetIndex === -1){
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
                            }
                            updateBranchNode(node);
                        }

                        updateActiveAndFoldout();
                    }
                }else if(targetIndex === -2){
                    // 分组节点处理，主要是AlwaysOne模式的combo控件更新
                    if(o.mode === 'MaxOne'){
                        let nodes = targetNode;
                        let selectedTitle = value;
                        
                        if(selectedTitle === '[None]'){
                            // 取消所有节点的选中
                            for(let node of nodes){
                                if(node.widgets[0].value){
                                    node.widgets[0].value = false;
                                    
                                    // 调用回调函数
                                    if(node.widgets[0].callback){
                                        node.widgets[0].callback(false);
                                    }
                                }
                                updateBranchNode(node);
                            }
                            updateActiveAndFoldout();
                        }else{
                            // 确保只有选中的节点为true，其他为false
                            for(let node of nodes){
                                let shouldBeSelected = node.title === selectedTitle;
                                if(node.widgets[0].value !== shouldBeSelected){
                                    node.widgets[0].value = shouldBeSelected;
                                    
                                    // 调用回调函数
                                    if(node.widgets[0].callback){
                                        node.widgets[0].callback(shouldBeSelected);
                                    }
                                }
                                updateBranchNode(node);
                            }
                            updateActiveAndFoldout();
                        }
                    }
                }
            }
            return true;
        }
    })
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
