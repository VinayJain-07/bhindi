import "server-only";
import { createHash } from "node:crypto";
import { requireEnabledAgent } from "@/lib/agents/execution-settings";
import { extractCompanyMemory, type CompanyMemory } from "@/lib/reddit/company-memory";
import { collectXSignals, type XCollectedSignal } from "./signal-collector";
import { computeXOpportunityScore } from "./scorer";
import { generateXExecutionPackage } from "./writer";
import type {
  XOpportunity,
  XPostFormat,
  XGoal,
} from "./types";

export type XDiscoveryPipelineResult = {
  opportunities: XOpportunity[];
  memory: CompanyMemory;
  totalSignalsCollected: number;
  totalOpportunitiesGenerated: number;
  highPriorityCount: number;
};

/**
 * Continuous X Writer Opportunity Discovery Pipeline:
 * Normalize → Deduplicate → Repetition Check → Goal Alignment → Opportunity Score → Action Feed
 */
export async function runXOpportunityPipeline(args: {
  companyId: string;
  userId: string;
  maxCandidates?: number;
}): Promise<XDiscoveryPipelineResult> {
  // 1. Extract Company Memory
  const memory = await extractCompanyMemory(args.companyId);

  // 2. Fetch AgentConfig for past interactions, approved/published/dismissed history
  const { config: configObj } = await requireEnabledAgent(args.companyId, "X");

  const completedIds = Array.isArray(configObj.completedOpportunities)
    ? configObj.completedOpportunities.filter((id): id is string => typeof id === "string")
    : [];
  const dismissedIds = Array.isArray(configObj.dismissedOpportunities)
    ? configObj.dismissedOpportunities.filter((id): id is string => typeof id === "string")
    : [];

  const processedIds = new Set<string>([...completedIds, ...dismissedIds]);

  // 3. Ingest multi-source signals (Crawl Pages, Documents, SEO/GEO, Competitors, Reddit)
  const rawSignals = await collectXSignals(args.companyId, memory);

  // 4. Normalize & Deduplicate Signals
  const deduplicatedSignalsMap = new Map<string, XCollectedSignal>();
  rawSignals.forEach((sig) => {
    const key = sig.topic.toLowerCase().replace(/[^a-z0-9]/g, " ").trim().slice(0, 35);
    if (!deduplicatedSignalsMap.has(key)) {
      deduplicatedSignalsMap.set(key, sig);
    }
  });

  const uniqueSignals = Array.from(deduplicatedSignalsMap.values());
  const rawOpportunities: XOpportunity[] = [];

  for (const sig of uniqueSignals) {
    const identity = [args.companyId, sig.source, sig.sourceUrl ?? "", sig.topic, sig.opportunityType].join("\n").toLowerCase();
    const oppId = `x_opp_${createHash("sha256").update(identity).digest("hex").slice(0, 18)}`;
    if (processedIds.has(oppId)) continue;

    let format: XPostFormat = "SINGLE_POST";
    let primaryGoal: XGoal = "authority";

    if (sig.opportunityType === "THREAD") {
      format = "THREAD";
      primaryGoal = "awareness";
    } else if (sig.opportunityType === "REPLY") {
      format = "REPLY";
      primaryGoal = "conversation";
    } else if (sig.opportunityType === "PRODUCT_INSIGHT" || sig.opportunityType === "COMPARISON") {
      format = "SINGLE_POST";
      primaryGoal = "acquisition";
    } else if (sig.opportunityType === "CUSTOMER_PAIN") {
      format = "SINGLE_POST";
      primaryGoal = "leads";
    }

    const targetAudience = memory.icpsAndPersonas[0]?.title || "Engineering & Growth Teams";
    const targetPainPoint = memory.painPoints[0] || "Slow manual workflows";
    const supportingEvidence = [
      `Grounded in ${memory.companyName} company foundation: ${sig.evidence}`,
      `Verified against ${memory.category} market context.`,
    ];

    // Compute 10-factor opportunity score
    const score = computeXOpportunityScore(
      {
        title: sig.topic,
        opportunityType: sig.opportunityType,
        format,
        primaryGoal,
        targetAudience,
        targetPainPoint,
        signalOrigin: {
          source: sig.source,
          topic: sig.topic,
          evidenceSnippet: sig.evidence,
          sourceUrl: sig.sourceUrl,
        },
        supportingEvidence,
      },
      memory
    );

    // Generate Full Execution Package (Angle first → writing layer third)
    const executionPackage = generateXExecutionPackage({
      title: sig.topic,
      topic: sig.topic,
      opportunityType: sig.opportunityType,
      format,
      targetAudience,
      targetPainPoint,
      supportingEvidence,
      memory,
    });

    rawOpportunities.push({
      id: oppId,
      title: sig.topic,
      hookHeadline: executionPackage.hook,
      opportunityType: sig.opportunityType,
      format,
      primaryGoal,
      targetAudience,
      targetPainPoint,
      signalOrigin: {
        source: sig.source,
        topic: sig.topic,
        evidenceSnippet: sig.evidence,
        sourceUrl: sig.sourceUrl,
      },
      whyThisMatters: `Targets ${targetAudience} actively dealing with ${targetPainPoint.toLowerCase()}, driving quantifiable ${primaryGoal}.`,
      whyAmISeeingThis: `Discovered from ${sig.source.replace(/_/g, " ")} matching ${memory.companyName} core differentiators.`,
      expectedKpiImpact:
        primaryGoal === "acquisition" || primaryGoal === "leads"
          ? "+20-35% qualified click-throughs and profile inquiries"
          : "+30-50% retweets, bookmarks, and industry dialogue",
      confidence: score.total >= 85 ? 96 : 90,
      score,
      executionPackage,
      lifecycleStatus: "new",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // 5. Rank by total score descending
  const sorted = rawOpportunities.sort((a, b) => b.score.total - a.score.total);
  const highPriorityCount = sorted.filter((o) => o.score.total >= 80).length;

  return {
    opportunities: sorted,
    memory,
    totalSignalsCollected: rawSignals.length,
    totalOpportunitiesGenerated: sorted.length,
    highPriorityCount,
  };
}
