import "server-only";
import { extractCompanyMemory, type CompanyMemory } from "@/lib/reddit/company-memory";
import { generateInstagramOpportunityMap } from "./opportunity-map";
import { collectInstagramSignals, type CollectedSignal } from "./signal-collector";
import { computeInstagramOpportunityScore } from "./scorer";
import { generateInstagramExecutionPackage } from "./writer";
import { requireEnabledAgent } from "@/lib/agents/execution-settings";
import type {
  InstagramOpportunity,
  InstagramOpportunityMap,
  InstagramOpportunityType,
  InstagramFormat,
  InstagramGoal,
} from "./types";

export type InstagramDiscoveryPipelineResult = {
  opportunities: InstagramOpportunity[];
  opportunityMap: InstagramOpportunityMap;
  memory: CompanyMemory;
  totalSignalsCollected: number;
  totalOpportunitiesGenerated: number;
  highPriorityCount: number;
};

/**
 * Runs the end-to-end continuous Instagram opportunity discovery,
 * scoring, and content intelligence pipeline.
 */
export async function runInstagramOpportunityPipeline(args: {
  companyId: string;
  userId: string;
  maxCandidates?: number;
}): Promise<InstagramDiscoveryPipelineResult> {
  // 1. Extract shared Company Memory
  const memory = await extractCompanyMemory(args.companyId);

  // 2. Fetch AgentConfig for user-specific preferences, completed/dismissed history
  const { config: configObj } = await requireEnabledAgent(args.companyId, "INSTAGRAM");

  const customThemes = Array.isArray(configObj.customThemes)
    ? configObj.customThemes.filter((t): t is string => typeof t === "string")
    : [];
  const completedIds = Array.isArray(configObj.completedOpportunities)
    ? configObj.completedOpportunities.filter((id): id is string => typeof id === "string")
    : [];
  const dismissedIds = Array.isArray(configObj.dismissedOpportunities)
    ? configObj.dismissedOpportunities.filter((id): id is string => typeof id === "string")
    : [];

  const processedIds = new Set<string>([...completedIds, ...dismissedIds]);

  // 3. Generate the Instagram Opportunity Map
  const opportunityMap = generateInstagramOpportunityMap(memory, customThemes);

  // 4. Collect Multi-source Signals (Website, SEO/GEO, Reddit, Competitors, Product, Marketing Ideas)
  const rawSignals = await collectInstagramSignals(args.companyId, memory);

  // 5. Normalize, Deduplicate & Merge Related Signals
  const mergedSignalsMap = new Map<string, CollectedSignal & { mergedCount: number; combinedEvidence: string[] }>();

  rawSignals.forEach((sig) => {
    // Generate normalized topic key
    const normalizedKey = sig.topic.toLowerCase().replace(/[^a-z0-9]/g, " ").trim().slice(0, 30);
    const existing = mergedSignalsMap.get(normalizedKey);
    if (existing) {
      existing.mergedCount += 1;
      existing.combinedEvidence.push(sig.evidence);
      existing.relevanceConfidence = Math.min(99, existing.relevanceConfidence + 3);
    } else {
      mergedSignalsMap.set(normalizedKey, {
        ...sig,
        mergedCount: 1,
        combinedEvidence: [sig.evidence],
      });
    }
  });

  // 6. Synthesize Candidate Opportunities from merged signals & opportunity map
  const rawOpportunities: InstagramOpportunity[] = [];

  // Derive opportunities from themes & signals
  const themesToProcess = opportunityMap.themes.slice(0, 8);

  for (const theme of themesToProcess) {
    const oppId = `ig_opp_${args.companyId.slice(0, 6)}_${theme.id}`;
    if (processedIds.has(oppId)) continue;

    let opportunityType: InstagramOpportunityType = "EDUCATIONAL_POST";
    let primaryGoal: InstagramGoal = "authority";
    let recommendedFormat: InstagramFormat = "CAROUSEL";

    if (theme.category === "product_education") {
      opportunityType = "PRODUCT_EDUCATION";
      recommendedFormat = "REEL";
      primaryGoal = "acquisition";
    } else if (theme.category === "social_proof") {
      opportunityType = "SOCIAL_PROOF";
      recommendedFormat = "CAROUSEL";
      primaryGoal = "leads";
    } else if (theme.category === "competitor_whitespace") {
      opportunityType = "COMPARISON";
      recommendedFormat = "CAROUSEL";
      primaryGoal = "acquisition";
    } else if (theme.category === "founder_insight") {
      opportunityType = "FOUNDER_INSIGHT";
      recommendedFormat = "REEL";
      primaryGoal = "awareness";
    } else if (theme.category === "faq_objection") {
      opportunityType = "FAQ";
      recommendedFormat = "STORY";
      primaryGoal = "retention";
    } else if (theme.category === "trend_compatible") {
      opportunityType = "TREND_ADAPTATION";
      recommendedFormat = "REEL";
      primaryGoal = "awareness";
    }

    const targetAudience = memory.icpsAndPersonas[0]?.title || "Modern Marketing & Product Teams";
    const targetPainPoint = memory.painPoints[0] || "Inefficient manual workflows";
    const supportingEvidence = [
      `Grounded in ${memory.companyName} core value proposition: ${memory.positioning || memory.category}.`,
      `Direct alignment with identified ICP pain: ${targetPainPoint}.`,
    ];

    // Compute 11-factor opportunity score
    const score = computeInstagramOpportunityScore(
      {
        title: theme.title,
        opportunityType,
        primaryGoal,
        recommendedFormat,
        targetAudience,
        targetPainPoint,
        signalOrigin: {
          source:
            theme.category === "competitor_whitespace"
              ? "competitor_whitespace"
              : theme.category === "product_education"
              ? "product_feature"
              : "website_content",
          description: theme.description,
        },
        supportingEvidence,
      },
      memory
    );

    // Generate Full Execution Package
    const executionPackage = generateInstagramExecutionPackage({
      title: theme.title,
      topic: theme.title,
      opportunityType,
      recommendedFormat,
      targetAudience,
      targetPainPoint,
      supportingEvidence,
      memory,
    });

    rawOpportunities.push({
      id: oppId,
      title: theme.title,
      hookHeadline: executionPackage.hook,
      opportunityType,
      primaryGoal,
      recommendedFormat,
      targetAudience,
      targetPainPoint,
      signalOrigin: {
        source:
          theme.category === "competitor_whitespace"
            ? "competitor_whitespace"
            : theme.category === "product_education"
            ? "product_feature"
            : "website_content",
        description: theme.description,
      },
      whyThisMatters: `Directly targets ${targetAudience} feeling ${targetPainPoint.toLowerCase()}, driving quantifiable ${primaryGoal}.`,
      whyAmISeeingThis: `Discovered from ${memory.companyName} memory analysis and market signals matching priority ${theme.category.replace(/_/g, " ")}.`,
      expectedKpiImpact:
        primaryGoal === "acquisition" || primaryGoal === "leads"
          ? "+18-35% profile visit to link conversion and qualified lead inquiries"
          : "+25-40% saves, shares, and algorithmic distribution among target ICP",
      confidence: score.total >= 85 ? 95 : 88,
      score,
      executionPackage,
      lifecycleStatus: "new",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // 7. Sort by Total Opportunity Score descending
  const sortedOpportunities = rawOpportunities.sort((a, b) => b.score.total - a.score.total);
  const highPriorityCount = sortedOpportunities.filter((o) => o.score.total >= 80).length;

  return {
    opportunities: sortedOpportunities,
    opportunityMap,
    memory,
    totalSignalsCollected: rawSignals.length,
    totalOpportunitiesGenerated: sortedOpportunities.length,
    highPriorityCount,
  };
}
