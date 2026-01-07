// =============================================================================
// WORKSPACE URL ENCODING
// =============================================================================
// Serializes and deserializes workspace state to/from URL hash parameters.
//
// Format: #/workspace?l=<layout>&a=<activeId>
//
// Layout encoding (compact):
//   Single group: chat:abc,code:xyz (comma-separated views)
//   Horizontal split: h50:chat:abc|code:xyz (h=horizontal, 50=ratio%)
//   Vertical split: v60:chat:abc|code:xyz (v=vertical, 60=ratio%)
//   Nested: h50:chat:abc|v40:code:xyz|image:def

import type {
  ViewType,
  PaneView,
  EditorGroup,
  LayoutNode,
  WorkspacePanesState,
} from './types';
import {
  generateGroupId,
  isGroupNode,
  isSplitNode,
  DEFAULT_VIEW_TITLES,
} from './types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface ParsedWorkspace {
  layout: LayoutNode;
  groups: Record<string, EditorGroup>;
  activeViewId: string | null;
}

// -----------------------------------------------------------------------------
// VIEW ENCODING
// -----------------------------------------------------------------------------

/** Encode a single view to string: type:resourceId or just type */
function encodeView(view: PaneView): string {
  if (view.resourceId) {
    return `${view.type}:${view.resourceId}`;
  }
  return view.type;
}

/** Decode a view string back to PaneView */
function decodeView(encoded: string): PaneView {
  const [type, resourceId] = encoded.split(':') as [ViewType, string | undefined];
  const viewId = resourceId ? `${type}-${resourceId}` : `${type}-${Date.now()}`;
  return {
    id: viewId,
    type,
    resourceId: resourceId ?? null,
    title: DEFAULT_VIEW_TITLES[type] ?? type,
  };
}

// -----------------------------------------------------------------------------
// GROUP ENCODING
// -----------------------------------------------------------------------------

/** Encode a group's tabs to comma-separated string */
function encodeGroup(group: EditorGroup): string {
  return group.tabs.map(encodeView).join(',');
}

/** Decode comma-separated views back to group */
function decodeGroup(encoded: string): EditorGroup {
  const tabs = encoded
    .split(',')
    .filter(Boolean)
    .map(decodeView);

  return {
    id: generateGroupId(),
    tabs,
    activeTabId: tabs[0]?.id ?? null,
  };
}

// -----------------------------------------------------------------------------
// LAYOUT ENCODING
// -----------------------------------------------------------------------------

/**
 * Encode layout tree to string
 *
 * Format:
 *   Group: chat:abc,code:xyz
 *   Split: h50:GROUP1|GROUP2 or v60:GROUP1|GROUP2
 *   Nested: h50:chat:abc|v40:code:xyz|image
 */
function encodeLayoutNode(
  node: LayoutNode,
  groups: Record<string, EditorGroup>
): string {
  if (isGroupNode(node)) {
    const group = groups[node.groupId];
    return group ? encodeGroup(group) : '';
  }

  // Split node
  const direction = node.direction === 'horizontal' ? 'h' : 'v';
  const ratio = Math.round(node.ratio * 100);
  const first = encodeLayoutNode(node.first, groups);
  const second = encodeLayoutNode(node.second, groups);

  return `${direction}${ratio}:${first}|${second}`;
}

/**
 * Decode layout string back to tree + groups
 */
function decodeLayoutString(
  encoded: string
): { layout: LayoutNode; groups: Record<string, EditorGroup> } {
  const groups: Record<string, EditorGroup> = {};

  function parseNode(str: string): LayoutNode {
    // Check if this is a split: starts with h or v followed by number and colon
    const splitMatch = str.match(/^([hv])(\d+):(.+)$/);

    if (splitMatch) {
      const [, dir, ratioStr, rest] = splitMatch;
      const direction = dir === 'h' ? 'horizontal' : 'vertical';
      const ratio = parseInt(ratioStr, 10) / 100;

      // Find the split point (| at the top level)
      const splitIndex = findTopLevelSplit(rest);
      if (splitIndex === -1) {
        // Malformed, treat as single group
        const group = decodeGroup(rest);
        groups[group.id] = group;
        return { type: 'group', groupId: group.id };
      }

      const firstStr = rest.slice(0, splitIndex);
      const secondStr = rest.slice(splitIndex + 1);

      return {
        type: 'split',
        direction: direction as 'horizontal' | 'vertical',
        ratio,
        first: parseNode(firstStr),
        second: parseNode(secondStr),
      };
    }

    // It's a group (comma-separated views)
    const group = decodeGroup(str);
    groups[group.id] = group;
    return { type: 'group', groupId: group.id };
  }

  const layout = parseNode(encoded || '');
  return { layout, groups };
}

/** Find the top-level | split point (not inside nested splits) */
function findTopLevelSplit(str: string): number {
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === ':') depth++;
    if (char === '|' && depth === 0) return i;
    // Decrease depth after passing a section
    if (char === '|') depth = Math.max(0, depth - 1);
  }
  return -1;
}

