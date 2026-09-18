import "server-only";
import type { AgentType } from "@prisma/client";
import { load } from "cheerio";

export type LiveDiscoveryItem = {
  title: string;
  url: string;
  excerpt: string;
  publishedAt: string | null;
  discoverySource: string;
  query: string;
};

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(item: string, name: string): string {
  return decodeXml(item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] ?? "");
}

export function buildResearchQueries(agentType: AgentType, companyName: string, domain: string, topics: string[]): string[] {
  const topic = topics.slice(0, 4).join(" ") || companyName;
  const focusedTopics = Array.from(new Set(topics.map((item) => item.trim()).filter(Boolean))).slice(0, 4);
  const category = focusedTopics[0] || companyName;
  const primaryOffer = focusedTopics[1] || category;
  const secondaryOffer = focusedTopics[2] || primaryOffer;
  const brand = `"${companyName}" OR "${domain}"`;
  const redditCustomerQueries = (topics.length ? topics : [companyName]).slice(0, 4).flatMap((item) => [
    `"${item}" help recommend`,
    `"${item}" problem struggling`,
    `"${item}" alternative looking for`,
  ]);
  const queries: Partial<Record<AgentType, string[]>> = {
    X: [`site:x.com (${brand})`, `site:x.com ${topic}`],
    REDDIT: redditCustomerQueries,
    LINKEDIN: [`site:linkedin.com/posts (${brand})`, `site:linkedin.com/posts ${topic}`],
    INSTAGRAM: [`site:instagram.com (${brand})`, `site:instagram.com ${topic}`],
    YOUTUBE: [`site:youtube.com ${topic}`, `site:youtube.com (${brand})`],
    ARTICLES: [`${topic} guide OR analysis`, `${brand} insights`],
    COMPETITOR: [
      `"${companyName}" competitors alternatives`,
      `"${category}" "${primaryOffer}" companies`,
      `"${category}" providers similar services`,
      `"${primaryOffer}" "${secondaryOffer}" companies`,
      `"${category}" direct competitors`,
      `best "${category}" providers "${primaryOffer}"`,
    ],
    AUDIENCE: [`${topic} questions challenges`, `site:reddit.com ${topic} help`],
    CONTENT_AUDIT: [`${topic} latest research`, `${brand} content`],
    GEO: [`${brand}`, `${topic} expert sources`],
    SEO: [`site:${domain}`, `${brand}`],
    TECHNICAL_SEO: [`site:${domain}`, `${domain} performance`],
    CAMPAIGN_PLANNER: [`${topic} campaign trends`, `${brand} campaign`],
    CREATIVE_VISUAL: [`${topic} campaign creative`, `${brand} design`],
    UGC_INFLUENCER: [`${topic} creator review`, `${brand} creator`],
    EMAIL_NEWSLETTER: [`${topic} newsletter`, `${brand} newsletter`],
    PAID_MEDIA: [`${topic} advertising`, `${brand} ads`],
    COMMUNITY: [`${topic} community questions`, `site:reddit.com ${topic}`],
  };
  return (queries[agentType] ?? [`${brand}`, `${topic} latest`]).slice(0, agentType === "REDDIT" ? 6 : agentType === "COMPETITOR" ? 6 : 2);
}

async function searchBingRss(query: string): Promise<LiveDiscoveryItem[]> {
  const url = new URL("https://www.bing.com/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "rss");
  url.searchParams.set("count", "8");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "User-Agent": "SmarkConnectResearch/1.0 (+website research; read-only)" },
    });
    if (!response.ok) return [];
    const xml = await response.text();
    return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi), (match) => match[1]).map((item) => {
      const published = tag(item, "pubDate");
      const rawUrl = tag(item, "link");
      return {
        title: tag(item, "title"),
        url: /^https?:\/\//i.test(rawUrl) ? rawUrl : "",
        excerpt: tag(item, "description").slice(0, 520),
        publishedAt: published && !Number.isNaN(Date.parse(published)) ? new Date(published).toISOString() : null,
        discoverySource: "Bing public web index",
        query,
      };
    }).filter((item) => item.title && item.url);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function searchDuckDuckGo(query: string): Promise<LiveDiscoveryItem[]> {
  const url = new URL("https://html.duckduckgo.com/html/");
  url.searchParams.set("q", query);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (!response.ok) return [];
    const html = await response.text();
    const $ = load(html);
    const results: LiveDiscoveryItem[] = [];
    $(".result").each((_, el) => {
      const title = $(el).find(".result__title").text().trim();
      let rawUrl = $(el).find(".result__url").text().trim() || $(el).find(".result__snippet").attr("href") || "";
      const excerpt = $(el).find(".result__snippet").text().trim();
      if (!rawUrl.startsWith("http") && rawUrl.includes(".")) {
        rawUrl = `https://${rawUrl.replace(/^www\./, "")}`;
      }
      if (title && rawUrl.startsWith("http")) {
        results.push({
          title,
          url: rawUrl,
          excerpt: excerpt.slice(0, 520),
          publishedAt: null,
          discoverySource: "DuckDuckGo web index",
          query,
        });
      }
    });
    return results.slice(0, 6);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function searchRedditRss(query: string): Promise<LiveDiscoveryItem[]> {
  const url = new URL("https://www.reddit.com/search.rss");
  url.searchParams.set("q", query.replace(/site:reddit\.com\s*/gi, "").replace(/[()]/g, " "));
  url.searchParams.set("sort", "new");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "no-store", headers: { "User-Agent": "SmarkConnectResearch/1.0 (+read-only community research)" } });
    if (!response.ok) return [];
    const xml = await response.text();
    return Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi), (match) => match[1]).map((entry) => {
      const rawUrl = entry.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1]?.replace(/&amp;/g, "&") ?? "";
      const updated = tag(entry, "updated");
      return { title: tag(entry, "title"), url: rawUrl, excerpt: tag(entry, "content").slice(0, 520), publishedAt: updated && !Number.isNaN(Date.parse(updated)) ? new Date(updated).toISOString() : null, discoverySource: "Reddit public search feed", query };
    }).filter((item) => item.title && /^https?:\/\/(?:www\.)?reddit\.com\//i.test(item.url));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function discoverOfficialProfiles(websiteUrl: string, agentType: AgentType): Promise<LiveDiscoveryItem[]> {
  const domains: Partial<Record<AgentType, string[]>> = { X: ["x.com", "twitter.com"], LINKEDIN: ["linkedin.com"], INSTAGRAM: ["instagram.com"], YOUTUBE: ["youtube.com", "youtu.be"] };
  const expected = domains[agentType];
  if (!expected) return [];
  try {
    const response = await fetch(websiteUrl, { cache: "no-store", headers: { "User-Agent": "SmarkConnectResearch/1.0" }, signal: AbortSignal.timeout(12_000) });
    if (!response.ok) return [];
    const $ = load(await response.text());
    const urls = Array.from(new Set($("a[href]").map((_, element) => $(element).attr("href") ?? "").get().flatMap((href) => { try { return [new URL(href, websiteUrl).toString()]; } catch { return []; } }).filter((url) => { const host = new URL(url).hostname.replace(/^www\./, ""); return expected.some((domainName) => host === domainName || host.endsWith(`.${domainName}`)); })));
    return urls.slice(0, 3).map((url) => ({ title: `Official ${agentType === "X" ? "X" : agentType.slice(0, 1) + agentType.slice(1).toLowerCase()} profile linked by the company website`, url, excerpt: "This profile is directly linked from the company's owned website. Open it to validate the latest native posts; authenticated performance data requires the platform connector.", publishedAt: null, discoverySource: "Company-owned website social link", query: websiteUrl }));
  } catch {
    return [];
  }
}

