import type { EvaluatedRedditOpportunity } from "./scorer";

export function isVerifiedRedditOpportunityIdentity(
  opportunity: Pick<EvaluatedRedditOpportunity, "id" | "sourceUrl" | "verified">,
): boolean {
  try {
    if (!opportunity.verified) return false;
    const url = new URL(opportunity.sourceUrl);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    const postId = url.pathname.match(/\/comments\/([a-z0-9]{5,10})(?:\/|$)/i)?.[1]?.toLowerCase();
    return host === "reddit.com" && Boolean(postId) && postId === opportunity.id.toLowerCase();
  } catch {
    return false;
  }
}

export function qualifyRedditOpportunities(opportunities: EvaluatedRedditOpportunity[]): EvaluatedRedditOpportunity[] {
  return opportunities
    .filter((opportunity) =>
      isVerifiedRedditOpportunityIdentity(opportunity) &&
      opportunity.score.total >= 50 &&
      opportunity.score.productFit >= 7 &&
      opportunity.score.icpFit >= 7 &&
      opportunity.score.relevance >= 3 &&
      opportunity.recommendedAction !== "DO_NOT_ENGAGE" &&
      opportunity.intent !== "IRRELEVANT" &&
      opportunity.matchedIcp !== "No specific ICP role established from this thread" &&
      !opportunity.matchedIcp.startsWith("Non-buyer")
    )
    .sort((left, right) => right.score.total - left.score.total)
    .slice(0, 20);
}
