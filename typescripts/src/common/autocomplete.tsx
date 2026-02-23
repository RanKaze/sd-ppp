import React, { useEffect, useRef, useState } from 'react';
import './autocomplete.css';

interface AutoCompleteEntry {
    text: string;
    priority?: number;
    info?: () => void;
    hint?: string;
    showValue?: boolean;
    caretOffset?: number;
    value?: string;
    use_replacer?: boolean;
    el?: HTMLElement;
    index?: number;
}

interface TextAreaAutoCompleteProps {
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    words?: Record<string, AutoCompleteEntry>;
    separator?: string;
}

export class TextAreaAutoComplete {
    static globalSeparator = ", ";
    static enabled = true;
    static insertOnTab = true;
    static insertOnEnter = true;
    static replacer: ((value: string) => string) | undefined = undefined;
    static lorasEnabled = false;
    static suggestionCount = 20;

    static groups: Record<string, Record<string, AutoCompleteEntry>> = {};
    static globalGroups: Set<string> = new Set();
    static globalWords: Record<string, AutoCompleteEntry> = {};
    static globalWordsExclLoras: Record<string, AutoCompleteEntry> = {};

    private el: HTMLTextAreaElement;
    private overrideWords: Record<string, AutoCompleteEntry> | null;
    private overrideSeparator: string | null;
    private dropdown: HTMLDivElement;
    private selected: { el: HTMLElement; index: number; wordInfo: AutoCompleteEntry } | null = null;
    private currentWords: { pos: number; wordInfo: AutoCompleteEntry }[] = [];

    constructor(el: HTMLTextAreaElement, words: Record<string, AutoCompleteEntry> | null = null, separator: string | null = null) {
        this.el = el;
        this.overrideWords = words;
        this.overrideSeparator = separator;
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'pysssss-autocomplete';

        this.setup();
    }

    private setup() {
        this.el.addEventListener('keydown', this.keyDown.bind(this));
        this.el.addEventListener('keypress', this.keyPress.bind(this));
        this.el.addEventListener('keyup', this.keyUp.bind(this));
        this.el.addEventListener('click', this.hide.bind(this));
        this.el.addEventListener('blur', () => setTimeout(() => this.hide(), 150));
    }

