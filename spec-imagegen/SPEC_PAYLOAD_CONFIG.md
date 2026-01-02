# Payload Constraints Configuration — Specification Addendum

> Addendum to SPEC.md and SPEC_COMPRESSION.md  
> Makes all payload limits user-configurable

---

## 1. Configurable Constraints

All payload limits are user-adjustable via Settings. The app ships with conservative defaults matching current API limits, but users can modify instantly if provider changes.

### 1.1 Data Model

```typescript
interface PayloadConstraints {
  // Core limits
  maxPayloadBytes: number            // Total request size (default: 4 MB)
  maxReferenceImages: number         // Max images per request (default: 10)
  
  // Budget allocation
  promptReserveBytes: number         // Reserved for prompt text (default: 50 KB)
  metadataReserveBytes: number       // Reserved for JSON structure (default: 20 KB)
  safetyMarginPercent: number        // Buffer percentage (default: 10)
  
  // Per-image limits
  minPerImageBytes: number           // Floor per image (default: 100 KB)
  maxPerImageBytes: number           // Ceiling per image (default: 800 KB)
  
  // Computed (read-only, derived from above)
  readonly effectiveImageBudget: number
}

// Default configuration
const DEFAULT_PAYLOAD_CONSTRAINTS: PayloadConstraints = {
  maxPayloadBytes: 4 * 1024 * 1024,           // 4 MB
  maxReferenceImages: 10,
  promptReserveBytes: 50 * 1024,              // 50 KB
  metadataReserveBytes: 20 * 1024,            // 20 KB
  safetyMarginPercent: 10,
  minPerImageBytes: 100 * 1024,               // 100 KB
  maxPerImageBytes: 800 * 1024,               // 800 KB
  
  get effectiveImageBudget() {
    const reserved = this.promptReserveBytes + this.metadataReserveBytes
    const available = this.maxPayloadBytes - reserved
    return Math.floor(available * (1 - this.safetyMarginPercent / 100))
  }
}
```

### 1.2 Compression Settings (Expanded)

```typescript
interface CompressionSettings {
  // Dimension limits
  maxDimension: number               // Default: 1440
  emergencyDimensionFactor: number   // Default: 0.8 (reduce by 20% if needed)
  
  // Quality limits
  initialQuality: number             // Default: 87
  minQuality: number                 // Default: 50
  qualityStep: number                // Default: 10
  maxAttempts: number                // Default: 5
  
  // Behavior
  autoCompress: boolean              // Default: true
  warnOnHeavyCompression: boolean    // Default: true
  heavyCompressionThreshold: number  // Quality below this triggers warning (default: 60)
  showCompressionDetails: boolean    // Default: true
}

const DEFAULT_COMPRESSION_SETTINGS: CompressionSettings = {
  maxDimension: 1440,
  emergencyDimensionFactor: 0.8,
  initialQuality: 87,
  minQuality: 50,
  qualityStep: 10,
  maxAttempts: 5,
  autoCompress: true,
  warnOnHeavyCompression: true,
  heavyCompressionThreshold: 60,
  showCompressionDetails: true
}
```

---

## 2. Settings UI

### 2.1 Payload Constraints Panel

