import { describe, expect, it } from "vitest";
import { extractContextCompetitorsFromAgentOutput, selectContextCompetitors } from "./context-display";

const company = { name: "Acme", websiteUrl: "https://acme.example" };

describe("selectContextCompetitors", () => {
  it("extracts company profiles from the intelligence pipeline instead of its strategy findings", () => {
    const result = extractContextCompetitorsFromAgentOutput({
      competitors: [
        {
          name: "Perfect Fit Rival",
          officialWebsite: "https://perfect-fit.example",
          positioningAngle: "A direct alternative for the same buyers.",
          keyFeatures: ["Shared buyer", "Competing offer"],
        },
      ],
      findings: [
        {
          title: "Create a verified competitor set",
          companyName: "Create a verified competitor set",
          officialWebsite: "https://acme.example",
        },
      ],
    });

    expect(result).toEqual([
      expect.objectContaining({
        companyName: "Perfect Fit Rival",
        officialWebsite: "https://perfect-fit.example",
      }),
    ]);
  });

  it("shows only company-backed records from the latest agent set", () => {
    const result = selectContextCompetitors({
      company,
      agentItems: [
        { title: "Competitor Landscape Active", sourceUrls: ["https://acme.example"] },
        { companyName: "Rival One", officialWebsite: "https://rival-one.example" },
      ],
      documentItems: [
        { companyName: "Old Rival", officialWebsite: "https://old-rival.example" },
      ],
    });

    expect(result.map((item) => item.companyName)).toEqual(["Rival One"]);
  });

  it("falls back to document metadata when the agent has no verified companies", () => {
    const result = selectContextCompetitors({
      company,
      agentItems: [{ title: "Strategic summary" }],
      documentItems: [
        { companyName: "Rival One", officialWebsite: "rival-one.example" },
        { companyName: "Acme", officialWebsite: "https://acme.example" },
      ],
    });

    expect(result.map((item) => item.companyName)).toEqual(["Rival One"]);
  });

  it("deduplicates aliases that point to the same official website", () => {
    const result = selectContextCompetitors({
      company,
      agentItems: [
        { companyName: "Rival One", officialWebsite: "https://www.rival.example" },
        { companyName: "Rival One Inc.", officialWebsite: "https://rival.example/products" },
      ],
      documentItems: [],
    });

    expect(result).toHaveLength(1);
  });
});
