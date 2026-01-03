# SPEC_DEFAULT_MODELS.md

> **Purpose:** Define the centralized settings page for configuring default AI models across all YAAI subsystems.
> **Status:** Draft
> **Related:** `SPEC_AI_PROVIDER.md`, `spec-deepresearch/SPEC.md`, `spec-summary/visual-experience-layer-spec.md`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Schema Design](#2-schema-design)
3. [TypeScript Interfaces](#3-typescript-interfaces)
4. [Default Values](#4-default-values)
5. [Validation Rules](#5-validation-rules)
6. [Settings Store Integration](#6-settings-store-integration)
7. [Frontend UI Specification](#7-frontend-ui-specification)
8. [Component Specifications](#8-component-specifications)
9. [Frontend Hook](#9-frontend-hook)
10. [Subsystem Integration](#10-subsystem-integration)
11. [Migration Strategy](#11-migration-strategy)

---

## 1. Overview

### 1.1 Purpose

The Default Models Settings Page provides a unified interface for configuring which AI models are used across different parts of YAAI:

- **Chat** - Primary conversation model and vision proxy
- **Background Tasks** - Auto-titles, summaries, TTS scripts
- **Deep Research** - Orchestrator, runners (scouts), and readers
- **Image Generation** - Default image generation model

### 1.2 Design Philosophy

1. **Single Source of Truth** - All model defaults configured in one place
2. **Provider + Model Pairing** - Each setting specifies both provider and model ID
3. **Flexible Research Configuration** - Configurable runner count with uniform or per-slot assignment
4. **Graceful Fallback** - Invalid configurations fall back to system defaults
5. **Capability Validation** - Settings validate models have required capabilities (e.g., vision)

---

## 2. Schema Design

### 2.1 Settings Path

Default models settings live under `defaultModels` in the main `AppSettings` object:

```
AppSettings
└── defaultModels
    ├── textModel
    ├── visionProxy
    ├── shadowModel
    ├── research
    │   ├── orchestrator
    │   ├── runners
    │   └── reader
    └── imageGen
```

### 2.2 Model Reference Structure

Each model reference includes provider and model ID:

```typescript
interface ModelReference {
  provider: ProviderType
  modelId: string
}
```

This allows cross-provider model selection while maintaining type safety.

---

## 3. TypeScript Interfaces

### 3.1 Core Types

```typescript
// lib/types/default-models.ts

import type { ProviderType } from './ai-provider'

/**
 * Reference to a specific model (provider + model ID)
 */
export interface ModelReference {
  provider: ProviderType
  modelId: string
}

/**
 * Runner model assignment mode
 */
export type RunnerMode = 'uniform' | 'individual'

/**
 * Research runner configuration
 */
export interface RunnerConfig {
  /** Number of parallel runners (1-10) */
  count: number

  /** Assignment mode: same model for all or individual per slot */
  mode: RunnerMode

  /** Model used when mode is 'uniform' */
  uniformModel?: ModelReference

  /** Per-slot models when mode is 'individual' */
  individualModels?: ModelReference[]
}

/**
 * Research system model configuration
 */
export interface ResearchModelsConfig {
  /** Orchestrator coordinates research sessions */
  orchestrator: ModelReference

  /** Runners (scouts) search for sources */
  runners: RunnerConfig

  /** Reader extracts content from sources */
  reader: ModelReference
}

/**
 * Vision proxy configuration
 */
export interface VisionProxyConfig {
  /** Enable vision proxy for non-vision models */
  enabled: boolean

  /** Vision-capable model to use */
  provider: ProviderType
  modelId: string
}

/**
 * Image generation model configuration
 */
export interface ImageGenModelConfig {
  /** Default image generation model ID */
  modelId: string
}

/**
 * Complete default models settings
 */
export interface DefaultModelsSettings {
  /** Primary chat model for new conversations */
  textModel: ModelReference

  /** Vision proxy for non-vision models */
  visionProxy: VisionProxyConfig

  /** Background tasks (titles, summaries, TTS) */
  shadowModel: ModelReference

  /** Research system models */
  research: ResearchModelsConfig

  /** Image generation model */
  imageGen: ImageGenModelConfig
}
```

### 3.2 Branded Types

```typescript
// For type-safe model IDs when needed
export type ModelId = string & { readonly __brand: 'ModelId' }

export function asModelId(id: string): ModelId {
  return id as ModelId
}
```

---

## 4. Default Values

### 4.1 System Defaults

```typescript
// lib/constants/default-models.ts

import type { DefaultModelsSettings } from '../types/default-models'

export const DEFAULT_MODELS: DefaultModelsSettings = {
  textModel: {
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-20250514'
  },

  visionProxy: {
    enabled: true,
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-20250514'
  },

  shadowModel: {
    provider: 'anthropic',
    modelId: 'claude-3-5-haiku-20241022'
  },

  research: {
    orchestrator: {
      provider: 'anthropic',
      modelId: 'claude-sonnet-4-20250514'
    },
    runners: {
      count: 3,
      mode: 'uniform',
      uniformModel: {
        provider: 'anthropic',
        modelId: 'claude-3-5-haiku-20241022'
      },
      individualModels: []
    },
    reader: {
      provider: 'anthropic',
      modelId: 'claude-sonnet-4-20250514'
    }
  },

  imageGen: {
    modelId: 'seedream-v4'
  }
}
```

### 4.2 Defaults Table

| Setting | Default Provider | Default Model | Rationale |
|---------|------------------|---------------|-----------|
| Text Model | anthropic | claude-sonnet-4-20250514 | Best balance of quality and speed |
| Vision Proxy | anthropic | claude-sonnet-4-20250514 | Strong vision capabilities |
| Shadow Model | anthropic | claude-3-5-haiku-20241022 | Fast, cost-effective for background tasks |
| Research Orchestrator | anthropic | claude-sonnet-4-20250514 | Needs strong reasoning |
| Research Runners | anthropic | claude-3-5-haiku-20241022 | Fast parallel search |
| Research Reader | anthropic | claude-sonnet-4-20250514 | Detailed content extraction |
| Image Gen | - | seedream-v4 | High quality generation |

---

## 5. Validation Rules

### 5.1 Validation Interface

```typescript
// lib/validation/default-models.ts

import type { DefaultModelsSettings, ModelReference } from '../types/default-models'
import type { Result } from '../types/result'

export interface ValidationError {
  path: string
  code: 'INVALID_PROVIDER' | 'INVALID_MODEL' | 'MISSING_CAPABILITY' | 'INVALID_COUNT' | 'ARRAY_LENGTH_MISMATCH'
  message: string
}

export function validateDefaultModels(
  settings: DefaultModelsSettings,
  availableModels: Map<string, ModelConfig[]>
): Result<void, ValidationError[]>
```

### 5.2 Validation Rules

```typescript
export function validateDefaultModels(
  settings: DefaultModelsSettings,
  availableModels: Map<string, ModelConfig[]>
): Result<void, ValidationError[]> {
  const errors: ValidationError[] = []

  // 1. Validate text model exists
  if (!modelExists(settings.textModel, availableModels)) {
    errors.push({
      path: 'textModel',
      code: 'INVALID_MODEL',
      message: `Model ${settings.textModel.modelId} not found for provider ${settings.textModel.provider}`
    })
  }

  // 2. Validate vision proxy has vision capability
  if (settings.visionProxy.enabled) {
    const model = getModel(settings.visionProxy, availableModels)
    if (model && !model.supportsVision) {
      errors.push({
        path: 'visionProxy',
        code: 'MISSING_CAPABILITY',
        message: `Model ${settings.visionProxy.modelId} does not support vision`
      })
    }
  }

  // 3. Validate shadow model exists
  if (!modelExists(settings.shadowModel, availableModels)) {
    errors.push({
      path: 'shadowModel',
      code: 'INVALID_MODEL',
      message: `Model ${settings.shadowModel.modelId} not found`
    })
  }

  // 4. Validate research models
  if (!modelExists(settings.research.orchestrator, availableModels)) {
    errors.push({
      path: 'research.orchestrator',
      code: 'INVALID_MODEL',
      message: `Orchestrator model not found`
    })
  }

  if (!modelExists(settings.research.reader, availableModels)) {
    errors.push({
      path: 'research.reader',
      code: 'INVALID_MODEL',
      message: `Reader model not found`
    })
  }

  // 5. Validate runner configuration
  const { runners } = settings.research

  if (runners.count < 1 || runners.count > 10) {
    errors.push({
      path: 'research.runners.count',
      code: 'INVALID_COUNT',
      message: `Runner count must be between 1 and 10`
    })
  }

  if (runners.mode === 'uniform' && runners.uniformModel) {
    if (!modelExists(runners.uniformModel, availableModels)) {
      errors.push({
        path: 'research.runners.uniformModel',
        code: 'INVALID_MODEL',
        message: `Uniform runner model not found`
      })
    }
  }

  if (runners.mode === 'individual') {
    if (!runners.individualModels || runners.individualModels.length !== runners.count) {
      errors.push({
        path: 'research.runners.individualModels',
        code: 'ARRAY_LENGTH_MISMATCH',
        message: `Individual models array length (${runners.individualModels?.length ?? 0}) must match runner count (${runners.count})`
      })
    } else {
      runners.individualModels.forEach((model, index) => {
        if (!modelExists(model, availableModels)) {
          errors.push({
            path: `research.runners.individualModels[${index}]`,
            code: 'INVALID_MODEL',
            message: `Runner ${index + 1} model not found`
          })
        }
      })
    }
  }

  return errors.length > 0 ? err(errors) : ok(undefined)
}

function modelExists(ref: ModelReference, available: Map<string, ModelConfig[]>): boolean {
  const providerModels = available.get(ref.provider)
  return providerModels?.some(m => m.id === ref.modelId) ?? false
}

function getModel(ref: ModelReference, available: Map<string, ModelConfig[]>): ModelConfig | undefined {
  const providerModels = available.get(ref.provider)
  return providerModels?.find(m => m.id === ref.modelId)
}
```

---

## 6. Settings Store Integration

### 6.1 AppSettings Extension

Add to the existing `AppSettings` interface:

```typescript
// In settings-store.ts

interface AppSettings {
  // ... existing fields ...

  /** Default model configuration for all subsystems */
  defaultModels: DefaultModelsSettings
}
```

### 6.2 Deep Merge Behavior

The settings store's deep merge ensures partial updates work correctly:

```typescript
// Update just the runner count
settingsStore.update({
  defaultModels: {
    research: {
      runners: {
        count: 5
      }
    }
  }
})
// Other defaultModels fields are preserved
```

### 6.3 Accessor Methods

```typescript
// lib/stores/settings-store.ts

class SettingsStore {
  // ... existing methods ...

  /**
   * Get resolved model for text chat
   * Falls back to system default if invalid
   */
  getDefaultTextModel(): ModelReference {
    const configured = this.get('defaultModels.textModel')
    return this.validateOrFallback(configured, DEFAULT_MODELS.textModel)
  }

  /**
   * Get vision proxy configuration
   */
  getVisionProxy(): VisionProxyConfig {
    return this.get('defaultModels.visionProxy') ?? DEFAULT_MODELS.visionProxy
  }

  /**
   * Get shadow model for background tasks
   */
  getShadowModel(): ModelReference {
    const configured = this.get('defaultModels.shadowModel')
    return this.validateOrFallback(configured, DEFAULT_MODELS.shadowModel)
  }

  /**
   * Get research system model configuration
   */
  getResearchModels(): ResearchModelsConfig {
    return this.get('defaultModels.research') ?? DEFAULT_MODELS.research
  }

  /**
   * Get runner models as an array (resolves uniform vs individual)
   */
  getRunnerModels(): ModelReference[] {
    const config = this.getResearchModels().runners

    if (config.mode === 'uniform' && config.uniformModel) {
      return Array(config.count).fill(config.uniformModel)
    }

    if (config.mode === 'individual' && config.individualModels) {
      return config.individualModels.slice(0, config.count)
    }

    // Fallback
    return Array(config.count).fill(DEFAULT_MODELS.research.runners.uniformModel)
  }

  private validateOrFallback(
    configured: ModelReference | undefined,
    fallback: ModelReference
  ): ModelReference {
    if (!configured) return fallback

    // Check if model still exists
    const exists = this.aiProvider.hasModel(configured.provider, configured.modelId)
    return exists ? configured : fallback
  }
}
```

---

## 7. Frontend UI Specification

### 7.1 Page Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Default Models                                                              │
│  Configure which AI models are used across the application                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─ Chat ─────────────────────────────────────────────────────────────────┐ │
│  │                                                                         │ │
│  │  Default Text Model                                                     │ │
│  │  Primary model for new conversations when no preference is set          │ │
│  │  ┌────────────────────┐  ┌────────────────────────────────────────┐    │ │
│  │  │ Anthropic        ▼ │  │ claude-sonnet-4-20250514             ▼ │    │ │
│  │  └────────────────────┘  └────────────────────────────────────────┘    │ │
│  │                                                                         │ │
│  │  ───────────────────────────────────────────────────────────────────   │ │
│  │                                                                         │ │
│  │  Vision Proxy Model                                    [✓] Enabled      │ │
│  │  Describes images when the active model lacks vision capability         │ │
│  │  ┌────────────────────┐  ┌────────────────────────────────────────┐    │ │
│  │  │ Anthropic        ▼ │  │ claude-sonnet-4-20250514             ▼ │    │ │
│  │  └────────────────────┘  └────────────────────────────────────────┘    │ │
│  │  ⓘ Only models with vision capability are shown                         │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─ Background Tasks ─────────────────────────────────────────────────────┐ │
│  │                                                                         │ │
│  │  Shadow/Summary Model                                                   │ │
│  │  Used for auto-generated titles, conversation summaries, TTS scripts    │ │
│  │  ┌────────────────────┐  ┌────────────────────────────────────────┐    │ │
│  │  │ Anthropic        ▼ │  │ claude-3-5-haiku-20241022            ▼ │    │ │
│  │  └────────────────────┘  └────────────────────────────────────────┘    │ │
│  │  ⓘ Faster models recommended for cost efficiency                        │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─ Deep Research ────────────────────────────────────────────────────────┐ │
│  │                                                                         │ │
│  │  Research Orchestrator                                                  │ │
│  │  Coordinates research sessions and synthesizes findings                 │ │
│  │  ┌────────────────────┐  ┌────────────────────────────────────────┐    │ │
│  │  │ Anthropic        ▼ │  │ claude-sonnet-4-20250514             ▼ │    │ │
│  │  └────────────────────┘  └────────────────────────────────────────┘    │ │
│  │                                                                         │ │
│  │  ───────────────────────────────────────────────────────────────────   │ │
│  │                                                                         │ │
│  │  Research Runners (Scouts)                                              │ │
│  │  Parallel agents that search for relevant sources                       │ │
│  │                                                                         │ │
│  │  Number of runners:  [  3  ]  [−] [+]                                   │ │
│  │                                                                         │ │
│  │  Model assignment:                                                      │ │
│  │  (●) Same model for all runners                                         │ │
│  │      ┌────────────────────┐  ┌────────────────────────────────────┐    │ │
│  │      │ Anthropic        ▼ │  │ claude-3-5-haiku-20241022        ▼ │    │ │
│  │      └────────────────────┘  └────────────────────────────────────┘    │ │
│  │                                                                         │ │
│  │  ( ) Individual model per runner                                        │ │
│  │      ┌─────────────────────────────────────────────────────────────┐   │ │
│  │      │ Runner 1: [Anthropic ▼] [claude-3-5-haiku-20241022      ▼] │   │ │
│  │      │ Runner 2: [Anthropic ▼] [claude-3-5-haiku-20241022      ▼] │   │ │
│  │      │ Runner 3: [OpenAI    ▼] [gpt-4o-mini                    ▼] │   │ │
│  │      └─────────────────────────────────────────────────────────────┘   │ │
│  │                                                                         │ │
│  │  ───────────────────────────────────────────────────────────────────   │ │
│  │                                                                         │ │
│  │  Research Reader                                                        │ │
│  │  Extracts and analyzes content from discovered sources                  │ │
│  │  ┌────────────────────┐  ┌────────────────────────────────────────┐    │ │
│  │  │ Anthropic        ▼ │  │ claude-sonnet-4-20250514             ▼ │    │ │
│  │  └────────────────────┘  └────────────────────────────────────────┘    │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─ Image Generation ─────────────────────────────────────────────────────┐ │
│  │                                                                         │ │
│  │  Default Image Model                                                    │ │
│  │  Model used for generating images                                       │ │
│  │  ┌────────────────────────────────────────────────────────────────┐    │ │
│  │  │ seedream-v4                                                  ▼ │    │ │
│  │  └────────────────────────────────────────────────────────────────┘    │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│                                            [Reset to Defaults]               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Visual Design Specs

```
TYPOGRAPHY
├─ Page title:           24px, font-weight: 600, #F9FAFB
├─ Page description:     14px, #9CA3AF
├─ Section title:        16px, font-weight: 500, #F9FAFB
├─ Field label:          14px, font-weight: 500, #F9FAFB
├─ Field description:    13px, #6B7280
├─ Info text:            12px, #6B7280, italic
└─ Runner labels:        13px, #9CA3AF

SPACING
├─ Page padding:         24px
├─ Section gap:          16px
├─ Field gap:            12px
├─ Dropdown gap:         8px (between provider and model)
└─ Runner list gap:      8px

COMPONENTS
├─ Section container:    bg: #1A1A1F, border: 1px solid #2E2E35, radius: 8px, padding: 16px
├─ Divider:              border-top: 1px solid #2E2E35, margin: 16px 0
├─ Toggle:               Standard toggle component
├─ Dropdown:             Standard dropdown, min-width: 160px (provider), 280px (model)
├─ Number input:         width: 64px, centered text
├─ Radio group:          Standard radio with label
└─ Reset button:         Ghost style, text: #9CA3AF, hover: #F9FAFB

STATES
├─ Disabled (vision proxy off): opacity: 0.5, pointer-events: none
├─ Error:                       border-color: #EF4444
├─ Individual runners hidden:   height: 0, overflow: hidden, transition: 200ms
└─ Individual runners visible:  height: auto
```

### 7.3 Interactions

**Model Dropdowns:**
- Provider dropdown shows only enabled providers
- Model dropdown shows models for selected provider
- Vision proxy model dropdown filters to `supportsVision: true` only
- Changing provider resets model to first available

**Runner Count:**
- `[−]` decrements (min: 1)
- `[+]` increments (max: 10)
- When mode is 'individual', count change adjusts array length
- Removing a runner removes from end
- Adding a runner duplicates last runner's config

**Mode Toggle:**
- Switching to 'uniform' hides individual list
- Switching to 'individual' shows list, populates with uniform model if empty

**Reset to Defaults:**
- Confirmation dialog: "Reset all default models to system defaults?"
- On confirm, resets entire `defaultModels` section

---

## 8. Component Specifications

### 8.1 DefaultModelsPage

```typescript
// components/settings/DefaultModelsPage.tsx

interface DefaultModelsPageProps {
  // No props - uses useDefaultModels hook
}

export function DefaultModelsPage(): JSX.Element {
  const {
    settings,
    updateTextModel,
    updateVisionProxy,
    updateShadowModel,
    updateResearchOrchestrator,
    updateRunnerConfig,
    updateResearchReader,
    updateImageGenModel,
    resetToDefaults,
    isLoading,
    error
  } = useDefaultModels()

  const { models: availableModels } = useAI()

  // ... render sections
}
```

### 8.2 ModelSelector

Reusable provider + model dropdown combo:

```typescript
// components/settings/ModelSelector.tsx

interface ModelSelectorProps {
  /** Current selection */
  value: ModelReference

  /** Called when selection changes */
  onChange: (value: ModelReference) => void

  /** Filter models by capability */
  filter?: (model: ModelConfig) => boolean

  /** Whether the selector is disabled */
  disabled?: boolean

  /** Optional label */
  label?: string

  /** Optional description */
  description?: string
}

export function ModelSelector({
  value,
  onChange,
  filter,
  disabled,
  label,
  description
}: ModelSelectorProps): JSX.Element {
  const { providers, getModels } = useAI()

  const enabledProviders = providers.filter(p => p.enabled)
  const models = getModels(value.provider).filter(filter ?? (() => true))

  const handleProviderChange = (provider: ProviderType) => {
    const newModels = getModels(provider).filter(filter ?? (() => true))
    onChange({
      provider,
      modelId: newModels[0]?.id ?? ''
    })
  }

  const handleModelChange = (modelId: string) => {
    onChange({ ...value, modelId })
  }

  return (
    <div className="model-selector">
      {label && <label>{label}</label>}
      {description && <p className="description">{description}</p>}
      <div className="dropdowns">
        <Select
          value={value.provider}
          onChange={handleProviderChange}
          options={enabledProviders.map(p => ({ value: p.type, label: p.name }))}
          disabled={disabled}
        />
        <Select
          value={value.modelId}
          onChange={handleModelChange}
          options={models.map(m => ({ value: m.id, label: m.name }))}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
```

### 8.3 RunnerConfigPanel

```typescript
// components/settings/RunnerConfigPanel.tsx

interface RunnerConfigPanelProps {
  config: RunnerConfig
  onChange: (config: RunnerConfig) => void
}

export function RunnerConfigPanel({ config, onChange }: RunnerConfigPanelProps): JSX.Element {
  const handleCountChange = (delta: number) => {
    const newCount = Math.max(1, Math.min(10, config.count + delta))

    // Adjust individual models array if needed
    let newIndividualModels = config.individualModels ?? []
    if (config.mode === 'individual') {
      if (newCount > newIndividualModels.length) {
        // Add slots (copy last or use default)
        const template = newIndividualModels[newIndividualModels.length - 1] ?? DEFAULT_MODELS.research.runners.uniformModel
        while (newIndividualModels.length < newCount) {
          newIndividualModels = [...newIndividualModels, { ...template }]
        }
      } else {
        // Remove from end
        newIndividualModels = newIndividualModels.slice(0, newCount)
      }
    }

    onChange({
      ...config,
      count: newCount,
      individualModels: newIndividualModels
    })
  }

  const handleModeChange = (mode: RunnerMode) => {
    if (mode === 'individual' && (!config.individualModels || config.individualModels.length === 0)) {
      // Initialize individual models from uniform
      const template = config.uniformModel ?? DEFAULT_MODELS.research.runners.uniformModel
      onChange({
        ...config,
        mode,
        individualModels: Array(config.count).fill(null).map(() => ({ ...template }))
      })
    } else {
      onChange({ ...config, mode })
    }
  }

  // ... render UI
}
```

### 8.4 SettingsSection

```typescript
// components/settings/SettingsSection.tsx

interface SettingsSectionProps {
  title: string
  children: React.ReactNode
}

export function SettingsSection({ title, children }: SettingsSectionProps): JSX.Element {
  return (
    <section className="settings-section">
      <h3 className="section-title">{title}</h3>
      <div className="section-content">
        {children}
      </div>
    </section>
  )
}
```

---

## 9. Frontend Hook

### 9.1 useDefaultModels Hook

```typescript
// hooks/useDefaultModels.ts

import { useSettings } from './useSettings'
import { useAI } from './useAI'
import { DEFAULT_MODELS } from '../constants/default-models'
import type {
  DefaultModelsSettings,
  ModelReference,
  VisionProxyConfig,
  RunnerConfig
} from '../types/default-models'

interface UseDefaultModelsReturn {
  /** Current settings (with defaults applied) */
  settings: DefaultModelsSettings

  /** Loading state */
  isLoading: boolean

  /** Error state */
  error: Error | null

  /** Update text model */
  updateTextModel: (model: ModelReference) => Promise<void>

  /** Update vision proxy */
  updateVisionProxy: (config: Partial<VisionProxyConfig>) => Promise<void>

  /** Update shadow model */
  updateShadowModel: (model: ModelReference) => Promise<void>

  /** Update research orchestrator */
  updateResearchOrchestrator: (model: ModelReference) => Promise<void>

  /** Update runner configuration */
  updateRunnerConfig: (config: Partial<RunnerConfig>) => Promise<void>

  /** Update research reader */
  updateResearchReader: (model: ModelReference) => Promise<void>

  /** Update image generation model */
  updateImageGenModel: (modelId: string) => Promise<void>

  /** Reset all to defaults */
  resetToDefaults: () => Promise<void>

  /** Validate current settings */
  validate: () => ValidationError[]
}

export function useDefaultModels(): UseDefaultModelsReturn {
  const { settings, updateSettings, isLoading, error } = useSettings()
  const { providers, getModels } = useAI()

  // Merge with defaults
  const mergedSettings: DefaultModelsSettings = {
    ...DEFAULT_MODELS,
    ...settings?.defaultModels,
    research: {
      ...DEFAULT_MODELS.research,
      ...settings?.defaultModels?.research,
      runners: {
        ...DEFAULT_MODELS.research.runners,
        ...settings?.defaultModels?.research?.runners
      }
    }
  }

  const updateTextModel = async (model: ModelReference) => {
    await updateSettings({
      defaultModels: {
        textModel: model
      }
    })
  }

  const updateVisionProxy = async (config: Partial<VisionProxyConfig>) => {
    await updateSettings({
      defaultModels: {
        visionProxy: {
          ...mergedSettings.visionProxy,
          ...config
        }
      }
    })
  }

  const updateShadowModel = async (model: ModelReference) => {
    await updateSettings({
      defaultModels: {
        shadowModel: model
      }
    })
  }

  const updateResearchOrchestrator = async (model: ModelReference) => {
    await updateSettings({
      defaultModels: {
        research: {
          orchestrator: model
        }
      }
    })
  }

  const updateRunnerConfig = async (config: Partial<RunnerConfig>) => {
    await updateSettings({
      defaultModels: {
        research: {
          runners: {
            ...mergedSettings.research.runners,
            ...config
          }
        }
      }
    })
  }

  const updateResearchReader = async (model: ModelReference) => {
    await updateSettings({
      defaultModels: {
        research: {
          reader: model
        }
      }
    })
  }

  const updateImageGenModel = async (modelId: string) => {
    await updateSettings({
      defaultModels: {
        imageGen: { modelId }
      }
    })
  }

  const resetToDefaults = async () => {
    await updateSettings({
      defaultModels: DEFAULT_MODELS
    })
  }

  const validate = (): ValidationError[] => {
    const availableModels = new Map(
      providers.map(p => [p.type, getModels(p.type)])
    )
    const result = validateDefaultModels(mergedSettings, availableModels)
    return result.ok ? [] : result.error
  }

  return {
    settings: mergedSettings,
    isLoading,
    error,
    updateTextModel,
    updateVisionProxy,
    updateShadowModel,
    updateResearchOrchestrator,
    updateRunnerConfig,
    updateResearchReader,
    updateImageGenModel,
    resetToDefaults,
    validate
  }
}
```

---

## 10. Subsystem Integration

### 10.1 AI Provider Integration

The AI Provider should consult default models when no explicit model is specified:

```typescript
// In AIProvider or chat handling

function resolveModel(requestedModel?: ModelReference): ModelReference {
  if (requestedModel) {
    return requestedModel
  }

  // Fall back to default text model
  return settingsStore.getDefaultTextModel()
}
```

### 10.2 Vision Proxy Integration

When a non-vision model encounters an image:

```typescript
// In message processing

async function processImageContent(
  image: ImageContent,
  activeModel: ModelReference
): Promise<ContentBlock> {
  const modelConfig = aiProvider.getModel(activeModel.provider, activeModel.modelId)

  if (modelConfig.supportsVision) {
    // Model can handle images directly
    return { type: 'image', ...image }
  }

  // Check if vision proxy is enabled
  const visionProxy = settingsStore.getVisionProxy()
  if (!visionProxy.enabled) {
    return { type: 'text', text: '[Image: Vision not available for this model]' }
  }

  // Use vision proxy to describe the image
  const description = await describeImageWithProxy(image, visionProxy)
  return { type: 'text', text: `[Image description: ${description}]` }
}
```

### 10.3 Research System Integration

The research system reads runner and reader models from settings:

```typescript
// In research orchestrator

async function initializeResearchSession(): Promise<ResearchSession> {
  const config = settingsStore.getResearchModels()

  // Initialize orchestrator
  const orchestrator = await createAgent(config.orchestrator)

  // Initialize runners
  const runnerModels = settingsStore.getRunnerModels()
  const runners = await Promise.all(
    runnerModels.map(model => createAgent(model))
  )

  // Initialize reader
  const reader = await createAgent(config.reader)

  return { orchestrator, runners, reader }
}
```

### 10.4 Shadow Model Integration

Background tasks use the shadow model:

```typescript
// In title generator

async function generateChatTitle(messages: Message[]): Promise<string> {
  const shadowModel = settingsStore.getShadowModel()

  const response = await aiProvider.chat({
    provider: shadowModel.provider,
    model: shadowModel.modelId,
    messages: [
      { role: 'system', content: 'Generate a brief title...' },
      { role: 'user', content: summarizeMessages(messages) }
    ],
    maxTokens: 50
  })

  return response.content
}
```

---

## 11. Migration Strategy

### 11.1 Backward Compatibility

Existing settings without `defaultModels` should continue working:

```typescript
// In settings store initialization

function initializeSettings(stored: Partial<AppSettings>): AppSettings {
  return {
    ...DEFAULT_APP_SETTINGS,
    ...stored,
    defaultModels: {
      ...DEFAULT_MODELS,
      ...stored.defaultModels,
      // Handle legacy chat.defaultModel
      textModel: stored.defaultModels?.textModel ?? {
        provider: 'anthropic',
        modelId: stored.chat?.defaultModel ?? DEFAULT_MODELS.textModel.modelId
      }
    }
  }
}
```

### 11.2 Legacy Setting Migration

If `chat.defaultModel` exists, migrate it:

```typescript
// Migration function

function migrateDefaultModels(settings: AppSettings): AppSettings {
  if (settings.chat?.defaultModel && !settings.defaultModels?.textModel) {
    // Infer provider from model ID
    const provider = inferProviderFromModelId(settings.chat.defaultModel)

    return {
      ...settings,
      defaultModels: {
        ...DEFAULT_MODELS,
        textModel: {
          provider,
          modelId: settings.chat.defaultModel
        }
      }
    }
  }

  return settings
}

function inferProviderFromModelId(modelId: string): ProviderType {
  if (modelId.startsWith('claude')) return 'anthropic'
  if (modelId.startsWith('gpt') || modelId.startsWith('o1')) return 'openai'
  if (modelId.startsWith('gemini')) return 'google'
  return 'anthropic' // Default fallback
}
```

---

*End of Default Models specification.*
