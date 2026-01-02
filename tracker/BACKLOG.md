# Backlog

Prioritized queue of features to build. Top item is next.

---

## Queue

### 1. Image Generation - Quick Generate Panel
**Spec**: [spec-imagegen/SPEC_QUICK_GENERATE.md](../spec-imagegen/SPEC_QUICK_GENERATE.md)
**Priority**: High
**Why first**: Foundation for image gen UX, integrates with chat later

**Tasks**:
- [ ] Create `QuickGenerateBar` component shell in `app/src/mainview/components/image-gen/`
- [ ] Add `ReferenceStrip` with thumbnail display and remove buttons
- [ ] Create `PromptInput` with auto-resize textarea
- [ ] Build `SettingsPopover` (model, resolution, aspect ratio, image count)
- [ ] Add `GenerateButton` with idle/loading/progress states
- [ ] Create `ResultPreview` panel with action buttons
- [ ] Wire to `useImageGen` hook and backend
- [ ] Add keyboard shortcuts (Ctrl+Enter, Ctrl+Shift+G)
- [ ] Implement prompt history with arrow key navigation

---

### 2. Image Generation - Media Panel
**Spec**: [spec-imagegen/SPEC_MEDIA_PANEL.md](../spec-imagegen/SPEC_MEDIA_PANEL.md)
**Priority**: High
**Why**: Persistent reference browsing + output gallery

**Tasks**:
- [ ] Create `MediaPanel` container with tab bar (References / Output)
- [ ] Build `ReferencesTab` with linked entry header
- [ ] Create `SelectionArray` with drag-reorder (dnd-kit)
- [ ] Add `BudgetBar` showing compression status
- [ ] Build `Browser` component with virtual-scroll grid
- [ ] Create `SavedGroups` chip bar with save/load
- [ ] Build `OutputTab` with main viewer and metadata
- [ ] Add `ThumbnailStrip` with virtualized horizontal scroll
- [ ] Create `FilterBar` (job, prompt, model, date filters)
- [ ] Build `Lightbox` overlay with pan/zoom
- [ ] Add keyboard navigation (arrows, R for ref, C for copy)

---

### 3. Image Generation - Compression Pipeline
**Spec**: [spec-imagegen/SPEC_COMPRESSION.md](../spec-imagegen/SPEC_COMPRESSION.md)
**Priority**: High
**Why**: Required for reference images to fit API limits

**Tasks**:
- [ ] Create `image-compressor.ts` with sharp integration
- [ ] Implement dimension reduction stage (max 1440px)
- [ ] Add iterative JPEG quality reduction (87 -> 50)
- [ ] Build emergency dimension cut fallback
- [ ] Create `compressBatchParallel` with bounded concurrency
- [ ] Add `CompressionBadge` component showing ratio/quality
- [ ] Create budget calculation utilities
- [ ] Add compression warnings/toasts for heavy compression
- [ ] Implement progressive loading UI during compression

---

### 4. Image Generation - Payload Config Settings
**Spec**: [spec-imagegen/SPEC_PAYLOAD_CONFIG.md](../spec-imagegen/SPEC_PAYLOAD_CONFIG.md)
**Priority**: Medium
**Why**: User-adjustable limits for different providers

**Tasks**:
- [ ] Add `PayloadConstraints` to settings store schema
- [ ] Add `CompressionSettings` to settings store schema
- [ ] Create `PayloadConstraintsPanel` settings UI
- [ ] Create `CompressionSettingsPanel` settings UI
- [ ] Add live budget calculator display
- [ ] Implement preset system (Current API, Conservative, High Capacity, Unlimited)
- [ ] Add validation for constraint values
- [ ] Implement runtime recompression when limits change

---

### 5. Workbench - Prompt Forging Environment
**Spec**: [spec-workbench/SPEC.md](../spec-workbench/SPEC.md)
**Priority**: Medium
**Why**: Prompt testing/iteration for power users

**Tasks**:
- [ ] Create `/prompts` route in router
- [ ] Build `PromptLibrary` landing view (grid of saved prompts)
- [ ] Create `WorkbenchSession` data model and store
- [ ] Build `WorkbenchPage` with split layout (Forge | Preview)
- [ ] Create `ModelSelectorHeader` with temp/max tokens
- [ ] Build `SystemPromptArea` distinct block
- [ ] Create `MessageStream` with User/Assistant blocks
- [ ] Add `VariablePanel` detecting `{{}}` syntax
- [ ] Build `OutputPanel` with response streaming
- [ ] Add `GetCodeModal` for API payload export
- [ ] Implement variable highlighting in textareas
- [ ] Add Cmd+Enter to run generation

---

### 6. Deep Research - Knowledge Cosmos Visualization
**Spec**: [spec-deepresearch/SPEC_VISUALIZATION.md](../spec-deepresearch/SPEC_VISUALIZATION.md)
**Priority**: Low
**Why**: Ambient visualization during research (nice-to-have)

**Tasks**:
- [ ] Set up React Three Fiber + drei + postprocessing
- [ ] Create `KnowledgeCosmos` canvas component
- [ ] Build `QueryCore` pulsing center orb
- [ ] Create `NodeSystem` with InstancedMesh
- [ ] Build `EdgeSystem` with LineSegments
- [ ] Add `ParticleSystem` for scout animations
- [ ] Implement node spawn/reject animations
- [ ] Add bloom and depth-of-field post-processing
- [ ] Create overlay controls (view modes, filters)
- [ ] Add hover/click interactivity for nodes
- [ ] Integrate with research workflow state

---

## Icebox

Features parked for later consideration.

- **Model Dropdown Global** - spec-modeldropdownglobal/ (empty, needs spec)
- **Chat interface polish** - depends on other features stabilizing
- **Artifact system enhancements** - lower priority until core features done
