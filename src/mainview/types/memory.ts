export interface Memory {
  id: string;
  summary: string;
  content: string;        // Full content that was summarized
  source: 'auto' | 'manual';
  sourceMessageId?: string;
  relevance?: number;     // 0-1 when retrieved
  timestamp: Date;
  tags?: string[];
}

export interface ContextSummary {
  id: string;
  chatId?: string;        // Specific to chat or global
  summary: string;
  lastUpdated: Date;
  tokenCount: number;
}
