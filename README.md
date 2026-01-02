# YAAI - Yet Another AI Interface

A production-grade desktop AI chat application built with **Electrobun** (Bun-based Electron alternative), featuring a comprehensive artifact/plugin system, layered workspace layout, and 117+ production-ready React components with heavy CSS animations.

## Quick Start

```bash
cd app
bun install              # Install dependencies
bun run start            # Dev server with hot reload (CSS build + electrobun dev)
bun run build            # Production build (CSS + executable)
```

### Development Setup

- **Runtime**: Electrobun (requires Bun)
- **Main Process**: Bun TypeScript
- **UI Process**: React 19 + TypeScript
- **Styling**: Tailwind CSS 3 with CSS animations

### Important: Kill CEF processes before rebuilding
```bash
pkill -f electrobun
```

---

## Project Structure

```
yaai/
├── app/                          # Main Electrobun application
│   ├── src/
│   │   ├── bun/                 # Main process (WebSocket server, data stores, artifact system)
│   │   │   ├── index.ts         # Entry point, WS initialization
│   │   │   └── lib/             # 16 utility modules (ws-server, AI provider, stores, etc.)
│   │   │
│   │   ├── shared/              # Shared types between frontend and backend
│   │   │   └── ws-protocol.ts   # WebSocket message protocol types
│   │   │
│   │   └── mainview/            # React renderer (UI, components, routing)
│   │       ├── components/      # 117+ components organized by atomic design
│   │       ├── hooks/           # 9 custom hooks (useArtifacts, useAI, useSettings, etc.)
│   │       ├── router/          # Wouter-based routing
│   │       ├── lib/             # Utilities including WebSocket client
│   │       ├── types/           # 15 TypeScript definition files
│   │       └── styles/          # Tailwind CSS + keyframe animations
│   │
│   ├── examples/                # Example artifact (hello-world/)
│   ├── package.json             # ~35 dependencies
│   ├── electrobun.config.ts     # Build configuration
│   ├── tailwind.config.ts       # Tailwind setup
│   └── README.md                # Detailed app documentation (280 lines)
│
├── CLAUDE.md                     # Development guide & build commands
├── ARCHITECTURE.md               # Deep architecture documentation
├── FEATURE_OUTLINE.md            # Feature tracker (implemented/in-progress/planned)
├── settings.md                   # Settings system documentation
└── spec-*/ directories          # Feature specifications
```

---

## Architecture Overview

### Dual-Process Model

```
┌──────────────────────────────────────────┐
│  Main Process (Bun - src/bun/)           │
├──────────────────────────────────────────┤
│ • Artifact System (Registry, Loader)     │
│ • Data Stores (Chat, Settings, Creds)    │
│ • AI Provider (LLM streaming)            │
│ • WebSocket Server (port 3001)           │
│ • WS Handlers (artifact:*, chat:*, ai:*) │
└───────────────┬──────────────────────────┘
                │ WebSocket
┌───────────────▼──────────────────────────┐
│  Renderer Process (React - src/mainview/)│
├──────────────────────────────────────────┤
│ • Router: /, /chat/:id, /code, /settings/*
│ • 117+ Components (atoms → molecules → UI)
│ • 9 Custom Hooks (state management)      │
│ • Effects System (mood-based visuals)    │
└──────────────────────────────────────────┘
```

### Four-Layer Workspace Layout

Each layer has independent z-index and handles different concerns:

| Layer | Z-Index | Purpose | Components |
|-------|---------|---------|-----------|
| **Overlay** | z-4 | Modals, settings, dialogs | Slide over everything |
| **Artifacts** | z-3 | Dockable/floating panels | Left, right, top, bottom, floating |
| **Content** | z-2 | Main chat/code area | Reactive to nav/artifact sizing |
| **Navigation** | z-1 | Collapsible sidebar | Logo, nav items, chat list |

---

## Key Features

### 1. **Artifact System** (Extensible Plugin Architecture)
- **Types**: tool, view, service, prompt
- **Lifecycle**: install → enable/disable → uninstall
- **Execution Context**: Pre-authenticated APIs, storage, logging, abort signals
- **Handler**: TypeScript module with `execute()` and optional hooks
- **UI**: Optional React component (rendered in sandboxed iframe)
- **Storage**: `~/.yaai/artifacts/` (manifest + handler + UI)

### 2. **Data Stores**
- **Chat History**: JSON files in `~/.yaai/chats/`
- **Settings**: `~/.yaai/settings.json`
- **Credentials**: Encrypted API keys in `~/.yaai/credentials/`
- **Code Sessions**: Execution history in `~/.yaai/code-sessions/`
- **Snapshots**: Restore points in `~/.yaai/snapshots/`

### 3. **AI Integration**
- Supports Claude, OpenAI, and custom providers
- Streaming responses with token counting
- Per-message provider selection
- API key management via credential store

### 4. **Component Library** (70+ Production Components)

**Atoms**: Avatar, Badge, Chip, Counter, IconButton, Indicator, ProgressRing, Spinner, Timestamp, Toggle, Tooltip