```
┌─ Payload Constraints ───────────────────────────────────────────────────────────┐
│                                                                                 │
│ These limits match your API provider's requirements.                            │
│ Adjust if your provider changes limits or you switch providers.                 │
│                                                                                 │
│ ┌─ Core Limits ──────────────────────────────────────────────────────────────┐  │
│ │                                                                            │  │
│ │ Maximum Payload Size        [4    ] MB    (total request size)             │  │
│ │ Maximum Reference Images    [10   ]       (per request)                    │  │
│ │                                                                            │  │
│ └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│ ┌─ Budget Allocation ────────────────────────────────────────────────────────┐  │
│ │                                                                            │  │
│ │ Prompt Reserve              [50   ] KB    (space for prompt text)          │  │
│ │ Metadata Reserve            [20   ] KB    (JSON overhead)                  │  │
│ │ Safety Margin               [10   ] %     (buffer for estimation errors)   │  │
│ │                                                                            │  │
│ │ ─────────────────────────────────────────────────────────────────────────  │  │
│ │ Effective Image Budget:     3.5 MB        (calculated)                     │  │
│ │                                                                            │  │
│ └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│ ┌─ Per-Image Limits ─────────────────────────────────────────────────────────┐  │
│ │                                                                            │  │
│ │ Minimum Per Image           [100  ] KB    (quality floor)                  │  │
│ │ Maximum Per Image           [800  ] KB    (single image cap)               │  │
│ │                                                                            │  │
│ │ Budget with 1 image:   800 KB                                              │  │
│ │ Budget with 5 images:  700 KB each                                         │  │
│ │ Budget with 10 images: 350 KB each                                         │  │
│ │                                                                            │  │
│ └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│ Presets: [Current API (4MB/10img) ▼]                                           │
│          • Current API: 4 MB, 10 images                                         │
│          • Conservative: 3 MB, 8 images (extra safety)                          │
│          • High Capacity: 8 MB, 15 images (if provider supports)               │
│          • Unlimited: 50 MB, 20 images (local/custom API)                       │
│                                                                                 │
│                                              [Reset to Defaults] [Apply]        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Compression Settings Panel

```
┌─ Compression Settings ──────────────────────────────────────────────────────────┐
│                                                                                 │
│ Controls how images are compressed to fit within payload limits.                │
│                                                                                 │
│ ┌─ Dimension Limits ─────────────────────────────────────────────────────────┐  │
│ │                                                                            │  │
│ │ Maximum Dimension           [1440 ] px                                     │  │
│ │ Images larger than this are resized to fit                                 │  │
│ │                                                                            │  │
│ │ Emergency Reduction         [80   ] %                                      │  │
│ │ If still too large, reduce dimensions by this factor                       │  │
│ │                                                                            │  │
│ └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│ ┌─ Quality Limits ───────────────────────────────────────────────────────────┐  │
│ │                                                                            │  │
│ │ Initial Quality             [87   ]       (starting JPEG quality)          │  │
│ │ Minimum Quality             [50   ]       (won't go below this)            │  │
│ │ Quality Step                [10   ]       (reduction per attempt)          │  │
│ │ Max Attempts                [5    ]       (before emergency resize)        │  │
│ │                                                                            │  │
│ └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│ ┌─ Behavior ─────────────────────────────────────────────────────────────────┐  │
│ │                                                                            │  │
│ │ ☑ Auto-compress when selecting images                                     │  │
│ │ ☑ Warn when heavy compression needed (below quality [60])                 │  │
│ │ ☑ Show compression details in selection array                            │  │
│ │                                                                            │  │
│ └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│ Presets: [Balanced ▼]                                                           │
│          • Quality First: 2048px, q95-70, warn at q80                          │
│          • Balanced: 1440px, q87-50, warn at q60 (default)                     │
│          • Size First: 1024px, q80-40, warn at q50                             │
│          • Maximum Compression: 800px, q70-30, no warnings                     │
│                                                                                 │
│                                              [Reset to Defaults] [Apply]        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Live Budget Calculator

The UI should show real-time budget calculations as settings change.

```typescript
interface BudgetCalculation {
  // Inputs
  constraints: PayloadConstraints
  selectedImageCount: number
  
  // Outputs
  effectiveImageBudget: number       // total for all images
  perImageBudget: number             // per image
  canAddMore: boolean                // room for more images?
  remainingSlots: number             // how many more images fit
  
  // Warnings
  warnings: BudgetWarning[]
}

interface BudgetWarning {
  level: 'info' | 'warning' | 'error'
  message: string
}

function calculateBudget(
  constraints: PayloadConstraints,
  selectedCount: number
): BudgetCalculation {
  const reserved = constraints.promptReserveBytes + constraints.metadataReserveBytes
  const available = constraints.maxPayloadBytes - reserved
  const effectiveBudget = Math.floor(available * (1 - constraints.safetyMarginPercent / 100))
  
  const perImage = selectedCount > 0
    ? Math.floor(effectiveBudget / selectedCount)
    : constraints.maxPerImageBytes
  
  const clampedPerImage = Math.max(
    constraints.minPerImageBytes,
    Math.min(constraints.maxPerImageBytes, perImage)
  )
  
  const warnings: BudgetWarning[] = []
  
  if (clampedPerImage < 150 * 1024) {
    warnings.push({
      level: 'warning',
      message: `Per-image budget (${formatBytes(clampedPerImage)}) is low. Expect visible compression.`
    })
  }
  
  if (clampedPerImage <= constraints.minPerImageBytes && selectedCount < constraints.maxReferenceImages) {
    warnings.push({
      level: 'info',
      message: `At minimum per-image budget. Adding more images won't reduce quality further.`
    })
  }
  
  return {
    constraints,
    selectedImageCount: selectedCount,
    effectiveImageBudget: effectiveBudget,
    perImageBudget: clampedPerImage,
    canAddMore: selectedCount < constraints.maxReferenceImages,
    remainingSlots: constraints.maxReferenceImages - selectedCount,
    warnings
  }
}
```

---

## 4. Storage Schema Update

Update config.json schema:

```typescript
interface ConfigFile {
  version: number
  
