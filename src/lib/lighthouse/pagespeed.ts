import { parseLighthouseResult } from "./engine";
import { LighthouseAuditError, type LighthouseReport, type LighthouseStrategy } from "./types";

const PAGE_SPEED_ENDPOINT = "https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed";
const CATEGORIES = ["performance", "accessibility", "seo", "best-practices"] as const;

type PageSpeedPayload = {
  lighthouseResult?: unknown;
  error?: { message?: string };
};

function apiKey() {
  const key = process.env.PAGESPEED_INSIGHTS_API_KEY?.trim();
  if (!key) throw new LighthouseAuditError("AUDIT_FAILED", "PageSpeed Insights is not configured on the audit server.");
  return key;
}

function errorForResponse(status: number, message: string) {
  if (status === 429) return new LighthouseAuditError("RATE_LIMITED", "PageSpeed Insights quota has been reached. Try again later.");
  if (status === 408 || status === 504) return new LighthouseAuditError("TIMEOUT", "PageSpeed Insights did not finish the audit in time.");
  if (status >= 500) return new LighthouseAuditError("AUDIT_FAILED", "PageSpeed Insights is temporarily unavailable. Try again shortly.");
  return new LighthouseAuditError("UNSUPPORTED_WEBSITE", message || "PageSpeed Insights could not audit this website.");
}

export function pageSpeedConfigured() {
  return Boolean(process.env.PAGESPEED_INSIGHTS_API_KEY?.trim());
}

export async function runPageSpeedAudit(url: string, strategy: LighthouseStrategy, signal: AbortSignal): Promise<LighthouseReport> {
  const endpoint = new URL(PAGE_SPEED_ENDPOINT);
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", strategy);
  endpoint.searchParams.set("key", apiKey());
  for (const category of CATEGORIES) endpoint.searchParams.append("category", category);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "GET",
      signal,
      headers: { Accept: "application/json", "User-Agent": "Smark-Connect-Audit/1.0" },
      cache: "no-store",
    });
  } catch (error) {
    if (signal.aborted) throw new LighthouseAuditError("TIMEOUT", "PageSpeed Insights did not finish the audit in time.");
    throw new LighthouseAuditError("UNREACHABLE", error instanceof Error ? "PageSpeed Insights could not be reached." : "PageSpeed Insights could not be reached.");
  }

  let payload: PageSpeedPayload;
  try {
    payload = await response.json() as PageSpeedPayload;
  } catch {
    throw new LighthouseAuditError("AUDIT_FAILED", "PageSpeed Insights returned an invalid response.");
  }
  if (!response.ok) throw errorForResponse(response.status, payload.error?.message ?? "");

  const lhr = payload.lighthouseResult;
  if (!lhr || typeof lhr !== "object") throw new LighthouseAuditError("AUDIT_FAILED", "PageSpeed Insights did not return a Lighthouse report.");
  const runtimeError = "runtimeError" in lhr && lhr.runtimeError && typeof lhr.runtimeError === "object" ? (lhr.runtimeError as { message?: string }).message : null;
  if (runtimeError) throw new LighthouseAuditError(/timeout/i.test(runtimeError) ? "TIMEOUT" : "UNSUPPORTED_WEBSITE", runtimeError);

  try {
    const report = parseLighthouseResult(lhr as Parameters<typeof parseLighthouseResult>[0], strategy);
    if (Object.values(report.scores).every((score) => score === null)) throw new LighthouseAuditError("UNSUPPORTED_WEBSITE", "PageSpeed Insights could not produce scored audit categories.");
    return { ...report, provider: "pagespeed" };
  } catch (error) {
    if (error instanceof LighthouseAuditError) throw error;
    throw new LighthouseAuditError("AUDIT_FAILED", "PageSpeed Insights returned an unreadable Lighthouse report.");
  }
}