export async function discoverLiveResearch(args: {
  agentType: AgentType;
  companyName: string;
  websiteUrl: string;
  topics: string[];
}): Promise<LiveDiscoveryItem[]> {
  const domain = new URL(args.websiteUrl).hostname.replace(/^www\./, "");
  const queries = buildResearchQueries(args.agentType, args.companyName, domain, args.topics);
  const settled = await Promise.allSettled(
    queries.map(async (query) => {
      if (args.agentType === "REDDIT") return searchRedditRss(query);
      const bing = await searchBingRss(query);
      if (bing.length > 0) return bing;
      return searchDuckDuckGo(query);
    })
  );
  const profileItems = await discoverOfficialProfiles(args.websiteUrl, args.agentType);
  const items = [...profileItems, ...settled.flatMap((result) => result.status === "fulfilled" ? result.value : [])];
  const requiredDomains: Partial<Record<AgentType, string[]>> = { X: ["x.com", "twitter.com"], REDDIT: ["reddit.com"], LINKEDIN: ["linkedin.com"], INSTAGRAM: ["instagram.com"], YOUTUBE: ["youtube.com", "youtu.be"] };
  const allowed = requiredDomains[args.agentType];
  const relevanceTerms = Array.from(new Set([...args.companyName, ...args.topics].flatMap((value) => value.toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? []))).filter((term) => !["company", "the", "with", "services", "solutions"].includes(term));
  
  return items.filter((item) => {
    if (!allowed) return true;
    try { const hostname = new URL(item.url).hostname.replace(/^www\./, ""); return allowed.some((domainName) => hostname === domainName || hostname.endsWith(`.${domainName}`)); } catch { return false; }
  }).filter((item) => {
    // For competitor discovery, competitor items will not contain the client's own company name, so do not filter them out
    if (args.agentType === "COMPETITOR") return true;
    return item.discoverySource === "Company-owned website social link" || !relevanceTerms.length || relevanceTerms.some((term) => `${item.title} ${item.excerpt}`.toLowerCase().includes(term));
  }).filter((item, index, values) => values.findIndex((candidate) => candidate.url === item.url) === index).slice(0, 10);
}

export function liveResearchAction(agentType: AgentType): string {
  const actions: Partial<Record<AgentType, string>> = {
    REDDIT: "Open the thread, confirm it is active and relevant, then answer the underlying question with a specific, non-promotional explanation before mentioning the brand.",
    LINKEDIN: "Use this as a current conversation signal; publish a company-page post that adds an original framework, example, or counterpoint rather than repeating the source.",
    X: "Validate the post context, then contribute a concise reply or publish a sourced point-of-view post with one useful takeaway.",
    INSTAGRAM: "Translate the underlying theme into a native Reel or carousel with a concrete first-frame promise and a save-worthy takeaway.",
    YOUTUBE: "Use the topic as packaging evidence, then create a differentiated video angle with a stronger promise, proof plan, and retention outline.",
    ARTICLES: "Turn the signal into a sourced brief only if it fills a verified audience or search-intent gap; cite the primary evidence in the finished article.",
  };
  return actions[agentType] ?? `Review this current source, verify its relevance and publication context, then incorporate the supported insight into the ${agentType.toLowerCase().replaceAll("_", " ")} plan.`;
}
