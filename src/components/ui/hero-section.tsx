"use client";

import * as React from "react";
import { ArrowRight, Sparkles, Shield, Cpu, Lock, Search } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { SonarGrid } from "@/components/ui/sonar-grid";
import { BorderBeam } from "@/components/ui/border-beam";

export interface SmarkHeroProps {
  eyebrow?: string;
  headline?: string;
  headlineEm?: string;
  subline?: string;
  defaultUrl?: string;
  onStartAnalysis?: (url: string) => void;
  className?: string;
}

export function SmarkHeroSection({
  eyebrow = "AI-POWERED MARKETING INTELLIGENCE",
  headline = "Your marketing has a new",
  headlineEm = "command center.",
  subline = "Transform raw web data into evidence-led growth priorities. One URL in, six connected analyses out.",
  defaultUrl = "",
  onStartAnalysis,
  className = "",
}: SmarkHeroProps) {
  const [url, setUrl] = React.useState(defaultUrl);
  const reduce = useReducedMotion();

  const enter = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, delay: delay * 0.45, ease: [0.22, 1, 0.36, 1] as const },
        };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let trimmed = url.trim();
    if (trimmed) {
      if (!/^https?:\/\//i.test(trimmed)) {
        trimmed = `https://${trimmed}`;
      }
      if (onStartAnalysis) {
        onStartAnalysis(trimmed);
      } else {
        window.location.href = `/onboarding?url=${encodeURIComponent(trimmed)}`;
      }
    }
  };

  const handleQuickFill = (domain: string) => {
    const formatted = `https://${domain}`;
    setUrl(formatted);
  };

  return (
    <SonarGrid
      id="smark-hero-sonar"
      ringWidth={125}
      speed={135}
      amplitude={1.6}
      pingEvery={4.2}
      interactive={true}
      spacing={28}
      dotRadius={1.35}
      baseOpacity={0.22}
      color="rgba(168, 130, 246, 0.65)"
      pingArea={[0.2, 0.15, 0.8, 0.7]}
      className={`relative flex min-h-[88vh] w-full flex-col items-center justify-center overflow-hidden bg-[#0a0a0f] text-slate-100 ${className}`}
    >
      {/* Radial soft background wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_45%,rgba(139,44,224,0.06)_0%,transparent_100%)]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">

        {/* Eyebrow Kicker */}
        <motion.div
          {...enter(0.04)}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium tracking-[0.14em] text-slate-300 backdrop-blur-md"
        >
          <Sparkles className="size-3.5 text-purple-400" />
          <span>{eyebrow}</span>
        </motion.div>

        {/* H1 Main Title */}
        <motion.h1
          {...enter(0.1)}
          className="max-w-4xl text-5xl font-semibold tracking-[-0.01em] text-white sm:text-6xl md:text-7xl lg:text-[76px] leading-[1.08]"
        >
          {headline}
          <br />
          <em className="font-serif italic font-normal text-purple-300">
            {headlineEm}
          </em>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          {...enter(0.18)}
          className="mt-6 max-w-2xl text-base font-normal leading-relaxed text-slate-300/95 sm:text-lg md:text-xl tracking-[0.012em]"
        >
          {subline}
        </motion.p>

        {/* Interactive URL Search Form with BorderBeam */}
        <motion.form
          {...enter(0.26)}
          onSubmit={handleSubmit}
          className="mt-10 w-full max-w-2xl px-2"
        >
          <BorderBeam
            size="md"
            colorVariant="colorful"
            borderRadius={22}
            className="w-full"
          >
            <div className="group/field relative flex w-full flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-[22px] border border-white/10 bg-[#0d0d16]/30 p-2 backdrop-blur-2xl transition-all hover:bg-[#0d0d16]/40 focus-within:border-purple-400/40 focus-within:bg-[#0d0d16]/50 shadow-[0_12px_45px_-10px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.08)]">
              {/* Corner Lighting - Soft Internal Ambient Glow Pools */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[22px]"
              >
                <div className="absolute -top-3 -left-3 size-14 rounded-full bg-purple-500/20 blur-md transition-all duration-300 group-hover/field:bg-purple-500/35 group-focus-within/field:bg-purple-500/45" />
                <div className="absolute -top-3 -right-3 size-14 rounded-full bg-indigo-500/15 blur-md transition-all duration-300 group-hover/field:bg-indigo-500/30 group-focus-within/field:bg-indigo-500/40" />
                <div className="absolute -bottom-3 -left-3 size-14 rounded-full bg-purple-600/15 blur-md transition-all duration-300 group-hover/field:bg-purple-600/30 group-focus-within/field:bg-purple-600/40" />
                <div className="absolute -bottom-3 -right-3 size-14 rounded-full bg-cyan-400/20 blur-md transition-all duration-300 group-hover/field:bg-cyan-400/35 group-focus-within/field:bg-cyan-400/45" />
              </div>

              {/* Search Icon */}
              <div className="pointer-events-none pl-3 text-slate-400 transition-colors duration-200 group-focus-within/field:text-purple-300 hidden sm:flex items-center">
                <Search className="size-4.5" />
              </div>

              {/* Fully Translucent Input (NO WHITE BAR) */}
              <input
                type="text"
                autoComplete="off"
                spellCheck={false}
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter your website URL (e.g. stripe.com)"
                className="relative z-10 h-12 w-full flex-1 border-0 !bg-transparent px-3 text-sm sm:text-base font-normal text-white placeholder-slate-400 outline-none transition-all tracking-[0.012em]"
                style={{ backgroundColor: "transparent" }}
              />

              {/* Submit CTA Button inside the translucent capsule */}
              <button
                type="submit"
                className="relative z-10 group inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] px-6 text-sm font-semibold tracking-wide text-white shadow-lg shadow-purple-600/30 transition-all duration-300 hover:bg-right active:scale-[0.98] shrink-0"
              >
                <span>Start analysis</span>
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>
          </BorderBeam>
        </motion.form>

        {/* Quick Fill Suggestions */}
        <motion.div
          {...enter(0.32)}
          className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400"
        >
          <span>Try:</span>
          {["stripe.com", "linear.app", "ramp.com"].map((domain) => (
            <button
              key={domain}
              type="button"
              onClick={() => handleQuickFill(domain)}
              className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300 transition-colors hover:border-purple-500/40 hover:text-white"
            >
              {domain}
            </button>
          ))}
          <span className="hidden sm:inline">&bull; 3-minute analysis</span>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          {...enter(0.38)}
          className="mt-12 flex flex-wrap items-center justify-center gap-6 border-t border-white/8 pt-8 text-xs font-medium text-slate-400 sm:gap-8"
        >
          <div className="flex items-center gap-2">
            <Cpu className="size-4 text-purple-400" />
            <span>Bring your own AI key</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-purple-400" />
            <span>Evidence-led, not invented</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-purple-400" />
            <span>Your data stays yours</span>
          </div>
        </motion.div>
      </div>
    </SonarGrid>
  );
}

export default SmarkHeroSection;
