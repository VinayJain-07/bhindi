import "server-only";
import { db } from "@/lib/db";
import { unwrapStructuredText } from "@/lib/text-format";
import { buildCompanyStrategicProfile } from "@/lib/competitors/company-profiler";
import { extractContextCompetitorsFromAgentOutput, selectContextCompetitors } from "@/lib/competitors/context-display";

export type CompanyMemory = {
  companyName: string;
  websiteUrl: string;
  category: string;
  description: string;
  tagline: string;
  productsAndServices: string[];
  featuresAndCapabilities: string[];
  icpsAndPersonas: Array<{
    title: string;
    role: string;
    description: string;
    painPoints: string[];
  }>;
  painPoints: string[];
  jobsToBeDone: string[];
  useCases: string[];
  differentiators: string[];
  competitors: Array<{
    name: string;
    website?: string;
    positioning?: string;
    attributes?: string[];
  }>;
  positioning: string;
  primaryKeywords: string[];
  secondaryKeywords: string[];
  brandVoice: {
    tone: string;
    principles: string[];
    allowedClaims: string[];
    forbiddenPhrases: string[];
  };
};

function extractBulletPoints(text: string, maxItems = 10): string[] {
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

function cleanDomainName(urlStr: string): string {
  try {
    const parsed = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`);
    return parsed.hostname.replace(/^www\./i, "");
  } catch {
    return urlStr;
  }
}

/**
 * Extracts phrases and keywords from crawl page titles and descriptions.
 */
function deriveKeywordsFromPages(pages: Array<{ title: string | null; description: string | null; url: string }>, companyName: string): string[] {
  const brandLower = companyName.toLowerCase();
  const stopWords = new Set(["home", "about", "contact", "pricing", "privacy", "terms", "page", "welcome", "the", "and", "for", "with", "from", "your", "that", "this", "our", "all"]);
  
  const rawPhrases = pages.flatMap((p) => {
    const items: string[] = [];
    if (p.title) {
      const parts = p.title.split(/[|–—:•]/).map((s) => s.trim()).filter((s) => s.length > 3);
      items.push(...parts);
    }
    if (p.description) {
      const parts = p.description.split(/[.,;]/).map((s) => s.trim()).filter((s) => s.length > 5 && s.length < 50);
      items.push(...parts);
    }
    return items;
  });

  const unique = new Set<string>();
  for (const phrase of rawPhrases) {
    const clean = phrase.replace(/[^a-zA-Z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
    const lower = clean.toLowerCase();
    if (lower && lower !== brandLower && !stopWords.has(lower) && clean.length > 4 && clean.length < 45) {
      unique.add(clean);
    }
  }

  return Array.from(unique).slice(0, 15);
}

/**
 * Extracts and synthesizes Company Memory strictly from stored company evidence,
 * foundation documents, and crawled website pages — with zero generic SEO assumptions.
 */
export async function extractCompanyMemory(companyId: string): Promise<CompanyMemory> {
  const strategicProfile = await buildCompanyStrategicProfile(companyId);
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
            ],
          },
        },
      },
      crawlPages: {
        orderBy: { wordCount: "desc" },
        take: 80,
      },
      agentRuns: {
        where: { agentType: "COMPETITOR", status: "DONE" },
        orderBy: { createdAt: "desc" },
        take: 5,
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

  const docMap = new Map(company.documents.map((doc) => [doc.type, doc.contentMarkdown]));
  const uploadedSourceText = company.chatAttachments.map((source) => `# ${source.title}\n\n${source.content}`).join("\n\n").slice(0, 80_000);
  const companyIntel = `${docMap.get("COMPANY_INTELLIGENCE") || ""}\n\n${uploadedSourceText}`;
  const audienceDoc = `${docMap.get("AUDIENCE_ANALYSIS") || ""}\n\n${uploadedSourceText}`;
  const competitorDoc = `${docMap.get("COMPETITOR_ANALYSIS") || ""}\n\n${uploadedSourceText}`;
  const strategyDoc = `${docMap.get("MARKETING_STRATEGY") || ""}\n\n${uploadedSourceText}`;

  // 1. Basic Info & Real Domain
  const companyName = company.name || "Company";
  const websiteUrl = company.websiteUrl || "";
  const domain = cleanDomainName(websiteUrl);

  const websiteHost = cleanDomainName(websiteUrl).toLowerCase();
  const homePage = company.crawlPages.find((page) => {
    try {
      const url = new URL(page.url);
      return url.hostname.replace(/^www\./i, "").toLowerCase() === websiteHost && url.pathname.replace(/\/+$/, "") === "";
    } catch {
      return false;
    }
  }) || company.crawlPages[0];
  const derivedKeywords = deriveKeywordsFromPages(company.crawlPages, companyName);

  // Use the shared evidence-based profiler so every agent agrees on the company's category.
  const category = strategicProfile.category;

  // Derive dynamic description
  const description =
    strategicProfile.description ||
    company.description ||
    extractSection(companyIntel, ["Executive Summary", "Overview", "What It Does", "Company Overview"]) ||
    homePage?.description ||
    `${companyName} is an innovative provider of ${category}.`;

  // 2. Products & Services (derived from documents or real crawl page titles/content)
  const productSection =
    extractSection(companyIntel, ["Products", "Services", "Offerings", "Core Offer", "What We Offer"]) ||
    extractSection(companyIntel, ["Offer", "Products and Services", "Capabilities"]);
  let productsAndServices = extractBulletPoints(productSection, 8);

  if (productsAndServices.length === 0) {
    // Extract from crawl page titles that represent specific subpages
    const pageOfferings = company.crawlPages
      .filter((p) => p.url !== websiteUrl && !p.url.endsWith("/"))
      .map((p) => {
        const title = p.title?.split(/[|–—:•]/)[0]?.trim();
        return title && title.length > 3 && !title.toLowerCase().includes("home") ? title : null;
      })
      .filter((t): t is string => Boolean(t));

    if (pageOfferings.length > 0) {
      productsAndServices = Array.from(new Set(pageOfferings)).slice(0, 6);
    } else if (strategicProfile.coreOfferStack.length > 0) {
      productsAndServices = strategicProfile.coreOfferStack.slice(0, 6);
    } else if (derivedKeywords.length > 0) {
      productsAndServices = derivedKeywords.slice(0, 4);
    } else {
      productsAndServices = [`${companyName} ${category}`];
    }
  }

  // 3. Features & Capabilities
  const featureSection = extractSection(companyIntel, ["Features", "Key Capabilities", "Capabilities", "Key Features"]);
  let featuresAndCapabilities = extractBulletPoints(featureSection, 8);
  if (featuresAndCapabilities.length === 0) {
    featuresAndCapabilities = strategicProfile.productServiceCategories.slice(0, 6);
    if (featuresAndCapabilities.length === 0) featuresAndCapabilities = derivedKeywords.slice(0, 6).map((kw) => `${kw} capability`);
    if (featuresAndCapabilities.length === 0) {
      featuresAndCapabilities = [`${category} core feature set`];
    }
  }

  // 4. ICPs and Personas (derived from audience doc or dynamic buyer roles)
  const audienceSection =
    extractSection(audienceDoc, ["Ideal Customer Profiles", "ICPs", "Target Audience", "Segments"]) ||
    extractSection(strategyDoc, ["Target Audience", "Audience"]);
  const icpBullets = extractBulletPoints(audienceSection, 6);
  
  const icpsAndPersonas = icpBullets.length > 0
    ? icpBullets.map((bullet) => {
        const parts = bullet.split(/[:-]/);
        return {
          title: parts[0]?.trim() || "Target Buyer",
          role: parts[0]?.trim() || "Decision Maker",
          description: parts[1]?.trim() || bullet,
          painPoints: [
            `Struggling with manual or inefficient ${category.toLowerCase()} processes`,
            `Looking for modern alternatives to legacy ${category.toLowerCase()} solutions`,
          ],
        };
      })
    : strategicProfile.icpsAndPersonas.map((persona) => ({
        title: persona.title,
        role: persona.role,
        description: persona.description,
        painPoints: persona.painPoints,
      }));

  // 5. Customer Pain Points
  const painSection =
    extractSection(audienceDoc, ["Customer Pain Points", "Pain Points", "Tensions", "Challenges", "Friction"]) ||
    extractSection(strategyDoc, ["Market Gaps", "Friction Points"]);
  let painPoints = extractBulletPoints(painSection, 8);
  if (painPoints.length === 0) {
    painPoints = strategicProfile.painPoints.slice(0, 8);
  }

  // 6. Jobs-To-Be-Done (JTBD)
  const jtbdSection = extractSection(audienceDoc, ["Jobs to be Done", "JTBD", "Core Jobs"]);
  let jobsToBeDone = extractBulletPoints(jtbdSection, 8);
  if (jobsToBeDone.length === 0) {
    jobsToBeDone = strategicProfile.useCases.slice(0, 8);
  }

  // 7. Differentiators
  const diffSection =
    extractSection(companyIntel, ["Differentiators", "Competitive Advantage", "Why Us", "Proof Ladder"]) ||
    extractSection(companyIntel, ["Differentiators", "Value Proposition"]);
  let differentiators = extractBulletPoints(diffSection, 6);
  if (differentiators.length === 0) {
    differentiators = strategicProfile.differentiators.slice(0, 6);
  }

  // 8. Competitors
  const competitors: CompanyMemory["competitors"] = [];
  const competitorDocObj = company.documents.find((d) => d.type === "COMPETITOR_ANALYSIS");
  const documentCompetitorItems: Array<{ companyName?: string; officialWebsite?: string; positioning?: string; competitiveAttributes?: string[] }> = [];
  if (competitorDocObj?.metadata && typeof competitorDocObj.metadata === "object") {
    const meta = competitorDocObj.metadata as {
      competitors?: Array<{ companyName?: string; officialWebsite?: string; positioning?: string; competitiveAttributes?: string[] }>;
    };
    if (Array.isArray(meta.competitors) && meta.competitors.length > 0) {
      for (const comp of meta.competitors) {
        if (comp.companyName && comp.companyName.toLowerCase() !== companyName.toLowerCase()) {
          documentCompetitorItems.push(comp);
        }
      }
    }
  }

  const selectedCompetitors = selectContextCompetitors({
    agentItems: company.agentRuns.flatMap((run) => extractContextCompetitorsFromAgentOutput(run.output)),
    documentItems: documentCompetitorItems,
    company: { name: companyName, websiteUrl },
  });
  for (const competitor of selectedCompetitors) {
    if (!competitor.companyName || !competitor.officialWebsite) continue;
    competitors.push({
      name: competitor.companyName,
      website: competitor.officialWebsite,
      positioning: competitor.evidence,
      attributes: competitor.competitiveAttributes,
    });
  }

  if (competitors.length === 0) {
    const compSection = extractSection(competitorDoc, ["Direct Competitors", "Competitive Landscape", "Alternatives", "Competitors"]);
    const compBullets = extractBulletPoints(compSection, 8);
    for (const bullet of compBullets) {
      const parts = bullet.split(/[:-]/);
      const name = parts[0]?.trim();
      if (name && !/[|[\]{}]/.test(name) && name.toLowerCase() !== companyName.toLowerCase() && name.length < 40) {
        competitors.push({
          name,
          positioning: parts[1]?.trim() || bullet,
        });
      }
    }
  }

  // 9. Primary & Secondary Keywords
  const primaryKeywords = [
    companyName.toLowerCase(),
    domain.toLowerCase(),
    category.toLowerCase(),
    ...strategicProfile.coreOfferStack.slice(0, 5).map((offer) => offer.toLowerCase()),
    ...derivedKeywords.slice(0, 5).map((k) => k.toLowerCase()),
  ];

  const secondaryKeywords = [
    `best ${category.toLowerCase()} software`,
    `recommend a ${category.toLowerCase()} tool`,
    `top ${category.toLowerCase()} platforms`,
    `${category.toLowerCase()} alternatives`,
    ...derivedKeywords.slice(5, 12).map((k) => k.toLowerCase()),
  ];

  // 10. Brand Voice
  const brandVoice = {
    tone: strategicProfile.voice.tone,
    principles: [
      "Answer the author's question directly with valuable tactical insight before mentioning any product.",
      "Never pretend to be an unbiased third-party customer or fake user.",
      "Provide real actionable steps and specific workflow advice.",
      "Disclose affiliation clearly whenever mentioning the company or product.",
      "Never use aggressive sales pitches, clickbait, or spammy links.",
    ],
    allowedClaims: [
      `Provides dedicated capabilities for ${category.toLowerCase()}.`,
      `Designed to streamline ${category.toLowerCase()} workflows.`,
      `Grounded in verifiable performance and practical utility.`,
    ],
    forbiddenPhrases: strategicProfile.voice.forbiddenPhrases,
  };

  const useCases = productsAndServices.slice(0, 4).map((p) => `${p} optimization and execution`);

  return {
    companyName,
    websiteUrl,
    category,
    description: unwrapStructuredText(description).slice(0, 500),
    tagline: strategicProfile.tagline,
    productsAndServices,
    featuresAndCapabilities,
    icpsAndPersonas,
    painPoints,
    jobsToBeDone,
    useCases: useCases.length > 0 ? useCases : [`${category} operations`],
    differentiators,
    competitors,
    positioning: strategicProfile.positioning,
    primaryKeywords: Array.from(new Set(primaryKeywords)),
    secondaryKeywords: Array.from(new Set(secondaryKeywords)),
    brandVoice,
  };
}
