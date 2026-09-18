"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
  Filter,
  Layers,
  Calendar,
  Share2,
  Lightbulb,
  MessageSquare,
  CheckCircle2,
  Eye,
  Flame,
  Wand2,
  Plus,
  Type,
  Hash,
  AlertTriangle,
  Zap,
} from "lucide-react";
import type {
  XOpportunity,
  XOpportunityType,
  XPostFormat,
  ThreadTweet,
} from "@/lib/x/types";
import { XPreview } from "./previews/x-preview";
import { SocialCompanyIdentity, companyLogoSource, companySocialHandle } from "./social-company-identity";

/* ─────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────── */

type TabFilter =
  | "all"
  | "high_priority"
  | "insights"
  | "pov"
  | "educational"
  | "product"
  | "threads"
  | "replies"
  | "repurpose"
  | "ready"
  | "published"
  | "dismissed";

type ViewerMode = "editor" | "thread" | "variants" | "preview" | null;

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */

function scoreTierClass(total: number) {
  if (total >= 90) return "sc-score--exceptional";
  if (total >= 70) return "sc-score--high";
  if (total >= 50) return "sc-score--medium";
  return "sc-score--low";
}

function formatLabel(format: XPostFormat): string {
  const map: Record<XPostFormat, string> = {
    SINGLE_POST: "Post",
    THREAD: "Thread",
    REPLY: "Reply",
    REPURPOSE: "Repurpose",
  };
  return map[format] || format;
}

/* ─────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────── */

