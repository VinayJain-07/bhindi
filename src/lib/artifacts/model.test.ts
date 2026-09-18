import { describe, expect, it } from "vitest";
import { resolveArtifactManifest } from "./config";
import { buildReportDataModel } from "./model";

describe("report data model", () => {
  it("assigns stable source, finding, and recommendation identifiers", () => {
    const markdown = "# SEO Audit\n\n## Executive summary\n\nTechnical health is 72%. Source: https://example.com/a\n\n## Recommendations\n\n- High priority: repair canonical tags.\n- Assign an owner and validation date.";
    const manifest = resolveArtifactManifest({ reportType: "SEO_AUDIT", markdown });
    const model = buildReportDataModel({ reportType: "SEO_AUDIT", companyName: "Acme", title: "SEO Audit", markdown, updatedAt: new Date("2026-08-29T00:00:00Z"), sourceCount: 1, manifest });
    expect(model.sources[0].id).toBe("SRC-001");
    expect(model.findings[0].id).toMatch(/^SEO-F\d{3}$/);
    expect(model.recommendations.map((item) => item.id)).toEqual(["SEO-001", "SEO-002"]);
    expect(model.lineage[0].artifactReferences.xlsx).toContain("SEO-001");
  });

  it("does not turn arbitrary numbers or unrelated source URLs into evidence", () => {
    const markdown = "# Report 2026\n\n## Findings\n\n- Review of 30 pages; high confidence. [Evidence](https://example.com/a)\n\n## Recommendations\n\n- High priority: fix the canonical. [Evidence](https://example.com/b)\n- Confirm the hypothesis with a reviewer.\n\n## Sources\n\nhttps://example.com/a\nhttps://example.com/b";
    const manifest = resolveArtifactManifest({ reportType: "SEO_AUDIT", markdown });
    const model = buildReportDataModel({ reportType: "SEO_AUDIT", companyName: "Acme", title: "Audit", markdown, updatedAt: new Date("2026-09-08"), sourceCount: 2, manifest });
    expect(model.metrics).toEqual([]);
    expect(model.recommendations).toHaveLength(2);
    expect(model.findings.find((finding) => finding.title === "Findings")?.sourceIds).toEqual(["SRC-001"]);
    expect(model.lineage[0].sourceId).toBe("SRC-002");
    expect(model.lineage[1].sourceId).toBeUndefined();
  });

  it("extracts table actions and cited named measurements without inferring priorities from confidence", () => {
    const markdown = "# Audit\n\n## Results\n\nConversion rate: 4.2%. Measured in August 2026. https://example.com/analytics\n\nTarget rate: 9%. https://example.com/plan\n\n## Actions\n\n| Action | Priority | Evidence |\n|---|---|---|\n| Repair tags | High | https://example.com/a |\n\n- High confidence in the diagnosis; assign a reviewer.";
    const manifest = resolveArtifactManifest({ reportType: "SEO_AUDIT", markdown });
    const model = buildReportDataModel({ reportType: "SEO_AUDIT", companyName: "Acme", title: "Audit", markdown, updatedAt: new Date("2026-09-08"), sourceCount: 3, manifest });
    expect(model.metrics.map(({ label, value }) => ({ label, value }))).toEqual([{ label: "Conversion rate", value: "4.2%" }]);
    expect(model.recommendations.find((item) => item.detail.startsWith("High confidence"))?.priority).toBe("unrated");
    expect(model.recommendations.find((item) => item.detail.includes("Repair tags"))?.priority).toBe("high");
  });
});

