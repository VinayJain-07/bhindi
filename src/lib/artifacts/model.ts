import { cleanInlineMarkdown, parseMarkdown, type DocumentBlock } from "../documents/content";
import { canonicalReportType } from "./config";
import type { ArtifactManifest, ReportDataModel, ReportFinding, ReportRecommendation, ReportSection } from "./types";

type ModelInput = {
  reportType: string;
  companyName: string;
  companyWebsite?: string;
  companyCategory?: string | null;
  title: string;
  markdown: string;
  updatedAt: Date;
  sourceCount: number;
  competitors?: ReportDataModel["competitors"];
  manifest: ArtifactManifest;
};

const confidence = (value: string): ReportFinding["confidence"] => {
  if (/\bhigh confidence\b/i.test(value)) return "high";
  if (/\bmedium confidence\b/i.test(value)) return "medium";
  if (/\blow confidence\b/i.test(value)) return "low";
  return "unrated";
};

const priority = (value: string): ReportRecommendation["priority"] => {
  if (/\b(?:(?:critical|high) priority|priority\s*:\s*(?:critical|high)|priority 1|p1)\b/i.test(value)) return "high";
  if (/\b(?:medium priority|priority\s*:\s*medium|priority 2|p2)\b/i.test(value)) return "medium";
  if (/\b(?:low priority|priority\s*:\s*low|priority 3|p3)\b/i.test(value)) return "low";
  return "unrated";
};

function prefix(reportType: string) {
  return ({
    SEO_AUDIT: "SEO",
    GEO_AUDIT: "GEO",
    COMPETITOR_ANALYSIS: "COMP",
    AUDIENCE_ANALYSIS: "ICP",
    CONTENT_AUDIT: "CONTENT",
    MARKETING_STRATEGY: "GTM",
    COMPANY_INTELLIGENCE: "COMPANY",
    DESIGN_GUIDE: "DESIGN",
    STRATEGIC_INTELLIGENCE: "STRAT",
  } as Record<string, string>)[canonicalReportType(reportType)] ?? "REC";
}

function textOf(block: DocumentBlock): string {
  return block.type === "table" ? block.rows.flat().join(" ") : block.text;
}

function sectionize(blocks: DocumentBlock[]): Array<{ title: string; blocks: DocumentBlock[] }> {
  const sections: Array<{ title: string; blocks: DocumentBlock[] }> = [];
  let current = { title: "Executive summary", blocks: [] as DocumentBlock[] };
  for (const block of blocks) {
    if (block.type === "h1" || block.type === "h2") {
      if (current.blocks.length) sections.push(current);
      current = { title: block.text, blocks: [] };
    } else current.blocks.push(block);
  }
  if (current.blocks.length || sections.length === 0) sections.push(current);
  return sections;
}

function uniqueMatches(markdown: string, pattern: RegExp, limit = 30): string[] {
  return Array.from(markdown.matchAll(pattern), (match) => cleanInlineMarkdown(match[1] ?? match[0]))
    .filter((value, index, values) => Boolean(value) && values.indexOf(value) === index)
    .slice(0, limit);
}

