import { hasVerifiedRedditIdentity, type RawRedditCandidate } from "./fetcher";
import type { CompanyMemory } from "./company-memory";

export type FilteredCandidate = RawRedditCandidate & {
  passedPreFilter: true;
};

const SPAM_PATTERNS = [
  /\b(discount code|promo code|affiliate link|coupon code|buy crypto|telegram group|whatsapp group|dm me for price)\b/i,
  /\b(onlyfans|casino|betting|airdrop|free money|work from home fast cash)\b/i,
  /\b(upvote for upvote|karma farming|sub4sub)\b/i,
  /\b(cheapest smm panel|buy followers|buy backlinks cheap)\b/i,
];

const REMOVED_PATTERNS = [
  /^\[removed\]$/i,
  /^\[deleted\]$/i,
  /this post was removed by/i,
  /post has been removed/i,
];

const ANTI_ICP_PATTERNS = [
  /\b(?:resume review|rate my resume|cv review|interview prep|job interview|job hunt(?:ing)?|entry level job|first (?:marketing|tech|sales|developer) job|internship|how to break into|career advice|career path|career pivot|switch careers|junior marketer|unemployed|got laid off|job offer|salary range|starting salary|underpaid|intern at)\b/i,
  /\b(?:homework|assignment help|university course|college student|degree vs|class project|exam prep|master'?s degree|bachelor'?s degree|undergraduate|phd thesis|dorm room)\b/i,
  /\b(?:dating advice|relationship advice|pc build|gaming setup|best laptop for college|student discount)\b/i,
  /\b(?:roast my portfolio|check out my portfolio|feedback on my portfolio|hire me for|my freelance rate|showcase sunday)\b/i,
];

const RELEVANCE_STOPWORDS = new Set([
  "about", "agency", "and", "are", "best", "business", "client", "company", "consulting", "for", "from", "help", "how", "into", "looking",
  "management", "modern", "platform", "provider", "service", "services", "software", "solution", "solutions",
  "system", "team", "the", "tool", "tools", "using", "what", "with", "workflow", "workflows", "your",
]);

function normalizedPhrase(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+#./ -]/g, " ").replace(/\s+/g, " ").trim();
}

function extractRelevantPhrases(evidenceValues: string[]): string[] {
  const phrases = new Set<string>();
  for (const val of evidenceValues) {
    const norm = normalizedPhrase(val);
    if (norm.length >= 3 && !RELEVANCE_STOPWORDS.has(norm)) {
      phrases.add(norm);
    }
    const parenMatch = val.match(/\(([^)]+)\)/);
    if (parenMatch) {
      const parenNorm = normalizedPhrase(parenMatch[1]);
      if (parenNorm.length >= 2 && !RELEVANCE_STOPWORDS.has(parenNorm)) {
        phrases.add(parenNorm);
      }
      const beforeParen = normalizedPhrase(val.replace(/\([^)]+\)/, ""));
      if (beforeParen.length >= 3 && !RELEVANCE_STOPWORDS.has(beforeParen)) {
        phrases.add(beforeParen);
      }
    }
    if (val.includes("/")) {
      val.split("/").forEach((part) => {
        const pNorm = normalizedPhrase(part);
        if (pNorm.length >= 2 && !RELEVANCE_STOPWORDS.has(pNorm)) {
          phrases.add(pNorm);
        }
      });
    }
  }
  return Array.from(phrases);
}

function distinctiveTerms(values: string[]): string[] {
  return Array.from(new Set(values.flatMap((value) => normalizedPhrase(value).split(/[\s/&,-]+/))))
    .filter((term) => term.length >= 3 && !RELEVANCE_STOPWORDS.has(term));
}

/**
 * Deterministic fast pre-filter for candidate Reddit posts.
 * Runs before LLM/scoring to ensure zero wasted tokens and high precision.
 */
