import { describe, it, expect } from "vitest";
import {
  systemPrompt,
  version,
  lastReviewed,
  model,
} from "@/lib/prompts/content/analysis-post";

describe("prompts/content/analysis-post", () => {
  it("exports required metadata fields", () => {
    expect(typeof version).toBe("string");
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(typeof lastReviewed).toBe("string");
    expect(lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof model).toBe("string");
    expect(model.length).toBeGreaterThan(0);
  });

  it("contains the data-integrity compliance line", () => {
    expect(systemPrompt).toContain("Do not invent statistics");
  });

  it("contains the certainty-language prohibition", () => {
    expect(systemPrompt).toContain("never say");
  });

  it("requires the disclaimer instruction", () => {
    expect(systemPrompt).toContain("disclaimer");
  });

  it("does not contain any API key or secret value", () => {
    expect(systemPrompt).not.toMatch(/sk-ant-/i);
    expect(systemPrompt).not.toMatch(/process\.env/);
  });
});
