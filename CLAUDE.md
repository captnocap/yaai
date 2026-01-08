# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YAAI (Yet Another AI Interface) - A desktop AI chat application built with Electrobun (Bun-based Electron alternative). Features 186+ React components, 19 custom hooks, and a comprehensive backend with 91 TypeScript modules across stores, handlers, and services.

**Both frontend and backend work happen in tandem** - features need to work end-to-end, not just exist in isolation.

## Commands

```bash
# From /app directory:
bun install              # Install dependencies
bun run start            # CSS build + electrobun dev (hot reload)
bun run build            # CSS build + electrobun build (production)
bun run css              # One-time Tailwind CSS build
bun run css:watch        # Tailwind CSS watch mode
pkill -f electrobun      # Kill CEF processes before rebuilding
```

## Architecture

### Dual-Process Model

```
┌──────────────────────────────────────────┐
│  Main Process (Bun - src/bun/)           │
├──────────────────────────────────────────┤
│ • WebSocket Server (port 3001)           │
│ • Data Stores (13 stores)                │
│ • AI Provider (multi-provider streaming) │
│ • WS Handlers (13 handler modules)       │
│ • M3A Memory System (5-layer)            │
└───────────────┬──────────────────────────┘
                │ WebSocket
┌───────────────▼──────────────────────────┐
│  Renderer Process (React - src/mainview/)│
├──────────────────────────────────────────┤
│ • 186+ Components (atomic design)        │
│ • 19 Custom Hooks                        │
│ • Workspace Layout (VS Code-style panes) │
│ • Wouter Routing                         │
└──────────────────────────────────────────┘
```

### Backend Source Structure

```
app/src/bun/lib/
├── core/           # Foundation: errors, logger, result, config, types, encryption
├── db/             # DatabaseConnection, migrations
├── stores/         # 13 stores: chat, credential, settings, variable, research, project, draft, proxy...
├── ai/             # AIProvider, streaming, provider configs
├── ws/             # WSServer + 13 handler modules (handlers/)
├── image-gen/      # ImageGenStore, queue, job processing
├── memory/         # M3A 5-layer memory architecture
├── research/       # Research functionality with embeddings
└── variables/      # Variable expansion system
```

### WebSocket Handlers

| Handler | Channels | Purpose |
|---------|----------|---------|
| `chat.ts` | chat:* | Chat CRUD, message management |
| `ai.ts` | ai:* | Streaming responses, model list |
| `parallel-ai.ts` | parallel:* | Multi-model parallel responses |
| `credentials.ts` | credential:* | API key management |
| `models.ts` | model:* | Model configuration |
| `research.ts` | research:* | Research queries, projects |
| `variables.ts` | variable:* | Variable expansion |
| `proxy.ts` | proxy:* | Proxy configuration |
| `claude-code.ts` | code:* | Code execution sessions |
| `drafts.ts` | draft:* | Draft messages |
| `projects.ts` | project:* | Project management |
| `memory.ts` | memory:* | M3A memory operations |

### Frontend Structure

```
app/src/mainview/
├── components/     # 186+ components in 28 directories
│   ├── atoms/      # Avatar, Badge, Chip, Counter, IconButton, Toggle...
│   ├── molecules/  # ActionBar, ModelBadge, TokenMeter, StatusLine...
│   ├── message/    # MessageContainer, MessageBody, MessageActions
│   ├── input/      # InputContainer, AutoTextArea, SendButton
│   ├── chat/       # ChatView, ChatHeader, ChatBody
│   ├── code/       # CodeTab, CodeViewPane, CodeInput, CodeTranscript (8 files + 6 subdirs)
│   ├── image-gen/  # 10 subdirectories
│   ├── research/   # 10 subdirectories (galaxy, cinematic, report)
│   ├── settings/   # 8 subdirectories
│   ├── layout/     # WorkspaceShell, NavigationLayer, ProjectNavigator
│   ├── effects/    # MoodProvider, AmbientBackground, StyledText
│   ├── workbench/  # Prompt library, output panels
│   └── workspace/  # VS Code-style editor groups and panes
├── hooks/          # 19 custom hooks
├── lib/            # ws-client.ts, model-icons.ts, utilities
├── types/          # 15 TypeScript definition files
└── workspace/      # Editor group and pane system
```

## Implementation Specifications

All backend implementation follows detailed specs in `spec-backend/`. Read the relevant spec before implementing any backend feature.

