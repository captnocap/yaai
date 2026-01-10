// =============================================================================
// INPUT HUB
// =============================================================================
// Memory-aware input area with 3D brain visualization.

export { InputHub, type InputHubProps } from './InputHub';
export { BrainCanvas, useBrainActivity, ACTIVITY_COLORS, ACTIVITY_INTENSITY } from './BrainCanvas';
export type { BrainActivity } from './BrainCanvas';
export { MemoryStream, MemoryStreamItem, useMemorySearch } from './MemoryStream';
export { AffectFeedback } from './AffectFeedback';

// Grid-based input system
export { GridChainHub, type GridChainHubProps, type PanelId, type PanelRegistry } from './GridChainHub';
export { InputPanel, type InputPanelProps, type InputVariant, type PanelTab } from './InputPanel';
export { AttachmentRow, type Attachment, type AttachmentRowProps } from './AttachmentRow';

// Draft persistence
export { draftStore, type DraftMode, type Draft, type ChatDraft, type ImageDraft, type CodeDraft, type AttachmentRef } from './draft-store';
export { useDraft, useChatDraft, useImageDraft, useCodeDraft, useThreadIdFromRoute } from './useDraft';
