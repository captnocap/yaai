export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  avatar?: string;
  contextWindow: number;
  capabilities: {
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
