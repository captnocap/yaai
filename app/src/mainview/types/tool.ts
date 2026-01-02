export interface ToolConfig {
  id: string;
  name: string;
  description: string;
  icon: string;           // Lucide icon name
  enabled: boolean;
}

export type ToolStatus = 'pending' | 'running' | 'success' | 'error';

export interface ToolCall {
  id: string;
  toolId: string;
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
  status: ToolStatus;
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

export interface APIToolCall extends ToolCall {
  name: 'api';
  input: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
  output?: {
    status: number;
    data: unknown;
  };
}

export interface BrowserToolCall extends ToolCall {
  name: 'browser';
  input: {
    action: 'navigate' | 'click' | 'type' | 'screenshot' | 'scroll';
    target?: string;
    value?: string;
  };
  output?: {
    screenshot?: string;
    html?: string;
  };
}

export interface CodeToolCall extends ToolCall {
  name: 'code';
  input: {
    language: string;
    code: string;
  };
  output?: {
    stdout: string;
    stderr: string;
    exitCode: number;
  };
}

export interface TerminalToolCall extends ToolCall {
  name: 'terminal';
  input: {
    command: string;
  };
  output?: {
    stdout: string;
    stderr: string;
    exitCode: number;
  };
}
