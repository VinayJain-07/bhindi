"use client";

import * as React from "react";
import { LiquidGlassFooter } from "@/components/liquid-glass-footer";
import { ArrowRight, Sparkles } from "lucide-react";

export default function FooterPage() {
  return (
    <main className="relative w-full min-h-[115vh] overflow-x-hidden flex flex-col items-center bg-[#07070c] font-sans selection:bg-white/20 selection:text-white">
      {/* Dark Ambient Radial Glow */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none fixed inset-0 z-[0] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/15 via-[#07070c] to-[#050508]" 
      />

      {/* Content Wrapper */}
      <div className="relative z-10 w-full max-w-7xl px-6 py-16 flex flex-col flex-1 justify-between min-h-[115vh]">
        {/* Upper CTA Section */}
        <div className="pt-24 md:pt-36 flex flex-col items-center text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-white backdrop-blur-md mb-6">
            <Sparkles size={14} />
            <span>IMMERSIVE VISUAL EXPERIENCE</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.08]">
            Clarity in motion,
            <br />
            <span className="font-serif italic font-normal text-white/90">
              boundless wonders.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-white/80 max-w-xl leading-relaxed">
            Experience cosmic clarity and real-time intelligence encapsulated in a seamless liquid glass aesthetic.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#explore"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white text-black px-7 text-sm font-semibold shadow-2xl hover:bg-white/90 transition-all active:scale-95"
            >
              <span>Explore The Universe</span>
              <ArrowRight size={16} />
            </a>
            <a
              href="#learn-more"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/30 bg-white/10 backdrop-blur-md px-7 text-sm font-semibold text-white hover:bg-white/20 transition-all active:scale-95"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Liquid Glass Footer */}
        <LiquidGlassFooter />
      </div>
    </main>
  );
}
