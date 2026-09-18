import { afterEach, describe, expect, it, vi } from "vitest";
import { runPageSpeedAudit } from "./pagespeed";

const audit = (score: number | null, numericValue: number, displayValue: string, details?: Record<string, unknown>) => ({
  title: "Synthetic audit",
  description: "Synthetic audit fixture",
  score,
  scoreDisplayMode: score === null ? "informative" : "numeric",
  numericValue,
  displayValue,
  details,
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("PageSpeed Insights provider", () => {
  it("normalizes Google-hosted Lighthouse output into the shared report shape", async () => {
    vi.stubEnv("PAGESPEED_INSIGHTS_API_KEY", "test-key");
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify({
      lighthouseResult: {
        requestedUrl: "https://example.com/",
        finalDisplayedUrl: "https://example.com/",
        fetchTime: "2026-08-30T10:00:00.000Z",
        lighthouseVersion: "13.4.1",
        runWarnings: [],
        categories: {
          performance: { score: 0.9 },
          accessibility: { score: 0.8 },
          seo: { score: 1 },
          "best-practices": { score: 0.7 },
        },
        audits: {
          "first-contentful-paint": audit(1, 800, "0.8 s"),
          "largest-contentful-paint": audit(0.8, 1200, "1.2 s"),
          "cumulative-layout-shift": audit(1, 0.01, "0.010"),
          "total-blocking-time": audit(0.7, 100, "100 ms"),
          "speed-index": audit(0.9, 1100, "1.1 s"),
          interactive: audit(0.8, 1500, "1.5 s"),
          "total-byte-weight": audit(0.9, 200000, "200 KB"),
          "network-requests": { details: { items: [{}, {}] } },
          "unused-javascript": audit(0.5, 100, "Potential savings 100 ms", { type: "opportunity", overallSavingsMs: 100 }),
        },
      },
    }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const report = await runPageSpeedAudit("https://example.com/", "mobile", new AbortController().signal);
    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(report.provider).toBe("pagespeed");
    expect(report.scores.performance).toBe(90);
    expect(report.metrics.requestCount.value).toBe(2);
    expect(requestUrl.searchParams.get("key")).toBe("test-key");
    expect(requestUrl.searchParams.get("strategy")).toBe("mobile");
    expect(requestUrl.searchParams.getAll("category")).toHaveLength(4);
  });
});