export function XOpportunityFeed({
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
  initialOpportunities: XOpportunity[];
  onOpportunityUpdated?: () => void;
}) {
  const [opportunities, setOpportunities] = useState<XOpportunity[]>(initialOpportunities);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [activeViewer, setActiveViewer] = useState<Record<string, ViewerMode>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [customDrafts, setCustomDrafts] = useState<Record<string, string>>({});
  const [customThreads, setCustomThreads] = useState<Record<string, ThreadTweet[]>>({});
  const [repurposeModalOpp, setRepurposeModalOpp] = useState<XOpportunity | null>(null);

  /* ── Counts ── */
  const counts = useMemo(() => {
    const nonDismissed = opportunities.filter((o) => o.lifecycleStatus !== "dismissed");
    return {
      all: nonDismissed.length,
      high_priority: nonDismissed.filter((o) => o.score.total >= 80).length,
      insights: nonDismissed.filter((o) => o.opportunityType === "INSIGHT" || o.opportunityType === "DATA_POINT").length,
      pov: nonDismissed.filter((o) => o.opportunityType === "CONTRARIAN_POV" || o.opportunityType === "FOUNDER_POV").length,
      educational: nonDismissed.filter((o) => o.opportunityType === "EDUCATIONAL_POST" || o.opportunityType === "FAQ").length,
      product: nonDismissed.filter((o) => o.opportunityType === "PRODUCT_INSIGHT" || o.opportunityType === "COMPARISON").length,
      threads: nonDismissed.filter((o) => o.format === "THREAD" || o.opportunityType === "THREAD").length,
      replies: nonDismissed.filter((o) => o.format === "REPLY" || o.opportunityType === "REPLY").length,
      repurpose: nonDismissed.filter((o) => o.opportunityType === "REPURPOSE").length,
      ready: opportunities.filter((o) => o.lifecycleStatus === "ready").length,
      published: opportunities.filter((o) => o.lifecycleStatus === "published").length,
      dismissed: opportunities.filter((o) => o.lifecycleStatus === "dismissed").length,
    };
  }, [opportunities]);

  /* ── Filtered list ── */
  const displayedOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      if (activeTab === "all") return opp.lifecycleStatus !== "dismissed";
      if (activeTab === "high_priority") return opp.score.total >= 80 && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "insights") return (opp.opportunityType === "INSIGHT" || opp.opportunityType === "DATA_POINT") && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "pov") return (opp.opportunityType === "CONTRARIAN_POV" || opp.opportunityType === "FOUNDER_POV") && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "educational") return (opp.opportunityType === "EDUCATIONAL_POST" || opp.opportunityType === "FAQ") && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "product") return (opp.opportunityType === "PRODUCT_INSIGHT" || opp.opportunityType === "COMPARISON") && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "threads") return (opp.format === "THREAD" || opp.opportunityType === "THREAD") && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "replies") return (opp.format === "REPLY" || opp.opportunityType === "REPLY") && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "repurpose") return opp.opportunityType === "REPURPOSE" && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "ready") return opp.lifecycleStatus === "ready";
      if (activeTab === "published") return opp.lifecycleStatus === "published";
      if (activeTab === "dismissed") return opp.lifecycleStatus === "dismissed";
      return true;
    });
  }, [opportunities, activeTab]);

  /* ── Handlers ── */
  const toggleCard = useCallback((id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const setViewer = useCallback((id: string, mode: ViewerMode) => {
    setActiveViewer((prev) => ({ ...prev, [id]: prev[id] === mode ? null : mode }));
  }, []);

  const triggerLiveScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/agents/x/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.opportunities)) setOpportunities(data.opportunities);
        if (onOpportunityUpdated) onOpportunityUpdated();
      }
    } catch (err) {
      console.error("Failed to run X live scan", err);
    } finally {
      setScanning(false);
    }
  };

  // Auto-scan on mount if empty
  useEffect(() => {
    if (opportunities.length === 0 && !scanning) {
      const scanTimer = window.setTimeout(() => void triggerLiveScan(), 0);
      return () => window.clearTimeout(scanTimer);
    }
  }, [companyId]);

  const handleAction = async (oppId: string, actionType: "approve" | "publish" | "schedule" | "dismiss" | "ready") => {
    setActionLoading((prev) => ({ ...prev, [oppId]: true }));
    try {
      const res = await fetch("/api/agents/x/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, opportunityId: oppId, action: actionType }),
      });
      if (res.ok) {
        setOpportunities((prev) =>
          prev.map((o) => {
            if (o.id === oppId) {
              const newStatus =
                actionType === "approve"
                  ? "ready"
                  : actionType === "schedule"
                  ? "scheduled"
                  : actionType === "publish"
                  ? "published"
                  : actionType === "dismiss"
                  ? "dismissed"
                  : o.lifecycleStatus;
              return { ...o, lifecycleStatus: newStatus as XOpportunity["lifecycleStatus"] };
            }
            return o;
          })
        );
        if (onOpportunityUpdated) onOpportunityUpdated();
      }
    } catch (err) {
      console.error("Action failed", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [oppId]: false }));
    }
  };

  const handleCopyPost = async (opp: XOpportunity) => {
    const text = customDrafts[opp.id] || opp.executionPackage.postContent;
    await navigator.clipboard.writeText(text);
    setCopiedId(opp.id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyText = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  const handleMakeSharper = (opp: XOpportunity) => {
    const original = customDrafts[opp.id] || opp.executionPackage.postContent;
    const lines = original.split("\n").filter((l) => l.trim().length > 0);
    const punchy = lines
      .map((l) => l.replace(/^(In order to|Basically,|It is worth noting that|I think that|We believe that)/i, "").trim())
      .join("\n\n");
    setCustomDrafts((prev) => ({ ...prev, [opp.id]: punchy }));
  };

  const handleSelectVariant = (oppId: string, text: string) => {
    setCustomDrafts((prev) => ({ ...prev, [oppId]: text }));
  };

  const handleUpdateThreadTweet = (oppId: string, index: number, text: string) => {
    const opp = opportunities.find((o) => o.id === oppId);
    const current = customThreads[oppId] || opp?.executionPackage.threadTweets || [];
    const updated = [...current];
    if (updated[index]) {
      updated[index] = { ...updated[index], content: text };
    }
    setCustomThreads((prev) => ({ ...prev, [oppId]: updated }));
  };

  /* ── Tab config ── */
  const tabs: { key: TabFilter; label: string; icon?: React.ReactNode; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "high_priority", label: "Priority", icon: <Sparkles size={11} />, count: counts.high_priority },
    { key: "insights", label: "Insights", icon: <Lightbulb size={11} />, count: counts.insights },
    { key: "pov", label: "POV", icon: <Flame size={11} />, count: counts.pov },
    { key: "educational", label: "Educational", count: counts.educational },
    { key: "product", label: "Product", count: counts.product },
    { key: "threads", label: "Threads", icon: <Layers size={11} />, count: counts.threads },
    { key: "replies", label: "Replies", icon: <MessageSquare size={11} />, count: counts.replies },
    { key: "ready", label: "Ready", count: counts.ready },
    { key: "published", label: "Published", count: counts.published },
    { key: "dismissed", label: "Dismissed", count: counts.dismissed },
  ];

  return (
    <div className="x-feed">
      {/* ── Header ── */}
      <div className="x-feed__header">
        <div className="x-feed__header-left">
          <div className="x-feed__platform-badge">
            <span className="x-feed__platform-icon">𝕏</span>
            <strong>X / Twitter</strong>
          </div>
          <span className="x-feed__subtitle">
            Hooks, insights & threads for <strong>{companyName}</strong>
          </span>
        </div>
        <div className="x-feed__header-actions">
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
      <div className="x-feed__filters">
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
      <div className="x-feed__stream">
        {displayedOpportunities.length === 0 ? (
          <div className="sc-empty-state" style={{ padding: "32px 16px" }}>
            <div className="sc-empty-state__icon">
              <Filter size={20} />
            </div>
            <p className="sc-empty-state__title" style={{ fontSize: "var(--text-md)" }}>No opportunities found</p>
            <p className="sc-empty-state__desc" style={{ fontSize: "var(--text-sm)" }}>
              {activeTab !== "all" ? "Try a different filter or " : ""}Run a scan to discover X content angles and threads.
            </p>
            {activeTab !== "all" && (
              <button type="button" className="sc-btn sc-btn--ghost sc-btn--sm" onClick={() => setActiveTab("all")}>
                View all
              </button>
            )}
          </div>
        ) : (
          displayedOpportunities.map((opp) => {
            const isExpanded = expandedCards[opp.id];
            const viewer = activeViewer[opp.id];
            const postText = customDrafts[opp.id] ?? opp.executionPackage.postContent;
            const charCount = postText.length;
            const threadList = customThreads[opp.id] ?? opp.executionPackage.threadTweets ?? [];

            return (
              <div
                key={opp.id}
                className={`x-card ${opp.lifecycleStatus === "dismissed" ? "x-card--dismissed" : ""}`}
              >
                {/* ── Card Header ── */}
                <div
                  className="x-card__header"
                  onClick={() => toggleCard(opp.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && toggleCard(opp.id)}
                >
                  <div className="x-card__header-left social-post-card__header-left">
                    <SocialCompanyIdentity
                      companyName={companyName}
                      companyWebsite={companyWebsite}
                      companyLogoUrl={companyLogoUrl}
                      platform="X"
                      meta={formatLabel(opp.format)}
                      compact
                    />
                    <div className="social-post-card__summary">
                      <h4 className="x-card__title">{opp.title}</h4>
                      <p>{postText}</p>
                    </div>
                  </div>
                  <div className="x-card__header-right">
                    <span className={`sc-score sc-score--pill ${scoreTierClass(opp.score.total)}`}>
                      <span className="sc-score__value">{opp.score.total}</span>
                    </span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                {/* ── Expanded Content ── */}
                {isExpanded && (
                  <div className="x-card__body">
                    {/* Hook */}
                    <div className="x-card__hook">
                      <span className="x-card__hook-label">Hook</span>
                      <p className="x-card__hook-text">&ldquo;{opp.hookHeadline}&rdquo;</p>
                    </div>

                    {/* Meta chips */}
                    <div className="x-card__meta-row">
                      <span className="sc-badge sc-badge--sm sc-badge--default">
                        {opp.opportunityType.replace(/_/g, " ")}
                      </span>
                      <span className="sc-badge sc-badge--sm sc-badge--outline">
                        {opp.signalOrigin.source.replace(/_/g, " ")}
                      </span>
                      <span className="sc-badge sc-badge--sm sc-badge--accent">
                        {opp.confidence}% conf
                      </span>
                    </div>

                    {/* Target grid */}
                    <div className="x-card__targets">
                      <div className="x-card__target">
                        <span className="x-card__target-label">Audience</span>
                        <span className="x-card__target-value">{opp.targetAudience}</span>
                      </div>
                      <div className="x-card__target">
                        <span className="x-card__target-label">Pain Point</span>
                        <span className="x-card__target-value">{opp.targetPainPoint}</span>
                      </div>
                      <div className="x-card__target">
                        <span className="x-card__target-label">KPI Impact</span>
                        <span className="x-card__target-value x-card__target-value--accent">{opp.expectedKpiImpact}</span>
                      </div>
                    </div>

                    {/* ── Viewer Tabs ── */}
                    <div className="x-card__viewer-tabs">
                      <button
                        type="button"
                        className={`x-card__viewer-tab ${viewer === "editor" || viewer === null ? "x-card__viewer-tab--active" : ""}`}
                        onClick={() => setViewer(opp.id, "editor")}
                      >
                        <Type size={12} /> Post Editor
                      </button>

                      {opp.format === "THREAD" && threadList.length > 0 && (
                        <button
                          type="button"
                          className={`x-card__viewer-tab ${viewer === "thread" ? "x-card__viewer-tab--active" : ""}`}
                          onClick={() => setViewer(opp.id, "thread")}
                        >
                          <Layers size={12} /> Thread ({threadList.length})
                        </button>
                      )}

                      {opp.executionPackage.threeVariants && (
                        <button
                          type="button"
                          className={`x-card__viewer-tab ${viewer === "variants" ? "x-card__viewer-tab--active" : ""}`}
                          onClick={() => setViewer(opp.id, "variants")}
                        >
                          <Flame size={12} /> 3 Angles
                        </button>
                      )}

                      <button
                        type="button"
                        className={`x-card__viewer-tab ${viewer === "preview" ? "x-card__viewer-tab--active" : ""}`}
                        onClick={() => setViewer(opp.id, "preview")}
                      >
                        <Eye size={12} /> X Preview
                      </button>
                    </div>

                    {/* ── Post Editor Viewer ── */}
                    {(viewer === "editor" || viewer === null) && (
                      <div className="x-card__viewer">
                        <div className="x-card__viewer-title">
                          <Type size={13} />
                          <span>Draft Content</span>
                          <div className="x-card__viewer-actions-top">
                            <button
                              type="button"
                              className="sc-btn sc-btn--ghost sc-btn--sm"
                              onClick={() => handleMakeSharper(opp)}
                              title="Strip fluff words to make post punchy"
                            >
                              <Wand2 size={11} />
                              <span>Make Sharper</span>
                            </button>
                            <button
                              type="button"
                              className="sc-copy-btn"
                              onClick={() => handleCopyPost(opp)}
                            >
                              {copiedId === opp.id ? <Check size={11} /> : <Copy size={11} />}
                              <span>{copiedId === opp.id ? "Copied" : "Copy"}</span>
                            </button>
                          </div>
                        </div>

                        <textarea
                          className="x-card__post-editor"
                          rows={6}
                          value={postText}
                          onChange={(e) =>
                            setCustomDrafts((prev) => ({ ...prev, [opp.id]: e.target.value }))
                          }
                        />

                        <div className="x-card__editor-footer">
                          <span
                            className={`x-card__char-indicator ${
                              charCount > 280
                                ? "x-card__char-indicator--over"
                                : charCount > 260
                                ? "x-card__char-indicator--warn"
                                : ""
                            }`}
                          >
                            {charCount} / 280 characters
                          </span>
                          {opp.executionPackage.cta && (
                            <span className="x-card__cta-hint">
                              CTA: {opp.executionPackage.cta}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── Thread Viewer ── */}
                    {viewer === "thread" && (
                      <div className="x-card__viewer">
                        <div className="x-card__viewer-title">
                          <Layers size={13} />
                          <span>Thread Tweets ({threadList.length} total)</span>
                        </div>

                        <div className="x-card__thread-list">
                          {threadList.map((t, idx) => (
                            <div key={idx} className="x-card__thread-item">
                              <div className="x-card__thread-num">{idx + 1}/{threadList.length}</div>
                              <textarea
                                className="x-card__thread-editor"
                                rows={3}
                                value={t.content}
                                onChange={(e) => handleUpdateThreadTweet(opp.id, idx, e.target.value)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── 3 Variants Viewer ── */}
                    {viewer === "variants" && opp.executionPackage.threeVariants && (
                      <div className="x-card__viewer">
                        <div className="x-card__viewer-title">
                          <Flame size={13} />
                          <span>Select Angle Variant</span>
                        </div>

                        <div className="x-card__variants-grid">
                          <div
                            className={`x-variant-card ${postText === opp.executionPackage.threeVariants.punchy ? "x-variant-card--active" : ""}`}
                            onClick={() => handleSelectVariant(opp.id, opp.executionPackage.threeVariants.punchy)}
                          >
                            <div className="x-variant-card__header">
                              <span className="x-variant-card__label" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <Zap size={11} /> Punchy
                              </span>
                              <span className="x-variant-card__chars">{opp.executionPackage.threeVariants.punchy.length} chars</span>
                            </div>
                            <p className="x-variant-card__text">{opp.executionPackage.threeVariants.punchy}</p>
                          </div>

                          <div
                            className={`x-variant-card ${postText === opp.executionPackage.threeVariants.observation ? "x-variant-card--active" : ""}`}
                            onClick={() => handleSelectVariant(opp.id, opp.executionPackage.threeVariants.observation)}
                          >
                            <div className="x-variant-card__header">
                              <span className="x-variant-card__label" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <Eye size={11} /> Observation
                              </span>
                              <span className="x-variant-card__chars">{opp.executionPackage.threeVariants.observation.length} chars</span>
                            </div>
                            <p className="x-variant-card__text">{opp.executionPackage.threeVariants.observation}</p>
                          </div>

                          <div
                            className={`x-variant-card ${postText === opp.executionPackage.threeVariants.contrarian ? "x-variant-card--active" : ""}`}
                            onClick={() => handleSelectVariant(opp.id, opp.executionPackage.threeVariants.contrarian)}
                          >
                            <div className="x-variant-card__header">
                              <span className="x-variant-card__label" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <Flame size={11} /> Contrarian
                              </span>
                              <span className="x-variant-card__chars">{opp.executionPackage.threeVariants.contrarian.length} chars</span>
                            </div>
                            <p className="x-variant-card__text">{opp.executionPackage.threeVariants.contrarian}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── Platform Preview ── */}
                    {viewer === "preview" && (
                      <div className="x-card__viewer x-card__viewer--preview">
                        <XPreview
                          displayName={companyName}
                          handle={companySocialHandle(companyName, companyWebsite)}
                          avatarUrl={companyLogoSource(companyLogoUrl) || (companyWebsite ? `/api/assets/logo?website=${encodeURIComponent(companyWebsite)}` : undefined)}
                          content={postText}
                          format={opp.format}
                          threadTweets={threadList}
                          replyTarget={opp.executionPackage.replyTarget}
                        />
                      </div>
                    )}

                    {/* ── Collapsible Breakdown ── */}
                    <details className="x-card__details">
                      <summary className="x-card__details-summary">
                        <span>Signal breakdown & evidence</span>
                        <ChevronDown size={12} />
                      </summary>
                      <div className="x-card__details-content">
                        <div className="x-card__why-grid">
                          <div>
                            <span className="x-card__why-label">Why this matters</span>
                            <p className="x-card__why-text">{opp.whyThisMatters}</p>
                          </div>
                          <div>
                            <span className="x-card__why-label">Why am I seeing this?</span>
                            <p className="x-card__why-text">{opp.whyAmISeeingThis}</p>
                          </div>
                        </div>
                        <div className="x-card__score-grid">
                          {[
                            { label: "ICP Relevance", value: opp.score.icpRelevance, max: 15 },
                            { label: "Product Fit", value: opp.score.productRelevance, max: 15 },
                            { label: "Evidence", value: opp.score.evidenceStrength, max: 15 },
                            { label: "Novelty", value: opp.score.novelty, max: 10 },
                            { label: "Conversation", value: opp.score.conversationPotential, max: 10 },
                            { label: "Brand Fit", value: opp.score.brandFit, max: 10 },
                          ].map((item) => (
                            <div key={item.label} className="x-card__score-item">
                              <span className="x-card__score-item-label">{item.label}</span>
                              <div className="x-card__score-bar">
                                <div className="x-card__score-bar-fill" style={{ width: `${(item.value / item.max) * 100}%` }} />
                              </div>
                              <span className="x-card__score-item-value">{item.value}/{item.max}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </details>

                    {/* ── Card Actions ── */}
                    <div className="x-card__actions">
                      <button
                        type="button"
                        className="sc-btn sc-btn--ghost sc-btn--sm"
                        onClick={() => setRepurposeModalOpp(opp)}
                      >
                        <Share2 size={13} />
                        <span>Repurpose</span>
                      </button>

                      <div className="x-card__actions-right">
                        <button
                          type="button"
                          className="sc-btn sc-btn--primary sc-btn--sm"
                          disabled={actionLoading[opp.id] || opp.lifecycleStatus === "ready"}
                          onClick={() => handleAction(opp.id, "approve")}
                        >
                          <CheckCircle2 size={13} />
                          <span>{opp.lifecycleStatus === "ready" ? "Approved" : "Approve"}</span>
                        </button>
                        <button
                          type="button"
                          className="sc-btn sc-btn--secondary sc-btn--sm"
                          disabled={actionLoading[opp.id]}
                          onClick={() => handleAction(opp.id, "schedule")}
                          title="Records a manual planning date. It does not publish to X."
                        >
                          <Calendar size={13} />
                          <span>Plan date</span>
                        </button>
                        <button
                          type="button"
                          className="sc-btn sc-btn--ghost sc-btn--sm sc-btn--icon-only"
                          disabled={actionLoading[opp.id]}
                          onClick={() => handleAction(opp.id, "dismiss")}
                          title="Dismiss"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Repurpose Modal ── */}
      {repurposeModalOpp && (
        <div className="sc-modal-overlay" onClick={() => setRepurposeModalOpp(null)}>
          <div className="sc-modal sc-modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="sc-modal__header">
              <div>
                <h3 className="sc-modal__title">Repurpose: {repurposeModalOpp.title}</h3>
                <p className="sc-modal__desc">Transform this tweet into cross-channel assets</p>
              </div>
              <button type="button" className="sc-modal__close" onClick={() => setRepurposeModalOpp(null)}>
                <X size={14} />
              </button>
            </div>
            <div className="sc-modal__body">
              <div className="x-repurpose-channels">
                {/* LinkedIn */}
                <div className="x-repurpose-channel">
                  <div className="x-repurpose-channel__header">
                    <strong>LinkedIn Post</strong>
                    <button
                      type="button"
                      className="sc-copy-btn"
                      onClick={() =>
                        handleCopyText(
                          repurposeModalOpp.executionPackage.repurposingPlan.linkedInPost,
                          "linkedin-" + repurposeModalOpp.id
                        )
                      }
                    >
                      {copiedId === "linkedin-" + repurposeModalOpp.id ? <Check size={11} /> : <Copy size={11} />}
                      <span>{copiedId === "linkedin-" + repurposeModalOpp.id ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <pre className="x-repurpose-channel__pre">
                    {repurposeModalOpp.executionPackage.repurposingPlan.linkedInPost}
                  </pre>
                </div>

                {/* Instagram Carousel Hook */}
                <div className="x-repurpose-channel">
                  <div className="x-repurpose-channel__header">
                    <strong>Instagram Carousel Hook</strong>
                    <button
                      type="button"
                      className="sc-copy-btn"
                      onClick={() =>
                        handleCopyText(
                          repurposeModalOpp.executionPackage.repurposingPlan.instagramCarouselHook,
                          "ig-" + repurposeModalOpp.id
                        )
                      }
                    >
                      {copiedId === "ig-" + repurposeModalOpp.id ? <Check size={11} /> : <Copy size={11} />}
                      <span>{copiedId === "ig-" + repurposeModalOpp.id ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <p className="x-repurpose-channel__text">
                    {repurposeModalOpp.executionPackage.repurposingPlan.instagramCarouselHook}
                  </p>
                </div>

                {/* Newsletter Snippet */}
                <div className="x-repurpose-channel">
                  <div className="x-repurpose-channel__header">
                    <strong>Newsletter Snippet</strong>
                    <button
                      type="button"
                      className="sc-copy-btn"
                      onClick={() =>
                        handleCopyText(
                          repurposeModalOpp.executionPackage.repurposingPlan.newsletterSnippet,
                          "newsletter-" + repurposeModalOpp.id
                        )
                      }
                    >
                      {copiedId === "newsletter-" + repurposeModalOpp.id ? <Check size={11} /> : <Copy size={11} />}
                      <span>{copiedId === "newsletter-" + repurposeModalOpp.id ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <pre className="x-repurpose-channel__pre">
                    {repurposeModalOpp.executionPackage.repurposingPlan.newsletterSnippet}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
