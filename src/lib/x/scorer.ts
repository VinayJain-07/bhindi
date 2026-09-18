import type { XScoreBreakdown, XOpportunityType, XPostFormat, XGoal } from "./types";
import type { CompanyMemory } from "@/lib/reddit/company-memory";

export type RawXCandidate = {
  title: string;
  opportunityType: XOpportunityType;
  format: XPostFormat;
  primaryGoal: XGoal;
  targetAudience: string;
  targetPainPoint: string;
  signalOrigin: {
    source:
      | "seo_findings"
      | "geo_findings"
      | "competitor_analysis"
      | "product_feature"
      | "website_content"
      | "uploaded_source"
      | "reddit_conversation"
      | "audience_pain"
      | "content_gap"
      | "marketing_ideas";
    topic: string;
    evidenceSnippet: string;
    sourceUrl?: string;
  };
  supportingEvidence: string[];
  noveltyBoost?: number;
  recencyDays?: number;
  repetitionCount?: number;
};

/**
 * Computes the 10-factor opportunity score for X content opportunities.
 */
export function computeXOpportunityScore(
  candidate: RawXCandidate,
  memory: CompanyMemory
): XScoreBreakdown {
  // 1. ICP Relevance (0-15)
  let icpRelevance = 12;
  const icpText = memory.icpsAndPersonas.map((p) => `${p.title} ${p.role}`).join(" ").toLowerCase();
  const audLower = candidate.targetAudience.toLowerCase();
  if (icpText.includes(audLower) || memory.icpsAndPersonas.some((p) => audLower.includes(p.title.toLowerCase()))) {
    icpRelevance = 15;
  }

  // 2. Product Relevance (0-15)
  let productRelevance = 11;
  const prodText = [
    memory.companyName,
    memory.category,
    ...memory.productsAndServices,
    ...memory.featuresAndCapabilities,
    ...memory.differentiators,
  ].join(" ").toLowerCase();

  const searchTerms = `${candidate.title} ${candidate.signalOrigin.topic} ${candidate.targetPainPoint}`.toLowerCase();
  if (
    memory.productsAndServices.some((p) => searchTerms.includes(p.toLowerCase().slice(0, 10))) ||
    prodText.includes(candidate.title.toLowerCase().slice(0, 15)) ||
    candidate.opportunityType === "PRODUCT_INSIGHT" ||
    candidate.opportunityType === "CONTRARIAN_POV" ||
    candidate.opportunityType === "COMPARISON"
  ) {
    productRelevance = 15;
  } else if (candidate.opportunityType === "INSIGHT" || candidate.opportunityType === "EDUCATIONAL_POST") {
    productRelevance = 13;
  }

  // 3. Evidence Strength (0-15)
  let evidenceStrength = 10;
  if (candidate.supportingEvidence && candidate.supportingEvidence.length >= 2) {
    evidenceStrength = 15;
  } else if (candidate.signalOrigin.evidenceSnippet) {
    evidenceStrength = 13;
  }

  // 4. Novelty (0-10)
  const novelty = Math.min(10, Math.max(5, (candidate.noveltyBoost ?? 4) * 2));

  // 5. Conversation Potential (0-10)
  // Contrarian POVs, Timely Commentary, and Customer Pains generate high discussion on X
  let conversationPotential = 7;
  if (
    candidate.opportunityType === "CONTRARIAN_POV" ||
    candidate.opportunityType === "FOUNDER_POV" ||
    candidate.opportunityType === "COMPARISON"
  ) {
    conversationPotential = 10;
  } else if (candidate.opportunityType === "THREAD" || candidate.opportunityType === "CUSTOMER_PAIN") {
    conversationPotential = 9;
  }

  // 6. Brand Fit (0-10)
  let brandFit = 9;
  if (memory.brandVoice.tone) {
    brandFit = 10;
  }

  // 7. Goal Alignment (0-10)
  let goalAlignment = 8;
  if (candidate.primaryGoal === "acquisition" || candidate.primaryGoal === "authority") {
    goalAlignment = 10;
  } else if (candidate.primaryGoal === "leads" || candidate.primaryGoal === "conversation") {
    goalAlignment = 9;
  }

  // 8. Recency (0-5)
  let recency = 4;
  if (candidate.recencyDays !== undefined) {
    if (candidate.recencyDays <= 3) recency = 5;
    else if (candidate.recencyDays <= 14) recency = 4;
    else recency = 3;
  }

  // 9. Repetition Risk / Quality Check (0-5, where 5 = zero repetition risk)
  let repetitionRisk = 5;
  if (candidate.repetitionCount && candidate.repetitionCount > 0) {
    repetitionRisk = Math.max(1, 5 - candidate.repetitionCount * 2);
  }

  // 10. Confidence (0-5)
  let confidence = 4;
  if (evidenceStrength >= 13 && icpRelevance >= 13) confidence = 5;

  const total =
    icpRelevance +
    productRelevance +
    evidenceStrength +
    novelty +
    conversationPotential +
    brandFit +
    goalAlignment +
    recency +
    repetitionRisk +
    confidence;

  let tier: "exceptional" | "high" | "medium" | "low" = "medium";
  if (total >= 90) tier = "exceptional";
  else if (total >= 80) tier = "high";
  else if (total >= 65) tier = "medium";
  else tier = "low";

  return {
    icpRelevance,
    productRelevance,
    evidenceStrength,
    novelty,
    conversationPotential,
    brandFit,
    goalAlignment,
    recency,
    repetitionRisk,
    confidence,
    total,
    tier,
  };
}
