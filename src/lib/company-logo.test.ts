import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/crawl/url-safety", () => ({
  assertPublicUrl: vi.fn(async (input: URL) => input),
}));

import { discoverCompanyLogo, fetchCompanyLogoAsset, fallbackCompanyLogoUrls, resolveCompanyLogo } from "./company-logo";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("company logo discovery", () => {
  it("accepts valid SVG payloads even when the server sends a generic content type", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<svg xmlns=\"http://www.w3.org/2000/svg\"><path /></svg>", {
      status: 200,
      headers: { "content-type": "text/plain" },
    })));

    const asset = await fetchCompanyLogoAsset("https://cdn.example.com/brand.svg");

    expect(asset?.contentType).toBe("image/svg+xml");
    expect(asset?.body.byteLength).toBeGreaterThan(0);
  });

  it("finds logo images declared on the page when a favicon is absent", async () => {
    const fetchMock = vi.fn(async (input: URL | string) => {
      const url = String(input);
      if (url === "https://example.com/") {
        return new Response('<html><body><img class="brand-logo" src="/assets/brand.svg" alt="Example logo" /></body></html>', {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }
      return new Response("<svg xmlns=\"http://www.w3.org/2000/svg\"><path /></svg>", {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(discoverCompanyLogo(new URL("https://example.com/"))).resolves.toBe("https://example.com/assets/brand.svg");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to a public favicon provider when the site has no usable logo", async () => {
    const fetchMock = vi.fn(async (input: URL | string) => {
      const url = String(input);
      if (url === "https://example.com/") return new Response(null, { status: 503 });
      return new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), {
        status: 200,
        headers: { "content-type": "application/octet-stream" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const fallback = fallbackCompanyLogoUrls("https://example.com")[0];
    await expect(resolveCompanyLogo(new URL("https://example.com/"))).resolves.toBe(fallback);
  });
});
