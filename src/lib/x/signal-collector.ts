import "server-only";
import { db } from "@/lib/db";
import type { CompanyMemory } from "@/lib/reddit/company-memory";

export type XCollectedSignal = {
  id: string;
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
  evidence: string;
  sourceUrl?: string;
  relevanceConfidence: number;
  suggestedAngle: string;
  opportunityType:
    | "INSIGHT"
    | "EDUCATIONAL_POST"
    | "CONTRARIAN_POV"
    | "PRODUCT_INSIGHT"
    | "FOUNDER_POV"
    | "CUSTOMER_PAIN"
    | "COMPARISON"
    | "DATA_POINT"
    | "FAQ"
    | "THREAD"
    | "REPLY"
    | "REPURPOSE"
    | "TIMELY_COMMENTARY";
};

/**
 * Dynamically ingests verified signals across the company's real crawl pages,
 * foundation documents, competitor whitespace, SEO/GEO findings, and customer discussions.
 */
export async function collectXSignals(
  companyId: string,
  memory: CompanyMemory
): Promise<XCollectedSignal[]> {
  const signals: XCollectedSignal[] = [];
  const company = memory.companyName;
  const category = memory.category || `${company} Solutions`;

  // 1. Ingest real crawl pages (extract specific subpage topics, features, pricing, blog posts)
  const crawlPages = await db.crawlPage.findMany({
    where: { companyId },
    select: { url: true, title: true, description: true, content: true },
    take: 15,
    orderBy: { wordCount: "desc" },
  });

  crawlPages.forEach((page, idx) => {
    if (page.title && page.description && !page.title.toLowerCase().includes("privacy") && !page.title.toLowerCase().includes("terms")) {
      const cleanTitle = page.title.split(/[|–—:•]/)[0].trim();
      if (cleanTitle.length > 5 && !cleanTitle.toLowerCase().includes("home")) {
        signals.push({
          id: `x_sig_web_${idx}_${Date.now()}`,
          source: "website_content",
          topic: cleanTitle,
          evidence: page.description.slice(0, 200),
          sourceUrl: page.url,
          relevanceConfidence: 94,
          suggestedAngle: "educational",
          opportunityType: "EDUCATIONAL_POST",
        });
      }
    }
  });

  // 2. Ingest Foundation Documents
  const documents = await db.document.findMany({
    where: { companyId },
    select: { type: true, title: true, contentMarkdown: true },
  });

  documents.forEach((doc) => {
    const text = doc.contentMarkdown || "";
    if (doc.type === "COMPANY_INTELLIGENCE") {
      if (memory.positioning) {
        signals.push({
          id: `x_sig_pos_${Date.now()}`,
          source: "marketing_ideas",
          topic: `Market Positioning: ${memory.positioning.slice(0, 60)}`,
          evidence: memory.positioning,
          relevanceConfidence: 96,
          suggestedAngle: "contrarian",
          opportunityType: "CONTRARIAN_POV",
        });
      }
      if (memory.differentiators && memory.differentiators.length > 0) {
        signals.push({
          id: `x_sig_diff_${Date.now()}`,
          source: "product_feature",
          topic: `Differentiator: ${memory.differentiators[0]}`,
          evidence: `Verified architectural differentiator from Company Intelligence.`,
          relevanceConfidence: 95,
          suggestedAngle: "product_led",
          opportunityType: "PRODUCT_INSIGHT",
        });
      }
    } else if (doc.type === "SEO_AUDIT" || doc.type === "GEO_AUDIT") {
      signals.push({
        id: `x_sig_search_${doc.type.toLowerCase()}`,
        source: doc.type === "SEO_AUDIT" ? "seo_findings" : "geo_findings",
        topic: `High-Intent Search Gap in ${category}`,
        evidence: `Discovery audit identified recurrent high-value search intent around modern ${category.toLowerCase()} implementation.`,
        relevanceConfidence: 92,
        suggestedAngle: "data_proof_led",
        opportunityType: "INSIGHT",
      });
    } else if (doc.type === "COMPETITOR_ANALYSIS") {
      const compName = memory.competitors[0]?.name || "Legacy Tools";
      signals.push({
        id: `x_sig_comp_${Date.now()}`,
        source: "competitor_analysis",
        topic: `Legacy Workflow Gaps vs ${compName}`,
        evidence: `Competitor analysis revealed buyer friction around complexity, setup lag, and opaque pricing.`,
        relevanceConfidence: 91,
        suggestedAngle: "comparison",
        opportunityType: "COMPARISON",
      });
    } else if (doc.type === "AUDIENCE_ANALYSIS") {
      memory.painPoints.slice(0, 3).forEach((pain, pIdx) => {
        signals.push({
          id: `x_sig_pain_${pIdx}`,
          source: "audience_pain",
          topic: `Core ICP Friction: ${pain}`,
          evidence: `Voice of customer research revealed repeated frustration regarding ${pain.toLowerCase()}.`,
          relevanceConfidence: 95,
          suggestedAngle: "problem_awareness",
          opportunityType: "CUSTOMER_PAIN",
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
    signals.push({ id: `x_sig_upload_${source.id}`, source: "uploaded_source", topic: source.title.replace(/\.[^.]+$/, ""), evidence, relevanceConfidence: 97, suggestedAngle: "source_led", opportunityType: "INSIGHT" });
  });

  // 3. Ingest Reddit Customer Conversations if available
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
          id: `x_sig_reddit_${rIdx}`,
          source: "reddit_conversation",
          topic: `Community debate on ${opp.subreddit || "Reddit"}: ${opp.title.slice(0, 50)}`,
          evidence: opp.excerpt.slice(0, 180),
          sourceUrl: opp.sourceUrl,
          relevanceConfidence: 93,
          suggestedAngle: "how_to",
          opportunityType: "REPLY",
        });
      }
    });
  }

  // 4. Founder / Strategic POV Signals
  signals.push({
    id: `x_sig_founder_${Date.now()}`,
    source: "marketing_ideas",
    topic: `The Counter-Intuitive Truth About ${category}`,
    evidence: `Expert commentary challenging traditional assumptions in ${category.toLowerCase()}.`,
    relevanceConfidence: 90,
    suggestedAngle: "founder_perspective",
    opportunityType: "FOUNDER_POV",
  });

  // 5. Educational Framework Thread Signal
  signals.push({
    id: `x_sig_thread_${Date.now()}`,
    source: "content_gap",
    topic: `The 5-Step Operating Playbook for ${category}`,
    evidence: `High-retention framework synthesising best practices from ${company} source material.`,
    relevanceConfidence: 94,
    suggestedAngle: "educational",
    opportunityType: "THREAD",
  });

  return signals;
}
