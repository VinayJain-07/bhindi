import { Launcher } from "chrome-launcher";
import puppeteer, { type Browser, type CDPSession, type Target } from "puppeteer-core";
import { resolveSafeRedirects } from "./url";
import { assertPublicUrl } from "../crawl/url-safety";
import { LighthouseAuditError, type LighthouseAuditSummary, type LighthouseMetric, type LighthouseReport, type LighthouseStrategy } from "./types";

type LighthouseRunner = (typeof import("lighthouse"))["default"];
type Lhr = NonNullable<Awaited<ReturnType<LighthouseRunner>>>["lhr"];

function executablePath() {
  const configured = process.env.PUPPETEER_EXECUTABLE_PATH ?? process.env.CHROME_PATH;
  if (configured) return configured;
  const installed = Launcher.getInstallations()[0];
  if (!installed) throw new LighthouseAuditError("BROWSER_FAILURE", "Chromium is not installed on this server.");
  return installed;
}

function percentage(score: number | null | undefined) {
  return typeof score === "number" ? Math.round(score * 100) : null;
}

function auditMetric(lhr: Lhr, id: string): LighthouseMetric {
  const audit = lhr.audits[id];
  return { value: typeof audit?.numericValue === "number" ? audit.numericValue : null, displayValue: audit?.displayValue ?? null };
}

function auditSummary(audit: Lhr["audits"][string]): LighthouseAuditSummary {
  const details = audit.details && "overallSavingsMs" in audit.details ? audit.details as { overallSavingsMs?: number; overallSavingsBytes?: number } : null;
  return {
    id: audit.id ?? "unknown-audit",
    title: audit.title ?? "Unnamed audit",
    description: audit.description,
    score: percentage(audit.score),
    displayValue: audit.displayValue ?? null,
    savingsMs: details?.overallSavingsMs ?? null,
    savingsBytes: details?.overallSavingsBytes ?? null,
  };
}

export function parseLighthouseResult(lhr: Lhr, strategy: LighthouseStrategy): LighthouseReport {
  const audits = Object.values(lhr.audits);
  const networkDetails = lhr.audits["network-requests"]?.details as { items?: unknown[] } | undefined;
  const scored = audits.filter((audit) => typeof audit.score === "number" && !["notApplicable", "manual", "informative"].includes(audit.scoreDisplayMode));
  const opportunities = audits
    .filter((audit) => audit.details?.type === "opportunity" && typeof audit.score === "number" && audit.score < 1)
    .sort((left, right) => ((right.details as { overallSavingsMs?: number }).overallSavingsMs ?? 0) - ((left.details as { overallSavingsMs?: number }).overallSavingsMs ?? 0))
    .slice(0, 10)
    .map(auditSummary);
  const diagnosticWarnings = [
    ...(lhr.runWarnings ?? []),
    ...audits.filter((audit) => audit.scoreDisplayMode === "error").map((audit) => `${audit.title}: ${audit.errorMessage ?? "Audit unavailable"}`),
  ];
  return {
    requestedUrl: lhr.requestedUrl ?? "",
    finalUrl: lhr.finalDisplayedUrl || lhr.finalUrl || lhr.requestedUrl || "",
    strategy,
    fetchedAt: lhr.fetchTime,
    lighthouseVersion: lhr.lighthouseVersion,
    provider: "lighthouse",
    scores: {
      performance: percentage(lhr.categories.performance?.score),
      accessibility: percentage(lhr.categories.accessibility?.score),
      seo: percentage(lhr.categories.seo?.score),
      bestPractices: percentage(lhr.categories["best-practices"]?.score),
    },
    metrics: {
      firstContentfulPaint: auditMetric(lhr, "first-contentful-paint"),
      largestContentfulPaint: auditMetric(lhr, "largest-contentful-paint"),
      cumulativeLayoutShift: auditMetric(lhr, "cumulative-layout-shift"),
      totalBlockingTime: auditMetric(lhr, "total-blocking-time"),
      speedIndex: auditMetric(lhr, "speed-index"),
      timeToInteractive: auditMetric(lhr, "interactive"),
      totalPageSize: auditMetric(lhr, "total-byte-weight"),
      requestCount: { value: Array.isArray(networkDetails?.items) ? networkDetails.items.length : null, displayValue: null },
    },
    opportunities,
    warnings: [...new Set(diagnosticWarnings)].slice(0, 20),
    failedAudits: scored.filter((audit) => (audit.score ?? 1) < .5).sort((a, b) => (a.score ?? 0) - (b.score ?? 0)).slice(0, 20).map(auditSummary),
    passedAudits: scored.filter((audit) => (audit.score ?? 0) >= .9).slice(0, 30).map(auditSummary),
  };
}

function browserPort(browser: Browser) {
  const port = Number(new URL(browser.wsEndpoint()).port);
  if (!Number.isFinite(port)) throw new LighthouseAuditError("BROWSER_FAILURE", "Chromium did not expose a debugging port.");
  return port;
}

