import { Flex, Select, Typography } from 'antd';
import React from 'react';
import i18n from '../../../../../../src/common/i18n.mts';
import { useUIWeightCSS } from './hooks.mts';
import { BaseWidgetProps } from './_base';

export interface DropdownWidgetProps extends BaseWidgetProps {
    onSelectUpdate: (identify: string, index: number) => void;
    options: string[];
    value: string;
    name?: string;
    extraOptions?: Record<string, any>;
}

export const ComboWidget: React.FC<DropdownWidgetProps> = ({
    onSelectUpdate,
    options,
    value,
    name,
    uiWeight
}) => {
    // 处理选择变化
    const handleSelect = (selectedValue: string) => {
        const selectedIndex = options.indexOf(selectedValue);
        onSelectUpdate(selectedValue, selectedIndex);
    };
    const uiWeightCSS = useUIWeightCSS(uiWeight || 12);

    return (
        <div style={{ width: '100%', ...uiWeightCSS }}>
            {name && (
                <div style={{ 
                    fontSize: 'var(--sdppp-font-size-sm)', 
                    marginBottom: '4px', 
                    color: 'var(--sdppp-text-color)',
                    opacity: 0.8
                }}>
                    {name}
                </div>
            )}
            <Select
                value={value}
                options={options.map(option => ({ value: option, label: option }))}
                style={{ 
                    width: '100%',
                    backgroundColor: 'rgb(32, 32, 32)',
                    borderColor: 'rgba(102, 102, 102, 0.4)',
                    borderRadius: '8px',
                    color: 'var(--sdppp-text-color)',
                    fontSize: '13px'
                }}
                onSelect={handleSelect}
                placeholder={i18n("select...")}
                showSearch
                filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                className="sdppp-combo-select"
            />
        </div>
    );
};


