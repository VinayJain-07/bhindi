import { ProviderError } from "./types";

export async function providerFetch(url: string, init: RequestInit, timeoutMs = 120_000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
    const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok) {
      const nested = data?.error as Record<string, unknown> | string | undefined;
      const message = typeof nested === "string" ? nested : String(nested?.message ?? data?.message ?? `${response.status} ${response.statusText}`);
      throw new ProviderError(message, response.status);
    }
    return data;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new ProviderError("The provider timed out while validating the request.");
    throw new ProviderError(error instanceof Error ? error.message : "The provider request failed.");
  } finally {
    clearTimeout(timer);
  }
}

export function extractJson<T>(text: string): T {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) throw new ProviderError("The model returned an unexpected response format.");
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as T;
  } catch {
    throw new ProviderError("The model returned invalid structured output.");
  }
}
