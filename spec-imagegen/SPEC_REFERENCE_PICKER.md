# Reference Image Picker — Component Specification

> ⚠️ **SUPERSEDED**: This modal-based spec has been replaced by `SPEC_MEDIA_PANEL.md`  
> The reference picker is now a persistent panel, not a modal.  
> Keeping this file for reference on interaction patterns that still apply.

> Companion to SPEC.md  
> Focused on the reference image selection UX

---

## 1. Overview

The Reference Picker is the primary interface for selecting img2img reference images. It combines:

1. **Directory Browser** — virtual-scrolling grid of images from any folder
2. **Selection Array** — ordered list of selected references with index numbers
3. **Saved Groups** — reusable reference sets

### Core Interactions

| Action | Result |
|--------|--------|
| Click image in browser | Add to end of selection array |
| Click image in selection array | Remove from array |
| Drag in selection array | Reorder (changes index numbers) |
| Save selection | Create named group |
| Load group | Replace/append to selection |

---

## 2. Layout

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Reference Picker                                                    [×] Close  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─ Path Bar ─────────────────────────────────────────────────────────────────┐ │
│  │  $img2img / faces / female                              [↑] [⟳] [⚙]       │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌─ Directory Browser ─────────────────────────────────────────────────────────┐│
│  │                                                                             ││
│  │  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐    ││
│  │  │  📁   │ │  📁   │ │       │ │       │ │       │ │       │ │       │    ││
│  │  │ asian │ │europe │ │ img01 │ │ img02 │ │ img03 │ │ img04 │ │ img05 │    ││
│  │  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘    ││
│  │                                                                             ││
│  │  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐    ││
│  │  │       │ │       │ │       │ │       │ │       │ │       │ │       │    ││
│  │  │ img06 │ │ img07 │ │ img08 │ │ img09 │ │ img10 │ │ img11 │ │ img12 │    ││
│  │  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘    ││
│  │                                                                             ││
│  │  ┌───────┐ ┌───────┐ ┌───────┐                                             ││
│  │  │       │ │       │ │       │                         ▼ scroll for more   ││
│  │  │ img13 │ │ img14 │ │ img15 │                                             ││
│  │  └───────┘ └───────┘ └───────┘                                             ││
│  │                                                                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                 │
│  ┌─ Selection Array ───────────────────────────────────────────────────────────┐│
│  │                                                                             ││
│  │  ┌─ [0] ──┐ ┌─ [1] ──┐ ┌─ [2] ──┐ ┌─ [3] ──┐                              ││
│  │  │       │ │       │ │       │ │       │     ← click to remove            ││
│  │  │ img03 │ │ img07 │ │ img01 │ │ img12 │     ← drag to reorder            ││
│  │  │       │ │       │ │       │ │       │                                   ││
│  │  └────────┘ └────────┘ └────────┘ └────────┘                              ││
│  │                                                                             ││
│  │  Prompt variables:  %img2img[0].name% = "img03"                            ││
│  │                     %img2img[1].name% = "img07"  ...                       ││
│  │                                                                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                 │
│  ┌─ Saved Groups ──────────────────────────────────────────────────────────────┐│
│  │  [+ Save Current]   portrait_refs (4)   landscape_set (2)   test_group (7) ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                 │
│  ┌─ Actions ───────────────────────────────────────────────────────────────────┐│
│  │                                          [Clear All]  [Cancel]  [✓ Apply]  ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Breakdown

### 3.1 Component Tree

```
ReferencePicker
├── PathBar
│   ├── BreadcrumbNav
│   │   └── PathSegment (clickable)
│   ├── UpButton
│   ├── RefreshButton
│   └── SettingsButton (thumbnail size, sort)
│
├── DirectoryBrowser
│   ├── VirtualGrid (@tanstack/react-virtual)
│   │   ├── FolderTile (double-click to enter)
│   │   └── ImageTile
│   │       ├── Thumbnail (lazy-loaded)
│   │       ├── Filename
│   │       └── SelectedOverlay (if in selection)
│   └── EmptyState
│
├── SelectionArray
│   ├── SelectionHeader
│   │   ├── Count ("4 selected")
│   │   └── ClearButton
│   │
│   ├── SortableList (@dnd-kit)
│   │   └── SelectionTile
│   │       ├── IndexBadge [0], [1], [2]...
│   │       ├── Thumbnail
│   │       ├── Filename
│   │       └── RemoveButton (or click whole tile)
│   │
│   └── VariableHint
│       └── "Use %img2img[N].name% in prompt"
│
├── SavedGroups
│   ├── SaveButton (opens name input)
│   └── GroupChip (click to load)
│       ├── Name
│       ├── Count
│       └── DeleteButton (on hover)
│
└── ActionBar
    ├── ClearAllButton
    ├── CancelButton
    └── ApplyButton
```

