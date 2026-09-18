import "server-only";
import type { SearchMapQuery } from "./search-map";

export type RawRedditCandidate = {
  id: string;
  url: string;
  subreddit: string;
  title: string;
  excerpt: string;
  author: string;
  publishedAt: string | null;
  score: number | null;
  numComments: number | null;
  query: string;
  queryFamily: string;
  discoverySource: string;
  verified: boolean;
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
    .replace(/\s+/g, " ")
    .trim();
}

function tag(item: string, name: string): string {
  return decodeXml(item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] ?? "");
}

function extractSubredditFromUrl(url: string): string {
  const match = url.match(/reddit\.com\/r\/([^/]+)/i);
  return match?.[1] ? `r/${match[1]}` : "r/SaaS";
}

function extractPostIdFromUrl(url: string): string | null {
  const match = url.match(/\/comments\/([a-z0-9]{5,10})(?:\/|$)/i);
  return match?.[1]?.toLowerCase() || null;
}

export function hasVerifiedRedditIdentity(candidate: Pick<RawRedditCandidate, "id" | "url" | "verified">): boolean {
  try {
    const url = new URL(candidate.url);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    const postId = extractPostIdFromUrl(url.pathname);
    return candidate.verified && host === "reddit.com" && Boolean(postId) && postId === candidate.id.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Searches public Reddit RSS feed
 */
async function searchRedditRss(queryObj: SearchMapQuery, subreddit?: string): Promise<RawRedditCandidate[]> {
  const cleanQ = queryObj.query.replace(/site:reddit\.com\s*/gi, "").replace(/[()]/g, " ").trim();
  const searchUrl = subreddit
    ? `https://www.reddit.com/${subreddit.replace(/^\/?/, "")}/search.rss?q=${encodeURIComponent(cleanQ)}&restrict_sr=1&sort=relevance&t=all`
    : `https://www.reddit.com/search.rss?q=${encodeURIComponent(cleanQ)}&sort=relevance&t=all`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(searchUrl, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "SmarkConnectResearch/2.0 (+https://thesmarketers.com; read-only opportunity discovery)",
      },
    });

    if (!response.ok) return [];
    const xml = await response.text();
    const entries = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi), (m) => m[1]);

    return entries.map((entry): RawRedditCandidate | null => {
      const rawUrl = entry.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1]?.replace(/&amp;/g, "&") ?? "";
      const updated = tag(entry, "updated");
      const title = tag(entry, "title");
      const content = tag(entry, "content");
      const sub = subreddit ? (subreddit.startsWith("r/") ? subreddit : `r/${subreddit}`) : extractSubredditFromUrl(rawUrl);
      const postId = extractPostIdFromUrl(rawUrl);
      if (!postId) return null;

      return {
        id: postId,
        url: rawUrl,
        subreddit: sub,
        title,
        excerpt: content.slice(0, 700),
        author: tag(entry, "name") || "reddit_user",
        publishedAt: updated && !Number.isNaN(Date.parse(updated)) ? new Date(updated).toISOString() : null,
        score: null,
        numComments: null,
        query: queryObj.query,
        queryFamily: queryObj.family,
        discoverySource: "Reddit public RSS search feed",
        verified: true,
      };
    }).filter((item): item is RawRedditCandidate => Boolean(item?.title && /^https?:\/\/(?:www\.)?reddit\.com\//i.test(item.url)));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Searches Bing web index for Reddit discussions
 */
async function searchBingForReddit(queryObj: SearchMapQuery): Promise<RawRedditCandidate[]> {
  const searchQuery = `site:reddit.com ${queryObj.query}`;
  const url = new URL("https://www.bing.com/search");
  url.searchParams.set("q", searchQuery);
  url.searchParams.set("format", "rss");
  url.searchParams.set("count", "10");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "SmarkConnectResearch/2.0 (+read-only public research)",
      },
    });

    if (!response.ok) return [];
    const xml = await response.text();
    const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi), (m) => m[1]);

    return items.map((item): RawRedditCandidate | null => {
      const rawUrl = tag(item, "link");
      const title = tag(item, "title").replace(/\s*:\s*r\/[a-zA-Z0-9_]+\s*$/i, "").replace(/\s*-\s*Reddit\s*$/i, "");
      const excerpt = tag(item, "description");
      const published = tag(item, "pubDate");
      const sub = extractSubredditFromUrl(rawUrl);
      const postId = extractPostIdFromUrl(rawUrl);
      if (!postId) return null;

      return {
        id: postId,
        url: rawUrl,
        subreddit: sub,
        title,
        excerpt: excerpt.slice(0, 700),
        author: "reddit_user",
        publishedAt: published && !Number.isNaN(Date.parse(published)) ? new Date(published).toISOString() : null,
        score: null,
        numComments: null,
        query: queryObj.query,
        queryFamily: queryObj.family,
        discoverySource: "Public web search index (Reddit)",
        verified: false,
      };
    }).filter((item): item is RawRedditCandidate => Boolean(item?.title && /^https?:\/\/(?:www\.)?reddit\.com\//i.test(item.url)));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Searches public Reddit JSON API with safety and polite rate handling
 */
async function searchRedditJson(queryObj: SearchMapQuery, subreddit?: string): Promise<RawRedditCandidate[]> {
  const cleanQ = queryObj.query.replace(/site:reddit\.com\s*/gi, "").replace(/[()]/g, " ").trim();
  const searchUrl = subreddit
    ? `https://www.reddit.com/${subreddit.replace(/^\/?/, "")}/search.json?q=${encodeURIComponent(cleanQ)}&restrict_sr=1&sort=relevance&t=all&limit=15`
    : `https://www.reddit.com/search.json?q=${encodeURIComponent(cleanQ)}&sort=relevance&t=all&limit=15`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(searchUrl, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SmarkConnect/2.0 (read-only research)",
      },
    });

    if (!response.ok) return [];
    const data = (await response.json()) as {
      data?: {
        children?: Array<{
          data?: {
            id?: string;
            title?: string;
            selftext?: string;
            permalink?: string;
            subreddit_name_prefixed?: string;
            author?: string;
            created_utc?: number;
            ups?: number;
            num_comments?: number;
          };
        }>;
      };
    };
    const children = data?.data?.children || [];
    const candidates: RawRedditCandidate[] = [];
    for (const c of children) {
      const d = c.data;
      if (!d || !d.title || !d.permalink) continue;
      const fullUrl = `https://www.reddit.com${d.permalink}`;
      if (!/^https?:\/\/(?:www\.)?reddit\.com\//i.test(fullUrl)) continue;
      const urlPostId = extractPostIdFromUrl(fullUrl);
      const postId = d.id?.toLowerCase() || urlPostId;
      if (!postId || !urlPostId || postId !== urlPostId) continue;

      candidates.push({
        id: postId,
        url: fullUrl,
        subreddit: d.subreddit_name_prefixed || (subreddit ? `r/${subreddit.replace(/^r\//, "")}` : "r/SaaS"),
        title: d.title,
        excerpt: (d.selftext || d.title).slice(0, 700),
        author: d.author || "reddit_user",
        publishedAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : null,
        score: d.ups ?? null,
        numComments: d.num_comments ?? null,
        query: queryObj.query,
        queryFamily: queryObj.family,
        discoverySource: "Reddit public JSON API",
        verified: true,
      });
    }
    return candidates;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function verifyIndexedCandidate(candidate: RawRedditCandidate): Promise<RawRedditCandidate | null> {
  if (hasVerifiedRedditIdentity(candidate)) return candidate;
  const postId = extractPostIdFromUrl(candidate.url);
  if (!postId || postId !== candidate.id.toLowerCase()) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`https://www.reddit.com/comments/${postId}.json?raw_json=1`, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "SmarkConnectResearch/2.0 (+https://thesmarketers.com; read-only opportunity verification)",
      },
    });
    if (response.ok) {
      const payload = await response.json() as Array<{
      data?: { children?: Array<{ data?: {
        id?: string;
        title?: string;
        selftext?: string;
        permalink?: string;
        subreddit_name_prefixed?: string;
        author?: string;
        created_utc?: number;
        ups?: number;
        num_comments?: number;
        removed_by_category?: string | null;
      } }> };
    }>;
      const post = payload?.[0]?.data?.children?.[0]?.data;
      if (post?.id && post.id.toLowerCase() === postId && post.title && post.permalink && !post.removed_by_category) {
        const verified: RawRedditCandidate = {
          ...candidate,
          id: postId,
          url: `https://www.reddit.com${post.permalink}`,
          subreddit: post.subreddit_name_prefixed || candidate.subreddit,
          title: post.title,
          excerpt: (post.selftext || post.title).slice(0, 700),
          author: post.author || candidate.author,
          publishedAt: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : null,
          score: post.ups ?? null,
          numComments: post.num_comments ?? null,
          discoverySource: `${candidate.discoverySource}; verified by Reddit JSON API`,
          verified: true,
        };
        if (hasVerifiedRedditIdentity(verified)) return verified;
      }
    }
  } catch {
    // The public JSON endpoint is frequently blocked; verify against the public thread page below.
  } finally {
    clearTimeout(timer);
  }

  const pageController = new AbortController();
  const pageTimer = setTimeout(() => pageController.abort(), 10_000);
  try {
    const response = await fetch(candidate.url, {
      signal: pageController.signal,
      cache: "no-store",
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 SmarkConnectResearch/2.0 (read-only thread verification)" },
    });
    if (!response.ok) return null;
    const finalUrl = response.url || candidate.url;
    const finalPostId = extractPostIdFromUrl(finalUrl);
    if (finalPostId !== postId) return null;
    const html = await response.text();
    if (/page not found|this post was removed|removed by reddit/i.test(html)) return null;
    const verified = {
      ...candidate,
      id: postId,
      url: finalUrl,
      discoverySource: `${candidate.discoverySource}; verified by Reddit thread page`,
      verified: true,
    } satisfies RawRedditCandidate;
    return hasVerifiedRedditIdentity(verified) ? verified : null;
  } catch {
    return null;
  } finally {
    clearTimeout(pageTimer);
  }
}

