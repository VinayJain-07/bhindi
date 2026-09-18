import "server-only";

import { load } from "cheerio";
import { assertPublicUrl } from "@/lib/crawl/url-safety";

const MAX_LOGO_BYTES = 2_000_000;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml", "image/avif", "image/bmp", "image/x-icon", "image/vnd.microsoft.icon"]);

async function fetchPublicUrl(initial: URL, accept: string): Promise<Response> {
  let current = initial;
  for (let redirect = 0; redirect < 5; redirect += 1) {
    await assertPublicUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(current, {
        cache: "no-store",
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "SmarkConnectLogoBot/1.0 (+https://smarkconnect.local)", Accept: accept },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw new Error("The logo source returned an invalid redirect.");
        current = new URL(location, current);
        continue;
      }
      return response;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("The logo source redirected too many times.");
}

function metadataCandidates(html: string, baseUrl: string): { images: string[]; manifests: string[] } {
  const $ = load(html);
  const scored = $("link[href]").map((_, element) => {
    const rel = ($(element).attr("rel") ?? "").toLowerCase();
    if (!rel.includes("icon")) return null;
    const href = $(element).attr("href");
    if (!href) return null;
    const sizes = $(element).attr("sizes") ?? "";
    const largestSize = Math.max(0, ...Array.from(sizes.matchAll(/(\d+)x\d+/gi), (match) => Number(match[1])));
    const score = (rel.includes("apple-touch-icon") ? 500 : 0) + (rel.includes("shortcut") ? 50 : 100) + Math.min(largestSize, 400);
    try { return { url: new URL(href, baseUrl).href, score }; } catch { return null; }
  }).get().filter((item): item is { url: string; score: number } => Boolean(item));
  const explicitLogo = $('meta[property="og:logo"], meta[name="logo"]').first().attr("content");
  if (explicitLogo) {
    try { scored.push({ url: new URL(explicitLogo, baseUrl).href, score: 900 }); } catch { /* Ignore malformed metadata. */ }
  }
  const socialImage = $('meta[property="og:image"], meta[name="twitter:image"], meta[name="twitter:image:src"]').first().attr("content");
  if (socialImage) {
    try { scored.push({ url: new URL(socialImage, baseUrl).href, score: 550 }); } catch { /* Ignore malformed metadata. */ }
  }
  $("img[src], img[data-src], source[srcset]").each((_, element) => {
    const source = $(element).attr("src") ?? $(element).attr("data-src") ?? $(element).attr("srcset")?.split(",", 1)[0]?.trim();
    if (!source) return;
    const context = `${$(element).attr("alt") ?? ""} ${$(element).attr("class") ?? ""} ${$(element).attr("id") ?? ""} ${source}`;
    if (!/logo|brand|wordmark|monogram|favicon|icon/i.test(context)) return;
    try { scored.push({ url: new URL(source, baseUrl).href, score: 650 }); } catch { /* Ignore malformed metadata. */ }
  });
  const manifests = $("link[href]").map((_, element) => {
    const rel = ($(element).attr("rel") ?? "").toLowerCase();
    const href = $(element).attr("href");
    if (!href || !rel.split(/\s+/).includes("manifest")) return null;
    try { return new URL(href, baseUrl).href; } catch { return null; }
  }).get().filter((item): item is string => Boolean(item));
  return {
    images: [...new Set(scored.sort((a, b) => b.score - a.score).map((item) => item.url))],
    manifests: [...new Set(manifests)],
  };
}

function normalizedImageType(response: Response): string | null {
  const type = (response.headers.get("content-type") ?? "").split(";", 1)[0].trim().toLowerCase();
  return IMAGE_TYPES.has(type) ? type : null;
}

function sniffImageType(body: ArrayBuffer, declaredType: string | null, sourceUrl: string): string | null {
  const bytes = new Uint8Array(body).subarray(0, 32);
  const text = new TextDecoder().decode(new Uint8Array(body).subarray(0, 512)).trimStart().toLowerCase();
  if (/<!doctype html|<html[\s>]/i.test(text)) return null;
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (text.startsWith("gif8")) return "image/gif";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  if (text.startsWith("<svg") || (text.startsWith("<?xml") && /<svg[\s>]/i.test(text))) return "image/svg+xml";
  if (bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] === 0x00 && (bytes[2] === 0x01 || bytes[2] === 0x02) && bytes[3] === 0x00) return "image/x-icon";
  if (declaredType && IMAGE_TYPES.has(declaredType)) return declaredType;
  if (declaredType === "application/octet-stream" || declaredType === "text/plain" || declaredType === "text/xml" || declaredType === "application/xml") {
    const extension = new URL(sourceUrl).pathname.toLowerCase();
    if (extension.endsWith(".svg")) return "image/svg+xml";
  }
  return null;
}

