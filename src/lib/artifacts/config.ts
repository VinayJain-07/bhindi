import { parseMarkdown } from "../documents/content";
import type { ArtifactFormat, ArtifactManifest, ArtifactProfile } from "./types";

const DEFAULT_PROFILE: ArtifactProfile = {
  pdf: "required",
  pptx: "required",
  xlsx: "optional",
  primaryArtifact: "pdf",
  theme: "executive-strategy",
  targetSlides: 16,
  requiredVisuals: ["executive-summary", "priority-matrix", "roadmap"],
  requiredSheets: ["01_Summary", "02_Action_Tracker", "03_Source_Register"],
  appendixRequired: true,
};

function workbookProfile(sheets: string[], theme: ArtifactProfile["theme"] = "growth-strategy"): ArtifactProfile {
  return { ...DEFAULT_PROFILE, xlsx: "required", primaryArtifact: "xlsx", pptx: "disabled", theme,
    requiredSheets: ["01_Summary", ...sheets, "90_Action_Tracker", "99_Source_Register"] };
}

export const ARTIFACT_PROFILES: Record<string, ArtifactProfile> = {
  COMPANY_INTELLIGENCE: {
    ...DEFAULT_PROFILE,
    theme: "executive-strategy",
    requiredVisuals: ["offer-value-stack", "positioning-map", "proof-ladder"],
  },
  SEO_AUDIT: {
    ...DEFAULT_PROFILE,
    xlsx: "required",
    theme: "technical-diagnostic",
    targetSlides: 18,
    requiredVisuals: ["seo-health", "severity-matrix", "crawl-architecture", "priority-matrix"],
    requiredSheets: ["01_Summary", "02_Issues", "03_Page_Audit", "04_Technical_Issues", "05_Priority_Backlog", "06_Source_Register"],
  },
  GEO_AUDIT: {
    ...DEFAULT_PROFILE,
    xlsx: "required",
    theme: "search-intelligence",
    targetSlides: 17,
    requiredVisuals: ["ai-readiness", "entity-map", "citation-readiness", "question-coverage"],
    requiredSheets: ["01_Summary", "02_AI_Visibility_Gaps", "03_Question_Coverage", "04_Priority_Backlog", "05_Source_Register"],
  },
  COMPETITOR_ANALYSIS: {
    ...DEFAULT_PROFILE,
    theme: "competitive-intelligence",
    targetSlides: 18,
    requiredVisuals: ["positioning-map", "competitor-matrix", "threat-ranking", "strategic-whitespace"],
    requiredSheets: ["01_Summary", "02_Competitor_Master", "03_Positioning", "04_Strengths_Weaknesses", "05_Opportunity_Gaps", "06_Source_Register"],
  },
  AUDIENCE_ANALYSIS: {
    ...DEFAULT_PROFILE,
    theme: "customer-intelligence",
    targetSlides: 18,
    requiredVisuals: ["icp-comparison", "pain-urgency", "buying-committee", "segment-attractiveness"],
    requiredSheets: ["01_Summary", "02_ICP_Master", "03_Pain_Points", "04_Buying_Committee", "05_Messaging", "06_ICP_Scoring", "07_Source_Register"],
  },
  CONTENT_AUDIT: {
    ...DEFAULT_PROFILE,
    xlsx: "required",
    primaryArtifact: "xlsx",
    theme: "growth-strategy",
    targetSlides: 17,
    requiredVisuals: ["content-funnel", "pillar-cluster-map", "content-gap-matrix", "editorial-roadmap"],
    requiredSheets: ["01_Summary", "02_Content_Inventory", "03_Content_Gaps", "04_Content_Ideas", "05_Priority_Backlog", "06_Source_Register"],
  },
  MARKETING_STRATEGY: {
    ...DEFAULT_PROFILE,
    theme: "executive-strategy",
    targetSlides: 22,
    requiredVisuals: ["executive-dashboard", "cross-functional-priority-map", "integrated-roadmap"],
    requiredSheets: ["01_Summary", "02_Campaigns", "03_Channels", "04_Experiments", "05_Roadmap", "06_KPIs", "07_Owners", "08_Source_Register"],
  },
  DESIGN_GUIDE: {
    ...DEFAULT_PROFILE,
    pptx: "required",
    xlsx: "disabled",
    primaryArtifact: "pptx",
    theme: "executive-strategy",
    requiredVisuals: ["visual-spectrum", "token-system", "template-blueprint"],
    requiredSheets: [],
    appendixRequired: false,
  },
  STRATEGIC_INTELLIGENCE: {
    ...DEFAULT_PROFILE,
    xlsx: "required",
    theme: "executive-strategy",
    targetSlides: 22,
    requiredVisuals: ["executive-dashboard", "cross-functional-priority-map", "integrated-roadmap"],
    requiredSheets: ["01_Summary", "02_Findings", "03_Action_Tracker", "04_Metrics", "05_Source_Register"],
  },
  BACKLINK_OUTREACH_BLUEPRINT: {
    ...DEFAULT_PROFILE,
    pdf: "disabled",
    pptx: "disabled",
    xlsx: "required",
    primaryArtifact: "xlsx",
    theme: "search-intelligence",
    targetSlides: 0,
    requiredVisuals: ["pipeline-health", "opportunity-priority", "90-day-roadmap"],
    requiredSheets: [
      "01_Executive_Dashboard",
      "02_Strategy_On_A_Page",
      "03_Validated_Prospects",
      "04_90_Day_Roadmap",
      "05_Outreach_CRM",
      "06_Link_Earnings_Log",
      "07_Linkable_Assets",
      "08_KPI_Tracker",
      "09_Validation_Registry",
    ],
    appendixRequired: false,
  },
  PAGE_CRO_AUDIT: { ...DEFAULT_PROFILE, theme: "technical-diagnostic" },
  ONBOARDING_CRO_AUDIT: { ...DEFAULT_PROFILE, theme: "customer-intelligence" },
  AB_TEST_ROADMAP: workbookProfile(["02_Experiments", "03_Measurement"]),
  TOPIC_CLUSTER_BLUEPRINT: workbookProfile(["02_Topic_Map", "03_Internal_Links"], "search-intelligence"),
  PSEO_BLUEPRINT: workbookProfile(["02_Page_Templates", "03_Data_Schema", "04_Rollout"], "search-intelligence"),
  LOCAL_SEO_AUDIT: { ...DEFAULT_PROFILE, xlsx: "required", theme: "search-intelligence" },
  COLD_OUTBOUND_PLAYBOOK: { ...DEFAULT_PROFILE, theme: "customer-intelligence" },
  EMAIL_LIFECYCLE_PLAYBOOK: { ...DEFAULT_PROFILE, theme: "customer-intelligence" },
  LEAD_MAGNET_STRATEGY: { ...DEFAULT_PROFILE, theme: "growth-strategy" },
  PAID_ADS_PLAYBOOK: workbookProfile(["02_Campaigns", "03_Ad_Variants", "04_Budget"], "performance-analytics"),
  SOCIAL_BATCH_PLAN: workbookProfile(["02_Content_Calendar", "03_Post_Drafts", "04_Carousels"]),
  SHORT_FORM_VIDEO_BLUEPRINT: { ...DEFAULT_PROFILE, theme: "growth-strategy" },
  BRAND_STORYTELLING_GUIDE: { ...DEFAULT_PROFILE, xlsx: "disabled", requiredSheets: [] },
  ANALYTICS_TRACKING_BLUEPRINT: workbookProfile(["02_Event_Taxonomy", "03_UTM_Registry", "04_KPI_Definitions"], "performance-analytics"),
};