    private keyDown(e: KeyboardEvent) {
        if (!TextAreaAutoComplete.enabled) return;

        if (this.dropdown.parentElement) {
            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    if (this.selected && this.selected.index > 0) {
                        this.setSelected(this.currentWords[this.selected.index - 1].wordInfo);
                    } else if (this.currentWords.length > 0) {
                        this.setSelected(this.currentWords[this.currentWords.length - 1].wordInfo);
                    }
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    if (this.selected && this.selected.index === this.currentWords.length - 1) {
                        this.setSelected(this.currentWords[0].wordInfo);
                    } else if (this.selected) {
                        this.setSelected(this.currentWords[this.selected.index + 1].wordInfo);
                    }
                    break;
                case 'Tab':
                    if (TextAreaAutoComplete.insertOnTab) {
                        this.insertItem();
                        e.preventDefault();
                    }
                    break;
            }
        }
    }

    private keyPress(e: KeyboardEvent) {
        if (!TextAreaAutoComplete.enabled) return;
        if (this.dropdown.parentElement) {
            switch (e.key) {
                case 'Enter':
                    if (!e.ctrlKey) {
                        if (TextAreaAutoComplete.insertOnEnter) {
                            this.insertItem();
                            e.preventDefault();
                        }
                    }
                    break;
            }
        }

        if (!e.defaultPrevented) {
            this.update();
        }
    }

    private keyUp(e: KeyboardEvent) {
        if (!TextAreaAutoComplete.enabled) return;
        if (this.dropdown.parentElement) {
            switch (e.key) {
                case 'Escape':
                    e.preventDefault();
                    this.hide();
                    break;
            }
        } else if (e.key.length > 1 && e.key !== 'Delete' && e.key !== 'Backspace') {
            return;
        }
        if (!e.defaultPrevented) {
            this.update();
        }
    }

    private setSelected(item: AutoCompleteEntry) {
        if (this.selected) {
            this.selected.el.classList.remove('pysssss-autocomplete-item--selected');
        }

        const index = this.currentWords.findIndex(w => w.wordInfo === item);
        if (index === -1) return;

        this.selected = {
            el: item.el!,
            index,
            wordInfo: item
        };
        this.selected.el.classList.add('pysssss-autocomplete-item--selected');
    }

    private insertItem() {
        if (!this.selected) return;
        this.selected.el.click();
    }

    private getFilteredWords(term: string) {
        term = term.toLocaleLowerCase();

        const priorityMatches: { pos: number; wordInfo: AutoCompleteEntry }[] = [];
        const prefixMatches: { pos: number; wordInfo: AutoCompleteEntry }[] = [];
        const includesMatches: { pos: number; wordInfo: AutoCompleteEntry }[] = [];
        
        for (const word of Object.keys(this.words)) {
            const lowerWord = word.toLocaleLowerCase();
            if (lowerWord === term) {
                continue;
            }

            const pos = lowerWord.indexOf(term);
            if (pos === -1) {
                continue;
            }

            const wordInfo = this.words[word];
            if (wordInfo.priority) {
                priorityMatches.push({ pos, wordInfo });
            } else if (pos) {
                includesMatches.push({ pos, wordInfo });
            } else {
                prefixMatches.push({ pos, wordInfo });
            }
        }

        priorityMatches.sort(
            (a, b) =>
                (b.wordInfo.priority || 0) - (a.wordInfo.priority || 0) ||
                a.wordInfo.text.length - b.wordInfo.text.length ||
                a.wordInfo.text.localeCompare(b.wordInfo.text)
        );

        const top = priorityMatches.length * 0.2;
        return priorityMatches.slice(0, top).concat(prefixMatches, priorityMatches.slice(top), includesMatches).slice(0, TextAreaAutoComplete.suggestionCount);
    }

    private update() {
        let before = this.getBeforeCursor();
        if (before?.length) {
            const m = before.match(/([^,;"|{}()\n]+)$/);
            if (m) {
                before = m[0]
                    .replace(/^\s+/, "")
                    .replace(/\s/g, "_") || null;
            } else {
                before = null;
            }
        }

        if (!before) {
            this.hide();
            return;
        }

        this.currentWords = this.getFilteredWords(before);
        if (!this.currentWords.length) {
            this.hide();
            return;
        }

        this.dropdown.style.display = "";

        let hasSelected = false;
        const items = this.currentWords.map(({ wordInfo, pos }, i) => {
            const parts: HTMLElement[] = [
                this.createSpan(wordInfo.text.substr(0, pos)),
                this.createSpan(wordInfo.text.substr(pos, before.length), 'pysssss-autocomplete-highlight'),
                this.createSpan(wordInfo.text.substr(pos + before.length)),
            ];

            if (wordInfo.hint) {
                parts.push(
                    this.createSpan(wordInfo.hint, 'pysssss-autocomplete-pill')
                );
            }

            if (wordInfo.priority) {
                parts.push(
                    this.createSpan(wordInfo.priority.toString(), 'pysssss-autocomplete-pill')
                );
            }

            if (wordInfo.value && wordInfo.text !== wordInfo.value && wordInfo.showValue !== false) {
                parts.push(
                    this.createSpan(wordInfo.value, 'pysssss-autocomplete-pill')
                );
            }

            if (wordInfo.info) {
                parts.push(
                    this.createInfoButton(wordInfo.info)
                );
            }

            const item = this.createItem(parts, wordInfo, before);

            if (wordInfo === this.selected?.wordInfo) {
                hasSelected = true;
            }

            wordInfo.index = i;
            wordInfo.el = item;

            return item;
        });

        this.setSelected(hasSelected ? this.selected!.wordInfo : this.currentWords[0].wordInfo);
        this.dropdown.replaceChildren(...items);

        if (!this.dropdown.parentElement) {
            document.body.appendChild(this.dropdown);
        }

        const position = this.getCursorOffset();
        this.dropdown.style.left = (position.left ?? 0) + "px";
        this.dropdown.style.top = (position.top ?? 0) + "px";
        this.dropdown.style.maxHeight = (window.innerHeight - position.top) + "px";
    }

    private createSpan(text: string, className?: string) {
        const span = document.createElement('span');
        span.textContent = text;
        if (className) {
            span.className = className;
        }
        return span;
    }

    private createInfoButton(info: () => void) {
        const button = document.createElement('a');
        button.className = 'pysssss-autocomplete-item-info';
        button.textContent = 'ℹ️';
        button.title = 'View info...';
        button.onclick = (e) => {
            e.stopPropagation();
            info();
            e.preventDefault();
        };
        return button;
    }

    private createItem(parts: HTMLElement[], wordInfo: AutoCompleteEntry, before: string) {
        const item = document.createElement('div');
        item.className = 'pysssss-autocomplete-item';
        item.onclick = () => {
            this.el.focus();
            let value = wordInfo.value ?? wordInfo.text;
            const use_replacer = wordInfo.use_replacer ?? true;
            if (TextAreaAutoComplete.replacer && use_replacer) {
                value = TextAreaAutoComplete.replacer(value);
            }
            value = this.escapeParentheses(value);
            
            const afterCursor = this.getAfterCursor();
            const shouldAddSeparator = !afterCursor.trim().startsWith(this.separator.trim());
            this.insertAtCursor(
                value + (shouldAddSeparator ? this.separator : ''),
                -before.length,
                wordInfo.caretOffset
            );
            
            setTimeout(() => {
                this.update();
            }, 150);
        };
        
        parts.forEach(part => item.appendChild(part));
        return item;
    }

    private escapeParentheses(text: string) {
        return text.replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    }

    private hide() {
        this.selected = null;
        this.dropdown.remove();
    }

    private get words() {
        return this.overrideWords ?? TextAreaAutoComplete.globalWords;
    }

    private get separator() {
        return this.overrideSeparator ?? TextAreaAutoComplete.globalSeparator;
    }

    private getBeforeCursor() {
        if (this.el.selectionStart !== this.el.selectionEnd) return null;
        return this.el.value.substring(0, this.el.selectionEnd);
    }

    private getAfterCursor() {
        return this.el.value.substring(this.el.selectionEnd);
    }

    private insertAtCursor(value: string, offset: number, finalOffset?: number) {
        if (this.el.selectionStart != null) {
            const startPos = this.el.selectionStart;
            
            this.el.selectionStart = this.el.selectionStart + offset;

            let pasted = true;
            try {
                if (!document.execCommand('insertText', false, value)) {
                    pasted = false;
                }
            } catch (e) {
                console.error('Error caught during execCommand:', e);
                pasted = false;
            }

            if (!pasted) {
                console.error(
                    'execCommand unsuccessful; not supported. Adding text manually, no undo support.'
                );
                const text = this.el.value;
                const modifiedText = text.substring(0, this.el.selectionStart) + value + text.substring(this.el.selectionEnd);
                this.el.value = modifiedText;
                this.el.selectionStart = this.el.selectionEnd = this.el.selectionStart + value.length;
            } else {
                this.el.selectionEnd = this.el.selectionStart = startPos + value.length + offset + (finalOffset ?? 0);
            }
        } else {
            let pasted = true;
            try {
                if (!document.execCommand('insertText', false, value)) {
                    pasted = false;
                }
            } catch (e) {
                console.error('Error caught during execCommand:', e);
                pasted = false;
            }

            if (!pasted) {
                console.error(
                    'execCommand unsuccessful; not supported. Adding text manually, no undo support.'
                );
                this.el.value += value;
            }
        }
    }

    private getCursorOffset() {
        const rect = this.el.getBoundingClientRect();
        const offset = {
            top: rect.top + window.pageYOffset,
            left: rect.left + window.pageXOffset,
        };
        
        if (document.documentElement) {
            offset.top -= document.documentElement.clientTop;
            offset.left -= document.documentElement.clientLeft;
        }
        
        const caretPos = this.getCaretPosition();
        const lineHeight = this.getLineHeightPx();
        
        return {
            top: offset.top + caretPos.top + lineHeight,
            left: offset.left + caretPos.left,
            lineHeight
        };
    }

    private getCaretPosition() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return { top: 0, left: 0 };
        
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        return { top: rect.top, left: rect.left };
    }

    private getLineHeightPx() {
        const computedStyle = getComputedStyle(this.el);
        const lineHeight = computedStyle.lineHeight;
        
        if (this.isDigit(lineHeight.charCodeAt(0))) {
            const floatLineHeight = parseFloat(lineHeight);
            return this.isDigit(lineHeight.charCodeAt(lineHeight.length - 1))
                ? floatLineHeight * parseFloat(computedStyle.fontSize)
                : floatLineHeight;
        }
        
        return this.calculateLineHeightPx(this.el.nodeName, computedStyle);
    }

    private isDigit(charCode: number) {
        const CHAR_CODE_ZERO = '0'.charCodeAt(0);
        const CHAR_CODE_NINE = '9'.charCodeAt(0);
        return CHAR_CODE_ZERO <= charCode && charCode <= CHAR_CODE_NINE;
    }

    private calculateLineHeightPx(nodeName: string, computedStyle: CSSStyleDeclaration) {
        const body = document.body;
        if (!body) return 0;

        const tempNode = document.createElement(nodeName);
        tempNode.innerHTML = '&nbsp;';
        Object.assign(tempNode.style, {
            fontSize: computedStyle.fontSize,
            fontFamily: computedStyle.fontFamily,
            padding: '0',
            position: 'absolute',
        });
        body.appendChild(tempNode);

        if (tempNode instanceof HTMLTextAreaElement) {
            tempNode.rows = 1;
        }

        const height = tempNode.offsetHeight;
        body.removeChild(tempNode);

        return height;
    }

    static updateWords(id: string, words: Record<string, AutoCompleteEntry>, addGlobal = true) {
        const isUpdate = id in TextAreaAutoComplete.groups;
        TextAreaAutoComplete.groups[id] = words;
        if (addGlobal) {
            TextAreaAutoComplete.globalGroups.add(id);
        }

        if (isUpdate) {
            TextAreaAutoComplete.globalWords = Object.assign(
                {},
                ...Object.keys(TextAreaAutoComplete.groups)
                    .filter((k) => TextAreaAutoComplete.globalGroups.has(k))
                    .map((k) => TextAreaAutoComplete.groups[k])
            );
        } else if (addGlobal) {
            Object.assign(TextAreaAutoComplete.globalWords, words);
        }
    }
}

export const useAutoComplete = (textareaRef: React.RefObject<HTMLTextAreaElement>, words?: Record<string, AutoCompleteEntry>, separator?: string) => {
    useEffect(() => {
        if (textareaRef.current) {
            const autoComplete = new TextAreaAutoComplete(textareaRef.current, words, separator);
            return () => {
                // Cleanup
            };
        }
    }, [textareaRef, words, separator]);
};
