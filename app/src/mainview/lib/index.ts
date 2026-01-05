export { cn } from './cn';
export * from './format';

// Communication
export {
  sendMessage,
  onMessage,
  offMessage,
  isConnected,
  disconnect,
  expandVariables,
  type VariableExpansionResult,
} from './comm-bridge';

export {
  WSClient,
  getWSClient,
  initWSClient,
  getConnectedPort,
} from './ws-client';

// Variable Syntax Utilities
export {
  detectVariables,
  getUniqueVariableNames,
  hasVariables,
  countVariables,
  isValidVariableName,
  hasCompleteVariableSyntax,
  findIncompleteVariables,
  interpolate,
  isCursorInVariable,
  getVariableAtCursor,
  type DetectedVariable,
} from './variable-syntax';
