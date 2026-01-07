# Dynamic InputHub — Specification

> Folder: spec-input-hub-evolution
> Version: 1.0.0
> Last Updated: 2026-01-07

The InputHub Evolution transforms the central entry point into a context-aware state machine. It dynamically adapts its UI, controls, and visual feedback based on the current user "Target" (Chat, Image Gen, or Forge), facilitating a seamless crossover between text and media generation.

---

## Table of Contents

1. [Architecture & Flow](#1-architecture--flow)
2. [Data Model & Schema](#2-data-model--schema)
3. [Component Implementation](#3-component-implementation)
4. [Workflows & UI](#4-workflows--ui)
5. [API & Protocol](#5-api--protocol)
6. [Error Handling](#6-error-handling)
7. [Security & Performance](#7-security--performance)

---

## 1. Architecture & Flow

### 1.1 Logical Flow

```
[Target Detection] → [State Sync] → [Input Context Provider]
       ↓                ↓                    ↓
[Browser/App]      [InputHub Store]     [Dynamic Renders]
       ↓                ↓                    ↓
[Interaction] ← [Validation/Exec] ← [Target-Specific UI]
```

1. **Target Detection**: The `InputHub` listens for context changes (e.g., active tab, selected chat, or opened Forge document).
2. **State Sync**: The `InputHubStore` updates its `activeMode` and `configPayload`.
3. **Dynamic Render**: The React component swaps internal "Atoms" (e.g., Textarea vs. Prompt Library Browser).
4. **Execution**: The input is dispatched to the corresponding backend handler (AI Provider, Image Gen Store, or File System).

### 1.2 Module Structure

```
app/src/mainview/components/input-hub/
├── logic/
│   ├── useInputTarget.ts          # Detects active target/mode
│   └── useDynamicSchema.ts        # Loads input schema (maxTokens, samplers)
├── states/
│   ├── ChatInput.tsx              # Standard chat input atoms
│   ├── ImageInput.tsx             # Prompt library + knobs
│   └── ForgeInput.tsx             # Document-specific controls
└── InputHub.tsx                   # Main state machine container
```

---

## 2. Data Model & Schema

### 2.1 Types & Interfaces

```typescript
// app/src/mainview/types/input-hub.ts

export type InputHubMode = 'chat' | 'image' | 'forge' | 'proxy';

export interface InputHubState {
  mode: InputHubMode;
  targetId: string;        // ID of the active chat, group, or doc
  isProxyEnabled: boolean; // Flag for Text -> Image crossover
  value: string;           // Current input content
  parameters: {
    temperature?: number;
    aspectRatio?: string;
    seed?: number;
    isPrefill?: boolean;
  };
}

export interface TargetMetadata {
  id: string;
  type: InputHubMode;
  suggestedPrompts: string[];
  capabilities: string[]; // ['tools', 'vision', 'gen_image']
}
```

---

## 3. Component Implementation

### 3.1 InputHub State Machine

**Path**: `app/src/mainview/components/input-hub/InputHub.tsx`

```typescript
/**
 * Main InputHub entry point.
 * Orchestrates the transition between input modes using the useInputTarget hook.
 */
export const InputHub: React.FC = () => {
  const { mode, targetMetadata } = useInputTarget();
  
  return (
    <div className="input-hub-container">
      <VisualizationWrapper mode={mode} />
      
      <div className="input-hub-core">
        {mode === 'chat' && <ChatInput metadata={targetMetadata} />}
        {mode === 'image' && <ImageInput metadata={targetMetadata} />}
        {mode === 'forge' && <ForgeInput metadata={targetMetadata} />}
      </div>
      
      <InputHubToolbar mode={mode} />
    </div>
  );
};
```

---

## 4. Workflows & UI

### 4.1 Image Panel Input (Specialized)

**UI Component**: `app/src/mainview/components/input-hub/states/ImageInput.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Browse Prompt Library...                         [≡] [⚡] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Prompt Field]                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ A high-poly obsidian sculpture of a digital mind...   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  [Parametric Dashboard]                                     │
│  Aspect: [ 16:9 ]   Steps: [ 50 ]   Seed: [ 123456 ] [🎲]   │
│  Model:  [ Flux.1 (Schnell) ↓ ]                             │
│                                                             │
│  [Attach Ref] [Negative]                      [GENERATE]    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Interaction Logic (Crossover Mode)

* **Initial State**: User is in a standard chat window. `mode` is `chat`.
* **User Action**: User toggles the "Image Proxy" switch in the toolbar.
* **Result**: The UI injects a "Proxy" indicator. The `capabilities` list for the session is updated to include `image_gen`. The model is now informed it can use tools to output images directly into the chat.

---

## 5. API & Protocol

### 5.1 Context Sync Handler

Any navigation change in the app emits a `ui:target-changed` event.

| Channel | Direction | Payload | Response | Description |
| --- | --- | --- | --- | --- |
| `ui:target-changed` | Push | `{ id: string, type: InputHubMode }` | N/A | Server-initiated target update |
| `input:sync-state` | Request | `Partial<InputHubState>` | `Result<void>` | Syncs local hub state to backend |

---

## 6. Error Handling

### 6.1 Common Errors

| Situation | Error Code | User Message | Recovery |
| --- | --- | --- | --- |
| Invalid Metadata | `ERR_IH_001` | "Unable to identify input target." | Refresh active panel |
| Proxy Constraint | `ERR_IH_002` | "Primary model does not support tool calling." | Disable proxy or switch model |

---

## 7. Security & Performance

### 7.1 Security Considerations

* **Prompt Injection**: Input is sanitized before being passed to `VariableStore` for expansion.
* **Credential Scope**: Image Proxy tools only access the `ImageGenStore` and do not have read/write access to unrelated folders like `~/.ssh`.

### 7.2 Performance Strategy

* **UI Throttling**: Typing updates to the `InputHubStore` are debounced to prevent React render-thrashing during high-speed typing or streaming.
* **Component Lazy Loading**: `ImageInput` and `ForgeInput` (monaco-heavy) are dynamically imported using `React.lazy` to minimize initial bundle size for Chat-only users.

---

*End of Dynamic InputHub specification.*
