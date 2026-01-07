// =============================================================================
// WORKSPACE MODULE EXPORTS
// =============================================================================

// Types
export * from './types';

// Hooks
export { useWorkspacePanes, WorkspacePanesContext, useWorkspacePanesContext } from './useWorkspacePanes';

// Context
export {
  WorkspaceInputProvider,
  useWorkspaceInputContext,
  useWorkspaceInput,
} from './WorkspaceInputContext';

// URL Encoding
export {
  serializeWorkspaceUrl,
  parseWorkspaceUrl,
  createStateFromUrl,
  legacyRouteToWorkspaceUrl,
} from './url-encoding';

// Main Workspace Component
export { Workspace, WorkspaceProvider, WorkspaceEditorArea, useOpenView } from './Workspace';

// Components
export { EditorArea } from './EditorArea';
export { EditorGroup } from './EditorGroup';
export { EditorGroupContainer } from './EditorGroupContainer';
export { TabBar } from './TabBar';
export { ViewRenderer } from './ViewRenderer';
export { GlobalInputHub } from './GlobalInputHub';

// Input Adapters
export { ChatInputAdapter } from './input-adapters/ChatInputAdapter';
export { CodeInputAdapter } from './input-adapters/CodeInputAdapter';
export { ImageInputAdapter } from './input-adapters/ImageInputAdapter';