export function buildReportDataModel(input: ModelInput): ReportDataModel {
  const canonicalType = canonicalReportType(input.reportType);
  // Preserve citation destinations through the display-oriented Markdown parser.
  const blocks = parseMarkdown(input.markdown.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1 ($2)"));
  const rawSections = sectionize(blocks);
  const urls = Array.from(input.markdown.matchAll(/https?:\/\/[^\s)\]>]+/g), (match) => match[0].replace(/[.,;:]$/, ""))
    .filter((url, index, values) => values.indexOf(url) === index);
  const sources = urls.map((url, index) => ({ id: `SRC-${String(index + 1).padStart(3, "0")}`, url, label: (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } })() }));
  const citedSources = (text: string) => sources.filter((source) =>
    Array.from(text.matchAll(/https?:\/\/[^\s)\]>]+/g), (match) => match[0].replace(/[.,;:]$/, "")).includes(source.url)
  ).map((source) => source.id);
  const recommendationPrefix = prefix(canonicalType);
  const findings: ReportFinding[] = [];
  const recommendations: ReportRecommendation[] = [];
  const sections: ReportSection[] = rawSections.map((section, sectionIndex) => {
    const narrativeBlocks = section.blocks.filter((block) => block.type !== "table");
    const narrative = narrativeBlocks.map(textOf).join(" ").trim();
    const findingId = `${recommendationPrefix}-F${String(sectionIndex + 1).padStart(3, "0")}`;
    if (narrative) findings.push({ id: findingId, title: section.title, narrative, confidence: confidence(narrative), sourceIds: citedSources(section.blocks.map(textOf).join(" ")) });
    const actionSection = /\b(?:recommend\w*|actions?|roadmap|priorit\w*|next steps?|opportunit\w*|plans?|backlog)\b/i.test(section.title);
    const candidates = actionSection ? section.blocks.filter((block) => block.type === "bullet" || block.type === "number" || block.type === "paragraph") : [];
    for (const table of section.blocks.filter((block) => block.type === "table")) {
      const headers = table.rows[0] ?? [];
      if (!headers.some((header) => /^(?:action|recommendation|next step)$/i.test(header))) continue;
      for (const row of table.rows.slice(1)) {
        candidates.push({ type: "paragraph", text: headers.map((header, index) => `${header}: ${row[index] ?? ""}`).join("; ") });
      }
    }
    const distinctCandidates = candidates.filter((block) => !recommendations.some((item) => item.detail === textOf(block)));
    const recommendationIds = distinctCandidates.map((block) => {
      const detail = textOf(block);
      const recommendation: ReportRecommendation = {
        id: `${recommendationPrefix}-${String(recommendations.length + 1).padStart(3, "0")}`,
        title: detail.split(/[.:;]/, 1)[0].slice(0, 100),
        detail,
        priority: priority(detail),
        findingIds: narrative ? [findingId] : [],
      };
      recommendations.push(recommendation);
      return recommendation.id;
    });
    return {
      id: `SEC-${String(sectionIndex + 1).padStart(3, "0")}`,
      title: section.title,
      blocks: section.blocks,
      findingIds: narrative ? [findingId] : [],
      recommendationIds,
    };
  });
  const paragraphText = blocks.filter((block) => block.type === "paragraph" || block.type === "quote").map(textOf);
  // Promote only named, explicitly cited measurements. Dates, list indices and
  // proposed targets are not KPIs and must never become headline metric cards.
  const metrics = paragraphText.flatMap((context) => {
    if (!citedSources(context).length || /\b(?:target|hypothes\w*|example|proposed|forecast|assum\w*)\b/i.test(context.replace(/https?:\/\/[^\s)\]>]+/g, ""))) return [];
    return Array.from(context.matchAll(/(?:^|[.!?]\s+)([A-Za-z][A-Za-z /()-]{2,55}?)\s*(?::|\bis\b|\bwas\b)\s*([$£€]\s*\d[\d,]*(?:\.\d+)?|\d[\d,]*(?:\.\d+)?\s*(?:%|ms\b|seconds\b))/g), (match) => ({
      id: "", label: match[1].trim(), value: match[2].trim(), context,
    }));
  }).filter((metric, index, all) => all.findIndex((item) => item.label === metric.label && item.value === metric.value) === index)
    .map((metric, index) => ({ ...metric, id: `MET-${String(index + 1).padStart(3, "0")}` }));
  const summarySection = sections.find((section) => /executive|summary|overview/i.test(section.title));
  const executiveSummary = (summarySection?.blocks ?? blocks).filter((block) => block.type !== "table" && !block.type.startsWith("h")).map(textOf).filter(Boolean).slice(0, 5);
  const tables = blocks.filter((block): block is Extract<DocumentBlock, { type: "table" }> => block.type === "table").map((block) => block.rows);
  const narrativeBlocks = blocks.filter((block): block is Exclude<DocumentBlock, { type: "table" }> => block.type !== "table");
  const assumptions = narrativeBlocks.filter((block) => /\b(?:assumption|hypothesis|unknown|validate)\b/i.test(block.text)).map((block) => block.text).slice(0, 20);
  const issues = narrativeBlocks.filter((block) => /\b(?:issue|risk|gap|problem|constraint|blocker)\b/i.test(block.text)).map((block) => block.text).slice(0, 30);
  const opportunities = narrativeBlocks.filter((block) => /\b(?:opportunity|potential|quick win|whitespace|improve)\b/i.test(block.text)).map((block) => block.text).slice(0, 30);
  const appendices = sections.filter((section) => /appendix|source|methodolog/i.test(section.title));

  return {
    reportType: canonicalType,
    company: { name: input.companyName, website: input.companyWebsite, category: input.companyCategory },
    reportPeriod: { updatedAt: input.updatedAt.toISOString(), label: input.updatedAt.toISOString().slice(0, 7) },
    title: input.title,
    executiveSummary: executiveSummary.length ? executiveSummary : ["Review the detailed findings and prioritized recommendations in this report."],
    metrics,
    findings,
    recommendations,
    competitors: input.competitors ?? [],
    keywords: uniqueMatches(input.markdown, /(?:keyword|query)\s*[:|-]\s*([^\n|]+)/gi),
    contentItems: uniqueMatches(input.markdown, /(?:content|article|post|asset)\s*[:|-]\s*([^\n|]+)/gi),
    campaigns: uniqueMatches(input.markdown, /campaign\s*[:|-]\s*([^\n|]+)/gi),
    personas: uniqueMatches(input.markdown, /(?:ICP|persona|segment)\s*(?:#?\d+)?\s*[:|-]\s*([^\n|]+)/gi),
    channels: uniqueMatches(input.markdown, /(?:channel|platform)\s*[:|-]\s*([^\n|]+)/gi),
    issues,
    opportunities,
    roadmap: recommendations,
    scores: metrics.filter((metric) => /%|score/i.test(`${metric.label} ${metric.context}`)),
    sources,
    assumptions,
    confidenceLevels: findings.map((finding) => finding.confidence),
    visualizations: input.manifest.requiredVisuals,
    tables,
    appendices,
    sections,
    lineage: recommendations.flatMap((recommendation) => (citedSources(recommendation.detail).length ? citedSources(recommendation.detail) : [undefined]).map((sourceId) => ({
      sourceId,
      findingId: recommendation.findingIds[0],
      recommendationId: recommendation.id,
      artifactReferences: {
        pdf: `Recommendation ${recommendation.id}`,
        pptx: `Roadmap / ${recommendation.id}`,
        xlsx: `Action Tracker / ${recommendation.id}`,
      },
    }))),
  };
}
