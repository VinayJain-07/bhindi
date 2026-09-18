import { runRedditOpportunityPipeline } from "../src/lib/reddit/discovery-pipeline";

async function main() {
  const result = await runRedditOpportunityPipeline({
    companyId: "cmt9wjll90002lbhw3rkrr4nn",
    userId: "read-only-verification",
    maxCandidates: 9,
  });
  console.log(JSON.stringify({
    company: result.memory.companyName,
    category: result.memory.category,
    prioritySubreddits: result.searchMap.prioritySubreddits.slice(0, 6),
    totalDiscovered: result.totalDiscovered,
    totalPassedPreFilter: result.totalPassedPreFilter,
    totalQualified: result.totalQualified,
    opportunities: result.opportunities.map((opportunity) => ({
      title: opportunity.title,
      subreddit: opportunity.subreddit,
      url: opportunity.sourceUrl,
      publishedAt: opportunity.publishedAt,
      score: opportunity.score.total,
      tier: opportunity.score.tier,
      action: opportunity.recommendedAction,
      productFit: opportunity.score.productFit,
      relevance: opportunity.score.relevance,
      source: opportunity.discoverySource,
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
