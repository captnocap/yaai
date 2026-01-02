# Settings Page Specification

## Architecture Overview

**Layout:** 2-panel system (navigation | content)

**Pages:**
1. Model Provider
2. General Settings
3. Keyboard Shortcuts

---

## Model Provider Page

### Component Tree

```
<ModelProviderPage>
  <ProviderIconBar />
  <ProviderConfigPanel>
    <APIKeySection />
    <APIHostSection />
    <FetchButton />
  </ProviderConfigPanel>
  <ModelGridSection>
    <GridToolbar />
    <ModelCardGrid />
  </ModelGridSection>
</ModelProviderPage>
```

---

### Provider vs Model Provider Icons

**Important distinction:**

| Type | Location | Example |
|------|----------|---------|
| **Provider** (API aggregator) | Top icon bar | OpenRouter, nano-gpt, custom endpoint |
| **Model Provider** (who made it) | Model card | Anthropic, Google, Meta, Mistral |

---

### `<ProviderIconBar />`

```
[ + ] [ ◇ ] [ ◇ ] [ ◇ ] [ ◇ ]
 add   p1    p2    p3    p4
```

**States:**

| Element | Default | Hover | Selected |
|---------|---------|-------|----------|
| Icon fill | `neutral-500` (monochrome) | `neutral-300` + glow | `brand-color` or white |
| Background | transparent | subtle `bg-white/5` | `bg-white/10` + ring |
| Scale | `1` | `1.05` | `1` |
| Transition | — | `150ms ease-out` | — |

**Behavior:**
- SVGs use `currentColor` for fill inheritance
- Selected state has subtle bottom indicator or ring
- Tooltip on hover showing full provider name
- `+` button opens provider-add modal
- Drag to reorder providers

---

### `<APIKeySection />`

```
API Keys
┌──────────────────────┐  ┌──────────────────────┐  [+]
│ •••••••••••••••••••  │  │ •••••••••••••••••••  │
└──────────────────────┘  └──────────────────────┘
```

**Behavior:**
- Each key = separate input (NOT comma-separated)
- `+` spawns new empty input with focus
- Blur → auto-save (no button needed)
- Empty inputs auto-remove on blur
- Password-masked by default, eye icon to reveal
- Green checkmark on save, red shake on invalid

**Styling:**
- `font-mono` for key text
- Fade-in animation when new input spawns
- Delete `×` appears on hover (right side)

---

### `<APIHostSection />`

- Single URL input
- Auto-save on blur
- Same styling as key inputs

---

### `<FetchModelsModal />` — Selection Phase

```
┌─────────────────────────────────────────────────┐
│  Fetch Models                              [×]  │
├─────────────────────────────────────────────────┤
│  [🔍 Search models...]           [Filter ▾]    │
├─────────────────────────────────────────────────┤
│  ☐  anthropic/claude-sonnet-4   👁 🧠 🔧  128k │
│  ☑  anthropic/claude-opus-4     👁 🧠 🔧  200k │
│  ☐  deepseek/v3.2              🧠       64k   │
│  ☐  google/gemini-2.5-flash    👁 🔧 🔍  1M   │
│  ...                                           │
├─────────────────────────────────────────────────┤
│  12 selected                     [Add Models]  │
└─────────────────────────────────────────────────┘
```

**Key points:**
- **Compact list view** (NOT grid) — easier to navigate 500+ models
- Checkbox + model ID + estimated capability icons + context window
- Rows are compact (`36-40px` height)
- Virtualized list (react-window or similar)
- Search/filter at top (sticky header)
- Capability estimation with `?` badge for uncertain ones

---

### `<ModelCardGrid />` — Post-Add Display

**Card anatomy (~120×160):**

```
┌────────────────────┐
│      [icon]        │   ← model provider logo, monochrome
│                    │
│    Model Name      │   ← truncate with tooltip if long
│     (subtext)      │   ← optional: variant/version
│                    │
│  [👁] [🧠] [🔧] [🔍] │   ← capability badges
└────────────────────┘
```

**Capability badges:**

| Icon | Capability |
|------|------------|
| 👁 | Vision |
| 🧠 | Reasoning/Thinking |
| 🔧 | Tool Use |
| 🔍 | Web Search |
| `</>` | Code (optional) |
| 📎 | File/Doc handling (optional) |

**Badge states:**

| State | Fill | Opacity | Interaction |
|-------|------|---------|-------------|
| Inactive | `neutral-600` | `0.3` | Click to enable |
| Active | capability-color | `1` | Click to disable |
| Hover | — | — | Scale `1.1` + tooltip |

**Capability colors:**
- Vision: `cyan-400`
- Reasoning: `purple-400`
- Tool: `amber-400`
- Search: `green-400`

**Card interactions:**

| Action | Result |
|--------|--------|
| Hover | `bg-white/5`, subtle lift shadow |
| Click name | Inline rename (text → input, blur saves) |
| Click badge | Toggle capability |
| Right-click | Context menu (assign group, duplicate, delete) |
| Drag | Reorder or drop into group |
| Shift+click | Multi-select mode |

**Card styling:**
- `rounded-xl` with subtle border `border-white/5`
- Selected: `ring-2 ring-brand/50`
- Hover: faint gradient shimmer
- Provider icon tints to brand color on hover

---

### `<GridToolbar />`

```
[ All ▾ ] [ Vision ▾ ] [ + New Group ]     🔍 [search]     [ ⊞ grid | ☰ list ]
```

- Filter by capability and custom groups
- Real-time search filtering
- View toggle: grid (default) vs compact list

