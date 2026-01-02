// =============================================================================
// TARGET ADJUSTER
// =============================================================================
// Allows adjusting the target image count during job execution.

import React, { useState, useCallback } from 'react';
import { Plus, Minus, Check, X } from 'lucide-react';
import { IconButton } from '../../atoms/IconButton';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface TargetAdjusterProps {
  currentTarget: number;
  currentProgress: number;
  onChange: (target: number) => void;
  onClose: () => void;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function TargetAdjuster({
  currentTarget,
  currentProgress,
  onChange,
  onClose,
}: TargetAdjusterProps) {
  const [value, setValue] = useState(currentTarget);

  const handleIncrement = useCallback((amount: number) => {
    setValue((v) => Math.max(currentProgress + 1, v + amount));
  }, [currentProgress]);

  const handleSubmit = useCallback(() => {
    onChange(value);
    onClose();
  }, [value, onChange, onClose]);

  const presets = [
    { label: '+10', amount: 10 },
    { label: '+25', amount: 25 },
    { label: '+50', amount: 50 },
    { label: '+100', amount: 100 },
  ];

  return (
    <div
      style={{
        marginTop: '12px',
        padding: '12px',
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--color-text-secondary)',
          }}
        >
          Adjust Target
        </span>

        <IconButton
          icon={<X size={14} />}
          tooltip="Close"
          size="sm"
          onClick={onClose}
        />
      </div>

      {/* Value input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <IconButton
          icon={<Minus size={14} />}
          tooltip="Decrease"
          size="sm"
          onClick={() => handleIncrement(-10)}
          disabled={value <= currentProgress + 1}
        />

        <input
          type="number"
          value={value}
          onChange={(e) => setValue(Math.max(currentProgress + 1, Number(e.target.value)))}
          min={currentProgress + 1}
          style={{
            width: '100px',
            padding: '8px 12px',
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text)',
            fontSize: '14px',
            textAlign: 'center',
            fontVariantNumeric: 'tabular-nums',
          }}
        />

        <IconButton
          icon={<Plus size={14} />}
          tooltip="Increase"
          size="sm"
          onClick={() => handleIncrement(10)}
        />
      </div>

      {/* Quick presets */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handleIncrement(preset.amount)}
            style={{
              flex: 1,
              padding: '6px',
              backgroundColor: 'var(--color-bg-tertiary)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-secondary)',
              fontSize: '11px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          fontSize: '11px',
          color: 'var(--color-text-tertiary)',
        }}
      >
        <span>Current: {currentProgress}</span>
        <span>Target: {value}</span>
        <span>Remaining: {value - currentProgress}</span>
      </div>

      {/* Apply button */}
      <button
        onClick={handleSubmit}
        disabled={value === currentTarget}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '8px',
          backgroundColor: 'var(--color-accent)',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          color: 'white',
          fontSize: '12px',
          cursor: 'pointer',
          opacity: value === currentTarget ? 0.5 : 1,
        }}
      >
        <Check size={14} />
        Apply
      </button>
    </div>
  );
}
