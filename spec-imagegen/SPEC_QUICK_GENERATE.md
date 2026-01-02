# Quick Generation Input — Specification

> Ad-hoc image generation without queue entries  
> Designed to integrate with chat interface later

---

## 1. Use Cases

| Scenario | Flow |
|----------|------|
| Quick test | Type prompt → pick model → generate |
| Reference test | Select images in media panel → type prompt → generate |
| Iteration | Generate → tweak prompt → generate again |
| Chat integration | User types "generate a portrait of..." → inline result |

**Not for:** Batch processing, scheduled runs, complex wildcards — that's what the queue is for.

---

## 2. Component Location

### Option A: Bottom Bar (Recommended)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Header                                                                          │
├──────────────┬─────────────────────────────────┬────────────────────────────────┤
│ Left Sidebar │ Center Content                  │ Media Panel                    │
│              │                                 │                                │
│              │ Queue Table / Jobs              │                                │
│              │                                 │                                │
│              │                                 │                                │
│              ├─────────────────────────────────┤                                │
│              │ Prompt Editor                   │                                │
├──────────────┴─────────────────────────────────┴────────────────────────────────┤
│ ┌─ Quick Generate ────────────────────────────────────────────────────────────┐ │
│ │ [+refs] │ Enter prompt...                          │ [settings] │ [Generate] │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Log Drawer                                                                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Pros:**
- Always accessible
- Doesn't interfere with queue workflow
- Natural chat-like position
- Expands upward for settings

---

## 3. Component States

### 3.1 Collapsed (Default)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  ┌──────┐  ┌────────────────────────────────────────────────────┐  ⚙  Generate │
│  │ +img │  │ Quick generate: type a prompt...                   │              │
│  └──────┘  └────────────────────────────────────────────────────┘              │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- Single-line input
- Add refs button (uses current media panel selection)
- Settings gear (opens popover)
- Generate button

### 3.2 With References Attached

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  ┌────┐┌────┐┌────┐  ┌──────────────────────────────────────────┐  ⚙  Generate │
│  │ ×  ││ ×  ││ ×  │  │ A portrait in cyberpunk style...        │              │
│  │img1││img2││img3│  └──────────────────────────────────────────┘              │
│  └────┘└────┘└────┘                                                            │
│                     Storage: 890KB / 4MB ██████░░░░                             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- Mini thumbnails with × to remove
- Storage bar showing payload budget
- Click thumbnail to remove

### 3.3 Expanded (Settings Visible)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ┌─ Quick Generate Settings ─────────────────────────────────────────────────┐  │
│  │                                                                           │  │
│  │  Model: [Nano Banana Pro Ultra ▼]    Resolution: [4k ▼]  AR: [16:9 ▼]    │  │
│  │                                                                           │  │
│  │  Images: [1] [-][+]    ☐ Add to queue instead    ☐ Save prompt to library│  │
│  │                                                                           │  │
│  │  Advanced: Steps [50]  CFG [7.5]  Seed [random ▼]                        │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌────┐┌────┐  ┌────────────────────────────────────────────────┐  ⚙  Generate │
│  │img1││img2│  │ A portrait in cyberpunk style with neon...    │      ▲       │
│  └────┘└────┘  └────────────────────────────────────────────────┘   collapse   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Generating State

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  ┌────┐┌────┐  ┌────────────────────────────────────────────────┐   ████░░░░   │
│  │img1││img2│  │ A portrait in cyberpunk style...              │   Generating │
│  └────┘└────┘  └────────────────────────────────────────────────┘   [Cancel]   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- Progress indicator
- Cancel button
- Input disabled during generation

### 3.5 Result Inline Preview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ┌─ Result ──────────────────────────────────────────────────────────────────┐  │
│  │                                                                           │  │
│  │  ┌─────────────┐                                                          │  │
│  │  │             │  ✓ Generated in 12.3s                                    │  │
│  │  │   preview   │  Model: Nano Banana Pro Ultra                            │  │
│  │  │             │  Resolution: 4k (16:9)                                   │  │
│  │  └─────────────┘                                                          │  │
│  │                                                                           │  │
│  │  [View Full] [Use as Ref] [Save Prompt] [Add to Queue] [Generate Again]  │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌────────────────────────────────────────────────────────────────┐  ⚙  Generate│
│  │ (prompt persists for iteration)                                │            │
│  └────────────────────────────────────────────────────────────────┘            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- Preview thumbnail (click for lightbox)
- Quick actions
- Prompt persists for easy iteration
- "Generate Again" for variations

---

## 4. Data Model

```typescript
interface QuickGenerateState {
  // Input
  prompt: string
  references: SelectedImage[]         // from media panel or dropped
  
  // Settings
  model: string
  resolution: ResolutionConfig
  aspectRatio: AspectRatio | null
  imageCount: number                  // 1-4 for quick gen
  
  // Advanced (collapsed by default)
  steps: number | null
  cfgScale: number | null
  seed: number | 'random'
  
  // Options
  addToQueueInstead: boolean          // create queue entry rather than immediate
  savePromptToLibrary: boolean        // save prompt as .txt file
  
  // State
  status: 'idle' | 'generating' | 'complete' | 'error'
  progress: number                    // 0-100
  result: QuickGenerateResult | null
  error: string | null
  
  // UI
  settingsExpanded: boolean
  resultExpanded: boolean
}

interface QuickGenerateResult {
  images: GeneratedImage[]
  prompt: string
  model: string
  duration: number
  timestamp: number
}
```