export function runDeterministicPreFilter(
  candidates: RawRedditCandidate[],
  memory: CompanyMemory,
  processedIds: Set<string>,
  maxAgeDays = 1095
): FilteredCandidate[] {
  const seenUrls = new Set<string>();
  const seenIds = new Set<string>(processedIds);
  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

  const evidenceValues = [
    memory.category,
    ...memory.productsAndServices,
    ...memory.featuresAndCapabilities,
    ...memory.primaryKeywords,
    ...memory.secondaryKeywords,
    ...memory.competitors.map((competitor) => competitor.name),
  ];
  const relevantPhrases = extractRelevantPhrases(evidenceValues);
  const relevantTerms = distinctiveTerms(evidenceValues);
  const competitorNames = memory.competitors.map((c) => c.name.toLowerCase()).filter(Boolean);

  const filtered: FilteredCandidate[] = [];

  for (const candidate of candidates) {
    // Only verified Reddit post identities are eligible for the action feed.
    if (!hasVerifiedRedditIdentity(candidate)) continue;

    // 1. Normalized URL & ID Deduplication
    const normUrl = candidate.url.replace(/^https?:\/\/(?:www\.)?reddit\.com/i, "").toLowerCase();
    if (seenUrls.has(normUrl) || seenIds.has(candidate.id)) {
      continue;
    }

    // 2. Minimum content check
    if (!candidate.title || candidate.title.length < 12) {
      continue;
    }

    // 3. Removed/Deleted post filter
    if (
      REMOVED_PATTERNS.some((pat) => pat.test(candidate.title) || pat.test(candidate.excerpt))
    ) {
      continue;
    }

    // 4. Obvious promotional spam / bot filter
    if (
      SPAM_PATTERNS.some((pat) => pat.test(candidate.title) || pat.test(candidate.excerpt))
    ) {
      continue;
    }

    // 5. Anti-ICP noise filter: Drop career seekers, student homework, and casual consumer rants
    const contentText = `${candidate.title} ${candidate.excerpt}`.toLowerCase();
    const isCommercialBuyerIntent =
      /\b(?:hire|hiring)\s+(?:an?\s+|the\s+)?(?:agency|consultant|firm|partner|vendor|provider|specialist)\b/i.test(contentText) ||
      /\b(?:looking for|recommend)\s+(?:an?\s+)?(?:agency|tool|software|platform|partner|solution)\b/i.test(contentText);

    if (!isCommercialBuyerIntent && ANTI_ICP_PATTERNS.some((pat) => pat.test(contentText))) {
      continue;
    }

    // 6. Recency / Staleness filter
    if (candidate.publishedAt) {
      const pubTime = new Date(candidate.publishedAt).getTime();
      const ageMs = now - pubTime;
      // Allow slightly older posts (>30d) only if they have significant engagement (>40 upvotes or >25 comments)
      const score = candidate.score ?? 0;
      const comments = candidate.numComments ?? 0;
      if (ageMs > maxAgeMs && score < 40 && comments < 25) {
        continue;
      }
    }

    // 7. Evidence relevance: Require actual post content to match specific offerings, competitors, or distinctive terms
    const exactPhraseMatch = relevantPhrases.some((phrase) => {
      if (phrase.length <= 4) {
        return new RegExp(`\\b${phrase}\\b`, "i").test(contentText);
      }
      return contentText.includes(phrase);
    });
    const competitorMatch = competitorNames.some((comp) => new RegExp(`\\b${comp}\\b`, "i").test(contentText));
    const matchedTerms = relevantTerms.filter((term) => {
      if (term.length <= 4) {
        return new RegExp(`\\b${term}\\b`, "i").test(contentText);
      }
      return contentText.includes(term);
    });

    // Must match exact phrase/competitor, or at least 2 distinctive domain terms in content,
    // or 1 distinctive domain term if in a designated community context
    const hasRelevance =
      exactPhraseMatch ||
      competitorMatch ||
      matchedTerms.length >= 2 ||
      (matchedTerms.length >= 1 && (candidate.queryFamily !== "broader_icp" || exactPhraseMatch)) ||
      (matchedTerms.length >= 1 && (candidate.subreddit.toLowerCase().includes(matchedTerms[0]) || matchedTerms[0].length >= 5));

    if (!hasRelevance) {
      continue;
    }

    // Passed all pre-filter checks
    seenUrls.add(normUrl);
    seenIds.add(candidate.id);
    filtered.push({
      ...candidate,
      passedPreFilter: true,
    });
  }

  return filtered;
}
