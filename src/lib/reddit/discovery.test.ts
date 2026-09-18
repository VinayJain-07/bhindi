import { afterEach, describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { generateRedditSearchMap } from "./search-map";
import { runDeterministicPreFilter } from "./pre-filter";
import { evaluateRedditOpportunity } from "./scorer";
import { discoverRedditCandidates, hasVerifiedRedditIdentity } from "./fetcher";
import { isVerifiedRedditOpportunityIdentity, qualifyRedditOpportunities } from "./qualifier";
import { extractLabeledOfferStack } from "../competitors/company-profiler";
import { generateRedditReplyVariants } from "./writer";
import { clusterSignals, type MarketSignal } from "../signals/store";
import type { CompanyMemory } from "./company-memory";

const mockMemory: CompanyMemory = {
  companyName: "The Smarketers",
  websiteUrl: "https://thesmarketers.com",
  category: "B2B Marketing & Demand Generation",
  description: "A B2B marketing agency that handles account-based marketing (ABM) and automated SEO client reporting.",
  tagline: "High-growth B2B demand generation",
  productsAndServices: [
    "Full-Funnel Demand Generation",
    "Account-Based Marketing (ABM)",
    "Automated Technical Audits & SEO Reporting",
  ],
  featuresAndCapabilities: [
    "Automated multi-engine search visibility tracking",
    "White-label client reporting workflows",
  ],
  icpsAndPersonas: [
    {
      title: "B2B Marketing Agency Owner",
      role: "Agency Founder / CEO",
      description: "Runs an agency looking to scale client reporting and audits.",
      painPoints: ["Spending 5+ hours per client compiling SEO reports manually"],
    },
  ],
  painPoints: [
    "Manual client SEO reporting takes 5+ hours per client every month",
    "Legacy SEO tools are too expensive and lack white-label features",
  ],
  jobsToBeDone: [
    "Automate monthly client SEO & AI visibility audits without manual data entry",
  ],
  useCases: ["Automated agency client SEO reporting"],
  differentiators: [
    "Evidence-led architecture that never hallucinates metrics",
    "Built specifically for agencies with white-label outputs",
  ],
  competitors: [
    { name: "Screaming Frog", website: "https://screamingfrog.co.uk" },
    { name: "Semrush", website: "https://semrush.com" },
  ],
  positioning: "The Smarketers automates agency reporting and technical audit production.",
  primaryKeywords: ["the smarketers", "seo audit tool", "automated seo reporting", "agency reporting software"],
  secondaryKeywords: ["screaming frog alternative", "semrush alternative for agencies"],
  brandVoice: {
    tone: "Helpful, authoritative, concise, transparent.",
    principles: ["Answer directly before introducing solution", "Disclose affiliation clearly"],
    allowedClaims: ["Automates technical audits and client reporting"],
    forbiddenPhrases: ["Best tool in the world", "Guaranteed #1 ranking"],
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Reddit Continuous Opportunity Discovery System", () => {
  it("keeps an empty verified discovery empty instead of manufacturing opportunities", () => {
    expect(qualifyRedditOpportunities([])).toEqual([]);
    expect(isVerifiedRedditOpportunityIdentity({
      id: "reddit-rec-acme",
      sourceUrl: "https://www.reddit.com/r/SaaS/comments/eval_tool_fake/recommend_tools/",
      verified: true,
    })).toBe(false);
  });

  it("keeps Reddit JSON metrics exactly as supplied and never invents engagement", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("search.json")) {
        return Response.json({
          data: {
            children: [{
              data: {
                id: "abc123",
                title: "Recommend an SAP S/4HANA migration partner",
                selftext: "We need help with an SAP implementation and S/4HANA migration.",
                permalink: "/r/SAP/comments/abc123/recommend_an_sap_partner/",
                subreddit_name_prefixed: "r/SAP",
                author: "enterprise_buyer",
                created_utc: 1_788_220_800,
                ups: 0,
                num_comments: 0,
              },
            }],
          },
        });
      }
      return new Response("<rss></rss>", { status: 200, headers: { "Content-Type": "application/xml" } });
    }));

    const candidates = await discoverRedditCandidates([{
      id: "test-query",
      query: "SAP S/4HANA migration partner",
      family: "recommendation_buying",
      label: "SAP migration partner",
      priority: "high",
      expectedIntent: "RECOMMENDATION_REQUEST",
    }], []);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toEqual(expect.objectContaining({
      id: "abc123",
      score: 0,
      numComments: 0,
      verified: true,
      discoverySource: "Reddit public JSON API",
    }));
  });

  it("drops Reddit-looking indexed URLs whose post identity cannot be verified", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("search.json")) return Response.json({ data: { children: [] } });
      const fakeFeed = `<entry><title>Looking for recommendations</title><link href="https://www.reddit.com/r/SaaS/comments/eval_tool_fake/recommend_tools/"/><updated>2026-09-01T00:00:00Z</updated><content>Need a modern platform</content></entry>`;
      return new Response(fakeFeed, { status: 200, headers: { "Content-Type": "application/xml" } });
    }));

    const candidates = await discoverRedditCandidates([{
      id: "test-query",
      query: "recommend a tool",
      family: "recommendation_buying",
      label: "Recommend a tool",
      priority: "high",
      expectedIntent: "RECOMMENDATION_REQUEST",
    }], []);

    expect(candidates).toEqual([]);
  });

  it("generates a dynamic Search Map containing all 7 query families", () => {
    const searchMap = generateRedditSearchMap(mockMemory);

    expect(searchMap.queryFamilies.direct_product.length).toBeGreaterThan(0);
    expect(searchMap.queryFamilies.recommendation_buying.length).toBeGreaterThan(0);
    expect(searchMap.queryFamilies.pain_problem.length).toBeGreaterThan(0);
    expect(searchMap.queryFamilies.competitor.length).toBeGreaterThan(0);
    expect(searchMap.queryFamilies.jobs_to_be_done.length).toBeGreaterThan(0);
    expect(searchMap.queryFamilies.comparison.length).toBeGreaterThan(0);
    expect(searchMap.queryFamilies.broader_icp.length).toBeGreaterThan(0);
    expect(searchMap.allQueries.length).toBeGreaterThanOrEqual(15);
    expect(searchMap.prioritySubreddits).toContain("r/SEO");
  });

  it("routes SAP companies to SAP communities instead of generic web development", () => {
    const sapMemory: CompanyMemory = {
      ...mockMemory,
      companyName: "Praeemineo",
      category: "SAP Consulting & Enterprise Transformation",
      description: "SAP implementation, S/4HANA migration, upgrades, optimization, and managed services.",
      productsAndServices: ["SAP implementation", "S/4HANA migration", "SAP managed services"],
      featuresAndCapabilities: ["SAP optimization", "ERP transformation"],
      primaryKeywords: ["sap implementation", "s/4hana migration"],
      secondaryKeywords: ["sap managed services"],
    };

    const searchMap = generateRedditSearchMap(sapMemory);
    expect(searchMap.prioritySubreddits).toContain("r/SAP");
    expect(searchMap.prioritySubreddits).toContain("r/ERP");
    expect(searchMap.prioritySubreddits).not.toContain("r/webdev");
  });

  it("extracts evidence-backed service offers from company intelligence tables", () => {
    const markdown = `| Element | Evidence |\n|---|---|\n| **Core Offer** | ABM, Inbound Marketing, Marketing Automation, SEO/AEO/GEO, RevOps, HubSpot services – homepage & service links |`;
    expect(extractLabeledOfferStack(markdown)).toEqual([
      "ABM",
      "Inbound Marketing",
      "Marketing Automation",
      "SEO/AEO/GEO",
      "RevOps",
      "HubSpot services",
    ]);
  });

  it("uses service-buyer language for agencies instead of pretending they are software tools", () => {
    const searchMap = generateRedditSearchMap(mockMemory);
    const directQueries = searchMap.queryFamilies.direct_product.map((query) => query.query.toLowerCase());
    const recommendationQueries = searchMap.queryFamilies.recommendation_buying.map((query) => query.query.toLowerCase());
    expect(directQueries).toContain("full-funnel demand generation agency");
    expect(recommendationQueries).toContain("who should i hire for full-funnel demand generation");
    expect([...directQueries, ...recommendationQueries].every((query) => !query.includes(" software"))).toBe(true);
  });

  it("filters out promotional spam, duplicates, and processed opportunities deterministically", () => {
    const rawCandidates = [
      {
        id: "abc123",
        url: "https://reddit.com/r/SEO/comments/abc123/good_tool",
        subreddit: "r/SEO",
        title: "Looking for best automated client SEO reporting tool for agency",
        excerpt: "We spend 5 hours per client on manual SEO audits. Any good tools?",
        author: "seo_guy",
        publishedAt: new Date().toISOString(),
        score: 25,
        numComments: 14,
        query: "best SEO audit tool",
        queryFamily: "direct_product",
        discoverySource: "Reddit RSS",
        verified: true,
      },
      {
        // Duplicate URL
        id: "abc123",
        url: "https://reddit.com/r/SEO/comments/abc123/good_tool",
        subreddit: "r/SEO",
        title: "Looking for best automated client SEO reporting tool for agency",
        excerpt: "We spend 5 hours per client on manual SEO audits. Any good tools?",
        author: "seo_guy",
        publishedAt: new Date().toISOString(),
        score: 25,
        numComments: 14,
        query: "best SEO audit tool",
        queryFamily: "direct_product",
        discoverySource: "Reddit RSS",
        verified: true,
      },
      {
        // Promotional spam
        id: "def456",
        url: "https://reddit.com/r/SEO/comments/def456/spam",
        subreddit: "r/SEO",
        title: "Use my discount code for cheap backlinks now!",
        excerpt: "Get 50% discount code with affiliate link dm me for price",
        author: "spammer",
        publishedAt: new Date().toISOString(),
        score: 1,
        numComments: 0,
        query: "SEO audit tool",
        queryFamily: "direct_product",
        discoverySource: "Reddit RSS",
        verified: true,
      },
    ];

    const processedIds = new Set<string>(["cand-999"]);
    const filtered = runDeterministicPreFilter(rawCandidates, mockMemory, processedIds);

    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("abc123");
  });

  it("rejects invented Reddit identities and unrelated verified threads", () => {
    const invented = {
      id: "reddit-rec-acme",
      url: "https://www.reddit.com/r/SEO/comments/eval_tool_fake/recommend_tools/",
      verified: true,
    };
    expect(hasVerifiedRedditIdentity(invented)).toBe(false);

    const unrelated = [{
      id: "xyz789",
      url: "https://www.reddit.com/r/webdev/comments/xyz789/javascript_local_environment/",
      subreddit: "r/webdev",
      title: "Best practices for a JavaScript local development environment",
      excerpt: "How are frontend developers configuring package managers and local servers?",
      author: "developer",
      publishedAt: new Date().toISOString(),
      score: 20,
      numComments: 12,
      query: "software workflow",
      queryFamily: "direct_product",
      discoverySource: "Reddit public JSON API",
      verified: true,
    }];
    expect(runDeterministicPreFilter(unrelated, mockMemory, new Set())).toEqual([]);
  });

  it("keeps a slightly relevant real thread as a low-score monitoring opportunity", () => {
    const candidate = {
      id: "abm789",
      url: "https://www.reddit.com/r/marketing/comments/abm789/enterprise_abm_advice/",
      subreddit: "r/marketing",
      title: "Has anyone here tried ABM recently?",
      excerpt: "Curious about practitioner experiences and lessons.",
      author: "b2b_marketer",
      publishedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
      score: null,
      numComments: null,
      query: "ABM agency",
      queryFamily: "broader_icp",
      discoverySource: "Reddit public RSS search feed",
      verified: true,
    };
    const filtered = runDeterministicPreFilter([candidate], mockMemory, new Set());
    expect(filtered).toHaveLength(1);
    const evaluated = evaluateRedditOpportunity(filtered[0], mockMemory);
    expect(evaluated.score.total).toBeLessThan(65);
    expect(evaluated.recommendedAction).toBe("MONITOR");
    expect(qualifyRedditOpportunities([evaluated])).toHaveLength(1);
  });

  it("does not inflate generic marketing hiring discussions into buying intent", () => {
    const candidate = {
      id: "hire789",
      url: "https://www.reddit.com/r/marketing/comments/hire789/recruiter_marketing_ama/",
      subreddit: "r/marketing",
      title: "Recruiter AMA about marketing candidates and hiring teams",
      excerpt: "Ask about resumes, interviews, careers, or how internal hiring decisions get made.",
      author: "marketing_recruiter",
      publishedAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
      score: null,
      numComments: null,
      query: "B2B marketing agency",
      queryFamily: "broader_icp",
      discoverySource: "Reddit public RSS search feed",
      verified: true,
      passedPreFilter: true as const,
    };
    const evaluated = evaluateRedditOpportunity(candidate, mockMemory);
    expect(evaluated.intent).toBe("CONTENT_SIGNAL");
    expect(evaluated.score.total).toBeLessThan(65);
    expect(evaluated.recommendedAction).toBe("MONITOR");
  });

  it("calculates explainable 8-factor score and classifies intent correctly", () => {
    const candidate = {
      id: "opp-rec-1",
      url: "https://reddit.com/r/agency/comments/789/recommend_tool",
      subreddit: "r/agency",
      title: "Recommend an SEO audit and client reporting tool for growing digital agencies",
      excerpt: "Screaming Frog is too manual for multi-client workflows. We need white-label automated reporting.",
      author: "agency_lead",
      publishedAt: new Date().toISOString(),
      score: 35,
      numComments: 20,
      query: "recommend an SEO tool",
      queryFamily: "recommendation_buying",
      discoverySource: "Reddit JSON",
      verified: true,
      passedPreFilter: true as const,
    };

    const evaluated = evaluateRedditOpportunity(candidate, mockMemory);

    expect(evaluated.intent).toBe("RECOMMENDATION_REQUEST");
    expect(evaluated.score.total).toBeGreaterThanOrEqual(80);
    expect(evaluated.score.intent).toBe(24);
    expect(evaluated.score.tier).toMatch(/high|exceptional/);
    expect(evaluated.recommendedAction).toBe("DIRECT_RECOMMENDATION");
    expect(evaluated.evidence.length).toBeGreaterThanOrEqual(4);
    expect(evaluated.spamRisk).toBeLessThan(0.3);
  });

  it("generates 3 distinct reply variants (Helpful, Conversational, Product-Aware)", () => {
    const candidate = {
      id: "opp-rec-1",
      url: "https://reddit.com/r/agency/comments/789/recommend_tool",
      subreddit: "r/agency",
      title: "Recommend an SEO audit and client reporting tool for growing digital agencies",
      excerpt: "Screaming Frog is too manual for multi-client workflows. We need white-label automated reporting.",
      author: "agency_lead",
      publishedAt: new Date().toISOString(),
      score: 35,
      numComments: 20,
      query: "recommend an SEO tool",
      queryFamily: "recommendation_buying",
      discoverySource: "Reddit JSON",
      verified: true,
      passedPreFilter: true as const,
    };

    const evaluated = evaluateRedditOpportunity(candidate, mockMemory);
    const variants = generateRedditReplyVariants(evaluated, mockMemory);

    expect(variants.length).toBe(3);
    expect(variants[0].tone).toBe("helpful");
    expect(variants[1].tone).toBe("conversational");
    expect(variants[2].tone).toBe("product_aware");
    expect(variants[2].text).toContain("The Smarketers");
    expect(variants[2].text).toMatch(/disclosure/i);
  });

  it("clusters recurring signals across discussions for cross-agent intelligence", () => {
    const signals: MarketSignal[] = [
      {
        id: "sig-1",
        source: "reddit",
        type: "customer_pain",
        topic: "manual reporting bottleneck",
        strength: 0.9,
        evidence: ["SEO reporting takes too long in r/agency"],
        createdAt: new Date().toISOString(),
      },
      {
        id: "sig-2",
        source: "reddit",
        type: "customer_pain",
        topic: "manual reporting bottleneck",
        strength: 0.85,
        evidence: ["Hours spent on manual client reports in r/SEO"],
        createdAt: new Date().toISOString(),
      },
      {
        id: "sig-3",
        source: "reddit",
        type: "competitor_dissatisfaction",
        topic: "screaming frog pricing",
        strength: 0.8,
        evidence: ["Screaming Frog license limits"],
        createdAt: new Date().toISOString(),
      },
    ];

    const clusters = clusterSignals(signals);
    const reportingCluster = clusters.find((c) => c.topic === "manual reporting bottleneck");

    expect(reportingCluster).toBeDefined();
    expect(reportingCluster?.signals.length).toBe(2);
    expect(reportingCluster?.totalStrength).toBeGreaterThan(0.8);
  });

  it("shifts 100% to company-specific niche (e.g. Shopify / Ecommerce) and avoids generic SEO", () => {
    const ecommerceMemory: CompanyMemory = {
      companyName: "InventorySync Pro",
      websiteUrl: "https://inventorysyncpro.io",
      category: "Shopify Multi-Channel Inventory Management",
      description: "Real-time inventory synchronization across Shopify, Amazon, and eBay stores.",
      tagline: "Automated e-commerce inventory sync",
      productsAndServices: [
        "Real-Time Shopify Inventory Sync",
        "Multi-Store Warehouse Tracking",
        "Automated Stock Level Alerts",
      ],
      featuresAndCapabilities: [
        "Instant webhook updates",
        "Zero overselling stock locks",
      ],
      icpsAndPersonas: [
        {
          title: "Multi-Store Shopify Merchant",
          role: "Ecommerce Operations Director",
          description: "Runs multiple 7-figure Shopify stores selling across channels.",
          painPoints: ["Overselling stock when sales spike on TikTok and Shopify simultaneously"],
        },
      ],
      painPoints: [
        "Overselling stock across multiple Shopify stores",
        "Manual CSV inventory updates take 10+ hours a week",
      ],
      jobsToBeDone: [
        "Sync stock levels between Shopify and Amazon in under 3 seconds",
      ],
      useCases: ["Multi-store Shopify stock sync"],
      differentiators: [
        "Sub-second sync latency",
        "Native Shopify POS integration",
      ],
      competitors: [
        { name: "Stitch Labs", website: "https://stitchlabs.com" },
        { name: "Sellbrite", website: "https://sellbrite.com" },
      ],
      positioning: "The fastest real-time inventory sync platform for high-volume Shopify merchants.",
      primaryKeywords: ["shopify inventory sync", "multi store stock sync", "inventory management app"],
      secondaryKeywords: ["stitch labs alternative", "sellbrite alternative"],
      brandVoice: {
        tone: "Practical, merchant-first, concise.",
        principles: ["Direct answers", "Disclose affiliation clearly"],
        allowedClaims: ["Sub-second sync"],
        forbiddenPhrases: ["Best ever"],
      },
    };

    const searchMap = generateRedditSearchMap(ecommerceMemory);

    // Subreddits should reflect ecommerce & Shopify, NOT SEO
    expect(searchMap.prioritySubreddits).toContain("r/shopify");
    expect(searchMap.prioritySubreddits).toContain("r/ecommerce");

    // All queries must be ecommerce-specific
    const allQueryTexts = searchMap.allQueries.map((q) => q.query.toLowerCase()).join(" ");
    expect(allQueryTexts).toContain("shopify");
    expect(allQueryTexts).toContain("inventory");
    expect(allQueryTexts).not.toContain("seo audit");
    expect(allQueryTexts).not.toContain("screaming frog");
  });

  it("strictly rejects anti-ICP noise threads (career seekers, students, consumer laptops) in pre-filter", () => {
    const candidates = [
      {
        id: "job-seeker-1",
        url: "https://www.reddit.com/r/marketing/comments/job1/first_marketing_job/",
        subreddit: "r/marketing",
        title: "How do I get my first marketing job? Resume review appreciated",
        excerpt: "Graduating soon, looking for entry level job in B2B demand generation.",
        author: "college_student",
        publishedAt: new Date().toISOString(),
        score: 10,
        numComments: 8,
        query: "B2B marketing",
        queryFamily: "broader_icp",
        discoverySource: "Reddit RSS",
        verified: true,
      },
      {
        id: "student-homework-1",
        url: "https://www.reddit.com/r/marketing/comments/stud1/college_course_help/",
        subreddit: "r/marketing",
        title: "College student asking about marketing degree vs certifications",
        excerpt: "Need assignment help and university course advice on digital marketing.",
        author: "undergrad",
        publishedAt: new Date().toISOString(),
        score: 5,
        numComments: 3,
        query: "digital marketing",
        queryFamily: "broader_icp",
        discoverySource: "Reddit RSS",
        verified: true,
      },
      {
        id: "consumer-laptop-1",
        url: "https://www.reddit.com/r/marketing/comments/laptop1/best_laptop_for_marketing/",
        subreddit: "r/marketing",
        title: "What is the best laptop for college studying marketing?",
        excerpt: "Looking for recommendations on a MacBook or ThinkPad for my marketing classes.",
        author: "student_buyer",
        publishedAt: new Date().toISOString(),
        score: 15,
        numComments: 12,
        query: "best marketing tool",
        queryFamily: "direct_product",
        discoverySource: "Reddit RSS",
        verified: true,
      },
      {
        id: "portfolio-promo-1",
        url: "https://www.reddit.com/r/marketing/comments/port1/feedback_on_portfolio/",
        subreddit: "r/marketing",
        title: "Feedback on my portfolio / roast my website - freelance marketer",
        excerpt: "Check out my portfolio and tell me if my freelance rate is too high.",
        author: "freelancer",
        publishedAt: new Date().toISOString(),
        score: 8,
        numComments: 6,
        query: "marketing agency",
        queryFamily: "direct_product",
        discoverySource: "Reddit RSS",
        verified: true,
      },
      {
        id: "buyer123",
        url: "https://www.reddit.com/r/marketing/comments/buyer123/hire_abm_agency/",
        subreddit: "r/marketing",
        title: "We are looking to hire an agency for full-funnel demand generation and ABM",
        excerpt: "Our B2B SaaS pipeline needs a dedicated partner to scale enterprise accounts.",
        author: "saas_cmo",
        publishedAt: new Date().toISOString(),
        score: 30,
        numComments: 15,
        query: "hire an agency for full-funnel demand generation",
        queryFamily: "recommendation_buying",
        discoverySource: "Reddit RSS",
        verified: true,
      },
    ];

    const filtered = runDeterministicPreFilter(candidates, mockMemory, new Set());
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("buyer123");
  });

  it("disqualifies threads without verified ICP fit from qualifying for the action feed", () => {
    const genericDiscussion = {
      id: "gen12345",
      url: "https://www.reddit.com/r/marketing/comments/gen12345/future_of_marketing/",
      subreddit: "r/marketing",
      title: "What is everyone's thoughts on the future of marketing workflows?",
      excerpt: "Just curious how people feel about industry trends in general without any specific tooling.",
      author: "casual_poster",
      publishedAt: new Date().toISOString(),
      score: 10,
      numComments: 5,
      query: "marketing workflow",
      queryFamily: "broader_icp",
      discoverySource: "Reddit JSON",
      verified: true,
      passedPreFilter: true as const,
    };

    const evaluated = evaluateRedditOpportunity(genericDiscussion, mockMemory);
    expect(evaluated.score.icpFit).toBeLessThan(7);
    expect(evaluated.evidence).toContain("⚠ No verified alignment with target ICP personas");

    const qualified = qualifyRedditOpportunities([evaluated]);
    expect(qualified).toHaveLength(0);
  });

  it("qualifies authentic buyer ICP opportunities with high ICP fit scores and verified evidence", () => {
    const agencyBuyer = {
      id: "agency123",
      url: "https://www.reddit.com/r/agency/comments/agency123/client_reporting_tool/",
      subreddit: "r/agency",
      title: "Our digital agency is looking for an automated SEO client reporting tool",
      excerpt: "We manage 25 clients and spending 5+ hours per client on manual SEO audits is killing us. Need white-label alternatives.",
      author: "agency_owner_mike",
      publishedAt: new Date().toISOString(),
      score: 45,
      numComments: 22,
      query: "client reporting tool for agency",
      queryFamily: "recommendation_buying",
      discoverySource: "Reddit JSON",
      verified: true,
      passedPreFilter: true as const,
    };

    const evaluated = evaluateRedditOpportunity(agencyBuyer, mockMemory);
    expect(evaluated.score.icpFit).toBeGreaterThanOrEqual(14);
    expect(evaluated.matchedIcp).toBe("B2B Marketing Agency Owner");
    expect(evaluated.evidence[0]).toBe("✓ Aligns with target ICP: B2B Marketing Agency Owner");
    expect(evaluated.recommendedAction).toBe("DIRECT_RECOMMENDATION");

    const qualified = qualifyRedditOpportunities([evaluated]);
    expect(qualified).toHaveLength(1);
    expect(qualified[0].score.total).toBeGreaterThanOrEqual(80);
  });
});
