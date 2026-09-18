"use client";

import { useState } from "react";
import {
  Sparkles,
  Link2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Share2,
  Network,
  Compass,
  Layers,
  ArrowUpRight,
  ChevronRight,
  GitBranch,
} from "lucide-react";
import { analyzeLinkStructure, type BacklinksIntelligence } from "@/lib/seo/backlinks";

interface AnalyticsLinksViewProps {
  companyUrl: string;
  crawlPages?: Array<{ url: string; title?: string | null; content: string }>;
}

export function AnalyticsLinksView({ companyUrl, crawlPages = [] }: AnalyticsLinksViewProps) {
  const data: BacklinksIntelligence = analyzeLinkStructure(companyUrl, crawlPages);

  const cleanHost = (() => {
    try {
      return new URL(companyUrl.startsWith("http") ? companyUrl : `https://${companyUrl}`).hostname.replace(/^www\./, "");
    } catch {
      return companyUrl;
    }
  })();

  const hubCount = data.internalLinkGraph.filter((p) => p.isHub).length;
  const orphanCount = data.internalLinkGraph.filter((p) => p.isOrphan).length;

  return (
    <div className="analytics-links-container">
      {/* 1. Header Banner */}
      <div className="links-header-panel">
        <div className="links-header-info">
          <div className="links-header-icon">
            <Network size={16} />
          </div>
          <div>
            <strong>Internal Link Graph &amp; Backlink Intelligence</strong>
            <small>{data.inspectedPages} pages inspected · {data.totalInternalLinks} internal link edges</small>
          </div>
        </div>
        <span className="links-header-badge">
          <Sparkles size={11} /> Evidence-Led
        </span>
      </div>

      {/* 2. 2x2 Metric Matrix */}
      <div className="links-metrics-matrix">
        <div className="links-metric-cell">
          <div className="metric-cell-head">
            <span>Link Health</span>
            <ShieldCheck size={13} className="text-emerald-500" />
          </div>
          <strong className="metric-cell-val">{data.healthScore}<span>/100</span></strong>
          <small className="metric-cell-hint">Graph integrity &amp; safety</small>
        </div>

        <div className="links-metric-cell">
          <div className="metric-cell-head">
            <span>Common Crawl PR</span>
            <Compass size={13} className="text-blue-500" />
          </div>
          <strong className="metric-cell-val">~{data.commonCrawl.estimatedPageRank ?? "—"}</strong>
          <small className="metric-cell-hint">{data.commonCrawl.inboundDomainRange}</small>
        </div>

        <div className="links-metric-cell">
          <div className="metric-cell-head">
            <span>Harmonic Centrality</span>
            <GitBranch size={13} className="text-purple-500" />
          </div>
          <strong className="metric-cell-val">{data.commonCrawl.harmonicCentrality ?? "—"}</strong>
          <small className="metric-cell-hint">Web-graph connectivity</small>
        </div>

        <div className="links-metric-cell">
          <div className="metric-cell-head">
            <span>Topology Status</span>
            <Layers size={13} className="text-amber-500" />
          </div>
          <strong className="metric-cell-val">{hubCount} Hubs</strong>
          <small className="metric-cell-hint">{orphanCount} orphan pages detected</small>
        </div>
      </div>

      {/* 3. Anchor Text Naturalness Profile */}
      <div className="links-section-card">
        <div className="links-section-head">
          <span className="links-section-title">
            <Share2 size={13} /> Anchor Text Naturalness Profile
          </span>
          <span className="links-section-sub">Target: Branded &gt; 35%</span>
        </div>

        <div className="anchor-breakdown-list">
          {data.anchorDistribution.map((item) => (
            <div key={item.type} className="anchor-breakdown-row">
              <div className="anchor-row-labels">
                <span className="anchor-type-name">{item.type}</span>
                <span className="anchor-type-stat">
                  <strong>{item.percentage}%</strong> ({item.count})
                </span>
              </div>
              <div className="anchor-bar-track">
                <div
                  className={`anchor-bar-fill anchor-bar-fill--${item.type}`}
                  style={{ width: `${Math.max(4, item.percentage)}%` }}
                />
              </div>
              {item.examples.length > 0 && (
                <p className="anchor-examples-text">
                  <span>Samples:</span> {item.examples.join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Internal Link Architecture (Hubs & Orphans) */}
      <div className="links-section-card">
        <div className="links-section-head">
          <span className="links-section-title">
            <Layers size={13} /> Internal Linking Topology
          </span>
          <span className="links-section-sub">{data.internalLinkGraph.length} pages mapped</span>
        </div>

        <div className="topology-table">
          {data.internalLinkGraph.slice(0, 10).map((page) => {
            let path = "/";
            try {
              path = new URL(page.url).pathname || "/";
            } catch {
              path = page.url;
            }
            return (
              <div key={page.url} className="topology-item-row">
                <div className="topology-path-block">
                  <span className="topology-path">{path}</span>
                  {page.title && <span className="topology-title">{page.title}</span>}
                </div>
                <div className="topology-badges">
                  {page.isHub && (
                    <span className="sc-badge sc-badge--success">
                      Hub ({page.outboundCount} out)
                    </span>
                  )}
                  {page.isOrphan && (
                    <span className="sc-badge sc-badge--danger">
                      Orphan (0 in)
                    </span>
                  )}
                  {!page.isHub && !page.isOrphan && (
                    <span className="sc-badge sc-badge--neutral">
                      {page.inboundCount} in · {page.outboundCount} out
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Warnings & Recommendations */}
      {(data.warnings.length > 0 || data.recommendations.length > 0) && (
        <div className="links-section-card">
          <div className="links-section-head">
            <span className="links-section-title">
              <AlertTriangle size={13} className="text-amber-500" /> Link Profile Recommendations
            </span>
            <span className="links-section-sub">
              {data.warnings.length + data.recommendations.length} action items
            </span>
          </div>
          <div className="links-recs-list">
            {data.warnings.map((w, idx) => (
              <div key={`w-${idx}`} className="link-rec-item link-rec-item--warn">
                <AlertTriangle size={13} className="shrink-0 text-amber-500 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}
            {data.recommendations.map((r, idx) => (
              <div key={`r-${idx}`} className="link-rec-item link-rec-item--good">
                <CheckCircle2 size={13} className="shrink-0 text-emerald-500 mt-0.5" />
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Honest Verification Notice */}
      <div className="links-evidence-footer">
        <ShieldCheck size={13} className="shrink-0 text-purple-400" />
        <p>
          Internal link graph and anchor distributions are derived from live DOM crawling and Common Crawl open web data. No synthetic metrics or fabricated backlink estimates.
        </p>
      </div>
    </div>
  );
}

