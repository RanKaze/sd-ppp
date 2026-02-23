import { TextAreaAutoComplete } from './autocomplete';

// 解析CSV格式的标签文件
function parseCSV(csvText: string): string[][] {
    const rows: string[][] = [];
    const delimiter = ",";
    const quote = '"';
    let currentField = "";
    let inQuotedField = false;

    function pushField() {
        rows[rows.length - 1].push(currentField);
        currentField = "";
        inQuotedField = false;
    }

    rows.push([]); // 初始化第一行

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];

        // 处理转义引号
        if (char === "\\" && nextChar === quote) {
            currentField += quote;
            i++;
        }

        if (!inQuotedField) {
            if (char === quote) {
                inQuotedField = true;
            } else if (char === delimiter) {
                pushField();
            } else if (char === "\r" || char === "\n" || i === csvText.length - 1) {
                pushField();
                if (nextChar === "\n") {
                    i++; // 处理Windows行结尾（\r\n）
                }
                rows.push([]); // 开始新行
            } else {
                currentField += char;
            }
        } else {
            if (char === quote && nextChar === quote) {
                currentField += quote;
                i++; // 跳过下一个引号
            } else if (char === quote) {
                inQuotedField = false;
            } else if (char === "\r" || char === "\n" || i === csvText.length - 1) {
                // 不允许在引号文本中使用换行符，假设它是错误的
                const parsed: string[][] = parseCSV(currentField);
                rows.pop();
                rows.push(...parsed);
                inQuotedField = false;
                currentField = "";
                rows.push([]);
            } else {
                currentField += char;
            }
        }
    }

    if (currentField || csvText[csvText.length - 1] === ",") {
        pushField();
    }

    // 如果最后一行是空的，删除它
    if (rows[rows.length - 1].length === 0) {
        rows.pop();
    }

    return rows;
}

// 加载danbooru标签并更新自动补全单词列表
export async function loadDanbooruTags() {
    try {
        const response = await fetch('https://gist.githubusercontent.com/pythongosssss/1d3efa6050356a08cea975183088159a/raw/a18fb2f94f9156cf4476b0c24a09544d6c0baec6/danbooru-tags.txt');
        if (!response.ok) {
            throw new Error(`Failed to load tags: ${response.status} ${response.statusText}`);
        }
        
        const text = await response.text();
        const tags = parseCSV(text);
        
        // 转换标签为自动补全条目
        const words: Record<string, any> = {};
        for (const tag of tags) {
            if (tag.length > 0) {
                const tagText = tag[0].trim();
                if (tagText) {
                    words[tagText] = { text: tagText };
                }
            }
        }
        
        // 更新到自动补全系统
        TextAreaAutoComplete.updateWords('danbooru.tags', words);
        console.log(`Loaded ${Object.keys(words).length} Danbooru tags for auto-completion`);
    } catch (error) {
        console.error('Error loading Danbooru tags:', error);
    }
}

// 初始化自动补全系统
export function initAutoComplete() {
    // 加载Danbooru标签
    loadDanbooruTags();
    
    // 可以在这里添加其他初始化逻辑
}