| Spec File | Purpose |
|-----------|---------|
| `SPEC_FOUNDATION.md` | Core patterns, AppError, Logger, Result<T,E>, branded types, config |
| `SPEC_DATABASE.md` | SQLite architecture, migrations, DatabaseConnection class, FTS5 |
| `SPEC_WEBSOCKET.md` | WSServer, WSClient, rate limiting, channel registry |
| `SPEC_CHAT_STORE.md` | ChatStore with SQLite, FTS search, branching, content blocks |
| `SPEC_AI_PROVIDER.md` | Multi-provider (Anthropic/OpenAI/Google), streaming, raw fetch |
| `SPEC_CODE_SESSIONS.md` | CodeSessionStore, snapshots, transcripts, restore points |
| `SPEC_IMAGE_GEN.md` | ImageGenStore, queue groups, jobs, batch requests, gallery |
| `SPEC_ANALYTICS.md` | Event tracking, hourly/daily/monthly rollups, lifetime totals |
| `SPEC_DEFAULT_MODELS.md` | Default model configuration per task type |
| `SPEC_PROXY.md` | Proxy configuration and routing |
| `SPEC_HIGHLIGHT_FEEDBACK.md` | Highlight feedback system |

## Core Patterns

```typescript
// Result type - no throwing errors
type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };

// Branded types for type-safe IDs
type ChatId = string & { readonly __brand: 'ChatId' };
type MessageId = string & { readonly __brand: 'MessageId' };
type SessionId = string & { readonly __brand: 'SessionId' };

// AppError for structured errors
class AppError extends Error {
  constructor(code: string, message: string, context?: Record<string, unknown>);
}
```

## Data Storage

```
~/.yaai/
├── data/
│   ├── chat.sqlite        # Chats, messages, FTS index
│   ├── code.sqlite        # Code sessions, snapshots, transcripts
│   ├── imagegen.sqlite    # Image generation queue and jobs
│   ├── app.sqlite         # Settings, credentials, artifacts
│   └── analytics.sqlite   # Events, rollups, totals
├── blobs/                  # Content-addressed storage (SHA-256)
├── chats/                  # Chat history (JSON, migrating to SQLite)
├── credentials/            # Encrypted API keys
├── code-sessions/          # Code execution history
├── snapshots/              # Restore points
└── backups/
```

## Development Workflow

**Work falls into three categories with different verification needs:**

### 1. Pure UI Work (Iterate Freely)

Frontend/visual work - new components, layout changes, styling:
- Go ahead and iterate, use mocks freely
- Focus on: Does it look right? Does the interaction feel good?

### 2. Backend-to-UI Integration (User Verification Required)

When backend data flows into UI components:
- Implement the connection (hooks consuming endpoints, data binding)
- Then checkpoint: "Start the app and test X, Y, Z"
- **Why**: Things get marked complete but aren't actually connected right

### 3. Pure Backend Work (Test Independently)

Stores, database operations, API handlers:
- Write tests and run scripts - you can verify this yourself
- Use `bun test`, console output, whatever proves it works
- Checkpoint when wiring to frontend (then it becomes category 2)

**Important**: Frontend code using localStorage/sessionStorage is placeholder code. All real data flows through WebSocket from backend stores. Exception marked with:
```typescript
// PRODUCTION: User requested client-side storage for this setting, not a mock
localStorage.setItem('theme', value);
```

## Key Implementation Notes

- **Result<T,E> everywhere** - Never throw, always return Result
- **Branded types for IDs** - Type-safe ChatId, MessageId, SessionId, etc.
- **SQLite WAL mode** - Concurrent reads, single writer
- **FTS5 for search** - Porter stemmer for message full-text search
- **Content-addressed blobs** - SHA-256 hashed storage for snapshots

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Home / chat list |
| `/chat/:id` | Chat view with messages |
| `/code` | Code workspace |
| `/code/:id` | Code session details |
| `/image-gen` | Image generation |
| `/research` | Research features |
| `/workbench` | Prompt library and output |
| `/settings` | Settings hub |
| `/settings/providers` | API provider configuration |
| `/settings/general` | General app settings |
| `/settings/claude-code` | Code execution settings |
| `/settings/shortcuts` | Keyboard shortcuts reference |
| `/settings/variables` | Variable management |

## Custom Hooks

```typescript
useAI()                 // AI streaming and model selection
useSettings()           // Settings management
useChatHistory()        // Chat persistence and history
useCodeSession()        // Code execution sessions
useArtifacts()          // Artifact lifecycle
useImageGen()           // Image generation requests
useProjects()           // Project management
useMemory()             // M3A memory system
useResearch()           // Research functionality
useWorkbench()          // Workbench prompt library
useProviderSettings()   // Provider configuration
useVariables()          // Variable expansion
useParallelAI()         // Parallel multi-model responses
useDraft()              // Draft management
useClaudeCodeConfig()   // Code execution config
useClaudeCodeData()     // Code session data
useEffectsSettings()    // Effects system toggle
useCodeSettings()       // Code-specific settings
```

## Development Notes

- User runs Electrobun app, Claude runs mock API for testing
- Migration from JSON file storage to SQLite in progress
- Frontend hooks ready to consume backend WebSocket endpoints
- Effects system disabled by default (enable in settings)
- Kill CEF processes before rebuilding: `pkill -f electrobun`

---

**Remember**: A feature isn't done when code is written - it's done when it works in the running app. Backend data needs a place to display. UI components need real data to consume. The integration point is where bugs hide.
