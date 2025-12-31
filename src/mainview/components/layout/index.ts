// Layout components
export { WorkspaceShell } from './WorkspaceShell';
export { NavigationLayer, ChatList } from './NavigationLayer';
export type { NavItem, NavigationLayerProps, ChatItem, ChatListProps } from './NavigationLayer';

// Layout state management
export {
  useWorkspaceLayout,
  useWorkspaceLayoutContext,
  WorkspaceLayoutContext,
} from './useWorkspaceLayout';
export type {
  ArtifactDock,
  ArtifactState,
  NavigationState,
  ContentInsets,
  WorkspaceLayoutState,
  WorkspaceLayoutActions,
  WorkspaceLayoutComputed,
  UseWorkspaceLayoutReturn,
  // Overlay types
  OverlayVariant,
  OverlayBackdrop,
  OverlayConfig,
  OverlayEntry,
} from './useWorkspaceLayout';
