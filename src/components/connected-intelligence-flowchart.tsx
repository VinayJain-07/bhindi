"use client";

import * as React from "react";
import { useState } from "react";
import { motion } from "motion/react";
import {
  FileText,
  Search,
  Globe,
  Compass,
  Users,
  BarChart3,
  Cpu,
  Database,
  ArrowRight,
  Sparkles,
  Zap,
  Network,
  CheckCircle2,
  Share2,
  ChevronRight,
  Bot,
} from "lucide-react";

interface AnalysisNode {
  id: string;
  number: string;
  title: string;
  shortTitle: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  detail: string;
  color: {
    border: string;
    borderActive: string;
    bg: string;
    text: string;
    glow: string;
    badgeBg: string;
  };
  feedsInto: string[];
  receivesFrom: string[];
  sharedEvidence: string;
  aiCmoImpact: string;
  deliverables: string[];
}

const NODES: AnalysisNode[] = [
  {
    id: "company-intelligence",
    number: "01",
    title: "Company Intelligence",
    shortTitle: "Company Intel",
    category: "Strategic Brand Anchor",
    icon: FileText,
    detail:
      "Offer stack categorization, brand voice parameters, proof ladder architecture, and buyer objections rebuttal.",
    color: {
      border: "border-purple-500/30",
      borderActive: "border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.35)]",
      bg: "bg-purple-950/20",
      text: "text-purple-400",
      glow: "rgba(168,85,247,0.4)",
      badgeBg: "bg-purple-500/10 text-purple-300 border-purple-500/20",
    },
    feedsInto: ["Audience & Personas", "Content Strategy", "Competitor Whitespace"],
    receivesFrom: ["Central Evidence Engine"],
    sharedEvidence: "Brand voice guidelines, ICP objections rebuttal, quantified proof points, and offer taxonomy.",
    aiCmoImpact: "Establishes baseline truth for company positioning and prevents hallucinated value claims.",
    deliverables: ["Offer Stack Matrix", "Voice & Tone Guardrails", "Proof Ladder System"],
  },
  {
    id: "seo-technical-audit",
    number: "02",
    title: "SEO Technical Audit",
    shortTitle: "Technical SEO",
    category: "Infrastructure Health",
    icon: Search,
    detail:
      "Core Web Vitals health score, heading hierarchy validation, internal link topology, and orphaned page detection.",
    color: {
      border: "border-cyan-500/30",
      borderActive: "border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.35)]",
      bg: "bg-cyan-950/20",
      text: "text-cyan-400",
      glow: "rgba(6,182,212,0.4)",
      badgeBg: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
    },
    feedsInto: ["GEO & AI Visibility", "Content Strategy"],
    receivesFrom: ["Central Evidence Engine"],
    sharedEvidence: "Crawl topology, page depth scores, internal PageRank weights, and Core Web Vitals telemetry.",
    aiCmoImpact: "Pinpoints indexing bottlenecks that suppress organic distribution and AI bot rendering.",
    deliverables: ["Chromium CWV Audit", "Internal Link Graph", "Orphan Page Resolution"],
  },
  {
    id: "geo-ai-visibility",
    number: "03",
    title: "GEO & AI Visibility",
    shortTitle: "GEO & AI",
    category: "Synthesized Search Reality",
    icon: Globe,
    detail:
      "AI citation placement depth in ChatGPT and Perplexity, entity clarity scoring, and AI crawler access directives.",
    color: {
      border: "border-violet-500/30",
      borderActive: "border-violet-400 shadow-[0_0_30px_rgba(139,92,246,0.35)]",
      bg: "bg-violet-950/20",
      text: "text-violet-400",
      glow: "rgba(139,92,246,0.4)",
      badgeBg: "bg-violet-500/10 text-violet-300 border-violet-500/20",
    },
    feedsInto: ["Competitor Whitespace", "Content Strategy"],
    receivesFrom: ["SEO Technical Audit", "Company Intelligence", "Central Evidence Engine"],
    sharedEvidence: "LLM citation frequency, entity disambiguation score, schema claim graphs, and robots.txt directives.",
    aiCmoImpact: "Bridges traditional search ranking into generative AI answer engine citation share.",
    deliverables: ["LLM Citation Share Audit", "JSON-LD Entity Graph", "AI Bot Access Matrix"],
  },
  {
    id: "competitor-whitespace",
    number: "04",
    title: "Competitor Whitespace",
    shortTitle: "Competitors",
    category: "Market Positioning Gaps",
    icon: Compass,
    detail:
      "True market competitor identification, messaging whitespace isolation, and competitive SWOT breakdowns.",
    color: {
      border: "border-rose-500/30",
      borderActive: "border-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.35)]",
      bg: "bg-rose-950/20",
      text: "text-rose-400",
      glow: "rgba(244,63,94,0.4)",
      badgeBg: "bg-rose-500/10 text-rose-300 border-rose-500/20",
    },
    feedsInto: ["Content Strategy", "Company Intelligence"],
    receivesFrom: ["Company Intelligence", "GEO & AI Visibility", "Central Evidence Engine"],
    sharedEvidence: "Uncontested keyword chasms, competitor feature pricing matrices, and positioning counter-hooks.",
    aiCmoImpact: "Directs marketing resources away from saturated red oceans into high-win positioning vacuums.",
    deliverables: ["SWOT Arbitrage Grid", "Whitespace Opportunity Index", "Competitor Matrix"],
  },
  {
    id: "audience-personas",
    number: "05",
    title: "Audience & Personas",
    shortTitle: "Audience & ICP",
    category: "Demand & Buying Triggers",
    icon: Users,
    detail:
      "ICP profile segmentation, Jobs-To-Be-Done (JTBD) triggers, and functional procurement risk mapping.",
    color: {
      border: "border-amber-500/30",
      borderActive: "border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.35)]",
      bg: "bg-amber-950/20",
      text: "text-amber-400",
      glow: "rgba(245,158,11,0.4)",
      badgeBg: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    },
    feedsInto: ["Content Strategy", "Central Evidence Engine"],
    receivesFrom: ["Company Intelligence", "Central Evidence Engine"],
    sharedEvidence: "Buying committee roles, functional job definitions, procurement objections, and purchase triggers.",
    aiCmoImpact: "Ensures every generated deliverable speaks directly to actual stakeholder buying criteria.",
    deliverables: ["ICP Persona Dossiers", "JTBD Trigger Matrix", "Procurement Objection Playbook"],
  },
  {
    id: "content-strategy",
    number: "06",
    title: "Content Strategy",
    shortTitle: "Content Strategy",
    category: "Deterministic Execution",
    icon: BarChart3,
    detail:
      "Content inventory across funnel stages, pillar topic clusters, and a prioritized 90-day editorial roadmap.",
    color: {
      border: "border-emerald-500/30",
      borderActive: "border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.35)]",
      bg: "bg-emerald-950/20",
      text: "text-emerald-400",
      glow: "rgba(16,185,129,0.4)",
      badgeBg: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    },
    feedsInto: ["12 Specialist Execution Agents"],
    receivesFrom: ["Company Intelligence", "SEO Technical Audit", "GEO & AI Visibility", "Competitor Whitespace", "Audience & Personas"],
    sharedEvidence: "Full-funnel content audit, prioritized topic clusters, and 90-day execution milestones.",
    aiCmoImpact: "Converts diagnostic intelligence from the other 5 reports into scheduled revenue campaigns.",
    deliverables: ["90-Day Editorial Calendar", "Topic Cluster Blueprints", "Funnel Stage Distribution"],
  },
];

