# Codebase Audit Report

This document provides a detailed audit of the current project state, cross-referenced against the Master Task List and Technical Specifications.

## 1. UI Component Catalog
*Total Components identified: 110+*

### 1.1 Atomic Primitives (`atoms/`)
*11 components for low-level UI elements.*
- `Avatar.tsx`, `Badge.tsx`, `Chip.tsx`, `Counter.tsx`, `IconButton.tsx`, `Indicator.tsx`, `ProgressRing.tsx`, `Spinner.tsx`, `Timestamp.tsx`, `Toggle.tsx`, `Tooltip.tsx`.

### 1.2 Composite Molecules (`molecules/`)
*7 components for recurring UI patterns.*
- `ActionBar.tsx`: Command strips for items.
- `ModelBadge.tsx`: Displays AI model info.
- `TokenMeter.tsx`: Visualizes context usage.
- `ChipList.tsx`, `UserLine.tsx`, `MemoryChip.tsx`, `StatusLine.tsx`.

### 1.3 Communication & Input
*30+ components for the core chat experience.*
- **Chat**: `ChatView.tsx` (The main hub).
- **Message**: `MessageContainer.tsx`, `MessageBody.tsx`, `MessageHeader.tsx`, `MessageFooter.tsx`, `MessageActions.tsx`, `BranchIndicator.tsx`, `LikeBadge.tsx`.
- **Input**: `InputContainer.tsx`, `AutoTextArea.tsx`, `SendButton.tsx`, `AttachmentTray.tsx`, `ToolToggle.tsx`, `InputFooter.tsx`.
- **Text Rendering**: `MarkdownBlock.tsx`, `CodeBlock.tsx`, `MathBlock.tsx`, `LinkPreview.tsx`, `Mention.tsx`, `InlineCode.tsx`.
- **Files**: `FileCard.tsx`, `FileInfo.tsx`, `FileThumbnail.tsx`, `UploadZone.tsx`, `UploadProgress.tsx`.

### 1.4 Feature Workspaces
- **Image Generation (20+ components)**: 
    - `ImageGenPage.tsx`, `QuickGenerateBar.tsx`.
    - Sub-components for `media`, `queue`, `monitor`, `header`, `log`, `prompt`, `reference`.
- **Code Workspace (15+ components)**: 
    - `CodeTab.tsx`, `CodeTranscript.tsx`, `CodeInput.tsx`, `FileViewer.tsx`.
    - Sub-components for `restore` (Points/Timeline), `sidebar` (Project files), `viewer`, `prompt`.
- **Artifacts (7 components)**: 
    - `ArtifactManager.tsx`, `ArtifactRenderer.tsx`, `ArtifactList.tsx`, `ArtifactCard.tsx`.
- **Settings (15+ components)**: 
    - `SettingsPage.tsx`, `ModelProviderPage.tsx`, `KeyboardShortcutsPage.tsx`, `ClaudeCodeSettingsPage.tsx`.

### 1.5 Shell & Effects
- `WorkspaceShell.tsx`: The layout orchestrator.
- `NavigationLayer.tsx`: The primary sidebar.
- `UsageTracker.tsx`: [UNPLANNED] Cost/Usage tracking.
- `MoodProvider.tsx`, `AmbientBackground.tsx`, `StyledText.tsx`: The mood-reactive system.

## 2. Implemented Features (Verified)
- [x] **Backend Foundation**: Full service suite in `bun/lib/`.
- [x] **Communication**: Native Bun WebSocket server with custom protocol.
- [x] **Image Gen**: Advanced pipeline with compression, rate limiting, and queueing.
- [x] **Code Execution**: Claude Code integration with session and snapshot management.
- [x] **Artifacts**: Sandboxed execution and bundling is implemented.

## 3. Unplanned Features
- **UsageTracker**: Visual cost tracking at the bottom of navigation.
- **Mood System**: Complex text-analysis based UI reactivity (Keywords, Emojis, Punctuation).
- **Skeleton.tsx**: Loading primitives.

## 4. Potential Problem Areas & Technical Debt
- [!IMPORTANT]
- **SQLite Discrepancy**: All 28 specifications explicitly mandate SQLite for persistence (Chat, ImageGen, Code). However, the implementation is purely file-based (JSON/JSONL) using the `fs` module. 
- **Mood Render Loops**: `MoodProvider.tsx` is flagged in documentation as "disabled by default to prevent render loops," indicating a known performance issue.
- **Mock Data**: `UsageTracker.tsx` is currently a static mock with hardcoded data.

