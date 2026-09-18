export type ProviderName = "anthropic" | "openai" | "openrouter" | "google";

export type LLMMessage = { role: "user" | "assistant"; content: string };

export type CompletionParams = {
  apiKey: string;
  model: string;
  system?: string;
  messages: LLMMessage[];
  maxTokens: number;
  temperature?: number;
  jsonSchema?: { name: string; schema: Record<string, unknown> };
};

export interface LLMProvider {
  validateKey(apiKey: string, model?: string): Promise<void>;
  complete(params: CompletionParams): Promise<string>;
}

export class ProviderError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ProviderError";
  }
}
