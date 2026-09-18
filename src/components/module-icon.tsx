import {
  Boxes,
  Building2,
  ChartNoAxesCombined,
  Compass,
  Files,
  Globe2,
  Layers,
  Network,
  Newspaper,
  NotebookTabs,
  Palette,
  ScanSearch,
  SearchCheck,
  Sparkles,
  Swords,
  Target,
  UsersRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const moduleKinds: Record<string, { Icon: LucideIcon; className: string; label: string }> = {
  // Core Documents & Associated Agents
  COMPANY_INTELLIGENCE: { Icon: Building2, className: "company", label: "Company and Product Intelligence" },
  AI_CMO: { Icon: ChartNoAxesCombined, className: "cmo", label: "AI CMO" },
  SEO_AUDIT: { Icon: SearchCheck, className: "seo", label: "SEO Audit" },
  SEO: { Icon: SearchCheck, className: "seo", label: "SEO Audit Agent" },
  TECHNICAL_SEO: { Icon: Wrench, className: "technical", label: "Technical SEO Agent" },
  PROGRAMMATIC_SEO: { Icon: Network, className: "programmatic", label: "Programmatic SEO" },
  GEO_AUDIT: { Icon: Globe2, className: "geo", label: "GEO and AI Visibility" },
  GEO: { Icon: Globe2, className: "geo", label: "GEO and AI Visibility" },
  COMPETITOR_ANALYSIS: { Icon: Swords, className: "competitor", label: "Competitor Analysis" },
  COMPETITOR: { Icon: ScanSearch, className: "competitor", label: "Competitor Analysis" },
  AUDIENCE_ANALYSIS: { Icon: Target, className: "audience", label: "Audience and ICP Research" },
  AUDIENCE: { Icon: UsersRound, className: "audience", label: "Audience Agent" },
  CONTENT_AUDIT: { Icon: NotebookTabs, className: "content", label: "Content Strategy Agent" },
  ARTICLES: { Icon: Newspaper, className: "articles", label: "Articles Agent" },

  // Skill-Generated / Extended Documents
  MARKETING_STRATEGY: { Icon: Compass, className: "strategy", label: "Integrated Marketing Strategy" },
  CAMPAIGN_PLANNER: { Icon: Compass, className: "strategy", label: "Integrated Marketing Strategy" },
  DESIGN_GUIDE: { Icon: Palette, className: "design", label: "Brand and Visual Design Guide" },
  CREATIVE_VISUAL: { Icon: Palette, className: "design", label: "Brand and Visual Design Guide" },
  CONTENT_STRATEGY: { Icon: Layers, className: "content-strategy", label: "Content Audit and Full-Funnel Strategy (legacy)" },
  PRODUCT_INFO: { Icon: Boxes, className: "product", label: "Company and Product Intelligence (legacy)" },
  STRATEGIC_INTELLIGENCE: { Icon: Sparkles, className: "strategic", label: "Strategic Intelligence Report" },

  PAGE_CRO_AUDIT: { Icon: Target, className: "cro", label: "Landing Page & Hero CRO Audit" },
  ONBOARDING_CRO_AUDIT: { Icon: Layers, className: "cro", label: "Onboarding & Activation Audit" },
  AB_TEST_ROADMAP: { Icon: Compass, className: "strategy", label: "A/B Testing & Experimentation Roadmap" },
  TOPIC_CLUSTER_BLUEPRINT: { Icon: SearchCheck, className: "seo", label: "Topic Cluster & Pillar Architecture" },
  PSEO_BLUEPRINT: { Icon: Globe2, className: "geo", label: "Programmatic SEO (pSEO) Blueprint" },
  BACKLINK_OUTREACH_BLUEPRINT: { Icon: Globe2, className: "seo", label: "Backlink & Digital PR Outreach Playbook" },
  LOCAL_SEO_AUDIT: { Icon: SearchCheck, className: "seo", label: "Local SEO & Google Business Profile Audit" },
  COLD_OUTBOUND_PLAYBOOK: { Icon: Target, className: "audience", label: "Cold Outbound & Account-Based Playbook" },
  EMAIL_LIFECYCLE_PLAYBOOK: { Icon: Files, className: "content", label: "Email Lifecycle & Lead Nurture Architecture" },
  LEAD_MAGNET_STRATEGY: { Icon: Boxes, className: "product", label: "Lead Magnet & Free Tool Strategy" },
  PAID_ADS_PLAYBOOK: { Icon: Compass, className: "strategy", label: "Multi-Channel Paid Ads Playbook" },
  COMPETITOR_COMPARISON_PLAYBOOK: { Icon: Swords, className: "competitor", label: "Competitive Landscape and Comparison Playbook (legacy)" },
  SOCIAL_BATCH_PLAN: { Icon: Files, className: "content", label: "Social Batch Publishing Plan and Agent Pack" },
  SHORT_FORM_VIDEO_BLUEPRINT: { Icon: Palette, className: "design", label: "Short-Form Video and UGC Agent Blueprint" },
  BRAND_STORYTELLING_GUIDE: { Icon: Building2, className: "company", label: "Brand Storytelling & Founder Thought Leadership" },
  ANALYTICS_TRACKING_BLUEPRINT: { Icon: Sparkles, className: "strategic", label: "Analytics Tracking & Attribution Blueprint" },
};

export function ModuleIcon({ type, size = 16, decorative = true }: { type: string; size?: number; decorative?: boolean }) {
  const item = moduleKinds[type] || { Icon: Sparkles, className: "default", label: "Report" };
  const { Icon } = item;
  return <span className={`module-icon module-icon-${item.className}`} title={decorative ? undefined : item.label} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : item.label}><Icon size={size} strokeWidth={2.1} /></span>;
}

export function isCoreModule(type: string) {
  return type in moduleKinds;
}
