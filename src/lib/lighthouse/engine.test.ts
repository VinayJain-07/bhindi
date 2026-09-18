import { describe, expect, it, vi } from "vitest";
import { lighthouseFlags, withBrowserCleanup } from "./engine";

describe("Lighthouse browser lifecycle", () => {
  it("closes Chromium after successful and failed audits", async () => {
    const closeAfterSuccess = vi.fn(async () => undefined);
    await expect(withBrowserCleanup(async () => ({ close: closeAfterSuccess }), async () => "complete", new AbortController().signal)).resolves.toBe("complete");
    expect(closeAfterSuccess).toHaveBeenCalledTimes(1);

    const closeAfterFailure = vi.fn(async () => undefined);
    await expect(withBrowserCleanup(async () => ({ close: closeAfterFailure }), async () => { throw new Error("navigation failed"); }, new AbortController().signal)).rejects.toThrow("navigation failed");
    expect(closeAfterFailure).toHaveBeenCalledTimes(1);
  });
});

describe("Lighthouse strategies", () => {
  it("configures distinct mobile and desktop audit modes", () => {
    const mobile = lighthouseFlags("mobile", 9222);
    const desktop = lighthouseFlags("desktop", 9333);

    expect(mobile).toMatchObject({ port: 9222, formFactor: "mobile", maxWaitForLoad: 60_000, screenEmulation: { mobile: true, width: 412 } });
    expect(desktop).toMatchObject({ port: 9333, formFactor: "desktop", maxWaitForLoad: 60_000, screenEmulation: { mobile: false, width: 1350 } });
    expect(mobile.onlyCategories).toEqual(["performance", "accessibility", "seo", "best-practices"]);
    expect(desktop.onlyCategories).toEqual(mobile.onlyCategories);
  });
});