### 3.2 State

```typescript
interface ReferencePickerState {
  // Navigation
  currentPath: string
  pathHistory: string[]               // for back navigation
  
  // Directory contents (loaded on demand)
  contents: DirectoryContents | null
  loading: boolean
  error: string | null
  
  // Selection (ordered array)
  selection: SelectedImage[]
  
  // Saved groups
  savedGroups: SavedGroup[]
  
  // UI
  thumbnailSize: 'small' | 'medium' | 'large'
  sortBy: 'name' | 'date' | 'size'
  sortDirection: 'asc' | 'desc'
}

interface SelectedImage {
  id: string                          // unique ID for drag/drop
  path: string                        // full file path
  name: string                        // filename without extension
  thumbnail: string | null            // base64, loaded async
}

interface SavedGroup {
  id: string
  name: string
  images: string[]                    // paths
  createdAt: number
}

interface DirectoryContents {
  path: string
  folders: FolderInfo[]
  images: ImageInfo[]
}

interface FolderInfo {
  name: string
  path: string
  imageCount: number                  // recursive count (optional, for badge)
}

interface ImageInfo {
  name: string
  path: string
  size: number
  modifiedAt: number
}
```

---

## 4. Interactions

### 4.1 Directory Navigation

```
User double-clicks folder "asian"
  │
  ▼
┌─────────────────────────────────────┐
│ 1. Push current path to history     │
│ 2. Set currentPath to new path      │
│ 3. Set loading = true               │
│ 4. Call WS: getDirectoryContents()  │
│ 5. On response: set contents        │
│ 6. Set loading = false              │
└─────────────────────────────────────┘
  │
  ▼
Grid re-renders with new contents
Thumbnails load progressively as they enter viewport
```

### 4.2 Image Selection (Add)

```
User clicks image "img03.jpg" in browser
  │
  ▼
┌─────────────────────────────────────┐
│ 1. Check if already in selection    │
│    - If yes: do nothing (or flash)  │
│    - If no: continue                │
│                                     │
│ 2. Create SelectedImage:            │
│    {                                │
│      id: generateId(),              │
│      path: "/full/path/img03.jpg",  │
│      name: "img03",                 │
│      thumbnail: null                │
│    }                                │
│                                     │
│ 3. Append to selection array        │
│                                     │
│ 4. Async: load thumbnail            │
│    - Update selection item          │
│                                     │
│ 5. Visual feedback:                 │
│    - Image in grid shows checkmark  │
│    - Selection array scrolls to end │
│    - New item animates in           │
└─────────────────────────────────────┘
```

### 4.3 Image Removal

```
User clicks image in selection array
  │
  ▼
┌─────────────────────────────────────┐
│ 1. Find item by id                  │
│ 2. Remove from selection array      │
│ 3. Remaining items re-index:        │
│    [0] [1] [2] [3] → [0] [1] [2]   │
│ 4. Animate removal                  │
│ 5. Grid item loses checkmark        │
└─────────────────────────────────────┘
```

### 4.4 Reordering (Drag & Drop)

```
User drags [1] to position [3]
  │
  ▼
┌─────────────────────────────────────┐
│ Before: [0:A] [1:B] [2:C] [3:D]     │
│                                     │
│ Drag [1:B] past [3:D]               │
│                                     │
│ After:  [0:A] [1:C] [2:D] [3:B]     │
│                                     │
│ Index badges update automatically   │
└─────────────────────────────────────┘

This matters because prompt uses:
  %img2img[0].name% = "A"
  %img2img[1].name% = "C"  ← changed!
  %img2img[2].name% = "D"  ← changed!
  %img2img[3].name% = "B"  ← changed!
```

### 4.5 Save Group

```
User clicks [+ Save Current]
  │
  ▼
┌─────────────────────────────────────┐
│ 1. Show inline input for name       │
│ 2. User types "portrait_refs"       │
│ 3. User presses Enter               │
│ 4. Create SavedGroup:               │
│    {                                │
│      id: generateId(),              │
│      name: "portrait_refs",         │
│      images: selection.map(s=>path),│
│      createdAt: Date.now()          │
│    }                                │
│ 5. Persist to storage               │
│ 6. Show in SavedGroups bar          │
└─────────────────────────────────────┘
```

### 4.6 Load Group

