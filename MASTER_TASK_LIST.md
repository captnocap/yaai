# Master Task List

This is the comprehensive project outline, consolidated from all 28 markdown documents. It serves as the master source of truth for all planned and specified architectural, backend, and frontend work.

## 1. Core Infrastructure & Backend Foundation
*Source: SPEC_FOUNDATION.md, SPEC_WEBSOCKET.md, SPEC_DATABASE.md, FEATURE_OUTLINE.md*

### 1.1 Environment & Paths
- [x] Implement `initializeDirectories` for `~/.yaai/` workspace structure
- [x] Create `paths` utility for all data silos (chats, code, imagegen, etc.)
- [x] Implement `RuntimeConfig` loader with environment variable overrides
- [x] Add startup check for directory write permissions

### 1.2 Error Handling & Logging
- [x] Implement `AppError` base class with numeric error codes (1xxx-6xxx)
- [x] Create error factory methods for specific domains (DB, AI, Validation)
- [x] Build structured JSON `logger` with severity levels and file rotation
- [x] Implement `Result<T, E>` pattern across the backend codebase

### 1.3 WebSocket Communication Layer
- [x] Implement `WSServer` using Bun's native `serve` API
- [x] Build port conflict detection and management logic
- [ ] Implement `RateLimiter` middleware for client connections
- [x] Create centralized `ChannelRegistry` for all system modules
- [x] Implement `WSClient` for React with robust reconnection/retry logic
- [x] Build request/response pattern with correlation IDs for async operations
- [x] Implement server-push event emission system

### 1.4 Database Architecture
- [x] Setup separate databases per concern (chat, code, imagegen, app) *(Note: Implemented as JSON/JSONL, not SQLite)*
- [x] Implement migration system with file-based runner and version tracking
- [x] Create connection pool manager for synchronous operations

## 2. AI & LLM Core
*Source: SPEC_AI_PROVIDER.md, FEATURE_OUTLINE.md*

### 2.1 Provider Integration
- [x] Build multi-provider adapter system (Anthropic, OpenAI, Google)
- [x] Implement SSE (Server-Sent Events) streaming parser
- [x] Add support for per-message provider and model selection
- [x] Implement robust retry logic with exponential backoff

### 2.2 Advanced AI Features
- [x] Implement structured tool calling (function execution)
- [x] Build token counting system for prompt estimation and usage tracking
- [x] Implement parallel multi-model requests for comparisons
- [x] Add response "selection" logic to feed best outputs back into context

## 3. Communication & Memory
*Source: SPEC_CHAT_STORE.md, FEATURE_OUTLINE.md*

### 3.1 Chat Persistence
- [x] Create `chats` and `messages` schemas with full indices *(Note: JSON-based)*
- [x] Implement `attachments` table for metadata/file linking
- [x] Build conversation branching support (tree-based structure)
- [x] Implement full-text search (FTS5) for messages and chat titles *(Note: Integrated via custom text-search logic on JSON data)*

### 3.2 Context & Memory
- [x] Implement context summarized/compression logic for long threads
- [x] Build "Turnstile" system for managing conversation flow/gates
- [x] Create persistent memory system for cross-chat entity tracking

## 4. Image Generation System
*Source: SPEC.md, SPEC_QUICK_GENERATE.md, SPEC_MEDIA_PANEL.md, SPEC_COMPRESSION.md, SPEC_PAYLOAD_CONFIG.md*

### 4.1 Request Pipeline & Queue
- [x] Build `JobQueue` with persistence for reliability *(Note: JSON-based)*
- [x] Implement `BatchRequest` logic for parallel generations
- [x] Create `ConcurrencyLimiter` and `PriorityScheduler` for jobs
- [x] Build `RequestDispatcher` for API communication

### 4.2 Image Processing
- [x] Implement multi-stage `ImageCompressor` (Sharp) with quality/dimension reduction
- [x] Build automated recompression logic to fit API payload limits
- [x] Implement `MetadataExtractor` for generated image headers

### 4.3 Image Gen UI Components
- [x] Build `QuickGenerateBar` with auto-resizing prompt input
- [x] Implement `ReferenceStrip` for managing multi-image inputs
- [x] Create `MediaPanel` with tabbed "References" and "Gallery" views
- [x] Build `SettingsPopover` for model/aspect-ratio/quality controls
- [x] Implement `LiveBudgetCalculator` for payload monitoring

## 5. Coding & Artifact Workspace
*Source: SPEC_CODE_SESSIONS.md, app/README.md, FEATURE_OUTLINE.md*

### 5.1 Code Session Management
- [x] Implement `CodeSession` history *(Note: JSON-based)*
- [x] Build transcript persistence with search
- [x] Implement "Restore Point" system with content-addressed snapshots
- [x] Build file edit detector with inline diff generation

### 5.2 Artifact System
- [x] Implement sandboxed `Bun.Worker` environment for artifact handlers
- [x] Build `UIBundler` using `Bun.build` for custom artifact views
- [x] Create `ArtifactWatcher` for hot-reloading development
- [x] Build `ArtifactRegistry` for installation/version management
- [x] Implement multi-panel dockable artifact layouts

## 6. Deep Research — Knowledge Cosmos
*Source: SPEC_VISUALIZATION.md, SPEC-VISUALIZATION_MASTER.md*

### 6.1 3D Visualization Layer
- [ ] Initialize Canvas with React Three Fiber + Drei
- [ ] Build `QueryCore` orb for central visualization
- [ ] Implement `NodeSystem` (3D entities) and `EdgeSystem` (relationships)
- [ ] Create `ParticleSystem` for research "scout" animations

### 6.2 Research Interaction
- [ ] Implement Manual, Synced, and Cinematic presentation modes
- [ ] Build UI overlay for filtering and focusing nodes
- [ ] Integrate Galaxy Node generation with active research worker output

## 7. UI/UX & Design System
*Source: ARCHITECTURE.md, app/README.md, components.md*

### 7.1 Design Tokens & Performance
- [x] Implement core CSS variables/tokens (colors, spacing, typography)
- [x] Build layered Z-index workspace system (Nav, Content, Artifact, Overlay)
- [x] Add mood-reactive effects system (lighting, animations, themes)

### 7.2 Component Library
- [x] Build Primitive Atoms (Avatar, Badge, Button, Input, Modal)
- [x] Build Molecule Components (ActionBar, ModelSelector, TokenMeter)
- [x] Implement Rich Text Layouts (Markdown, Code, Math, Link Previews)
- [x] Create File handling UI (UploadZone, FileCards, Thumbnails)
- [x] Implement responsive sidebar with expand/collapse states
