import type { CompanyMemory } from "@/lib/reddit/company-memory";
import type { InstagramOpportunityMap, InstagramOpportunityMapTheme, InstagramFormat } from "./types";

/**
 * Generates an evidence-anchored Instagram Opportunity Map
 * across all 10 priority strategic opportunity categories.
 */
export function generateInstagramOpportunityMap(
  memory: CompanyMemory,
  customThemes?: string[]
): InstagramOpportunityMap {
  const company = memory.companyName;
  const category = memory.category || `${company} Solutions`;
  const themes: InstagramOpportunityMapTheme[] = [];

  let themeIndex = 1;
  const nextId = (prefix: string) => `${prefix}_${themeIndex++}`;

  // 1. Priority Themes (Core value propositions & market positioning)
  if (memory.tagline || memory.positioning) {
    themes.push({
      id: nextId("priority"),
      category: "priority_theme",
      title: `${category} Redefined: The New Standard`,
      description: memory.positioning || memory.tagline || `How ${company} shifts the paradigm in ${category}.`,
      suggestedFormats: ["CAROUSEL", "REEL"],
      relevanceScore: 96,
      suggestedHooks: [
        `Why traditional ${category.toLowerCase()} is failing in 2026`,
        `The single biggest mistake teams make with ${category.toLowerCase()}`,
        `How the top 1% approach ${category.toLowerCase()} differently`,
      ],
    });
  }

  // 2. Customer Problems & Pain Points
  memory.painPoints.slice(0, 3).forEach((pain) => {
    const cleanPain = pain.replace(/^[•\s*-]+/, "").trim();
    themes.push({
      id: nextId("problem"),
      category: "customer_problem",
      title: `Tackling: ${cleanPain.slice(0, 60)}`,
      description: `Breakdown of why ${cleanPain.toLowerCase()} occurs and step-by-step resolution.`,
      suggestedFormats: ["CAROUSEL", "REEL", "STORY"],
      relevanceScore: 92,
      suggestedHooks: [
        `Struggling with ${cleanPain.toLowerCase()}? Here is what to fix first:`,
        `3 signs you are losing time and money to ${cleanPain.toLowerCase()}`,
        `The step-by-step playbook to fix ${cleanPain.toLowerCase()} without overwhelm`,
      ],
    });
  });

  // 3. Product Education & Feature Deep Dives
  memory.productsAndServices.concat(memory.featuresAndCapabilities).slice(0, 3).forEach((feature) => {
    const cleanFeature = feature.replace(/^[•\s*-]+/, "").trim();
    themes.push({
      id: nextId("product"),
      category: "product_education",
      title: `Feature in Action: ${cleanFeature.slice(0, 50)}`,
      description: `Actionable demonstration and workflow breakdown showing ${cleanFeature}.`,
      suggestedFormats: ["REEL", "CAROUSEL"],
      relevanceScore: 89,
      suggestedHooks: [
        `How to unlock 10x workflow efficiency using ${cleanFeature}`,
        `Behind the scenes: The architecture behind ${cleanFeature}`,
        `Watch how fast you can execute with this exact workflow:`,
      ],
    });
  });

  // 4. Competitor & Whitespace Themes
  if (memory.competitors && memory.competitors.length > 0) {
    const comp = memory.competitors[0].name;
    themes.push({
      id: nextId("whitespace"),
      category: "competitor_whitespace",
      title: `Category Comparison: Traditional ${comp} Architecture vs Modern Flow`,
      description: `Objective structural comparison highlighting modern workflows without derogatory claims.`,
      suggestedFormats: ["CAROUSEL", "INFOGRAPHIC"],
      relevanceScore: 88,
      suggestedHooks: [
        `Why legacy tools like ${comp} get clunky as you scale`,
        `The feature checklist buyers overlook when evaluating alternatives`,
        `Old Way vs New Way in ${category}: What changed?`,
      ],
    });
  }

  // 5. Proof & Case Study Opportunities
  themes.push({
    id: nextId("proof"),
    category: "social_proof",
    title: `Evidence & Measurable Transformation Breakdown`,
    description: `Verified case breakdown explaining problem, methodology, implementation, and verified output.`,
    suggestedFormats: ["CAROUSEL", "REEL"],
    relevanceScore: 94,
    suggestedHooks: [
      `How one team eliminated 15+ hours of manual overhead in 14 days`,
      `The exact teardown of how ${company} delivered quantifiable ROI`,
      `Before vs After: What happened when they revamped their workflow`,
    ],
  });

  // 6. Founder & Expert Insights
  themes.push({
    id: nextId("founder"),
    category: "founder_insight",
    title: `The Unpopular Truth About ${category}`,
    description: `Expert counter-intuitive opinion challenging conventional industry dogmas.`,
    suggestedFormats: ["REEL", "CAROUSEL", "STORY"],
    relevanceScore: 87,
    suggestedHooks: [
      `Most advice about ${category.toLowerCase()} is outdated. Here is the reality:`,
      `Why we built ${company} the exact opposite of what consultants recommended`,
      `3 hard lessons from building in the ${category.toLowerCase()} space`,
    ],
  });

  // 7. FAQs & Objections
  themes.push({
    id: nextId("faq"),
    category: "faq_objection",
    title: `Top Buyer Questions Answered Honestly`,
    description: `Addressing the most common friction points, pricing transparency, and setup curves.`,
    suggestedFormats: ["CAROUSEL", "STORY"],
    relevanceScore: 85,
    suggestedHooks: [
      `"Is this actually hard to set up?" — Honest walkthrough:`,
      `The top 5 questions we get asked before onboarding`,
      `Myth vs Fact: What you actually need to get started with ${company}`,
    ],
  });

  // 8. Trend-Compatible Themes
  themes.push({
    id: nextId("trend"),
    category: "trend_compatible",
    title: `AI & Automation Trends Shaping ${category} in 2026`,
    description: `Connecting macro industry shifts with actionable day-to-day implementation strategies.`,
    suggestedFormats: ["REEL", "CAROUSEL"],
    relevanceScore: 86,
    suggestedHooks: [
      `The 2026 trend that will make manual workflows obsolete`,
      `How agentic AI is transforming ${category.toLowerCase()}`,
      `3 trends you need to prepare for this quarter:`,
    ],
  });

  // Custom themes if provided
  if (customThemes && customThemes.length > 0) {
    customThemes.forEach((ct) => {
      themes.push({
        id: nextId("custom"),
        category: "priority_theme",
        title: ct,
        description: `Custom target theme: ${ct}`,
        suggestedFormats: ["CAROUSEL", "REEL"],
        relevanceScore: 90,
        suggestedHooks: [`The comprehensive breakdown of ${ct}`, `Everything you need to know about ${ct}`],
      });
    });
  }

  // Visual concepts tailored to brand voice & category
  const visualConcepts = [
    {
      title: "Clean High-Contrast Swipe Deck",
      style: "Minimalist dark or light background, bold typography, accent highlight boxes, slide counters.",
      layoutIdea: "Slide 1: Big bold hook question; Slides 2-5: Single big idea + visual diagram per slide; Slide 6: Actionable summary; Slide 7: Bookmark CTA.",
    },
    {
      title: "Fast-Paced Talking Head + Screen Demonstration Reel",
      style: "Portrait 9:16, dynamic captions with keyword highlights, quick b-roll zoom-ins of the actual product UI.",
      layoutIdea: "0-3s: Immediate hook question to camera; 4-15s: Screen recording showing the pain; 16-25s: The breakthrough solution; 26-30s: Clear CTA to comment or save.",
    },
    {
      title: "Interactive Story Poll & Teardown Sequence",
      style: "Brand palette, native engagement stickers, question prompts, behind-the-scenes glimpses.",
      layoutIdea: "Frame 1: 'Quick question: Do you struggle with X?' (Poll: Yes/No); Frame 2: 'Here is why most fail:'; Frame 3: 'Here is the 1-step fix' (Link Sticker).",
    },
  ];

  return {
    companyName: company,
    category,
    generatedAt: new Date().toISOString(),
    themes,
    visualConcepts,
    pillarDistribution: {
      "Educational / How-To": 35,
      "Product & Feature Value": 25,
      "Proof & Case Studies": 20,
      "Thought Leadership & Trends": 20,
    },
  };
}
