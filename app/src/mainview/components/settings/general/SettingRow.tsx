// =============================================================================
// SETTING ROW
// =============================================================================
// Single setting row with label and control (toggle, select, input).

import React, { useState, useEffect } from 'react';
import { Select } from '../../atoms/Select';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface BaseSettingRowProps {
    label: string;
    description?: string;
}

interface ToggleSettingRowProps extends BaseSettingRowProps {
    control: 'toggle';
    value: boolean;
    onChange: (value: boolean) => void;
}

interface SelectOption {
    value: string;
    label: string;
}

interface SelectSettingRowProps extends BaseSettingRowProps {
    control: 'select';
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
}

interface InputSettingRowProps extends BaseSettingRowProps {
    control: 'input';
    value: string;
    placeholder?: string;
    onChange: (value: string) => void;
}

export type SettingRowProps = ToggleSettingRowProps | SelectSettingRowProps | InputSettingRowProps;

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function SettingRow(props: SettingRowProps) {
    const { label, description, control } = props;

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid var(--color-border)',
            }}
        >
            {/* Label & Description */}
            <div style={{ flex: 1, marginRight: '16px' }}>
                <div
                    style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'var(--color-text)',
                        marginBottom: description ? '4px' : 0,
                    }}
                >
                    {label}
                </div>
                {description && (
                    <div
                        style={{
                            fontSize: '12px',
                            color: 'var(--color-text-tertiary)',
                        }}
                    >
                        {description}
                    </div>
                )}
            </div>

            {/* Control */}
            {control === 'toggle' && (
                <ToggleControl value={props.value} onChange={props.onChange} />
            )}
            {control === 'select' && (
                <SelectControl value={props.value} options={props.options} onChange={props.onChange} />
            )}
            {control === 'input' && (
                <InputControl
                    value={props.value}
                    placeholder={props.placeholder}
                    onChange={props.onChange}
                />
            )}
        </div>
    );
}

// -----------------------------------------------------------------------------
// CONTROLS
// -----------------------------------------------------------------------------

function ToggleControl({
    value,
    onChange,
}: {
    value: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <button
            role="switch"
            aria-checked={value}
            onClick={() => onChange(!value)}
            style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: value ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background-color 0.15s ease',
            }}
        >
            <span
                style={{
                    position: 'absolute',
                    top: '2px',
                    left: value ? '22px' : '2px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    transition: 'left 0.15s ease',
                }}
            />
        </button>
    );
}

function SelectControl({
    value,
    options,
    onChange,
}: {
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
}) {
    return (
        <Select
            value={value}
            onChange={onChange}
            options={options}
            triggerClassName="!min-w-[140px]"
        />
    );
}

function InputControl({
    value,
    placeholder,
    onChange,
}: {
    value: string;
    placeholder?: string;
    onChange: (value: string) => void;
}) {
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleBlur = () => {
        if (localValue !== value) {
            onChange(localValue);
        }
    };

    return (
        <input
            type="text"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            placeholder={placeholder}
            style={{
                padding: '8px 12px',
                fontSize: '13px',
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text)',
                minWidth: '140px',
                outline: 'none',
            }}
        />
    );
}
