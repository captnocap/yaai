# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YAAI (Yet Another AI Interface) - A desktop AI chat application built with Electrobun (Bun-based Electron alternative). The frontend React foundation (70+ components) exists alongside ongoing backend implementation per the spec-backend specifications. **Both frontend and backend work happen in tandem** - features need to work end-to-end, not just exist in isolation.

## Commands

```bash
# From /app directory:
bun install              # Install dependencies
bun run start            # CSS build + electrobun dev (hot reload)
bun run build            # CSS build + electrobun build (production)
pkill -f electrobun      # Kill CEF processes before rebuilding
```

## Implementation Specifications

All backend implementation follows detailed specs in `spec-backend/`. Read the relevant spec before implementing any backend feature.

| Spec File | Purpose | Status |
|-----------|---------|--------|
| `SPEC_FOUNDATION.md` | Core patterns, AppError, Logger, Result<T,E>, branded types, config | To implement |
| `SPEC_DATABASE.md` | SQLite architecture, migrations, DatabaseConnection class, FTS5 | To implement |
| `SPEC_WEBSOCKET.md` | WSServer, WSClient, rate limiting, channel registry | To implement |
| `SPEC_CHAT_STORE.md` | ChatStore with SQLite, FTS search, branching, content blocks | To implement |
| `SPEC_AI_PROVIDER.md` | Multi-provider (Anthropic/OpenAI/Google), streaming, raw fetch | To implement |
| `SPEC_CODE_SESSIONS.md` | CodeSessionStore, snapshots, transcripts, restore points | To implement |
| `SPEC_IMAGE_GEN.md` | ImageGenStore, queue groups, jobs, batch requests, gallery | To implement |
| `SPEC_ANALYTICS.md` | Event tracking, hourly/daily/monthly rollups, lifetime totals | To implement |
| `SPEC_DEFAULT_MODELS.md` | Default model configuration per task type | To implement |

## Backend Architecture

### Core Patterns (SPEC_FOUNDATION.md)

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

### Database Architecture (SPEC_DATABASE.md)

SQLite with WAL mode, separate databases per concern:

```
~/.yaai/
├── data/
│   ├── chat.sqlite        # Chats, messages, FTS index
│   ├── code.sqlite        # Code sessions, snapshots, transcripts
│   ├── imagegen.sqlite    # Image generation queue and jobs
│   ├── app.sqlite         # Settings, credentials, artifacts
│   └── analytics.sqlite   # Events, rollups, totals
├── blobs/                  # Content-addressed storage (SHA-256)
└── backups/
```

### Backend Source Structure

```
app/src/bun/lib/
├── core/           # Foundation: errors, logger, result, config, types
├── db/             # DatabaseConnection, migrations, query builders
├── stores/         # ChatStore, SettingsStore, CredentialStore
├── ai/             # AIProvider, streaming, provider configs
├── ws/             # WSServer, handlers, rate limiting
└── image-gen/      # ImageGenStore, queue, job processing
```

### WebSocket Protocol (SPEC_WEBSOCKET.md)

Request/response with correlation IDs on port 3001:

```typescript
// Channel pattern: domain:action
'chat:list' | 'chat:create' | 'chat:get-messages' | 'chat:add-message'
'ai:chat-stream' | 'ai:cancel' | 'ai:models'
'settings:get-all' | 'settings:update'
'code:session-create' | 'code:snapshot-create'
'imagegen:submit' | 'imagegen:queue-status'
```

### AI Provider (SPEC_AI_PROVIDER.md)

Multi-provider with raw fetch (no SDK dependencies):

- **Anthropic**: Claude models, streaming via SSE
- **OpenAI**: GPT models, streaming via SSE
- **Google**: Gemini models, streaming via SSE

Key features: retry with exponential backoff, tool calling support, error mapping to AppError.

## Frontend Reference

The frontend has 70+ components but is **not frozen** - UI work continues as needed. Components may need adjustment, new features, or fixes as the product evolves.

- **Hooks**: `useAI()`, `useChatHistory()`, `useSettings()`, `useArtifacts()`
- **WebSocket Client**: `src/mainview/lib/ws-client.ts`
- **Components**: `src/mainview/components/` (70+ components)

## Development Workflow

**Work falls into three categories with different verification needs:**

### 1. Pure UI Work (Iterate Freely)

When the task is strictly frontend/visual - new components, layout changes, styling, UI polish:

- **Go ahead and iterate** - write code, experiment, refine
- **Use mocks freely** - stub data, fake responses, whatever makes it run
- **Focus on**: Does it look right? Is it what we want? Does the interaction feel good?
- **No backend dependency** - we're evaluating the UI itself

### 2. Backend-to-UI Integration (User Verification Required)

When backend data flows into UI components - this is where things silently break:

- **Implement the connection** (hooks consuming endpoints, data binding, state updates)
- **Then stop and checkpoint**: "I think this should work - start the app and test X, Y, Z"
- **Expect to verify**: specific flows, data appearing where expected, interactions working
- **Why**: Things get marked complete but aren't actually connected right. Data objects from the backend may have no place in the UI. We catch this by running the app.

### 3. Pure Backend Work (Test Independently)

When the work is strictly backend - stores, database operations, API handlers, data processing:

- **Write tests and run scripts** - you can verify this yourself
- **No eyes needed** - this is logic, not visuals
- **Use bun test, console output, whatever proves it works**
- **Checkpoint when wiring to frontend** (then it becomes category 2)

**Important**: If you see frontend code storing data in localStorage, sessionStorage, or using inline mock data - that's placeholder code to demonstrate intent. It does NOT reflect the actual implementation pattern. All real data flows through the WebSocket from backend stores. Assume any client-side persistence you find was mocked up to show what we wanted, not how we fetch or store it.

**Exception**: If we explicitly decide a setting should live client-side as the real implementation, mark it with an inline comment:
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
- **Buffered analytics** - Events buffered, aggregates pre-computed

## Development Notes

- User runs Electrobun app, Claude runs mock API for testing
- Migration from JSON file storage to SQLite in progress
- Frontend hooks ready to consume backend WebSocket endpoints

---

**Remember**: A feature isn't done when code is written - it's done when it works in the running app. Backend data needs a place to display. UI components need real data to consume. The integration point is where bugs hide.