```
User clicks group chip "portrait_refs"
  │
  ▼
┌─────────────────────────────────────┐
│ Option A: Replace current selection │
│ Option B: Append to selection       │
│                                     │
│ (If selection not empty, show       │
│  small popover asking which)        │
│                                     │
│ 1. Get paths from saved group       │
│ 2. For each path:                   │
│    - Check file exists              │
│    - Create SelectedImage           │
│    - Add to selection               │
│ 3. Load thumbnails async            │
└─────────────────────────────────────┘
```

---

## 5. Thumbnail Loading Strategy

### 5.1 On-Demand Loading (No Pre-Generation)

```typescript
// Main process handler (WebSocket)
wsServer.onRequest('get-thumbnail', async ({ filePath, size }: { filePath: string; size: number }) => {
  // Use sharp to read and resize on the fly
  const buffer = await sharp(filePath)
    .resize(size, size, { fit: 'cover' })
    .jpeg({ quality: 70 })
    .toBuffer()

  return `data:image/jpeg;base64,${buffer.toString('base64')}`
})
```

### 5.2 Virtual Scroll Integration

```typescript
// Only request thumbnails for items in viewport
const VirtualGrid = ({ items, onLoadThumbnail }) => {
  const parentRef = useRef(null)
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => TILE_SIZE,
    overscan: 5,  // load 5 extra rows for smooth scrolling
  })
  
  return (
    <div ref={parentRef} className="overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index]
          return (
            <ImageTile
              key={item.path}
              item={item}
              onVisible={() => onLoadThumbnail(item.path)}
            />
          )
        })}
      </div>
    </div>
  )
}
```

### 5.3 Thumbnail Cache (In-Memory)

```typescript
// Simple LRU cache for thumbnails
class ThumbnailCache {
  private cache = new Map<string, string>()
  private maxSize = 500  // keep last 500 thumbnails in memory
  
  get(path: string): string | null {
    const value = this.cache.get(path)
    if (value) {
      // Move to end (most recently used)
      this.cache.delete(path)
      this.cache.set(path, value)
    }
    return value || null
  }
  
  set(path: string, base64: string): void {
    if (this.cache.size >= this.maxSize) {
      // Delete oldest (first item)
      const oldest = this.cache.keys().next().value
      this.cache.delete(oldest)
    }
    this.cache.set(path, base64)
  }
}
```

---

## 6. Visual States

### 6.1 Image Tile States

```
┌─────────────────┐
│   UNSELECTED    │
│                 │
│    ┌───────┐    │
│    │       │    │
│    │ thumb │    │
│    │       │    │
│    └───────┘    │
│    filename     │
│                 │
└─────────────────┘

┌─────────────────┐
│   SELECTED      │
│                 │
│    ┌───────┐    │
│    │  ✓    │←── green checkmark overlay
│    │ thumb │    │
│    │       │    │
│    └───────┘    │
│    filename     │   border: green
│                 │
└─────────────────┘

┌─────────────────┐
│   HOVER         │
│                 │
│    ┌───────┐    │
│    │       │    │
│    │ thumb │    │   slight scale up (1.02)
│    │       │    │   shadow
│    └───────┘    │
│    filename     │
│                 │
└─────────────────┘

┌─────────────────┐
│   LOADING       │
│                 │
│    ┌───────┐    │
│    │  ◌    │←── spinner or skeleton
│    │       │    │
│    │       │    │
│    └───────┘    │
│    filename     │
│                 │
└─────────────────┘
```

### 6.2 Selection Tile States

```
┌────────────────────┐
│  [0]    DEFAULT    │
│  ┌──────────────┐  │
│  │              │  │
│  │    thumb     │  │
│  │              │  │
│  └──────────────┘  │
│  filename.jpg      │
└────────────────────┘

┌────────────────────┐
│  [0]    HOVER      │
│  ┌──────────────┐  │
│  │      ×       │←── remove icon appears
│  │    thumb     │  │
│  │              │  │
│  └──────────────┘  │
│  filename.jpg      │   cursor: pointer
└────────────────────┘

┌────────────────────┐
│  [0]    DRAGGING   │
│  ┌──────────────┐  │
│  │              │  │   opacity: 0.5
│  │    thumb     │  │   scale: 1.05
│  │              │  │   shadow: larger
│  └──────────────┘  │
│  filename.jpg      │
└────────────────────┘

       ┌────────┐
       │ [0]    │         Drop indicator
       └────────┘         (insertion line)
           │
   ════════╪════════ ←── shows where item will go
           │
       ┌────────┐
       │ [1]    │
       └────────┘
```

---

## 7. Keyboard Support

