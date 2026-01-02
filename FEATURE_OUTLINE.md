# YAAI Feature Tracker (SSoT)

> Last updated: January 2, 2026

## Legend

- ✅ Done (in codebase, functional)
- 🔨 In Progress (partially implemented)
- 📋 Planned (designed, not started)
- 💡 Idea (needs more design)
- ⏸️ Deferred (nice to have, later)

---

## Core Infrastructure

| Feature | Status | Notes |
|---------|--------|-------|
| Electrobun + Bun runtime | ✅ | Working |
| WebSocket architecture | ✅ | Bun native WS server (port 3001) |
| WebSocket handlers | ✅ | Frontend ↔ backend communication |
| File storage paths | ✅ | `~/.yaai/` structure |
| Credential store | ✅ | Encrypted storage for API keys |
| Logging system | 📋 | Defined, needs implementation |
| Config system | 📋 | |
| Background workers | 📋 | For memory summarization, tasks |
| Scheduler | 📋 | For periodic tasks (Turnstiles) |

---

## Layout & Shell

| Feature | Status | Notes |
|---------|--------|-------|
| 4-layer z-index system | ✅ | Nav / Content / Artifact / Overlay |
| Navigation sidebar (expand/collapse/hover) | ✅ | |
| Artifact panel (dock left/right/top/bottom) | ✅ | |
| Artifact panel (float mode) | ✅ | Drag + resize |
| Overlay/modal system | ✅ | Slide/fade/zoom animations |
| Panel resize handles | ✅ | |
| Settings panel | 🔨 | Shell exists, content TBD |

---

## Component Library

| Feature | Status | Notes |
|---------|--------|-------|
| Atoms (Avatar, Badge, Chip, Toggle, etc.) | ✅ | |
| Molecules (ModelBadge, TokenMeter, StatusLine) | ✅ | |
| Text rendering (CodeBlock, Markdown, Math) | ✅ | |
| File components (FileCard, UploadZone, Thumbnail) | ✅ | |
| Message components (Container, Body, etc.) | ✅ | |
| Input components | ✅ | |
| Mood/effects system | ✅ | Disabled by default |

---

## Artifact System

| Feature | Status | Notes |
|---------|--------|-------|
| Manifest-based architecture | ✅ | Tool / View / Service / Prompt types |
| ArtifactCard, ArtifactList, ArtifactRenderer | ✅ | |
| ArtifactManager | ✅ | |
| Artifact registry (server-side) | ✅ | Install/uninstall/enable/disable |
| Sandboxed iframe rendering | ✅ | postMessage bridge |
| useArtifacts hook | ✅ | |
| Artifact loader (timeout/retry/cache) | ✅ | |
| Bun Worker sandboxing | 📋 | Currently runs directly |
| UI component bundling | 📋 | esbuild/Bun.build |
| Hot reload (file watcher) | 📋 | |
| Artifact install flow UI | 📋 | |
| Input form for artifact params | 📋 | |

---

## Chat Core

| Feature | Status | Notes |
|---------|--------|-------|
| Message display | ✅ | Demo/static |
| Streaming responses | 📋 | |
| Model provider integration | 📋 | Anthropic, OpenAI, etc. |
| Token estimation (input) | 🔨 | UI exists, hardcoded value |
| Token counting (output) | 📋 | |
| Generation time display | ✅ | In demo |
| Chat history persistence | 📋 | Path structure exists |
| Export (markdown, HTML, JSON) | 📋 | |

---

## Multi-Model

| Feature | Status | Notes |
|---------|--------|-------|
| Model selector UI | 🔨 | Badge exists |
| `+model_name` syntax | 📋 | Target multiple models |
| Parallel requests | 📋 | |
| Response display (stack/side-by-side/tabs) | 📋 | |
| "Like" to select for context | 📋 | Winner continues thread |

---

## Memory System

| Feature | Status | Notes |
|---------|--------|-------|
| Vector DB integration | 📋 | |
| Background summarization worker | 📋 | |
| Memory retrieval on new message | 📋 | |
| Manual "save to memory" | 📋 | |
| Per-chat vs global memory scope | 📋 | |

---

## Context Summary (Shadow Persona)

