# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YAAI (Yet Another AI Interface) - A desktop AI chat application built with Electrobun (Bun-based Electron alternative). **Current Phase: Backend Implementation** - The frontend React foundation (70+ components) is complete. Focus is now on implementing backend systems per the spec-backend specifications.

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

## Frontend Reference (Stable)

The frontend is complete and stable. Reference only when wiring up backend:

- **Hooks**: `useAI()`, `useChatHistory()`, `useSettings()`, `useArtifacts()`
- **WebSocket Client**: `src/mainview/lib/ws-client.ts`
- **Components**: `src/mainview/components/` (70+ components)

## Development Workflow

1. **Read the spec** - Each backend feature has a detailed spec in `spec-backend/`
2. **Implement in isolation** - Backend code in `app/src/bun/lib/`
3. **Wire to WebSocket** - Register handlers in `app/src/bun/ws/`
4. **Connect to frontend** - Update hooks to use new endpoints

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