async function guardTargetRequests(target: Target, guarded: Set<Target>, sessions: Set<CDPSession>) {
  if (target.type() !== "page" || guarded.has(target)) return;
  guarded.add(target);
  const session = await target.createCDPSession();
  sessions.add(session);
  await session.send("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
  session.on("Fetch.requestPaused", async (event) => {
    try {
      const requestUrl = new URL(event.request.url);
      if (["data:", "blob:", "about:"].includes(requestUrl.protocol)) await session.send("Fetch.continueRequest", { requestId: event.requestId });
      else {
        await assertPublicUrl(requestUrl);
        await session.send("Fetch.continueRequest", { requestId: event.requestId });
      }
    } catch {
      await session.send("Fetch.failRequest", { requestId: event.requestId, errorReason: "BlockedByClient" }).catch(() => undefined);
    }
  });
}

async function enforceBrowserNetworkPolicy(browser: Browser): Promise<() => Promise<void>> {
  const guarded = new Set<Target>();
  const sessions = new Set<CDPSession>();
  const attach = (target: Target) => { void guardTargetRequests(target, guarded, sessions).catch(() => undefined); };
  browser.on("targetcreated", attach);
  await Promise.all(browser.targets().map((target) => guardTargetRequests(target, guarded, sessions)));
  return async () => {
    browser.off("targetcreated", attach);
    await Promise.all(Array.from(sessions, async (session) => session.detach().catch(() => undefined)));
  };
}

type ClosableBrowser = { close: () => Promise<void> };

export async function withBrowserCleanup<T, TBrowser extends ClosableBrowser>(
  launch: () => Promise<TBrowser>,
  operation: (browser: TBrowser) => Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  let browser: TBrowser | null = null;
  let closing: Promise<void> | null = null;
  const closeBrowser = () => {
    if (!browser || closing) return closing;
    closing = browser.close().catch(() => undefined);
    return closing;
  };
  const abortListener = () => { void closeBrowser(); };
  signal.addEventListener("abort", abortListener, { once: true });
  try {
    browser = await launch();
    if (signal.aborted) throw new LighthouseAuditError("TIMEOUT", "The Lighthouse audit exceeded the 180-second limit.");
    return await operation(browser);
  } finally {
    signal.removeEventListener("abort", abortListener);
    await closeBrowser();
  }
}

export function lighthouseFlags(strategy: LighthouseStrategy, port: number) {
  const mobile = strategy === "mobile";
  return {
    port,
    output: "json" as const,
    logLevel: "error" as const,
    onlyCategories: ["performance", "accessibility", "seo", "best-practices"],
    maxWaitForLoad: 60_000,
    formFactor: strategy,
    screenEmulation: mobile
      ? { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false }
      : { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
  };
}

export async function runLighthouseAudit(url: string, strategy: LighthouseStrategy, signal: AbortSignal): Promise<LighthouseReport> {
  try {
    const safeUrl = await resolveSafeRedirects(url, signal);
    return await withBrowserCleanup(
      () => puppeteer.launch({
        executablePath: executablePath(),
        headless: true,
        protocolTimeout: 180_000,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--disable-extensions", "--disable-background-networking"],
      }),
      async (browser) => {
        const releaseNetworkPolicy = await enforceBrowserNetworkPolicy(browser);
        try {
          const { default: lighthouse } = await import("lighthouse");
          const result = await lighthouse(safeUrl.href, lighthouseFlags(strategy, browserPort(browser)));
          if (!result) throw new LighthouseAuditError("AUDIT_FAILED", "Lighthouse did not return a report for this website.");
          // Lighthouse may follow another redirect after the preflight request.
          // Validate the destination before accepting its report.
          await resolveSafeRedirects(result.lhr.finalDisplayedUrl || result.lhr.finalUrl || safeUrl.href, signal);
          if (result.lhr.runtimeError) {
            const runtimeMessage = result.lhr.runtimeError.message || "Lighthouse could not load this website.";
            const runtimeCode = /timeout/i.test(runtimeMessage) ? "TIMEOUT" : /dns|resolve|net::|document request/i.test(runtimeMessage) ? "UNREACHABLE" : "UNSUPPORTED_WEBSITE";
            throw new LighthouseAuditError(runtimeCode, runtimeMessage);
          }
          const parsed = parseLighthouseResult(result.lhr, strategy);
          if (Object.values(parsed.scores).every((score) => score === null)) throw new LighthouseAuditError("UNSUPPORTED_WEBSITE", "Lighthouse loaded the website but could not produce scored audit categories.");
          return parsed;
        } finally {
          await releaseNetworkPolicy();
        }
      },
      signal,
    );
  } catch (error) {
    if (signal.aborted) throw new LighthouseAuditError("TIMEOUT", "The Lighthouse audit exceeded the 180-second limit.");
    if (error instanceof LighthouseAuditError) throw error;
    const message = error instanceof Error ? error.message : "Lighthouse could not audit this website.";
    if (/timeout|timed out|navigation/i.test(message)) throw new LighthouseAuditError("TIMEOUT", "The website did not finish loading within the Lighthouse time limit.");
    if (/browser|target closed|session closed|protocol error|chrome/i.test(message)) throw new LighthouseAuditError("BROWSER_FAILURE", "The audit browser stopped unexpectedly. Try the audit again.");
    if (/dns|resolve|net::err|failed to fetch|unreachable/i.test(message)) throw new LighthouseAuditError("UNREACHABLE", "The website could not be reached by the audit server.");
    throw new LighthouseAuditError("AUDIT_FAILED", message);
  }
}
