# YAAI Component Architecture

This document tracks every component in the system: what it does, where it's used, why it exists, and implementation notes.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Folder Structure](#folder-structure)
3. [Atoms](#atoms)
4. [Text Bricks](#text-bricks)
5. [File Bricks](#file-bricks)
6. [Embed Bricks](#embed-bricks)
7. [Molecules](#molecules)
8. [Message Bricks](#message-bricks)
9. [Response Layouts](#response-layouts)
10. [Input Bricks](#input-bricks)
11. [Token Bricks](#token-bricks)
12. [Memory Bricks](#memory-bricks)
13. [Tool Bricks](#tool-bricks)
14. [Containers](#containers)
15. [Page Assemblies](#page-assemblies)
16. [Effects System](#effects-system)
17. [Animation Patterns](#animation-patterns)
18. [State Management](#state-management)

---

## Design Philosophy

### Why Tiny Components?

1. **Reusability**: A `Badge` appears in message headers, token displays, model selectors, memory indicators - one component, many uses
2. **Consistency**: All badges animate the same way, look the same way, behave the same way
3. **Testing**: Test one `IconButton`, all 47 uses of it are tested
4. **Animation**: CSS animations are per-component - small components = surgical animation control
5. **Performance**: React can skip re-rendering unchanged atoms

### Naming Convention

```
[Domain][Type][Variant]
```

Examples:
- `TokenCounter` - domain: Token, type: Counter
- `FileCard` - domain: File, type: Card
- `MessageHeaderCompact` - domain: Message, type: Header, variant: Compact

### Prop Patterns

All components follow these patterns:
- `className` - always accepted for style overrides
- `size` - 'sm' | 'md' | 'lg' when applicable
- `variant` - visual variants within same component
- `asChild` - Radix pattern for composition

---

## Folder Structure

```
src/mainview/
├── components/
│   ├── atoms/           # Smallest units, no dependencies on other components
│   │   ├── Avatar.tsx
│   │   ├── Badge.tsx
│   │   ├── Chip.tsx
│   │   ├── Counter.tsx
│   │   ├── IconButton.tsx
│   │   ├── Indicator.tsx
│   │   ├── ProgressRing.tsx
│   │   ├── Spinner.tsx
│   │   ├── Timestamp.tsx
│   │   ├── Toggle.tsx
│   │   ├── Tooltip.tsx
│   │   └── index.ts
│   │
│   ├── text/            # Text rendering components
│   │   ├── CodeBlock.tsx
│   │   ├── InlineCode.tsx
│   │   ├── LinkPreview.tsx
│   │   ├── MarkdownBlock.tsx
│   │   ├── MathBlock.tsx
│   │   ├── Mention.tsx
│   │   └── index.ts
│   │
│   ├── file/            # File handling components
│   │   ├── FileCard.tsx
│   │   ├── FileIcon.tsx
│   │   ├── FileInfo.tsx
│   │   ├── FileThumbnail.tsx
│   │   ├── UploadProgress.tsx
│   │   ├── UploadZone.tsx
│   │   └── index.ts
│   │
│   ├── embed/           # Rich content embeds
│   │   ├── BrowserFrame.tsx
│   │   ├── CSVTable.tsx
│   │   ├── HTMLSandbox.tsx
│   │   ├── ImageFrame.tsx
│   │   ├── ReactPreview.tsx
│   │   ├── TerminalBlock.tsx
│   │   ├── VideoFrame.tsx
│   │   └── index.ts
│   │
│   ├── molecules/       # Composite components (2-4 atoms)
│   │   ├── ActionBar.tsx
│   │   ├── ChipList.tsx
│   │   ├── FileCardList.tsx
│   │   ├── MemoryChip.tsx
│   │   ├── ModelBadge.tsx
│   │   ├── StatusLine.tsx
│   │   ├── TokenMeter.tsx
│   │   ├── UserLine.tsx
│   │   └── index.ts
│   │
│   ├── effects/         # Mood-reactive effects system
│   │   ├── AmbientBackground.tsx  # Gradient/orbs/particles
│   │   ├── MoodProvider.tsx       # Context + mood detection
│   │   ├── StyledText.tsx         # Text with effect rules
│   │   └── index.ts
│   │
│   ├── message/         # Message display components
│   │   ├── BranchIndicator.tsx
│   │   ├── LikeBadge.tsx
│   │   ├── MessageActions.tsx
│   │   ├── MessageBody.tsx
│   │   ├── MessageContainer.tsx
│   │   ├── MessageFooter.tsx
│   │   ├── MessageHeader.tsx
│   │   └── index.ts
│   │
│   ├── response/        # Multi-model response layouts
│   │   ├── ResponseCard.tsx
│   │   ├── ResponseSplit.tsx
│   │   ├── ResponseStack.tsx
│   │   ├── ResponseTabs.tsx
│   │   └── index.ts
│   │
│   ├── input/           # Chat input components
│   │   ├── AttachmentTray.tsx
│   │   ├── AutoTextArea.tsx
│   │   ├── InputContainer.tsx
│   │   ├── InputFooter.tsx
│   │   ├── ModelInput.tsx
│   │   ├── PromptSelector.tsx
│   │   ├── SendButton.tsx
│   │   ├── ToolToggle.tsx
│   │   ├── VariableChip.tsx
│   │   └── index.ts
│   │
│   ├── token/           # Token management displays
│   │   ├── TokenBreakdown.tsx
│   │   ├── TokenEstimate.tsx
│   │   ├── TokenTotal.tsx
│   │   └── index.ts
│   │
│   ├── memory/          # Memory system components
│   │   ├── ContextSummary.tsx
│   │   ├── MemoryCard.tsx
│   │   ├── MemoryIndicator.tsx
│   │   ├── MemoryList.tsx
│   │   └── index.ts
│   │
│   ├── tool/            # Tool execution displays
│   │   ├── APICallPreview.tsx
│   │   ├── BrowserStep.tsx
│   │   ├── CodeExecResult.tsx
│   │   ├── TerminalSession.tsx
│   │   ├── ToolCallCard.tsx
│   │   ├── ToolStatus.tsx
│   │   └── index.ts
│   │
│   ├── containers/      # Layout shells
│   │   ├── Collapsible.tsx
│   │   ├── ContextMenu.tsx
│   │   ├── SidePanel.tsx
│   │   ├── SplitPane.tsx
│   │   ├── TabShell.tsx
│   │   ├── VirtualScroll.tsx
│   │   └── index.ts
│   │
│   └── chat/            # Full chat assemblies
│       ├── ChatBody.tsx
│       ├── ChatContainer.tsx
│       ├── ChatHeader.tsx
│       ├── ContextPanel.tsx
│       └── index.ts
│
├── hooks/               # Custom React hooks
│   ├── useAnimation.ts
│   ├── useEffectsSettings.ts  # Mood/effects settings persistence
│   ├── useTokenCount.ts
│   ├── useWebSocket.ts
│   └── index.ts
│
├── styles/              # Global styles and utilities
│   ├── animations.css
│   ├── effects.css      # Mood-reactive CSS effects
│   ├── globals.css
│   └── utilities.css
│
├── lib/                 # Utility functions
│   ├── cn.ts            # classname merge utility
│   ├── format.ts        # formatters (time, bytes, etc.)
│   ├── tokens.ts        # token estimation
│   └── effects/         # Effects system utilities
│       ├── mood-detection.ts  # Mood analysis engine
│       ├── text-processor.ts  # Text effect processing
│       └── index.ts
│
└── types/               # TypeScript types
    ├── chat.ts
    ├── effects.ts       # Mood, TextRule, EffectsSettings types
    ├── file.ts
    ├── memory.ts
    ├── message.ts
    ├── model.ts
    └── tool.ts

```

---

## Atoms

### Avatar

**What**: Circular image/icon display for users and models
**Where**: MessageHeader, UserLine, ModelBadge, settings
**Why**: Consistent identity display across all contexts

```typescript
interface AvatarProps {
  src?: string;              // Image URL
  fallback: string;          // Text fallback (initials or icon name)
  size?: 'sm' | 'md' | 'lg'; // 24px | 32px | 40px
  variant?: 'circle' | 'rounded';
  status?: 'online' | 'busy' | 'offline'; // Optional status indicator
  className?: string;
}
```

**Animation**: Scale bounce on hover, fade-in on load
**Notes**: Uses Radix Avatar under the hood for loading states

---

### Badge

**What**: Small label displaying counts, status, or short text
**Where**: Token displays, model names, notification counts, tags
**Why**: Unified way to show metadata without taking up space

```typescript
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  pulse?: boolean;           // Animated pulse for attention
  className?: string;
}
```

**Animation**: Pulse animation when `pulse=true`, number count-up when value changes
**Notes**: Keep text short - max ~12 characters

---

### Chip

**What**: Removable tag/pill component
**Where**: ChipList (selected models), attachments, prompt variables
**Why**: Editable collections need consistent add/remove UI

```typescript
interface ChipProps {
  children: React.ReactNode;
  onRemove?: () => void;     // If provided, shows X button
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'filled';
  color?: string;            // Custom accent color
  icon?: React.ReactNode;    // Leading icon
  disabled?: boolean;
  className?: string;
}
```

**Animation**: Scale down + fade out on remove, slide in on add
**Notes**: When removable, X button appears on hover

---

### Counter

**What**: Animated number display
**Where**: Token counts, message counts, anywhere numbers change
**Why**: Smooth number transitions feel polished

```typescript
interface CounterProps {
  value: number;
  format?: 'number' | 'compact' | 'bytes'; // 1234 | 1.2K | 1.2 KB
  duration?: number;         // Animation duration in ms
  className?: string;
}
```

**Animation**: Smooth count-up/down between values
**Notes**: Uses CSS counter-increment or JS animation depending on complexity

---

### IconButton

**What**: Button containing only an icon
**Where**: MessageActions, InputFooter, toolbars everywhere
**Why**: Most actions in the UI are icon-only for space efficiency

```typescript
interface IconButtonProps {
  icon: React.ReactNode;     // Lucide icon or custom
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg'; // 28px | 36px | 44px touch target
  variant?: 'ghost' | 'outline' | 'filled';
  tooltip?: string;          // Auto-wraps in Tooltip if provided
  loading?: boolean;         // Shows spinner instead of icon
  disabled?: boolean;
  active?: boolean;          // Toggle state
  className?: string;
}
```

**Animation**: Scale down on press, background fade on hover
**Notes**: Always include tooltip for accessibility

---

### Indicator

**What**: Small status dot
**Where**: Online status, processing state, error markers
**Why**: Quick visual status without text

```typescript
interface IndicatorProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  pulse?: boolean;           // Animated pulse
  size?: 'sm' | 'md';        // 8px | 12px
  className?: string;
}
```

**Animation**: Pulse ring animation when active
**Notes**: Color-blind friendly - use with text labels when critical

---

### ProgressRing

**What**: Circular progress indicator
**Where**: TokenMeter, upload progress, loading states
**Why**: Shows progress without taking horizontal space

```typescript
interface ProgressRingProps {
  value: number;             // 0-100
  max?: number;              // Default 100
  size?: 'sm' | 'md' | 'lg'; // 24px | 36px | 48px
  strokeWidth?: number;
  showValue?: boolean;       // Show number in center
  variant?: 'default' | 'warning' | 'error'; // Color based on value
  className?: string;
}
```

**Animation**: Smooth arc transition on value change
**Notes**: Auto-changes to warning color at 80%, error at 95%

---

### Spinner

**What**: Loading spinner
**Where**: SendButton loading, message streaming, any async operation
**Why**: Consistent loading indication

```typescript
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'; // 16px | 24px | 32px
  className?: string;
}
```

**Animation**: Continuous rotation
**Notes**: Use ProgressRing when progress is known, Spinner when indeterminate

---

### Timestamp

**What**: Formatted time display
**Where**: MessageHeader, MemoryCard, file info
**Why**: Consistent time formatting with relative display

```typescript
interface TimestampProps {
  date: Date | string | number;
  format?: 'relative' | 'time' | 'date' | 'full'; // "2m ago" | "3:45 PM" | "Dec 31" | "Dec 31, 3:45 PM"
  live?: boolean;            // Auto-update relative time
  className?: string;
}
```

**Animation**: None (text changes cause layout shift)
**Notes**: Tooltip shows full datetime on hover

---

### Toggle

**What**: On/off switch
**Where**: Tool toggles, settings, feature flags
**Why**: Binary choices need consistent UI

```typescript
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}
```

**Animation**: Slide + color transition
**Notes**: Uses Radix Switch under the hood

---

### Tooltip

**What**: Hover info popup
**Where**: Wraps IconButtons, truncated text, complex UI elements
**Why**: Provides context without cluttering UI

```typescript
interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;            // ms before showing
  className?: string;
}
```

**Animation**: Fade in + slight slide from side
**Notes**: Uses Radix Tooltip. Keep content concise.

---

## Text Bricks

### MarkdownBlock

**What**: Renders markdown string to styled HTML
**Where**: MessageBody (primary use), MemoryCard summaries
**Why**: All AI responses are markdown

```typescript
interface MarkdownBlockProps {
  content: string;
  allowHtml?: boolean;       // Enable raw HTML (careful!)
  components?: object;       // Custom component overrides
  className?: string;
}
```

**Implementation Notes**:
- Uses `react-markdown` or similar
- Code blocks delegate to `CodeBlock`
- Links get `target="_blank"` by default
- Tables get horizontal scroll wrapper

**Animation**: None on the block itself; child elements may animate

---

### CodeBlock

**What**: Syntax-highlighted code with copy button
**Where**: Inside MarkdownBlock, CodeExecResult, standalone code display
**Why**: Code needs highlighting and easy copying

```typescript
interface CodeBlockProps {
  code: string;
  language?: string;         // Auto-detect if not provided
  showLineNumbers?: boolean;
  highlightLines?: number[]; // Lines to highlight
  maxHeight?: number;        // Scrollable if exceeded
  filename?: string;         // Optional filename header
  className?: string;
}
```

**Animation**: Copy button shows checkmark on success
**Notes**: Use Shiki or Prism for highlighting. Copy button appears on hover.

---

### InlineCode

**What**: Single-line code span
**Where**: Inside paragraphs in MarkdownBlock
**Why**: Inline code styling

```typescript
interface InlineCodeProps {
  children: string;
  className?: string;
}
```

**Animation**: None
**Notes**: Just styled `<code>` tag with background

---

### LinkPreview

**What**: URL display with optional preview metadata
**Where**: MarkdownBlock links (optional upgrade), pasted URLs
**Why**: Rich link display is more useful than plain text

```typescript
interface LinkPreviewProps {
  url: string;
  title?: string;            // Fetched or provided
  favicon?: string;
  description?: string;
  compact?: boolean;         // Just favicon + domain vs full card
  className?: string;
}
```

**Animation**: Fade in when metadata loads
**Notes**: Metadata fetched async via API. Falls back to plain link.

---

### MathBlock

**What**: LaTeX/KaTeX math rendering
**Where**: Inside MarkdownBlock when math delimiters detected
**Why**: AI often outputs mathematical notation

```typescript
interface MathBlockProps {
  content: string;           // LaTeX string
  display?: boolean;         // Block (centered) vs inline
  className?: string;
}
```

**Animation**: None
**Notes**: Uses KaTeX. Display mode for `$$...$$`, inline for `$...$`

---

### Mention

**What**: Highlighted reference to user, file, or variable
**Where**: Inside MarkdownBlock, prompt display
**Why**: Make references visually distinct and clickable

```typescript
interface MentionProps {
  type: 'user' | 'file' | 'variable';
  value: string;             // @username, /path/to/file, {variable}
  onClick?: () => void;
  className?: string;
}
```

**Animation**: Subtle highlight on hover
**Notes**: File mentions open file preview, variable mentions show value

---

## File Bricks

### FileThumbnail

**What**: Visual preview of file content
**Where**: FileCard, AttachmentTray, inline in messages
**Why**: Visual recognition is faster than reading filenames

```typescript
interface FileThumbnailProps {
  file: {
    type: string;            // MIME type
    url?: string;            // Preview URL
    name: string;
  };
  size?: 'sm' | 'md' | 'lg'; // 40px | 64px | 120px
  className?: string;
}
```

**Implementation Notes**:
- Images: Show actual image
- Videos: Show first frame or placeholder
- PDFs: Show first page render
- Code/text: Show syntax-highlighted snippet
- Other: Show FileIcon

**Animation**: Fade in when thumbnail loads

---

### FileIcon

**What**: Icon representing file type
**Where**: FileThumbnail fallback, FileInfo, file lists
**Why**: Visual file type indication

```typescript
interface FileIconProps {
  type: string;              // MIME type or extension
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

**Animation**: None
**Notes**: Maps MIME types to Lucide icons

---

### FileInfo

**What**: Filename + size + type text display
**Where**: FileCard, upload progress, file details
**Why**: Essential file metadata

```typescript
interface FileInfoProps {
  name: string;
  size?: number;             // Bytes
  type?: string;             // MIME type
  truncate?: boolean;        // Truncate long names
  className?: string;
}
```

**Animation**: None
**Notes**: Shows "image/png • 1.2 MB" format

---

### FileCard

**What**: Complete file representation (thumbnail + info + actions)
**Where**: AttachmentTray, file previews, upload queue
**Why**: Standard file display unit

```typescript
interface FileCardProps {
  file: FileObject;
  onRemove?: () => void;
  onClick?: () => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}
```

**Animation**: Slide out on remove
**Notes**: This is a molecule but lives in file/ for organization

---

### UploadZone

**What**: Drag-and-drop file upload area
**Where**: InputContainer, settings (avatar upload)
**Why**: File upload interaction

```typescript
interface UploadZoneProps {
  onFiles: (files: File[]) => void;
  accept?: string[];         // MIME types
  maxSize?: number;          // Max bytes
  multiple?: boolean;
  children?: React.ReactNode; // Custom content
  className?: string;
}
```

**Animation**: Border dash animation when dragging over
**Notes**: Shows visual feedback on drag enter/leave

---

### UploadProgress

**What**: Single file upload progress display
**Where**: AttachmentTray during upload
**Why**: Upload feedback

```typescript
interface UploadProgressProps {
  file: File;
  progress: number;          // 0-100
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
  onCancel?: () => void;
  className?: string;
}
```

**Animation**: Progress bar fill
**Notes**: Replaces FileCard until complete

---

## Embed Bricks

### HTMLSandbox

**What**: Safe iframe for rendering HTML content
**Where**: MessageBody when HTML content detected
**Why**: Render HTML without XSS risk

```typescript
interface HTMLSandboxProps {
  html: string;
  height?: number | 'auto';
  className?: string;
}
```

**Implementation Notes**:
- Uses srcdoc iframe with sandbox restrictions
- No scripts, forms, or navigation
- Communicates resize via postMessage

**Animation**: Fade in when loaded

---

### ReactPreview

**What**: Live React component rendering
**Where**: MessageBody when React code block detected
**Why**: Interactive component previews

```typescript
interface ReactPreviewProps {
  code: string;
  showCode?: boolean;        // Toggle between code and preview
  className?: string;
}
```

**Implementation Notes**:
- Uses Babel standalone for JSX transform
- Sandboxed execution
- Error boundary for crashes
- Toggle shows code vs rendered output

**Animation**: Crossfade between code and preview

---

### CSVTable

**What**: Tabular data display
**Where**: MessageBody when CSV detected, file preview
**Why**: Readable data tables

```typescript
interface CSVTableProps {
  data: string | object[];   // CSV string or parsed data
  maxRows?: number;          // Virtualized if exceeded
  sortable?: boolean;
  className?: string;
}
```

**Animation**: Row highlight on hover
**Notes**: Horizontal scroll for wide tables, sticky header

---

### ImageFrame

**What**: Image display with zoom and download
**Where**: MessageBody images, generated images, file preview
**Why**: Images need interaction (zoom, download)

```typescript
interface ImageFrameProps {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  onZoom?: () => void;       // Opens lightbox
  showActions?: boolean;     // Download, copy, etc.
  className?: string;
}
```

**Animation**: Scale up to lightbox on click
**Notes**: Lazy loading, blurhash placeholder during load

---

### VideoFrame

**What**: Video player wrapper
**Where**: MessageBody videos, file preview
**Why**: Consistent video playback

```typescript
interface VideoFrameProps {
  src: string;
  poster?: string;
  controls?: boolean;
  autoplay?: boolean;
  muted?: boolean;
  className?: string;
}
```

**Animation**: Play button pulse
**Notes**: Custom controls styled to match app

---

### TerminalBlock

**What**: Terminal output display (non-interactive)
**Where**: CodeExecResult, command output in messages
**Why**: Terminal output needs specific styling

```typescript
interface TerminalBlockProps {
  content: string;
  prompt?: string;           // "$ " or custom
  maxHeight?: number;
  className?: string;
}
```

**Animation**: Optional typewriter effect for streaming
**Notes**: Monospace, dark background, ANSI color support

---

### BrowserFrame

**What**: Browser screenshot slideshow
**Where**: Tool display for Playwright actions
**Why**: Show what the AI browser is doing

```typescript
interface BrowserFrameProps {
  screenshots: Array<{
    url: string;
    image: string;
    action?: string;         // "Clicked button", "Typed in input"
  }>;
  currentIndex?: number;
  showControls?: boolean;    // Prev/next/play
  className?: string;
}
```

**Animation**: Crossfade between screenshots
**Notes**: Shows URL bar, action overlay, navigation controls

---

## Molecules

### ActionBar

**What**: Horizontal row of IconButtons
**Where**: MessageActions, InputFooter, toolbars
**Why**: Consistent action button grouping

```typescript
interface ActionBarProps {
  actions: Array<{
    icon: React.ReactNode;
    tooltip: string;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
  }>;
  size?: 'sm' | 'md';
  className?: string;
}
```

**Animation**: Stagger fade-in on mount
**Notes**: Auto-spaces buttons, handles overflow

---

### ChipList

**What**: Editable list of Chips
**Where**: Model selection, tags, categories
**Why**: Multi-select pattern

```typescript
interface ChipListProps {
  items: Array<{ id: string; label: string; color?: string }>;
  onRemove?: (id: string) => void;
  onAdd?: () => void;        // Shows add button if provided
  maxVisible?: number;       // "+N more" after this
  className?: string;
}
```

**Animation**: Chips animate in/out individually
**Notes**: Wraps or scrolls based on container

---

### ModelBadge

**What**: Avatar + model name badge combo
**Where**: MessageHeader, model selector
**Why**: Model identification

```typescript
interface ModelBadgeProps {
  model: {
    id: string;
    name: string;
    avatar?: string;
    provider: string;
  };
  size?: 'sm' | 'md';
  showProvider?: boolean;
  className?: string;
}
```

**Animation**: None
**Notes**: Provider shown as subtle sub-text

---

### TokenMeter

**What**: ProgressRing + Counter + Tooltip combo
**Where**: InputFooter, MessageFooter
**Why**: Token usage at a glance

```typescript
interface TokenMeterProps {
  used: number;
  limit: number;
  breakdown?: {
    system: number;
    memories: number;
    history: number;
    input: number;
  };
  size?: 'sm' | 'md';
  className?: string;
}
```

**Animation**: Ring animates, counter counts up
**Notes**: Tooltip shows breakdown on hover

---

### StatusLine

**What**: Indicator + text + optional Spinner
**Where**: Connection status, processing state, errors
**Why**: Status communication

```typescript
interface StatusLineProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'loading';
  text: string;
  className?: string;
}
```

**Animation**: Fade between states
**Notes**: Loading state shows spinner instead of indicator

---

### UserLine

**What**: Avatar + name + Timestamp row
**Where**: User messages, activity feeds
**Why**: User attribution

```typescript
interface UserLineProps {
  user: { name: string; avatar?: string };
  timestamp?: Date;
  className?: string;
}
```

**Animation**: None
**Notes**: Simpler than MessageHeader, used for user messages

---

### MemoryChip

**What**: Chip + Indicator for attached memory
**Where**: Input area showing attached memories
**Why**: Show what memories are in context

```typescript
interface MemoryChipProps {
  memory: {
    id: string;
    summary: string;
    relevance: number;
  };
  onRemove?: () => void;
  className?: string;
}
```

**Animation**: Pulse when newly attached
**Notes**: Tooltip shows full summary

---

## Message Bricks

### MessageContainer

**What**: Full message wrapper
**Where**: ChatBody list
**Why**: Complete message unit

```typescript
interface MessageContainerProps {
  message: Message;
  showActions?: boolean;
  showBranch?: boolean;
  isStreaming?: boolean;
  className?: string;
}
```

**Composition**:
```
MessageContainer
├── BranchIndicator (if branched)
├── MessageHeader
├── MessageBody
├── AttachmentTray (if has files)
├── ToolCallCard[] (if has tool calls)
├── MessageActions (on hover)
└── MessageFooter
```

**Animation**: Slide in from bottom when new

---

### MessageHeader

**What**: Model/user info row
**Where**: Top of MessageContainer
**Why**: Message attribution

```typescript
interface MessageHeaderProps {
  role: 'user' | 'assistant';
  model?: ModelInfo;         // For assistant messages
  user?: UserInfo;           // For user messages
  timestamp: Date;
  className?: string;
}
```

**Renders**: ModelBadge or UserLine + Timestamp

**Animation**: None

---

### MessageBody

**What**: Message content renderer
**Where**: Middle of MessageContainer
**Why**: Renders content based on type

```typescript
interface MessageBodyProps {
  content: MessageContent;   // string | structured content
  isStreaming?: boolean;
  className?: string;
}
```

**Implementation Notes**:
- Detects content type and delegates to appropriate brick
- Text → MarkdownBlock
- Code → CodeBlock
- HTML → HTMLSandbox
- Images → ImageFrame
- etc.

**Animation**: Typewriter effect when streaming

---

### MessageActions

**What**: ActionBar with message-specific actions
**Where**: Bottom of MessageContainer (hover reveal)
**Why**: Message interactions

```typescript
interface MessageActionsProps {
  messageId: string;
  role: 'user' | 'assistant';
  isLiked?: boolean;
  onCopy: () => void;
  onRegenerate?: () => void;
  onLike?: () => void;
  onSaveToMemory?: () => void;
  onDelete: () => void;
  onBranch?: () => void;
  onExport?: () => void;
  className?: string;
}
```

**Actions vary by role**:
- User: Copy, Edit, Delete
- Assistant: Copy, Regenerate, Like, Save to Memory, Delete, Branch, Export

**Animation**: Fade in on hover, icon animations on click

---

### MessageFooter

**What**: Token count and metadata
**Where**: Bottom of MessageContainer
**Why**: Message-level stats

```typescript
interface MessageFooterProps {
  tokenCount?: number;
  generationTime?: number;   // ms
  className?: string;
}
```

**Animation**: Fade in when data available

---

### LikeBadge

**What**: Indicator that response is "selected" in multi-model
**Where**: ResponseCard in multi-model view
**Why**: Shows which response builds context

```typescript
interface LikeBadgeProps {
  isLiked: boolean;
  onClick?: () => void;
  className?: string;
}
```

**Animation**: Heart fill animation on like

---

### BranchIndicator

**What**: Visual line showing conversation branch
**Where**: Side of MessageContainer when branched
**Why**: Shows conversation tree structure

```typescript
interface BranchIndicatorProps {
  branchId: string;
  depth: number;
  isActive: boolean;
  className?: string;
}
```

**Animation**: Line draws in
**Notes**: Different colors for different branches

---

## Response Layouts

### ResponseCard

**What**: Single model response wrapper in multi-model view
**Where**: Inside ResponseStack/Split/Tabs
**Why**: Consistent multi-response display

```typescript
interface ResponseCardProps {
  response: AssistantMessage;
  isLiked: boolean;
  onLike: () => void;
  compact?: boolean;
  className?: string;
}
```

**Composition**:
```
ResponseCard
├── ModelBadge
├── MessageBody
├── MessageActions
└── LikeBadge
```

---

### ResponseStack

**What**: Vertical list of ResponseCards
**Where**: Multi-model responses (stacked view)
**Why**: See all responses vertically

```typescript
interface ResponseStackProps {
  responses: AssistantMessage[];
  likedId?: string;
  onLike: (id: string) => void;
  className?: string;
}
```

**Animation**: Stagger fade-in

---

### ResponseTabs

**What**: Tabbed ResponseCard view
**Where**: Multi-model responses (tabbed view)
**Why**: Focus on one response at a time

```typescript
interface ResponseTabsProps {
  responses: AssistantMessage[];
  likedId?: string;
  onLike: (id: string) => void;
  className?: string;
}
```

**Composition**:
```
ResponseTabs
├── TabShell
│   ├── Tab (ModelBadge + LikeBadge indicator)
│   └── ...
└── ResponseCard (current tab)
```

---

### ResponseSplit

**What**: Side-by-side ResponseCards
**Where**: Multi-model responses (split view)
**Why**: Direct comparison

```typescript
interface ResponseSplitProps {
  responses: AssistantMessage[]; // Max 2-3
  likedId?: string;
  onLike: (id: string) => void;
  className?: string;
}
```

**Animation**: None (layout only)

---

## Input Bricks

### AutoTextArea

**What**: Auto-resizing textarea
**Where**: InputContainer main input
**Why**: Grows with content

```typescript
interface AutoTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxRows?: number;
  onKeyDown?: (e: KeyboardEvent) => void;
  disabled?: boolean;
  className?: string;
}
```

**Animation**: Smooth height transition

---

### ModelInput

**What**: Text input with +model_name parsing
**Where**: ChatHeader or InputContainer
**Why**: Model selection via typing

```typescript
interface ModelInputProps {
  value: string;
  onChange: (value: string) => void;
  selectedModels: ModelInfo[];
  onModelsChange: (models: ModelInfo[]) => void;
  availableModels: ModelInfo[];
  className?: string;
}
```

**Implementation Notes**:
- Parses `+gpt4 +claude` syntax
- Shows ChipList of selected models
- Autocomplete dropdown on `+` typed

**Animation**: Chips slide in when models added

---

### AttachmentTray

**What**: Horizontal scrolling FileCard list
**Where**: Above input area, inside messages
**Why**: Show attached files

```typescript
interface AttachmentTrayProps {
  files: FileObject[];
  onRemove?: (id: string) => void;
  onAdd?: () => void;        // Shows add button
  className?: string;
}
```

**Animation**: Files slide in from right

---

### InputContainer

**What**: Full input area assembly
**Where**: Bottom of ChatContainer
**Why**: All input functionality

```typescript
interface InputContainerProps {
  onSend: (message: MessageInput) => void;
  disabled?: boolean;
  className?: string;
}
```

**Composition**:
```
InputContainer
├── AttachmentTray
├── ChipList (selected models)
├── MemoryIndicator
├── AutoTextArea
└── InputFooter
    ├── IconButton (attach)
    ├── ToolToggle[]
    ├── TokenEstimate
    ├── TokenTotal
    └── SendButton
```

---

### InputFooter

**What**: Bottom row of input controls
**Where**: Inside InputContainer
**Why**: Input actions and stats

```typescript
interface InputFooterProps {
  onAttach: () => void;
  tools: ToolConfig[];
  onToolToggle: (toolId: string) => void;
  tokenEstimate: number;
  tokenTotal: number;
  tokenLimit: number;
  onSend: () => void;
  canSend: boolean;
  className?: string;
}
```

---

### SendButton

**What**: IconButton + loading state + keyboard hint
**Where**: InputFooter
**Why**: Send action

```typescript
interface SendButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}
```

**Animation**: Press animation, spinner when loading
**Notes**: Shows "⌘↵" hint on hover

---

### ToolToggle

**What**: Toggle + icon for enabling tools
**Where**: InputFooter
**Why**: Tool activation

```typescript
interface ToolToggleProps {
  tool: {
    id: string;
    name: string;
    icon: string;
  };
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
}
```

**Animation**: Icon animates on toggle

---

### PromptSelector

**What**: Dropdown to pick saved prompts
**Where**: ChatHeader
**Why**: Quick prompt switching

```typescript
interface PromptSelectorProps {
  prompts: Prompt[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onManage?: () => void;     // Opens prompt management
  className?: string;
}
```

---

### VariableChip

**What**: Chip showing {variable} in prompt with value
**Where**: Prompt display, prompt editor
**Why**: Variables need special display

```typescript
interface VariableChipProps {
  name: string;              // Without braces
  value?: string;            // Resolved value
  type: 'text' | 'function' | 'api';
  onClick?: () => void;
  className?: string;
}
```

**Animation**: Pulse when value updates
**Notes**: Tooltip shows value/function/endpoint

---

## Token Bricks

### TokenEstimate

**What**: Counter showing estimated tokens for current input
**Where**: InputFooter
**Why**: Pre-send awareness

```typescript
interface TokenEstimateProps {
  tokens: number;
  className?: string;
}
```

**Notes**: Updates as user types (debounced)

---

### TokenTotal

**What**: Counter + ProgressRing for full context
**Where**: InputFooter
**Why**: Context window awareness

```typescript
interface TokenTotalProps {
  used: number;
  limit: number;
  className?: string;
}
```

---

### TokenBreakdown

**What**: Detailed token split view
**Where**: Tooltip on TokenTotal
**Why**: Understanding what's using tokens

```typescript
interface TokenBreakdownProps {
  breakdown: {
    system: number;
    memories: number;
    history: number;
    input: number;
  };
  className?: string;
}
```

**Notes**: Bar chart or list format

---

## Memory Bricks

### MemoryCard

**What**: Single memory item display
**Where**: MemoryList, ContextPanel
**Why**: Memory visualization

```typescript
interface MemoryCardProps {
  memory: {
    id: string;
    summary: string;
    timestamp: Date;
    relevance?: number;
    source: 'auto' | 'manual';
  };
  onClick?: () => void;
  onDelete?: () => void;
  className?: string;
}
```

**Animation**: Fade in, relevance bar animates

---

### MemoryList

**What**: Scrollable list of MemoryCards
**Where**: ContextPanel
**Why**: Browse memories

```typescript
interface MemoryListProps {
  memories: Memory[];
  onSelect?: (id: string) => void;
  className?: string;
}
```

---

### MemoryIndicator

**What**: Badge showing N memories attached
**Where**: InputContainer, ChatHeader
**Why**: Awareness of memory context

```typescript
interface MemoryIndicatorProps {
  count: number;
  onClick?: () => void;      // Opens memory panel
  className?: string;
}
```

**Animation**: Pulse when new memory attached

---

### ContextSummary

**What**: Collapsible current context display
**Where**: ContextPanel top
**Why**: See what AI knows

```typescript
interface ContextSummaryProps {
  summary: string;
  lastUpdated: Date;
  className?: string;
}
```

---

## Tool Bricks

### ToolCallCard

**What**: Collapsible tool invocation display
**Where**: Inside MessageContainer
**Why**: Show tool usage transparency

```typescript
interface ToolCallCardProps {
  tool: {
    name: string;
    input: object;
    output?: object;
    status: 'pending' | 'running' | 'success' | 'error';
    duration?: number;
  };
  defaultExpanded?: boolean;
  className?: string;
}
```

**Composition**:
```
ToolCallCard
├── Collapsible header (tool name + status)
└── Collapsible content
    ├── Input params (CodeBlock)
    └── Output/Result
```

**Animation**: Expand/collapse, status indicator pulse

---

### ToolStatus

**What**: Compact tool status indicator
**Where**: Message during tool execution
**Why**: Quick status check

```typescript
interface ToolStatusProps {
  name: string;
  status: 'running' | 'success' | 'error';
  className?: string;
}
```

---

### APICallPreview

**What**: REST API call display
**Where**: Inside ToolCallCard for API tool
**Why**: API transparency

```typescript
interface APICallPreviewProps {
  method: string;
  url: string;
  status?: number;
  duration?: number;
  className?: string;
}
```

---

### BrowserStep

**What**: Single Playwright action display
**Where**: Inside ToolCallCard for browser tool
**Why**: Browser action log

```typescript
interface BrowserStepProps {
  action: string;            // "click", "type", "navigate"
  target?: string;           // Selector or URL
  screenshot?: string;
  className?: string;
}
```

---

### CodeExecResult

**What**: Code + output display
**Where**: Inside ToolCallCard for code execution
**Why**: Show executed code and results

```typescript
interface CodeExecResultProps {
  code: string;
  language: string;
  output: string;
  exitCode?: number;
  className?: string;
}
```

**Composition**: CodeBlock + TerminalBlock

---

### TerminalSession

**What**: Interactive terminal display
**Where**: Tool display, dedicated terminal view
**Why**: Terminal access feature

```typescript
interface TerminalSessionProps {
  history: Array<{
    command: string;
    output: string;
  }>;
  onCommand?: (cmd: string) => void;
  className?: string;
}
```

---

## Containers

### VirtualScroll

**What**: Windowed list for performance
**Where**: ChatBody, long lists
**Why**: Performance with many messages

```typescript
interface VirtualScrollProps {
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  itemHeight: number | ((index: number) => number);
  overscan?: number;
  className?: string;
}
```

---

### SidePanel

**What**: Collapsible side drawer
**Where**: ContextPanel wrapper
**Why**: Auxiliary content

```typescript
interface SidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: 'left' | 'right';
  width?: number;
  children: React.ReactNode;
  className?: string;
}
```

**Animation**: Slide in/out

---

### SplitPane

**What**: Resizable two-panel layout
**Where**: ResponseSplit, side-by-side views
**Why**: Flexible layouts

```typescript
interface SplitPaneProps {
  children: [React.ReactNode, React.ReactNode];
  direction?: 'horizontal' | 'vertical';
  defaultSplit?: number;     // 0-100 percentage
  minSize?: number;
  className?: string;
}
```

**Animation**: Smooth resize

---

### TabShell

**What**: Tab bar + content area
**Where**: ResponseTabs, settings panels
**Why**: Tabbed navigation

```typescript
interface TabShellProps {
  tabs: Array<{
    id: string;
    label: React.ReactNode;
    content: React.ReactNode;
  }>;
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}
```

**Animation**: Tab indicator slides, content crossfades

---

### Collapsible

**What**: Header + toggle + content
**Where**: ToolCallCard, settings sections
**Why**: Show/hide content

```typescript
interface CollapsibleProps {
  title: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}
```

**Animation**: Height animation with content
**Notes**: Uses Radix Collapsible

---

### ContextMenu

**What**: Right-click menu
**Where**: Messages, files, any right-clickable element
**Why**: Secondary actions

```typescript
interface ContextMenuProps {
  items: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    destructive?: boolean;
  }>;
  children: React.ReactNode;
  className?: string;
}
```

**Animation**: Scale in from click point
**Notes**: Uses Radix ContextMenu

---

## Page Assemblies

### ChatContainer

**What**: Full chat page
**Where**: Main view
**Why**: Top-level chat component

```typescript
interface ChatContainerProps {
  chatId: string;
  className?: string;
}
```

**Composition**:
```
ChatContainer
├── ChatHeader
│   ├── PromptSelector
│   ├── ModelInput
│   ├── title
│   └── ActionBar (settings)
│
├── SplitPane (optional, for context panel)
│   ├── ChatBody (VirtualScroll)
│   │   └── MessageContainer[]
│   │       or ResponseStack/Tabs/Split
│   │
│   └── ContextPanel (SidePanel)
│       ├── ContextSummary
│       └── MemoryList
│
└── InputContainer
```

---

### ChatHeader

**What**: Top bar of chat
**Where**: Top of ChatContainer
**Why**: Chat metadata and controls

---

### ChatBody

**What**: Message list area
**Where**: Middle of ChatContainer
**Why**: Message display

---

### ContextPanel

**What**: Side panel for context agent
**Where**: Right side of ChatContainer
**Why**: Context visibility

---

## Effects System

The effects system provides a mood-reactive layer that can transform the UI based on message content analysis. It consists of three main parts: mood detection, ambient visuals, and text effects.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      MoodProvider                           │
│  (React Context - wraps entire app when effects enabled)    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐    ┌──────────────────────────────┐  │
│  │ Mood Detection   │    │ Theme/Effect State           │  │
│  │ Engine           │───▶│ - currentMood               │  │
│  │ (lib/effects)    │    │ - moodTheme (colors/bg)     │  │
│  └──────────────────┘    │ - textRules (animations)    │  │
│                          └──────────────────────────────┘  │
│                                     │                       │
│                    ┌────────────────┼────────────────┐      │
│                    ▼                ▼                ▼      │
│            ┌────────────┐  ┌────────────────┐  ┌─────────┐ │
│            │ Ambient    │  │ MessageBody    │  │ Input   │ │
│            │ Background │  │ (StyledText)   │  │ Area    │ │
│            └────────────┘  └────────────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

### MoodProvider

**What**: React context provider for mood state and detection
**Where**: App root when effects are enabled
**Why**: Centralized mood state management

```typescript
interface MoodContextValue {
  enabled: boolean;
  currentMood: Mood;
  moodTheme: MoodTheme;
  textRules: TextRule[];
  analyzeMood: (text: string) => void;
  setMood: (mood: Mood) => void;
}

// Exported hooks
useMood()         // Full context
useCurrentMood()  // Just the mood value
useMoodTheme()    // Just the theme object
useTextRules()    // Just the text rules array
```

**Implementation Notes**:
- Debounces mood analysis to prevent rapid changes
- Interpolates between moods for smooth transitions
- Stores mood history for potential pattern detection

---

### Mood Detection Engine

**Location**: `lib/effects/mood-detection.ts`
**What**: Analyzes text to determine emotional tone
**Why**: Automatic UI adaptation based on content

```typescript
// Core types
type Mood = 'neutral' | 'happy' | 'excited' | 'calm' | 'focused' | 'creative' | 'serious' | 'playful';

interface MoodSignal {
  mood: Mood;
  confidence: number;  // 0-1
  source: 'keyword' | 'emoji' | 'punctuation' | 'pattern';
}

// Main functions
detectMood(text: string): MoodSignal[]
detectKeywordSignals(text: string): MoodSignal[]
interpolateThemes(from: MoodTheme, to: MoodTheme, progress: number): MoodTheme
```

**Detection Sources**:
- **Keywords**: Words associated with moods ("amazing", "thinking", "urgent")
- **Emojis**: Direct mood indicators (😊 → happy, 🔥 → excited)
- **Punctuation**: Multiple exclamation marks → excited, ellipsis → thoughtful
- **Patterns**: Code blocks → focused, questions → curious

---

### MoodTheme

**What**: Visual theme derived from current mood
**Where**: Applied via CSS custom properties
**Why**: Mood-reactive styling

```typescript
interface MoodTheme {
  // Background gradients
  background: {
    gradient: string;        // CSS gradient
    orbs: OrbConfig[];       // Floating ambient orbs
    particles: boolean;      // Enable particles
  };

  // Color overrides
  colors: {
    accent: string;
    accentSubtle: string;
    textPrimary?: string;
  };

  // Animation modifiers
  animation: {
    speed: number;           // 0.5 = slow, 1 = normal, 2 = fast
    intensity: number;       // 0 = subtle, 1 = normal, 2 = dramatic
  };
}

// Preset themes
const DEFAULT_MOOD_THEMES: Record<Mood, MoodTheme>;
```

---

### AmbientBackground

**What**: Animated background layer with gradients, orbs, and particles
**Where**: Behind main content (z-index: -1)
**Why**: Visual mood atmosphere

```typescript
interface AmbientBackgroundProps {
  theme: MoodTheme;
  className?: string;
}
```

**Layers**:
1. **Gradient Base**: Radial/linear gradient from theme
2. **Ambient Orbs**: Floating colored circles with blur
3. **Particles**: Optional floating particles (for excited/playful moods)

**Performance Notes**:
- Uses CSS animations (GPU accelerated)
- Particles rendered with CSS, not canvas
- Orbs limited to 3-5 for performance
- Respects `prefers-reduced-motion`

**Animation**: Smooth interpolation between themes on mood change

---

### TextRule

**What**: Rule-based text effect configuration
**Where**: Applied via StyledText component
**Why**: Word/phrase-level visual effects

```typescript
interface TextRule {
  id: string;
  match: string | RegExp;    // What to match
  effect: TextEffect;        // Effect to apply
  priority?: number;         // Higher = applied first
  enabled?: boolean;
}

type TextEffect =
  | { type: 'color'; value: string }
  | { type: 'gradient'; from: string; to: string; direction?: string }
  | { type: 'glow'; color: string; intensity?: number }
  | { type: 'shake'; intensity?: 'light' | 'medium' | 'heavy' }
  | { type: 'rainbow' }
  | { type: 'wave'; speed?: number }
  | { type: 'glitch' }
  | { type: 'typewriter'; speed?: number }
  | { type: 'highlight'; color: string };
```

**Preset Rules**:
```typescript
const PRESET_TEXT_RULES: TextRule[] = [
  { id: 'important', match: /\*\*(.+?)\*\*/g, effect: { type: 'glow', color: 'var(--color-accent)' } },
  { id: 'error', match: /error|fail|crash/gi, effect: { type: 'shake', intensity: 'light' } },
  { id: 'code-inline', match: /`(.+?)`/g, effect: { type: 'highlight', color: 'var(--color-bg-tertiary)' } },
];
```

---

### StyledText

**What**: Component that applies TextRules to text content
**Where**: Inside MarkdownBlock paragraphs/spans
**Why**: Render text with mood-based effects

```typescript
interface StyledTextProps {
  children: string;
  rules: TextRule[];
  enabled?: boolean;
  className?: string;
}
```

**Implementation Notes**:
- Parses text and applies matching rules
- Wraps matched segments in styled spans
- Handles overlapping rules via priority
- Falls through to plain text when disabled

**Exported Variants**:
```typescript
// Pre-configured effect components
WaveText       // Text with wave animation
TypewriterText // Typewriter reveal effect
GlitchText     // Glitch/distortion effect
```

---

### Text Effect Processor

**Location**: `lib/effects/text-processor.ts`
**What**: Utility for processing text with rules
**Why**: Shared logic for text effect application

```typescript
// Core functions
processText(text: string, rules: TextRule[]): ProcessedSegment[]
hasAnyMatch(text: string, rules: TextRule[]): boolean
createTextRule(match: string | RegExp, effect: TextEffect): TextRule

interface ProcessedSegment {
  text: string;
  effect?: TextEffect;
  original?: string;  // If transformed (e.g., stripped markdown)
}
```

---

### useEffectsSettings Hook

**What**: Persistent settings for effects system
**Where**: Settings panel, MoodProvider
**Why**: User control over effects

```typescript
interface EffectsSettings {
  enabled: boolean;           // Master toggle
  ambientBackground: boolean; // Background effects
  textEffects: boolean;       // Text animations
  particles: boolean;         // Particle effects
  autoMood: boolean;          // Auto-detect mood
  animationSpeed: number;     // 0.5-2x
  reducedMotion: boolean;     // Accessibility
}

function useEffectsSettings(): {
  settings: EffectsSettings;
  updateSettings: (partial: Partial<EffectsSettings>) => void;
  resetSettings: () => void;
}
```

**Storage**: localStorage with `yaai:effects-settings` key

---

### CSS Effect Classes

**Location**: `styles/effects.css`
**What**: CSS classes for mood-reactive styling
**Why**: Hook points for effects in components

```css
/* Component hook classes */
.mood-message-bubble    /* Applied to MessageContainer */
.mood-input-area        /* Applied to InputContainer */
.mood-background        /* Applied to AmbientBackground */

/* Text effect classes */
.text-effect-shake      /* Shake animation */
.text-effect-wave       /* Wave animation */
.text-effect-glow       /* Glow effect */
.text-effect-rainbow    /* Rainbow gradient */
.text-effect-glitch     /* Glitch distortion */
.text-effect-typewriter /* Typewriter reveal */

/* Utility classes */
.mood-transition        /* Smooth mood transitions */
.reduced-motion         /* Respects prefers-reduced-motion */
```

---

### Integration Points

**MessageContainer** (`message/MessageContainer.tsx`):
- Receives `textRules` and `moodEnabled` props
- Applies `.mood-message-bubble` class
- Sets `data-mood-enabled` attribute
- Passes effects to MessageBody

**MessageBody** (`message/MessageBody.tsx`):
- Receives `textRules` and `effectsEnabled` props
- Passes to MarkdownBlock for text content

**MarkdownBlock** (`text/MarkdownBlock.tsx`):
- Uses StyledText for text content when effects enabled
- Custom renderers for p, strong, em, li apply TextWithEffects

**InputContainer** (`input/InputContainer.tsx`):
- Receives `moodEnabled` prop
- Applies `.mood-input-area` class
- Sets `data-mood-enabled` attribute

---

### Performance Considerations

1. **Debounced Analysis**: Mood detection debounced to 300ms
2. **CSS Animations**: All effects use GPU-accelerated CSS
3. **Conditional Rendering**: Effects components skip render when disabled
4. **Reduced Motion**: Respects `prefers-reduced-motion` media query
5. **Lazy Loading**: Effects components can be code-split

---

## Animation Patterns

### Standard Durations

```css
--duration-instant: 100ms;  /* Micro-interactions */
--duration-fast: 150ms;     /* Hovers, toggles */
--duration-normal: 250ms;   /* Most transitions */
--duration-slow: 400ms;     /* Page transitions, modals */
```

### Standard Easings

```css
--ease-out: cubic-bezier(0.33, 1, 0.68, 1);        /* Decelerate */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);    /* Smooth */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Bouncy */
```

### Common Patterns

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| Fade | Show/hide | opacity 0→1 |
| Slide | Panels, messages | transform translateX/Y |
| Scale | Buttons, cards | transform scale |
| Stagger | Lists | animation-delay per item |
| Typewriter | Streaming text | character reveal |
| Count | Numbers | interpolate values |
| Draw | Lines, progress | stroke-dashoffset |
| Pulse | Attention | scale + opacity loop |

---

## State Management

### Global State (Zustand or similar)

```typescript
// Stores
chatStore       // Current chat, messages, streaming state
modelStore      // Available models, selected models
memoryStore     // Memories, context summary
settingsStore   // User preferences
toolStore       // Tool configurations, execution state
```

### Local State

- UI state (hover, focus, expanded) stays in components
- Form state stays in form components
- Animation state handled by CSS or Framer Motion

### WebSocket Events

```typescript
// From server
'message:new'        // New message received
'message:stream'     // Streaming chunk
'message:complete'   // Stream finished
'memory:update'      // Memory changed
'tool:status'        // Tool execution update
'context:update'     // Context summary updated

// To server
'message:send'       // Send user message
'message:regenerate' // Regenerate response
'message:like'       // Like response (multi-model)
'memory:save'        // Manually save to memory
'tool:execute'       // Execute tool
```

---

## Quick Reference

### Component Dependencies

```
atoms          → (nothing)
text           → atoms, effects
file           → atoms
embed          → atoms, text
molecules      → atoms
effects        → atoms (StyledText uses spans)
message        → atoms, molecules, text, file, embed, effects
response       → message, molecules, containers
input          → atoms, molecules, file, effects
token          → atoms
memory         → atoms, molecules
tool           → atoms, molecules, text, embed
containers     → atoms
chat           → (everything including effects)
```

### File Naming

- Components: PascalCase (`Avatar.tsx`)
- Hooks: camelCase with `use` prefix (`useTokenCount.ts`)
- Utils: camelCase (`formatBytes.ts`)
- Types: PascalCase (`Message.ts` or in `types/message.ts`)
- CSS: kebab-case (`animations.css`)
