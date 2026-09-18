import type { CompanyMemory } from "@/lib/reddit/company-memory";

export type XOpportunityType =
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

export type ContentAngle =
  | "contrarian"
  | "educational"
  | "problem_awareness"
  | "founder_perspective"
  | "data_proof_led"
  | "how_to"
  | "comparison"
  | "myth_vs_fact"
  | "framework"
  | "timely_commentary";

export type XPostFormat = "SINGLE_POST" | "THREAD" | "REPLY" | "REPURPOSE";

export type XGoal = "acquisition" | "awareness" | "conversation" | "leads" | "authority" | "retention";

export type ThreadTweet = {
  tweetNumber: number;
  content: string;
  visualOrCodeSnippet?: string;
  callToAction?: string;
};

export type ScoredXAngle = {
  angle: ContentAngle;
  title: string;
  hook: string;
  angleScore: number;
  whyThisAngle: string;
};

export type XExecutionPackage = {
  format: XPostFormat;
  selectedAngle: ContentAngle;
  alternativeAngles: ScoredXAngle[];
  hook: string;
  postContent: string;
  threadTweets?: ThreadTweet[];
  replyTarget?: {
    contextSummary: string;
    recommendedReply: string;
  };
  threeVariants: {
    punchy: string;
    observation: string;
    contrarian: string;
  };
  cta: string;
  supportingEvidence: string[];
  evidenceStatus: "verified_fact" | "first_party_proof" | "sourced_observation" | "stated_hypothesis";
  brandVoiceChecks: {
    passedTone: boolean;
    bannedPhrasesFound: string[];
    voiceNotes: string;
    noInventedMetrics: boolean;
  };
  repurposingPlan: {
    linkedInPost: string;
    instagramCarouselHook: string;
    newsletterSnippet: string;
  };
};

export type XScoreBreakdown = {
  icpRelevance: number; // 0-15
  productRelevance: number; // 0-15
  evidenceStrength: number; // 0-15
  novelty: number; // 0-10
  conversationPotential: number; // 0-10
  brandFit: number; // 0-10
  goalAlignment: number; // 0-10
  recency: number; // 0-5
  repetitionRisk: number; // 0-5 (low repetition = 5)
  confidence: number; // 0-5
  total: number; // 0-100
  tier: "exceptional" | "high" | "medium" | "low";
};

export type XOpportunity = {
  id: string;
  title: string;
  hookHeadline: string;
  opportunityType: XOpportunityType;
  format: XPostFormat;
  primaryGoal: XGoal;
  targetAudience: string;
  targetPainPoint: string;
  signalOrigin: {
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
    evidenceSnippet: string;
    sourceUrl?: string;
  };
  whyThisMatters: string;
  whyAmISeeingThis: string;
  expectedKpiImpact: string;
  confidence: number;
  score: XScoreBreakdown;
  executionPackage: XExecutionPackage;
  lifecycleStatus: "new" | "reviewed" | "ready" | "scheduled" | "published" | "dismissed";
  scheduledForDate?: string;
  publishedAt?: string;
  dismissedAt?: string;
  customDraft?: string;
  createdAt: string;
  updatedAt: string;
};
