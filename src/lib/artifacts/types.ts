import type { DocumentBlock } from "../documents/content";

export type ArtifactFormat = "pdf" | "pptx" | "xlsx";
export type ArtifactRequirement = "required" | "optional" | "disabled";
export type ArtifactTheme =
  | "executive-strategy"
  | "search-intelligence"
  | "technical-diagnostic"
  | "customer-intelligence"
  | "competitive-intelligence"
  | "growth-strategy"
  | "performance-analytics";

export type ArtifactProfile = {
  pdf: ArtifactRequirement;
  pptx: ArtifactRequirement;
  xlsx: ArtifactRequirement;
  primaryArtifact: ArtifactFormat;
  theme: ArtifactTheme;
  targetSlides: number;
  requiredVisuals: string[];
  requiredSheets: string[];
  appendixRequired: boolean;
};

export type ArtifactDecision = {
  format: ArtifactFormat;
  requirement: ArtifactRequirement;
  enabled: boolean;
  reason: string;
};

export type ArtifactManifest = {
  reportType: string;
  primaryArtifact: ArtifactFormat;
  theme: ArtifactTheme;
  targetSlides: number;
  requiredVisuals: string[];
  requiredSheets: string[];
  appendixRequired: boolean;
  decisions: Record<ArtifactFormat, ArtifactDecision>;
};

export type ReportMetric = {
  id: string;
  label: string;
  value: string;
  context: string;
};

export type ReportFinding = {
  id: string;
  title: string;
  narrative: string;
  confidence: "high" | "medium" | "low" | "unrated";
  sourceIds: string[];
};

export type ReportRecommendation = {
  id: string;
  title: string;
  detail: string;
  priority: "high" | "medium" | "low" | "unrated";
  findingIds: string[];
};

export type ReportSource = {
  id: string;
  url: string;
  label: string;
};

export type ReportSection = {
  id: string;
  title: string;
  blocks: DocumentBlock[];
  findingIds: string[];
  recommendationIds: string[];
};

export type ReportDataModel = {
  reportType: string;
  company: {
    name: string;
    website?: string;
    category?: string | null;
  };
  reportPeriod: {
    updatedAt: string;
    label: string;
  };
  title: string;
  executiveSummary: string[];
  metrics: ReportMetric[];
  findings: ReportFinding[];
  recommendations: ReportRecommendation[];
  competitors: Array<{
    companyName: string;
    officialWebsite: string;
    positioning: string;
    competitiveAttributes: string[];
  }>;
  keywords: string[];
  contentItems: string[];
  campaigns: string[];
  personas: string[];
  channels: string[];
  issues: string[];
  opportunities: string[];
  roadmap: ReportRecommendation[];
  scores: ReportMetric[];
  sources: ReportSource[];
  assumptions: string[];
  confidenceLevels: ReportFinding["confidence"][];
  visualizations: string[];
  tables: string[][][];
  appendices: ReportSection[];
  sections: ReportSection[];
  lineage: Array<{
    sourceId?: string;
    findingId?: string;
    recommendationId?: string;
    artifactReferences: Partial<Record<ArtifactFormat, string>>;
  }>;
};
