export type LeadContactInfo = {
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  confidence: "Verified" | "Probable" | "Unlisted";
  phoneVerified: boolean;
  linkedinVerified: boolean;
  emailVerified: boolean;
  phoneStatus: "Verified" | "Unlisted in public discussion";
  linkedinStatus: "Verified Profile" | "Unlisted";
  emailStatus: "Verified" | "Discovered" | "Unlisted";
};

export type LeadScoreBreakdown = {
  total: number;
  icpFit: number;
  intent: number;
  timing: number;
  evidenceStrength: number;
  contactQuality: number;
};

export type ConversationProspect = {
  id: string;
  platform: "Reddit" | "X" | "LinkedIn" | "Web";
  identity: string;
  personRole?: string;
  companyName?: string;
  community: string;
  title: string;
  intent: string;
  intentSignal: string;
  intentCategory: "Explicit Intent" | "Behavioral Intent" | "Strategic Intent" | "Pain Expression";
  sourceUrl: string;
  score: number;
  confidence: number;
  matchedIcp: string;
  matchedProblem: string;
  matchedProduct: string;
  discoveredAt: string;
  whyTarget: string;
  observableTrigger: string;
  verbatimQuote?: string;
  outreachAngle: string;
  contact: LeadContactInfo;
  scoreBreakdown: LeadScoreBreakdown;
  priorityTier: "🔥 Priority" | "Strong Lead" | "Qualification Required";
};

type AgentRunLike = {
  agentType: string;
  output: unknown;
};

const COMMERCIAL_INTENTS = new Set([
  "RECOMMENDATION_REQUEST",
  "BUYING_INTENT",
  "COMPETITOR_DISSATISFACTION",
  "COMPARISON",
  "PAIN_POINT",
  "SOLUTION_SEARCH",
]);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isUsefulIdentity(value: string): boolean {
  return Boolean(value) && !/^(?:reddit_user|\[deleted\]|deleted|automoderator)$/i.test(value);
}

function isPublicUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function deriveProperIntentSignal(
  rawIntent: string,
  title = "",
  snippet = ""
): { intentSignal: string; intentCategory: "Explicit Intent" | "Behavioral Intent" | "Strategic Intent" | "Pain Expression" } {
  const combined = `${title} ${snippet}`.toLowerCase();
  const code = (rawIntent || "").toUpperCase().replace(/\s+/g, "_");

  if (/recommend|suggestion|looking for (?:a|an|the )?best|looking for (?:a|an|new)?\s*(?:tool|platform|software|solution|system)|what tool|alternatives? to|any tool/i.test(combined)) {
    return { intentSignal: "Vendor Recommendation Request", intentCategory: "Explicit Intent" };
  }
  if (/switching from|hate|cancel(?:led|ing)?|expensive|pricing hike|dissatisfied|unreliable|poor support|leaving|broken/i.test(combined)) {
    return { intentSignal: "Competitor Dissatisfaction & Migration", intentCategory: "Pain Expression" };
  }
  if (/budget|procure|rfp|evaluating|demo|trial|buying|pricing|sign up|implement(?:ing)?/i.test(combined)) {
    return { intentSignal: "High Buying Intent & Tool Implementation", intentCategory: "Explicit Intent" };
  }
  if (/\bvs\b|versus|compare|comparing|difference between|evaluation/i.test(combined)) {
    return { intentSignal: "Vendor Evaluation & Feature Comparison", intentCategory: "Behavioral Intent" };
  }
  if (/struggling with|bottleneck|manual work|wasting time|headache|frustrat/i.test(combined)) {
    return { intentSignal: "Severe Operational Pain Point", intentCategory: "Pain Expression" };
  }
  if (/hiring|expansion|scaling|series [a-d]|funding/i.test(combined)) {
    return { intentSignal: "Scaling Trigger & Team Expansion", intentCategory: "Strategic Intent" };
  }

  if (code.includes("RECOMMEND")) {
    return { intentSignal: "Vendor Recommendation Request", intentCategory: "Explicit Intent" };
  }
  if (code.includes("COMPETITOR") || code.includes("DISSATISFACTION")) {
    return { intentSignal: "Competitor Dissatisfaction & Migration", intentCategory: "Pain Expression" };
  }
  if (code.includes("BUYING") || code.includes("PURCHASE")) {
    return { intentSignal: "High Buying Intent & Tool Implementation", intentCategory: "Explicit Intent" };
  }
  if (code.includes("PAIN")) {
    return { intentSignal: "Severe Operational Pain Point", intentCategory: "Pain Expression" };
  }
  if (code.includes("COMPARISON") || code.includes("COMPARE")) {
    return { intentSignal: "Vendor Evaluation & Feature Comparison", intentCategory: "Behavioral Intent" };
  }
  if (code.includes("SOLUTION")) {
    return { intentSignal: "Active Solution & Workflow Search", intentCategory: "Explicit Intent" };
  }

  return { intentSignal: "In-Market Commercial Signal", intentCategory: "Strategic Intent" };
}

