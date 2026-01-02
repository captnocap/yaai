// =============================================================================
// OUTPUT PARSER
// =============================================================================
// Parses Claude Code CLI stdout to detect prompts, tool calls, and file edits.
// Converts raw text stream into structured events for the UI.

import type {
  ParsedOutput,
  ParsedOutputType,
  InputPrompt,
  PromptType,
  ToolCallData,
  FileEditData,
  FileOperation,
} from '../../mainview/types/code-session';

// -----------------------------------------------------------------------------
// PATTERNS
// -----------------------------------------------------------------------------

const PATTERNS = {
  // Yes/No prompts: [Y/n], [y/N], (y/n), etc.
  yesNo: /\[Y\/n\]|\[y\/N\]|\(y\/n\)|\(Y\/n\)/i,

  // Numbered list items: "1. Option text" or "  1) Option text"
  numberedItem: /^\s*(\d+)[.)]\s+(.+)$/,

  // Selection prompt: "Select an option:" or "Choose:" followed by numbered list
  selectionPrompt: /(?:select|choose|pick|which)\s*(?:an?\s+)?(?:option|one|item)?[:\?]?\s*$/i,

  // Freeform input: ends with ">" or ":" suggesting input expected
  freeformPrompt: /(?:enter|type|input|provide|specify)[^:]*:\s*$|>\s*$/i,

  // Confirmation: "Press Enter to continue" or "Continue?"
  confirmation: /press\s+enter|continue\s*\?|proceed\s*\?/i,

  // Tool use indicators (Claude Code specific)
  toolStart: /^(?:⏳|🔧|Running|Executing|Calling)\s+/m,
  toolEnd: /^(?:✓|✗|Done|Completed|Failed|Error:)/m,

  // File operations
  fileCreate: /^(?:📝|Creating|Writing new file:?)\s*(.+)$/m,
  fileModify: /^(?:📝|Editing|Modifying|Updating:?)\s*(.+)$/m,
  fileDelete: /^(?:🗑️|Deleting|Removing:?)\s*(.+)$/m,

  // Diff indicators
  diffHeader: /^(?:@@|\-\-\-|\+\+\+|diff\s+)/m,
  diffStats: /\[?\+(\d+)\s*-(\d+)\]?/,

  // Compact/context notices
  compact: /compact|context\s+(?:compacted|compressed|trimmed)|summariz/i,

  // Permission prompts (Claude Code specific)
  permission: /(?:allow|deny|skip|approve|reject)\s*\?/i,
};

// -----------------------------------------------------------------------------
// OUTPUT PARSER CLASS
// -----------------------------------------------------------------------------

export class OutputParser {
  private buffer: string = '';
  private currentToolCall: Partial<ToolCallData> | null = null;
  private numberedOptions: string[] = [];
  private isCollectingOptions: boolean = false;

  /**
   * Process incoming chunk from stdout
   * Returns array of parsed outputs (may return multiple for a single chunk)
   */
  parse(chunk: string): ParsedOutput[] {
    this.buffer += chunk;
    const results: ParsedOutput[] = [];

    // Process complete lines
    const lines = this.buffer.split('\n');
    // Keep incomplete last line in buffer
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const parsed = this.parseLine(line);
      if (parsed) {
        results.push(parsed);
      }
    }

    // Check buffer for prompts (they might not end with newline)
    const bufferParsed = this.checkBufferForPrompt();
    if (bufferParsed) {
      results.push(bufferParsed);
    }