| Key | Context | Action |
|-----|---------|--------|
| `Enter` | Image focused in browser | Add to selection |
| `Delete` / `Backspace` | Image focused in selection | Remove from selection |
| `Arrow keys` | Browser grid | Navigate focus |
| `Arrow keys` | Selection array | Navigate focus |
| `Ctrl+A` | Browser | Select all visible |
| `Escape` | Picker open | Close without saving |
| `Ctrl+Enter` | Picker open | Apply and close |
| `Backspace` | Path bar focused | Go up one directory |

---

## 8. Props & Callbacks

```typescript
interface ReferencePickerProps {
  // Initial state
  isOpen: boolean
  initialSelection?: string[]         // paths
  initialPath?: string
  
  // Saved groups (managed externally or internally)
  savedGroups?: SavedGroup[]
  onSaveGroup?: (group: SavedGroup) => void
  onDeleteGroup?: (groupId: string) => void
  
  // Results
  onApply: (selection: SelectedImage[]) => void
  onCancel: () => void
  
  // Optional customization
  maxSelection?: number               // limit selection size
  allowedExtensions?: string[]        // filter file types
  thumbnailSize?: number              // px
}
```

---

## 9. Integration with Queue Entry

When the picker closes with Apply:

```typescript
// In QueueTable, when user clicks References cell
const handleReferencesClick = (entryId: string) => {
  const entry = getEntry(entryId)
  
  openReferencePicker({
    initialSelection: entry.references.flatMap(resolveToExplicitPaths),
    onApply: (selection) => {
      // Convert selection back to ReferencePattern[]
      // For explicit selection, each image is type: 'explicit'
      const patterns: ReferencePattern[] = selection.map(img => ({
        id: generateId(),
        type: 'explicit',
        path: img.path
      }))
      
      updateEntry(entryId, { references: patterns })
    }
  })
}
```

### Mixing Explicit + Wildcards

The picker handles explicit selections. Wildcards (`!folder`, `!!folder`, etc.) are entered via text input or a separate wildcard builder. The final References cell can show:

```
┌─────────────────────────────────────────┐
│ References: 3 images + !poses           │
│                                         │
│ [img03] [img07] [img12]  [!poses]       │
│                           └── wildcard  │
└─────────────────────────────────────────┘
```

---

## 10. Prompt Variable Reference

Display this hint in the SelectionArray area:

```
┌─────────────────────────────────────────────────────────────────┐
│ Reference Variables (use in prompt):                            │
│                                                                 │
│   %img2img[0].name%  →  "img03"      (first selected)          │
│   %img2img[1].name%  →  "img07"      (second selected)         │
│   %img2img.filename% →  "img03.jpg"  (first, with extension)   │
│                                                                 │
│ Example prompt:                                                 │
│   "A portrait in the style of %img2img[0].name%, wearing the   │
│    outfit from %img2img[1].name%"                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. Performance Considerations

| Concern | Mitigation |
|---------|------------|
| Large directories (1000+ images) | Virtual scrolling, only render visible |
| Thumbnail loading | On-demand via WebSocket, LRU cache |
| Deep folder structures | Lazy load, only fetch on expand |
| Many selected images | Array virtualization if > 20 |
| Drag performance | Use CSS transforms, no re-renders during drag |

### Benchmark Targets

- Directory with 500 images: < 200ms to display (thumbnails load async)
- Thumbnail generation: < 50ms per image (sharp is fast)
- Scroll performance: 60fps maintained
- Selection add/remove: < 16ms (single frame)

---

## 12. Error States

```
┌─────────────────────────────────────────────────────────────────┐
│ Directory not found                                             │
│                                                                 │
│    ⚠ The folder "$collection/missing" doesn't exist.           │
│                                                                 │
│    [Go to $img2img root]                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Permission denied                                               │
│                                                                 │
│    🔒 Cannot access "/root/private"                             │
│                                                                 │
│    [Go Back]                                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Image load failed                                               │
│                                                                 │
│    [?] Could not load "corrupted.jpg"                           │
│        File may be corrupted or unsupported format.             │
│                                                                 │
│    [Skip] [Retry]                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 13. Saved Groups Storage

```typescript
// Stored in config.json or separate groups.json
interface SavedGroupsFile {
  version: number
  groups: SavedGroup[]
}

// Example
{
  "version": 1,
  "groups": [
    {
      "id": "grp-abc123",
      "name": "portrait_refs",
      "images": [
        "/home/user/img2img/faces/img03.jpg",
        "/home/user/img2img/faces/img07.jpg",
        "/home/user/img2img/poses/standing.jpg"
      ],
      "createdAt": 1704153600000
    }
  ]
}
```

---

*End of Reference Picker specification.*
