export interface ModelInfo {
  id: string;
  /** Display nickname (e.g., "Claude", "My GPT") */
  name: string;
  /** Actual API model ID (e.g., "claude-3-opus-20240229") */
  apiModel?: string;
  /** Who made the model (e.g., "Anthropic", "OpenAI") */
  provider: string;
  /** API provider/host (e.g., "OpenRouter", "Together", "Direct") */
  apiProvider?: string;
  avatar?: string;
  contextWindow: number;
  capabilities?: {
    vision: boolean;
    tools: boolean;
    streaming: boolean;
  };
}

export interface ModelProvider {
  id: string;
  name: string;
  models: ModelInfo[];
}
