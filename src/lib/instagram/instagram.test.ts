import { describe, it, expect } from "vitest";
import { generateInstagramOpportunityMap } from "./opportunity-map";
import { computeInstagramOpportunityScore } from "./scorer";
import {
  generateScoredContentAngles,
  buildCarouselSequence,
  buildReelStoryboard,
  buildStorySequence,
  generateInstagramExecutionPackage,
} from "./writer";
import type { CompanyMemory } from "@/lib/reddit/company-memory";

const mockMemory: CompanyMemory = {
  companyName: "CloudScale",
  websiteUrl: "https://cloudscale.io",
  category: "Cloud Cost Optimization & Autonomous Scaling",
  description: "Autonomous cloud infrastructure optimization platform reducing AWS/GCP bills by 40%.",
  tagline: "Cut Cloud Waste with Autonomous Precision",
  productsAndServices: ["Autonomous Cluster AutoScaler", "Spot Instance Engine", "Real-Time Kubernetes Cost Dashboard"],
  featuresAndCapabilities: ["Real-time bin-packing", "Autonomous spot migration with zero downtime", "Slack cost alerting"],
  icpsAndPersonas: [
    {
      title: "DevOps Lead",
      role: "Engineering Infrastructure",
      description: "Responsible for cluster reliability and controlling runaway AWS bills.",
      painPoints: ["Sudden AWS invoice spikes", "Manual spot instance maintenance overhead"],
    },
  ],
  painPoints: ["Sudden cloud bill surges", "Manual Kubernetes node provisioning overhead", "Kubernetes cluster over-provisioning"],
  jobsToBeDone: ["Eliminate cloud waste automatically", "Maintain 99.99% uptime on spot instances"],
  useCases: ["Kubernetes cost optimization", "Dev/staging environment autoscaling"],
  differentiators: ["Zero-downtime spot fallback", "Guaranteed 40% cost reduction without code changes"],
  competitors: [
    {
      name: "Cast AI",
      website: "https://cast.ai",
      positioning: "Automated Kubernetes cost management",
    },
  ],
  positioning: "The only autonomous cloud optimization engine that guarantees savings with zero downtime risk.",
  primaryKeywords: ["kubernetes cost optimization", "cloud autoscaling", "aws bill reduction"],
  secondaryKeywords: ["spot instances", "k8s bin packing", "finops tooling"],
  brandVoice: {
    tone: "Authoritative, transparent, and evidence-first",
    principles: ["No exaggerated ROI claims without metrics", "Clear technical precision"],
    allowedClaims: ["40% typical cloud savings", "Automated spot node replenishment"],
    forbiddenPhrases: ["magic solution", "100% effortless free money"],
  },
};

describe("Instagram Opportunity & Intelligence Agent", () => {
  it("generates a comprehensive Instagram Opportunity Map across strategic categories", () => {
    const map = generateInstagramOpportunityMap(mockMemory);
    expect(map.companyName).toBe("CloudScale");
    expect(map.themes.length).toBeGreaterThanOrEqual(6);
    expect(map.visualConcepts.length).toBeGreaterThanOrEqual(2);
    expect(map.pillarDistribution["Educational / How-To"]).toBe(35);

    const problemTheme = map.themes.find((t) => t.category === "customer_problem");
    expect(problemTheme).toBeDefined();
    expect(problemTheme?.suggestedHooks.length).toBeGreaterThan(0);
  });

  it("calculates 11-factor opportunity score accurately", () => {
    const score = computeInstagramOpportunityScore(
      {
        title: "Tackling Kubernetes Cloud Waste",
        opportunityType: "EDUCATIONAL_POST",
        primaryGoal: "acquisition",
        recommendedFormat: "CAROUSEL",
        targetAudience: "DevOps Lead",
        targetPainPoint: "Sudden cloud bill surges",
        signalOrigin: {
          source: "website_content",
          description: "High intent cloud optimization workflow",
          evidenceSnippet: "Direct alignment with ICP bill surge pain",
        },
        supportingEvidence: [
          "Grounded in CloudScale core value proposition",
          "Direct alignment with identified ICP pain: Sudden cloud bill surges",
        ],
      },
      mockMemory
    );

    expect(score.total).toBeGreaterThanOrEqual(80);
    expect(score.tier).toMatch(/high|exceptional/);
    expect(score.icpRelevance).toBe(15);
    expect(score.audiencePainMatch).toBe(15);
    expect(score.visualPotential).toBe(10);
  });

  it("generates multi-angle scored hooks", () => {
    const angles = generateScoredContentAngles("Kubernetes Cost Waste", "DevOps Lead", mockMemory);
    expect(angles.length).toBeGreaterThanOrEqual(4);
    expect(angles[0].hook).toBeDefined();
    expect(angles[0].angleScore).toBeGreaterThanOrEqual(85);
  });

  it("builds slide-by-slide Carousel sequences (Hook -> Value -> Evidence -> CTA)", () => {
    const slides = buildCarouselSequence(
      "Cloud Waste Elimination",
      "Why traditional cloud optimization is failing in 2026",
      "Kubernetes Cost Waste",
      mockMemory
    );

    expect(slides.length).toBe(6);
    expect(slides[0].type).toBe("hook");
    expect(slides[slides.length - 1].type).toBe("cta");
    expect(slides[0].headline).toContain("Why traditional cloud optimization");
  });

  it("builds 0-3s Reel storyboard (Hook -> Problem -> Insight -> Proof -> CTA)", () => {
    const storyboard = buildReelStoryboard(
      "Cloud Waste Elimination",
      "Stop wasting 40% on idle cloud instances",
      "Kubernetes Cost Waste",
      mockMemory
    );

    expect(storyboard.length).toBe(5);
    expect(storyboard[0].timestamp).toBe("0-3s");
    expect(storyboard[0].phase).toBe("hook");
    expect(storyboard[storyboard.length - 1].phase).toBe("cta");
  });

  it("builds interactive Story sequence with sticker prompts", () => {
    const frames = buildStorySequence("Cloud Cost Management", "Cloud Waste", mockMemory);
    expect(frames.length).toBe(3);
    expect(frames[0].interactiveElement?.type).toBe("poll");
  });

  it("creates a full execution package with repurposing plan and brand checks", () => {
    const pkg = generateInstagramExecutionPackage({
      title: "Kubernetes AutoScaling Masterclass",
      topic: "Kubernetes AutoScaling",
      opportunityType: "CAROUSEL",
      recommendedFormat: "CAROUSEL",
      targetAudience: "DevOps Lead",
      targetPainPoint: "Manual Kubernetes node provisioning overhead",
      supportingEvidence: ["Direct evidence from CloudScale memory"],
      memory: mockMemory,
    });

    expect(pkg.recommendedFormat).toBe("CAROUSEL");
    expect(pkg.carouselSlides?.length).toBe(6);
    expect(pkg.caption).toContain("Save this post");
    expect(pkg.brandVoiceChecks.passedTone).toBe(true);
    expect(pkg.brandVoiceChecks.sourceVerified).toBe(true);
    expect(pkg.repurposingPlan.linkedInDraft).toBeDefined();
    expect(pkg.repurposingPlan.xPostOrThread).toBeDefined();
  });
});
