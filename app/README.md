# YAAI - Yet Another AI Interface

A desktop AI chat application built with Electrobun (Bun + CEF), featuring a layered workspace layout, mood-reactive UI, and an extensible artifact system for persistent, invocable tools.

## Tech Stack

- **Runtime**: [Electrobun](https://electrobun.dev/) (Bun-based Electron alternative using CEF)
- **Frontend**: React 19 + TypeScript 5.4+
- **Routing**: Wouter 3.9.0
- **Styling**: Tailwind CSS 3 + CSS custom properties + keyframe animations
- **UI Primitives**: Radix UI
- **Icons**: Lucide React, Simple Icons
- **Markdown**: react-markdown + rehype-highlight + remark-gfm
- **Build**: Bun bundler via Electrobun

## Quick Start

```bash
# Install dependencies
bun install

# Start dev server (CSS watch + Electrobun dev with hot reload)
bun run start

# Or build for production
bun run build
```

**Build Commands:**
- `bun run start` - Dev mode with hot reload (CSS build + electrobun dev)
- `bun run build` - Production build
- `bun run build:dev` - Dev build with optimizations
- `bun run css` - One-time Tailwind CSS build
- `bun run css:watch` - Tailwind CSS watch mode

> **Note**: Kill any existing CEF processes before rebuilding: `pkill -f electrobun`

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
├── components/          # 117+ production components
│   ├── atoms/          # Primitives (Avatar, Badge, Chip, Counter, IconButton, etc.)
│   ├── molecules/      # Composites (ActionBar, ChipList, ModelBadge, TokenMeter, etc.)
│   ├── text/           # Text rendering (CodeBlock, MarkdownBlock, MathBlock)
│   ├── file/           # File handling (FileCard, UploadZone, FileThumbnail)
│   ├── message/        # Chat messages (MessageContainer, MessageBody, MessageActions)
│   ├── input/          # Input area (InputContainer, AutoTextArea, SendButton)
│   ├── artifact/       # Artifact system (ArtifactCard, ArtifactList, Manager, Renderer)
│   ├── chat/           # Chat UI (ChatView, ChatHeader, ChatBody)
│   ├── code/           # Code execution (CodeTab, Prompt, Viewer, Transcript, Restore, Sidebar)
│   ├── settings/       # Settings page (SettingsPage, General, Providers, Shortcuts, ClaudeCode)
│   ├── layout/         # Workspace layout (WorkspaceShell, NavigationLayer)
│   ├── effects/        # Mood system (MoodProvider, AmbientBackground, StyledText)
│   └── ... (20+ total categories)
├── hooks/               # 9 custom hooks (useArtifacts, useAI, useSettings, useChatHistory, etc.)
├── router/             # Wouter routing (routes, RouterProvider)
├── types/              # 15 TypeScript definition files (artifact, chat, code-session, etc.)
├── lib/                # Utilities (cn, format, effects)
├── styles/             # Global CSS (globals.css, animations.css, effects.css)
└── index.tsx           # App entry point
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

### Server-Side Infrastructure (Bun Main Process)

```
src/bun/
├── index.ts            # Main process, WebSocket handlers initialization
└── lib/
    ├── ws-server.ts             # Bun native WebSocket server
    ├── artifact-registry.ts     # CRUD operations, file storage, events
    ├── artifact-loader.ts       # Handler execution, context building
    ├── artifact-worker.ts       # Bun Worker sandbox execution
    ├── artifact-watcher.ts      # File watcher for hot reload
    ├── ai-provider.ts           # LLM integration (Claude, OpenAI, etc.)
    ├── chat-store.ts            # Chat history persistence
    ├── settings-store.ts        # Application settings
    ├── credential-store.ts      # Encrypted API key storage
    ├── code-session-manager.ts  # Code execution session management
    ├── code-session-store.ts    # Code session persistence
    ├── snapshot-manager.ts      # Save/restore execution snapshots
    ├── output-parser.ts         # Parse Claude code output
    ├── ui-bundler.ts            # Bundle artifact UIs with Bun.build
    ├── paths.ts                 # Path utilities for ~/.yaai/ data dirs
    └── index.ts
```

**Data Storage:**
```
~/.yaai/
├── artifacts/           # Artifact manifests, handlers, UIs
├── credentials/         # Encrypted API keys
├── chats/              # Chat history (JSON)
├── code-sessions/      # Code execution history
├── snapshots/          # Restore points
├── cache/              # Temporary caches
└── logs/               # Application logs
```

### Frontend Hook

```typescript
import { useArtifacts } from './hooks';

function MyComponent() {
  const {
    artifacts,     // ArtifactWithStatus[]
    loading,
    executing,     // Set<string> - currently running
    results,       // Map<string, ArtifactExecutionResult>
    invoke,        // (id, input?) => Promise<Result>
    install,
    uninstall,
    enable,
    disable,
  } = useArtifacts();
}
```

### Example Artifact

See `examples/hello-world/` for a complete example:
- `manifest.json` - Artifact metadata
- `handler.ts` - Execution logic with storage, logging
- `index.tsx` - React UI component

## Current State

### ✅ Fully Implemented

**Layout & Workspace:**
- [x] Layered z-index workspace system (4 layers with independent concerns)
- [x] Navigation sidebar with expand/collapse/hover
- [x] Artifact panel with dock modes (left/right/top/bottom/float)
- [x] Panel resize handles and drag-to-move in float mode
- [x] Overlay/modal system with slide/fade/zoom animations

**Components:**
- [x] 117+ production-grade React components
- [x] Atomic design: atoms, molecules, domain components, assemblies
- [x] Component categories: text, file, message, input, artifact, chat, code, settings, layout, effects

**Artifact System:**
- [x] Artifact type definitions (tool, view, service, prompt)
- [x] ArtifactCard, ArtifactList, ArtifactRenderer, ArtifactManager
- [x] Sandboxed iframe rendering with postMessage bridge (for artifact UI ↔ renderer)
- [x] Bun Worker sandboxing for handler execution
- [x] Server-side artifact registry with file storage
- [x] Artifact loader with timeout/retry/caching
- [x] File watcher for hot reload (ArtifactWatcher)
- [x] UI bundling with Bun.build
- [x] useArtifacts React hook
- [x] Example hello-world artifact

**Data & Persistence:**
- [x] ChatStore - Chat history persistence
- [x] SettingsStore - Application settings
- [x] CredentialStore - Encrypted API key storage with authenticated HTTP clients
- [x] CodeSessionManager - Code execution session management
- [x] SnapshotManager - Save/restore execution state
- [x] WebSocket server for frontend-backend communication (port 3001)

**AI Integration:**
- [x] AIProvider - LLM integration (Claude, OpenAI, custom)
- [x] Streaming response support
- [x] Token counting
- [x] Per-message provider selection

**Code Execution:**
- [x] Code session management with transcript history
- [x] Code output parsing
- [x] Snapshot save/restore functionality
- [x] Execution settings UI

**UI/UX:**
- [x] Mood detection system (disabled by default to prevent render loops)
- [x] Mood-based theming with animation speeds
- [x] Effects: glow, shake, rainbow text, wave animations
- [x] Heavy CSS animations throughout (transitions, microinteractions)

**Developer Experience:**
- [x] Full TypeScript with strict mode
- [x] Hot reload in dev mode (CSS + Tailwind)
- [x] React DevTools support
- [x] Comprehensive type definitions
- [x] Custom hooks for all major features

### 🔄 Partially Implemented / In Development

- [ ] OAuth token refresh flow (credential infrastructure exists, refresh logic pending)
- [ ] Full AI chat integration (AIProvider exists, UI integration needs work)
- [ ] Multi-panel artifacts (architecture supports it, UI not yet built)

### 📋 Not Yet Implemented

- [ ] Real-time collaboration features
- [ ] User authentication/accounts
- [ ] Plugin marketplace/distribution
- [ ] VS Code extension integration

## File Structure

```
app/
├── src/
│   ├── bun/
│   │   ├── index.ts                      # Electrobun main process + WebSocket
│   │   └── lib/                          # 16 utility modules (~210 KB)
│   │       ├── artifact-registry.ts      # CRUD operations
│   │       ├── artifact-loader.ts        # Handler execution
│   │       ├── artifact-worker.ts        # Worker sandbox
│   │       ├── artifact-watcher.ts       # Hot reload
│   │       ├── ai-provider.ts            # LLM integration
│   │       ├── chat-store.ts             # Chat persistence
│   │       ├── settings-store.ts         # Settings
│   │       ├── credential-store.ts       # Encrypted keys
│   │       ├── code-session-manager.ts   # Code execution
│   │       ├── code-session-store.ts     # Session persistence
│   │       ├── snapshot-manager.ts       # State snapshots
│   │       ├── output-parser.ts          # Output parsing
│   │       ├── ui-bundler.ts             # Artifact UI bundling
│   │       ├── paths.ts                  # Path utilities
│   │       └── index.ts
│   │
│   └── mainview/
│       ├── components/           # 117+ components (21 categories)
│       ├── hooks/                # 9 custom hooks
│       ├── router/               # Wouter routing
│       ├── types/                # 15 TypeScript definition files
│       ├── lib/                  # Utilities
│       ├── styles/               # CSS files (globals, animations, effects)
│       ├── index.tsx             # App entry point
│       └── index.html            # HTML template
│
├── examples/
│   └── hello-world/              # Example artifact
│       ├── manifest.json
│       ├── handler.ts
│       └── index.tsx
│
├── build/                        # Build output (gitignored)
├── node_modules/                 # Dependencies
├── electrobun.config.ts          # Electrobun configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── postcss.config.js             # PostCSS configuration
├── package.json                  # ~35 dependencies
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

## Routing

The app uses **Wouter** for client-side routing:

```
/                    - Home page / chat list
/chat/:id           - Chat view with messages
/code               - Code workspace
/code/:id           - Code session details
/settings           - Settings root
/settings/providers - API provider configuration
/settings/general   - General app settings
/settings/shortcuts - Keyboard shortcuts reference
```

## Custom Hooks

```typescript
useArtifacts()          // Artifact CRUD & invocation
useAI()                 // LLM provider & streaming
useSettings()           // Settings persistence
useChatHistory()        // Chat loading/saving
useCodeSession()        // Code session management
useCodeSettings()       // Code execution options
useClaudeCodeConfig()   // Claude Code configuration
useEffectsSettings()    // Mood/effects preferences
useWorkspaceLayout()    // Workspace state management
```

## Development Notes

- **Desktop Only**: Runs on Electrobun/CEF (no web version)
- **Effects System**: Disabled by default in demo to prevent render loops (can be enabled in settings)
- **Mock API**: Development mode runs with mock API data
- **Hot Reload**: CSS and Tailwind changes reflect immediately in dev mode
- **Process Management**: Kill CEF processes before rebuilding (`pkill -f electrobun`)
- **Type Safety**: Full TypeScript with strict mode enabled throughout
- **Component Library**: 117+ production-grade components with heavy CSS animations
- **Artifact Execution**: Handlers run in isolated Bun Workers with execution context

## Key Architectural Decisions

1. **Bun Workers** - Handler code runs in isolated workers for security
2. **WebSocket Communication** - All frontend-backend communication via WebSocket (port 3001)
3. **PostMessage Bridge** - Artifact UIs communicate via iframe postMessage (sandboxed)
4. **File-Based Storage** - All data persists to `~/.yaai/` (portable, no database)
5. **CSS-First Design** - Heavy use of Tailwind + custom keyframes for smooth animations
6. **Browser Compatible** - WebSocket architecture enables future browser-only mode
7. **Dual-Process Model** - Clean separation between main (Bun) and renderer (React)
