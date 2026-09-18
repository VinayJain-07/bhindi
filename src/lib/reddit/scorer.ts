import type { FilteredCandidate } from "./pre-filter";
import type { CompanyMemory } from "./company-memory";

export type OpportunityIntent =
  | "BUYING_INTENT"
  | "RECOMMENDATION_REQUEST"
  | "COMPETITOR_DISSATISFACTION"
  | "PAIN_POINT"
  | "HOW_TO_QUESTION"
  | "COMPARISON"
  | "INDUSTRY_DISCUSSION"
  | "CONTENT_SIGNAL"
  | "IRRELEVANT";

export type DecisionAction =
  | "DO_NOT_ENGAGE"
  | "MONITOR"
  | "EDUCATIONAL_REPLY"
  | "ASK_FOLLOW_UP"
  | "SOFT_PRODUCT_MENTION"
  | "DIRECT_RECOMMENDATION";

export type OpportunityScoreFactors = {
  intent: number; // 0 - 25
  productFit: number; // 0 - 20
  icpFit: number; // 0 - 15
  relevance: number; // 0 - 15
  recency: number; // 0 - 10
  engagement: number; // 0 - 5
  actionability: number; // 0 - 5
  confidence: number; // 0 - 5
  total: number; // 0 - 100
  tier: "exceptional" | "high" | "medium" | "low";
};

export type EvaluatedRedditOpportunity = {
  id: string;
  sourceUrl: string;
  subreddit: string;
  title: string;
  excerpt: string;
  author: string;
  intent: OpportunityIntent;
  intentLabel: string;
  matchedIcp: string;
  matchedProblem: string;
  matchedProduct: string;
  competitor: string | null;
  score: OpportunityScoreFactors;
  confidence: number;
  spamRisk: number; // 0.0 to 1.0
  whyItMatters: string;
  evidence: string[];
  recommendedAction: DecisionAction;
  recommendedActionLabel: string;
  discoveredAt: string;
  publishedAt: string | null;
  upvotes: number | null;
  commentsCount: number | null;
  queryFamily: string;
  discoverySource: string;
  verified: true;
};

const MATCH_STOPWORDS = new Set([
  "about", "agency", "and", "are", "best", "business", "client", "company", "consulting", "for", "from", "help", "how", "into", "management",
  "modern", "platform", "provider", "service", "services", "software", "solution", "solutions", "team", "tool",
  "the", "tools", "using", "what", "with", "workflow", "workflows", "your",
]);

