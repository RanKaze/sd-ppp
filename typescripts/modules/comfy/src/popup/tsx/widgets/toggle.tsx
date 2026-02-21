import React, { useState } from 'react';
import { useUIWeightCSS } from './hooks.mts';
import { BaseWidgetProps } from './_base';

interface ToggleProps extends BaseWidgetProps {
    value?: any;
    name?: string;
    onValueChange: (value: boolean) => void;
    extraOptions?: Record<string, any>;
}

export const ToggleWidget: React.FC<ToggleProps> = ({
    value,
    name,
    onValueChange,
    uiWeight
}) => {
    const [isPressed, setIsPressed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const handleContainerClick = (e: React.MouseEvent) => {
        // 防止点击 toggle 时触发两次
        if ((e.target as HTMLElement).closest('.toggle-circle')) {
            return;
        }
        onValueChange(!value);
    };

    const uiWeightCSS = useUIWeightCSS(uiWeight || 12);

    return (
        <div 
            style={{
                ...uiWeightCSS,
                border: '1px solid rgba(102, 102, 102, 0.4)',
                borderRadius: '12px',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.3s',
                fontSize: 'var(--sdppp-font-size-sm)',
                height: '30px',
                boxShadow: value ? '0 0 8px rgba(64, 143, 208, 0.5)' : isHovered ? '0 0 6px rgba(158, 158, 158, 0.3)' : 'none',
                color: value ? 'white' : 'inherit',
                transform: isPressed ? 'scale(0.98)' : 'scale(1)',
                opacity: isPressed ? 0.9 : 1
            }}
            onClick={handleContainerClick}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseLeave={() => {
                setIsPressed(false);
                setIsHovered(false);
            }}
            onMouseEnter={() => setIsHovered(true)}
        >
            <span style={{ flex: 1, marginRight: '10px' }}>{name || ''}</span>
            <div 
                className="toggle-circle"
                style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: `1px solid ${value ? 'rgb(64, 143, 208)' : 'rgba(102, 102, 102, 0.4)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: value ? 'rgb(64, 143, 208)' : 'rgb(30, 30, 30)',
                    transition: 'all 0.3s',
                    transform: isPressed ? 'scale(0.95)' : 'scale(1)'
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    onValueChange(!value);
                }}
            >
            </div>
        </div>
    );
};