| Feature | Status | Notes |
|---------|--------|-------|
| Summary panel (sidebar) | 📋 | Visible, editable |
| Intention prompt | 📋 | "Track code only", "mood/state", etc. |
| Auto-update triggers (every N / manual) | 📋 | |
| Append vs Replace mode | 💡 | Infer from intention or explicit? |
| isPinned (stop auto-updates) | 📋 | User took control |
| Version history | 💡 | Undo / see evolution |
| "Branch to new chat" action | 📋 | Seed new chat from summary |
| Multi-summary merge | 💡 | Pull from multiple chats |
| Summary model selection | 📋 | Can use cheaper/faster model |

---

## Attachments

| Feature | Status | Notes |
|---------|--------|-------|
| File upload UI | 🔨 | UploadZone exists |
| File storage | 📋 | |
| Thumbnails/previews | ✅ | Components exist |
| Text extraction | 📋 | PDF, DOCX, etc. |
| `/path/to/file` syntax | 📋 | Reference filesystem directly |
| Vision proxy | 📋 | Route images to vision model for non-vision models |

---

## Prompt Management

| Feature | Status | Notes |
|---------|--------|-------|
| Save/load prompts | 📋 | |
| Prompt variables (static) | 📋 | `{{name}}` replacement |
| Prompt variables (dynamic JS) | 📋 | Functions returning strings |
| Prompt variables (REST API) | 📋 | Fetch external data |
| Prompt templates | 📋 | |

---

## Tools Integration

| Feature | Status | Notes |
|---------|--------|-------|
| REST API tool (DataSource) | 📋 | Lightweight, no MCP overhead |
| File read/write | 📋 | |
| Web fetch (simple) | 📋 | |
| Playwright browser | ⏸️ | Complex — slideshow + control + fallback |
| Code execution (sandbox) | 📋 | |
| Terminal access | 📋 | Show AI terminal to user |

---

## Document Editor (Forge Mode)

| Feature | Status | Notes |
|---------|--------|-------|
| Monaco editor integration | 📋 | |
| Document as artifact type | 📋 | |
| Text selection → AI actions | 📋 | Ask, Rewrite, Insert |
| Rewrite options (simplify, expand, tone) | 📋 | |
| Version history | 💡 | |
| Export | 📋 | |

---

## Real-Time Data (DataSources)

| Feature | Status | Notes |
|---------|--------|-------|
| DataSource definition UI | 📋 | Name, endpoint, headers, mapping |
| Inject mode (always in context) | 📋 | |
| Pull mode (model requests it) | 📋 | |
| Refresh interval | 📋 | For inject mode |

---

## Turnstiles (Scheduled Tasks)

| Feature | Status | Notes |
|---------|--------|-------|
| Task definition | ⏸️ | Lower priority |
| Schedule (cron/interval/manual) | ⏸️ | |
| Step sequencing | ⏸️ | |
| Notifications | ⏸️ | |

---

## Remote / Collaboration

| Feature | Status | Notes |
|---------|--------|-------|
| Mobile web interface | 💡 | Reduced feature set |
| Shared session (link + password) | 💡 | Killer feature for teamwork |
| Permission controls | 💡 | canSend, canSelectModel, etc. |
| Session audit log | 💡 | |
| Kick/end session | 💡 | |

---

## Image Generation

| Feature | Status | Notes |
|---------|--------|-------|
| Model integration | 📋 | DALL-E, Midjourney API, etc. |
| Live prompt enhancement toggle | 📋 | Any model → enhanced prompt → image gen |
| Image display in chat | 📋 | |

---

## Claude Code Integration

### Core

| Feature | Status | Notes |
|---------|--------|-------|
| Spawn/manage CLI process | 📋 | Child process with stdin/stdout pipes |
| Stream output to UI | 📋 | Real-time display |
| Input pattern detection | 📋 | Y/n, selection, freeform |
| Render interactive controls | 📋 | Buttons instead of text prompts |
| Full transcript persistence | 📋 | Never lose history |
| Compact detection + divider | 📋 | Visual marker where context wiped |
| File edit detection | 📋 | Parse tool use output |
| Inline diff display | 📋 | Show what changed |

### Restore System

| Feature | Status | Notes |
|---------|--------|-------|
| Auto restore points | 📋 | Snapshot before file writes |
| Manual checkpoints | 📋 | User-triggered with labels |
| Restore UI (timeline/list) | 📋 | Preview + one-click restore |

### Plan Integration

