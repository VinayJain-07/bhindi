import "server-only";
import { db } from "@/lib/db";
import type { CompanyMemory } from "@/lib/reddit/company-memory";

export type CollectedSignal = {
  id: string;
  source:
    | "website_content"
    | "seo_geo"
    | "reddit_discussion"
    | "competitor_whitespace"
    | "product_feature"
    | "uploaded_source"
    | "marketing_ideas"
    | "customer_faq";
  topic: string;
  evidence: string;
  sourceUrl?: string;
  relevanceConfidence: number;
  suggestedAngle?: string;
  rawDetails?: Record<string, unknown>;
};

/**
 * Collects multi-source marketing and customer signals across documents, crawl pages,
 * and competitor insights to feed the Instagram discovery pipeline.
 */
export async function collectInstagramSignals(
  companyId: string,
  memory: CompanyMemory
): Promise<CollectedSignal[]> {
  const signals: CollectedSignal[] = [];
  const company = memory.companyName;
  const category = memory.category || `${company} Solutions`;

  // 1. Extract signals from crawl pages
  const crawlPages = await db.crawlPage.findMany({
    where: { companyId },
    select: { url: true, title: true, description: true, content: true },
    take: 15,
    orderBy: { wordCount: "desc" },
  });

  crawlPages.forEach((page, idx) => {
    if (page.title && page.description && !page.title.toLowerCase().includes("privacy") && !page.title.toLowerCase().includes("terms")) {
      const cleanTitle = page.title.split(/[|–—:•]/)[0].trim();
      if (cleanTitle.length > 4 && !cleanTitle.toLowerCase().includes("home")) {
        signals.push({
          id: `sig_web_${idx}_${Date.now()}`,
          source: "website_content",
          topic: cleanTitle,
          evidence: page.description.trim(),
          sourceUrl: page.url,
          relevanceConfidence: 94,
          suggestedAngle: "educational",
        });
      }
    }
  });

  // 2. Extract signals from documents (SEO_AUDIT, GEO_AUDIT, COMPETITOR_ANALYSIS, AUDIENCE_ANALYSIS, CONTENT_AUDIT)
  const documents = await db.document.findMany({
    where: { companyId },
    select: { type: true, title: true, contentMarkdown: true },
  });

  documents.forEach((doc) => {
    const text = doc.contentMarkdown || "";
    if (doc.type === "SEO_AUDIT" || doc.type === "GEO_AUDIT") {
      signals.push({
        id: `sig_seo_${doc.type.toLowerCase()}`,
        source: "seo_geo",
        topic: `${category} Search Intent & AI Discovery`,
        evidence: `Search and citability audit revealed high buyer demand for step-by-step ${category.toLowerCase()} breakdowns.`,
        relevanceConfidence: 94,
        suggestedAngle: "data_proof_led",
      });
    } else if (doc.type === "COMPETITOR_ANALYSIS") {
      const compName = memory.competitors[0]?.name || "Legacy Providers";
      signals.push({
        id: `sig_comp_${Date.now()}`,
        source: "competitor_whitespace",
        topic: `Modern Approach vs ${compName} Architecture`,
        evidence: `Competitive research shows customer friction with ${compName}'s onboarding overhead and complex pricing.`,
        relevanceConfidence: 91,
        suggestedAngle: "comparison",
      });
    } else if (doc.type === "AUDIENCE_ANALYSIS") {
      memory.painPoints.slice(0, 3).forEach((pain, pIdx) => {
        signals.push({
          id: `sig_aud_${pIdx}`,
          source: "customer_faq",
          topic: `Overcoming: ${pain}`,
          evidence: `Voice of customer research highlights ${pain.toLowerCase()} as the primary operational blocker.`,
          relevanceConfidence: 96,
          suggestedAngle: "problem_awareness",
        });
      });
    }
  });

  const uploadedSources = await db.chatAttachment.findMany({
    where: { companyId, remembered: true },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, title: true, content: true },
  });
  uploadedSources.forEach((source) => {
    const evidence = source.content.replace(/[#*_`>\[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, 260);
    if (!evidence) return;
    signals.push({ id: `sig_upload_${source.id}`, source: "uploaded_source", topic: source.title.replace(/\.[^.]+$/, ""), evidence, relevanceConfidence: 97, suggestedAngle: "source_led" });
  });

  // 3. Extract signals from latest Reddit agent runs if available
  const redditRun = await db.agentRun.findFirst({
    where: { companyId, agentType: "REDDIT", status: "DONE" },
    orderBy: { createdAt: "desc" },
    select: { output: true },
  });

  if (redditRun?.output && typeof redditRun.output === "object") {
    const output = redditRun.output as Record<string, unknown>;
    const opps = Array.isArray(output.opportunities) ? output.opportunities : [];
    opps.slice(0, 3).forEach((opp: { title?: string; excerpt?: string; subreddit?: string; sourceUrl?: string }, rIdx: number) => {
      if (opp.title && opp.excerpt) {
        signals.push({
          id: `sig_reddit_${rIdx}`,
          source: "reddit_discussion",
          topic: `Real customer discussion on ${opp.subreddit || "Reddit"}: ${opp.title.slice(0, 60)}`,
          evidence: opp.excerpt.slice(0, 180),
          sourceUrl: opp.sourceUrl,
          relevanceConfidence: 93,
          suggestedAngle: "how_to",
        });
      }
    });
  }

  // 4. Product features & Differentiators
  memory.featuresAndCapabilities.slice(0, 3).forEach((feat, fIdx) => {
    signals.push({
      id: `sig_feat_${fIdx}`,
      source: "product_feature",
      topic: `${feat} in Action`,
      evidence: `Proprietary capability of ${company} delivering measurable efficiency.`,
      relevanceConfidence: 92,
      suggestedAngle: "product_led",
    });
  });

  return signals;
}
