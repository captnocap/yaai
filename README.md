# YAAI - Yet Another AI Interface

A desktop AI chat application built with Electrobun (Bun + CEF), featuring a layered workspace layout, mood-reactive UI, and an extensible artifact system for persistent, invocable tools.

## Tech Stack

- **Runtime**: [Electrobun](https://electrobun.dev/) (Bun-based Electron alternative using CEF)
- **Frontend**: React 18 + TypeScript
- **Styling**: CSS Variables + Inline Styles (no external CSS framework)
- **Build**: Bun bundler via Electrobun

## Quick Start

```bash
# Install dependencies
bun install

# Build (dev mode)
bun run build:dev

# Run the app (in a separate terminal)
bun run start
```

> **Note**: Kill any existing CEF processes before starting: `pkill -f electrobun`

## Architecture

### Layered Z-Index System

The workspace uses a four-layer z-index system where each layer has distinct responsibilities:

```
┌─────────────────────────────────────────────────────────┐
│                    Overlay (z-4)                        │
│  Settings panels, modals, dialogs - slides over all    │
├─────────────────────────────────────────────────────────┤
│                    Artifact (z-3)                       │
│  Dockable/floatable panel for outputs, previews        │
├───────────┬─────────────────────────────────────────────┤
│ Nav (z-1) │              Content (z-2)                  │
│           │  Main chat area - reactive to other layers  │
│ Sidebar   │  Squishes/expands based on nav & artifact   │
│           │                                             │
└───────────┴─────────────────────────────────────────────┘
```

- **Navigation Layer (z-1)**: Collapsible sidebar, expands on hover
- **Content Layer (z-2)**: Chat messages + input, reacts to nav/artifact sizing
- **Artifact Layer (z-3)**: Dockable (left/right/top/bottom), floatable, resizable
- **Overlay Layer (z-4)**: Modal system with slide/fade/zoom animations

### Key Layout Files

```
src/mainview/components/layout/
├── WorkspaceShell.tsx      # Main orchestrator for all layers
├── NavigationLayer.tsx     # Sidebar content (logo, nav items, chat list)
├── useWorkspaceLayout.ts   # State management hook + context
└── index.ts
```

## Component Structure

```
src/mainview/
├── components/
│   ├── atoms/          # Primitives (Avatar, Badge, Chip, Toggle, etc.)
│   ├── molecules/      # Composites (ModelBadge, TokenMeter, StatusLine)
│   ├── text/           # Text rendering (CodeBlock, MarkdownBlock, MathBlock)
│   ├── file/           # File handling (FileCard, UploadZone, FileThumbnail)
│   ├── message/        # Chat messages (MessageContainer, MessageBody, etc.)
│   ├── input/          # Input area (InputContainer, AutoTextArea, ToolToggle)
│   ├── effects/        # Mood system (MoodProvider, AmbientBackground)
│   ├── layout/         # Workspace layout (see above)
│   └── artifact/       # Artifact system (see below)
├── types/              # TypeScript interfaces
├── lib/                # Utilities (cn, format, mood-detection)
├── hooks/              # Custom hooks
├── styles/             # Global CSS (variables, animations)
└── index.tsx           # App entry point with demo data
```

## Artifact System

Artifacts are persistent, invocable tools created during chat sessions. They can be tools, views, services, or prompts.

### Types

```typescript
type ArtifactType = 'tool' | 'view' | 'service' | 'prompt';
type ArtifactStatus = 'installing' | 'installed' | 'running' | 'error' | 'disabled';
```

### Components

```
src/mainview/components/artifact/
├── ArtifactCard.tsx      # Displays artifact metadata, status, actions
├── ArtifactList.tsx      # Filterable/searchable list with type filters
├── ArtifactRenderer.tsx  # Sandboxed iframe for artifact UI components
├── ArtifactManager.tsx   # Orchestrates list/detail/output views
└── index.ts
```

### Key Interfaces (from `types/artifact.ts`)

```typescript
// Artifact metadata
interface ArtifactManifest {
  id: string;
  name: string;
  description: string;
  type: ArtifactType;
  version: string;
  entry: string;        // Handler module path
  ui?: string;          // Optional UI component path
  apis?: string[];      // Required credentials
  // ... more fields
}

// Handler interface
interface ArtifactHandler<TInput, TOutput> {
  execute(input: TInput, context: ExecutionContext): Promise<TOutput>;
  onInstall?(context): Promise<void>;
  onUninstall?(context): Promise<void>;
  validate?(input: TInput): ValidationResult;
}

// Execution context provided to handlers
interface ExecutionContext {
  apis: Record<string, AuthenticatedClient>;  // Pre-authenticated API clients
  artifacts: ArtifactInvoker;                 // Invoke other artifacts
  storage: ArtifactStorage;                   // Key-value storage
  logger: ArtifactLogger;
  signal: AbortSignal;
  // ... metadata
}
```

### Planned Architecture

- **Storage**: `~/.yaai/artifacts/{artifact-id}/`
- **Sandboxing**: Bun Workers for handler execution
- **UI Rendering**: Sandboxed iframe with CSP restrictions
- **Hot Reload**: File watcher for development

## Current State

### Implemented

- [x] Layered workspace layout system
- [x] Navigation sidebar with expand/collapse/hover
- [x] Artifact panel with dock modes (left/right/top/bottom/float)
- [x] Panel resize handles and drag-to-move (float mode)
- [x] Overlay/modal system with animations
- [x] Component library (atoms, molecules, text, file, message, input)
- [x] Mood detection system (disabled by default in demo)
- [x] Artifact type definitions
- [x] ArtifactCard, ArtifactList, ArtifactRenderer, ArtifactManager components
- [x] Sandboxed iframe rendering with postMessage bridge

### Not Yet Implemented

- [ ] Server-side artifact registry
- [ ] Artifact loader (Bun Worker sandboxing)
- [ ] Credential store
- [ ] File watcher for hot reload
- [ ] Artifact installation flow
- [ ] Input form for artifact parameters
- [ ] Multi-panel artifacts (e.g., terminal + preview)
- [ ] Actual chat/AI integration
- [ ] Persistence (chat history, settings)

## File Structure

```
app/
├── src/
│   ├── bun/
│   │   └── index.ts              # Electrobun main process
│   └── mainview/
│       ├── components/           # React components
│       ├── types/                # TypeScript definitions
│       ├── lib/                  # Utilities
│       ├── hooks/                # Custom hooks
│       ├── styles/               # CSS files
│       ├── index.tsx             # App entry + demo
│       └── index.html            # HTML template
├── build/                        # Build output (gitignored)
├── electrobun.config.ts          # Electrobun configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Design Tokens

CSS variables are defined in `styles/globals.css`:

```css
--color-bg: #0a0a0a;
--color-bg-secondary: #141414;
--color-bg-tertiary: #1a1a1a;
--color-text: #e5e5e5;
--color-accent: #06b6d4;          /* Cyan/teal */
--color-success: #22c55e;
--color-warning: #f59e0b;
--color-error: #ef4444;
--radius-sm/md/lg: 4px/8px/12px;
```

## Development Notes

- The app runs on desktop only (Electrobun/CEF)
- Effects/mood system is disabled in demo to prevent render loops
- Mock data is used throughout for demonstration
- Process management: kill CEF processes before rebuilding

## Repository

https://github.com/captnocap/yaai