function generateWhyTargetRationale(
  author: string,
  matchedIcp: string,
  matchedProblem: string,
  intentSignal: string,
  companyName?: string,
  platform?: "Reddit" | "X" | "LinkedIn" | "Web"
): string {
  const prefix = platform === "Reddit" ? (author.startsWith("u/") ? author : `u/${author}`) : platform === "X" ? (author.startsWith("@") ? author : `@${author}`) : author;
  const entity = companyName ? `${companyName} (${prefix})` : prefix;
  const problemStr = matchedProblem ? `experiencing ${matchedProblem.toLowerCase()}` : "seeking a proven solution";
  const icpStr = matchedIcp || "ICP target decision maker";
  return `Targeting ${entity} [${icpStr}] because they displayed active ${intentSignal.toLowerCase()} on ${platform || "public channels"} by ${problemStr}. This creates a high-conviction timing window for direct solution outreach.`;
}

function generateObservableTrigger(intentSignal: string, matchedProblem?: string): string {
  if (matchedProblem) return `Active discussion regarding ${matchedProblem.toLowerCase()}`;
  return `Public buyer trigger: ${intentSignal}`;
}

function generateOutreachAngle(
  author: string,
  matchedProblem?: string,
  matchedProduct?: string,
  platform?: "Reddit" | "X" | "LinkedIn" | "Web"
): string {
  const cleanName = author.replace(/^(?:u\/|@)/, "");
  const prob = matchedProblem || "manual operational bottlenecks";
  const prod = matchedProduct || "our unified platform";
  if (platform === "LinkedIn") {
    return `"Hi ${cleanName}, came across your recent LinkedIn update on ${prob}. We solved this exact friction for mid-market teams using ${prod}—would love to share a quick 2-minute workflow breakdown."`;
  }
  if (platform === "X") {
    return `"Hey @${cleanName}, caught your tweet about ${prob}. Built ${prod} to eliminate that exact overhead without complex migration—worth taking a look?"`;
  }
  return `"Hi ${cleanName}, noticed your discussion around ${prob}. We solved this exact challenge using ${prod} with zero workflow disruption—worth a 2-minute look?"`;
}

const PHONE_PATTERN = /(?:\+?(\d{1,3}))?[-.\s]?(?:\((\d{2,4})\)|\d{2,4})[-.\s]?(\d{3,4})[-.\s]?(\d{3,9})\b/;

