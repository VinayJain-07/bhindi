"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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
  Film,
  Layers,
  Smartphone,
  Calendar,
  Share2,
  Lightbulb,
  MessageSquare,
  CheckCircle2,
  Eye,
  Clock,
  ArrowRight,
  Hash,
  Type,
  AlertTriangle,
  Music,
} from "lucide-react";
import type {
  InstagramOpportunity,
  InstagramOpportunityMap,
  InstagramFormat,
  CarouselSlide,
  ReelStoryboardStep,
  StoryFrame,
} from "@/lib/instagram/types";
import { InstagramPreview } from "./previews/instagram-preview";
import { SocialCompanyIdentity, companyLogoSource, companySocialHandle } from "./social-company-identity";

/* ─────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────── */

type TabFilter =
  | "all"
  | "high_priority"
  | "reels"
  | "carousels"
  | "stories"
  | "product"
  | "educational"
  | "proof"
  | "competitor"
  | "ready"
  | "published"
  | "dismissed";

type ViewerMode = "carousel" | "reel" | "story" | "caption" | "preview" | null;

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */

function scoreTierClass(total: number) {
  if (total >= 90) return "sc-score--exceptional";
  if (total >= 70) return "sc-score--high";
  if (total >= 50) return "sc-score--medium";
  return "sc-score--low";
}

function formatLabel(format: InstagramFormat): string {
  const map: Record<InstagramFormat, string> = {
    CAROUSEL: "Carousel",
    REEL: "Reel",
    STORY: "Story",
    SINGLE_IMAGE: "Image",
    INFOGRAPHIC: "Infographic",
  };
  return map[format] || format;
}

/* ─────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────── */