const REPORT_TYPE_ALIASES: Record<string, string> = {
  PRODUCT_INFO: "COMPANY_INTELLIGENCE",
  CONTENT_STRATEGY: "CONTENT_AUDIT",
  COMPETITOR_COMPARISON_PLAYBOOK: "COMPETITOR_ANALYSIS",
};

export function canonicalReportType(reportType: string): string {
  return REPORT_TYPE_ALIASES[reportType] ?? reportType;
}

type RoutingInput = {
  reportType: string;
  markdown?: string;
  metadata?: unknown;
  competitorCount?: number;
};

function recordCount(metadata: unknown): number {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return 0;
  return Object.values(metadata).reduce((total, value) => total + (Array.isArray(value) ? value.length : 0), 0);
}

function structuredSignals(input: RoutingInput) {
  const markdown = input.markdown ?? "";
  const blocks = parseMarkdown(markdown);
  const tables = blocks.filter((block) => block.type === "table");
  const tableRows = tables.reduce((total, table) => total + Math.max(0, table.rows.length - 1), 0);
  const urlCount = new Set(Array.from(markdown.matchAll(/https?:\/\/[^\s)\]>]+/g), (match) => match[0])).size;
  const dateCount = (markdown.match(/\b(?:20\d{2}-\d{2}-\d{2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2})\b/gi) ?? []).length;
  const operationalTerms = (markdown.match(/\b(?:owner|status|due date|publish date|campaign|calendar|schedule|backlog|experiment|priority|score|budget|forecast|keyword|url)\b/gi) ?? []).length;
  const personaCount = (markdown.match(/\b(?:ICP|persona|segment)\s*(?:#|\d|:|-)/gi) ?? []).length;
  return {
    tableRows,
    urlCount,
    dateCount,
    operationalTerms,
    personaCount,
    repeatedMetadataRecords: recordCount(input.metadata),
    competitorCount: input.competitorCount ?? 0,
  };
}

export function getArtifactProfile(reportType: string): ArtifactProfile {
  return ARTIFACT_PROFILES[canonicalReportType(reportType)] ?? DEFAULT_PROFILE;
}

export function resolveArtifactManifest(input: RoutingInput): ArtifactManifest {
  const profile = getArtifactProfile(input.reportType);
  const signals = structuredSignals(input);
  const reusableData = signals.tableRows >= 15
    || signals.dateCount > 0
    || signals.operationalTerms >= 3
    || signals.repeatedMetadataRecords >= 15
    || signals.urlCount >= 8
    || signals.competitorCount > 3
    || signals.personaCount > 1;
  const xlsxEnabled = profile.xlsx === "required" || (profile.xlsx === "optional" && reusableData);
  const reason = xlsxEnabled
    ? profile.xlsx === "required"
      ? "Required by the report profile because the underlying data is operational."
      : "Enabled because the report contains reusable rows, dates, URLs, scores, competitors, or ownership data."
    : profile.xlsx === "disabled"
      ? "Disabled by the report profile because a workbook would not add operational value."
      : "Not enabled because the report does not yet contain reusable structured data.";

  const decision = (format: ArtifactFormat, requirement: ArtifactProfile[ArtifactFormat], enabled: boolean, explanation: string) => ({
    format,
    requirement,
    enabled,
    reason: explanation,
  });

  return {
    reportType: canonicalReportType(input.reportType),
    primaryArtifact: profile.primaryArtifact,
    theme: profile.theme,
    targetSlides: profile.targetSlides,
    requiredVisuals: profile.requiredVisuals,
    requiredSheets: profile.requiredSheets,
    appendixRequired: profile.appendixRequired,
    decisions: {
      pdf: decision("pdf", profile.pdf, profile.pdf !== "disabled", profile.pdf === "disabled" ? "Disabled by the report profile." : "The PDF is the detailed analytical source of truth."),
      pptx: decision("pptx", profile.pptx, profile.pptx !== "disabled", profile.pptx === "disabled" ? "Disabled by the report profile." : "The PPTX is the compressed leadership decision story."),
      xlsx: decision("xlsx", profile.xlsx, xlsxEnabled, reason),
    },
  };
}

export function isArtifactEnabled(manifest: ArtifactManifest, format: ArtifactFormat): boolean {
  return manifest.decisions[format].enabled;
}
