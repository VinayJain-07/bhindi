import { load } from "cheerio";
import { assertPublicUrl } from "./url-safety";

export type CrawledPage = {
  url: string;
  title: string;
  description: string;
  content: string;
  statusCode: number;
  wordCount: number;
  links: string[];
};

const pageHints = ["about", "product", "service", "solution", "platform", "pricing", "customer", "case-stud", "feature", "industry", "resource", "blog", "insight", "guide", "use-case", "faq"];
const excludedHints = ["/login", "/sign-in", "/signup", "/cart", "/checkout", "/privacy", "/terms", "/cookie", "/author/", "/tag/", "/wp-admin"];

async function fetchWithSafeRedirects(initial: URL): Promise<Response> {
  let current = initial;
  for (let redirect = 0; redirect < 5; redirect += 1) {
    await assertPublicUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(current, {
        redirect: "manual",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw new Error("The website returned an invalid redirect.");
        current = new URL(location, current);
        continue;
      }
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new Error("The website took too long to respond.");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("The website redirected too many times.");
}

export async function crawlPage(url: URL): Promise<CrawledPage> {
  const response = await fetchWithSafeRedirects(url);
  if (!response.ok) throw new Error(`The website returned HTTP ${response.status}.`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) throw new Error("The URL did not return an HTML page.");
  const html = (await response.text()).slice(0, 2_000_000);
  const $ = load(html);
  const links = $("a[href]").map((_, element) => {
    try { return new URL($(element).attr("href")!, response.url || url).href; } catch { return null; }
  }).get().filter((link): link is string => Boolean(link));
  $("script, style, noscript, svg, canvas, iframe, template, nav, footer").remove();
  const title = $("title").first().text().replace(/\s+/g, " ").trim();
  const description = $('meta[name="description"]').attr("content")?.replace(/\s+/g, " ").trim() ?? "";
  const root = $("main").first().length ? $("main").first() : $("body").first();
  const content = root.text().replace(/\s+/g, " ").trim().slice(0, 30_000);
  return { url: response.url || url.href, title, description, content, statusCode: response.status, wordCount: content ? content.split(/\s+/).length : 0, links };
}

function isSameApex(urlA: string, originB: string): boolean {
  try {
    const hostA = new URL(urlA).hostname.replace(/^www\./, "").toLowerCase();
    const hostB = new URL(originB).hostname.replace(/^www\./, "").toLowerCase();
    return hostA === hostB;
  } catch {
    return false;
  }
}

function normalizedCandidate(href: string, origin: string): string | null {
  try {
    const url = new URL(href);
    url.hash = "";
    if (!isSameApex(url.href, origin) || /\.(pdf|jpg|jpeg|png|gif|svg|webp|zip|mp4|mp3|xml)(?:$|\?)/i.test(url.href)) return null;
    if (excludedHints.some((hint) => url.pathname.toLowerCase().includes(hint))) return null;
    return url.href.replace(/\/$/, "") || `${origin}/`;
  } catch {
    return null;
  }
}

function candidateScore(href: string): number {
  const pathname = new URL(href).pathname.toLowerCase();
  return pageHints.reduce((total, hint) => total + (pathname.includes(hint) ? 3 : 0), 0) - pathname.split("/").length * 0.15 - (pathname.match(/\d{4}/) ? 1 : 0);
}

async function discoverSitemapUrls(origin: string): Promise<string[]> {
  const sitemap = new URL("/sitemap.xml", origin);
  try {
    const response = await fetchWithSafeRedirects(sitemap);
    if (!response.ok) return [];
    const xml = (await response.text()).slice(0, 4_000_000);
    const $ = load(xml, { xmlMode: true });
    const locations = $("loc").map((_, element) => $(element).text().trim()).get().filter(Boolean);
    const nested = locations.filter((value) => /\.xml(?:$|\?)/i.test(value)).slice(0, 8);
    const pageLocations = locations.filter((value) => !/\.xml(?:$|\?)/i.test(value));
    const nestedResults = await Promise.allSettled(nested.map(async (value) => {
      const nestedUrl = new URL(value, origin);
      if (!isSameApex(nestedUrl.href, origin)) return [];
      const nestedResponse = await fetchWithSafeRedirects(nestedUrl);
      if (!nestedResponse.ok) return [];
      const nestedXml = (await nestedResponse.text()).slice(0, 4_000_000);
      const parsed = load(nestedXml, { xmlMode: true });
      return parsed("loc").map((_, element) => parsed(element).text().trim()).get().filter((location) => location && !/\.xml(?:$|\?)/i.test(location));
    }));
    return [...pageLocations, ...nestedResults.flatMap((result) => result.status === "fulfilled" ? result.value : [])];
  } catch {
    return [];
  }
}

async function renderPageWithBrowser(url: URL): Promise<CrawledPage | null> {
  try {
    const { Launcher } = await import("chrome-launcher");
    const puppeteer = (await import("puppeteer-core")).default;
    const executable = process.env.PUPPETEER_EXECUTABLE_PATH ?? process.env.CHROME_PATH ?? Launcher.getInstallations()[0];
    if (!executable) return null;
    const browser = await puppeteer.launch({
      executablePath: executable,
      headless: true,
      args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    });
    try {
      const page = await browser.newPage();
      await page.setUserAgent("SmarkConnectAuditBot/1.0 (+https://smarkconnect.local)");
      await page.setRequestInterception(true);
      page.on("request", async (request) => {
        try {
          const target = new URL(request.url());
          if (["data:", "blob:", "about:"].includes(target.protocol)) return await request.continue();
          await assertPublicUrl(target);
          await request.continue();
        } catch {
          await request.abort("blockedbyclient");
        }
      });
      await page.goto(url.href, { waitUntil: "networkidle2", timeout: 20_000 });
      const html = await page.content();
      const $ = load(html);
      const links = $("a[href]").map((_, element) => {
        try { return new URL($(element).attr("href")!, url.href).href; } catch { return null; }
      }).get().filter((link): link is string => Boolean(link));
      $("script, style, noscript, svg, canvas, iframe, template, nav, footer").remove();
      const title = $("title").first().text().replace(/\s+/g, " ").trim();
      const description = $('meta[name="description"]').attr("content")?.replace(/\s+/g, " ").trim() ?? "";
      const root = $("main").first().length ? $("main").first() : $("body").first();
      const content = root.text().replace(/\s+/g, " ").trim().slice(0, 30_000);
      return { url: url.href, title, description, content, statusCode: 200, wordCount: content ? content.split(/\s+/).length : 0, links };
    } finally {
      await browser.close();
    }
  } catch {
    return null;
  }
}

export async function crawlWebsite(input: URL, maxPages = 48, onProgress?: (pagesRead: number, target: number) => Promise<void>): Promise<CrawledPage[]> {
  let home = await crawlPage(input);
  if (home.wordCount < 25) {
    const rendered = await renderPageWithBrowser(input);
    if (rendered && rendered.wordCount >= 20) {
      home = rendered;
    }
  }
  const origin = new URL(home.url).origin;
  const results: CrawledPage[] = [];
  // Queued URLs and retained pages are distinct. Marking a URL as seen before
  // fetching previously caused every successful linked page to be discarded.
  const retained = new Set<string>();
  const queued = new Set<string>();
  const queue: string[] = [];

  const addResult = (page: CrawledPage): boolean => {
    const cleanUrl = normalizedCandidate(page.url, origin) ?? page.url;
    if (retained.has(cleanUrl)) return false;
    retained.add(cleanUrl);
    results.push({ ...page, url: cleanUrl });
    return true;
  };

  addResult(home);

  const enqueue = (hrefs: string[]) => {
    for (const href of hrefs) {
      const candidate = normalizedCandidate(href, origin);
      if (!candidate || retained.has(candidate) || queued.has(candidate)) continue;
      queued.add(candidate);
      queue.push(candidate);
    }
    queue.sort((a, b) => candidateScore(b) - candidateScore(a));
  };

  enqueue(home.links);
  enqueue(await discoverSitemapUrls(origin));
  await onProgress?.(results.length, maxPages);

  while (queue.length && results.length < maxPages) {
    const batch = queue.splice(0, Math.min(6, maxPages - results.length));
    batch.forEach((href) => { queued.delete(href); });
    const settled = await Promise.allSettled(batch.map((href) => crawlPage(new URL(href))));
    for (const result of settled) {
      if (result.status !== "fulfilled" || result.value.wordCount < 10) continue;
      const added = addResult(result.value);
      if (added) {
        enqueue(result.value.links);
      }
    }
    await onProgress?.(results.length, maxPages);
  }
  return results.slice(0, maxPages);
}