export function fallbackCompanyLogoUrls(websiteUrl: string | URL): string[] {
  try {
    const url = websiteUrl instanceof URL ? websiteUrl : new URL(/^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`);
    const domain = url.hostname.replace(/^www\./i, "");
    return [
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
      `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`,
    ];
  } catch {
    return [];
  }
}

export async function resolveCompanyLogo(websiteUrl: URL, currentLogoUrl?: string | null): Promise<string | null> {
  if (currentLogoUrl) {
    const currentAsset = await fetchCompanyLogoAsset(currentLogoUrl).catch(() => null);
    if (currentAsset) return currentLogoUrl;
  }
  const discovered = await discoverCompanyLogo(websiteUrl).catch(() => null);
  if (discovered) return discovered;
  for (const fallback of fallbackCompanyLogoUrls(websiteUrl)) {
    if (await fetchCompanyLogoAsset(fallback).catch(() => null)) return fallback;
  }
  return null;
}

export async function discoverCompanyLogo(websiteUrl: URL): Promise<string | null> {
  const homepage = await fetchPublicUrl(websiteUrl, "text/html,application/xhtml+xml");
  if (!homepage.ok) return null;
  const contentType = homepage.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) return null;
  const html = (await homepage.text()).slice(0, 2_000_000);
  const resolvedHome = homepage.url || websiteUrl.href;
  const origin = new URL(resolvedHome).origin;
  const metadata = metadataCandidates(html, resolvedHome);
  const manifestCandidates: string[] = [];
  for (const manifestUrl of metadata.manifests.slice(0, 2)) {
    try {
      const response = await fetchPublicUrl(new URL(manifestUrl), "application/manifest+json,application/json,text/plain");
      if (!response.ok) continue;
      const manifest = JSON.parse(await response.text()) as { icons?: Array<{ src?: string; sizes?: string; type?: string }> };
      for (const icon of manifest.icons ?? []) {
        if (icon.src) manifestCandidates.push(new URL(icon.src, manifestUrl).href);
      }
    } catch { /* Try HTML and conventional candidates when the manifest is unavailable. */ }
  }
  const conventionalCandidates = [
    "/apple-touch-icon.png", "/apple-touch-icon-precomposed.png", "/favicon.ico", "/favicon.png", "/favicon.svg",
    "/logo.svg", "/logo.png", "/brand/logo.svg", "/brand/logo.png", "/assets/logo.svg", "/assets/logo.png",
  ].map((path) => new URL(path, origin).href);
  const candidates = [...metadata.images, ...manifestCandidates, ...conventionalCandidates];

  for (const candidate of [...new Set(candidates)].slice(0, 24)) {
    try {
      const response = await fetchPublicUrl(new URL(candidate), "image/avif,image/webp,image/svg+xml,image/*,*/*;q=0.5");
      const length = Number(response.headers.get("content-length") ?? 0);
      if (response.ok && (!length || length <= MAX_LOGO_BYTES)) {
        const body = await response.arrayBuffer();
        if (body.byteLength && body.byteLength <= MAX_LOGO_BYTES && sniffImageType(body, normalizedImageType(response), response.url || candidate)) {
          return response.url || candidate;
        }
      } else {
        await response.body?.cancel();
      }
    } catch { /* Try the next website-provided icon. */ }
  }
  return null;
}

export async function fetchCompanyLogoAsset(logoUrl: string): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  if (logoUrl.startsWith("data:")) {
    const match = logoUrl.match(/^data:([^;,]+)(;base64)?,(.*)$/);
    if (!match) return null;
    const contentType = match[1] || "image/png";
    const isBase64 = Boolean(match[2]);
    const rawData = match[3];
    const buffer = isBase64 ? Buffer.from(rawData, "base64") : Buffer.from(decodeURIComponent(rawData), "utf8");
    if (!buffer.byteLength || buffer.byteLength > MAX_LOGO_BYTES) return null;
    return { body: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), contentType };
  }
  const response = await fetchPublicUrl(new URL(logoUrl), "image/avif,image/webp,image/svg+xml,image/*,*/*;q=0.5");
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (!response.ok || declaredLength > MAX_LOGO_BYTES) return null;
  const body = await response.arrayBuffer();
  const contentType = sniffImageType(body, normalizedImageType(response), response.url || logoUrl);
  if (!body.byteLength || body.byteLength > MAX_LOGO_BYTES || !contentType) return null;
  return { body, contentType };
}
