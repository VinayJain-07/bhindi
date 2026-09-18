import { describe, expect, it } from "vitest";
import { resolveArtifactManifest } from "./config";

describe("artifact routing", () => {
  it("always routes an SEO audit to PDF, PPTX, and XLSX", () => {
    const manifest = resolveArtifactManifest({ reportType: "SEO_AUDIT", markdown: "# SEO Audit\n\nNo tables yet." });
    expect(manifest.decisions.pdf.enabled).toBe(true);
    expect(manifest.decisions.pptx.enabled).toBe(true);
    expect(manifest.decisions.xlsx.enabled).toBe(true);
    expect(manifest.theme).toBe("technical-diagnostic");
  });

  it("enables an optional workbook when reusable operational data is present", () => {
    const markdown = `## Roadmap\n\n| Owner | Status | Due date | URL |\n|---|---|---|---|\n${Array.from({ length: 16 }, (_, index) => `| Team ${index} | Open | 2026-09-${String(index + 1).padStart(2, "0")} | https://example.com/${index} |`).join("\n")}`;
    const manifest = resolveArtifactManifest({ reportType: "MARKETING_STRATEGY", markdown });
    expect(manifest.decisions.xlsx.enabled).toBe(true);
    expect(manifest.decisions.xlsx.reason).toContain("reusable");
    expect(manifest.theme).toBe("executive-strategy");
    expect(manifest.requiredVisuals).toEqual(["executive-dashboard", "cross-functional-priority-map", "integrated-roadmap"]);
  });

  it("does not create a workbook for a design guide", () => {
    const manifest = resolveArtifactManifest({ reportType: "DESIGN_GUIDE", markdown: "## Direction\n\nA concise visual system." });
    expect(manifest.primaryArtifact).toBe("pptx");
    expect(manifest.decisions.xlsx.enabled).toBe(false);
  });

  it("routes the off-page SEO strategy to an Excel workbook only", () => {
    const manifest = resolveArtifactManifest({ reportType: "BACKLINK_OUTREACH_BLUEPRINT", markdown: "# Off-Page SEO" });
    expect(manifest.primaryArtifact).toBe("xlsx");
    expect(manifest.decisions.xlsx.enabled).toBe(true);
    expect(manifest.decisions.pdf.enabled).toBe(false);
    expect(manifest.decisions.pptx.enabled).toBe(false);
    expect(manifest.requiredSheets).toContain("03_Validated_Prospects");
  });
});