  // ... existing fields ...
  
  payload: PayloadConstraints
  compression: CompressionSettings
}

// Example config.json
{
  "version": 2,
  "payload": {
    "maxPayloadBytes": 4194304,
    "maxReferenceImages": 10,
    "promptReserveBytes": 51200,
    "metadataReserveBytes": 20480,
    "safetyMarginPercent": 10,
    "minPerImageBytes": 102400,
    "maxPerImageBytes": 819200
  },
  "compression": {
    "maxDimension": 1440,
    "emergencyDimensionFactor": 0.8,
    "initialQuality": 87,
    "minQuality": 50,
    "qualityStep": 10,
    "maxAttempts": 5,
    "autoCompress": true,
    "warnOnHeavyCompression": true,
    "heavyCompressionThreshold": 60,
    "showCompressionDetails": true
  }
}
```

---

## 5. Quick Presets

```typescript
interface ConstraintPreset {
  id: string
  name: string
  description: string
  payload: Partial<PayloadConstraints>
  compression: Partial<CompressionSettings>
}

const CONSTRAINT_PRESETS: ConstraintPreset[] = [
  {
    id: 'current-api',
    name: 'Current API (4MB/10img)',
    description: 'Matches current nano-gpt.com limits',
    payload: {
      maxPayloadBytes: 4 * 1024 * 1024,
      maxReferenceImages: 10
    },
    compression: {
      maxDimension: 1440,
      initialQuality: 87,
      minQuality: 50
    }
  },
  {
    id: 'conservative',
    name: 'Conservative',
    description: 'Extra safety margin, less aggressive',
    payload: {
      maxPayloadBytes: 3 * 1024 * 1024,
      maxReferenceImages: 8,
      safetyMarginPercent: 15
    },
    compression: {
      maxDimension: 1200,
      initialQuality: 85,
      minQuality: 60
    }
  },
  {
    id: 'high-capacity',
    name: 'High Capacity',
    description: 'For providers with larger limits',
    payload: {
      maxPayloadBytes: 8 * 1024 * 1024,
      maxReferenceImages: 15,
      maxPerImageBytes: 1.5 * 1024 * 1024
    },
    compression: {
      maxDimension: 2048,
      initialQuality: 90,
      minQuality: 60
    }
  },
  {
    id: 'unlimited',
    name: 'Unlimited (Local/Custom)',
    description: 'Minimal compression for local APIs',
    payload: {
      maxPayloadBytes: 50 * 1024 * 1024,
      maxReferenceImages: 20,
      safetyMarginPercent: 5,
      maxPerImageBytes: 5 * 1024 * 1024
    },
    compression: {
      maxDimension: 4096,
      initialQuality: 95,
      minQuality: 80
    }
  }
]

