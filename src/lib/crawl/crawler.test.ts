import { describe, expect, it, vi } from "vitest";

vi.mock("./url-safety", () => ({ assertPublicUrl: async (url: URL) => url }));

import { crawlWebsite } from "./crawler";

describe("website crawling", () => {
  it("retains successfully fetched linked pages and follows their evidence", async () => {
    const content = "Verified company evidence ".repeat(30);
    const fetchMock = vi.fn(async (input: URL) => {
      if (input.pathname === "/sitemap.xml") return new Response("", { status: 404 });
      const links = input.pathname === "/" ? '<a href="/about">About</a><a href="/pricing">Pricing</a>' : "";
      return new Response(`<html><body><main>${content}${links}</main></body></html>`, { headers: { "content-type": "text/html" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      const pages = await crawlWebsite(new URL("https://example.test/"), 3);
      expect(pages.map((page) => page.url)).toEqual([
        "https://example.test",
        "https://example.test/about",
        "https://example.test/pricing",
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
