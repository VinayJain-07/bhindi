import type { CompanyMemory } from "./company-memory";

export type QueryFamilyType =
  | "direct_product"
  | "recommendation_buying"
  | "pain_problem"
  | "competitor"
  | "jobs_to_be_done"
  | "comparison"
  | "broader_icp";

export type SearchMapQuery = {
  id: string;
  query: string;
  family: QueryFamilyType;
  label: string;
  targetSubreddits?: string[];
  priority: "high" | "medium" | "standard";
  expectedIntent: string;
};

export type RedditOpportunitySearchMap = {
  companyName: string;
  category: string;
  generatedAt: string;
  prioritySubreddits: string[];
  queryFamilies: Record<QueryFamilyType, SearchMapQuery[]>;
  allQueries: SearchMapQuery[];
};

/**
 * Dynamically infers relevant niche subreddits from the company's real profile, category, and keywords.
 */
export function inferPrioritySubreddits(memory: CompanyMemory, customSubreddits?: string[]): string[] {
  const userSubs = (customSubreddits || []).map((s) => (s.startsWith("r/") ? s : `r/${s}`));
  const textToScan = [
    memory.companyName,
    memory.category,
    ...memory.productsAndServices,
    ...memory.featuresAndCapabilities,
    ...memory.primaryKeywords,
    ...memory.secondaryKeywords,
    ...memory.painPoints,
  ].join(" ").toLowerCase();

  const matchedSubs = new Set<string>();

  // Domain-specific subreddit clusters
  if (/\bsap\b|s\/4hana|enterprise resource planning|\berp\b|business transformation/i.test(textToScan)) {
    ["r/SAP", "r/ERP", "r/consulting", "r/ITManagers"].forEach((s) => matchedSubs.add(s));
  }
  if (/agency|marketing|growth|content|social media|advertising|ppc|copywriting/i.test(textToScan)) {
    ["r/marketing", "r/agency", "r/digitalmarketing", "r/GrowthHacking", "r/PPC"].forEach((s) => matchedSubs.add(s));
  }
  if (/developer|coding|\bapi\b|\bsdk\b|react|nextjs|javascript|python|backend|frontend|devops|cloud hosting|server infrastructure/i.test(textToScan)) {
    ["r/webdev", "r/programming", "r/devops", "r/softwareengineering", "r/reactjs", "r/nextjs", "r/javascript", "r/cloud"].forEach((s) => matchedSubs.add(s));
  }
  if (/ai|artificial intelligence|machine learning|llm|gpt|openai|rag|models|deep learning|nlp|agents/i.test(textToScan)) {
    ["r/MachineLearning", "r/ArtificialInteligence", "r/LocalLLaMA", "r/OpenAI", "r/datascience", "r/ChatGPT"].forEach((s) => matchedSubs.add(s));
  }
  if (/ecommerce|e-commerce|shopify|store|retail|dropship|amazon|fba|d2c|products|cart/i.test(textToScan)) {
    ["r/ecommerce", "r/shopify", "r/dropship", "r/FulfillmentByAmazon", "r/smallbusiness"].forEach((s) => matchedSubs.add(s));
  }
  if (/finance|fintech|accounting|payroll|invoice|payment|tax|banking|invest|crypto|wealth/i.test(textToScan)) {
    ["r/Fintech", "r/personalfinance", "r/accounting", "r/investing", "r/smallbusiness"].forEach((s) => matchedSubs.add(s));
  }
  if (/design|ui|ux|graphic|figma|creative|video|animation|branding/i.test(textToScan)) {
    ["r/web_design", "r/UI_Design", "r/userexperience", "r/graphic_design", "r/frontend"].forEach((s) => matchedSubs.add(s));
  }
  if (/security|cyber|cybersecurity|auth|privacy|compliance|hipaa|soc2|infosec|pentest/i.test(textToScan)) {
    ["r/cybersecurity", "r/netsec", "r/sysadmin", "r/infosec", "r/ITManagers"].forEach((s) => matchedSubs.add(s));
  }
  if (/health|medical|clinic|doctor|patient|ehr|wellness|telehealth|pharma/i.test(textToScan)) {
    ["r/healthtech", "r/medicine", "r/digitalhealth", "r/healthcare"].forEach((s) => matchedSubs.add(s));
  }
  if (/sales|crm|pipeline|deals|prospecting|b2b sales|cold email|lead gen|outreach/i.test(textToScan)) {
    ["r/sales", "r/CRM", "r/salesforce", "r/b2b", "r/leadgeneration"].forEach((s) => matchedSubs.add(s));
  }
  if (/seo|search engine|backlinks|keyword|organic traffic|rankings|technical seo|serp/i.test(textToScan)) {
    ["r/SEO", "r/bigseo", "r/TechSEO", "r/digitalmarketing", "r/marketing"].forEach((s) => matchedSubs.add(s));
  }
  if (/hr|recruiting|hiring|talent|employees|payroll|staffing|job/i.test(textToScan)) {
    ["r/humanresources", "r/recruiting", "r/jobs"].forEach((s) => matchedSubs.add(s));
  }

  // Include high-velocity general business & SaaS subreddits if relevant to tech/software
  const isSoftwareOrSaas = /\bsaas\b|software|platform|tech\b|cloud|api\b|app\b|developer|ai\b/i.test(textToScan);
  if (isSoftwareOrSaas) {
    ["r/SaaS", "r/startups"].forEach((s) => matchedSubs.add(s));
  }
  ["r/entrepreneur", "r/smallbusiness"].forEach((s) => matchedSubs.add(s));

  return Array.from(new Set([...userSubs, ...Array.from(matchedSubs)])).slice(0, 16);
}