    return results;
  }

  /**
   * Parse a single complete line
   */
  private parseLine(line: string): ParsedOutput | null {
    // Check for numbered options (for selection prompts)
    const numberedMatch = line.match(PATTERNS.numberedItem);
    if (numberedMatch) {
      this.numberedOptions.push(numberedMatch[2].trim());
      this.isCollectingOptions = true;
      return {
        type: 'text',
        content: line,
      };
    }

    // If we were collecting options and hit a non-numbered line, emit selection prompt
    if (this.isCollectingOptions && !numberedMatch) {
      this.isCollectingOptions = false;
      if (this.numberedOptions.length > 0) {
        const prompt = this.createNumberedPrompt();
        this.numberedOptions = [];
        return prompt;
      }
    }

    // Tool start
    if (PATTERNS.toolStart.test(line)) {
      const toolName = line.replace(/^(?:⏳|🔧|Running|Executing|Calling)\s+/i, '').trim();
      this.currentToolCall = {
        name: toolName,
        status: 'running',
        input: {},
      };
      return {
        type: 'tool_start',
        content: line,
        toolCall: this.currentToolCall,
      };
    }

    // Tool end
    if (PATTERNS.toolEnd.test(line) && this.currentToolCall) {
      const isSuccess = /^(?:✓|Done|Completed)/i.test(line);
      this.currentToolCall.status = isSuccess ? 'success' : 'error';
      const result: ParsedOutput = {
        type: 'tool_end',
        content: line,
        toolCall: this.currentToolCall,
      };
      this.currentToolCall = null;
      return result;
    }

    // File operations
    const fileEdit = this.parseFileEdit(line);
    if (fileEdit) {
      return {
        type: 'file_edit',
        content: line,
        fileEdit,
      };
    }

    // Compact notice
    if (PATTERNS.compact.test(line)) {
      return {
        type: 'compact_notice',
        content: line,
      };
    }

    // Default: regular text
    return {
      type: 'text',
      content: line,
    };
  }

  /**
   * Check buffer for prompts that don't end with newline
   */
  private checkBufferForPrompt(): ParsedOutput | null {
    if (!this.buffer.trim()) return null;

    // Yes/No prompt
    if (PATTERNS.yesNo.test(this.buffer)) {
      return {
        type: 'prompt',
        content: this.buffer,
        prompt: this.createPrompt('yes_no', this.buffer),
      };
    }

    // Permission prompt
    if (PATTERNS.permission.test(this.buffer)) {
      return {
        type: 'prompt',
        content: this.buffer,
        prompt: this.createPrompt('yes_no', this.buffer),
      };
    }

    // Confirmation prompt
    if (PATTERNS.confirmation.test(this.buffer)) {
      return {
        type: 'prompt',
        content: this.buffer,
        prompt: this.createPrompt('confirmation', this.buffer),
      };
    }

    // Freeform input prompt
    if (PATTERNS.freeformPrompt.test(this.buffer)) {
      return {
        type: 'prompt',
        content: this.buffer,
        prompt: this.createPrompt('freeform', this.buffer),
      };
    }

    // Selection prompt indicator
    if (PATTERNS.selectionPrompt.test(this.buffer)) {
      this.isCollectingOptions = true;
    }

    return null;
  }

  /**
   * Parse file edit from line
   */
  private parseFileEdit(line: string): FileEditData | null {
    let match: RegExpMatchArray | null;
    let operation: FileOperation;
    let path: string;

    if ((match = line.match(PATTERNS.fileCreate))) {
      operation = 'create';
      path = match[1].trim();
    } else if ((match = line.match(PATTERNS.fileModify))) {
      operation = 'modify';
      path = match[1].trim();
    } else if ((match = line.match(PATTERNS.fileDelete))) {
      operation = 'delete';
      path = match[1].trim();
    } else {
      return null;
    }

    // Try to extract diff stats
    const statsMatch = line.match(PATTERNS.diffStats);
    const additions = statsMatch ? parseInt(statsMatch[1], 10) : undefined;
    const deletions = statsMatch ? parseInt(statsMatch[2], 10) : undefined;

    return {
      path,
      operation,
      additions,
      deletions,
    };
  }

  /**
   * Create a prompt object
   */
  private createPrompt(type: PromptType, message: string): InputPrompt {
    return {
      id: `prompt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      sessionId: '', // Will be filled by session manager
      type,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create a numbered selection prompt
   */
  private createNumberedPrompt(): ParsedOutput {
    return {
      type: 'prompt',
      content: this.numberedOptions.join('\n'),
      prompt: {
        id: `prompt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        sessionId: '',
        type: 'numbered',
        message: 'Select an option:',
        options: [...this.numberedOptions],
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Reset parser state (after prompt is answered)
   */
  reset(): void {
    this.buffer = '';
    this.currentToolCall = null;
    this.numberedOptions = [];
    this.isCollectingOptions = false;
  }

  /**
   * Force flush the buffer (for end of stream)
   */
  flush(): ParsedOutput[] {
    const results: ParsedOutput[] = [];

    if (this.buffer.trim()) {
      const prompt = this.checkBufferForPrompt();
      if (prompt) {
        results.push(prompt);
      } else {
        results.push({
          type: 'text',
          content: this.buffer,
        });
      }
    }

    // If we have pending numbered options
    if (this.numberedOptions.length > 0) {
      results.push(this.createNumberedPrompt());
    }

    this.reset();
    return results;
  }

  /**
   * Check if currently in the middle of a tool call
   */
  isInToolCall(): boolean {
    return this.currentToolCall !== null;
  }

  /**
   * Get current buffer content (for debugging)
   */
  getBuffer(): string {
    return this.buffer;
  }
}

// -----------------------------------------------------------------------------
// UTILITY FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Extract default value from Y/n or y/N prompt
 * Capital letter indicates default
 */
export function getYesNoDefault(prompt: string): boolean | null {
  if (/\[Y\/n\]|\(Y\/n\)/i.test(prompt)) return true;
  if (/\[y\/N\]|\(y\/N\)/i.test(prompt)) return false;
  return null;
}

/**
 * Detect if output indicates Claude is waiting for input
 */
export function isWaitingForInput(output: string): boolean {
  return (
    PATTERNS.yesNo.test(output) ||
    PATTERNS.permission.test(output) ||
    PATTERNS.confirmation.test(output) ||
    PATTERNS.freeformPrompt.test(output) ||
    PATTERNS.selectionPrompt.test(output)
  );
}
