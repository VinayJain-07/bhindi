import { describe, expect, it } from "vitest";
import { parseMarkdown } from "./content";
import { parseVisualMarkdown } from "./visual-content";
import { documentMarkdown, unwrapMarkdown } from "./presentation";
import { frameworkSvg, prepareFrameworks } from "./frameworks";

const swot = `## SWOT

| Dimension | Evidence | Action |
|---|---|---|
| Strengths | Strong proof | Keep it |
| Weaknesses | Thin pages | Fix it |
| Opportunities | New demand | Test it |
| Threats | Competition | Monitor it |`;

describe("framework document rendering", () => {
  it("composes SWOT visually while preserving tables for artifact data models", () => {
    expect(parseMarkdown(swot).some((block) => block.type === "table")).toBe(true);
    const blocks = parseVisualMarkdown(swot);
    const visual = blocks.find((block) => block.type === "framework");
    expect(visual?.type === "framework" && visual.framework.cards.map((card) => card.title)).toEqual(["Strengths", "Weaknesses", "Opportunities", "Threats"]);
  });

  it("recognizes PESTEL subsections and keeps following source notes", () => {
    const markdown = `## PESTEL\n\n${["Political", "Economic", "Social", "Technological", "Environmental", "Legal"].map((title) => `### ${title}\n- Evidence for ${title}\n`).join("\n")}\n## Sources\nhttps://example.com`;
    const blocks = parseVisualMarkdown(markdown);
    const visual = blocks.find((block) => block.type === "framework");
    expect(visual?.type === "framework" && visual.framework.cards).toHaveLength(6);
    expect(blocks.at(-1)).toEqual({ type: "paragraph", text: "https://example.com" });
  });

  it("renders ordered funnel stages with a qualitative width caption", () => {
    const markdown = "## Funnel\n\n| Stage | Objective |\n|---|---|\n| Awareness | Explain |\n| Evaluation | Prove fit |\n| Decision | Remove risk |";
    const visual = parseVisualMarkdown(markdown).find((block) => block.type === "framework");
    expect(visual?.type).toBe("framework");
    if (visual?.type === "framework") expect(frameworkSvg(visual.framework).svg).toContain("Stage widths show sequence");
    expect(prepareFrameworks(prepareFrameworks(markdown))).toBe(prepareFrameworks(markdown));
  });

  it("composes prioritization and comparison tables into evidence-led visual cards", () => {
    const priority = "## Prioritization Matrix\n\n| Initiative | Impact | Effort | Evidence |\n|---|---|---|---|\n| Fix checkout | High | Low | Cart exits on mobile |\n| Add partner portal | Medium | High | Enterprise request log |";
    const comparison = "## Competitive Comparison\n\n| Competitor | Positioning | Evidence |\n|---|---|---|\n| Acme | Enterprise suite | Pricing page |\n| Northstar | Self-serve | Product tour |";
    for (const markdown of [priority, comparison]) {
      const visual = parseVisualMarkdown(markdown).find((block) => block.type === "framework");
      expect(visual?.type).toBe("framework");
      if (visual?.type === "framework") expect(visual.framework.cards).toHaveLength(2);
    }
  });

  it("does not consume a complex subsection after recognized SWOT cards", () => {
    const markdown = "## SWOT\n### Strengths\n- Proof\n### Weaknesses\n- Gaps\n### Opportunities\n| Option | Evidence |\n|---|---|\n| New market | Unknown |\n## Next steps\nKeep this";
    const prepared = prepareFrameworks(markdown);
    expect(prepared).toContain("### Opportunities\n| Option | Evidence |");
    expect(prepared).toContain("## Next steps\nKeep this");
  });

  it("removes internal receipts and paths, retaining external sources", () => {
    const markdown = "# Report\n## Embedded local skill files\nSKILL: claude-main/seo-audit\nSOURCE: skills/seo-audit/SKILL.md\n## Sources\nhttps://example.com";
    expect(documentMarkdown(markdown)).toBe("# Report\n## Sources\nhttps://example.com");
    expect(documentMarkdown("Applied skills: claude-seo-main/seo-audit\n\nEvidence remains")).toBe("Evidence remains");
  });

  it("does not alter external source paths that happen to match skill names", () => {
    const source = "[SEO audit source](https://example.com/seo-audit)";
    expect(documentMarkdown(source)).toBe(source);
  });

  it("preserves closing code fences in ordinary reports", () => {
    expect(unwrapMarkdown("```markdown\n# Report\n```" )).toBe("# Report");
    expect(unwrapMarkdown("# Report\n\n```example\ncontent\n```" )).toMatch(/```$/);
  });
});
