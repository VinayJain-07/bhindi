import { describe, it, expect } from "vitest";
import {
  generateScoredXAngles,
  buildXThread,
  generateThreeVariants,
  generateXExecutionPackage,
} from "./writer";
import { computeXOpportunityScore } from "./scorer";
import type { CompanyMemory } from "@/lib/reddit/company-memory";

const mockMemory: CompanyMemory = {
  companyName: "HyperMetrics",
  websiteUrl: "https://hypermetrics.io",
  category: "Real-Time Product Analytics & Revenue Intelligence",
  description: "Unified revenue and product analytics platform replacing 4 fragmented legacy dashboards.",
  tagline: "Ship Features That Move Revenue",
  productsAndServices: ["Event Stream Engine", "Funnel Revenue Attribution", "SQL Query Hub"],
  featuresAndCapabilities: ["Sub-second event querying", "Zero-setup Stripe sync", "Automatic conversion drop-off alerts"],
  icpsAndPersonas: [
    {
      title: "VP of Product",
      role: "Product Leadership",
      description: "Needs direct attribution between shipped features and bottom-line expansion.",
      painPoints: ["Disconnected analytics tools", "Waiting days for data engineering queries"],
    },
  ],
  painPoints: ["Fragmented multi-tool analytics stacks", "Slow SQL query turnaround", "Inaccurate revenue attribution"],
  jobsToBeDone: ["Connect feature adoption to MRR expansion", "Diagnose onboarding drop-offs instantly"],
  useCases: ["Funnel conversion diagnosis", "Revenue drop-off alerting"],
  differentiators: ["Direct Stripe & database integration with zero ETL lag", "Single unified data schema"],
  competitors: [
    {
      name: "Mixpanel",
      website: "https://mixpanel.com",
      positioning: "Product analytics for mobile and web",
    },
  ],
  positioning: "The only product analytics platform built from day one to connect user actions directly to revenue.",
  primaryKeywords: ["product analytics", "revenue attribution", "saas metrics"],
  secondaryKeywords: ["funnel tracking", "sql analytics", "stripe attribution"],
  brandVoice: {
    tone: "Sharp, concise, technical, no corporate fluff",
    principles: ["Never use fake stats", "Keep copy punchy and readable on mobile"],
    allowedClaims: ["Direct revenue attribution", "Zero ETL lag"],
    forbiddenPhrases: ["game changer", "synergy", "revolutionize"],
  },
};

describe("X Writer Agent & Intelligence Engine", () => {
  it("generates and ranks strategic angles for X", () => {
    const angles = generateScoredXAngles("Revenue Attribution", "VP of Product", mockMemory);
    expect(angles.length).toBeGreaterThanOrEqual(4);
    expect(angles[0].hook).toBeDefined();
    expect(angles[0].angleScore).toBeGreaterThanOrEqual(85);
  });

  it("builds a structured 5-tweet high-retention X thread", () => {
    const thread = buildXThread(
      "Revenue Attribution",
      "Most advice about product analytics is completely backwards.",
      mockMemory
    );

    expect(thread.length).toBe(5);
    expect(thread[0].tweetNumber).toBe(1);
    expect(thread[0].content).toContain("A breakdown of why the traditional approach breaks down");
    expect(thread[thread.length - 1].content).toContain("HyperMetrics");
  });

  it("generates 3 distinct human-written post variants (Punchy, Observation, Contrarian)", () => {
    const variants = generateThreeVariants(
      "Product Analytics",
      "Stop fixing symptoms with more dashboards.",
      mockMemory
    );

    expect(variants.punchy).toBeDefined();
    expect(variants.observation).toContain("• Legacy teams");
    expect(variants.contrarian).toContain("Unpopular truth");
  });

  it("computes accurate 10-factor opportunity score", () => {
    const score = computeXOpportunityScore(
      {
        title: "The Flaw in Fragmented Analytics Stacks",
        opportunityType: "CONTRARIAN_POV",
        format: "SINGLE_POST",
        primaryGoal: "acquisition",
        targetAudience: "VP of Product",
        targetPainPoint: "Fragmented multi-tool analytics stacks",
        signalOrigin: {
          source: "competitor_analysis",
          topic: "Legacy Workflow Gaps vs Mixpanel",
          evidenceSnippet: "Direct alignment with ICP pain around fragmented dashboards",
        },
        supportingEvidence: [
          "Grounded in HyperMetrics company foundation",
          "Verified against market context",
        ],
      },
      mockMemory
    );

    expect(score.total).toBeGreaterThanOrEqual(80);
    expect(score.tier).toMatch(/high|exceptional/);
    expect(score.icpRelevance).toBe(15);
    expect(score.productRelevance).toBe(15);
    expect(score.conversationPotential).toBe(10);
  });

  it("produces a full execution package with brand voice and repurposing plan", () => {
    const pkg = generateXExecutionPackage({
      title: "Why Modern Teams Unify Product & Revenue Data",
      topic: "Unified Revenue Intelligence",
      opportunityType: "CONTRARIAN_POV",
      format: "SINGLE_POST",
      targetAudience: "VP of Product",
      targetPainPoint: "Inaccurate revenue attribution",
      supportingEvidence: ["Direct evidence from HyperMetrics memory"],
      memory: mockMemory,
    });

    expect(pkg.postContent).toBeDefined();
    expect(pkg.brandVoiceChecks.passedTone).toBe(true);
    expect(pkg.brandVoiceChecks.noInventedMetrics).toBe(true);
    expect(pkg.repurposingPlan.linkedInPost).toContain("HyperMetrics");
    expect(pkg.repurposingPlan.instagramCarouselHook).toBeDefined();
  });
});