---

### Custom Groups

Users can create custom groups like:
- Coding
- RP
- Research
- Science

**Assignment:** drag-drop or right-click → assign group

---

### Micro-interactions

| Interaction | Animation |
|-------------|-----------|
| Card appear (after add) | Fade in + scale `0.95` → `1` |
| Badge toggle | Color transition `150ms` + subtle pulse |
| Inline rename | Text fades to input, border animates in |
| Provider switch | Content crossfade `200ms` |
| Drag card | Lift shadow + slight rotation, drop placeholder |
| Multi-select | Checkbox overlay in card corner |

---

## Icon Strategy

### Source: Simple Icons

- **Package:** `simple-icons` (npm)
- 3000+ brand icons as pure SVG paths
- MIT licensed
- Includes: Anthropic, OpenAI, Google, Meta, Mistral, Hugging Face, Cohere, Perplexity

```ts
import { siAnthropic, siOpenai, siGoogle, siMeta } from 'simple-icons';
// siAnthropic.path → raw SVG path string
```

### Fallback Chain

```
1. Exact match     →  "anthropic" → Anthropic icon
2. Fuzzy match     →  "anthropic/claude-..." → extract "anthropic" → match
3. Known aliases   →  "openai" | "oai" | "gpt" → OpenAI icon
4. User override   →  check custom icon assignments
5. Generic fallback →  styled initial letter in circle
```

### Data Structure

```ts
type IconSource = 'simple-icons' | 'custom' | 'user-upload';

interface ProviderIcon {
  id: string;
  path: string;           // SVG path data
  viewBox?: string;       // default "0 0 24 24"
  source: IconSource;
  brandColor?: string;    // optional, for hover tint
}
```

### User Customization

**Provider-level:** Right-click → "Change icon" → icon picker modal

**Model-level:** Context menu → "Change provider icon" or bulk assign

**Storage:**
```ts
{
  "iconOverrides": {
    "providers": {
      "my-custom-endpoint": { path: "...", brandColor: "#ff5500" }
    },
    "modelProviders": {
      "deepseek": { path: "...", brandColor: "#4a90d9" }
    }
  }
}
```

### Model Provider Detection

```ts
function extractModelProvider(modelId: string): string {
  const prefix = modelId.split('/')[0];
  return normalizeProviderName(prefix);
}

const aliases: Record<string, string> = {
  'meta-llama': 'meta',
  'mistralai': 'mistral',
  'gpt': 'openai',
};
```

### Gap Coverage

Simple Icons may lack newer/niche providers (DeepSeek, Qwen, Yi). Options:
- Cherry-pick from [Cherry Studio repo](https://github.com/CherryHQ/cherry-studio/tree/main/src/renderer/src/assets)
- Create simple geometric fallbacks

---

## Provider-Level API Settings

**Modal for advanced capability flags:**

| Setting | What it controls |
|---------|------------------|
| Array format message content | Multi-part messages (text + images) |
| Developer Message | `developer` role support |
| stream_options | Token usage stats in streams |
| service_tier | Priority routing (OpenAI) |
| enable_thinking | Extended thinking tokens |
| verbosity | Response detail level |

**Recommendation:** Auto-detect where possible, bury manual overrides in advanced/troubleshooting section.

---

## General Settings Page

**Structure:** Grouped sections with toggle/input rows

```
<GeneralSettingsPage>
  <SettingsGroup title="General">
    <SettingRow label="Language" control={<Select />} />
    <SettingRow label="Proxy Mode" control={<Select />} />
    <SettingRow label="Proxy Address" control={<Input />} />
    ...
  </SettingsGroup>
  <SettingsGroup title="Notifications">
    ...
  </SettingsGroup>
  <SettingsGroup title="Launch">
    ...
  </SettingsGroup>
  <SettingsGroup title="Tray">
    ...
  </SettingsGroup>
  <SettingsGroup title="Privacy">
    ...
  </SettingsGroup>
</GeneralSettingsPage>
```

**Pattern:** Label left, control right, auto-save on change. Extend with new sections as needed.

---

## Keyboard Shortcuts Page

**Structure:**

```
┌──────────────────────────────────────────────────────────┐
│ Action              Shortcut          [⟳] [🔒]  [toggle] │
├──────────────────────────────────────────────────────────┤
│ Zoom In             Ctrl + =           ⟳   🔒      ●     │
│ New Topic           Ctrl + N           ⟳   🔒      ●     │
│ Show/Hide App       [Press Shortcut]   ⟳   🔒      ○     │
└──────────────────────────────────────────────────────────┘
```

**Controls:**

| Control | Function |
|---------|----------|
| `⟳` | Reset to default |
| `🔒` | Lock (prevent accidental rebind) |
| Toggle | Enable/disable shortcut |
| Click shortcut | Enter rebind mode (capture next keypress) |

---

## Design Principles Applied

1. **No unnecessary modals** — inline editing where possible
2. **Auto-save on blur** — no save buttons for simple fields
3. **Monochrome → color on interaction** — consistent icon treatment
4. **Capability badges inline and toggleable** — not buried in modals
5. **Custom grouping** — user-defined organization, not forced hierarchy
6. **Bulk operations** — multi-select for mass changes
7. **Virtualization** — handle 500+ models without performance issues

---

## Future Considerations

- **Default Model** could be a subsection on Model Provider (dropdown per use-case: chat, vision, code)
- **Filter/sort bar** above model grid: by capability, group, alphabetical, recently used
- If General Settings gets cluttered, break into sub-pages