// -----------------------------------------------------------------------------
// FULL URL ENCODING
// -----------------------------------------------------------------------------

/**
 * Serialize workspace state to URL hash
 *
 * @example
 * // Single chat: #/workspace?l=chat:abc123&a=chat-abc123
 * // Split: #/workspace?l=h50:chat:abc|code:xyz&a=chat-abc
 */
export function serializeWorkspaceUrl(state: WorkspacePanesState): string {
  const layout = encodeLayoutNode(state.layout, state.groups);
  const params = new URLSearchParams();

  if (layout) {
    params.set('l', layout);
  }

  if (state.activeViewId) {
    params.set('a', state.activeViewId);
  }

  const query = params.toString();
  return query ? `#/workspace?${query}` : '#/workspace';
}

/**
 * Parse URL hash into workspace state
 */
export function parseWorkspaceUrl(hash: string): ParsedWorkspace | null {
  // Extract path and query
  const hashContent = hash.startsWith('#') ? hash.slice(1) : hash;
  const [path, queryString] = hashContent.split('?');

  // Must be workspace route
  if (path !== '/workspace') {
    return null;
  }

  const params = new URLSearchParams(queryString || '');
  const layoutStr = params.get('l');
  const activeViewId = params.get('a');

  // Parse layout
  if (!layoutStr) {
    // Empty workspace
    const groupId = generateGroupId();
    return {
      layout: { type: 'group', groupId },
      groups: {
        [groupId]: { id: groupId, tabs: [], activeTabId: null },
      },
      activeViewId: null,
    };
  }

  const { layout, groups } = decodeLayoutString(layoutStr);

  // Validate and set active view
  let validActiveViewId: string | null = null;
  if (activeViewId) {
    // Check if active view exists
    for (const group of Object.values(groups)) {
      if (group.tabs.find(t => t.id === activeViewId)) {
        validActiveViewId = activeViewId;
        // Also set this as the group's active tab
        group.activeTabId = activeViewId;
        break;
      }
    }
  }

  // If no valid active view, use first tab of first group
  if (!validActiveViewId) {
    const firstGroup = Object.values(groups)[0];
    validActiveViewId = firstGroup?.tabs[0]?.id ?? null;
    if (firstGroup && validActiveViewId) {
      firstGroup.activeTabId = validActiveViewId;
    }
  }

  return {
    layout,
    groups,
    activeViewId: validActiveViewId,
  };
}

/**
 * Build MRU list from groups (order: active tabs first, then rest)
 */
export function buildMruFromGroups(groups: Record<string, EditorGroup>): string[] {
  const mru: string[] = [];
  const seen = new Set<string>();

  // First, add active tabs from each group
  for (const group of Object.values(groups)) {
    if (group.activeTabId && !seen.has(group.activeTabId)) {
      mru.push(group.activeTabId);
      seen.add(group.activeTabId);
    }
  }

  // Then add remaining tabs
  for (const group of Object.values(groups)) {
    for (const tab of group.tabs) {
      if (!seen.has(tab.id)) {
        mru.push(tab.id);
        seen.add(tab.id);
      }
    }
  }

  return mru;
}

/**
 * Create full workspace state from parsed URL
 */
export function createStateFromUrl(hash: string): WorkspacePanesState | null {
  const parsed = parseWorkspaceUrl(hash);
  if (!parsed) return null;

  const groupIds = Object.keys(parsed.groups);

  return {
    layout: parsed.layout,
    groups: parsed.groups,
    focusedGroupId: groupIds[0] ?? null,
    activeViewId: parsed.activeViewId,
    mruViewIds: buildMruFromGroups(parsed.groups),
  };
}

// -----------------------------------------------------------------------------
// LEGACY ROUTE CONVERSION
// -----------------------------------------------------------------------------

/**
 * Convert legacy route (e.g., /chat/abc) to workspace URL
 */
export function legacyRouteToWorkspaceUrl(path: string): string | null {
  const patterns: { pattern: RegExp; type: ViewType }[] = [
    { pattern: /^\/chat\/(.+)$/, type: 'chat' },
    { pattern: /^\/code\/(.+)$/, type: 'code' },
    { pattern: /^\/code$/, type: 'code' },
    { pattern: /^\/image$/, type: 'image' },
    { pattern: /^\/research\/(.+)$/, type: 'research' },
    { pattern: /^\/research$/, type: 'research' },
    { pattern: /^\/prompts\/(.+)$/, type: 'prompts' },
    { pattern: /^\/prompts$/, type: 'prompts' },
    { pattern: /^\/$/, type: 'chat' }, // Home = new chat
  ];

  for (const { pattern, type } of patterns) {
    const match = path.match(pattern);
    if (match) {
      const resourceId = match[1] || null;
      const viewStr = resourceId ? `${type}:${resourceId}` : type;
      const viewId = resourceId ? `${type}-${resourceId}` : `${type}-new`;
      return `#/workspace?l=${viewStr}&a=${viewId}`;
    }
  }

  return null;
}
