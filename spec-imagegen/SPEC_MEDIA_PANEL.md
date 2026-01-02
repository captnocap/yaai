# Media Panel — Specification

> Replaces modal-based reference picker  
> Combines reference browsing + output gallery in persistent panel

---

## 1. Design Principle

**No modals for core workflow.** Everything needed for generation is visible and interactive without popups. Modals reserved only for:
- Settings/configuration
- Confirmations (delete, destructive actions)
- Full-screen image viewer (lightbox)

---

## 2. Panel Layout

```
┌─ Media Panel (Right Side) ──────────────────────────────────────────────────────┐
│                                                                                 │
│  ┌─ Tab Bar ─────────────────────────────────────────────────────────────────┐  │
│  │  [References]  [Output]                                                   │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ╔═══════════════════════════════════════════════════════════════════════════╗  │
│  ║                                                                           ║  │
│  ║                         ACTIVE VIEW                                       ║  │
│  ║                   (References OR Output)                                  ║  │
│  ║                                                                           ║  │
│  ╚═══════════════════════════════════════════════════════════════════════════╝  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. References Tab

### 3.1 Layout

```
┌─ References Tab ────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  ┌─ Editing References For ──────────────────────────────────────────────────┐  │
│  │  ● portrait_v2 (Queue Entry #1)                          [Clear] [Unlink] │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌─ Selection Array ─────────────────────────────────────────────────────────┐  │
│  │  Budget: 350KB/img  │  Total: 1.2 / 3.5 MB  ████████░░░░░░░░░            │  │
│  │                                                                           │  │
│  │  ┌─[0]───┐ ┌─[1]───┐ ┌─[2]───┐ ┌─[3]───┐                                │  │
│  │  │       │ │       │ │       │ │       │     ← drag to reorder          │  │
│  │  │ thumb │ │ thumb │ │ thumb │ │ thumb │     ← click to remove          │  │
│  │  │       │ │       │ │       │ │       │     ← Shift+click for details  │  │
│  │  ├───────┤ ├───────┤ ├───────┤ ├───────┤                                │  │
│  │  │ 320KB │ │ 290KB │ │ 340KB │ │ 280KB │                                │  │
│  │  │ q72   │ │ q87   │ │ q58 ⚠ │ │ q80   │                                │  │
│  │  └───────┘ └───────┘ └───────┘ └───────┘                                │  │
│  │                                                                           │  │
│  │  %img2img[0].name% = "portrait_01"                                       │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌─ Saved Groups ────────────────────────────────────────────────────────────┐  │
│  │  [+ Save]  [portrait_set ▼] [poses ▼] [faces_female ▼]                   │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌─ Browser ─────────────────────────────────────────────────────────────────┐  │
│  │  $img2img / faces / female                              [↑] [⟳] [≡/⊞]   │  │
│  │  ───────────────────────────────────────────────────────────────────────  │  │
│  │                                                                           │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │  │
│  │  │  📁  │ │      │ │      │ │  ✓   │ │      │ │      │ │      │        │  │
│  │  │subdir│ │ img01│ │ img02│ │ img03│ │ img04│ │ img05│ │ img06│        │  │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘        │  │
│  │                       ↑ selected                                         │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                                    │  │
│  │  │      │ │      │ │      │ │      │                    ▼ scroll        │  │
│  │  │ img07│ │ img08│ │ img09│ │ img10│                                    │  │
│  │  └──────┘ └──────┘ └──────┘ └──────┘                                    │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Entry Linking

References panel shows which queue entry it's editing:

```typescript
interface ReferencePanelState {
  // Which queue entry is linked (null = no entry selected)
  linkedEntryId: string | null
  
  // Selection is the entry's references
  selection: SelectedImage[]
  
  // Browser state (independent of entry)
  browserPath: string
  browserContents: DirectoryContents | null
}
```

**Linking behavior:**
- Click queue entry row → panel shows that entry's references
- Edit selection → auto-saves to that entry
- Click different entry → panel switches to new entry's references
- [Unlink] button → panel becomes standalone (for browsing without editing)

### 3.3 No-Entry-Selected State

```
┌─ References Tab ────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  ┌─ No Queue Entry Selected ─────────────────────────────────────────────────┐  │
│  │  Select a queue entry to edit its references,                             │  │
│  │  or browse and build a selection to apply later.                          │  │
│  │                                                             [New Entry]   │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌─ Selection Array ─────────────────────────────────────────────────────────┐  │
│  │  (empty or building a new selection)                                      │  │
│  │                                                                           │  │
│  │  Select images below, then:                                               │  │
│  │  • Click a queue entry to apply these references                          │  │
│  │  • Save as a group for later                                              │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ... browser continues below ...                                                │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Output Tab (Gallery)

### 4.1 Layout

```
┌─ Output Tab ────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  ┌─ Main Viewer ─────────────────────────────────────────────────────────────┐  │
│  │                                                                           │  │
│  │                                                                           │  │
│  │                                                                           │  │
│  │                      ┌─────────────────────────┐                          │  │
│  │                      │                         │                          │  │
│  │                      │                         │                          │  │
│  │                      │     CURRENT IMAGE       │      ← click to open     │  │
│  │                      │                         │        lightbox          │  │
│  │                      │                         │                          │  │
│  │                      │                         │                          │  │
│  │                      └─────────────────────────┘                          │  │
│  │                                                                           │  │
│  │  generated_20250102_batch3_img1_portrait.png                              │  │
│  │  4096×4096  •  2.4 MB  •  seedream-v4  •  portrait_v2                     │  │
│  │                                                                           │  │
│  │  [← Prev]                                              [Next →]           │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌─ Actions ─────────────────────────────────────────────────────────────────┐  │
│  │  [⊕ Use as Ref] [📋 Copy] [✎ Rename] [⧉ Duplicate] [🗑 Delete] [📂 Open] │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌─ Thumbnail Strip ─────────────────────────────────────────────────────────┐  │
│  │                                                                           │  │
│  │  ◀ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ▶    │  │
│  │    │    │ │    │ │ ▶  │ │    │ │    │ │    │ │    │ │    │ │    │       │  │
│  │    │ 01 │ │ 02 │ │ 03 │ │ 04 │ │ 05 │ │ 06 │ │ 07 │ │ 08 │ │ 09 │       │  │
│  │    └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘       │  │
│  │                    ↑ current                                             │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌─ Filter ──────────────────────────────────────────────────────────────────┐  │
│  │  Job: [All ▼]  Prompt: [All ▼]  Model: [All ▼]  Date: [Today ▼]          │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Gallery Data Model

```typescript
interface GalleryState {
  // Current view
  currentIndex: number
  images: GeneratedImage[]
  
  // Filtering
  filters: GalleryFilters
  
  // Loading
  loading: boolean
  hasMore: boolean                    // for infinite scroll in strip
}

interface GeneratedImage {
  id: string
  filename: string
  path: string
  
  // Metadata
  dimensions: { width: number, height: number }
  fileSize: number
  createdAt: number
  
  // Generation context
  jobId: string
  batchIndex: number
  promptName: string
  promptText: string
  model: string
  references: string[]                // paths used
}

interface GalleryFilters {
  jobId: string | null
  promptName: string | null
  model: string | null
  dateRange: { start: number, end: number } | null
}
```

### 4.3 Thumbnail Strip Behavior

```typescript
interface ThumbnailStripProps {
  images: GeneratedImage[]
  currentIndex: number
  onSelect: (index: number) => void
  
  // Virtualized - only loads visible + buffer
  visibleCount: number                // ~9-12 based on panel width
  bufferCount: number                 // 3-5 on each side
}

// Behavior:
// - Current image centered when possible
// - Arrow buttons scroll strip
// - Click thumbnail → becomes current
// - Current has highlight border
// - New generations prepend to start (most recent first)
```

### 4.4 Auto-Update on Generation

```typescript
// When a batch completes, new images appear in gallery
function onBatchComplete(result: BatchResult) {
  const newImages = result.savedFiles.map(file => ({
    id: generateId(),
    filename: file.filename,
    path: file.path,
    // ... extract metadata
  }))
  
  // Prepend to gallery (newest first)
  galleryState.images = [...newImages, ...galleryState.images]
  
  // If viewing most recent, auto-advance to newest
  if (galleryState.currentIndex === 0) {
    // Stay on newest
  }
  
  // Visual indicator: flash/pulse on new arrivals
  showNewImageIndicator(newImages.length)
}
```

---

## 5. Image Actions

### 5.1 Action Definitions

```typescript
interface ImageActions {
  // Use generated image as reference
  useAsReference: (imagePath: string) => void
  
  // Copy to clipboard (image data)
  copyToClipboard: (imagePath: string) => Promise<void>
  
  // Copy file path to clipboard
  copyPath: (imagePath: string) => void
  
  // Rename file
  rename: (imagePath: string, newName: string) => Promise<void>
  
  // Duplicate file
  duplicate: (imagePath: string) => Promise<string>  // returns new path
  
  // Delete file (with confirmation)
  delete: (imagePath: string) => Promise<void>
  
  // Open in system file manager
  openInFolder: (imagePath: string) => void
  
  // Open with default app
  openExternal: (imagePath: string) => void
}
```

### 5.2 Use as Reference Flow

```
User clicks [⊕ Use as Ref] on generated image
                │
                ▼
┌─────────────────────────────────────────────┐
│ If queue entry is selected:                 │
│   → Add to that entry's references          │
│   → Auto-compress                           │
│   → Show in selection array                 │
│                                             │
│ If no entry selected:                       │
│   → Add to standalone selection             │
│   → Prompt: "Apply to which entry?"         │
│     or "Save as group?"                     │
└─────────────────────────────────────────────┘
```

### 5.3 Context Menu

Right-click on any image (browser, selection, gallery):

```
┌─────────────────────────────┐
│ ⊕ Add to References         │
│ ────────────────────────    │
│ 📋 Copy Image               │
│ 📋 Copy Path                │
│ ────────────────────────    │
│ ✎ Rename...                 │
│ ⧉ Duplicate                 │
│ ────────────────────────    │
│ 📂 Show in Folder           │
│ 🔲 Open in Default App      │
│ ────────────────────────    │
│ 🗑 Delete                   │
└─────────────────────────────┘
```

---

## 6. Keyboard Navigation

### 6.1 Global Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Cycle focus: Queue → Jobs → Media Panel |
| `1` | Focus References tab |
| `2` | Focus Output tab |
| `Escape` | Clear selection / Close lightbox |

### 6.2 Reference Browser Shortcuts

| Key | Context | Action |
|-----|---------|--------|
| `↑` `↓` `←` `→` | Browser grid | Navigate focus |
| `Enter` / `Space` | Image focused | Add to selection |
| `Backspace` | Browser | Go up one directory |
| `Enter` | Folder focused | Enter folder |
| `Home` | Browser | Go to root |

### 6.3 Selection Array Shortcuts

| Key | Context | Action |
|-----|---------|--------|
| `←` `→` | Selection array | Navigate between items |
| `Delete` / `Backspace` | Item focused | Remove from selection |
| `Shift+←` `Shift+→` | Item focused | Reorder (move left/right) |
| `Ctrl+A` | Selection array | Select all (for bulk delete) |

### 6.4 Output Gallery Shortcuts

| Key | Action |
|-----|--------|
| `←` / `→` | Previous / Next image |
| `Home` | Jump to newest |
| `End` | Jump to oldest |
| `Enter` | Open lightbox |
| `Delete` | Delete current (with confirm) |
| `R` | Add current to references |
| `C` | Copy current to clipboard |
| `I` | Toggle image info overlay |

### 6.5 Lightbox Shortcuts

| Key | Action |
|-----|--------|
| `←` / `→` | Previous / Next |
| `Escape` | Close lightbox |
| `+` / `-` / `0` | Zoom in / out / reset |
| `F` | Toggle fullscreen |
| `I` | Toggle info panel |

---

## 7. Lightbox (Full-Screen Viewer)

Only modal-like element, but it's an overlay not a blocking modal.

### 7.1 Layout

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ×                                                                    [Info] [F] │
│                                                                                 │
│                                                                                 │
│                                                                                 │
│                       ┌───────────────────────────────────┐                     │
│                       │                                   │                     │
│     ◀                 │                                   │                 ▶   │
│                       │         FULL SIZE IMAGE           │                     │
│                       │                                   │                     │
│                       │                                   │                     │
│                       └───────────────────────────────────┘                     │
│                                                                                 │
│                                                                                 │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ◀ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ▶   │
│    │ 01 │ │ 02 │ │ 03 │ │ 04 │ │ 05 │ │ 06 │ │ 07 │ │ 08 │ │ 09 │ │ 10 │      │
│    └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Info Panel (Toggle)

```
┌─ Image Info ────────────────────────┐
│                                     │
│ Filename: portrait_batch3_001.png   │
│ Dimensions: 4096 × 4096             │
│ Size: 2.4 MB                        │
│ Created: Jan 2, 2025 10:34 AM       │
│                                     │
│ ─────────────────────────────────   │
│                                     │
│ Prompt: portrait_v2                 │
│ Model: seedream-v4                  │
│ Job: job-42                         │
│ Batch: 3 of 25                      │
│                                     │
│ References:                         │
│  • faces/female/img03.jpg           │
│  • poses/standing.jpg               │
│                                     │
└─────────────────────────────────────┘
```

---

## 8. Component Tree

```
MediaPanel
├── TabBar
│   ├── Tab "References"
│   └── Tab "Output"
│
├── ReferencesTab (when active)
│   ├── LinkedEntryHeader
│   │   ├── EntryIndicator
│   │   ├── ClearButton
│   │   └── UnlinkButton
│   │
│   ├── SelectionArray
│   │   ├── BudgetBar
│   │   ├── SortableList (@dnd-kit)
│   │   │   └── SelectionTile
│   │   │       ├── IndexBadge
│   │   │       ├── Thumbnail
│   │   │       ├── CompressionBadge
│   │   │       └── RemoveButton
│   │   └── VariableHint
│   │
│   ├── SavedGroups
│   │   ├── SaveButton
│   │   └── GroupChip (dropdown: Load/Append/Delete)
│   │
│   └── Browser
│       ├── PathBar
│       │   ├── Breadcrumbs
│       │   └── ViewToggle (grid/list)
│       └── VirtualGrid
│           ├── FolderTile
│           └── ImageTile
│
├── OutputTab (when active)
│   ├── MainViewer
│   │   ├── ImageDisplay
│   │   ├── ImageMeta
│   │   └── NavButtons
│   │
│   ├── ActionBar
│   │   ├── UseAsRefButton
│   │   ├── CopyButton
│   │   ├── RenameButton
│   │   ├── DuplicateButton
│   │   ├── DeleteButton
│   │   └── OpenFolderButton
│   │
│   ├── ThumbnailStrip
│   │   ├── ScrollButton (left)
│   │   ├── VirtualizedStrip
│   │   │   └── StripThumbnail
│   │   └── ScrollButton (right)
│   │
│   └── FilterBar
│       ├── JobFilter
│       ├── PromptFilter
│       ├── ModelFilter
│       └── DateFilter
│
└── Lightbox (overlay, when open)
    ├── CloseButton
    ├── ImageViewer (pan/zoom)
    ├── InfoPanel (toggle)
    ├── NavArrows
    └── ThumbnailStrip
```

---

## 9. State Synchronization

### 9.1 References ↔ Queue Entry

```typescript
// When selection changes
function onSelectionChange(newSelection: SelectedImage[]) {
  if (state.linkedEntryId) {
    // Auto-save to queue entry
    updateQueueEntry(state.linkedEntryId, {
      references: newSelection.map(toReferencePattern)
    })
  }
}

// When queue entry selection changes
function onQueueEntrySelect(entryId: string) {
  const entry = getQueueEntry(entryId)
  
  setState({
    linkedEntryId: entryId,
    selection: entry.references.map(toSelectedImage)
  })
}
```

### 9.2 Output Gallery ↔ File System

```typescript
// Watch output directory for changes
function watchOutputDirectory() {
  const watcher = chokidar.watch(CONFIG.outputDir, {
    ignoreInitial: true
  })
  
  watcher.on('add', (path) => {
    // New file generated
    const image = loadGeneratedImage(path)
    prependToGallery(image)
  })
  
  watcher.on('unlink', (path) => {
    // File deleted externally
    removeFromGallery(path)
  })
  
  watcher.on('change', (path) => {
    // File modified (renamed)
    refreshGalleryItem(path)
  })
}
```

---

## 10. Performance

### 10.1 Lazy Loading

```typescript
// Browser: load thumbnails only in viewport
// Strip: load visible + 5 on each side
// Gallery: load full image only for current

const THUMBNAIL_SIZE = 150       // px, for grid/strip
const PREVIEW_SIZE = 800         // px, for main viewer
const FULL_SIZE = null           // original, for lightbox
```

### 10.2 Caching Strategy

```typescript
interface ImageCache {
  thumbnails: LRUCache<string, string>   // path → base64, limit 500
  previews: LRUCache<string, string>     // path → base64, limit 50
  metadata: Map<string, ImageMetadata>   // path → metadata, no limit
}

// Thumbnails: aggressive caching (small)
// Previews: moderate caching (medium)
// Full size: no caching, load on demand
```

---

*End of Media Panel specification.*