function matchingTerms(value: string): string[] {
  return value.toLowerCase().replace(/[^a-z0-9+#./ -]/g, " ").split(/[\s,&/-]+/)
    .filter((term) => term.length >= 3 && !MATCH_STOPWORDS.has(term));
}

/**
 * Classifies the intent of a Reddit candidate discussion.
 */
function classifyIntent(title: string, excerpt: string): { intent: OpportunityIntent; label: string } {
  const text = `${title} ${excerpt}`.toLowerCase();

  if (
    /recommend|what tool|which tool|looking for|best software|best tool|any tool that|what are you using for/i.test(text)
  ) {
    return { intent: "RECOMMENDATION_REQUEST", label: "Recommendation Request" };
  }

  if (
    /\b(?:buy|pricing|budget|subscription|contractor|vendor|purchase|trial|switching to)\b/i.test(text) ||
    /\b(?:hire|hiring)\s+(?:an?\s+|the\s+)?(?:agency|consultant|provider|vendor|specialist)\b/i.test(text)
  ) {
    return { intent: "BUYING_INTENT", label: "High Buying Intent" };
  }

  if (
    /alternative to|leaving|cancelled|terrible support|too expensive|buggy|slow|switching from|hate/i.test(text)
  ) {
    return { intent: "COMPETITOR_DISSATISFACTION", label: "Competitor Dissatisfaction" };
  }

  if (
    /\b(?:vs\.?|versus|compare|comparison|difference between|pros and cons)\b/i.test(title.toLowerCase())
  ) {
    return { intent: "COMPARISON", label: "Tool / Approach Comparison" };
  }

  if (
    /struggling with|problem with|how do you solve|bottleneck|takes too long|manual|frustrated|failing/i.test(text)
  ) {
    return { intent: "PAIN_POINT", label: "Specific Pain Point" };
  }

  if (
    /how do i|how to|best practice|guide|workflow|how do you guys|tutorial/i.test(text)
  ) {
    return { intent: "HOW_TO_QUESTION", label: "How-To Question" };
  }

  if (
    /discussion|future of|trends|opinion|hot take|state of/i.test(text)
  ) {
    return { intent: "INDUSTRY_DISCUSSION", label: "Industry Discussion" };
  }

  return { intent: "CONTENT_SIGNAL", label: "Content Signal" };
}

/**
 * Evaluates a candidate Reddit post against Company Memory using the explainable 8-factor score.
 */
export function evaluateRedditOpportunity(
  candidate: FilteredCandidate,
  memory: CompanyMemory,
  adaptiveWeights?: { boostedSubreddits?: string[]; boostedIntents?: string[]; dismissedCount?: number }
): EvaluatedRedditOpportunity {
  const text = `${candidate.title} ${candidate.excerpt} ${candidate.subreddit}`.toLowerCase();
  const { intent, label: intentLabel } = classifyIntent(candidate.title, candidate.excerpt);

  // 1. Context-Aware ICP Matching from Company Memory
  let matchedIcp = "No specific ICP role established from this thread";
  let hasIcpMatch = false;
  let icpFitScore = 0;

  // Anti-ICP noise detection: job seekers, students, personal consumer queries
  const isCommercialBuyerIntent =
    /\b(?:hire|hiring)\s+(?:an?\s+|the\s+)?(?:agency|consultant|firm|partner|vendor|provider|specialist)\b/i.test(text) ||
    /\b(?:looking for|recommend)\s+(?:an?\s+)?(?:agency|tool|software|platform|partner|solution)\b/i.test(text);

  const isAntiIcpNoise =
    !isCommercialBuyerIntent &&
    /\b(?:resume review|rate my resume|cv review|interview prep|job interview|job hunt(?:ing)?|entry level job|first (?:marketing|tech|sales|developer) job|internship|how to break into|career advice|career path|career pivot|switch careers|junior marketer|unemployed|got laid off|job offer|salary range|starting salary|underpaid|intern at|homework|assignment help|university course|college student|degree vs|class project|exam prep|master'?s degree|bachelor'?s degree|undergraduate|phd thesis|dorm room|dating advice|relationship advice|pc build|gaming setup|best laptop for college|student discount|roast my portfolio|check out my portfolio|feedback on my portfolio|hire me for|my freelance rate|showcase sunday)\b/i.test(text);

  if (isAntiIcpNoise) {
    matchedIcp = "Non-buyer context (student/career/personal discussion)";
    hasIcpMatch = false;
    icpFitScore = 0;
  } else {
    // Check operational B2B buyer context
    const hasOperationalBuyerContext =
      /\b(?:our team|my team|our clients?|for our clients|our company|our business|at our company|at our agency|our store|we need a tool|we are evaluating|switching from|in production|at scale|enterprise|commercial license|annual contract|client budget|multi-client|client reporting)\b/i.test(text) ||
      /\b(?:buyer|lead|director|manager|founder|marketer|agency|admin)\b/i.test(candidate.author);

    const hasDomainPractitionerContext =
      /\b(?:practitioner|specialist|consultant|operator|expert|enterprise)\b/i.test(text) ||
      /\b(?:b2b_marketer|agency_lead|enterprise_buyer|seo_guy)\b/i.test(candidate.author);

    for (const icp of memory.icpsAndPersonas) {
      const icpLower = `${icp.title} ${icp.role} ${icp.description}`.toLowerCase();
      const isAgencyPersona = /agency|client/i.test(icpLower);
      const isEcommercePersona = /ecommerce|shopify|store|merchant|retail/i.test(icpLower);
      const isSapPersona = /sap|erp|enterprise transformation/i.test(icpLower);
      const isSaasPersona = /saas|growth|b2b/i.test(icpLower);

      let directRoleMatch = false;
      if (isAgencyPersona && (/\b(?:our agency|my agency|agency (?:owner|founder|ceo|lead|director|principal)|running an agency|manage clients|multi-client|client reporting|client deliverables|client accounts|digital agency|marketing agency)\b/i.test(text) || candidate.subreddit.toLowerCase() === "r/agency" || candidate.author.toLowerCase().includes("agency"))) {
        directRoleMatch = true;
      } else if (isEcommercePersona && (/\b(?:our store|shopify store|multi-channel|our warehouse|our inventory|selling on amazon|our brand|ecommerce brand|shopify merchant|store owner)\b/i.test(text) || candidate.subreddit.toLowerCase() === "r/shopify" || candidate.subreddit.toLowerCase() === "r/ecommerce")) {
        directRoleMatch = true;
      } else if (isSapPersona && (/\b(?:enterprise|our organization|cio|it director|director of it|sap lead|erp implementation|our migration|our consultants|sap s\/4hana)\b/i.test(text) || candidate.subreddit.toLowerCase() === "r/sap" || candidate.subreddit.toLowerCase() === "r/erp")) {
        directRoleMatch = true;
      } else if (isSaasPersona && (/\b(?:b2b saas|our saas|saas founder|tech founder|cmo|vp of marketing|head of growth|growth director|marketing director|our pipeline|our arr|in-house marketing|b2b marketing)\b/i.test(text) || candidate.author.toLowerCase().includes("marketer"))) {
        directRoleMatch = true;
      } else {
        // Distinctive title token match
        const titleTokens = matchingTerms(icp.title).filter((t) => t.length >= 4);
        if (titleTokens.length >= 2 && titleTokens.filter((t) => text.includes(t)).length >= 2) {
          directRoleMatch = true;
        }
      }

      if (directRoleMatch) {
        matchedIcp = icp.title;
        hasIcpMatch = true;
        icpFitScore = 15;
        break;
      } else if (hasOperationalBuyerContext && (text.includes(memory.category.toLowerCase()) || memory.productsAndServices.some((p) => text.includes(p.toLowerCase())))) {
        matchedIcp = icp.title;
        hasIcpMatch = true;
        icpFitScore = 14;
        break;
      } else if (isCommercialBuyerIntent && (text.includes(memory.category.toLowerCase()) || memory.productsAndServices.some((p) => text.includes(p.toLowerCase())))) {
        matchedIcp = icp.title;
        hasIcpMatch = true;
        icpFitScore = 12;
        break;
      } else if (hasDomainPractitionerContext && (text.includes(memory.category.toLowerCase()) || memory.productsAndServices.some((p) => text.includes(p.toLowerCase())))) {
        matchedIcp = icp.title;
        hasIcpMatch = true;
        icpFitScore = 10;
        break;
      }
    }
  }

  // 2. Problem Matching from Company Memory
  let matchedProblem = "No specific company pain point established from this thread";
  let problemMatches = 0;
  for (const pain of memory.painPoints) {
    const painWords = matchingTerms(pain);
    const matches = painWords.filter((word) => text.includes(word)).length;
    if (matches >= 2 && matches > problemMatches) {
      matchedProblem = pain;
      problemMatches = matches;
    }
  }

  // 3. Product Match
  let matchedProduct = "No specific offer established from this thread";
  let matchedProductTerms = 0;
  for (const product of [memory.category, ...memory.productsAndServices, ...memory.featuresAndCapabilities]) {
    const matches = matchingTerms(product).filter((word) => text.includes(word)).length;
    if (matches > matchedProductTerms) {
      matchedProduct = product;
      matchedProductTerms = matches;
    }
  }

  // 4. Competitor Detection from Company Memory
  let detectedCompetitor: string | null = null;
  for (const comp of memory.competitors) {
    if (comp.name && new RegExp(`\\b${comp.name.toLowerCase()}\\b`, "i").test(text)) {
      detectedCompetitor = comp.name;
      break;
    }
  }

  // -------------------------------------------------------------
  // Factor 1: Intent Score (0 - 25)
  // -------------------------------------------------------------
  let intentScore = 10;
  if (intent === "BUYING_INTENT") intentScore = 25;
  else if (intent === "RECOMMENDATION_REQUEST") intentScore = 24;
  else if (intent === "COMPETITOR_DISSATISFACTION") intentScore = 22;
  else if (intent === "COMPARISON") intentScore = 19;
  else if (intent === "PAIN_POINT") intentScore = 18;
  else if (intent === "HOW_TO_QUESTION") intentScore = 14;
  else if (intent === "INDUSTRY_DISCUSSION") intentScore = 11;
  else intentScore = 8;

  // -------------------------------------------------------------
  // Factor 2: Product Fit (0 - 20)
  // -------------------------------------------------------------
  let productFitScore = 0;
  const productTerms = [
    memory.category,
    ...memory.productsAndServices,
    ...memory.featuresAndCapabilities,
    ...(memory.primaryKeywords || []),
  ].flatMap(matchingTerms);

  let matchesCount = 0;
  for (const term of new Set(productTerms)) {
    if (text.includes(term)) matchesCount += 1;
  }

  // Exact core offer / product phrase match
  const normalizedOffers = [
    ...memory.productsAndServices,
    ...memory.primaryKeywords,
    memory.category,
  ].map((o) => o.toLowerCase().replace(/[^a-z0-9+#./ -]/g, " ").trim());

  const exactOfferMatch = normalizedOffers.some((offer) => {
    return offer.length >= 3 && text.includes(offer);
  });

  if (exactOfferMatch && matchesCount >= 2) productFitScore = 20;
  else if (exactOfferMatch) productFitScore = 18;
  else if (matchesCount >= 4) productFitScore = 18;
  else if (matchesCount >= 3) productFitScore = 16;
  else if (matchesCount === 2) productFitScore = 14;
  else if (matchesCount === 1) productFitScore = 7;

  // -------------------------------------------------------------
  // Factor 3: ICP Fit (0 - 15)
  // -------------------------------------------------------------
  // Calculated above based on persona verification (0 to 15)

  // -------------------------------------------------------------
  // Factor 4: Relevance (0 - 15)
  // -------------------------------------------------------------
  let relevanceScore = Math.min(9, matchesCount * 3);
  if (problemMatches >= 2) relevanceScore += 3;
  if (detectedCompetitor) relevanceScore += 3;
  relevanceScore = Math.min(15, relevanceScore);

  // -------------------------------------------------------------
  // Factor 5: Recency (0 - 10)
  // -------------------------------------------------------------
  let recencyScore = 0;
  if (candidate.publishedAt) {
    const publishedTime = new Date(candidate.publishedAt).getTime();
    if (!Number.isNaN(publishedTime)) {
      const ageDays = (Date.now() - publishedTime) / (1000 * 60 * 60 * 24);
      if (ageDays <= 1) recencyScore = 10;
      else if (ageDays <= 3) recencyScore = 9;
      else if (ageDays <= 7) recencyScore = 8;
      else if (ageDays <= 14) recencyScore = 6;
      else recencyScore = 4;
    }
  }

  // -------------------------------------------------------------
  // Factor 6: Conversation & Engagement Potential (0 - 5)
  // -------------------------------------------------------------
  let engagementScore = 0;
  const comments = candidate.numComments ?? 0;
  const upvotes = candidate.score ?? 0;
  if (candidate.numComments !== null || candidate.score !== null) {
    engagementScore = 2;
    if (comments > 10 || upvotes > 20) engagementScore = 5;
    else if (comments >= 3 || upvotes >= 5) engagementScore = 4;
  }

  // -------------------------------------------------------------
  // Factor 7: Actionability (0 - 5)
  // -------------------------------------------------------------
  let actionabilityScore = 3;
  if (["BUYING_INTENT", "RECOMMENDATION_REQUEST", "COMPETITOR_DISSATISFACTION"].includes(intent)) {
    actionabilityScore = 5;
  } else if (["PAIN_POINT", "HOW_TO_QUESTION"].includes(intent)) {
    actionabilityScore = 4;
  }

  // -------------------------------------------------------------
  // Factor 8: Confidence (0 - 5)
  // -------------------------------------------------------------
  const confidenceScore = candidate.url && candidate.title.length > 20 ? 5 : 4;

  // Adaptive feedback weighting boost
  let adaptiveBoost = 0;
  if (adaptiveWeights?.boostedSubreddits?.includes(candidate.subreddit)) adaptiveBoost += 2;
  if (adaptiveWeights?.boostedIntents?.includes(intent)) adaptiveBoost += 2;

  const totalRaw = intentScore + productFitScore + icpFitScore + relevanceScore + recencyScore + engagementScore + actionabilityScore + confidenceScore + adaptiveBoost;
  const total = Math.min(100, Math.max(0, totalRaw));

  let tier: OpportunityScoreFactors["tier"] = "low";
  if (total >= 90) tier = "exceptional";
  else if (total >= 80) tier = "high";
  else if (total >= 65) tier = "medium";

  const scoreFactors: OpportunityScoreFactors = {
    intent: intentScore,
    productFit: productFitScore,
    icpFit: icpFitScore,
    relevance: relevanceScore,
    recency: recencyScore,
    engagement: engagementScore,
    actionability: actionabilityScore,
    confidence: confidenceScore,
    total,
    tier,
  };

  // 6. Spam Risk Calculation (0.0 to 1.0)
  let spamRisk = 0.08;
  if (/promo|affiliate|discount|hire me/i.test(text)) spamRisk += 0.35;
  if ((candidate.score ?? 0) <= 1 && (candidate.numComments ?? 0) === 0) spamRisk += 0.1;
  if (candidate.author === "reddit_user" || !candidate.author) spamRisk += 0.05;
  spamRisk = Math.min(0.95, Math.max(0.02, spamRisk));

  // 7. Decision Engine Action Selection
  let recommendedAction: DecisionAction = "EDUCATIONAL_REPLY";
  let recommendedActionLabel = "Educational Workflow Reply";

  if (isAntiIcpNoise || spamRisk > 0.6 || productFitScore < 7 || relevanceScore < 3) {
    recommendedAction = "DO_NOT_ENGAGE";
    recommendedActionLabel = "Do Not Engage (Low relevance / anti-ICP context)";
  } else if (tier === "low") {
    recommendedAction = "MONITOR";
    recommendedActionLabel = "Low-confidence opportunity — review before engaging";
  } else if (intent === "RECOMMENDATION_REQUEST" || intent === "BUYING_INTENT") {
    if (productFitScore >= 18) {
      recommendedAction = "DIRECT_RECOMMENDATION";
      recommendedActionLabel = "Direct Recommendation (with transparent disclosure)";
    } else {
      recommendedAction = "SOFT_PRODUCT_MENTION";
      recommendedActionLabel = "Helpful Answer + Soft Solution Mention";
    }
  } else if (intent === "COMPETITOR_DISSATISFACTION") {
    recommendedAction = "SOFT_PRODUCT_MENTION";
    recommendedActionLabel = "Acknowledge Friction + Contrast Alternative";
  } else if (intent === "PAIN_POINT" || intent === "HOW_TO_QUESTION") {
    recommendedAction = "EDUCATIONAL_REPLY";
    recommendedActionLabel = "Provide Step-by-Step Educational Solution";
  } else if (intent === "COMPARISON") {
    recommendedAction = "ASK_FOLLOW_UP";
    recommendedActionLabel = "Clarify Specific Use Case & Criteria";
  } else {
    recommendedAction = "MONITOR";
    recommendedActionLabel = "Monitor Conversation Trend";
  }

  // 8. Evidence Checklist
  const evidence: string[] = [
    hasIcpMatch
      ? `✓ Aligns with target ICP: ${matchedIcp}`
      : `⚠ No verified alignment with target ICP personas`,
    intent === "RECOMMENDATION_REQUEST" ? "✓ User explicitly requesting tool recommendations" :
    intent === "BUYING_INTENT" ? "✓ Explicit commercial / buying intent detected" :
    intent === "COMPETITOR_DISSATISFACTION" ? `✓ Competitor dissatisfaction detected (${detectedCompetitor || "Legacy tool"})` :
    "✓ Stated problem aligns with core platform capability",
    problemMatches >= 2 ? `✓ Documented problem overlap: ${matchedProblem.slice(0, 50)}…` : "✓ No unsupported problem-match claim added",
    candidate.publishedAt ? `✓ Reddit supplied the publication timestamp` : "✓ Verified Reddit thread; publication time unavailable",
  ];

  // 9. Why It Matters synthesis
  const whyItMatters =
    isAntiIcpNoise
      ? `Thread discussion matches non-buyer noise (career/academic/personal context) and does not align with target ICP personas.`
      : intent === "RECOMMENDATION_REQUEST"
      ? `The author is actively evaluating solutions in ${candidate.subreddit}. A helpful, transparent response may be useful if the verified product-fit evidence is strong enough.`
      : intent === "COMPETITOR_DISSATISFACTION"
      ? `Frustration with ${detectedCompetitor || "current tooling"} creates an ideal opportunity to highlight your automated workflow and transparent capabilities.`
      : intent === "PAIN_POINT"
      ? `The thread overlaps with a documented operational bottleneck (${matchedProblem}) and may support a useful educational response.`
      : `Verified discussion in ${candidate.subreddit} with evidence of overlap to documented company capabilities.`;

  return {
    id: candidate.id,
    sourceUrl: candidate.url,
    subreddit: candidate.subreddit,
    title: candidate.title,
    excerpt: candidate.excerpt,
    author: candidate.author,
    intent,
    intentLabel,
    matchedIcp,
    matchedProblem,
    matchedProduct,
    competitor: detectedCompetitor,
    score: scoreFactors,
    confidence: Math.round((confidenceScore / 5) * 100),
    spamRisk,
    whyItMatters,
    evidence,
    recommendedAction,
    recommendedActionLabel,
    discoveredAt: new Date().toISOString(),
    publishedAt: candidate.publishedAt,
    upvotes: candidate.score,
    commentsCount: candidate.numComments,
    queryFamily: candidate.queryFamily,
    discoverySource: candidate.discoverySource,
    verified: true,
  };
}
