import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LighthouseReport } from "@/lib/lighthouse/types";
import { LighthouseAuditPanel, LighthouseReportView } from "./lighthouse-audit-panel";

const metric = (value: number, displayValue: string) => ({ value, displayValue });
const report: LighthouseReport = {
  requestedUrl: "https://example.com/",
  finalUrl: "https://example.com/",
  strategy: "mobile",
  fetchedAt: "2026-08-29T12:00:00.000Z",
  lighthouseVersion: "13.4.1",
  scores: { performance: 97, accessibility: 96, seo: 91, bestPractices: 94 },
  metrics: {
    firstContentfulPaint: metric(820, "0.8 s"),
    largestContentfulPaint: metric(1240, "1.2 s"),
    cumulativeLayoutShift: metric(0.012, "0.012"),
    totalBlockingTime: metric(45, "50 ms"),
    speedIndex: metric(1100, "1.1 s"),
    timeToInteractive: metric(1500, "1.5 s"),
    totalPageSize: metric(204800, "200 KB"),
    requestCount: metric(24, "24"),
  },
  opportunities: [{ id: "unused-javascript", title: "Reduce unused JavaScript", description: "Remove unused code.", score: 70, displayValue: "Potential savings of 120 KiB", savingsMs: 300, savingsBytes: 122880 }],
  warnings: ["A test warning"],
  failedAudits: [{ id: "unused-css-rules", title: "Reduce unused CSS", description: "Remove unused CSS.", score: 40, displayValue: null, savingsMs: 100, savingsBytes: 20480 }],
  passedAudits: [{ id: "document-title", title: "Document has a title", description: "Title is present.", score: 100, displayValue: null, savingsMs: null, savingsBytes: null }],
};

describe("completed Lighthouse report rendering", () => {
  it("renders every required score, metric, finding group, timestamp context, and fresh-audit action", () => {
    const markup = renderToStaticMarkup(createElement(LighthouseReportView, { report, cacheHit: false }));

    for (const text of ["Report ready", "Performance", "Accessibility", "SEO", "Best practices", "FCP", "LCP", "CLS", "TBT", "Speed Index", "Interactive", "Page size", "Requests", "Top opportunities", "Failed audits", "Passed audits", "Diagnostic warnings", "Run fresh", "lab test, not field data"]) {
      expect(markup).toContain(text);
    }
    expect(markup).toContain("97");
    expect(markup).toContain("Reduce unused JavaScript");
    expect(markup).toContain("https://example.com/");
  });

  it("uses the saved company website without rendering a second URL form", () => {
    const markup = renderToStaticMarkup(createElement(LighthouseAuditPanel, { defaultUrl: "https://company.example/path" }));

    expect(markup).toContain("Company website");
    expect(markup).toContain("company.example");
    expect(markup).not.toContain("Public website URL");
    expect(markup).not.toContain("<input");
    expect(markup).not.toContain("Run Lighthouse audit");
  });
});