/**
 * Executes multi-source Reddit discovery for a set of queries and priority subreddits.
 */
export async function discoverRedditCandidates(
  queries: SearchMapQuery[],
  prioritySubreddits: string[]
): Promise<RawRedditCandidate[]> {
  const results: RawRedditCandidate[] = [];

  // Run queries in small batches to respect rate limits
  const queryBatches: SearchMapQuery[][] = [];
  const batchSize = 3;
  for (let i = 0; i < queries.length; i += batchSize) {
    queryBatches.push(queries.slice(i, i + batchSize));
  }

  for (const batch of queryBatches) {
    const settled = await Promise.allSettled(
      batch.flatMap((q) => {
        const fetchers = [
          searchRedditJson(q),
          searchRedditRss(q),
          searchBingForReddit(q),
        ];
        // If targeted subreddits are specified or priority subs available, check top sub
        if (q.targetSubreddits && q.targetSubreddits.length > 0) {
          fetchers.push(searchRedditRss(q, q.targetSubreddits[0]));
        } else if (prioritySubreddits.length > 0) {
          fetchers.push(searchRedditRss(q, prioritySubreddits[0]));
        }
        return fetchers;
      })
    );

    for (const res of settled) {
      if (res.status === "fulfilled" && Array.isArray(res.value)) {
        results.push(...res.value);
      }
    }
  }

  const byPostId = new Map<string, RawRedditCandidate>();
  for (const candidate of results) {
    const postId = extractPostIdFromUrl(candidate.url);
    if (!postId || postId !== candidate.id.toLowerCase()) continue;
    const existing = byPostId.get(postId);
    if (!existing || (candidate.verified && !existing.verified)) byPostId.set(postId, candidate);
  }

  const uniqueCandidates = Array.from(byPostId.values()).slice(0, 80);
  const verifiedCandidates: RawRedditCandidate[] = [];
  for (let index = 0; index < uniqueCandidates.length; index += 8) {
    const batch = uniqueCandidates.slice(index, index + 8);
    const verified = await Promise.all(batch.map(verifyIndexedCandidate));
    verifiedCandidates.push(...verified.filter((candidate): candidate is RawRedditCandidate => Boolean(candidate)));
  }
  return verifiedCandidates;
}