export function InstagramOpportunityFeed({
  companyId,
  companyName,
  companyWebsite,
  companyLogoUrl,
  initialOpportunities,
  opportunityMapSummary,
  onOpportunityUpdated,
}: {
  companyId: string;
  companyName: string;
  companyWebsite?: string | null;
  companyLogoUrl?: string | null;
  initialOpportunities: InstagramOpportunity[];
  opportunityMapSummary?: InstagramOpportunityMap | null;
  onOpportunityUpdated?: () => void;
}) {
  const [opportunities, setOpportunities] = useState<InstagramOpportunity[]>(initialOpportunities);
  const [opportunityMap, setOpportunityMap] = useState<InstagramOpportunityMap | null>(opportunityMapSummary || null);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [activeViewer, setActiveViewer] = useState<Record<string, ViewerMode>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [showMapModal, setShowMapModal] = useState(false);
  const [draftCaptions, setDraftCaptions] = useState<Record<string, string>>({});
  const [repurposeModalOpp, setRepurposeModalOpp] = useState<InstagramOpportunity | null>(null);

  /* ── Counts ── */
  const counts = useMemo(() => {
    const nonDismissed = opportunities.filter((o) => o.lifecycleStatus !== "dismissed");
    return {
      all: nonDismissed.length,
      high_priority: nonDismissed.filter((o) => o.score.total >= 80).length,
      reels: nonDismissed.filter((o) => o.recommendedFormat === "REEL").length,
      carousels: nonDismissed.filter((o) => o.recommendedFormat === "CAROUSEL").length,
      stories: nonDismissed.filter((o) => o.recommendedFormat === "STORY").length,
      product: nonDismissed.filter((o) => o.opportunityType === "PRODUCT_EDUCATION").length,
      educational: nonDismissed.filter((o) => o.opportunityType === "EDUCATIONAL_POST" || o.opportunityType === "CHECKLIST" || o.opportunityType === "MYTH_VS_FACT").length,
      proof: nonDismissed.filter((o) => o.opportunityType === "SOCIAL_PROOF" || o.opportunityType === "CASE_STUDY").length,
      competitor: nonDismissed.filter((o) => o.opportunityType === "COMPARISON" || o.signalOrigin.source === "competitor_whitespace").length,
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
      if (activeTab === "reels") return opp.recommendedFormat === "REEL" && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "carousels") return opp.recommendedFormat === "CAROUSEL" && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "stories") return opp.recommendedFormat === "STORY" && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "product") return opp.opportunityType === "PRODUCT_EDUCATION" && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "educational")
        return (opp.opportunityType === "EDUCATIONAL_POST" || opp.opportunityType === "CHECKLIST" || opp.opportunityType === "MYTH_VS_FACT") && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "proof") return (opp.opportunityType === "SOCIAL_PROOF" || opp.opportunityType === "CASE_STUDY") && opp.lifecycleStatus !== "dismissed";
      if (activeTab === "competitor") return (opp.opportunityType === "COMPARISON" || opp.signalOrigin.source === "competitor_whitespace") && opp.lifecycleStatus !== "dismissed";
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
      const res = await fetch("/api/agents/instagram/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.opportunities)) setOpportunities(data.opportunities);
        if (data.opportunityMap) setOpportunityMap(data.opportunityMap);
        if (onOpportunityUpdated) onOpportunityUpdated();
      }
    } catch (err) {
      console.error("Failed to run Instagram live scan", err);
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

  const handleAction = async (oppId: string, actionType: "approve" | "schedule" | "dismiss" | "ready" | "publish") => {
    setActionLoading((prev) => ({ ...prev, [oppId]: true }));
    try {
      const res = await fetch("/api/agents/instagram/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, opportunityId: oppId, action: actionType }),
      });
      if (res.ok) {
        setOpportunities((prev) =>
          prev.map((o) => {
            if (o.id === oppId) {
              const newStatus: InstagramOpportunity["lifecycleStatus"] = actionType === "approve" ? "ready" : actionType === "schedule" ? "scheduled" : actionType === "publish" ? "published" : actionType === "dismiss" ? "dismissed" : o.lifecycleStatus;
              return { ...o, lifecycleStatus: newStatus };
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

  const handleCopyCaption = async (opp: InstagramOpportunity) => {
    const text = draftCaptions[opp.id] || opp.executionPackage.caption;
    await navigator.clipboard.writeText(text);
    setCopiedId(opp.id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyText = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  /* ─── Tab config ─── */
  const tabs: { key: TabFilter; label: string; icon?: React.ReactNode; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "high_priority", label: "Priority", icon: <Sparkles size={11} />, count: counts.high_priority },
    { key: "reels", label: "Reels", icon: <Film size={11} />, count: counts.reels },
    { key: "carousels", label: "Carousels", icon: <Layers size={11} />, count: counts.carousels },
    { key: "stories", label: "Stories", icon: <Smartphone size={11} />, count: counts.stories },
    { key: "ready", label: "Ready", count: counts.ready },
    { key: "published", label: "Published", count: counts.published },
    { key: "dismissed", label: "Dismissed", count: counts.dismissed },
  ];

  return (
    <div className="ig-feed">
      {/* ── Header ── */}
      <div className="ig-feed__header">
        <div className="ig-feed__header-left">
          <div className="ig-feed__platform-badge">
            <span className="ig-feed__platform-dot" />
            <strong>Instagram</strong>
          </div>
          <span className="ig-feed__subtitle">
            Content intelligence for <strong>{companyName}</strong>
          </span>
        </div>
        <div className="ig-feed__header-actions">
          {opportunityMap && (
            <button
              type="button"
              className="sc-btn sc-btn--ghost sc-btn--sm"
              onClick={() => setShowMapModal(true)}
              title="View opportunity map"
            >
              <Lightbulb size={14} />
            </button>
          )}
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
      <div className="ig-feed__filters">
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
      <div className="ig-feed__stream">
        {displayedOpportunities.length === 0 ? (
          <div className="sc-empty-state" style={{ padding: "32px 16px" }}>
            <div className="sc-empty-state__icon">
              <Filter size={20} />
            </div>
            <p className="sc-empty-state__title" style={{ fontSize: "var(--text-md)" }}>No opportunities found</p>
            <p className="sc-empty-state__desc" style={{ fontSize: "var(--text-sm)" }}>
              {activeTab !== "all" ? "Try a different filter or " : ""}Run a scan to discover Instagram content opportunities.
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
            const captionText = draftCaptions[opp.id] ?? opp.executionPackage.caption;
            const captionLength = captionText.length;

            return (
              <div
                key={opp.id}
                className={`ig-card ${opp.lifecycleStatus === "dismissed" ? "ig-card--dismissed" : ""}`}
              >
                {/* ── Card Header (always visible) ── */}
                <div className="ig-card__header" onClick={() => toggleCard(opp.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && toggleCard(opp.id)}>
                  <div className="ig-card__header-left social-post-card__header-left">
                    <SocialCompanyIdentity
                      companyName={companyName}
                      companyWebsite={companyWebsite}
                      companyLogoUrl={companyLogoUrl}
                      platform="Instagram"
                      meta={formatLabel(opp.recommendedFormat)}
                      compact
                    />
                    <div className="social-post-card__summary">
                      <h4 className="ig-card__title">{opp.title}</h4>
                      <p>{captionText}</p>
                    </div>
                  </div>
                  <div className="ig-card__header-right">
                    <span className={`sc-score sc-score--pill ${scoreTierClass(opp.score.total)}`}>
                      <span className="sc-score__value">{opp.score.total}</span>
                    </span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                {/* ── Expanded Content ── */}
                {isExpanded && (
                  <div className="ig-card__body">
                    {/* Hook */}
                    <div className="ig-card__hook">
                      <span className="ig-card__hook-label">Hook</span>
                      <p className="ig-card__hook-text">&ldquo;{opp.hookHeadline}&rdquo;</p>
                    </div>

                    {/* Meta chips */}
                    <div className="ig-card__meta-row">
                      <span className="sc-badge sc-badge--sm sc-badge--default">{opp.opportunityType.replace(/_/g, " ")}</span>
                      <span className="sc-badge sc-badge--sm sc-badge--outline">
                        {opp.signalOrigin.source.replace(/_/g, " ")}
                      </span>
                      <span className="sc-badge sc-badge--sm sc-badge--accent">
                        {opp.confidence}% conf
                      </span>
                    </div>

                    {/* Target grid */}
                    <div className="ig-card__targets">
                      <div className="ig-card__target">
                        <span className="ig-card__target-label">Audience</span>
                        <span className="ig-card__target-value">{opp.targetAudience}</span>
                      </div>
                      <div className="ig-card__target">
                        <span className="ig-card__target-label">Pain Point</span>
                        <span className="ig-card__target-value">{opp.targetPainPoint}</span>
                      </div>
                      <div className="ig-card__target">
                        <span className="ig-card__target-label">KPI Impact</span>
                        <span className="ig-card__target-value ig-card__target-value--accent">{opp.expectedKpiImpact}</span>
                      </div>
                    </div>

                    {/* ── Viewer Tabs ── */}
                    <div className="ig-card__viewer-tabs">
                      {opp.recommendedFormat === "CAROUSEL" && opp.executionPackage.carouselSlides && (
                        <button
                          type="button"
                          className={`ig-card__viewer-tab ${viewer === "carousel" ? "ig-card__viewer-tab--active" : ""}`}
                          onClick={() => setViewer(opp.id, "carousel")}
                        >
                          <Layers size={12} /> Slides
                        </button>
                      )}
                      {opp.recommendedFormat === "REEL" && opp.executionPackage.reelStoryboard && (
                        <button
                          type="button"
                          className={`ig-card__viewer-tab ${viewer === "reel" ? "ig-card__viewer-tab--active" : ""}`}
                          onClick={() => setViewer(opp.id, "reel")}
                        >
                          <Film size={12} /> Storyboard
                        </button>
                      )}
                      {opp.recommendedFormat === "STORY" && opp.executionPackage.storySequence && (
                        <button
                          type="button"
                          className={`ig-card__viewer-tab ${viewer === "story" ? "ig-card__viewer-tab--active" : ""}`}
                          onClick={() => setViewer(opp.id, "story")}
                        >
                          <Smartphone size={12} /> Frames
                        </button>
                      )}
                      <button
                        type="button"
                        className={`ig-card__viewer-tab ${viewer === "caption" ? "ig-card__viewer-tab--active" : ""}`}
                        onClick={() => setViewer(opp.id, "caption")}
                      >
                        <Type size={12} /> Caption
                      </button>
                      <button
                        type="button"
                        className={`ig-card__viewer-tab ${viewer === "preview" ? "ig-card__viewer-tab--active" : ""}`}
                        onClick={() => setViewer(opp.id, "preview")}
                      >
                        <Eye size={12} /> Preview
                      </button>
                    </div>

                    {/* ── Carousel Viewer ── */}
                    {viewer === "carousel" && opp.executionPackage.carouselSlides && (
                      <div className="ig-card__viewer">
                        <div className="ig-card__viewer-title">
                          <Layers size={13} />
                          <span>{opp.executionPackage.carouselSlides.length} Slides</span>
                        </div>
                        <div className="ig-card__slides">
                          {opp.executionPackage.carouselSlides.map((slide) => (
                            <div key={slide.slideNumber} className="ig-slide">
                              <div className="ig-slide__header">
                                <span className="ig-slide__num">{String(slide.slideNumber).padStart(2, "0")}</span>
                                <span className={`ig-slide__type ig-slide__type--${slide.type}`}>{slide.type}</span>
                              </div>
                              <h5 className="ig-slide__headline">{slide.headline}</h5>
                              <p className="ig-slide__body">{slide.bodyContent}</p>
                              <div className="ig-slide__visual">
                                <Eye size={10} />
                                <span>{slide.visualDirection}</span>
                              </div>
                              {slide.swipePrompt && (
                                <div className="ig-slide__swipe">
                                  <ArrowRight size={10} />
                                  <span>{slide.swipePrompt}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Reel Storyboard Viewer ── */}
                    {viewer === "reel" && opp.executionPackage.reelStoryboard && (
                      <div className="ig-card__viewer">
                        <div className="ig-card__viewer-title">
                          <Film size={13} />
                          <span>Reel Storyboard</span>
                          <span className="ig-card__viewer-hint">9:16 vertical</span>
                        </div>
                        <div className="ig-card__timeline">
                          {opp.executionPackage.reelStoryboard.map((step, i) => (
                            <div key={i} className="ig-timeline-step">
                              <div className="ig-timeline-step__time">{step.timestamp}</div>
                              <div className="ig-timeline-step__line" />
                              <div className="ig-timeline-step__content">
                                <span className={`ig-timeline-step__phase ig-timeline-step__phase--${step.phase}`}>
                                  {step.phase.replace(/_/g, " ")}
                                </span>
                                {step.audioTrackSuggestion && (
                                  <span className="ig-timeline-step__audio" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                    <Music size={11} /> {step.audioTrackSuggestion}
                                  </span>
                                )}
                                <div className="ig-timeline-step__detail">
                                  <strong>Spoken:</strong> {step.spokenAudio}
                                </div>
                                <div className="ig-timeline-step__detail">
                                  <strong>Visual:</strong> {step.visualAction}
                                </div>
                                <div className="ig-timeline-step__detail">
                                  <strong>Text:</strong> {step.onScreenText}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Story Frames Viewer ── */}
                    {viewer === "story" && opp.executionPackage.storySequence && (
                      <div className="ig-card__viewer">
                        <div className="ig-card__viewer-title">
                          <Smartphone size={13} />
                          <span>Story Sequence</span>
                        </div>
                        <div className="ig-card__frames">
                          {opp.executionPackage.storySequence.map((frame) => (
                            <div key={frame.frameNumber} className="ig-frame">
                              <div className="ig-frame__num">Frame {frame.frameNumber}</div>
                              <p className="ig-frame__text">&ldquo;{frame.textOverlay}&rdquo;</p>
                              {frame.interactiveElement && (
                                <div className="ig-frame__sticker">
                                  <span className="ig-frame__sticker-type">
                                    {frame.interactiveElement.type.toUpperCase()}
                                  </span>
                                  <span className="ig-frame__sticker-prompt">{frame.interactiveElement.prompt}</span>
                                  {frame.interactiveElement.options && (
                                    <div className="ig-frame__sticker-options">
                                      {frame.interactiveElement.options.map((opt, i) => (
                                        <span key={i} className="ig-frame__sticker-opt">{opt}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="ig-frame__visual">
                                <Eye size={10} />
                                <span>{frame.visualPrompt}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Caption Editor ── */}
                    {viewer === "caption" && (
                      <div className="ig-card__viewer">
                        <div className="ig-card__viewer-title">
                          <Type size={13} />
                          <span>Caption & Hashtags</span>
                          <button
                            type="button"
                            className="sc-copy-btn"
                            onClick={() => handleCopyCaption(opp)}
                          >
                            {copiedId === opp.id ? <Check size={11} /> : <Copy size={11} />}
                            <span>{copiedId === opp.id ? "Copied" : "Copy"}</span>
                          </button>
                        </div>
                        <textarea
                          className="ig-card__caption-editor"
                          rows={6}
                          value={captionText}
                          onChange={(e) =>
                            setDraftCaptions((prev) => ({ ...prev, [opp.id]: e.target.value }))
                          }
                        />
                        <div className="ig-card__caption-footer">
                          <span className={`ig-card__char-count ${captionLength > 2200 ? "ig-card__char-count--over" : captionLength > 2000 ? "ig-card__char-count--warn" : ""}`}>
                            {captionLength.toLocaleString()} / 2,200
                          </span>
                          <span className="ig-card__hashtag-count">
                            <Hash size={10} />
                            {opp.executionPackage.hashtags.length} / 30 hashtags
                          </span>
                        </div>
                        <div className="ig-card__hashtags">
                          {opp.executionPackage.hashtags.map((ht, i) => (
                            <span key={i} className="ig-card__hashtag">{ht}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Instagram Preview ── */}
                    {viewer === "preview" && (
                      <div className="ig-card__viewer ig-card__viewer--preview">
                        <InstagramPreview
                          username={companySocialHandle(companyName, companyWebsite)}
                          profileImageUrl={companyLogoSource(companyLogoUrl) || (companyWebsite ? `/api/assets/logo?website=${encodeURIComponent(companyWebsite)}` : undefined)}
                          format={opp.recommendedFormat}
                          caption={captionText}
                          hashtags={opp.executionPackage.hashtags}
                          carouselSlides={opp.executionPackage.carouselSlides}
                          reelStoryboard={opp.executionPackage.reelStoryboard}
                          storyFrames={opp.executionPackage.storySequence}
                        />
                      </div>
                    )}

                    {/* ── Score Breakdown (collapsible) ── */}
                    <details className="ig-card__details">
                      <summary className="ig-card__details-summary">
                        <span>Signal breakdown & evidence</span>
                        <ChevronDown size={12} />
                      </summary>
                      <div className="ig-card__details-content">
                        <div className="ig-card__why-grid">
                          <div>
                            <span className="ig-card__why-label">Why this matters</span>
                            <p className="ig-card__why-text">{opp.whyThisMatters}</p>
                          </div>
                          <div>
                            <span className="ig-card__why-label">Why am I seeing this?</span>
                            <p className="ig-card__why-text">{opp.whyAmISeeingThis}</p>
                          </div>
                        </div>
                        <div className="ig-card__score-grid">
                          {[
                            { label: "Goal Alignment", value: opp.score.strategicGoalAlignment, max: 15 },
                            { label: "ICP Relevance", value: opp.score.icpRelevance, max: 15 },
                            { label: "Pain Match", value: opp.score.audiencePainMatch, max: 15 },
                            { label: "Product Fit", value: opp.score.productFit, max: 10 },
                            { label: "Evidence", value: opp.score.evidenceStrength, max: 10 },
                            { label: "Visual Potential", value: opp.score.visualPotential, max: 10 },
                          ].map((item) => (
                            <div key={item.label} className="ig-card__score-item">
                              <span className="ig-card__score-item-label">{item.label}</span>
                              <div className="ig-card__score-bar">
                                <div className="ig-card__score-bar-fill" style={{ width: `${(item.value / item.max) * 100}%` }} />
                              </div>
                              <span className="ig-card__score-item-value">{item.value}/{item.max}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </details>

                    {/* ── Card Actions ── */}
                    <div className="ig-card__actions">
                      <button
                        type="button"
                        className="sc-btn sc-btn--ghost sc-btn--sm"
                        onClick={() => setRepurposeModalOpp(opp)}
                      >
                        <Share2 size={13} />
                        <span>Repurpose</span>
                      </button>

                      <div className="ig-card__actions-right">
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
                          title="Records a manual planning date. It does not publish to Instagram."
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
                <p className="sc-modal__desc">Transform this content into cross-channel assets</p>
              </div>
              <button type="button" className="sc-modal__close" onClick={() => setRepurposeModalOpp(null)}>
                <X size={14} />
              </button>
            </div>
            <div className="sc-modal__body">
              <div className="ig-repurpose-channels">
                {/* Stories Angle */}
                <div className="ig-repurpose-channel">
                  <div className="ig-repurpose-channel__header">
                    <Smartphone size={14} />
                    <strong>Instagram Stories</strong>
                    <button
                      type="button"
                      className="sc-copy-btn"
                      onClick={() => handleCopyText(repurposeModalOpp.executionPackage.repurposingPlan.storiesAngle, "stories-" + repurposeModalOpp.id)}
                    >
                      {copiedId === "stories-" + repurposeModalOpp.id ? <Check size={11} /> : <Copy size={11} />}
                      <span>{copiedId === "stories-" + repurposeModalOpp.id ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <p className="ig-repurpose-channel__text">{repurposeModalOpp.executionPackage.repurposingPlan.storiesAngle}</p>
                </div>

                {/* LinkedIn */}
                <div className="ig-repurpose-channel">
                  <div className="ig-repurpose-channel__header">
                    <strong>LinkedIn Post</strong>
                    <button
                      type="button"
                      className="sc-copy-btn"
                      onClick={() => handleCopyText(repurposeModalOpp.executionPackage.repurposingPlan.linkedInDraft, "linkedin-" + repurposeModalOpp.id)}
                    >
                      {copiedId === "linkedin-" + repurposeModalOpp.id ? <Check size={11} /> : <Copy size={11} />}
                      <span>{copiedId === "linkedin-" + repurposeModalOpp.id ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <pre className="ig-repurpose-channel__pre">{repurposeModalOpp.executionPackage.repurposingPlan.linkedInDraft}</pre>
                </div>

                {/* X */}
                <div className="ig-repurpose-channel">
                  <div className="ig-repurpose-channel__header">
                    <strong>X / Twitter</strong>
                    <button
                      type="button"
                      className="sc-copy-btn"
                      onClick={() => handleCopyText(repurposeModalOpp.executionPackage.repurposingPlan.xPostOrThread, "x-" + repurposeModalOpp.id)}
                    >
                      {copiedId === "x-" + repurposeModalOpp.id ? <Check size={11} /> : <Copy size={11} />}
                      <span>{copiedId === "x-" + repurposeModalOpp.id ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <pre className="ig-repurpose-channel__pre">{repurposeModalOpp.executionPackage.repurposingPlan.xPostOrThread}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Opportunity Map Modal ── */}
      {showMapModal && opportunityMap && (
        <div className="sc-modal-overlay" onClick={() => setShowMapModal(false)}>
          <div className="sc-modal sc-modal--full" onClick={(e) => e.stopPropagation()}>
            <div className="sc-modal__header">
              <div>
                <h3 className="sc-modal__title">Opportunity Map</h3>
                <p className="sc-modal__desc">{opportunityMap.themes.length} strategic themes for {opportunityMap.companyName}</p>
              </div>
              <button type="button" className="sc-modal__close" onClick={() => setShowMapModal(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="sc-modal__body">
              {/* Pillar distribution */}
              <div className="ig-map__pillars">
                <h5 className="ig-map__section-title">Content Pillar Distribution</h5>
                <div className="ig-map__pillar-bars">
                  {Object.entries(opportunityMap.pillarDistribution).map(([pillar, pct]) => (
                    <div key={pillar} className="ig-map__pillar-bar">
                      <span className="ig-map__pillar-label">{pillar}</span>
                      <div className="ig-map__pillar-track">
                        <div className="ig-map__pillar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="ig-map__pillar-pct">{pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Theme cards */}
              <div className="ig-map__themes">
                <h5 className="ig-map__section-title">Strategic Themes</h5>
                <div className="ig-map__theme-grid">
                  {opportunityMap.themes.map((theme) => (
                    <div key={theme.id} className="ig-map__theme-card">
                      <span className="sc-badge sc-badge--sm sc-badge--accent">
                        {theme.category.replace(/_/g, " ")}
                      </span>
                      <h6 className="ig-map__theme-title">{theme.title}</h6>
                      <p className="ig-map__theme-desc">{theme.description}</p>
                      {theme.suggestedHooks[0] && (
                        <div className="ig-map__theme-hook">
                          <Lightbulb size={10} />
                          <span>&ldquo;{theme.suggestedHooks[0]}&rdquo;</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
