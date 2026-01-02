// =============================================================================
// PLAN TYPES
// =============================================================================
// Types for tracking Claude Code's plan/todo files.

// -----------------------------------------------------------------------------
// PLAN ITEMS
// -----------------------------------------------------------------------------

export type PlanItemStatus = 'pending' | 'in_progress' | 'completed';

export interface PlanItem {
  id: string;
  content: string;
  activeForm: string;
  status: PlanItemStatus;

  /** Transcript entries linked to this item */
  transcriptEntryIds: string[];

  /** When status last changed */
  statusChangedAt?: string;

  /** Order in the list */
  order: number;
}

// -----------------------------------------------------------------------------
// PLAN
// -----------------------------------------------------------------------------

export interface Plan {
  id: string;
  sessionId: string;

  /** Path to the plan file being watched */
  filePath: string;

  /** Parsed items */
  items: PlanItem[];

  /** When the plan file was last modified */
  lastModified: string;
}

// -----------------------------------------------------------------------------
// PLAN HISTORY
// -----------------------------------------------------------------------------

export type PlanHistoryAction = 'added' | 'completed' | 'removed' | 'edited' | 'started';

export interface PlanHistoryEntry {
  id: string;
  planId: string;
  itemId: string;
  action: PlanHistoryAction;
  timestamp: string;
  sessionId: string;

  /** Previous state for undo */
  previousStatus?: PlanItemStatus;
  previousContent?: string;
}

// -----------------------------------------------------------------------------
// PLAN UPDATE EVENTS
// -----------------------------------------------------------------------------

export interface PlanUpdateEvent {
  sessionId: string;
  plan: Plan;
  changedItems: PlanItemChange[];
}

export interface PlanItemChange {
  itemId: string;
  type: 'added' | 'removed' | 'status_changed' | 'content_changed';
  previousStatus?: PlanItemStatus;
  newStatus?: PlanItemStatus;
  previousContent?: string;
  newContent?: string;
}