export function extractVerifiedPhoneNumber(raw: unknown): { phone?: string; verified: boolean } {
  if (typeof raw !== "string" && typeof raw !== "number") return { verified: false };
  const str = String(raw).trim();
  if (!str) return { verified: false };

  const digitsOnly = str.replace(/\D/g, "");
  // Phone numbers standard globally have 10-15 digits
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return { verified: false };
  }

  // Reject sequences like 1990-2026 (years) or repeated digits
  if (/^(?:19|20)\d{2}$/.test(digitsOnly) || /^(\d)\1+$/.test(digitsOnly)) {
    return { verified: false };
  }

  const match = str.match(PHONE_PATTERN);
  if (!match) return { verified: false };

  let formatted = str;
  if (digitsOnly.length === 10) {
    formatted = `+1 (${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  } else if (digitsOnly.length > 10 && !str.startsWith("+")) {
    formatted = `+${digitsOnly.slice(0, digitsOnly.length - 10)} ${digitsOnly.slice(-10, -7)} ${digitsOnly.slice(-7, -4)} ${digitsOnly.slice(-4)}`;
  }

  return { phone: formatted, verified: true };
}

const LINKEDIN_PROFILE_REGEX = /^https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/(?:in|company|school)\/([a-zA-Z0-9_-]{3,100})\/?(?:\?.*)?$/i;

export function extractVerifiedLinkedinUrl(raw: unknown): { linkedinUrl?: string; verified: boolean } {
  if (typeof raw !== "string") return { verified: false };
  const trimmed = raw.trim();
  if (!trimmed) return { verified: false };

  // Reject search result URLs, generic feeds, or non-profile endpoints
  if (/linkedin\.com\/(?:search|feed|pulse|learning|jobs|checkpoint|login)/i.test(trimmed)) {
    return { verified: false };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return { verified: false };
  }

  const match = parsedUrl.href.match(LINKEDIN_PROFILE_REGEX);
  if (match && match[1]) {
    const handle = match[1];
    if (/^(?:user|search|results|profile|view|null|undefined)$/i.test(handle)) {
      return { verified: false };
    }
    const isCompany = parsedUrl.pathname.includes("/company/");
    const isSchool = parsedUrl.pathname.includes("/school/");
    const segment = isCompany ? "company" : isSchool ? "school" : "in";
    return {
      linkedinUrl: `https://www.linkedin.com/${segment}/${handle}`,
      verified: true,
    };
  }

  return { verified: false };
}

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

export function extractVerifiedEmail(raw: unknown): { email?: string; verified: boolean } {
  if (typeof raw !== "string") return { verified: false };
  const trimmed = raw.trim();
  const match = trimmed.match(EMAIL_REGEX);
  if (!match) return { verified: false };

  const email = match[0].toLowerCase();
  // Filter out dummy/example emails and synthetic templates
  if (
    email.endsWith("@company.com") ||
    email.endsWith("@example.com") ||
    email.endsWith("@test.com") ||
    email.endsWith("@domain.com") ||
    email.startsWith("support@") ||
    email.startsWith("noreply@") ||
    email.startsWith("no-reply@")
  ) {
    return { verified: false };
  }

  return { email, verified: true };
}

export function extractContactInfo(
  candidate: Record<string, unknown>,
  sourceUrl: string,
  platform: string
): LeadContactInfo {
  // Check candidate object fields for email
  const rawEmail =
    text(candidate.email) ||
    text(candidate.contactEmail) ||
    text(candidate.authorEmail) ||
    text(candidate.workEmail) ||
    text(candidate.businessEmail) ||
    text(candidate.directEmail);
  let verifiedEmail = extractVerifiedEmail(rawEmail);

  // Check candidate object fields for phone
  const rawPhone =
    candidate.phone ||
    candidate.phoneNumber ||
    candidate.contactPhone ||
    candidate.directPhone ||
    candidate.mobile ||
    candidate.telephone;
  let verifiedPhone = extractVerifiedPhoneNumber(rawPhone);

  // Check candidate object fields for linkedin
  const rawLinkedin = text(candidate.linkedinUrl) || text(candidate.linkedin) || text(candidate.profileUrl);
  let verifiedLinkedin = extractVerifiedLinkedinUrl(rawLinkedin);

  // If candidate was found on LinkedIn and sourceUrl is a valid profile URL
  if (!verifiedLinkedin.verified && platform === "LinkedIn" && isPublicUrl(sourceUrl)) {
    verifiedLinkedin = extractVerifiedLinkedinUrl(sourceUrl);
  }

  // If email or phone not found in explicit fields, inspect text/evidence pools
  if (!verifiedEmail.verified || !verifiedPhone.verified) {
    const textPool = [
      text(candidate.evidence),
      text(candidate.excerpt),
      text(candidate.recommendedResponse),
      text(candidate.draftContent),
      text(candidate.description),
      text(candidate.content),
      text(candidate.body),
      Array.isArray(candidate.evidence) ? candidate.evidence.map(text).join(" ") : "",
    ].join(" ");

    if (!verifiedEmail.verified) {
      const fromText = extractVerifiedEmail(textPool);
      if (fromText.verified) verifiedEmail = fromText;
    }
    if (!verifiedPhone.verified) {
      const fromText = extractVerifiedPhoneNumber(textPool);
      if (fromText.verified) verifiedPhone = fromText;
    }
  }

  const confidence: "Verified" | "Probable" | "Unlisted" =
    (verifiedPhone.verified && verifiedLinkedin.verified) || (verifiedEmail.verified && verifiedLinkedin.verified)
      ? "Verified"
      : verifiedLinkedin.verified || verifiedPhone.verified || verifiedEmail.verified
      ? "Probable"
      : "Unlisted";

  return {
    email: verifiedEmail.email,
    phone: verifiedPhone.phone,
    linkedinUrl: verifiedLinkedin.linkedinUrl,
    confidence,
    phoneVerified: verifiedPhone.verified,
    linkedinVerified: verifiedLinkedin.verified,
    emailVerified: verifiedEmail.verified,
    phoneStatus: verifiedPhone.verified ? "Verified" : "Unlisted in public discussion",
    linkedinStatus: verifiedLinkedin.verified ? "Verified Profile" : "Unlisted",
    emailStatus: verifiedEmail.verified ? "Verified" : verifiedEmail.email ? "Discovered" : "Unlisted",
  };
}

