type CompanyContextPage = {
  url: string;
  title?: string | null;
  description?: string | null;
  content?: string | null;
};

type CompanyBriefSource = {
  name?: string | null;
  websiteUrl?: string | null;
  category?: string | null;
  description?: string | null;
  productsOrServices?: string | null;
  targetAudience?: string | null;
  geographicMarket?: string | null;
  intelligenceMarkdown?: string | null;
  crawlPages?: CompanyContextPage[];
};

export type CompanyContextSignal = { label: string; text: string };
export type CompanyContext = { overview: string; signals: CompanyContextSignal[]; evidenceLabel: string };

const FALLBACK = "Company research is still being assembled. Run the company analysis to build a sourced overview of the offer, customers, positioning, and proof.";
const GENERIC_COPY = /organization covered by this report|public website reviewed|this analysis evaluates|company information was not available|digital presence, performance, visibility/i;

function clean(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() || "";
}

function cleanMarkdown(value: string) {
  return clean(value
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/[|*_`~]/g, " "));
}

function useful(value: string) {
  const normalized = cleanMarkdown(value);
  return normalized.length >= 45 && !GENERIC_COPY.test(normalized);
}

function concise(value: string, limit: number) {
  const normalized = cleanMarkdown(value);
  if (normalized.length <= limit) return normalized;
  const clipped = normalized.slice(0, limit + 1);
  const sentence = clipped.match(/^.*[.!?](?=\s|$)/)?.[0];
  return sentence && sentence.length >= limit * .55 ? sentence : `${normalized.slice(0, limit - 1).trimEnd()}…`;
}

function markdownSections(markdown: string) {
  const sections: Array<{ heading: string; body: string }> = [];
  let heading = "Overview";
  let lines: string[] = [];
  const flush = () => {
    const body = cleanMarkdown(lines.join("\n"));
    if (useful(body)) sections.push({ heading: cleanMarkdown(heading), body });
  };
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^#{1,4}\s+(.+)$/);
    if (match) {
      flush();
      heading = match[1];
      lines = [];
    } else if (!/^\s*\|?\s*:?-{3,}/.test(line)) {
      lines.push(line);
    }
  }
  flush();
  return sections;
}

function pageCopy(page: CompanyContextPage) {
  const description = clean(page.description);
  if (useful(description)) return description;
  const content = cleanMarkdown(page.content || "");
  return useful(content) ? content : "";
}

function pagePriority(page: CompanyContextPage) {
  try {
    const path = new URL(page.url).pathname.replace(/\/+$/, "") || "/";
    if (path === "/") return 0;
    if (/\/(about|company|who-we-are)/i.test(path)) return 1;
    if (/\/(services?|solutions?|products?)/i.test(path)) return 2;
    if (/\/(industr|customers?|case-stud)/i.test(path)) return 3;
  } catch { /* Invalid historical URLs simply receive normal priority. */ }
  return 4;
}

const SIGNAL_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "Offer", pattern: /offer|products?|services?|solutions?|capabilit/i },
  { label: "Audience", pattern: /audience|customers?|buyers?|\bicp\b|who (?:it )?serves/i },
  { label: "Positioning", pattern: /position|differentiat|value proposition|why (?:choose|us)/i },
  { label: "Markets", pattern: /markets?|industr|vertical|geograph|regions?/i },
  { label: "Proof", pattern: /proof|traction|credib|results?|case stud|customers? stor/i },
];

function pageLabel(page: CompanyContextPage) {
  try {
    const path = new URL(page.url).pathname;
    if (/service|solution|product/i.test(path)) return "Offer";
    if (/industr|market|vertical/i.test(path)) return "Markets";
    if (/customer|case-stud|results/i.test(path)) return "Proof";
    if (/about|company|who-we-are/i.test(path)) return "Company";
  } catch { /* Use the page title fallback. */ }
  return concise(page.title || "Website evidence", 28);
}

export function createCompanyContext(source: CompanyBriefSource): CompanyContext {
  const description = clean(source.description);
  const markdown = source.intelligenceMarkdown?.trim() || "";
  const sections = markdown ? markdownSections(markdown) : [];
  const pages = [...(source.crawlPages ?? [])].sort((left, right) => pagePriority(left) - pagePriority(right));
  const overviewSection = sections.find((section) => /executive|company overview|business overview|company intelligence|brand foundation|what .* does|brand profile|product marketing/i.test(section.heading));
  const valuePropSection = sections.find((s) => /value proposition|differentiator|positioning|core offer/i.test(s.heading));

  let overview = "";
  if (overviewSection?.body && useful(overviewSection.body)) {
    overview = overviewSection.body;
  } else if (description && useful(description)) {
    overview = description;
  } else {
    const pageCandidates = pages.map(pageCopy).filter(useful);
    overview = pageCandidates[0] || "";
  }

  if (!overview) {
    const name = clean(source.name) || "The company";
    const offering = clean(source.productsOrServices);
    const audience = clean(source.targetAudience);
    const market = clean(source.geographicMarket);
    const facts = [
      offering ? `${name} specializes in ${offering}` : "",
      audience ? `serving ${audience}` : "",
      market ? `across ${market}` : "",
    ].filter(Boolean);
    overview = facts.length ? `${facts.join(" ")}.` : FALLBACK;
  }

  // Ensure it flows as a single, well-crafted paragraph without markdown headings or section labels
  overview = overview
    .replace(/^#+\s*.*$/gm, "")
    .replace(/^[-*•]\s*/gm, "")
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // If the paragraph is very short, naturally append the value prop or audience in fluid prose
  if (overview.length < 240 && valuePropSection?.body) {
    const cleanProp = valuePropSection.body.replace(/^#+\s*.*$/gm, "").replace(/^[-*•]\s*/gm, "").replace(/\r?\n+/g, " ").replace(/\s+/g, " ").trim();
    if (cleanProp && !overview.toLowerCase().includes(cleanProp.slice(0, 30).toLowerCase())) {
      overview = `${overview} ${cleanProp}`;
    }
  }

  overview = concise(overview, 520);

  const signals: CompanyContextSignal[] = [];
  const seenLabels = new Set<string>();
  const seenText = new Set<string>([overview.toLowerCase()]);
  const structuredSignals = [
    { label: "Offer", text: clean(source.productsOrServices) },
    { label: "Audience", text: clean(source.targetAudience) },
    { label: "Markets", text: clean(source.geographicMarket) },
  ];
  for (const signal of structuredSignals) {
    if (!signal.text || signal.text.length < 8 || overview.toLowerCase().includes(signal.text.toLowerCase())) continue;
    signals.push({ label: signal.label, text: concise(signal.text, 230) });
    seenLabels.add(signal.label);
    seenText.add(signal.text.toLowerCase());
  }
  for (const definition of SIGNAL_PATTERNS) {
    const section = sections.find((item) => definition.pattern.test(item.heading) && useful(item.body));
    if (!section) continue;
    const text = concise(section.body, 230);
    if (seenText.has(text.toLowerCase())) continue;
    signals.push({ label: definition.label, text });
    seenLabels.add(definition.label);
    seenText.add(text.toLowerCase());
  }
  for (const page of pages) {
    if (signals.length >= 4) break;
    const text = concise(pageCopy(page), 210);
    const label = pageLabel(page);
    if (!useful(text) || seenLabels.has(label) || seenText.has(text.toLowerCase()) || overview.toLowerCase().includes(text.toLowerCase())) continue;
    signals.push({ label, text });
    seenLabels.add(label);
    seenText.add(text.toLowerCase());
  }

  const evidenceParts = [];
  if (markdown) evidenceParts.push("Company Intelligence");
  if (pages.length) evidenceParts.push(`${pages.length} public page${pages.length === 1 ? "" : "s"}`);
  return { overview, signals: signals.slice(0, 4), evidenceLabel: evidenceParts.join(" + ") || "Stored company profile" };
}

export function createCompanyBrief(source: CompanyBriefSource): string {
  return createCompanyContext(source).overview;
}

export { FALLBACK as COMPANY_BRIEF_FALLBACK };