/**
 * Automatically generates and maintains the Reddit Opportunity Search Map
 * across all 7 required query families strictly tailored to Company Memory.
 */
export function generateRedditSearchMap(
  memory: CompanyMemory,
  customSubreddits?: string[],
  customKeywords?: string[]
): RedditOpportunitySearchMap {
  const compName = memory.companyName;
  const category = memory.category || `${compName} Solutions`;
  const products = memory.productsAndServices.length > 0 ? memory.productsAndServices : [category];
  const primaryProduct = products[0] || category;
  const secondaryProduct = products[1] || products[0] || category;
  const painPoints = memory.painPoints.length > 0 ? memory.painPoints : [`managing ${category.toLowerCase()}`];
  const primaryPain = painPoints[0];
  const jtbd = memory.jobsToBeDone.length > 0 ? memory.jobsToBeDone : [`automate ${category.toLowerCase()}`];
  const primaryJtbd = jtbd[0];
  const competitors = memory.competitors.map((c) => c.name).filter(Boolean);
  const primaryCompetitor = competitors[0];
  const secondaryCompetitor = competitors[1] || competitors[0];
  const isServiceBusiness = /\b(?:agency|consultancy|consulting|professional services?|managed services?)\b/i
    .test(`${category} ${memory.description} ${memory.positioning}`);

  const subreddits = inferPrioritySubreddits(memory, customSubreddits);

  // 1. Direct Product/Category Searches
  const directProduct: SearchMapQuery[] = [
    {
      id: "dp-1",
      query: isServiceBusiness ? `best ${category.toLowerCase()} partner` : `best ${category.toLowerCase()} tool`,
      family: "direct_product",
      label: `Best ${category} Tool`,
      priority: "high",
      expectedIntent: "BUYING_INTENT",
    },
    {
      id: "dp-2",
      query: isServiceBusiness ? `${primaryProduct.toLowerCase()} agency` : `${primaryProduct.toLowerCase()} software`,
      family: "direct_product",
      label: `${primaryProduct} Software`,
      priority: "high",
      expectedIntent: "BUYING_INTENT",
    },
    {
      id: "dp-3",
      query: isServiceBusiness ? `top ${category.toLowerCase()} firms` : `top ${category.toLowerCase()} platform`,
      family: "direct_product",
      label: `Top ${category} Platform`,
      priority: "high",
      expectedIntent: "BUYING_INTENT",
    },
    {
      id: "dp-4",
      query: isServiceBusiness ? `${secondaryProduct.toLowerCase()} service provider` : `automated ${secondaryProduct.toLowerCase()} solution`,
      family: "direct_product",
      label: `Automated ${secondaryProduct} Solution`,
      priority: "medium",
      expectedIntent: "BUYING_INTENT",
    },
  ];

  // 2. Recommendation / Buying Intent Searches
  const recommendationBuying: SearchMapQuery[] = [
    {
      id: "rb-1",
      query: isServiceBusiness ? `recommend a ${category.toLowerCase()} partner` : `recommend a ${category.toLowerCase()} tool`,
      family: "recommendation_buying",
      label: `Recommend a ${category} Tool`,
      priority: "high",
      expectedIntent: "RECOMMENDATION_REQUEST",
    },
    {
      id: "rb-2",
      query: isServiceBusiness ? `who should I hire for ${primaryProduct.toLowerCase()}` : `what tool should I use for ${primaryProduct.toLowerCase()}`,
      family: "recommendation_buying",
      label: `What Tool Should I Use for ${primaryProduct}`,
      priority: "high",
      expectedIntent: "RECOMMENDATION_REQUEST",
    },
    {
      id: "rb-3",
      query: isServiceBusiness ? `looking for a ${category.toLowerCase()}` : `looking for ${category.toLowerCase()} software`,
      family: "recommendation_buying",
      label: `Looking for ${category} Software`,
      priority: "high",
      expectedIntent: "BUYING_INTENT",
    },
    {
      id: "rb-4",
      query: isServiceBusiness ? `what's the best agency for ${primaryProduct.toLowerCase()}` : `what's the best software for ${primaryProduct.toLowerCase()}`,
      family: "recommendation_buying",
      label: `Best Software for ${primaryProduct}`,
      priority: "high",
      expectedIntent: "RECOMMENDATION_REQUEST",
    },
  ];

  // 3. Pain / Problem Searches
  const cleanPain1 = primaryPain.replace(/^managing\s+/i, "").slice(0, 90);
  const cleanPain2 = (painPoints[1] || primaryPain).replace(/^managing\s+/i, "").slice(0, 90);

  const painProblem: SearchMapQuery[] = [
    {
      id: "pp-1",
      query: `${cleanPain1} takes too long`,
      family: "pain_problem",
      label: `${cleanPain1} Takes Too Long`,
      priority: "high",
      expectedIntent: "PAIN_POINT",
    },
    {
      id: "pp-2",
      query: `how do I automate ${primaryProduct.toLowerCase()}`,
      family: "pain_problem",
      label: `How Do I Automate ${primaryProduct}`,
      priority: "high",
      expectedIntent: "PAIN_POINT",
    },
    {
      id: "pp-3",
      query: `struggling with ${cleanPain2}`,
      family: "pain_problem",
      label: `Struggling With ${cleanPain2}`,
      priority: "medium",
      expectedIntent: "PAIN_POINT",
    },
    {
      id: "pp-4",
      query: `how to solve ${category.toLowerCase()} bottleneck`,
      family: "pain_problem",
      label: `Solve ${category} Bottleneck`,
      priority: "medium",
      expectedIntent: "PAIN_POINT",
    },
  ];

  // 4. Competitor Searches
  const competitorSearches: SearchMapQuery[] = [];
  if (primaryCompetitor) {
    competitorSearches.push(
      {
        id: "comp-1",
        query: `${primaryCompetitor} alternative`,
        family: "competitor",
        label: `${primaryCompetitor} Alternative`,
        priority: "high",
        expectedIntent: "COMPETITOR_DISSATISFACTION",
      },
      {
        id: "comp-2",
        query: `${primaryCompetitor} too expensive`,
        family: "competitor",
        label: `${primaryCompetitor} Too Expensive`,
        priority: "high",
        expectedIntent: "COMPETITOR_DISSATISFACTION",
      },
      {
        id: "comp-3",
        query: `switching from ${primaryCompetitor}`,
        family: "competitor",
        label: `Switching From ${primaryCompetitor}`,
        priority: "high",
        expectedIntent: "COMPETITOR_DISSATISFACTION",
      }
    );
  }
  if (secondaryCompetitor && secondaryCompetitor !== primaryCompetitor) {
    competitorSearches.push({
      id: "comp-4",
      query: `${secondaryCompetitor} alternative`,
      family: "competitor",
      label: `${secondaryCompetitor} Alternative`,
      priority: "high",
      expectedIntent: "COMPETITOR_DISSATISFACTION",
    });
  }
  if (competitorSearches.length === 0) {
    competitorSearches.push(
      {
        id: "comp-fallback-1",
        query: `legacy ${category.toLowerCase()} alternatives`,
        family: "competitor",
        label: `Legacy ${category} Alternatives`,
        priority: "high",
        expectedIntent: "COMPETITOR_DISSATISFACTION",
      },
      {
        id: "comp-fallback-2",
        query: `replace outdated ${category.toLowerCase()} software`,
        family: "competitor",
        label: `Replace Outdated ${category} Software`,
        priority: "medium",
        expectedIntent: "COMPETITOR_DISSATISFACTION",
      }
    );
  }

  // 5. Jobs-To-Be-Done (JTBD) Searches
  const cleanJtbd = primaryJtbd
    .replace(/^(?:automating|automate|streamlining|streamline)(?:\s+and\s+(?:automating|streamlining))?\s+/i, "manage ")
    .slice(0, 70);
  const jobsToBeDoneSearches: SearchMapQuery[] = [
    {
      id: "jtbd-1",
      query: `how to ${cleanJtbd}`,
      family: "jobs_to_be_done",
      label: `How to ${cleanJtbd}`,
      priority: "high",
      expectedIntent: "JOB_TO_BE_DONE",
    },
    {
      id: "jtbd-2",
      query: `best way to manage ${primaryProduct.toLowerCase()}`,
      family: "jobs_to_be_done",
      label: `Best Way to Manage ${primaryProduct}`,
      priority: "high",
      expectedIntent: "JOB_TO_BE_DONE",
    },
    {
      id: "jtbd-3",
      query: `how teams handle ${category.toLowerCase()} workflows`,
      family: "jobs_to_be_done",
      label: `How Teams Handle ${category} Workflows`,
      priority: "medium",
      expectedIntent: "JOB_TO_BE_DONE",
    },
  ];

  // 6. Comparison Searches
  const comparisonSearches: SearchMapQuery[] = [];
  if (primaryCompetitor && secondaryCompetitor && primaryCompetitor !== secondaryCompetitor) {
    comparisonSearches.push(
      {
        id: "comp-comp-1",
        query: `${primaryCompetitor} vs ${secondaryCompetitor}`,
        family: "comparison",
        label: `${primaryCompetitor} vs ${secondaryCompetitor}`,
        priority: "high",
        expectedIntent: "COMPARISON",
      },
      {
        id: "comp-comp-2",
        query: `${primaryCompetitor} vs other ${category.toLowerCase()} tools`,
        family: "comparison",
        label: `${primaryCompetitor} vs Alternatives`,
        priority: "high",
        expectedIntent: "COMPARISON",
      }
    );
  } else if (primaryCompetitor) {
    comparisonSearches.push({
      id: "comp-comp-1",
      query: `${primaryCompetitor} vs modern ${category.toLowerCase()} tools`,
      family: "comparison",
      label: `${primaryCompetitor} vs Modern Tools`,
      priority: "high",
      expectedIntent: "COMPARISON",
    });
  } else {
    comparisonSearches.push(
      {
        id: "comp-comp-1",
        query: `${category.toLowerCase()} tools comparison`,
        family: "comparison",
        label: `${category} Tools Comparison`,
        priority: "high",
        expectedIntent: "COMPARISON",
      },
      {
        id: "comp-comp-2",
        query: `best alternatives for ${category.toLowerCase()}`,
        family: "comparison",
        label: `Best Alternatives for ${category}`,
        priority: "high",
        expectedIntent: "COMPARISON",
      }
    );
  }

  // 7. Broader ICP & Niche Debates
  const icpRole = memory.icpsAndPersonas[0]?.role || `${category} Lead`;
  const broaderIcpSearches: SearchMapQuery[] = [
    {
      id: "icp-1",
      query: `${icpRole.toLowerCase()} ${category.toLowerCase()} workflow`,
      family: "broader_icp",
      label: `${icpRole} ${category} Workflow`,
      priority: "medium",
      expectedIntent: "BROADER_ICP_DISCUSSION",
    },
    {
      id: "icp-2",
      query: `${category.toLowerCase()} best practices`,
      family: "broader_icp",
      label: `${category} Best Practices`,
      priority: "medium",
      expectedIntent: "BROADER_ICP_DISCUSSION",
    },
    {
      id: "icp-3",
      query: `how to scale ${primaryProduct.toLowerCase()}`,
      family: "broader_icp",
      label: `How to Scale ${primaryProduct}`,
      priority: "medium",
      expectedIntent: "BROADER_ICP_DISCUSSION",
    },
  ];

  // Append any user custom keywords as direct high-priority queries
  if (customKeywords && customKeywords.length > 0) {
    customKeywords.forEach((kw, idx) => {
      const cleanKw = kw.trim();
      if (cleanKw) {
        directProduct.unshift({
          id: `custom-kw-${idx}`,
          query: cleanKw,
          family: "direct_product",
          label: `Custom: ${cleanKw}`,
          priority: "high",
          expectedIntent: "BUYING_INTENT",
        });
      }
    });
  }

  const queryFamilies = {
    direct_product: directProduct,
    recommendation_buying: recommendationBuying,
    pain_problem: painProblem,
    competitor: competitorSearches,
    jobs_to_be_done: jobsToBeDoneSearches,
    comparison: comparisonSearches,
    broader_icp: broaderIcpSearches,
  };

  const allQueries = Object.values(queryFamilies).flat();

  return {
    companyName: compName,
    category,
    generatedAt: new Date().toISOString(),
    prioritySubreddits: subreddits,
    queryFamilies,
    allQueries,
  };
}