| Feature | Status | Notes |
|---------|--------|-------|
| Watch Claude's plan file | 📋 | Detect location, parse changes |
| Interactive checklist UI | 📋 | Check/uncheck, reorder |
| Completion timestamps | 📋 | When each item marked done |
| Link items → transcript | 📋 | Jump to completion moment |
| Plan history log | 📋 | Full audit trail |
| Multi-plan merge | 💡 | Consolidate across sessions |

### Multi-Agent Orchestration

| Feature | Status | Notes |
|---------|--------|-------|
| Spawn parallel processes | 💡 | Multiple Claude Code instances |
| Task definition syntax | 💡 | Numbered, `---` splits, `@agent()`, `#after()` |
| Task parser | 💡 | Text → structured dispatch |
| Agent grid view | 💡 | See all agents at once |
| Unified plan view | 💡 | Merged progress across agents |
| File conflict detection | 💡 | Pause + prompt on collision |
| Dependency ordering | 💡 | Task waits for prerequisites |

---

## UI Polish / UX

| Feature | Status | Notes |
|---------|--------|-------|
| CSS animations throughout | 🔨 | Some in place |
| Microinteractions | 📋 | |
| Keyboard shortcuts | 📋 | |
| Theme system | 📋 | Dark exists, light/custom? |

---

## Open Questions

1. **Summary append vs replace** — Explicit toggle or infer from intention wording?
2. **Multi-model response layout** — Default to tabs? Stack? User preference?
3. **Shared sessions** — Worth the security complexity? (I think yes)
4. **Playwright browser tool** — Build or defer indefinitely?

---

## Data Models Reference

### Context Summary

```typescript
interface Summary {
  id: string;
  sourceChat: string | null;
  intention: string;           // "track code only", "mood/state", etc.
  content: string;             // accumulated markdown
  lastProcessedMessage: string;
  isPinned: boolean;           // stop auto-updates when user edits
  updateMode: 'append' | 'replace';
  linkedChats: string[];       // chats spawned from this summary
}
```

### DataSource (Real-Time Data)

```typescript
interface DataSource {
  id: string;
  name: string;
  endpoint: string;            // URL with {{placeholders}}
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  responseMapping: string;     // jsonpath to extract
  mode: 'inject' | 'pull';
  refreshInterval?: number;    // ms, for inject mode
}
```

### Claude Code Session

```typescript
interface ClaudeCodeSession {
  id: string;
  process: ChildProcess;
  workingDirectory: string;
  status: 'idle' | 'thinking' | 'editing' | 'waiting_input';
  transcript: TranscriptEntry[];
  restorePoints: RestorePoint[];
}

interface TranscriptEntry {
  id: string;
  type: 'user' | 'assistant' | 'tool' | 'compact' | 'error';
  content: string;
  timestamp: Date;
  metadata?: {
    filesAffected?: string[];
    tokens?: number;
  };
}

interface RestorePoint {
  id: string;
  timestamp: Date;
  label: string;
  trigger: 'before_edit' | 'manual' | 'pre_compact';
  snapshots: FileSnapshot[];
}
```

### Shared Session (Collaboration)

```typescript
interface SharedSession {
  id: string;
  accessUrl: string;
  passwordHash: string;
  hostUserId: string;
  chatId: string;
  permissions: {
    canSendMessages: boolean;
    canSelectModel: boolean;
    canViewHistory: boolean;
    canUseTools: boolean;
  };
  connectedUsers: ConnectedUser[];
  expiresAt?: Date;
}
```

### Multi-Agent Orchestration

```typescript
interface AgentOrchestrator {
  agents: Map<string, ClaudeCodeSession>;
  taskQueue: Task[];
  dispatchMode: 'auto' | 'manual';
  sharedPlan: ProjectPlan;
}

interface Task {
  id: string;
  description: string;
  assignedAgent: string | null;
  status: 'queued' | 'active' | 'done' | 'failed';
  priority: number;
  dependencies: string[];
}

interface ProjectPlan {
  projectPath: string;
  items: PlanItem[];
  history: PlanHistoryEntry[];
}

interface PlanItem {
  id: string;
  text: string;
  status: 'pending' | 'in_progress' | 'done' | 'blocked';
  addedAt: Date;
  completedAt: Date | null;
  linkedMessageId: string | null;
  completedByAgent: string | null;
}
```