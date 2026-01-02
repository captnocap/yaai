/**
 * Quick settings for the Code tab
 * These are frequently toggled settings that should be easily accessible
 */

export interface CodeSettings {
  // Notifications
  soundOnComplete: boolean;
  soundOnPrompt: boolean;
  desktopNotifications: boolean;

  // Display
  fontSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  lineHeight: 'compact' | 'normal' | 'relaxed';
  showLineNumbers: boolean;
  wordWrap: boolean;

  // Behavior
  autoScroll: boolean;
  confirmBeforeStop: boolean;
  showToolCalls: boolean;
  collapseCompactedMessages: boolean;

  // Theme overrides (beyond system theme)
  editorTheme: 'auto' | 'light' | 'dark';
}

export const DEFAULT_CODE_SETTINGS: CodeSettings = {
  // Notifications
  soundOnComplete: true,
  soundOnPrompt: true,
  desktopNotifications: false,

  // Display
  fontSize: 'sm',
  lineHeight: 'normal',
  showLineNumbers: true,
  wordWrap: true,

  // Behavior
  autoScroll: true,
  confirmBeforeStop: true,
  showToolCalls: true,
  collapseCompactedMessages: true,

  // Theme
  editorTheme: 'auto',
};

export type FontSizeOption = CodeSettings['fontSize'];
export type LineHeightOption = CodeSettings['lineHeight'];
export type EditorThemeOption = CodeSettings['editorTheme'];

export const FONT_SIZE_VALUES: Record<FontSizeOption, string> = {
  xs: '11px',
  sm: '13px',
  md: '14px',
  lg: '16px',
  xl: '18px',
};

export const LINE_HEIGHT_VALUES: Record<LineHeightOption, string> = {
  compact: '1.3',
  normal: '1.5',
  relaxed: '1.75',
};
