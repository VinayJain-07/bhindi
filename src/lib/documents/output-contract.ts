import { canonicalReportType, getArtifactProfile } from "../artifacts/config";

// These boundaries keep shared research reusable without producing the same report twice.
export const DOCUMENT_SCOPE: Record<string, string> = {
  COMPANY_INTELLIGENCE: "Own the combined company and product source of truth: company facts, offer hierarchy, positioning, use cases, proof, brand voice, packaging, pricing evidence, objections and sales narratives. Separate evidence from hypotheses and validation gaps.",
  CONTENT_AUDIT: "Own the existing content inventory and the full-funnel response: coverage, quality, keep/refresh/consolidate decisions, gaps, pillars, topics, briefs, distribution, repurposing, calendar, owners, KPIs and refresh triggers. Do not repeat the same inventory in the future plan.",
  COMPETITOR_ANALYSIS: "Own the sourced competitive landscape and the implementation-ready comparison playbook: alternatives, comparable attributes, whitespace, page architecture, feature matrices and defensible conversion copy. Never invent migration guarantees or private performance.",
  MARKETING_STRATEGY: "Own cross-channel choices, tradeoffs, dependencies and measurement. Cite supplied specialist findings and resolve contradictions; do not concatenate or repeat specialist reports.",
  TOPIC_CLUSTER_BLUEPRINT: "Own pillar-to-page relationships, search intent and internal links. Hand publication scheduling to Content Strategy.",
  SOCIAL_BATCH_PLAN: "Own dated or relative-day social posts, full drafts and production status. Reuse supplied strategy instead of repeating audience and pillar research.",
};

const TABLE_FIELDS: Record<string, string> = {
  AB_TEST_ROADMAP: "Experiment ID, Hypothesis, Evidence URL, Control, Variation, Primary metric, Guardrail, Sample-size inputs needed, Decision rule, Owner, Status",
  TOPIC_CLUSTER_BLUEPRINT: "Page ID, Pillar, Topic, Intent, Target URL, Parent URL, Anchor text, Evidence URL, Priority, Owner, Status",
  PSEO_BLUEPRINT: "Template ID, URL pattern, Required data, Unique user value, Canonical rule, Indexing gate, Validation check, Owner, Status",
  CONTENT_AUDIT: "Asset ID, Period, Audience, Buyer stage, Topic, Format, Channel, Proof requirement, CTA, Owner, KPI, Status",
  SOCIAL_BATCH_PLAN: "Post ID, Publish date or relative day, Platform, Audience, Pillar, Format, Draft, CTA, Proof requirement, Owner, Status",
  PAID_ADS_PLAYBOOK: "Campaign ID, Channel, Audience, Objective, Creative variant, Landing page, Budget assumption, KPI, Stop or scale rule, Owner, Status",
  ANALYTICS_TRACKING_BLUEPRINT: "Event name, Trigger, Required properties, Conversion definition, Consent requirement, Source, Validation check, Owner, Status",
};

export function documentOutputContract(reportType: string): string {
  const canonicalType = canonicalReportType(reportType);
  const profile = getArtifactProfile(canonicalType);
  const sheets = profile.requiredSheets.filter((name) => !/summary|action_tracker|source_register/i.test(name));
  return [
    "DELIVERABLE QUALITY AND FORMAT",
    DOCUMENT_SCOPE[canonicalType] ?? "Stay within this document's purpose. Refer briefly to related research; each section must add a distinct finding, decision or usable asset.",
    `Primary download: ${profile.primaryArtifact.toUpperCase()}. The application creates the binary files; return the complete source content, never claim a file was attached.`,
    profile.xlsx === "required" ? `This is an operational deliverable. Put reusable records in Markdown tables with one item per row and stable IDs. Use these exact section headings where applicable: ${sheets.map((name) => name.replace(/^\d+_/, "").replaceAll("_", " ")).join(", ")}. Preserve full scripts and drafts. Missing inputs must be explicit; do not invent rows to fill a template.` : "Use tables only for comparable repeated fields; use clear prose for analysis and complete copy for scripts.",
    TABLE_FIELDS[canonicalType] ? `Core table fields, split into linked tables by ID if wider than eight columns: ${TABLE_FIELDS[canonicalType]}.` : "Keep each table at eight columns or fewer; split wide records into linked tables using a shared ID.",
    "Use one report title. Lead with a concise executive decision, then evidence, interpretation and practical actions. Use descriptive section headings and short paragraphs. Do not pad to a page or slide count.",
    "Give each recommendation once, with ID, action, explicit priority, evidence URL, owner (Unassigned if unknown), timing, dependency and observable success check. Refer to that ID elsewhere instead of duplicating the recommendation.",
    "Separate observations, hypotheses and proposed targets. A date, step number or example is not a measured KPI. State metric name, unit, period and source together. Unavailable values remain unavailable, never zero.",
    "Cite evidence beside the claim it supports. End with one deduplicated source register and a concise list of unresolved evidence gaps. A URL in the register alone does not substantiate every claim.",
    "Before returning, check scope overlap, contradictory claims, complete table rows, unique IDs, actionable priorities and readable visual structures. Preserve useful specialist methods while consolidating repeated introductory material.",
  ].join("\n");
}