function applyPreset(presetId: string, currentConfig: ConfigFile): ConfigFile {
  const preset = CONSTRAINT_PRESETS.find(p => p.id === presetId)
  if (!preset) return currentConfig
  
  return {
    ...currentConfig,
    payload: { ...currentConfig.payload, ...preset.payload },
    compression: { ...currentConfig.compression, ...preset.compression }
  }
}
```

---

## 6. Runtime Recompression

When constraints change, already-selected images may need recompression:

```typescript
// When payload constraints change
async function onConstraintsChanged(
  oldConstraints: PayloadConstraints,
  newConstraints: PayloadConstraints,
  currentSelection: SelectedImage[]
): Promise<void> {
  const oldBudget = calculatePerImageBudget(currentSelection.length, oldConstraints)
  const newBudget = calculatePerImageBudget(currentSelection.length, newConstraints)
  
  if (newBudget < oldBudget) {
    // Need to recompress - images are now over budget
    showToast({
      type: 'info',
      message: `Payload limits reduced. Recompressing ${currentSelection.length} images...`
    })
    
    for (const image of currentSelection) {
      const recompressed = await compressImage(image.originalPath, newBudget)
      updateSelectionItem(image.id, { compressed: recompressed })
    }
    
    showToast({
      type: 'success',
      message: 'Images recompressed to fit new limits'
    })
  }
  
  // If new budget is larger, optionally offer to recompress at higher quality
  if (newBudget > oldBudget * 1.5) {
    showToast({
      type: 'info',
      message: 'Payload limits increased. Recompress for better quality?',
      action: {
        label: 'Recompress',
        onClick: () => recompressAllAtHigherQuality(currentSelection, newBudget)
      }
    })
  }
}
```

---

## 7. Validation

```typescript
interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

function validatePayloadConstraints(constraints: PayloadConstraints): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Hard limits
  if (constraints.maxPayloadBytes < 1 * 1024 * 1024) {
    errors.push('Maximum payload must be at least 1 MB')
  }
  
  if (constraints.maxPayloadBytes > 100 * 1024 * 1024) {
    warnings.push('Payload over 100 MB may cause memory issues')
  }
  
  if (constraints.maxReferenceImages < 1) {
    errors.push('Must allow at least 1 reference image')
  }
  
  if (constraints.maxReferenceImages > 50) {
    warnings.push('More than 50 images may impact generation quality')
  }
  
  // Budget sanity
  const effectiveBudget = constraints.maxPayloadBytes 
    - constraints.promptReserveBytes 
    - constraints.metadataReserveBytes
  
  if (effectiveBudget < constraints.minPerImageBytes) {
    errors.push('Effective image budget is less than minimum per-image size')
  }
  
  if (constraints.safetyMarginPercent > 50) {
    warnings.push('Safety margin over 50% wastes available budget')
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

function validateCompressionSettings(settings: CompressionSettings): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  if (settings.maxDimension < 256) {
    errors.push('Maximum dimension must be at least 256px')
  }
  
  if (settings.maxDimension > 8192) {
    warnings.push('Dimensions over 8192px may cause memory issues')
  }
  
  if (settings.minQuality < 10) {
    warnings.push('Minimum quality below 10 will produce unusable images')
  }
  
  if (settings.minQuality > settings.initialQuality) {
    errors.push('Minimum quality cannot exceed initial quality')
  }
  
  if (settings.qualityStep < 1) {
    errors.push('Quality step must be at least 1')
  }
  
  if (settings.qualityStep > 30) {
    warnings.push('Quality step over 30 may skip optimal compression levels')
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}
```

---

## 8. Migration

When updating from hardcoded to configurable:

```typescript
function migrateConfigV1toV2(oldConfig: ConfigFileV1): ConfigFileV2 {
  return {
    ...oldConfig,
    version: 2,
    payload: { ...DEFAULT_PAYLOAD_CONSTRAINTS },
    compression: { ...DEFAULT_COMPRESSION_SETTINGS }
  }
}
```

---

*End of Payload Constraints Configuration specification.*
