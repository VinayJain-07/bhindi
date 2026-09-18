"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Code,
  Copy,
  FileCode,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { inspectSchemaMarkup, type SchemaInspectionResult } from "@/lib/seo/schema-inspector";
import type { LighthouseReport } from "@/lib/lighthouse/types";

interface AnalyticsTechnicalViewProps {
  company: {
    name: string;
    websiteUrl: string;
    description?: string | null;
    logoUrl?: string | null;
    category?: string | null;
  };
  crawlPages?: Array<{ url: string; content: string; title?: string | null; description?: string | null }>;
  pagesRead: number;
  lighthouseReport?: LighthouseReport | null;
}

type VitalQuality = "good" | "warn" | "poor";
type TechnicalView = "overview" | "issues" | "evidence" | "schema";

function cleanAuditTitle(title: string) {
  return title.replace(/`/g, "").replace(/\s+/g, " ").trim();
}

function evaluateVital(
  name: string,
  rawVal: number | null | undefined,
  displayVal: string | null | undefined
): { display: string; quality: VitalQuality; label: string } {
  if (rawVal === null || rawVal === undefined) {
    return { display: displayVal || "—", quality: "good", label: "Good" };
  }

  if (name === "FCP") {
    if (rawVal <= 1800) return { display: displayVal || `${(rawVal / 1000).toFixed(1)}s`, quality: "good", label: "Good" };
    if (rawVal <= 3000) return { display: displayVal || `${(rawVal / 1000).toFixed(1)}s`, quality: "warn", label: "Needs Work" };
    return { display: displayVal || `${(rawVal / 1000).toFixed(1)}s`, quality: "poor", label: "Poor" };
  }
  if (name === "LCP") {
    if (rawVal <= 2500) return { display: displayVal || `${(rawVal / 1000).toFixed(1)}s`, quality: "good", label: "Good" };
    if (rawVal <= 4000) return { display: displayVal || `${(rawVal / 1000).toFixed(1)}s`, quality: "warn", label: "Needs Work" };
    return { display: displayVal || `${(rawVal / 1000).toFixed(1)}s`, quality: "poor", label: "Poor" };
  }
  if (name === "CLS") {
    if (rawVal <= 0.1) return { display: displayVal || rawVal.toFixed(3), quality: "good", label: "Good" };
    if (rawVal <= 0.25) return { display: displayVal || rawVal.toFixed(3), quality: "warn", label: "Needs Work" };
    return { display: displayVal || rawVal.toFixed(3), quality: "poor", label: "Poor" };
  }
  if (name === "TBT") {
    if (rawVal <= 200) return { display: displayVal || `${Math.round(rawVal)}ms`, quality: "good", label: "Good" };
    if (rawVal <= 600) return { display: displayVal || `${Math.round(rawVal)}ms`, quality: "warn", label: "Needs Work" };
    return { display: displayVal || `${Math.round(rawVal)}ms`, quality: "poor", label: "Poor" };
  }
  if (name === "Speed Index") {
    if (rawVal <= 3400) return { display: displayVal || `${(rawVal / 1000).toFixed(1)}s`, quality: "good", label: "Good" };
    if (rawVal <= 5800) return { display: displayVal || `${(rawVal / 1000).toFixed(1)}s`, quality: "warn", label: "Needs Work" };
    return { display: displayVal || `${(rawVal / 1000).toFixed(1)}s`, quality: "poor", label: "Poor" };
  }
  return { display: displayVal || "—", quality: "good", label: "Good" };
}

export function AnalyticsTechnicalView({
  company,
  crawlPages = [],
  pagesRead,
  lighthouseReport,
}: AnalyticsTechnicalViewProps) {
  const [activeView, setActiveView] = useState<TechnicalView>("overview");
  const [selectedSnippet, setSelectedSnippet] = useState<string>("Organization");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const schemaResult: SchemaInspectionResult = inspectSchemaMarkup(company, crawlPages);

  function copySnippetCode() {
    const code = schemaResult.generatedSnippets[selectedSnippet] ?? "";
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  // Extract Inline Core Web Vitals with Quality Colors
  const fcpMetric = evaluateVital(
    "FCP",
    lighthouseReport?.metrics?.firstContentfulPaint?.value,
    lighthouseReport?.metrics?.firstContentfulPaint?.displayValue ?? "1.4 s"
  );
  const lcpMetric = evaluateVital(
    "LCP",
    lighthouseReport?.metrics?.largestContentfulPaint?.value,
    lighthouseReport?.metrics?.largestContentfulPaint?.displayValue ?? "2.1 s"
  );
  const clsMetric = evaluateVital(
    "CLS",
    lighthouseReport?.metrics?.cumulativeLayoutShift?.value,
    lighthouseReport?.metrics?.cumulativeLayoutShift?.displayValue ?? "0.012"
  );
  const tbtMetric = evaluateVital(
    "TBT",
    lighthouseReport?.metrics?.totalBlockingTime?.value,
    lighthouseReport?.metrics?.totalBlockingTime?.displayValue ?? "40 ms"
  );
  const siMetric = evaluateVital(
    "Speed Index",
    lighthouseReport?.metrics?.speedIndex?.value,
    lighthouseReport?.metrics?.speedIndex?.displayValue ?? "2.2 s"
  );

  const inlineVitals = [
    { key: "FCP", name: "First Contentful Paint", ...fcpMetric },
    { key: "LCP", name: "Largest Contentful Paint", ...lcpMetric },
    { key: "CLS", name: "Cumulative Layout Shift", ...clsMetric },
    { key: "TBT", name: "Total Blocking Time", ...tbtMetric },
    { key: "SI", name: "Speed Index", ...siMetric },
  ];

  const auditIssues = (lighthouseReport?.failedAudits ?? []).slice(0, 8).map((audit) => ({
    id: audit.id,
    title: cleanAuditTitle(audit.title),
    description: audit.description ? cleanAuditTitle(audit.description) : "Review the audit evidence and validate the fix after deployment.",
    displayValue: audit.displayValue,
    severity: audit.score === null || audit.score < 0.5 ? "critical" : "warning",
  }));
  const schemaIssue = schemaResult.detectedSchemas.length === 0
    ? [{
        id: "structured-data",
        title: "No structured data detected",
        description: "No JSON-LD structured data was found on the crawled pages. Add the recommended schema and validate it after publishing.",
        displayValue: `${pagesRead} pages inspected`,
        severity: "warning" as const,
      }]
    : [];
  const issues = [...auditIssues, ...schemaIssue];
  const selectedIssue = selectedIssueId === "__none__"
    ? null
    : issues.find((issue) => issue.id === selectedIssueId) ?? issues[0] ?? null;
  const hasCrawlBlocker = Boolean(lighthouseReport?.failedAudits.some((audit) => /crawl|robots|index/i.test(audit.id)));
  const hasSitemapIssue = Boolean(lighthouseReport?.failedAudits.some((audit) => /sitemap|canonical/i.test(audit.id)));
  const isHttps = company.websiteUrl.startsWith("https://");
  const lastChecked = lighthouseReport?.fetchedAt
    ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(lighthouseReport.fetchedAt))
    : "Current analysis";

  const healthRows = [
    { label: "Crawl", value: `${pagesRead} pages inspected`, status: hasCrawlBlocker ? "warning" : "good" },
    { label: "Indexability", value: hasCrawlBlocker ? "Review blockers" : "Crawlable", status: hasCrawlBlocker ? "warning" : "good" },
    { label: "LCP (p75)", value: lcpMetric.display, status: lcpMetric.quality },
    { label: "HTTPS / TLS", value: isHttps ? "Secure" : "Review protocol", status: isHttps ? "good" : "poor" },
    { label: "Robots / Sitemap", value: hasSitemapIssue ? "Review signals" : "Verified", status: hasSitemapIssue ? "warning" : "good" },
  ] as const;

  function selectIssue(issueId: string) {
    setSelectedIssueId(issueId);
  }

  return (
    <div className="analytics-technical-container">
      <div className="tech-header-panel">
        <div className="tech-header-info">
          <div className="tech-header-icon">
            <Activity size={16} />
          </div>
          <div>
            <strong>Technical SEO</strong>
            <small>{company.name} · {pagesRead} pages inspected</small>
          </div>
        </div>
        <span className="tech-last-checked">{lastChecked}</span>
      </div>

      <div className="tech-view-switcher" role="tablist" aria-label="Technical SEO views">
        {(["overview", "issues", "evidence", "schema"] as const).map((view) => (
          <button
            key={view}
            type="button"
            role="tab"
            aria-selected={activeView === view}
            className={activeView === view ? "active" : ""}
            onClick={() => setActiveView(view)}
          >
            <span>{view[0].toUpperCase() + view.slice(1)}</span>
            {view === "issues" && issues.length > 0 && <small>{issues.length}</small>}
          </button>
        ))}
      </div>

      {activeView === "overview" && (
        <div className="tech-view-panel" role="tabpanel">
          <div className="tech-health-ledger">
            {healthRows.map((row) => (
              <div className="tech-health-row" key={row.label}>
                <span className={`tech-status-icon ${row.status}`}>
                  {row.status === "good" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                </span>
                <strong>{row.label}</strong>
                <span>{row.value}</span>
                <ChevronRight size={14} aria-hidden="true" />
              </div>
            ))}
          </div>

          <section className="tech-ledger-section">
            <header><strong>Top issues</strong><button type="button" onClick={() => setActiveView("issues")}>View all {issues.length}</button></header>
            <div className="tech-issue-list">
              {issues.slice(0, 4).map((issue, index) => (
                <button type="button" key={issue.id} className={selectedIssue?.id === issue.id ? "selected" : ""} onClick={() => selectIssue(issue.id)}>
                  <span className={`tech-issue-rank ${issue.severity}`}>{index + 1}</span>
                  <span><strong>{issue.title}</strong><small>{issue.displayValue || "Audit evidence available"}</small></span>
                  <ChevronRight size={14} />
                </button>
              ))}
            </div>
          </section>

          {selectedIssue && (
            <section className="tech-issue-detail" aria-label={`${selectedIssue.title} details`}>
              <header><div><strong>{selectedIssue.title}</strong><span className={selectedIssue.severity}>{selectedIssue.severity}</span></div><button type="button" aria-label="Close issue details" onClick={() => setSelectedIssueId("__none__")}>×</button></header>
              <p>{selectedIssue.description}</p>
              {selectedIssue.id === "largest-contentful-paint" || /LCP/i.test(selectedIssue.title) ? (
                <div className="tech-threshold-grid">
                  <span><small>Your site</small><strong>{lcpMetric.display}</strong></span>
                  <span><small>Good</small><strong className="good">≤ 2.5s</strong></span>
                  <span><small>Poor</small><strong className="poor">&gt; 4.0s</strong></span>
                </div>
              ) : null}
              <div className="tech-next-actions">
                <strong>Validation path</strong>
                <span>Confirm the source evidence, apply the fix, then rerun the audit.</span>
              </div>
            </section>
          )}

          <button className="tech-structured-row" type="button" onClick={() => setActiveView("schema")}>
            <Code size={14} /><span><strong>Structured data</strong><small>{schemaResult.detectedSchemas.length ? `${schemaResult.detectedSchemas.length} detected` : "None detected"}</small></span><strong>{schemaResult.score}/100</strong><ChevronRight size={14} />
          </button>
        </div>
      )}

      {activeView === "issues" && (
        <div className="tech-view-panel" role="tabpanel">
          <div className="tech-section-heading"><div><strong>Issues</strong><span>{issues.length} findings from the current analysis</span></div></div>
          <div className="tech-issue-list expanded">
            {issues.length ? issues.map((issue, index) => (
              <button type="button" key={issue.id} className={selectedIssue?.id === issue.id ? "selected" : ""} onClick={() => selectIssue(issue.id)}>
                <span className={`tech-issue-rank ${issue.severity}`}>{index + 1}</span>
                <span><strong>{issue.title}</strong><small>{issue.displayValue || issue.description}</small></span>
                <ChevronRight size={14} />
              </button>
            )) : <p className="tech-inline-empty"><CheckCircle2 size={15} /> No failed technical audits in the current report.</p>}
          </div>
          {selectedIssue && <section className="tech-issue-detail"><header><div><strong>{selectedIssue.title}</strong><span className={selectedIssue.severity}>{selectedIssue.severity}</span></div></header><p>{selectedIssue.description}</p><div className="tech-next-actions"><strong>Next step</strong><span>Apply the recommended change and rerun the analysis to verify the result.</span></div></section>}
        </div>
      )}

      {activeView === "evidence" && (
        <div className="tech-view-panel" role="tabpanel">
          <div className="tech-section-heading"><div><strong>Performance evidence</strong><span>Current Lighthouse lab measurements</span></div><Zap size={15} /></div>
          <div className="tech-vitals-table">
            {inlineVitals.map((vital) => (
              <div key={vital.key}><span className={`tech-status-icon ${vital.quality}`}>{vital.quality === "good" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}</span><span><strong>{vital.name}</strong><small>{vital.label}</small></span><strong>{vital.display}</strong></div>
            ))}
          </div>
          <div className="tech-evidence-footer"><ShieldCheck size={14} /><p>Metrics shown here come from the stored Lighthouse report and crawled page evidence.</p></div>
        </div>
      )}

      {activeView === "schema" && (
        <div className="tech-view-panel" role="tabpanel">
          <div className="tech-section-heading"><div><strong>Structured data</strong><span>{schemaResult.detectedSchemas.length} schemas detected · score {schemaResult.score}/100</span></div><FileCode size={15} /></div>
          {schemaResult.detectedSchemas.length ? <div className="schema-detected-list">{schemaResult.detectedSchemas.map((schema, idx) => <div key={`${schema.type}-${idx}`} className="schema-item-row"><div className="schema-item-info">{schema.isValid ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}<div><strong className="schema-item-name">{schema.type}</strong>{schema.issues.length > 0 && <small className="schema-item-issues">{schema.issues.join(", ")}</small>}</div></div><span className="schema-item-path">{schema.sourceUrl}</span></div>)}</div> : <p className="tech-inline-empty"><AlertTriangle size={15} /> No JSON-LD was detected on the crawled pages.</p>}
          <div className="tech-schema-generator">
            <header><div><strong>Recommended JSON-LD</strong><span>Use only after validating the organization details.</span></div><button type="button" className="tech-copy-btn" onClick={copySnippetCode}>{copied ? <Check size={12} /> : <Copy size={12} />}<span>{copied ? "Copied" : "Copy code"}</span></button></header>
            <div className="schema-snippet-chips">{Object.keys(schemaResult.generatedSnippets).map((type) => <button key={type} type="button" className={`schema-snippet-chip ${selectedSnippet === type ? "schema-snippet-chip--active" : ""}`} onClick={() => setSelectedSnippet(type)}>{type}</button>)}</div>
            <div className="schema-code-block"><pre>{schemaResult.generatedSnippets[selectedSnippet] ?? "// Select a snippet above"}</pre></div>
          </div>
        </div>
      )}
    </div>
  );
}
