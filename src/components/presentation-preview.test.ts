import { describe, expect, it } from "vitest";
import { buildPresentationPreview } from "./presentation-preview";

const markdown = `# SEO Audit

## Executive summary

Technical health is constrained by template-level crawl risks. Leadership should fix the canonical system before expanding content production.

## Technical findings

The canonical implementation creates inconsistent signals across 24 captured URLs. High confidence: the same pattern appears across repeated templates.

## Recommendations

- High priority: correct canonical generation and validate five representative URLs.
- Assign metadata ownership and publish a weekly exception report.
- Add a due date and falsifiable success check to every backlog item.`;

describe("buildPresentationPreview", () => {
  it("compresses report content into a decision-led slide story", () => {
    const slides = buildPresentationPreview("SEO Audit", markdown, "technical-diagnostic");

    expect(slides[0]).toMatchObject({ kind: "cover", title: "SEO Audit" });
    expect(slides.some((slide) => slide.kind === "finding")).toBe(true);
    expect(slides.some((slide) => slide.kind === "priorities" && slide.items?.some((item) => item.includes("canonical")))).toBe(true);
    expect(slides.at(-1)?.kind).toBe("close");
    expect(slides.length).toBeGreaterThanOrEqual(6);
  });
});
