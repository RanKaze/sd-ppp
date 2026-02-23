import React, { useRef, useEffect } from 'react';
import { useUIWeightCSS } from './hooks.mts';
import { BaseWidgetProps } from './_base';
import { TextAreaAutoComplete } from '../../../../../../src/common/autocomplete';

interface StringWidgetProps extends BaseWidgetProps {
    value?: string;
    onValueChange: (value: string) => void;
    extraOptions?: Record<string, any>;
    name?: string;
}

export const StringWidget: React.FC<StringWidgetProps> = ({
    value = '',
    onValueChange,
    uiWeight,
    name
}) => {
    const uiWeightCSS = useUIWeightCSS(uiWeight || 12);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // 使用自动补全功能
    useEffect(() => {
        if (textareaRef.current) {
            const autoComplete = new TextAreaAutoComplete(textareaRef.current);
        }
    }, [textareaRef]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onValueChange(e.target.value);
    };

    return (
        <div
            className="widget-container"
            style={uiWeightCSS}
        >
            {name && <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>{name}</div>}
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                spellCheck="false"
                style={{
                    width: '100%',
                    minHeight: '32px',
                    padding: '4px 8px',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    fontSize: '14px'
                }}
            />
        </div>
    );
};
