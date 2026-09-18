import { anthropicProvider } from "./providers/anthropic";
import { geminiProvider } from "./providers/gemini";
import { openAIProvider } from "./providers/openai";
import { openRouterProvider } from "./providers/openrouter";
import type { LLMProvider, ProviderName } from "./types";

const providers: Record<ProviderName, LLMProvider> = {
  anthropic: anthropicProvider,
  openai: openAIProvider,
  openrouter: openRouterProvider,
  google: geminiProvider,
};

export const DEFAULT_MODELS: Record<ProviderName, string> = {
  anthropic: process.env.SMARK_MODEL_ANTHROPIC || "claude-opus-5",
  openai: process.env.SMARK_MODEL_OPENAI || "gpt-4o-mini",
  openrouter: process.env.SMARK_MODEL_OPENROUTER || "openai/gpt-4o-mini",
  google: process.env.SMARK_MODEL_GOOGLE || "gemini-1.5-flash",
};

export function getProvider(name: string): LLMProvider {
  if (!(name in providers)) throw new Error(`Unsupported LLM provider: ${name}`);
  return providers[name as ProviderName];
}

export async function completeWithFallback(
  providerName: string,
  params: import("./types").CompletionParams
): Promise<string> {
  const provider = getProvider(providerName);
  try {
    return await provider.complete(params);
  } catch (error) {
    const pName = providerName as ProviderName;
    const defaultModel = DEFAULT_MODELS[pName] ?? params.model;
    const isModelError = /model|not found|404|does not exist|invalid model|unsupported|supports long structured/i.test(
      error instanceof Error ? error.message : ""
    );
    if (isModelError && params.model !== defaultModel) {
      console.warn(`[LLM Fallback] Model "${params.model}" failed for provider "${providerName}". Automatically retrying with default model "${defaultModel}".`);
      return await provider.complete({ ...params, model: defaultModel });
    }
    throw error;
  }
}

export type { ProviderName } from "./types";

