import { describe, it, expect } from "vitest";
import { buildEmbedSnippet, formatEdgeIndex } from "@/lib/embed/edge-index";

describe("formatEdgeIndex", () => {
  it("formats positive with plus", () => {
    expect(formatEdgeIndex(2.7)).toBe("+3");
    expect(formatEdgeIndex(0)).toBe("0");
  });
  it("returns em dash for null/non-finite", () => {
    expect(formatEdgeIndex(null)).toBe("—");
    expect(formatEdgeIndex(Number.NaN)).toBe("—");
  });
});

describe("buildEmbedSnippet", () => {
  it("builds iframe with game id and free origin", () => {
    const html = buildEmbedSnippet("game-abc");
    expect(html).toContain("/embed/edge-index/game-abc");
    expect(html).toContain("iframe");
    expect(html).toContain("Galaxy Edge Index");
  });
});
