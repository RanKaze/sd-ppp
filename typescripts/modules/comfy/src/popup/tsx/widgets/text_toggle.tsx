import React, { useState } from 'react';
import { useUIWeightCSS } from './hooks.mts';
import { BaseWidgetProps } from './_base';

interface TextToggleProps extends BaseWidgetProps {
    value?: boolean;
    text?: string;
    onValueChange: (value: boolean) => void;
    extraOptions?: Record<string, any>;
}

export const TextToggleWidget: React.FC<TextToggleProps> = ({
    value = false,
    text = '',
    onValueChange,
    uiWeight
}) => {
    const uiWeightCSS = useUIWeightCSS(uiWeight ?? 12);
    const [isPressed, setIsPressed] = useState(false);

    const handleClick = () => {
        onValueChange(!value);
    };

    return (
        <div
            onClick={handleClick}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseLeave={() => setIsPressed(false)}
            style={{
                ...uiWeightCSS,
                border: `1px solid ${value ? 'rgb(64, 143, 208)' : 'rgb(82, 88, 101)'}`,
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: 'pointer',
                backgroundColor: value ? 'rgb(64, 143, 208)' : 'rgb(45,53,66)',
                color: value ? 'white' : 'white',
                textAlign: 'center',
                userSelect: 'none',
                transition: 'background-color 0.2s, color 0.2s, transform 0.1s, opacity 0.1s',
                fontSize: '11px',
                transform: isPressed ? 'scale(0.98)' : 'scale(1)',
                opacity: isPressed ? 0.9 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            {text}
        </div>
    );
};
