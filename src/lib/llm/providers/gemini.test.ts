import { describe, it, expect } from "vitest";
import { sanitizeSchemaForGemini } from "./gemini";

describe("sanitizeSchemaForGemini", () => {
  it("returns undefined for undefined or null inputs", () => {
    expect(sanitizeSchemaForGemini(undefined)).toBeUndefined();
    expect(sanitizeSchemaForGemini(null as unknown as undefined)).toBeUndefined();
  });

  it("strips unsupported keywords like additionalProperties, minItems, maxItems, minimum, maximum", () => {
    const rawSchema = {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        items: {
          type: "array",
          minItems: 1,
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              score: { type: "number", minimum: 0, maximum: 100 }
            }
          }
        }
      }
    };

    const sanitized = sanitizeSchemaForGemini(rawSchema);

    expect(sanitized).toEqual({
      type: "object",
      properties: {
        title: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              score: { type: "number" }
            }
          }
        }
      }
    });
    expect(sanitized).not.toHaveProperty("additionalProperties");
  });
});