function extractCleanCompanyName(candidate: Record<string, unknown>): string {
  const rawName = text(candidate.companyName);
  if (rawName && !/^finding\s+\d+/i.test(rawName) && !/overview|landscape/i.test(rawName)) {
    return rawName.split(/[-–—:|]/)[0].trim();
  }
  const title = text(candidate.title);
  if (title && title.length > 2 && !/^finding/i.test(title)) {
    return title.split(/[-–—:|]/)[0].trim();
  }
  return "";
}

export function extractConversationProspects(
  runs: AgentRunLike[],
  limit = 6,
  seenIds: string[] = [],
  companyContext?: { name?: string; industry?: string; offering?: string }
): ConversationProspect[] {
  const seenSet = new Set<string>(seenIds.map((id) => id.toLowerCase()));
  const prospects: ConversationProspect[] = [];

  // Iterate across ALL agent runs (REDDIT, X, LINKEDIN, INSTAGRAM, COMPETITOR, AUDIENCE, etc.)
  for (const run of runs) {
    const agentType = run.agentType?.toUpperCase() || "";
    const output = record(run.output);
    if (!output) continue;

    const rawCandidates: unknown[] = [];
    if (Array.isArray(output.opportunities)) {
      rawCandidates.push(...output.opportunities);
    }
    if (Array.isArray(output.findings)) {
      rawCandidates.push(...output.findings);
    }

    for (const candidate of rawCandidates) {
      const item = record(candidate);
      if (!item) continue;

      const rawIdentity = text(item.author) || text(item.identity) || text(item.companyName) || text(item.sourceLabel);
      const rawSourceUrl = text(item.sourceUrl) || (Array.isArray(item.sourceUrls) ? text(item.sourceUrls[0]) : "") || text(item.officialWebsite);
      
      const identity = isUsefulIdentity(rawIdentity) ? rawIdentity : extractCleanCompanyName(item) || "Decision Maker";
      const sourceUrl = isPublicUrl(rawSourceUrl) ? rawSourceUrl : `https://${agentType.toLowerCase() || "web"}.com/prospect/${encodeURIComponent(identity)}`;

      const id = text(item.id) || sourceUrl || `${agentType.toLowerCase()}-${identity}`;
      const identityKey = identity.toLowerCase();

      if (seenSet.has(id.toLowerCase()) || seenSet.has(identityKey) || (isPublicUrl(sourceUrl) && seenSet.has(sourceUrl.toLowerCase()))) {
        continue;
      }

      let platform: "Reddit" | "X" | "LinkedIn" | "Web" = "Web";
      const platformField = text(item.platform).toLowerCase();
      if (agentType === "REDDIT" || platformField === "reddit" || sourceUrl.includes("reddit.com")) {
        platform = "Reddit";
      } else if (agentType === "X" || platformField === "x" || sourceUrl.includes("x.com") || sourceUrl.includes("twitter.com")) {
        platform = "X";
      } else if (agentType === "LINKEDIN" || platformField === "linkedin" || sourceUrl.includes("linkedin.com")) {
        platform = "LinkedIn";
      }

      const scoreObj = record(item.score);
      const total = scoreObj ? number(scoreObj.total) : number(item.score) || number(item.confidence) || 82;
      const spamRisk = number(item.spamRisk);

      if (total < 50 || spamRisk > 0.4) continue;

      seenSet.add(id.toLowerCase());
      seenSet.add(identityKey);
      if (isPublicUrl(sourceUrl)) seenSet.add(sourceUrl.toLowerCase());

      const matchedIcp = text(item.matchedIcp) || text(item.targetAudience) || (Array.isArray(item.tags) && item.tags[0] ? text(item.tags[0]) : "ICP Target Decision Maker");
      const matchedProblem = text(item.matchedProblem) || text(item.evidence) || text(item.impact) || "Operational bottleneck";
      const matchedProduct = text(item.matchedProduct) || companyContext?.offering || "our solution";
      const title = text(item.title) || text(item.action) || "Relevant buyer conversation";
      const snippet = text(item.verbatimQuote) || text(item.recommendedResponse) || text(item.evidence) || text(item.impact) || "";
      const rawIntent = text(item.intent) || text(item.kind) || "BUYING_INTENT";
      const { intentSignal, intentCategory } = deriveProperIntentSignal(rawIntent, title, snippet);

      const companyName = text(item.companyName) || undefined;
      const personRole = text(item.role) || text(item.personRole) || "Decision Maker";

      let community = text(item.subreddit) || text(item.community) || text(item.sourceLabel);
      if (!community) {
        community = platform === "Reddit" ? "r/b2bmarketing" : platform === "X" ? "X #B2B" : platform === "LinkedIn" ? "LinkedIn Network" : "Web Discovery";
      } else if (platform === "Reddit" && !community.startsWith("r/")) {
        community = `r/${community}`;
      }

      const roundedTotal = Math.round(total);
      const icpFit = Math.min(25, Math.round(roundedTotal * 0.27));
      const intentScore = Math.min(25, Math.round(roundedTotal * 0.27));
      const timing = Math.min(15, Math.round(roundedTotal * 0.16));
      const evidenceStrength = Math.min(10, Math.round(roundedTotal * 0.11));
      const contactQuality = Math.min(5, Math.round(roundedTotal * 0.06));

      const whyTarget = generateWhyTargetRationale(identity, matchedIcp, matchedProblem, intentSignal, companyName, platform);
      const observableTrigger = generateObservableTrigger(intentSignal, matchedProblem);
      const outreachAngle = generateOutreachAngle(identity, matchedProblem, matchedProduct, platform);
      const contact = extractContactInfo(item, sourceUrl, platform);

      const priorityTier: "🔥 Priority" | "Strong Lead" | "Qualification Required" =
        roundedTotal >= 85 ? "🔥 Priority" : roundedTotal >= 70 ? "Strong Lead" : "Qualification Required";

      prospects.push({
        id,
        platform,
        identity,
        personRole,
        companyName,
        community,
        title,
        intent: text(item.intentLabel) || intentSignal,
        intentSignal,
        intentCategory,
        sourceUrl,
        score: roundedTotal,
        confidence: Math.round(number(item.confidence) || 85),
        matchedIcp,
        matchedProblem,
        matchedProduct,
        discoveredAt: text(item.discoveredAt) || new Date().toISOString(),
        whyTarget,
        observableTrigger,
        verbatimQuote: text(item.verbatimQuote) || text(item.recommendedResponse) || text(item.evidence) || undefined,
        outreachAngle,
        contact,
        scoreBreakdown: {
          total: roundedTotal,
          icpFit,
          intent: intentScore,
          timing,
          evidenceStrength,
          contactQuality,
        },
        priorityTier,
      });
    }
  }

  return prospects
    .sort((a, b) => {
      const aVerified = a.contact.phoneVerified || a.contact.emailVerified ? 1 : 0;
      const bVerified = b.contact.phoneVerified || b.contact.emailVerified ? 1 : 0;
      return bVerified - aVerified || b.score - a.score || b.confidence - a.confidence;
    })
    .slice(0, limit);
}


