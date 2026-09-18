export type ContextCompetitorItem = {
  title?: string;
  evidence?: string;
  companyName?: string;
  officialWebsite?: string;
  logoUrl?: string;
  sourceUrls?: string[];
  competitiveAttributes?: string[];
};

type CompanyIdentity = {
  name: string;
  websiteUrl: string;
};

function normalizedName(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function websiteHost(value: string | undefined): string {
  if (!value) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

const INVALID_HOSTS = new Set([
  "merriam-webster.com", "dictionary.com", "thefreedictionary.com", "cambridge.org", "wiktionary.org",
  "key-test.ru", "key-test.com", "keyboard-tester.com", "keyboardchecker.com", "speedtest.net",
  "wikipedia.org", "quora.com", "reddit.com", "google.com", "bing.com", "youtube.com", "apple.com", "microsoft.com",
]);

const NON_COMPETITOR_PATTERNS = [
  /\b(?:definition|meaning|dictionary|thesaurus|etymology|pronunciation)\b/i,
  /\b(?:keyboard tester|key test|speed test|mic test|webcam test|online tester|hardware tester)\b/i,
  /\b(?:login|sign in|signup|sign up|customer service|customer support|my account|portal)\b/i,
  /\b(?:online & mobile banking|personal banking|commercial banking|mortgage banking|keybank)\b/i,
  /\b(?:terms of service|privacy policy|disclaimer|cookie policy|user agreement)\b/i,
];

function verifiedCompetitors<T extends ContextCompetitorItem>(items: T[], company: CompanyIdentity): T[] {
  const ownName = normalizedName(company.name);
  const ownHost = websiteHost(company.websiteUrl);
  const seenNames = new Set<string>();
  const seenHosts = new Set<string>();

  return items.filter((item) => {
    const name = normalizedName(item.companyName);
    const host = websiteHost(item.officialWebsite);
    const rawName = item.companyName || item.title || "";

    // Context cards represent verified companies, not agent summaries, dictionaries, or utilities.
    if (!name || !host || name === ownName || host === ownHost) return false;
    if (INVALID_HOSTS.has(host) || INVALID_HOSTS.has(host.replace(/^[^.]+\./, ""))) return false;
    if (NON_COMPETITOR_PATTERNS.some((pattern) => pattern.test(rawName) || pattern.test(host))) return false;
    if (seenNames.has(name) || seenHosts.has(host)) return false;

    seenNames.add(name);
    seenHosts.add(host);
    return true;
  });
}

function records(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    : [];
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function textList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(textValue).filter(Boolean) : [];
}

export function extractContextCompetitorsFromAgentOutput(output: unknown): ContextCompetitorItem[] {
  if (!output || typeof output !== "object") return [];
  const value = output as Record<string, unknown>;

  // The intelligence pipeline returns company profiles here. Its `findings` field contains
  // strategic recommendations and must not be rendered as a list of companies.
  const profiles = records(value.competitors);
  if (profiles.length) {
    return profiles.map((profile) => {
      const companyName = textValue(profile.name) || textValue(profile.companyName);
      const officialWebsite = textValue(profile.officialWebsite);
      return {
        title: companyName,
        companyName,
        officialWebsite,
        logoUrl: textValue(profile.logoUrl),
        evidence: textValue(profile.positioningAngle) || textValue(profile.positioning),
        competitiveAttributes: textList(profile.keyFeatures).length
          ? textList(profile.keyFeatures)
          : textList(profile.competitiveAttributes),
        sourceUrls: officialWebsite ? [officialWebsite] : [],
      };
    });
  }

  // Compatibility with older agent runs that stored normalized competitor findings.
  return records(value.findings).map((finding) => ({
    title: textValue(finding.title),
    companyName: textValue(finding.companyName),
    officialWebsite: textValue(finding.officialWebsite),
    logoUrl: textValue(finding.logoUrl),
    evidence: textValue(finding.evidence),
    competitiveAttributes: textList(finding.competitiveAttributes),
    sourceUrls: textList(finding.sourceUrls),
  }));
}

export function selectContextCompetitors<T extends ContextCompetitorItem>(args: {
  agentItems: T[];
  documentItems: T[];
  company: CompanyIdentity;
  limit?: number;
}): T[] {
  const agentCompetitors = verifiedCompetitors(args.agentItems, args.company);
  const documentCompetitors = verifiedCompetitors(args.documentItems, args.company);
  const currentSet = agentCompetitors.length ? agentCompetitors : documentCompetitors;
  return currentSet.slice(0, args.limit ?? 8);
}
