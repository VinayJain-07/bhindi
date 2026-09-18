export type ProvenanceType = "verified" | "supported" | "inferred" | "assumed";

export type FindingType =
  | "positive_signal"
  | "issue"
  | "risk"
  | "opportunity"
  | "insight"
  | "action_candidate";

export type CompanyStrategicProfile = {
  companyName: string;
  websiteUrl: string;
  category: string;
  tagline: string;
  description: string;
  coreOfferStack: string[];
  productServiceCategories: string[];
  icpsAndPersonas: Array<{
    title: string;
    role: string;
    description: string;
    painPoints: string[];
    buyingTriggers: string[];
  }>;
  painPoints: string[];
  useCases: string[];
  positioning: string;
  differentiators: string[];
  proofPoints: string[];
  commercialModel: {
    pricingStructure: string;
    monetizationType: string;
    tierHighlights: string[];
  };
  brandProfile: {
    pillars: string[];
    messagingThemes: string[];
  };
  voice: {
    tone: string;
    principles: string[];
    forbiddenPhrases: string[];
  };
  contentThemes: string[];
  goalsAndKpis: Array<{
    goal: string;
    targetKpi: string;
    strategicWeight: "high" | "medium" | "standard";
  }>;
};

export type CompetitorProfile = {
  id: string;
  name: string;
  officialWebsite: string;
  logoUrl: string;
  category: string;
  targetAudience: string;
  coreOffer: string;
  keyFeatures: string[];
  pricingMarketPosition: string;
  primaryUsp: string;
  strengths: string[];
  weaknesses: string[];
  positioningAngle: string;
  proofSignals: string[];
  howWeDiffer: string;
  evidenceSummary: string;
  marketShareTier: "market_leader" | "established_player" | "direct_challenger" | "niche_alternative";
  confidenceScore: number;
};

export type NormalizedFinding = {
  id: string;
  type: FindingType;
  provenance: ProvenanceType;
  originatingSkills: string[];
  title: string;
  evidence: string;
  impact: string;
  category: "positioning" | "offer" | "audience" | "messaging" | "competitor" | "acquisition";
  sourceUrl?: string;
  confidence: number;
};

export type PrioritizedActionItem = {
  id: string;
  title: string;
  whatShouldBeDone: string;
  whyItMatters: string;
  evidence: string;
  originatingSkills: string[];
  goalKpiAlignment: string;
  expectedImpact: "High" | "Medium" | "Low";
  estimatedEffort: "Quick Win" | "Days" | "Weeks";
  confidence: number; // 0 - 100
  priorityScore: number; // 0 - 100
  priorityTier: "critical" | "high" | "medium";
  concreteNextStep: string;
  voiceGuardrail: string;
  experimentOutline?: {
    hypothesis: string;
    testChannel: string;
    successMetric: string;
  };
};

export type CompetitorIntelligencePayload = {
  companyProfile: CompanyStrategicProfile;
  competitors: CompetitorProfile[];
  executiveSummary: string;
  companyPositioningSummary: string;
  findings: NormalizedFinding[];
  actionItems: PrioritizedActionItem[];
  generatedAt: string;
  analyzedSourcesCount: number;
};
