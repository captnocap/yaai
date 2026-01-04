# Variable System Specification

> A flexible, composable system for dynamic text interpolation across chats and prompts.

This directory contains specifications for the variable system, which allows users to:
- Insert dynamic values into messages and prompts
- Create reusable variable definitions (system, app-level, REST APIs, wildcards)
- Preview variable resolution before sending (live mode) or validate at send time (runtime mode)
- Manage variable definitions through an intuitive settings interface

## Specification Files

### [SPEC_VARIABLE_DEFINITION.md](./SPEC_VARIABLE_DEFINITION.md)
**Settings UI & Variable Management**

Covers the settings interface for creating, editing, testing, and deleting variables. Includes:
- Variable definition workflows for each type (system, app-level, wildcard, REST API)
- REST API variable builder (request payload, response parsing, field selection)
- Testing and validation workflows
- Settings page layout and component hierarchy
- Database schema for variable storage
- Encryption of sensitive data (API keys, credentials)

### [SPEC_VARIABLE_USAGE.md](./SPEC_VARIABLE_USAGE.md)
**Chat Input & Variable Blocks**

Covers the runtime behavior of variables in the chat input. Includes:
- Variable syntax detection and block rendering
- Live preview mode (blocks showing loading/resolved/failed states)
- Runtime mode (validation at send time)
- Input component behavior (paste detection, syntax removal, refresh)
- Block components (loading animation, data display, retry button, refresh button)
- Error handling and user feedback
- Per-chat and global settings integration
- WebSocket protocol for variable expansion requests

### [SPEC_VARIABLE_EXPANSION.md](./SPEC_VARIABLE_EXPANSION.md)
**Backend Expansion Engine**

Covers the server-side variable resolution logic. Includes:
- Variable types and resolution strategies
- Recursive expansion with depth limits
- System variable evaluation (time, date, system info)
- App/chat variable lookup
- Wildcard string selection (random, caching, deterministic)
- REST API variable execution (with centralized httpClient for proxy support)
- Arbitrary JavaScript execution (sandboxing, security model)
- Error handling and retry logic
- Performance considerations (parallel vs sequential)
- Caching strategy for expensive variables

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Settings Page                          │
│  (Variable Definition & Management)                     │
│  - Create/Edit/Delete variables                         │
│  - Test REST API variables                              │
│  - Select response fields                               │
│  - Store definitions in database                        │
└─────────────┬───────────────────────────────────────────┘
              │ WebSocket: variable:*
              ▼
┌─────────────────────────────────────────────────────────┐
│          Backend - Variable Store & Expansion           │
│  - Manage variable definitions (CRUD)                   │
│  - Resolve variables recursively                        │
│  - Execute REST API calls                               │
│  - Evaluate JavaScript                                  │
│  - Cache/compute results                                │
└─────────────┬───────────────────────────────────────────┘
              │ WebSocket: variable:expand
              ▼
┌─────────────────────────────────────────────────────────┐
│              Chat Input Component                       │
│  (Variable Usage & Preview)                             │
│  - Detect {{var}} syntax                                │
│  - Show variable blocks (live preview mode)             │
│  - Validate at send time (runtime mode)                 │
│  - Allow refresh/retry per variable                     │
└─────────────────────────────────────────────────────────┘
```

---

## Variable Types & Resolution

| Type | Definition | Resolution | Caching |
|------|-----------|-----------|---------|
| **System** | Built-in (time, date, system info) | Evaluated at expansion time | No |
| **App-level** | User-defined text/values | Looked up from database | No (except REST) |
| **Wildcard String** | Array of text options | Random selection from array | Optional (per-message) |
| **REST API** | URL + payload + field selector | HTTP request + JSON extraction | Optional (configurable) |
| **JavaScript** | Code that returns string | Execute in sandbox | No |

---

## Live Preview vs Runtime Mode

### Live Preview Mode
- **When**: User types variables, real-time expansion
- **Display**: Blocks appear below input showing loading/resolved/error
- **User control**: Can refresh blocks, see data before sending
- **Send**: Message is interpolated with confirmed data
- **Failure**: Individual blocks show error with retry button

### Runtime Mode
- **When**: Only at message send time
- **Display**: No preview blocks, no feedback until send
- **User control**: None until after send attempt
- **Send**: Message only interpolated if ALL variables succeed
- **Failure**: Entire message fails, user sees error and must retry

---

## Settings Integration

### Global Defaults
- {{var}} enabled/disabled (toggle)
- Default mode: live preview or runtime
- Wildcard caching strategy
- REST variable timeout
- JavaScript execution allowed (yes/no)

### Per-Chat Overrides
- {{var}} enabled/disabled (override global)
- Mode: live preview or runtime (override global)
- Available variables (scope which variables visible in this chat)

---

## Security Model

### API Credentials
- Stored encrypted in database (server-side only)
- Never sent to client
- Transmitted over secure WebSocket with SSL

### JavaScript Execution
- Sandboxed execution environment (Node VM or similar)
- Whitelist of allowed APIs
- No access to file system, network (except via REST variables)
- Limited to personal use (Electrobun isolated app)

### Variable Scope
- User-created variables are personal (one user per app instance)
- No sharing between chats unless explicitly defined as app-level
- Variables can reference other variables (recursion controlled)

---

## Development Notes

- Variables are always expanded on the backend (frontend never executes)
- Frontend role is UI, display, user control
- All expansion logic lives in backend variable store
- WebSocket is the only communication channel between frontend and backend
- REST API calls use centralized httpClient (respects proxy configuration)
- Expansion is stateless (same input = same output, except for randomness/time)

---

*End of Variable System overview. See individual spec files for detailed implementation guidance.*
