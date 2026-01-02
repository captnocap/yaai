# Completed

Chronological log of completed features.

---

## 2026-01-02

### Repository Restructure
**Completed**: 2026-01-02
**Commit**: 7bde99a

Tasks completed:
- [x] Move git root from /app to project root
- [x] Include documentation files in repo (ARCHITECTURE.md, CLAUDE.md, specs)
- [x] Update .gitignore for new structure

---

### WebSocket Communication Layer
**Spec**: CLAUDE.md (WebSocket Channels section)
**Completed**: 2026-01-02
**Commit**: f4c8c86

Tasks completed:
- [x] Create ws-server.ts with request/response pattern
- [x] Create ws-client.ts for frontend
- [x] Implement all channel handlers (chat:*, ai:*, settings:*, artifact:*)
- [x] Add streaming support for AI responses

---

### Image Generation Backend
**Spec**: spec-imagegen/SPEC.md
**Completed**: 2026-01-01
**Commit**: 5d9587f

Tasks completed:
- [x] Create api-client.ts
- [x] Implement request-dispatcher.ts
- [x] Add concurrency-limiter.ts
- [x] Add rate-limiter.ts
- [x] Create prompt-processor.ts

---

### Claude Code Integration
**Spec**: FEATURE_OUTLINE.md (Claude Code section)
**Completed**: 2026-01-01
**Commit**: a21dc12

Tasks completed:
- [x] Create Code feature UI components
- [x] Implement session management
- [x] Add snapshot system
- [x] Create Claude Code settings page

---