type FlowMode = "all" | "foundation" | "market" | "execution";

export function ConnectedIntelligenceFlowchart() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("company-intelligence");
  const [activeMode, setActiveMode] = useState<FlowMode>("all");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const activeNode = NODES.find((n) => n.id === selectedNodeId) || NODES[0];

  const isNodeHighlighted = (nodeId: string) => {
    if (hoveredNodeId) {
      if (nodeId === hoveredNodeId) return true;
      const hovered = NODES.find((n) => n.id === hoveredNodeId);
      const target = NODES.find((n) => n.id === nodeId);
      if (hovered && target) {
        if (hovered.feedsInto.includes(target.title) || hovered.receivesFrom.includes(target.title)) return true;
      }
      return false;
    }

    if (activeMode === "foundation") {
      return nodeId === "company-intelligence" || nodeId === "seo-technical-audit";
    }
    if (activeMode === "market") {
      return nodeId === "geo-ai-visibility" || nodeId === "competitor-whitespace";
    }
    if (activeMode === "execution") {
      return nodeId === "audience-personas" || nodeId === "content-strategy";
    }
    return true;
  };

  return (
    <section className="relative overflow-hidden border-t border-white/10 bg-[#08080d] py-28 px-4 sm:px-6 lg:px-8" id="connected-intelligence">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[700px] rounded-full bg-purple-600/10 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-cyan-600/10 blur-[120px]" />

      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs font-medium tracking-[0.16em] text-purple-300 uppercase shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Network className="size-3.5 text-purple-400 animate-pulse" />
            CONNECTED INTELLIGENCE
          </div>

          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.01em] text-white sm:text-4xl lg:text-5xl">
            The 6 Connected Core Analyses
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base font-normal text-slate-300/85 tracking-[0.012em]">
            Each report covers a distinct strategic dimension while sharing evidence with the others.
          </p>

          {/* Interactive Flow Filter Pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {[
              { id: "all", label: "Full Neural Mesh", icon: Sparkles },
              { id: "foundation", label: "1. Brand & Infrastructure", icon: FileText },
              { id: "market", label: "2. Search & Competitor", icon: Globe },
              { id: "execution", label: "3. Audience & Content", icon: BarChart3 },
            ].map((mode) => {
              const Icon = mode.icon;
              const isActive = activeMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setActiveMode(mode.id as FlowMode)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-500/25 border border-purple-400"
                      : "bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white border border-white/10"
                  }`}
                >
                  <Icon className="size-3.5" />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* FLOWCHART CANVAS */}
        <div className="mt-14 relative rounded-3xl border border-white/10 bg-black/40 p-6 sm:p-10 backdrop-blur-xl shadow-2xl shadow-purple-950/30">
          
          {/* Top Stage Indicator */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-8 border-b border-white/10 text-xs text-slate-400">
            <div className="flex items-center gap-2.5">
              <span className="flex size-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-mono text-slate-300 uppercase tracking-wider text-[11px]">
                SHARED EVIDENCE BUS: SYNCHRONIZED
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span className="hidden sm:inline">Click or hover any node to inspect evidence pathways</span>
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-purple-300 font-mono">
                6 REPORTS &bull; 1 TRUTH
              </span>
            </div>
          </div>

          {/* Flowchart Grid Layout */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">

            {/* LEFT WING: Nodes 01 & 02 */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {[NODES[0], NODES[1]].map((node) => {
                const Icon = node.icon;
                const isSelected = selectedNodeId === node.id;
                const highlighted = isNodeHighlighted(node.id);

                return (
                  <motion.div
                    key={node.id}
                    layout
                    onClick={() => setSelectedNodeId(node.id)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className={`group relative cursor-pointer rounded-2xl border p-5 sm:p-6 transition-all duration-300 backdrop-blur-md ${
                      isSelected
                        ? `${node.color.borderActive} bg-white/[0.08]`
                        : highlighted
                        ? `${node.color.border} bg-white/[0.04] hover:bg-white/[0.07]`
                        : "border-white/5 bg-white/[0.01] opacity-40 hover:opacity-80"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex size-11 items-center justify-center rounded-xl border ${node.color.badgeBg}`}
                        >
                          <Icon className="size-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400">
                            ANALYSIS {node.number}
                          </span>
                          <h3 className="text-base font-semibold text-white group-hover:text-purple-300 transition-colors">
                            {node.title}
                          </h3>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border border-white/10 bg-white/5 text-slate-400">
                        {node.shortTitle}
                      </span>
                    </div>

                    <p className="mt-3 text-xs leading-relaxed text-slate-400">
                      {node.detail}
                    </p>

                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-mono flex items-center gap-1">
                        <Share2 className="size-3 text-purple-400" />
                        Feeds {node.feedsInto.length} analyses
                      </span>
                      <span className={`font-medium flex items-center gap-1 ${node.color.text}`}>
                        Inspect <ChevronRight className="size-3 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* CENTER WING: Node 03 (Top) + CENTRAL CORE + Node 04 (Bottom) */}
            <div className="lg:col-span-4 flex flex-col gap-6">

              {/* Node 03: GEO & AI Visibility */}
              {(() => {
                const node = NODES[2];
                const Icon = node.icon;
                const isSelected = selectedNodeId === node.id;
                const highlighted = isNodeHighlighted(node.id);

                return (
                  <motion.div
                    layout
                    onClick={() => setSelectedNodeId(node.id)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className={`group relative cursor-pointer rounded-2xl border p-5 transition-all duration-300 backdrop-blur-md ${
                      isSelected
                        ? `${node.color.borderActive} bg-white/[0.08]`
                        : highlighted
                        ? `${node.color.border} bg-white/[0.04] hover:bg-white/[0.07]`
                        : "border-white/5 bg-white/[0.01] opacity-40 hover:opacity-80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex size-10 items-center justify-center rounded-xl border ${node.color.badgeBg}`}>
                          <Icon className="size-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400">
                            ANALYSIS {node.number}
                          </span>
                          <h3 className="text-base font-semibold text-white group-hover:text-purple-300 transition-colors">
                            {node.title}
                          </h3>
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      {node.detail}
                    </p>
                  </motion.div>
                );
              })()}

              {/* THE CENTRAL SHARED EVIDENCE CORE */}
              <div className="relative rounded-2xl border border-purple-500/40 bg-gradient-to-b from-purple-900/30 via-black/80 to-purple-950/40 p-6 text-center shadow-xl shadow-purple-900/20 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.15),transparent_70%)]" />

                <div className="relative z-10 flex flex-col items-center">
                  <div className="relative flex size-14 items-center justify-center rounded-2xl border border-purple-400/40 bg-purple-500/20 text-purple-300 shadow-[0_0_25px_rgba(168,85,247,0.5)]">
                    <Database className="size-7 animate-pulse text-purple-300" />
                    <span className="absolute -top-1 -right-1 flex size-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex size-3 rounded-full bg-purple-500"></span>
                    </span>
                  </div>

                  <span className="mt-3 text-[10px] font-mono uppercase tracking-[0.16em] text-purple-400 font-semibold">
                    CENTRAL KNOWLEDGE BUS
                  </span>
                  <h4 className="mt-1 text-sm font-semibold text-white">
                    Shared Evidence Foundation
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-400 leading-tight max-w-[260px] tracking-[0.012em]">
                    20+ page crawl, HTTP baselines, CWV scores, & entity vector space unified into one model.
                  </p>

                  {/* Flow Direction Connectors */}
                  <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-mono text-purple-300 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full">
                    <Zap className="size-3 text-amber-400" />
                    <span>0 Context Drift Across Reports</span>
                  </div>
                </div>
              </div>

              {/* Node 04: Competitor Whitespace */}
              {(() => {
                const node = NODES[3];
                const Icon = node.icon;
                const isSelected = selectedNodeId === node.id;
                const highlighted = isNodeHighlighted(node.id);

                return (
                  <motion.div
                    layout
                    onClick={() => setSelectedNodeId(node.id)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className={`group relative cursor-pointer rounded-2xl border p-5 transition-all duration-300 backdrop-blur-md ${
                      isSelected
                        ? `${node.color.borderActive} bg-white/[0.08]`
                        : highlighted
                        ? `${node.color.border} bg-white/[0.04] hover:bg-white/[0.07]`
                        : "border-white/5 bg-white/[0.01] opacity-40 hover:opacity-80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex size-10 items-center justify-center rounded-xl border ${node.color.badgeBg}`}>
                          <Icon className="size-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400">
                            ANALYSIS {node.number}
                          </span>
                          <h3 className="text-base font-semibold text-white group-hover:text-purple-300 transition-colors">
                            {node.title}
                          </h3>
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      {node.detail}
                    </p>
                  </motion.div>
                );
              })()}
            </div>

            {/* RIGHT WING: Nodes 05 & 06 */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {[NODES[4], NODES[5]].map((node) => {
                const Icon = node.icon;
                const isSelected = selectedNodeId === node.id;
                const highlighted = isNodeHighlighted(node.id);

                return (
                  <motion.div
                    key={node.id}
                    layout
                    onClick={() => setSelectedNodeId(node.id)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className={`group relative cursor-pointer rounded-2xl border p-5 sm:p-6 transition-all duration-300 backdrop-blur-md ${
                      isSelected
                        ? `${node.color.borderActive} bg-white/[0.08]`
                        : highlighted
                        ? `${node.color.border} bg-white/[0.04] hover:bg-white/[0.07]`
                        : "border-white/5 bg-white/[0.01] opacity-40 hover:opacity-80"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex size-11 items-center justify-center rounded-xl border ${node.color.badgeBg}`}
                        >
                          <Icon className="size-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400">
                            ANALYSIS {node.number}
                          </span>
                          <h3 className="text-base font-semibold text-white group-hover:text-purple-300 transition-colors">
                            {node.title}
                          </h3>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border border-white/10 bg-white/5 text-slate-400">
                        {node.shortTitle}
                      </span>
                    </div>

                    <p className="mt-3 text-xs leading-relaxed text-slate-400">
                      {node.detail}
                    </p>

                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-mono flex items-center gap-1">
                        <Share2 className="size-3 text-purple-400" />
                        {node.id === "content-strategy" ? "Directs 12 Execution Agents" : `Feeds ${node.feedsInto.length} analyses`}
                      </span>
                      <span className={`font-medium flex items-center gap-1 ${node.color.text}`}>
                        Inspect <ChevronRight className="size-3 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

          </div>

          {/* EVIDENCE INTERCONNECTION INSPECTOR (LIVE EXPANDED DETAILS) */}
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className="flex size-3 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                <span className="text-xs uppercase tracking-widest font-mono text-purple-400 font-bold">
                  ACTIVE ANALYSIS TELEMETRY:
                </span>
                <span className="text-sm font-bold text-white">
                  {activeNode.number} &mdash; {activeNode.title}
                </span>
                <span className="text-xs text-slate-400">({activeNode.category})</span>
              </div>

              <div className="flex items-center gap-2">
                {activeNode.deliverables.map((item, idx) => (
                  <span
                    key={idx}
                    className="hidden sm:inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-mono text-slate-300"
                  >
                    <CheckCircle2 className="size-3 text-emerald-400" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              {/* Evidence Provided */}
              <div className="rounded-xl border border-white/5 bg-black/30 p-4">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5 font-bold">
                  <Share2 className="size-3.5 text-cyan-400" />
                  Evidence Shared with Ecosystem
                </span>
                <p className="mt-2 text-slate-300 leading-relaxed">
                  {activeNode.sharedEvidence}
                </p>
              </div>

              {/* Ingestion & Feed Links */}
              <div className="rounded-xl border border-white/5 bg-black/30 p-4">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5 font-bold">
                  <Network className="size-3.5 text-purple-400" />
                  Interconnected Pathways
                </span>
                <div className="mt-2 space-y-1 text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-mono">Receives:</span>
                    <span className="text-slate-300">
                      {activeNode.receivesFrom.join(", ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-mono">Feeds:</span>
                    <span className="text-purple-300 font-medium">
                      {activeNode.feedsInto.join(", ") || "AI CMO & 12 Specialist Agents"}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI CMO Impact */}
              <div className="rounded-xl border border-white/5 bg-black/30 p-4">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5 font-bold">
                  <Bot className="size-3.5 text-emerald-400" />
                  AI CMO Synthesis Impact
                </span>
                <p className="mt-2 text-slate-300 leading-relaxed">
                  {activeNode.aiCmoImpact}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Callout: Flow to 12 Specialist Agents */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-purple-500/20 bg-purple-950/20 p-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Cpu className="size-4" />
              </div>
              <div>
                <p className="font-semibold text-white">
                  Deterministic Downstream Execution
                </p>
                <p className="text-slate-400 text-[11px]">
                  All 6 reports automatically empower the 12 Specialist Agents, executive PDFs, PPTXs, and XLSX workbooks without manual briefing.
                </p>
              </div>
            </div>

            <a
              href="#specialist-agents"
              className="inline-flex items-center gap-1.5 text-purple-300 hover:text-white font-medium whitespace-nowrap transition-colors"
            >
              <span>View 12 Specialist Agents</span>
              <ArrowRight className="size-3.5" />
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}
