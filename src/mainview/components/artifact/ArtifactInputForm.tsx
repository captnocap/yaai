// =============================================================================
// ARTIFACT INPUT FORM
// =============================================================================
// Dynamic form generator based on JSON Schema for artifact inputs.

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '../../lib';
import type { JSONSchemaType, SchemaDefinition } from '../../types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ArtifactInputFormProps {
  /** Schema definition for the input */
  schema: SchemaDefinition;

  /** Initial values */
  initialValues?: Record<string, unknown>;

  /** Called when form is submitted */
  onSubmit: (values: Record<string, unknown>) => void;

  /** Called when form is cancelled */
  onCancel?: () => void;

  /** Whether form is in loading state */
  loading?: boolean;

  /** Submit button text */
  submitLabel?: string;

  className?: string;
}

interface FieldProps {
  name: string;
  schema: JSONSchemaType;
  value: unknown;
  onChange: (value: unknown) => void;
  required?: boolean;
  disabled?: boolean;
}

// -----------------------------------------------------------------------------
// FIELD COMPONENTS
// -----------------------------------------------------------------------------

function StringField({ name, schema, value, onChange, required, disabled }: FieldProps) {
  const isTextArea = schema.format === 'textarea' || (schema.maxLength && schema.maxLength > 200);

  if (schema.enum) {
    return (
      <select
        id={name}
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
      >
        <option value="">Select...</option>
        {(schema.enum as string[]).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (isTextArea) {
    return (
      <textarea
        id={name}
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={schema.placeholder as string}
        disabled={disabled}
        required={required}
        rows={4}
        className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text)] text-sm resize-y min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
      />
    );
  }

  return (
    <input
      id={name}
      type={schema.format === 'password' ? 'password' : 'text'}
      value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={schema.placeholder as string}
      disabled={disabled}
      required={required}
      className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
    />
  );
}

function NumberField({ name, schema, value, onChange, required, disabled }: FieldProps) {
  return (
    <input
      id={name}
      type="number"
      value={(value as number) ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
      placeholder={schema.placeholder as string}
      min={schema.minimum as number}
      max={schema.maximum as number}
      step={schema.multipleOf as number ?? 'any'}
      disabled={disabled}
      required={required}
      className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
    />
  );
}

function BooleanField({ name, schema, value, onChange, disabled }: FieldProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        id={name}
        type="checkbox"
        checked={(value as boolean) ?? false}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
      />
      <span className="text-sm text-[var(--color-text)]">
        {schema.description || name}
      </span>
    </label>
  );
}

function ArrayField({ name, schema, value, onChange, disabled }: FieldProps) {
  const items = (value as unknown[]) ?? [];
  const itemSchema = schema.items || { type: 'string' };

  const addItem = () => {
    const defaultValue = itemSchema.type === 'string' ? '' :
                         itemSchema.type === 'number' ? 0 :
                         itemSchema.type === 'boolean' ? false : null;
    onChange([...items, defaultValue]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, newValue: unknown) => {
    const newItems = [...items];
    newItems[index] = newValue;
    onChange(newItems);
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="flex-1">
            <Field
              name={`${name}[${index}]`}
              schema={itemSchema}
              value={item}
              onChange={(v) => updateItem(index, v)}
              disabled={disabled}
            />
          </div>
          <button
            type="button"
            onClick={() => removeItem(index)}
            disabled={disabled}
            className="p-2 text-[var(--color-error)] hover:bg-[var(--color-error-subtle)] rounded-[var(--radius-md)] transition-colors"
          >
            x
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        disabled={disabled}
        className="text-sm text-[var(--color-accent)] hover:underline"
      >
        + Add item
      </button>
    </div>
  );
}

function ObjectField({ name, schema, value, onChange, disabled }: FieldProps) {
  const obj = (value as Record<string, unknown>) ?? {};
  const properties = schema.properties || {};
  const required = schema.required || [];

  const updateProperty = (key: string, newValue: unknown) => {
    onChange({ ...obj, [key]: newValue });
  };

  return (
    <div className="pl-4 border-l-2 border-[var(--color-border)] space-y-4">
      {Object.entries(properties).map(([key, propSchema]) => (
        <FieldWrapper
          key={key}
          name={key}
          schema={propSchema}
          value={obj[key]}
          onChange={(v) => updateProperty(key, v)}
          required={required.includes(key)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

// Generic field renderer
function Field(props: FieldProps) {
  const { schema } = props;

  switch (schema.type) {
    case 'string':
      return <StringField {...props} />;
    case 'number':
    case 'integer':
      return <NumberField {...props} />;
    case 'boolean':
      return <BooleanField {...props} />;
    case 'array':
      return <ArrayField {...props} />;
    case 'object':
      return <ObjectField {...props} />;
    default:
      return <StringField {...props} />;
  }
}

// Field with label wrapper
function FieldWrapper(props: FieldProps) {
  const { name, schema, required } = props;
  const isBooleanField = schema.type === 'boolean';

  return (
    <div className="space-y-1.5">
      {!isBooleanField && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-[var(--color-text)]"
        >
          {schema.title || formatLabel(name)}
          {required && <span className="text-[var(--color-error)] ml-1">*</span>}
        </label>
      )}
      <Field {...props} />
      {schema.description && !isBooleanField && (
        <p className="text-xs text-[var(--color-text-tertiary)]">
          {schema.description}
        </p>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export function ArtifactInputForm({
  schema,
  initialValues = {},
  onSubmit,
  onCancel,
  loading = false,
  submitLabel = 'Run',
  className,
}: ArtifactInputFormProps) {
  // Extract JSON schema from SchemaDefinition
  const jsonSchema = useMemo(() => {
    if ('type' in schema.schema) {
      return schema.schema as JSONSchemaType;
    }
    // If it's a Zod schema, we can't render it - show message
    return null;
  }, [schema]);

  // Form state
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    if (!jsonSchema?.properties) return initialValues;

    // Initialize with defaults
    const defaults: Record<string, unknown> = {};
    Object.entries(jsonSchema.properties).forEach(([key, propSchema]) => {
      if (propSchema.default !== undefined) {
        defaults[key] = propSchema.default;
      }
    });
    return { ...defaults, ...initialValues };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update field value
  const updateValue = useCallback((name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    // Clear error when field changes
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }, [errors]);

  // Validate form
  const validate = useCallback(() => {
    if (!jsonSchema?.properties) return true;

    const newErrors: Record<string, string> = {};
    const required = jsonSchema.required || [];

    Object.entries(jsonSchema.properties).forEach(([key, propSchema]) => {
      const value = values[key];
      const isRequired = required.includes(key);

      // Check required
      if (isRequired && (value === undefined || value === null || value === '')) {
        newErrors[key] = 'This field is required';
        return;
      }

      // Type-specific validation
      if (value !== undefined && value !== null && value !== '') {
        if (propSchema.type === 'number' || propSchema.type === 'integer') {
          const num = Number(value);
          if (isNaN(num)) {
            newErrors[key] = 'Must be a number';
          } else if (propSchema.minimum !== undefined && num < (propSchema.minimum as number)) {
            newErrors[key] = `Must be at least ${propSchema.minimum}`;
          } else if (propSchema.maximum !== undefined && num > (propSchema.maximum as number)) {
            newErrors[key] = `Must be at most ${propSchema.maximum}`;
          }
        }

        if (propSchema.type === 'string') {
          const str = String(value);
          if (propSchema.minLength !== undefined && str.length < (propSchema.minLength as number)) {
            newErrors[key] = `Must be at least ${propSchema.minLength} characters`;
          } else if (propSchema.maxLength !== undefined && str.length > (propSchema.maxLength as number)) {
            newErrors[key] = `Must be at most ${propSchema.maxLength} characters`;
          } else if (propSchema.pattern) {
            const regex = new RegExp(propSchema.pattern as string);
            if (!regex.test(str)) {
              newErrors[key] = 'Invalid format';
            }
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [jsonSchema, values]);

  // Handle submit
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(values);
    }
  }, [validate, values, onSubmit]);

  // Can't render Zod schemas
  if (!jsonSchema) {
    return (
      <div className={cn('p-4 text-center text-[var(--color-text-tertiary)]', className)}>
        <p className="text-sm">This artifact uses a Zod schema which cannot be rendered as a form.</p>
        <p className="text-xs mt-2">Run with default/empty input instead.</p>
        <div className="flex justify-center gap-2 mt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-tertiary)]"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={() => onSubmit({})}
            disabled={loading}
            className="px-4 py-2 text-sm bg-[var(--color-accent)] text-white rounded-[var(--radius-md)] hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Running...' : submitLabel}
          </button>
        </div>
      </div>
    );
  }

  const properties = jsonSchema.properties || {};
  const required = jsonSchema.required || [];

  // No inputs needed
  if (Object.keys(properties).length === 0) {
    return (
      <div className={cn('p-4', className)}>
        <p className="text-sm text-[var(--color-text-tertiary)] mb-4">
          {schema.description || 'This artifact requires no input.'}
        </p>
        <div className="flex justify-end gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-tertiary)]"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={() => onSubmit({})}
            disabled={loading}
            className="px-4 py-2 text-sm bg-[var(--color-accent)] text-white rounded-[var(--radius-md)] hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Running...' : submitLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      {/* Schema description */}
      {schema.description && (
        <p className="text-sm text-[var(--color-text-secondary)] pb-2 border-b border-[var(--color-border)]">
          {schema.description}
        </p>
      )}

      {/* Fields */}
      {Object.entries(properties).map(([key, propSchema]) => (
        <div key={key}>
          <FieldWrapper
            name={key}
            schema={propSchema}
            value={values[key]}
            onChange={(v) => updateValue(key, v)}
            required={required.includes(key)}
            disabled={loading}
          />
          {errors[key] && (
            <p className="text-xs text-[var(--color-error)] mt-1">
              {errors[key]}
            </p>
          )}
        </div>
      ))}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm bg-[var(--color-accent)] text-white rounded-[var(--radius-md)] hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Running...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function formatLabel(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}
