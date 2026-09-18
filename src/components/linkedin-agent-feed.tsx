"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Filter,
  Eye,
  Type,
  Lightbulb,
  Share2,
  Clock,
  ArrowRight,
} from "lucide-react";
export type FindingKind =
  | "current_status"
  | "previous_post"
  | "new_post"
  | "comment_opportunity"
  | "audience_signal"
  | "insight";

export interface Finding {
  title?: string;
  evidence?: string;
  impact?: string;
  action?: string;
  description?: string;
  kind?: FindingKind;
  platform?: string;
  sourceLabel?: string;
  publishedAt?: string;
  draftContent?: string;
  recommendedResponse?: string;
  tags?: string[];
  priority?: string;
  confidence?: number;
  sourceUrls?: string[];
  companyName?: string;
  officialWebsite?: string;
  logoUrl?: string;
  competitiveAttributes?: string[];
}

import { LinkedInPreview } from "./previews/linkedin-preview";
import { SocialCompanyIdentity, companyLogoSource } from "./social-company-identity";

type LinkedInTab = "all" | "post_draft" | "findings";

export function LinkedInAgentFeed({
  items,
  company,
  liveConnected,
  completedOpportunities,
  completeOpportunity,
  runAgent,
  running,
}: {
  items: Finding[];
  company: { id: string; name: string; websiteUrl: string; logoUrl?: string | null };
  liveConnected: boolean;
  completedOpportunities: Set<string>;
  completeOpportunity: (type: string, key: string) => Promise<void>;
  runAgent: (type: string) => Promise<void>;
  running: boolean;
}) {
  const [activeTab, setActiveTab] = useState<LinkedInTab>("all");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [draftText, setDraftText] = useState<string>("");
  const [activeViewer, setActiveViewer] = useState<"editor" | "preview">("editor");
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({});

  const postDraftItem = useMemo(() => items.find((item) => item.kind === "new_post") || items[0], [items]);
  const strategyFindings = useMemo(() => items.filter((item) => item.kind !== "new_post"), [items]);

  const initialDraft = useMemo(() => {
    return (
      postDraftItem?.draftContent ||
      postDraftItem?.evidence ||
      postDraftItem?.description ||
      ""
    );
  }, [postDraftItem]);

  const currentDraft = draftText || initialDraft;
  const postKey = `LINKEDIN-${postDraftItem?.title || "post"}-0`;
  const isPostCompleted = completedOpportunities.has(postKey);

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleFinding = useCallback((key: string) => {
    setExpandedFindings((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <div className="linkedin-feed">
      {/* ── Header ── */}
      <div className="linkedin-feed__header">
        <div className="linkedin-feed__header-left">
          <span className="linkedin-feed__platform-icon">in</span>
          <strong>LinkedIn content for {company.name}</strong>
        </div>
        <button
          type="button"
          className="linkedin-feed__refresh"
          onClick={() => runAgent("LINKEDIN")}
          disabled={running}
          aria-label="Refresh LinkedIn content"
          title="Refresh LinkedIn content"
        >
          <RefreshCw size={13} className={running ? "sc-spinning" : ""} />
        </button>
      </div>

      {/* ── Filter Chips ── */}
      <div className="linkedin-feed__filters">
        <button
          type="button"
          className={`sc-filter-chip ${activeTab === "all" ? "sc-filter-chip--active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          <span>All</span>
          <span className="sc-filter-chip__count">{items.length}</span>
        </button>
        {postDraftItem && (
          <button
            type="button"
            className={`sc-filter-chip ${activeTab === "post_draft" ? "sc-filter-chip--active" : ""}`}
            onClick={() => setActiveTab("post_draft")}
          >
            <Type size={11} />
            <span>Post Draft</span>
            {isPostCompleted && <span className="sc-filter-chip__count" style={{ display: "inline-flex", alignItems: "center" }}><Check size={9} /></span>}
          </button>
        )}
        <button
          type="button"
          className={`sc-filter-chip ${activeTab === "findings" ? "sc-filter-chip--active" : ""}`}
          onClick={() => setActiveTab("findings")}
        >
          <Lightbulb size={11} />
          <span>Strategic Signals</span>
          <span className="sc-filter-chip__count">{strategyFindings.length}</span>
        </button>
      </div>

      {/* ── Content Stream ── */}
      <div className="linkedin-feed__stream">
        {/* ── Post Draft Card ── */}
        {postDraftItem && (activeTab === "all" || activeTab === "post_draft") && (
          <div className={`linkedin-card ${isPostCompleted ? "linkedin-card--completed" : ""}`}>
            <div className="linkedin-card__header">
              <div className="linkedin-card__header-left social-post-card__header-left">
                <SocialCompanyIdentity
                  companyName={company.name}
                  companyWebsite={company.websiteUrl}
                  companyLogoUrl={company.logoUrl}
                  platform="LinkedIn"
                  meta="post draft"
                  compact
                />
                <div className="social-post-card__summary">
                  <h4 className="linkedin-card__title">{postDraftItem.title || "Thought Leadership Post"}</h4>
                  <p>{currentDraft}</p>
                </div>
              </div>
              <div className="linkedin-card__header-right">
                <div className="linkedin-card__view-toggle">
                  <button
                    type="button"
                    className={`linkedin-card__toggle-btn ${activeViewer === "editor" ? "active" : ""}`}
                    onClick={() => setActiveViewer("editor")}
                  >
                    <Type size={12} />
                    <span>Editor</span>
                  </button>
                  <button
                    type="button"
                    className={`linkedin-card__toggle-btn ${activeViewer === "preview" ? "active" : ""}`}
                    onClick={() => setActiveViewer("preview")}
                  >
                    <Eye size={12} />
                    <span>Preview</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="linkedin-card__body">
              {activeViewer === "editor" ? (
                <div className="linkedin-card__editor-wrap">
                  <textarea
                    className="linkedin-card__textarea"
                    rows={7}
                    value={currentDraft}
                    onChange={(e) => setDraftText(e.target.value)}
                    placeholder="AI generated LinkedIn thought leadership post..."
                  />
                  <div className="linkedin-card__editor-meta">
                    <span className="linkedin-card__char-count">{currentDraft.length} / 3,000 characters</span>
                    <span className="linkedin-card__guidance">Recommended: 1,000–1,500 chars for executive reach</span>
                  </div>
                </div>
              ) : (
                <div className="linkedin-card__preview-wrap">
                  <LinkedInPreview
                    companyName={company.name}
                    companyHeadline={company.websiteUrl.replace(/^https?:\/\/(?:www\.)?/, "").replace(/\/$/, "")}
                    avatarUrl={companyLogoSource(company.logoUrl) || (company.websiteUrl ? `/api/assets/logo?website=${encodeURIComponent(company.websiteUrl)}` : undefined)}
                    content={currentDraft}
                    likesCount={0}
                    commentsCount={0}
                    repostsCount={0}
                  />
                </div>
              )}

              {/* Actions Footer */}
              <div className="linkedin-card__actions">
                <div className="linkedin-card__status-note">
                  {liveConnected ? "Connected to live LinkedIn" : "Discovered from company memory"}
                </div>
                <div className="linkedin-card__actions-right">
                  <button
                    type="button"
                    className="sc-btn sc-btn--secondary sc-btn--sm"
                    onClick={() => handleCopy(currentDraft, postKey)}
                  >
                    {copiedKey === postKey ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedKey === postKey ? "Copied" : "Copy Post"}</span>
                  </button>
                  <button
                    type="button"
                    className={`sc-btn ${isPostCompleted ? "sc-btn--secondary" : "sc-btn--primary"} sc-btn--sm`}
                    onClick={() => completeOpportunity("LINKEDIN", postKey)}
                  >
                    <CheckCircle2 size={12} />
                    <span>{isPostCompleted ? "Reviewed" : "Mark Complete"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Strategy Signals List ── */}
        {(activeTab === "all" || activeTab === "findings") && strategyFindings.length > 0 && (
          <div className="linkedin-signals-section">
            <div className="linkedin-signals-section__title">
              <Lightbulb size={13} />
              <span>Strategy & Opportunity Findings ({strategyFindings.length})</span>
            </div>

            <div className="linkedin-signals-list">
              {strategyFindings.map((item, idx) => {
                const fKey = `finding-${idx}`;
                const isExp = expandedFindings[fKey] ?? false;

                return (
                  <div key={fKey} className="linkedin-signal-item">
                    <div className="linkedin-signal-item__header" onClick={() => toggleFinding(fKey)}>
                      <div className="linkedin-signal-item__left">
                        <span className="linkedin-signal-item__num">0{idx + 1}</span>
                        <h5 className="linkedin-signal-item__title">{item.title}</h5>
                      </div>
                      <div className="linkedin-signal-item__right">
                        {item.priority && (
                          <span className={`sc-badge sc-badge--sm sc-badge--${item.priority === "high" ? "error" : "default"}`}>
                            {item.priority.toUpperCase()}
                          </span>
                        )}
                        {isExp ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </div>
                    </div>

                    {isExp && (
                      <div className="linkedin-signal-item__body">
                        <p className="linkedin-signal-item__evidence">
                          {item.evidence || item.description}
                        </p>
                        {item.impact && (
                          <div className="linkedin-signal-item__callout">
                            <strong>Why it matters:</strong> {item.impact}
                          </div>
                        )}
                        {item.action && (
                          <div className="linkedin-signal-item__callout linkedin-signal-item__callout--action">
                            <strong>Recommended Angle:</strong> {item.action}
                          </div>
                        )}
                        {item.sourceUrls?.length ? (
                          <div className="linkedin-signal-item__source">
                            <a href={item.sourceUrls[0]} target="_blank" rel="noreferrer">
                              <ExternalLink size={10} /> Discovered reference source
                            </a>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
