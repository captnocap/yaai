// =============================================================================
// INPUT HUB GRID CONFIGURATION
// =============================================================================
// Panel definitions, default layouts per mode, and persistence utilities.

import type { ViewType } from '../../workspace/types';

// Layout item type for react-grid-layout
export interface Layout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
  isDraggable?: boolean;
  isResizable?: boolean;
}

// -----------------------------------------------------------------------------
// PANEL TYPES
// -----------------------------------------------------------------------------

export type PanelId =
  | 'brain'
  | 'active-sessions'
  | 'memory'
  | 'sessions'
  | 'models'
  | 'variables'
  | 'tools'
  | 'input';

export interface PanelDefinition {
  id: PanelId;
  label: string;
  description: string;
  minW: number;
  minH: number;
  maxW?: number;
  maxH?: number;
  defaultW: number;
  defaultH: number;
  isStatic?: boolean;  // Cannot be moved/resized
  isRequired?: boolean; // Cannot be hidden
}

// -----------------------------------------------------------------------------
// PANEL CATALOG
// -----------------------------------------------------------------------------

export const PANEL_DEFINITIONS: Record<PanelId, PanelDefinition> = {
  brain: {
    id: 'brain',
    label: 'Brain',
    description: 'AI state visualization',
    minW: 2,
    minH: 2,
    maxW: 3,
    maxH: 3,
    defaultW: 2,
    defaultH: 2,
    isStatic: false,
  },
  'active-sessions': {
    id: 'active-sessions',
    label: 'Active',
    description: 'Currently running sessions',
    minW: 3,
    minH: 1,
    maxW: 12,
    maxH: 2,
    defaultW: 5,
    defaultH: 1,
  },
  memory: {
    id: 'memory',
    label: 'Memory',
    description: 'Memory logs and context',
    minW: 2,
    minH: 2,
    maxW: 4,
    maxH: 4,
    defaultW: 2,
    defaultH: 2,
  },
  sessions: {
    id: 'sessions',
    label: 'Sessions',
    description: 'Code session list',
    minW: 2,
    minH: 2,
    maxW: 4,
    maxH: 4,
    defaultW: 2,
    defaultH: 2,
  },
  models: {
    id: 'models',
    label: 'Models',
    description: 'Model targeting for parallel responses',
    minW: 2,
    minH: 1,
    maxW: 4,
    maxH: 3,
    defaultW: 2,
    defaultH: 2,
  },
  variables: {
    id: 'variables',
    label: 'Variables',
    description: 'Variable resolution',
    minW: 2,
    minH: 2,
    maxW: 4,
    maxH: 4,
    defaultW: 2,
    defaultH: 2,
  },
  tools: {
    id: 'tools',
    label: 'Tools',
    description: 'Tool toggles',
    minW: 2,
    minH: 1,
    maxW: 3,
    maxH: 3,
    defaultW: 2,
    defaultH: 2,
  },
  input: {
    id: 'input',
    label: 'Input',
    description: 'Main text input',
    minW: 4,
    minH: 2,
    maxW: 12,
    maxH: 4,
    defaultW: 5,
    defaultH: 3,
    isRequired: true,
  },
};

// -----------------------------------------------------------------------------
// DEFAULT LAYOUTS PER MODE
// -----------------------------------------------------------------------------

// Grid is 12 columns, row height is dynamic based on container