---

## 5. Reference Integration

### 5.1 Add from Media Panel

```typescript
// When user clicks [+refs] button or drags images
function addReferencesFromMediaPanel() {
  // Get current selection from media panel
  const selection = mediaPanelStore.getSelection()
  
  // These are already compressed
  quickGenStore.setReferences(selection)
}
```

### 5.2 Drag & Drop

```typescript
// Accept drops from:
// - Media panel selection
// - Reference browser
// - Output gallery
// - External files (from system)

interface DropHandler {
  onDrop: (items: DataTransferItemList) => void
  acceptedTypes: ['image/png', 'image/jpeg', 'image/webp']
}

async function handleDrop(files: File[]) {
  for (const file of files) {
    // Compress on the fly
    const compressed = await compressImage(file, getPerImageBudget())
    quickGenStore.addReference(compressed)
  }
}
```

### 5.3 Sync with Media Panel

Option: When quick generate has refs, show them in media panel's selection array too.

```typescript
// Bidirectional sync (optional, might be confusing)
// OR: Keep quick gen refs separate, shown inline only
```

---

## 6. Settings Popover

Clicking ⚙ opens a popover (not modal) with generation settings:

```
┌─ Generation Settings ─────────────────────────────────┐
│                                                       │
│  Model                                                │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Nano Banana Pro Ultra                         ▼ │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  Resolution          Aspect Ratio                     │
│  ┌─────────────┐     ┌─────────────┐                  │
│  │ 4k        ▼ │     │ 16:9      ▼ │                  │
│  └─────────────┘     └─────────────┘                  │
│                                                       │
│  Images per generation                                │
│  [1]  [2]  [3]  [4]                                   │
│   ●    ○    ○    ○                                    │
│                                                       │
│  ─────────────────────────────────────────────────    │
│  ▶ Advanced Options                                   │
│                                                       │
│  ☐ Add to queue instead of immediate generation      │
│  ☐ Save prompt to library after generation           │
│                                                       │
│                              [Reset] [Apply & Close]  │
└───────────────────────────────────────────────────────┘

▶ Advanced Options (expanded):
┌───────────────────────────────────────────────────────┐
│  ▼ Advanced Options                                   │
│                                                       │
│  Steps            CFG Scale        Seed               │
│  ┌─────────┐      ┌─────────┐      ┌─────────────┐   │
│  │ 50      │      │ 7.5     │      │ Random    ▼ │   │
│  └─────────┘      └─────────┘      └─────────────┘   │
│                                                       │
│  Strength (img2img)                                   │
│  ──────────●────────── 0.75                          │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## 7. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+Enter` | Generate (when input focused) |
| `Ctrl+Shift+G` | Focus quick generate input (global) |
| `Escape` | Cancel generation / collapse settings |
| `Ctrl+R` | Add current media panel selection as refs |
| `↑` | Previous prompt from history |
| `↓` | Next prompt from history |

---

## 8. Prompt History

Quick gen keeps a local history for easy recall:

```typescript
interface PromptHistory {
  entries: PromptHistoryEntry[]
  maxEntries: number                  // default 50
  currentIndex: number                // for arrow key navigation
}

interface PromptHistoryEntry {
  prompt: string
  model: string
  resolution: string
  timestamp: number
  resultCount: number                 // how many images generated
}

// Navigate with ↑/↓ when input focused
// Shows ghost text of previous prompt
```

---

## 9. Result Actions

### 9.1 View Full

Opens lightbox with the generated image(s).

### 9.2 Use as Reference

```typescript
function useResultAsReference(image: GeneratedImage) {
  // Add to quick gen's own refs (for iteration)
  quickGenStore.addReference(image)
  
  // OR add to media panel selection (for queue entries)
  mediaPanelStore.addToSelection(image)
}
```

### 9.3 Save Prompt

```typescript
async function savePromptToLibrary(prompt: string) {
  // Open small inline form for filename
  const name = await promptForFilename()
  
  // Save to prompts directory
  await savePromptFile(name, prompt)
  
  // Refresh prompt browser
  promptBrowserStore.refresh()
}
```

### 9.4 Add to Queue

Creates a queue entry with the current settings:

```typescript
function addToQueue() {
  const entry = createQueueEntry({
    prompt: {
      type: 'inline',
      value: quickGenStore.prompt
    },
    resolution: quickGenStore.resolution,
    model: quickGenStore.model,
    references: quickGenStore.references.map(toReferencePattern),
    imagesPerBatch: quickGenStore.imageCount,
    batchCount: 1,                    // user can edit in queue
    // ... other settings
  })
  
  queueStore.addEntry(entry)
  
  // Optionally switch to queue tab
  uiStore.setActiveTab('queue')
}
```

### 9.5 Generate Again

