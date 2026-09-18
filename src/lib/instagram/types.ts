import type { CompanyMemory } from "@/lib/reddit/company-memory";

export type InstagramOpportunityType =
  | "EDUCATIONAL_POST"
  | "CAROUSEL"
  | "REEL"
  | "STORY"
  | "FOUNDER_INSIGHT"
  | "PRODUCT_EDUCATION"
  | "CASE_STUDY"
  | "SOCIAL_PROOF"
  | "FAQ"
  | "COMPARISON"
  | "MYTH_VS_FACT"
  | "CHECKLIST"
  | "TREND_ADAPTATION"
  | "ENGAGEMENT_OPPORTUNITY"
  | "REPURPOSE_CONTENT";

export type InstagramFormat = "CAROUSEL" | "REEL" | "STORY" | "SINGLE_IMAGE" | "INFOGRAPHIC";

export type ContentAngle =
  | "educational"
  | "contrarian"
  | "problem_awareness"
  | "founder_perspective"
  | "data_proof_led"
  | "how_to"
  | "checklist"
  | "before_after"
  | "comparison"
  | "myth_vs_fact"
  | "customer_story"
  | "product_led";

export type InstagramGoal = "acquisition" | "awareness" | "engagement" | "leads" | "authority" | "retention";

export type CarouselSlide = {
  slideNumber: number;
  type: "hook" | "context" | "value" | "evidence" | "takeaway" | "cta";
  headline: string;
  bodyContent: string;
  visualDirection: string;
  onScreenText: string;
  swipePrompt?: string;
};

export type ReelStoryboardStep = {
  timestamp: string; // e.g., "0-3s", "3-8s", "8-18s", "18-25s", "25-30s"
  phase: "hook" | "problem" | "insight_demo" | "proof" | "cta";
  spokenAudio: string;
  visualAction: string;
  onScreenText: string;
  audioTrackSuggestion?: string;
  cameraAngleOrFraming?: string;
};

export type StoryFrame = {
  frameNumber: number;
  visualPrompt: string;
  textOverlay: string;
  interactiveElement?: {
    type: "poll" | "question" | "quiz" | "slider" | "link_sticker" | "countdown";
    prompt: string;
    options?: string[];
  };
  ctaText?: string;
};

export type RepurposingPlan = {
  storiesAngle: string;
  linkedInDraft: string;
  xPostOrThread: string;
  newsletterSnippet?: string;
};

export type ScoredContentAngle = {
  angle: ContentAngle;
  title: string;
  hook: string;
  angleScore: number;
  whyThisAngle: string;
};

export type InstagramExecutionPackage = {
  recommendedFormat: InstagramFormat;
  selectedAngle: ContentAngle;
  alternativeAngles: ScoredContentAngle[];
  hook: string;
  carouselSlides?: CarouselSlide[];
  reelStoryboard?: ReelStoryboardStep[];
  storySequence?: StoryFrame[];
  caption: string;
  cta: string;
  hashtags: string[];
  keywordsForSeo: string[];
  visualDirection: string;
  onScreenTextSummary: string;
  suggestedAssetRequirements: string[];
  supportingEvidence: string[];
  brandVoiceChecks: {
    passedTone: boolean;
    toneNotes: string;
    guardrailNotes: string;
    sourceVerified: boolean;
  };
  repurposingPlan: RepurposingPlan;
};

export type OpportunityScoreBreakdown = {
  strategicGoalAlignment: number; // 0-15
  icpRelevance: number; // 0-15
  audiencePainMatch: number; // 0-15
  productFit: number; // 0-10
  evidenceStrength: number; // 0-10
  visualPotential: number; // 0-10
  engagementPotential: number; // 0-10
  novelty: number; // 0-5
  recency: number; // 0-5
  effort: number; // 0-5 (lower effort = higher score)
  confidence: number; // 0-5
  total: number; // 0-100
  tier: "exceptional" | "high" | "medium" | "low";
};

export type InstagramOpportunity = {
  id: string;
  title: string;
  hookHeadline: string;
  opportunityType: InstagramOpportunityType;
  primaryGoal: InstagramGoal;
  recommendedFormat: InstagramFormat;
  targetAudience: string;
  targetPainPoint: string;
  signalOrigin: {
    source: "website_content" | "seo_geo" | "reddit_discussion" | "competitor_whitespace" | "product_feature" | "uploaded_source" | "marketing_ideas" | "customer_faq";
    description: string;
    evidenceSnippet?: string;
    sourceUrl?: string;
  };
  whyThisMatters: string;
  whyAmISeeingThis: string;
  expectedKpiImpact: string;
  confidence: number;
  score: OpportunityScoreBreakdown;
  executionPackage: InstagramExecutionPackage;
  lifecycleStatus: "new" | "reviewed" | "ready" | "scheduled" | "published" | "dismissed";
  scheduledForDate?: string;
  publishedAt?: string;
  dismissedAt?: string;
  customDraftOverrides?: {
    caption?: string;
    hook?: string;
    cta?: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type InstagramOpportunityMapTheme = {
  id: string;
  category:
    | "priority_theme"
    | "customer_problem"
    | "product_education"
    | "competitor_whitespace"
    | "social_proof"
    | "founder_insight"
    | "faq_objection"
    | "comparison"
    | "trend_compatible"
    | "visual_concept";
  title: string;
  description: string;
  suggestedFormats: InstagramFormat[];
  relevanceScore: number;
  suggestedHooks: string[];
};

export type InstagramOpportunityMap = {
  companyName: string;
  category: string;
  generatedAt: string;
  themes: InstagramOpportunityMapTheme[];
  visualConcepts: Array<{ title: string; style: string; layoutIdea: string }>;
  pillarDistribution: Record<string, number>;
};
