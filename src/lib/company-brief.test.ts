import { describe, expect, it } from "vitest";
import { COMPANY_BRIEF_FALLBACK, createCompanyBrief, createCompanyContext } from "./company-brief";

describe("company context", () => {
  it("uses the researched company description without wrapping it in a fixed report template", () => {
    const context = createCompanyContext({ description: "Acme provides operational dashboards that help finance teams close their books faster and monitor cash flow in real time." });
    expect(context.overview).toBe("Acme provides operational dashboards that help finance teams close their books faster and monitor cash flow in real time.");
    expect(context.overview).not.toMatch(/organization covered|public website reviewed|this analysis/i);
  });

  it("extracts distinct business signals from Company Intelligence", () => {
    const context = createCompanyContext({
      name: "Acme",
      intelligenceMarkdown: `# Company Intelligence
## Company Overview
Acme is a finance operations platform that gives mid-market teams a real-time view of cash, close progress, and reporting risk.
## Core Services
The platform combines automated reconciliation, reporting dashboards, and close-management workflows in one product.
## Target Audience
Finance directors, controllers, and CFO teams at growing multi-entity businesses use the platform.
## Positioning and Differentiators
Acme positions itself as the faster, implementation-friendly alternative to legacy enterprise planning suites.`,
    });
    expect(context.overview).toContain("finance operations platform");
    expect(context.signals.map((signal) => signal.label)).toEqual(expect.arrayContaining(["Offer", "Audience", "Positioning"]));
    expect(context.evidenceLabel).toBe("Company Intelligence");
  });

  it("uses relevant crawled pages when stored copy is generic", () => {
    const context = createCompanyContext({
      description: "This analysis evaluates its current digital presence, performance, visibility, and opportunities for improvement.",
      crawlPages: [{ url: "https://acme.example/about", title: "About Acme", description: "Acme helps independent retailers forecast inventory demand and reduce waste using store-level sales and supply data." }],
    });
    expect(context.overview).toContain("independent retailers");
    expect(context.evidenceLabel).toBe("1 public page");
  });

  it("uses the neutral fallback when no company facts exist", () => {
    expect(createCompanyBrief({})).toBe(COMPANY_BRIEF_FALLBACK);
  });
});