export const DEFAULT_LAYOUTS: Record<ViewType, Layout[]> = {
  // 12x12 grid layouts - all items bounded within 12 rows
  chat: [
    { i: 'brain', x: 0, y: 0, w: 3, h: 12, minW: 2, minH: 4, maxW: 4, maxH: 12 },
    { i: 'active-sessions', x: 3, y: 0, w: 5, h: 2, minW: 3, minH: 2, maxW: 7, maxH: 3 },
    { i: 'memory', x: 3, y: 2, w: 2, h: 10, minW: 2, minH: 4, maxW: 3, maxH: 12 },
    { i: 'input', x: 5, y: 2, w: 4, h: 10, minW: 3, minH: 4, maxW: 6, maxH: 12 },
    { i: 'models', x: 8, y: 0, w: 2, h: 6, minW: 2, minH: 3, maxW: 3, maxH: 8 },
    { i: 'tools', x: 8, y: 6, w: 2, h: 6, minW: 2, minH: 3, maxW: 3, maxH: 8 },
    { i: 'variables', x: 10, y: 0, w: 2, h: 12, minW: 2, minH: 4, maxW: 3, maxH: 12 },
  ],
  code: [
    { i: 'brain', x: 0, y: 0, w: 3, h: 12, minW: 2, minH: 4, maxW: 4, maxH: 12 },
    { i: 'active-sessions', x: 3, y: 0, w: 7, h: 2, minW: 3, minH: 2, maxW: 9, maxH: 3 },
    { i: 'sessions', x: 3, y: 2, w: 2, h: 10, minW: 2, minH: 4, maxW: 3, maxH: 12 },
    { i: 'input', x: 5, y: 2, w: 5, h: 10, minW: 4, minH: 4, maxW: 7, maxH: 12 },
    { i: 'tools', x: 10, y: 0, w: 2, h: 12, minW: 2, minH: 4, maxW: 3, maxH: 12 },
  ],
  image: [
    { i: 'brain', x: 0, y: 0, w: 3, h: 12, minW: 2, minH: 4, maxW: 4, maxH: 12 },
    { i: 'active-sessions', x: 3, y: 0, w: 7, h: 2, minW: 3, minH: 2, maxW: 9, maxH: 3 },
    { i: 'input', x: 3, y: 2, w: 7, h: 10, minW: 4, minH: 4, maxW: 9, maxH: 12 },
    { i: 'models', x: 10, y: 0, w: 2, h: 12, minW: 2, minH: 4, maxW: 3, maxH: 12 },
  ],
  research: [
    { i: 'brain', x: 0, y: 0, w: 3, h: 12, minW: 2, minH: 4, maxW: 4, maxH: 12 },
    { i: 'active-sessions', x: 3, y: 0, w: 7, h: 2, minW: 3, minH: 2, maxW: 9, maxH: 3 },
    { i: 'memory', x: 3, y: 2, w: 2, h: 10, minW: 2, minH: 4, maxW: 3, maxH: 12 },
    { i: 'input', x: 5, y: 2, w: 7, h: 10, minW: 4, minH: 4, maxW: 9, maxH: 12 },
  ],
  prompts: [
    { i: 'brain', x: 0, y: 0, w: 3, h: 12, minW: 2, minH: 4, maxW: 4, maxH: 12 },
    { i: 'input', x: 3, y: 0, w: 7, h: 12, minW: 4, minH: 4, maxW: 9, maxH: 12 },
    { i: 'variables', x: 10, y: 0, w: 2, h: 12, minW: 2, minH: 4, maxW: 3, maxH: 12 },
  ],
  preview: [
    { i: 'brain', x: 0, y: 0, w: 3, h: 12, minW: 2, minH: 4, maxW: 4, maxH: 12 },
    { i: 'active-sessions', x: 3, y: 0, w: 9, h: 12, minW: 3, minH: 4, maxW: 12, maxH: 12 },
  ],
};

// Which panels are enabled by default per mode
export const DEFAULT_ENABLED_PANELS: Record<ViewType, PanelId[]> = {
  chat: ['brain', 'active-sessions', 'memory', 'input', 'models', 'tools', 'variables'],
  code: ['brain', 'active-sessions', 'sessions', 'input', 'tools'],
  image: ['brain', 'active-sessions', 'input', 'models'],
  research: ['brain', 'active-sessions', 'memory', 'input'],
  prompts: ['brain', 'input', 'variables'],
  preview: ['brain', 'active-sessions'],
};

// -----------------------------------------------------------------------------
// LAYOUT PERSISTENCE
// -----------------------------------------------------------------------------

const STORAGE_KEY_PREFIX = 'inputhub-layout-';
const ENABLED_PANELS_KEY_PREFIX = 'inputhub-panels-';

export function saveLayout(mode: ViewType, layout: Layout[]): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${mode}`, JSON.stringify(layout));
  } catch (e) {
    console.warn('Failed to save input hub layout:', e);
  }
}

export function loadLayout(mode: ViewType): Layout[] | null {
  try {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${mode}`);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.warn('Failed to load input hub layout:', e);
    return null;
  }
}

export function saveEnabledPanels(mode: ViewType, panels: PanelId[]): void {
  try {
    localStorage.setItem(`${ENABLED_PANELS_KEY_PREFIX}${mode}`, JSON.stringify(panels));
  } catch (e) {
    console.warn('Failed to save enabled panels:', e);
  }
}

export function loadEnabledPanels(mode: ViewType): PanelId[] | null {
  try {
    const saved = localStorage.getItem(`${ENABLED_PANELS_KEY_PREFIX}${mode}`);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.warn('Failed to load enabled panels:', e);
    return null;
  }
}

export function resetLayout(mode: ViewType): void {
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${mode}`);
    localStorage.removeItem(`${ENABLED_PANELS_KEY_PREFIX}${mode}`);
  } catch (e) {
    console.warn('Failed to reset layout:', e);
  }
}

export function resetAllLayouts(): void {
  const modes: ViewType[] = ['chat', 'code', 'image', 'research', 'prompts', 'preview'];
  modes.forEach(mode => resetLayout(mode));
}

// -----------------------------------------------------------------------------
// LAYOUT UTILITIES
// -----------------------------------------------------------------------------

export function getLayoutForMode(mode: ViewType): Layout[] {
  const saved = loadLayout(mode);
  return saved ?? DEFAULT_LAYOUTS[mode] ?? DEFAULT_LAYOUTS.chat;
}

export function getEnabledPanelsForMode(mode: ViewType): PanelId[] {
  const saved = loadEnabledPanels(mode);
  return saved ?? DEFAULT_ENABLED_PANELS[mode] ?? DEFAULT_ENABLED_PANELS.chat;
}

export function getPanelDefinition(panelId: PanelId): PanelDefinition {
  return PANEL_DEFINITIONS[panelId];
}

// Filter layout to only include enabled panels
export function filterLayoutByEnabledPanels(layout: Layout[], enabledPanels: PanelId[]): Layout[] {
  return layout.filter(item => enabledPanels.includes(item.i as PanelId));
}
