import { describe, expect, it } from "vitest";
import { normalizeAuditTarget } from "./url";

describe("failed public websites", () => {
  it("returns UNREACHABLE when the reserved .invalid host cannot resolve", async () => {
    await expect(normalizeAuditTarget("https://smark-lighthouse-test.invalid")).rejects.toMatchObject({ code: "UNREACHABLE" });
  });
});
