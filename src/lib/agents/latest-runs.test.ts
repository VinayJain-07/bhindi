import { describe, expect, it } from "vitest";
import { newestRunPerAgent } from "./latest-runs";

describe("newestRunPerAgent", () => {
  it("retains the first and therefore newest run for each agent type", () => {
    const result = newestRunPerAgent([
      { id: "competitor-new", agentType: "COMPETITOR" },
      { id: "seo-new", agentType: "SEO" },
      { id: "competitor-old", agentType: "COMPETITOR" },
    ]);

    expect(result.map((run) => run.id)).toEqual(["competitor-new", "seo-new"]);
  });
});
