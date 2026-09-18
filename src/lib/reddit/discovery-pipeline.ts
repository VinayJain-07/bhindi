import "server-only";
import { extractCompanyMemory, type CompanyMemory } from "./company-memory";
import { generateRedditSearchMap, type RedditOpportunitySearchMap } from "./search-map";
import { discoverRedditCandidates } from "./fetcher";
import { runDeterministicPreFilter } from "./pre-filter";
import { evaluateRedditOpportunity, type EvaluatedRedditOpportunity } from "./scorer";
import { generateRedditReplyVariants } from "./writer";
import type { RedditActionFeedOpportunity } from "../signals/store";
import { qualifyRedditOpportunities } from "./qualifier";
import { requireEnabledAgent } from "@/lib/agents/execution-settings";

export type RedditDiscoveryPipelineResult = {
  opportunities: RedditActionFeedOpportunity[];
  searchMap: RedditOpportunitySearchMap;
  memory: CompanyMemory;
  totalDiscovered: number;
  totalPassedPreFilter: number;
  totalQualified: number;
  trendSignals: Array<{ topic: string; frequency: number; sampleSubreddits: string[] }>;
};

/**
 * Runs the complete continuous Reddit high-intent opportunity discovery pipeline.
 */
export async function runRedditOpportunityPipeline(args: {
  companyId: string;
  userId: string;
  maxCandidates?: number;
}): Promise<RedditDiscoveryPipelineResult> {
  // 1. Extract Company Memory from foundation documents
  const memory = await extractCompanyMemory(args.companyId);

  // 2. Fetch AgentConfig to get user settings (custom subreddits, keywords, voice, processed history)
  const { config: configObj } = await requireEnabledAgent(args.companyId, "REDDIT");

  const customSubreddits = Array.isArray(configObj.customSubreddits)
    ? configObj.customSubreddits.filter((s): s is string => typeof s === "string")
    : [];
  const customKeywords = Array.isArray(configObj.customKeywords)
    ? configObj.customKeywords.filter((k): k is string => typeof k === "string")
    : [];
  const completedIds = Array.isArray(configObj.completedOpportunities)
    ? configObj.completedOpportunities.filter((id): id is string => typeof id === "string")
    : [];
  const dismissedIds = Array.isArray(configObj.dismissedOpportunities)
    ? configObj.dismissedOpportunities.filter((id): id is string => typeof id === "string")
    : [];

  const processedIds = new Set<string>([...completedIds, ...dismissedIds]);

  // 3. Generate Search Map across all 7 query families
  const searchMap = generateRedditSearchMap(memory, customSubreddits, customKeywords);

  // 4. Discover candidate public Reddit posts across queries
  // Select top high-priority queries to execute
  const queryLimit = args.maxCandidates ? Math.min(args.maxCandidates, 12) : 9;
  const activeQueries = Object.values(searchMap.queryFamilies)
    .flatMap((family) => family.filter((query) => query.priority === "high").slice(0, 1))
    .concat(searchMap.allQueries.filter((query) => query.priority === "high"))
    .filter((query, index, queries) => queries.findIndex((item) => item.id === query.id) === index)
    .slice(0, queryLimit);
  const rawCandidates = await discoverRedditCandidates(activeQueries, searchMap.prioritySubreddits);

  // 5. Run cheap deterministic pre-filter
  const filteredCandidates = runDeterministicPreFilter(rawCandidates, memory, processedIds);

  // 6. Reason, Classify, and Score each surviving candidate using 8-factor model
  const adaptiveWeights = {
    boostedSubreddits: searchMap.prioritySubreddits.slice(0, 4),
    boostedIntents: ["RECOMMENDATION_REQUEST", "BUYING_INTENT", "COMPETITOR_DISSATISFACTION", "PAIN_POINT"],
    dismissedCount: dismissedIds.length,
  };

  const evaluatedOpportunities: EvaluatedRedditOpportunity[] = filteredCandidates.map((candidate) =>
    evaluateRedditOpportunity(candidate, memory, adaptiveWeights)
  );

  // 7. Filter and Rank opportunities:
  // Tiers >= 65 (Medium, High, Exceptional). Suppress weak/irrelevant matches unless nothing else exists.
  const qualified = qualifyRedditOpportunities(evaluatedOpportunities);

  // 8. Generate 3 response variants for every qualified opportunity using the Reddit Writer skill
  const opportunities: RedditActionFeedOpportunity[] = qualified.map((opp) => {
    const replyVariants = generateRedditReplyVariants(opp, memory);
    return {
      ...opp,
      platform: "reddit",
      replyVariants,
      lifecycleStatus: "new",
    };
  });

  // 9. Cluster common pain points into cross-agent trend signals
  const painOccurrences = new Map<string, { count: number; subs: Set<string> }>();
  for (const opp of opportunities) {
    const key = opp.matchedProblem;
    const existing = painOccurrences.get(key) || { count: 0, subs: new Set<string>() };
    existing.count += 1;
    existing.subs.add(opp.subreddit);
    painOccurrences.set(key, existing);
  }

  const trendSignals = Array.from(painOccurrences.entries()).map(([topic, data]) => ({
    topic,
    frequency: data.count,
    sampleSubreddits: Array.from(data.subs),
  }));

  return {
    opportunities,
    searchMap,
    memory,
    totalDiscovered: rawCandidates.length,
    totalPassedPreFilter: filteredCandidates.length,
    totalQualified: opportunities.length,
    trendSignals,
  };
}
