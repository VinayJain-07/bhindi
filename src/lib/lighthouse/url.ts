import { createHash } from "node:crypto";
import { assertPublicUrl, normalizeWebsiteUrl } from "../crawl/url-safety";
import { LighthouseAuditError, type LighthouseStrategy } from "./types";

export const MAX_AUDIT_URL_LENGTH = 2048;
const MAX_REDIRECTS = 5;

function urlError(error: unknown): LighthouseAuditError {
  const message = error instanceof Error ? error.message : "The website URL is invalid.";
  const privateAddress = /private|localhost|internal network/i.test(message);
  const unreachable = /could not be resolved|hostname.*resolved|dns|enotfound|eai_again/i.test(message);
  return new LighthouseAuditError(privateAddress ? "PRIVATE_URL" : unreachable ? "UNREACHABLE" : "INVALID_URL", message);
}

export async function normalizeAuditTarget(input: string): Promise<URL> {
  if (input.trim().length > MAX_AUDIT_URL_LENGTH) throw new LighthouseAuditError("INVALID_URL", `Website URLs must be ${MAX_AUDIT_URL_LENGTH} characters or fewer.`);
  try {
    const url = normalizeWebsiteUrl(input);
    await assertPublicUrl(url);
    return url;
  } catch (error) {
    if (error instanceof LighthouseAuditError) throw error;
    throw urlError(error);
  }
}

export async function resolveSafeRedirects(input: string, signal?: AbortSignal): Promise<URL> {
  let current = await normalizeAuditTarget(input);
  for (let index = 0; index <= MAX_REDIRECTS; index += 1) {
    let response: Response;
    try {
      response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: signal ?? AbortSignal.timeout(15_000),
        headers: { "User-Agent": "Smark-Lighthouse-Safety-Check/1.0", Range: "bytes=0-1023", Accept: "text/html,*/*;q=0.2" },
      });
    } catch (error) {
      if (signal?.aborted) throw new LighthouseAuditError("TIMEOUT", "The Lighthouse audit exceeded the 180-second limit.");
      throw new LighthouseAuditError("UNREACHABLE", error instanceof Error ? `The website could not be reached: ${error.message}` : "The website could not be reached.");
    }
    if (![301, 302, 303, 307, 308].includes(response.status)) return current;
    const location = response.headers.get("location");
    if (!location) throw new LighthouseAuditError("UNSUPPORTED_WEBSITE", "The website returned an invalid redirect.");
    current = await normalizeAuditTarget(new URL(location, current).href);
  }
  throw new LighthouseAuditError("UNSUPPORTED_WEBSITE", "The website redirected too many times.");
}

export function lighthouseCacheKey(url: URL, strategy: LighthouseStrategy) {
  return createHash("sha256").update(`${url.href}\n${strategy}`).digest("hex");
}
