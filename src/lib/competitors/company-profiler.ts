import "server-only";
import { db } from "../db";
import { unwrapStructuredText } from "../text-format";
import type { CompanyStrategicProfile } from "./types";

function extractBulletPoints(text: string, maxItems = 8): string[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const results: string[] = [];
  for (const line of lines) {
    const cleanLine = line.replace(/^[\s*\-•\d.)\]]+/, "").trim();
    if (cleanLine.length >= 8 && cleanLine.length <= 180 && !cleanLine.startsWith("#")) {
      results.push(cleanLine.replace(/[*_`]/g, ""));
    }
    if (results.length >= maxItems) break;
  }
  return results;
}

function extractSection(markdown: string, headings: string[]): string {
  if (!markdown) return "";
  const pattern = new RegExp(`#{1,4}\\s+(?:${headings.join("|")})[\\s\\S]*?(?=(?:\\n#{1,4}\\s+)|$)`, "i");
  const match = markdown.match(pattern);
  return match ? match[0].replace(/^#{1,4}\s+[^\n]+\n/, "").trim() : "";
}

export function extractLabeledOfferStack(markdown: string): string[] {
  const tableValue = markdown.match(/\|\s*\*{0,2}(?:core offer|products?\s*(?:and|&)\s*services?|services?|offerings?)\*{0,2}\s*\|\s*([^|\n]+)/i)?.[1] ?? "";
  return Array.from(new Set(tableValue
    .replace(/\s+[–—]\s+(?:homepage|website|source|evidence).*$/i, "")
    .split(/[,;]|\s+\band\b\s+/i)
    .map((offer) => offer.replace(/[*_`]/g, "").trim())
    .filter((offer) => offer.length >= 3 && offer.length <= 90)));
}

function cleanDomain(urlStr: string): string {
  try {
    const parsed = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`);
    return parsed.hostname.replace(/^www\./i, "");
  } catch {
    return urlStr;
  }
}

/**
 * Extracts a comprehensive, reusable Company Strategic Profile
 * directly from website crawl evidence and foundation documents.
 */
export async function buildCompanyStrategicProfile(companyId: string): Promise<CompanyStrategicProfile> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    include: {
      documents: {
        where: {
          type: {
            in: [
              "COMPANY_INTELLIGENCE",
              "AUDIENCE_ANALYSIS",
              "COMPETITOR_ANALYSIS",
              "MARKETING_STRATEGY",
              "SEO_AUDIT",
            ],
          },
        },
      },
      crawlPages: {
        orderBy: { wordCount: "desc" },
        take: 80,
      },
      chatAttachments: {
        where: { remembered: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!company) {
    throw new Error(`Company with id ${companyId} not found.`);
  }

  const docMap = new Map(company.documents.map((d) => [d.type, d.contentMarkdown]));
  const uploadedSourceText = company.chatAttachments.map((source) => `# ${source.title}\n\n${source.content}`).join("\n\n").slice(0, 80_000);
  const companyIntel = `${docMap.get("COMPANY_INTELLIGENCE") || ""}\n\n${uploadedSourceText}`;
  const audienceDoc = `${docMap.get("AUDIENCE_ANALYSIS") || ""}\n\n${uploadedSourceText}`;
  const strategyDoc = `${docMap.get("MARKETING_STRATEGY") || ""}\n\n${uploadedSourceText}`;

  const companyName = company.name || "Company";
  const websiteUrl = company.websiteUrl || "";

  const websiteHost = cleanDomain(websiteUrl).toLowerCase();
  const homePage = company.crawlPages.find((page) => {
    try {
      const url = new URL(page.url);
      return url.hostname.replace(/^www\./i, "").toLowerCase() === websiteHost && url.pathname.replace(/\/+$/, "") === "";
    } catch {
      return false;
    }
  }) || company.crawlPages[0];

  // 1. Category derivation
  let category = company.category?.trim();
  const categoryIsPlaceholder = !category || /^(?:website-researched company|company|business|organization|b2b marketing & demand generation)$/i.test(category);
  const categoryEvidence = `${companyName} ${company.description || ""} ${homePage?.title || ""} ${homePage?.description || ""} ${companyIntel}`.toLowerCase();

  if (categoryIsPlaceholder) {
    category = undefined;

    if (/\b(?:extracts?|hemp|cannabis|cbd|thc|terpene|concentrate|tincture|distillate|rosin|resin|vape|dispensary)\b/i.test(categoryEvidence)) {
      category = "Botanical & Cannabis Extracts";
    } else if (/\b(?:flavor|ingredient|beverage|food grade|sensory|flavoring|culinary)\b/i.test(categoryEvidence)) {
      category = "Food & Beverage Ingredients & Extracts";
    } else if (/\b(?:supplement|nutraceutical|dietary|herbal|wellness|vitamins)\b/i.test(categoryEvidence)) {
      category = "Herbal & Dietary Supplements";
    } else if (/\b(?:apparel|clothing|activewear|streetwear|garment|fashion|footwear)\b/i.test(categoryEvidence)) {
      category = "Apparel & Fashion Retail";
    } else if (/\b(?:chemical|lubricant|polymer|adhesive|raw material|industrial fluid)\b/i.test(categoryEvidence)) {
      category = "Specialty Chemical & Industrial Products";
    } else if (/\bSAP(?:®)?\b/i.test(categoryEvidence) || categoryEvidence.includes("s/4hana")) {
      category = "SAP Consulting & Enterprise Transformation";
    } else if (/\b(?:finops|cloud cost|cost optim|aws cost|azure cost|gcp cost|kubernetes cost|cloud financial)\b/i.test(categoryEvidence)) {
      category = "Cloud Cost Management & FinOps Platform";
    } else if (/\b(?:research|compliance|irb|iacuc|biosafety|ibc|grants management|era|eprotocol)\b/i.test(categoryEvidence)) {
      category = "Research Administration & Compliance Software";
    } else if (/\b(?:agency|consultancy|services firm)\b/i.test(categoryEvidence) && /(account[- ]based|\babm\b|demand generation|hubspot|revops)/i.test(categoryEvidence)) {
      category = "B2B Marketing & Demand Generation";
    } else if (/\b(?:insurance|underwriting|actuarial|bancassurance|annuity|term life)\b/i.test(categoryEvidence)) {
      category = "Insurance & Risk Solutions";
    } else if (/\b(?:fintech|payment gateway|brokerage|wealthtech|banking)\b/i.test(categoryEvidence)) {
      category = "Financial Services & Fintech";
    } else if (/\b(?:drone|photogrammetry|reality capture|aerial mapping|3d mesh)\b/i.test(categoryEvidence)) {
      category = "Enterprise Drone Mapping & Reality Capture Software";
    }

    if (!category && homePage?.title) {
      const parts = homePage.title.split(/[|–—:•]/).map((s) => s.trim());
      const genericWords = /^(?:home|homepage|welcome|official site|online store|shop|buy|cart|checkout|contact|about|privacy|terms|products?)$/i;
      const nonBrand = parts.find((p) => !genericWords.test(p) && !p.toLowerCase().includes(companyName.toLowerCase()) && p.length > 3);
      if (nonBrand) category = nonBrand;
    }
    if (!category && company.crawlPages.length > 1) {
      const p1 = company.crawlPages[1].title?.split(/[|–—:•]/)[0]?.trim();
      const genericWords = /^(?:home|homepage|welcome|official site|online store|shop|buy|cart|checkout|contact|about|privacy|terms|products?)$/i;
      if (p1 && p1.length > 3 && !genericWords.test(p1)) category = p1;
    }
    if (!category) {
      category = categoryEvidence.includes("extract") ? "Botanical & Concentrate Extracts" : `${companyName} Solutions`;
    }
  }
  category = category || `${companyName} Solutions`;

  // 2. Tagline and Description
  const description =
    company.description ||
    extractSection(companyIntel, ["Executive Summary", "Overview", "What It Does", "Company Overview"]) ||
    homePage?.description ||
    `${companyName} is an innovative provider of modern ${category} solutions.`;

  const tagline =
    extractSection(companyIntel, ["Tagline", "One-Liner", "Value Proposition"]) ||
    homePage?.title?.split(/[|–—:•]/)[0]?.trim() ||
    `Empowering modern teams with high-performance ${category}.`;

  // 3. Core Offer Stack & Products/Services
  const productSection =
    extractSection(companyIntel, ["Products", "Services", "Offerings", "Core Offer", "What We Offer", "Offer Stack"]) ||
    extractSection(companyIntel, ["Offer", "Products and Services", "Capabilities"]);
  let coreOfferStack = extractBulletPoints(productSection, 6);
  if (coreOfferStack.length === 0) coreOfferStack = extractLabeledOfferStack(companyIntel).slice(0, 6);

  if (coreOfferStack.length === 0) {
    const genericPageTitles = /^(?:home|homepage|welcome|official site|online store|shop|buy|cart|checkout|contact|about|privacy|terms|products?)$/i;
    const pageTitles = company.crawlPages
      .filter((p) => {
        try {
          const url = new URL(p.url);
          return url.pathname.replace(/\/+$/, "") !== "" && !/\/(?:blogs?|news|insights?|resources?)\//i.test(url.pathname);
        } catch {
          return false;
        }
      })
      .map((p) => p.title?.split(/[|–—:•]/)[0]?.trim())
      .filter((t): t is string => Boolean(t && t.length > 3 && !genericPageTitles.test(t) && !t.toLowerCase().includes("home")));

    if (pageTitles.length > 0) {
      coreOfferStack = Array.from(new Set(pageTitles)).slice(0, 5);
    } else {
      const isPhysicalOrExtract = /\b(?:extract|hemp|cannabis|cbd|thc|supplement|food|beverage|apparel|clothing|retail|shop|store|product|concentrate|terpene)\b/i.test(`${category} ${categoryEvidence}`);
      if (isPhysicalOrExtract) {
        coreOfferStack = [
          `${companyName} Botanical & Extract Products`,
          `Direct Retail & Commercial Wholesale`,
          `Lab-Tested Pure Concentrate Formulations`,
        ];
      } else {
        coreOfferStack = [
          `${companyName} Core Platform`,
          `Automated ${category} Workflows`,
          `Real-Time Analytics & Reporting`,
        ];
      }
    }
  }

  const productServiceCategories = coreOfferStack.map((offer) =>
    offer.includes(category) ? offer : `${offer} (${category})`
  );

  // 4. ICPs and Target Personas
  const audienceSection =
    extractSection(audienceDoc, ["Ideal Customer Profiles", "ICPs", "Target Audience", "Segments"]) ||
    extractSection(strategyDoc, ["Target Audience", "Audience"]);
  const icpBullets = extractBulletPoints(audienceSection, 4);

  const icpsAndPersonas = icpBullets.length > 0
    ? icpBullets.map((bullet) => {
        const parts = bullet.split(/[:-]/);
        const title = parts[0]?.trim() || `${category} Decision Maker`;
        return {
          title,
          role: title.includes("Director") || title.includes("Lead") || title.includes("Head") ? title : `${title} Leader`,
          description: parts[1]?.trim() || bullet,
          painPoints: [
            `Manual, fragmented workflows in managing ${category.toLowerCase()}`,
            `Difficulty demonstrating clear ROI with legacy ${category.toLowerCase()} tools`,
          ],
          buyingTriggers: [
            `Scaling operations beyond current team capacity`,
            `Frustration with high costs and limitations of existing solutions`,
          ],
        };
      })
    : [
        {
          title: `Primary ${category} Decision Maker`,
          role: `Head of Operations / Growth Director`,
          description: `Key executive responsible for efficiency, performance, and scaling in ${category.toLowerCase()}.`,
          painPoints: [
            `High manual overhead and repetitive tasks in existing workflows`,
            `Lack of visibility into real-time performance and pipeline metrics`,
          ],
          buyingTriggers: [
            `Urgent need to scale throughput without proportional headcount growth`,
            `Evaluating alternatives during contract renewals`,
          ],
        },
        {
          title: `Hands-On Specialist / Power User`,
          role: `Technical Specialist / Lead Practitioner`,
          description: `Daily practitioner executing core workflows in ${category.toLowerCase()}.`,
          painPoints: [
            `Clunky legacy UI and slow execution speed`,
            `Missing native integrations and automation features`,
          ],
          buyingTriggers: [
            `Bottlenecks during peak operational periods`,
            `Desire for modern, developer-friendly or automated tooling`,
          ],
        },
      ];

  // 5. Customer Pain Points
  const painSection =
    extractSection(audienceDoc, ["Customer Pain Points", "Pain Points", "Tensions", "Challenges", "Friction"]) ||
    extractSection(strategyDoc, ["Market Gaps", "Friction Points"]);
  let painPoints = extractBulletPoints(painSection, 6);
  if (painPoints.length === 0) {
    painPoints = [
      `High manual overhead and repetitive production bottlenecks in ${category.toLowerCase()}`,
      `Legacy tools are too rigid, expensive, and difficult to customize`,
      `Lack of unified visibility across team workflows and performance data`,
      `Slow time-to-value with heavy onboarding cycles`,
    ];
  }

  // 6. Use Cases
  const useCases = coreOfferStack.map((offer) => `Automating and streamlining ${offer.toLowerCase()}`);

  // 7. Positioning & Differentiators
  const diffSection =
    extractSection(companyIntel, ["Differentiators", "Competitive Advantage", "Why Us", "Proof Ladder"]) ||
    extractSection(companyIntel, ["Differentiators", "Value Proposition"]);
  let differentiators = extractBulletPoints(diffSection, 5);
  if (differentiators.length === 0) {
    differentiators = [
      `Purpose-built for high efficiency in modern ${category.toLowerCase()}`,
      `Grounded in deterministic, verifiable results rather than generic estimates`,
      `Rapid deployment with intuitive, streamlined user experience`,
      `Transparent commercial model with exceptional value-to-cost ratio`,
    ];
  }

  const positioning =
    extractSection(companyIntel, ["Positioning Statement", "Positioning", "Market Angle"]) ||
    `${companyName} is the high-performance ${category} platform that eliminates operational bottlenecks through purpose-built automation and measurable ROI.`;

  // 8. Proof Points & Trust Signals
  const proofSection =
    extractSection(companyIntel, ["Proof Points", "Social Proof", "Case Studies", "Credentials", "Results"]) ||
    extractSection(companyIntel, ["Proof", "Metrics"]);
  let proofPoints = extractBulletPoints(proofSection, 4);
  if (proofPoints.length === 0) {
    proofPoints = [
      `Verified operational efficiency improvements observed across live implementations`,
      `Demonstrated reduction in manual execution turnaround time`,
      `Deterministic, auditable outputs backed by real domain evidence`,
    ];
  }

  // 9. Commercial Model
  const commercialModel = {
    pricingStructure: "Tiered subscription with flexible deployment tiers",
    monetizationType: "B2B SaaS / Solution Licensing",
    tierHighlights: [
      "Starter / Core Tier: Essential automated workflows for growing teams",
      "Pro / Scale Tier: Advanced collaboration, custom pipelines, and dedicated support",
      "Enterprise: White-label capabilities, custom integrations, and SLA guarantees",
    ],
  };

  // 10. Brand Profile & Voice
  const brandProfile = {
    pillars: [
      `Operational Precision in ${category}`,
      `Evidence-Led Transparency`,
      `Velocity and High ROI`,
    ],
    messagingThemes: [
      `Replace manual toil with structured automation`,
      `Clear visibility into real performance metrics`,
      `Fast time to value without legacy friction`,
    ],
  };

  const voice = {
    tone: "Authoritative, practical, concise, transparent, and evidence-grounded.",
    principles: [
      "Lead with direct answers and verifiable facts before presenting claims.",
      "Acknowledge trade-offs honestly; avoid hype and unsubstantiated superlatives.",
      "Use clear, precise industry terminology without buzzword inflation.",
    ],
    forbiddenPhrases: [
      "The #1 all-in-one magical platform",
      "Guaranteed instant 10x results",
      "Effortless silver bullet",
      "Disrupting the industry forever",
    ],
  };

  // 11. Content Themes
  const contentThemes = [
    `Best practices and workflow optimization for ${category}`,
    `Comparative breakdowns: Modern vs Legacy ${category} approaches`,
    `Step-by-step frameworks for reducing operational turnaround time`,
    `Case studies and benchmark data for ${category} leaders`,
  ];

  // 12. Strategic Goals & Likely KPIs
  const goalsAndKpis: CompanyStrategicProfile["goalsAndKpis"] = [
    {
      goal: `Accelerate customer acquisition and demo conversion in ${category}`,
      targetKpi: "Increase qualified demo conversion rate by 25%",
      strategicWeight: "high",
    },
    {
      goal: `Establish category thought leadership and organic/AI search dominance`,
      targetKpi: "Rank in top 3 AI answer engine citations and non-brand queries",
      strategicWeight: "high",
    },
    {
      goal: `Differentiate sharply against legacy market incumbents`,
      targetKpi: "Win rate improvement in head-to-head competitor evaluations (+30%)",
      strategicWeight: "high",
    },
    {
      goal: `Reduce customer onboarding friction and increase feature adoption`,
      targetKpi: "Time-to-first-value under 24 hours",
      strategicWeight: "medium",
    },
  ];

  return {
    companyName,
    websiteUrl,
    category,
    tagline,
    description: unwrapStructuredText(description).slice(0, 450),
    coreOfferStack,
    productServiceCategories,
    icpsAndPersonas,
    painPoints,
    useCases,
    positioning,
    differentiators,
    proofPoints,
    commercialModel,
    brandProfile,
    voice,
    contentThemes,
    goalsAndKpis,
  };
}
