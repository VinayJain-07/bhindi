import type { OpportunityScoreBreakdown, InstagramOpportunityType, InstagramFormat, InstagramGoal } from "./types";
import type { CompanyMemory } from "@/lib/reddit/company-memory";

export type RawScoringCandidate = {
  title: string;
  opportunityType: InstagramOpportunityType;
  primaryGoal: InstagramGoal;
  recommendedFormat: InstagramFormat;
  targetAudience: string;
  targetPainPoint: string;
  signalOrigin: {
    source: "website_content" | "seo_geo" | "reddit_discussion" | "competitor_whitespace" | "product_feature" | "uploaded_source" | "marketing_ideas" | "customer_faq";
    description: string;
    evidenceSnippet?: string;
    sourceUrl?: string;
  };
  supportingEvidence: string[];
  noveltyBoost?: number;
  recencyDays?: number;
};

/**
 * Computes the rigorous 11-factor opportunity score for Instagram opportunities.
 * Returns breakdown, total (0-100), and tier classification.
 */
export function computeInstagramOpportunityScore(
  candidate: RawScoringCandidate,
  memory: CompanyMemory
): OpportunityScoreBreakdown {
  // 1. Strategic / Goal Alignment (0 - 15)
  // Higher if matches primary commercial intent and ICP target
  let strategicGoalAlignment = 12;
  if (candidate.primaryGoal === "acquisition" || candidate.primaryGoal === "leads") {
    strategicGoalAlignment = 14;
  } else if (candidate.primaryGoal === "authority" || candidate.primaryGoal === "awareness") {
    strategicGoalAlignment = 13;
  }

  // 2. ICP Relevance (0 - 15)
  let icpRelevance = 11;
  const icpText = memory.icpsAndPersonas.map((p) => `${p.title} ${p.role} ${p.description}`).join(" ").toLowerCase();
  const candidateAudience = candidate.targetAudience.toLowerCase();
  if (memory.icpsAndPersonas.some((p) => candidateAudience.includes(p.title.toLowerCase()) || candidateAudience.includes(p.role.toLowerCase()))) {
    icpRelevance = 15;
  } else if (icpText.includes(candidateAudience) || candidateAudience.length > 5) {
    icpRelevance = 13;
  }

  // 3. Audience Pain Match (0 - 15)
  let audiencePainMatch = 12;
  const painLower = candidate.targetPainPoint.toLowerCase();
  if (memory.painPoints.some((p) => painLower.includes(p.toLowerCase().slice(0, 20)))) {
    audiencePainMatch = 15;
  } else if (candidate.signalOrigin.source === "customer_faq" || candidate.signalOrigin.source === "reddit_discussion") {
    audiencePainMatch = 14;
  }

  // 4. Product Fit (0 - 10)
  let productFit = 8;
  const prodText = memory.productsAndServices.concat(memory.featuresAndCapabilities).join(" ").toLowerCase();
  if (prodText.includes(candidate.title.toLowerCase().slice(0, 15))) {
    productFit = 10;
  } else if (candidate.opportunityType === "PRODUCT_EDUCATION" || candidate.opportunityType === "CASE_STUDY") {
    productFit = 9;
  }

  // 5. Evidence Strength (0 - 10)
  let evidenceStrength = 7;
  if (candidate.supportingEvidence && candidate.supportingEvidence.length >= 2) {
    evidenceStrength = 10;
  } else if (candidate.signalOrigin.evidenceSnippet || candidate.signalOrigin.sourceUrl) {
    evidenceStrength = 9;
  }

  // 6. Visual Potential (0 - 10)
  // Carousels and Reels have superior native visual engagement potential on Instagram
  let visualPotential = 8;
  if (candidate.recommendedFormat === "CAROUSEL") {
    visualPotential = 10;
  } else if (candidate.recommendedFormat === "REEL") {
    visualPotential = 9;
  } else if (candidate.recommendedFormat === "INFOGRAPHIC") {
    visualPotential = 9;
  }

  // 7. Engagement Potential (0 - 10)
  let engagementPotential = 8;
  if (
    candidate.opportunityType === "EDUCATIONAL_POST" ||
    candidate.opportunityType === "MYTH_VS_FACT" ||
    candidate.opportunityType === "COMPARISON" ||
    candidate.opportunityType === "CHECKLIST"
  ) {
    engagementPotential = 10;
  } else if (candidate.opportunityType === "FOUNDER_INSIGHT" || candidate.opportunityType === "TREND_ADAPTATION") {
    engagementPotential = 9;
  }

  // 8. Novelty (0 - 5)
  const novelty = Math.min(5, Math.max(2, candidate.noveltyBoost ?? 4));

  // 9. Recency (0 - 5)
  let recency = 4;
  if (candidate.recencyDays !== undefined) {
    if (candidate.recencyDays <= 3) recency = 5;
    else if (candidate.recencyDays <= 14) recency = 4;
    else recency = 3;
  }

  // 10. Effort (0 - 5, where 5 = streamlined execution / high leverage)
  let effort = 4;
  if (candidate.recommendedFormat === "STORY") effort = 5;
  if (candidate.recommendedFormat === "REEL") effort = 3;

  // 11. Confidence (0 - 5)
  let confidence = 4;
  if (evidenceStrength >= 9 && audiencePainMatch >= 13) confidence = 5;

  const total =
    strategicGoalAlignment +
    icpRelevance +
    audiencePainMatch +
    productFit +
    evidenceStrength +
    visualPotential +
    engagementPotential +
    novelty +
    recency +
    effort +
    confidence;

  let tier: "exceptional" | "high" | "medium" | "low" = "medium";
  if (total >= 90) tier = "exceptional";
  else if (total >= 80) tier = "high";
  else if (total >= 65) tier = "medium";
  else tier = "low";

  return {
    strategicGoalAlignment,
    icpRelevance,
    audiencePainMatch,
    productFit,
    evidenceStrength,
    visualPotential,
    engagementPotential,
    novelty,
    recency,
    effort,
    confidence,
    total,
    tier,
  };
}
