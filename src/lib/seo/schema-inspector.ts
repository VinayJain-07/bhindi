import * as cheerio from "cheerio";

export type DetectedSchema = {
  type: string;
  sourceUrl: string;
  isValid: boolean;
  issues: string[];
  rawJson: string;
};

export type SchemaInspectionResult = {
  detectedSchemas: DetectedSchema[];
  missingRecommended: string[];
  hasRichResults: boolean;
  score: number;
  generatedSnippets: Record<string, string>;
};

export function inspectSchemaMarkup(
  company: { name: string; websiteUrl: string; description?: string | null; logoUrl?: string | null; category?: string | null },
  crawlPages: Array<{ url: string; content: string }>,
): SchemaInspectionResult {
  const detectedSchemas: DetectedSchema[] = [];
  const foundTypes = new Set<string>();

  for (const page of crawlPages) {
    if (!page.content) continue;
    const $ = cheerio.load(page.content);
    $('script[type="application/ld+json"]').each((_, element) => {
      const rawText = $(element).text().trim();
      if (!rawText) return;

      try {
        const parsed = JSON.parse(rawText) as Record<string, unknown> | Array<Record<string, unknown>>;
        const items = Array.isArray(parsed) ? parsed : "@graph" in parsed && Array.isArray(parsed["@graph"]) ? (parsed["@graph"] as Array<Record<string, unknown>>) : [parsed];

        for (const item of items) {
          const type = String(item["@type"] ?? "Unknown");
          foundTypes.add(type);
          const issues: string[] = [];

          if (!item["@context"] && !("@graph" in parsed)) {
            issues.push("Missing @context");
          }
          if (type === "Organization" && !item.name && !item.url) {
            issues.push("Organization missing name and url");
          }
          if (type === "Product" && !item.offers && !item.review) {
            issues.push("Product schema missing offers or reviews");
          }
          if (type === "FAQPage") {
            issues.push("FAQPage rich results retired by Google (prefer QAPage)");
          }

          detectedSchemas.push({
            type,
            sourceUrl: page.url,
            isValid: issues.length === 0,
            issues,
            rawJson: JSON.stringify(item, null, 2),
          });
        }
      } catch {
        detectedSchemas.push({
          type: "Invalid JSON-LD",
          sourceUrl: page.url,
          isValid: false,
          issues: ["Syntax error in JSON-LD script tag"],
          rawJson: rawText.slice(0, 300),
        });
      }
    });
  }

  // Recommended schemas based on company type
  const missingRecommended: string[] = [];
  if (!foundTypes.has("Organization") && !foundTypes.has("Corporation")) {
    missingRecommended.push("Organization");
  }
  if (!foundTypes.has("WebSite")) {
    missingRecommended.push("WebSite");
  }
  if (!foundTypes.has("SoftwareApplication") && !foundTypes.has("Product") && !foundTypes.has("Service")) {
    missingRecommended.push("SoftwareApplication / Product");
  }

  // Generate snippets
  const cleanUrl = company.websiteUrl.replace(/\/$/, "");
  const generatedSnippets: Record<string, string> = {
    Organization: JSON.stringify(
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: company.name,
        url: cleanUrl,
        logo: company.logoUrl ?? `${cleanUrl}/logo.png`,
        description: company.description ?? `${company.name} official website.`,
        sameAs: [],
      },
      null,
      2,
    ),
    WebSite: JSON.stringify(
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: company.name,
        url: cleanUrl,
        potentialAction: {
          "@type": "SearchAction",
          target: `${cleanUrl}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      null,
      2,
    ),
    SoftwareApplication: JSON.stringify(
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: company.name,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: company.description ?? `${company.name} software solution.`,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
      null,
      2,
    ),
  };

  let score = 50;
  if (detectedSchemas.length > 0) score += 25;
  if (detectedSchemas.some((s) => s.isValid)) score += 15;
  if (missingRecommended.length === 0) score += 10;
  score = Math.min(100, Math.max(20, score));

  return {
    detectedSchemas,
    missingRecommended,
    hasRichResults: detectedSchemas.some((s) => s.isValid && !["WebPage", "Unknown"].includes(s.type)),
    score,
    generatedSnippets,
  };
}
