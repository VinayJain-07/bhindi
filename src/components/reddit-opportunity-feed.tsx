"use client";

import React, { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Trash2,
  CheckCircle2,
  Filter,
} from "lucide-react";
import type { RedditActionFeedOpportunity } from "@/lib/signals/store";
import type { ReplyVariant } from "@/lib/reddit/writer";
import { isVerifiedRedditOpportunityIdentity } from "@/lib/reddit/qualifier";
import { SocialCompanyIdentity } from "./social-company-identity";

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */

function cleanRedditText(value: string) {
  return value
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(?:br|\/p|\/div|\/li)\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function formatRedditPublishedAt(value: string | null): string {
  if (!value) return "Time unavailable";
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return "Time unavailable";
  return timestamp.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function scoreTierClass(total: number) {
  if (total >= 90) return "sc-score--exceptional";
  if (total >= 80) return "sc-score--high";
  if (total >= 65) return "sc-score--medium";
  return "sc-score--low";
}

type TabFilter = "all" | "high_priority" | "unreplied" | "replied" | "dismissed";

/* ─────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────── */

export function RedditOpportunityFeed({
  companyId,
  companyName,
  companyWebsite,
  companyLogoUrl,
  initialOpportunities,
  onOpportunityUpdated,
}: {
  companyId: string;
  companyName: string;
  companyWebsite?: string | null;
  companyLogoUrl?: string | null;
  initialOpportunities: RedditActionFeedOpportunity[];
  onOpportunityUpdated?: () => void;
}) {
  const [opportunities, setOpportunities] = useState<RedditActionFeedOpportunity[]>(
    initialOpportunities.filter(isVerifiedRedditOpportunityIdentity),
  );
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [draftTexts, setDraftTexts] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  /* ── Counts ── */
  const counts = useMemo(() => {
    const nonDismissed = opportunities.filter((o) => o.lifecycleStatus !== "dismissed");
    return {
      all: nonDismissed.length,
      high_priority: nonDismissed.filter((o) => o.score.total >= 80).length,
      unreplied: nonDismissed.filter((o) => o.lifecycleStatus !== "replied").length,
      replied: opportunities.filter((o) => o.lifecycleStatus === "replied").length,
      dismissed: opportunities.filter((o) => o.lifecycleStatus === "dismissed").length,
    };
  }, [opportunities]);

  /* ── Filtered list ── */
  const displayedOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      if (activeTab === "all") return opp.lifecycleStatus !== "dismissed";
      if (activeTab === "high_priority") return opp.score.total >= 80 && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "unreplied") return opp.lifecycleStatus !== "replied" && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "replied") return opp.lifecycleStatus === "replied";
      if (activeTab === "dismissed") return opp.lifecycleStatus === "dismissed";
      return true;
    });
  }, [opportunities, activeTab]);

  const toggleCard = useCallback((id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleSelectVariant = (oppId: string, variant: ReplyVariant) => {
    setSelectedVariants((prev) => ({ ...prev, [oppId]: variant.id }));
    setDraftTexts((prev) => ({ ...prev, [oppId]: variant.text }));
  };

  const getActiveDraft = (opp: RedditActionFeedOpportunity) => {
    if (draftTexts[opp.id] !== undefined) return draftTexts[opp.id];
    const selectedVarId = selectedVariants[opp.id];
    const variant = opp.replyVariants.find((v) => v.id === selectedVarId) || opp.replyVariants[0];
    return variant?.text || "";
  };

  const handleCopy = async (opp: RedditActionFeedOpportunity) => {
    const text = getActiveDraft(opp);
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedId(opp.id);
    window.setTimeout(() => setCopiedId(null), 2000);

    fetch("/api/agents/reddit/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        opportunityId: opp.id,
        action: "copy",
        selectedVariantId: selectedVariants[opp.id] || opp.replyVariants[0]?.id,
      }),
    }).catch(() => {});
  };

  const handleAction = async (opp: RedditActionFeedOpportunity, action: "replied" | "dismiss" | "regenerate") => {
    setActionLoading((prev) => ({ ...prev, [opp.id]: true }));
    try {
      const res = await fetch("/api/agents/reddit/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          opportunityId: opp.id,
          action,
          opportunity: opp,
          selectedVariantId: selectedVariants[opp.id] || opp.replyVariants[0]?.id,
          customDraft: draftTexts[opp.id],
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (action === "replied") {
          setOpportunities((prev) =>
            prev.map((item) => (item.id === opp.id ? { ...item, lifecycleStatus: "replied" } : item))
          );
        } else if (action === "dismiss") {
          setOpportunities((prev) =>
            prev.map((item) => (item.id === opp.id ? { ...item, lifecycleStatus: "dismissed" } : item))
          );
        } else if (action === "regenerate" && Array.isArray(data.replyVariants)) {
          setOpportunities((prev) =>
            prev.map((item) => (item.id === opp.id ? { ...item, replyVariants: data.replyVariants } : item))
          );
          if (data.replyVariants[0]) {
            handleSelectVariant(opp.id, data.replyVariants[0]);
          }
        }
        onOpportunityUpdated?.();
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [opp.id]: false }));
    }
  };

  const triggerLiveScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/agents/reddit/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();
      if (Array.isArray(data.opportunities)) {
        setOpportunities((data.opportunities as RedditActionFeedOpportunity[]).filter(isVerifiedRedditOpportunityIdentity));
        onOpportunityUpdated?.();
      }
    } finally {
      setScanning(false);
    }
  };

  const tabs: { key: TabFilter; label: string; icon?: React.ReactNode; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "high_priority", label: "Priority", icon: <Sparkles size={11} />, count: counts.high_priority },
    { key: "unreplied", label: "Unreplied", count: counts.unreplied },
    { key: "replied", label: "Replied", count: counts.replied },
    { key: "dismissed", label: "Dismissed", count: counts.dismissed },
  ];

  return (
    <div className="reddit-feed">
      {/* ── Header ── */}
      <div className="reddit-feed__header">
        <div className="reddit-feed__header-left">
          <div className="reddit-feed__platform-badge">
            <span className="reddit-feed__platform-icon">
              <Image src="/agent-logos/reddit.svg" alt="Reddit" width={14} height={14} />
            </span>
            <strong>Reddit Discussions</strong>
          </div>
          <span className="reddit-feed__subtitle">
            Relevant discussions & community-led opportunities
          </span>
        </div>
        <div className="reddit-feed__header-actions">
          <button
            type="button"
            className="sc-btn sc-btn--secondary sc-btn--sm"
            onClick={triggerLiveScan}
            disabled={scanning}
          >
            <RefreshCw size={13} className={scanning ? "sc-spinning" : ""} />
            <span>{scanning ? "Scanning…" : "Scan"}</span>
          </button>
        </div>
      </div>

      {/* ── Filter Chips ── */}
      <div className="reddit-feed__filters">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`sc-filter-chip ${activeTab === tab.key ? "sc-filter-chip--active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count > 0 && <span className="sc-filter-chip__count">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* ── Opportunities Stream ── */}
      <div className="reddit-feed__stream">
        {displayedOpportunities.length === 0 ? (
          <div className="sc-empty-state" style={{ padding: "32px 16px" }}>
            <div className="sc-empty-state__icon">
              <Filter size={20} />
            </div>
            <p className="sc-empty-state__title" style={{ fontSize: "var(--text-md)" }}>No opportunities found</p>
            <p className="sc-empty-state__desc" style={{ fontSize: "var(--text-sm)" }}>
              {activeTab !== "all" ? "Try a different filter or " : ""}Run a scan to discover fresh Reddit conversations.
            </p>
            {activeTab !== "all" && (
              <button type="button" className="sc-btn sc-btn--ghost sc-btn--sm" onClick={() => setActiveTab("all")}>
                View all
              </button>
            )}
          </div>
        ) : (
          displayedOpportunities.map((opp) => {
            const isExpanded = expandedCards[opp.id] ?? false;
            const currentDraft = getActiveDraft(opp);
            const activeVarId = selectedVariants[opp.id] || opp.replyVariants[0]?.id;
            const isCopied = copiedId === opp.id;
            const isReplied = opp.lifecycleStatus === "replied";
            const isDismissed = opp.lifecycleStatus === "dismissed";

            return (
              <div
                key={opp.id}
                className={`reddit-card ${isReplied ? "reddit-card--replied" : ""} ${isDismissed ? "reddit-card--dismissed" : ""}`}
              >
                {/* ── Card Header (always visible) ── */}
                <div
                  className="reddit-card__header"
                  onClick={() => toggleCard(opp.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && toggleCard(opp.id)}
                >
                  <div className="reddit-card__header-left social-post-card__header-left">
                    <SocialCompanyIdentity
                      companyName={companyName}
                      companyWebsite={companyWebsite}
                      companyLogoUrl={companyLogoUrl}
                      platform="Reddit"
                      meta={`reply to r/${opp.subreddit}`}
                      compact
                    />
                    <div className="social-post-card__summary">
                      <h4 className="reddit-card__title">{opp.title}</h4>
                      <p>{currentDraft || cleanRedditText(opp.excerpt)}</p>
                    </div>
                  </div>
                  <div className="reddit-card__header-right">
                    <span className={`sc-score sc-score--pill ${scoreTierClass(opp.score.total)}`}>
                      <span className="sc-score__value">{opp.score.total}</span>
                    </span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                {/* ── Collapsed preview snippet (when closed) ── */}
                {!isExpanded && (
                  <div className="reddit-card__collapsed-row" onClick={() => toggleCard(opp.id)}>
                    <div className="reddit-card__engagement">
                      <span><ArrowUp size={11} /> {opp.upvotes ?? "—"}</span>
                      <span><MessageSquare size={11} /> {opp.commentsCount ?? "—"}</span>
                      <span>
                        <Clock3 size={11} />
                        {formatRedditPublishedAt(opp.publishedAt)}
                      </span>
                    </div>
                    <span className="reddit-card__intent-pill">{opp.intentLabel}</span>
                  </div>
                )}

                {/* ── Expanded Content ── */}
                {isExpanded && (
                  <div className="reddit-card__body">
                    {/* Post Excerpt */}
                    <div className="reddit-card__post-box">
                      <div className="reddit-card__post-meta">
                        <div className="reddit-card__engagement">
                          <span><ArrowUp size={11} /> {opp.upvotes === null ? "Upvotes unavailable" : `${opp.upvotes} upvotes`}</span>
                          <span><MessageSquare size={11} /> {opp.commentsCount === null ? "Comments unavailable" : `${opp.commentsCount} comments`}</span>
                          <span>
                            <Clock3 size={11} />
                            {formatRedditPublishedAt(opp.publishedAt)}
                          </span>
                        </div>
                        <a
                          href={opp.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="reddit-card__external-link"
                          title="Open thread on Reddit"
                        >
                          <span>Open thread</span>
                          <ExternalLink size={11} />
                        </a>
                      </div>
                      <p className="reddit-card__excerpt">{cleanRedditText(opp.excerpt)}</p>
                    </div>

                    {/* Match details */}
                    <div className="reddit-card__signals">
                      <div className="reddit-card__signal">
                        <span className="reddit-card__signal-label">Intent</span>
                        <span className="reddit-card__signal-value">{opp.intentLabel}</span>
                      </div>
                      <div className="reddit-card__signal">
                        <span className="reddit-card__signal-label">Audience</span>
                        <span className="reddit-card__signal-value">{opp.matchedIcp}</span>
                      </div>
                      <div className="reddit-card__signal">
                        <span className="reddit-card__signal-label">Problem</span>
                        <span className="reddit-card__signal-value">{opp.matchedProblem}</span>
                      </div>
                      {opp.competitor && (
                        <div className="reddit-card__signal">
                          <span className="reddit-card__signal-label">Competitor</span>
                          <span className="reddit-card__signal-value">{opp.competitor}</span>
                        </div>
                      )}
                    </div>

                    {/* Why this is an opportunity */}
                    <div className="reddit-card__why-box">
                      <span className="reddit-card__why-title">Why this is an opportunity</span>
                      <p className="reddit-card__why-desc">{opp.whyItMatters}</p>
                    </div>

                    {/* AI-Prepared Reply Section */}
                    <div className="reddit-card__reply-section">
                      <div className="reddit-card__reply-header">
                        <SocialCompanyIdentity
                          companyName={companyName}
                          companyWebsite={companyWebsite}
                          companyLogoUrl={companyLogoUrl}
                          platform="Reddit"
                          meta="prepared reply"
                        />
                        <div className="reddit-card__variants-bar">
                          <span className="reddit-card__reply-label">AI Reply Style:</span>
                          <div className="reddit-card__variant-chips">
                            {opp.replyVariants.map((variant) => (
                              <button
                                key={variant.id}
                                type="button"
                                className={`reddit-card__variant-chip ${activeVarId === variant.id ? "reddit-card__variant-chip--active" : ""}`}
                                onClick={() => handleSelectVariant(opp.id, variant)}
                                title={variant.reasoning}
                              >
                                <span>{variant.label}</span>
                                {activeVarId === variant.id && <Check size={11} />}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="sc-btn sc-btn--ghost sc-btn--sm"
                          onClick={() => handleAction(opp, "regenerate")}
                          disabled={actionLoading[opp.id]}
                          title="Regenerate reply variants"
                        >
                          <RefreshCw size={11} className={actionLoading[opp.id] ? "sc-spinning" : ""} />
                          <span>Regenerate</span>
                        </button>
                      </div>

                      <textarea
                        className="reddit-card__reply-editor"
                        rows={6}
                        value={currentDraft}
                        onChange={(e) => setDraftTexts((prev) => ({ ...prev, [opp.id]: e.target.value }))}
                        placeholder="AI generated response..."
                      />

                      <div className="reddit-card__reply-footer">
                        <div className="reddit-card__trust-indicators">
                          <span className="reddit-card__char-count">{currentDraft.length} characters</span>
                          <span className="reddit-card__spam-badge">
                            <span className={`reddit-card__spam-dot ${opp.spamRisk > 0.3 ? "reddit-card__spam-dot--warn" : "reddit-card__spam-dot--ok"}`} />
                            Spam Risk: {Math.round(opp.spamRisk * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Evidence & Score Breakdown */}
                    <details className="reddit-card__details">
                      <summary className="reddit-card__details-summary">
                        <span>Score breakdown & evidence checklist</span>
                        <ChevronDown size={12} />
                      </summary>
                      <div className="reddit-card__details-content">
                        <div className="reddit-card__score-grid">
                          {[
                            { label: "Intent", value: opp.score.intent, max: 25 },
                            { label: "Product Fit", value: opp.score.productFit, max: 20 },
                            { label: "ICP Fit", value: opp.score.icpFit, max: 15 },
                            { label: "Relevance", value: opp.score.relevance, max: 15 },
                            { label: "Recency", value: opp.score.recency, max: 10 },
                            { label: "Engagement", value: opp.score.engagement, max: 5 },
                            { label: "Actionability", value: opp.score.actionability, max: 5 },
                          ].map((item) => (
                            <div key={item.label} className="reddit-card__score-item">
                              <span className="reddit-card__score-item-label">{item.label}</span>
                              <div className="reddit-card__score-bar">
                                <div
                                  className="reddit-card__score-bar-fill"
                                  style={{ width: `${(item.value / item.max) * 100}%` }}
                                />
                              </div>
                              <span className="reddit-card__score-item-value">{item.value}/{item.max}</span>
                            </div>
                          ))}
                        </div>

                        {opp.evidence && opp.evidence.length > 0 && (
                          <div className="reddit-card__evidence-list">
                            {opp.evidence.map((item, idx) => (
                              <div key={idx} className="reddit-card__evidence-item">
                                <CheckCircle2 size={12} className="reddit-card__evidence-icon" />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>

                    {/* Card Actions Footer */}
                    <div className="reddit-card__actions">
                      <a
                        href={opp.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="sc-btn sc-btn--ghost sc-btn--sm"
                      >
                        <ExternalLink size={12} />
                        <span>Open on Reddit</span>
                      </a>

                      <div className="reddit-card__actions-right">
                        <button
                          type="button"
                          className={`sc-btn ${isCopied ? "sc-btn--secondary" : "sc-btn--primary"} sc-btn--sm`}
                          onClick={() => handleCopy(opp)}
                        >
                          {isCopied ? <Check size={12} /> : <Copy size={12} />}
                          <span>{isCopied ? "Copied" : "Copy Reply"}</span>
                        </button>

                        <button
                          type="button"
                          className={`sc-btn ${isReplied ? "sc-btn--secondary" : "sc-btn--ghost"} sc-btn--sm`}
                          onClick={() => handleAction(opp, "replied")}
                          disabled={actionLoading[opp.id]}
                        >
                          <CheckCircle2 size={12} />
                          <span>{isReplied ? "Replied" : "Mark Replied"}</span>
                        </button>

                        {!isDismissed && (
                          <button
                            type="button"
                            className="sc-btn sc-btn--ghost sc-btn--sm sc-btn--icon-only"
                            onClick={() => handleAction(opp, "dismiss")}
                            disabled={actionLoading[opp.id]}
                            title="Dismiss opportunity"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