Same prompt + settings, new seed (variation).

---

## 10. Chat Integration (Future)

The quick generate component is designed to work as a chat input:

### 10.1 Chat Mode Layout

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ┌─ Conversation ────────────────────────────────────────────────────────────┐  │
│  │                                                                           │  │
│  │  You: Generate a cyberpunk portrait                                       │  │
│  │                                                                           │  │
│  │  AI: Here's your generated image:                                         │  │
│  │      ┌─────────────┐                                                      │  │
│  │      │             │                                                      │  │
│  │      │   result    │                                                      │  │
│  │      │             │                                                      │  │
│  │      └─────────────┘                                                      │  │
│  │      [Use as Ref] [Variations] [Edit Prompt]                              │  │
│  │                                                                           │  │
│  │  You: Make her hair blue                                                  │  │
│  │                                                                           │  │
│  │  AI: Updated with blue hair:                                              │  │
│  │      ┌─────────────┐                                                      │  │
│  │      │             │                                                      │  │
│  │      │   result    │                                                      │  │
│  │      │             │                                                      │  │
│  │      └─────────────┘                                                      │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌────┐  ┌────────────────────────────────────────────────┐  ⚙  Send / Gen    │
│  │+img│  │ Type a message or generation prompt...        │                    │
│  └────┘  └────────────────────────────────────────────────┘                    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Intent Detection

```typescript
// Detect if user wants to generate or chat
function detectIntent(input: string): 'generate' | 'chat' | 'ambiguous' {
  const generateKeywords = [
    'generate', 'create', 'make', 'draw', 'render',
    'portrait', 'landscape', 'image of', 'picture of'
  ]
  
  const chatKeywords = [
    'how', 'what', 'why', 'explain', 'help',
    'tell me', 'can you'
  ]
  
  // Simple heuristic, can be improved with LLM
  const hasGenerate = generateKeywords.some(k => input.toLowerCase().includes(k))
  const hasChat = chatKeywords.some(k => input.toLowerCase().includes(k))
  
  if (hasGenerate && !hasChat) return 'generate'
  if (hasChat && !hasGenerate) return 'chat'
  return 'ambiguous'
}

// If ambiguous, show choice:
// [Generate Image] [Send as Message]
```

### 10.3 Contextual Generation

In chat mode, previous results can be referenced:

```typescript
interface ChatContext {
  // Previous generation in conversation
  lastResult: GeneratedImage | null
  
  // Accumulated style/character references
  persistentRefs: SelectedImage[]
  
  // Conversation history for context
  messages: ChatMessage[]
}

// "Make her hair blue" → uses lastResult as reference automatically
// "Same style but landscape" → infers from context
```

---

## 11. Component Tree

```
QuickGenerateBar
├── ReferenceStrip
│   ├── AddRefButton
│   └── RefThumbnail (× to remove)
│       └── CompressionBadge
│
├── PromptInput
│   ├── TextArea (auto-resize)
│   ├── HistoryNavigation (↑/↓)
│   └── CharacterCount (optional)
│
├── SettingsButton (opens popover)
│   └── SettingsPopover
│       ├── ModelSelect
│       ├── ResolutionSelect
│       ├── AspectRatioSelect
│       ├── ImageCountToggle
│       ├── AdvancedSection (collapsible)
│       │   ├── StepsInput
│       │   ├── CFGInput
│       │   ├── SeedInput
│       │   └── StrengthSlider
│       └── OptionsCheckboxes
│
├── GenerateButton
│   ├── IdleState ("Generate")
│   ├── LoadingState (spinner + "Cancel")
│   └── ProgressBar
│
└── ResultPreview (when result exists)
    ├── Thumbnail (click for lightbox)
    ├── MetaInfo
    └── ActionButtons
        ├── ViewFullButton
        ├── UseAsRefButton
        ├── SavePromptButton
        ├── AddToQueueButton
        └── GenerateAgainButton
```

---

## 12. State Persistence

```typescript
// Quick gen settings persist across sessions
interface QuickGenPersistence {
  // Saved to localStorage/config
  lastModel: string
  lastResolution: ResolutionConfig
  lastAspectRatio: AspectRatio | null
  imageCount: number
  advancedSettings: {
    steps: number
    cfgScale: number
    strength: number
  }
  
  // Saved to history file
  promptHistory: PromptHistoryEntry[]
}

// References NOT persisted (too large, context-dependent)
// Result NOT persisted (shown in output gallery anyway)
```

---

## 13. Integration Points

### 13.1 With Media Panel

```typescript
// Quick gen can pull from media panel selection
quickGenStore.pullReferencesFromMediaPanel()

// Result appears in output gallery automatically
onQuickGenComplete((result) => {
  outputGalleryStore.prepend(result.images)
})
```

### 13.2 With Queue

```typescript
// "Add to Queue" creates entry
// "Add to queue instead" checkbox → generate creates entry, not immediate

// Queue entries can be created from quick gen settings
```

### 13.3 With Prompt Library

```typescript
// "Save Prompt" adds to library
// Typing prompt name that exists → offer to load it
// Autocomplete from library names
```

---

*End of Quick Generate specification.*
