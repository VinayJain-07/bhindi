import { describe, expect, it } from "vitest";
import { isLighthouseStorageMissing } from "./storage";

describe("Lighthouse storage errors", () => {
  it("recognizes Prisma's missing-table error without exposing its raw query", () => {
    expect(isLighthouseStorageMissing({ code: "P2021", message: "table does not exist" })).toBe(true);
    expect(isLighthouseStorageMissing({ code: "P2022" })).toBe(false);
  });
});