**Molecules**: ActionBar, ChipList, MemoryChip, ModelBadge, StatusLine, TokenMeter, UserLine

**Domain Components**:
- `text/`: CodeBlock, MarkdownBlock, MathBlock
- `file/`: FileCard, FileThumbnail, UploadZone
- `message/`: MessageContainer, MessageBody, MessageActions
- `input/`: InputContainer, AutoTextArea, SendButton
- `artifact/`: ArtifactCard, ArtifactList, ArtifactRenderer, ArtifactManager
- `chat/`: ChatView, ChatHeader, ChatBody
- `code/`: CodeTab with nested components (prompt, restore, settings, viewer, transcript, sidebar)
- `settings/`: SettingsPage with sections (general, providers, claude-code, shortcuts)
- `layout/`: WorkspaceShell, NavigationLayer
- `effects/`: MoodProvider, AmbientBackground, StyledText (mood-based visual effects)

### 5. **Code Execution** (Claude Code Integration)
- Session-based execution with snapshots
- Transcript history
- Restore points for reproducibility
- Code output parsing

### 6. **Effects System** (Disabled by Default)
- Mood detection from message content
- Emotion-based theming (colors, gradients, animation speed)
- Visual effects: glow, shake, rainbow text, wave animations

---

## Technology Stack

| Category | Technologies |
|----------|---------------|
| **Runtime** | Electrobun, Bun |
| **Language** | TypeScript 5.4+ (strict mode) |
| **UI Framework** | React 19, Wouter (routing) |
| **UI Primitives** | Radix UI |
| **Styling** | Tailwind CSS 3, custom CSS |
| **Icons** | Lucide React, Simple Icons |
| **Markdown** | react-markdown + rehype-highlight + remark-gfm |
| **Storage** | File system + JSON (encrypted credentials) |

---

## Main Process Modules (`src/bun/lib/`)

| Module | Purpose | Size |
|--------|---------|------|
| `ai-provider.ts` | LLM integration & streaming | 21 KB |
| `artifact-registry.ts` | CRUD operations for artifacts | 15.7 KB |
| `artifact-loader.ts` | Handler execution & context building | 19.9 KB |
| `artifact-worker.ts` | Bun Worker sandbox | 10.6 KB |
| `artifact-watcher.ts` | Hot reload file monitoring | 9.2 KB |
| `chat-store.ts` | Chat history persistence | 9.3 KB |
| `code-session-manager.ts` | Code execution sessions | 19.1 KB |
| `code-session-store.ts` | Session persistence | 8.7 KB |
| `credential-store.ts` | Encrypted API key storage | 11.7 KB |
| `settings-store.ts` | Application settings | 8.3 KB |
| `snapshot-manager.ts` | Save/restore execution state | 12.7 KB |
| `output-parser.ts` | Parse Claude code output | 9.9 KB |
| `ui-bundler.ts` | Bundle artifact UIs with Bun.build | 7.9 KB |
| `paths.ts` | `~/.yaai/` directory utilities | 6.1 KB |

---

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Home page / chat list |
| `/chat/:id` | Chat view with messages |
| `/code` | Code workspace |
| `/code/:id` | Code session details |
| `/settings` | Settings hub |
| `/settings/providers` | API provider configuration |
| `/settings/general` | General app settings |
| `/settings/shortcuts` | Keyboard shortcuts reference |

---

## Build Commands

```bash
# From /app directory:
bun run start            # Dev: CSS watch + electrobun dev (hot reload)
bun run build            # Prod: CSS build + electrobun build
bun run build:dev        # Dev build with optimizations
bun run css              # One-time Tailwind CSS build
bun run css:watch        # Tailwind CSS watch mode
```

---

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Development guide, build setup, project overview
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed architecture, artifact system, WebSocket flow
- **[FEATURE_OUTLINE.md](./FEATURE_OUTLINE.md)** - Feature tracker (implemented ✅ / in-progress 🔨 / planned 📋)
- **[settings.md](./settings.md)** - Settings system architecture
- **[app/README.md](./app/README.md)** - Detailed app documentation

---

## Development Notes

- **Development Mode**: User runs Electron app, Claude runs mock API for testing
- **Effects System**: Disabled by default to prevent render loops (can be enabled in settings)
- **Artifact Execution**: Runs in Bun Worker sandbox with execution context
- **Hot Reload**: CSS and Tailwind changes reload automatically in dev mode
- **Type Safety**: Full TypeScript with strict mode enabled

---

## Example Artifact

See `app/examples/hello-world/` for a reference implementation:
- `manifest.json` - Artifact metadata
- `handler.ts` - Execution logic with storage & logging
- `index.tsx` - React UI component (sandboxed iframe)

---

## License

TBD

---

## Troubleshooting

**CEF process not shutting down?**
```bash
pkill -f electrobun
```

**Changes not reflecting in dev mode?**
Restart dev server:
```bash
pkill -f electrobun
bun run start
```

**Build failing?**
Ensure dependencies are installed:
```bash
cd app && bun install
```
