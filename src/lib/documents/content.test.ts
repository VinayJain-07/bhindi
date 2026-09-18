import { describe, expect, it } from "vitest";
import { normalizeDocumentMarkdown, parseMarkdown } from "./content";

describe("normalizeDocumentMarkdown", () => {
  it("repairs list markers and removes visible dash and asterisk artifacts", () => {
    const markdown = "Intro—context\n* First item\n• Second item\n\nThis *label* is clear.";

    expect(normalizeDocumentMarkdown(markdown)).toBe(
      "Intro - context\n\n- First item\n- Second item\n\nThis label is clear."
    );
  });

  it("preserves valid bold formatting and parses repaired bullets as list items", () => {
    const markdown = "**Decision:** Act now\n\n1) Validate evidence\n2) Ship the change";
    const normalized = normalizeDocumentMarkdown(markdown);

    expect(normalized).toContain("**Decision:** Act now");
    expect(normalized).toContain("1. Validate evidence");
    expect(parseMarkdown(normalized).filter((block) => block.type === "number")).toHaveLength(2);
  });
});
