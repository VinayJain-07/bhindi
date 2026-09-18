import { describe, expect, it } from "vitest";
import { isActiveDuplicate, isReusableAudit, LIGHTHOUSE_CACHE_TTL_MS } from "./policy";

describe("Lighthouse cache and duplicate policy", () => {
  const now = new Date("2026-08-29T12:00:00Z");

  it("reuses a completed report inside the 24-hour cache window", () => {
    expect(isReusableAudit({ status: "COMPLETED", result: { scores: {} }, expiresAt: new Date(now.getTime() + LIGHTHOUSE_CACHE_TTL_MS) }, now)).toBe(true);
  });

  it("does not reuse an expired report", () => {
    expect(isReusableAudit({ status: "COMPLETED", result: { scores: {} }, expiresAt: new Date(now.getTime() - 1) }, now)).toBe(false);
  });

  it("recognizes queued and running duplicate jobs", () => {
    expect(isActiveDuplicate({ status: "QUEUED", createdAt: now }, now)).toBe(true);
    expect(isActiveDuplicate({ status: "RUNNING", createdAt: now }, now)).toBe(true);
    expect(isActiveDuplicate({ status: "FAILED" }, now)).toBe(false);
    expect(isActiveDuplicate({ status: "RUNNING", createdAt: new Date(now.getTime() - 200_000) }, now)).toBe(false);
  });
});

