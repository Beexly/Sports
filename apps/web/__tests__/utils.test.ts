import { describe, it, expect } from "vitest";
import { cn, generateSlug, truncate, confidenceLabel } from "@/lib/utils";

describe("cn", () => {
  it("merges class names correctly", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("handles undefined", () => {
    expect(cn("foo", undefined, "bar")).toBe("foo bar");
  });

  it("deduplicates tailwind classes", () => {
    // tailwind-merge resolves conflicts
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });
});

describe("generateSlug", () => {
  it("converts to lowercase", () => {
    expect(generateSlug("NFL Picks Today")).toBe("nfl-picks-today");
  });

  it("replaces spaces with hyphens", () => {
    expect(generateSlug("hello world")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(generateSlug("NFL Picks! #2026")).toBe("nfl-picks-2026");
  });

  it("collapses multiple hyphens", () => {
    expect(generateSlug("hello   world")).toBe("hello-world");
  });

  it("trims leading/trailing hyphens", () => {
    expect(generateSlug("  hello world  ")).toBe("hello-world");
  });
});

describe("truncate", () => {
  it("returns original string if under maxLength", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates and adds ellipsis", () => {
    expect(truncate("hello world", 8)).toBe("hello...");
  });

  it("returns exact maxLength unchanged", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });
});

describe("confidenceLabel", () => {
  // Colors are GSE design tokens, not raw Tailwind green/blue/yellow — the
  // casino palette is banned on trust surfaces and fails contrast on dark.
  it("returns Strong for 80+", () => {
    const result = confidenceLabel(80);
    expect(result.label).toBe("Strong");
    expect(result.color).toBe("text-verify");
  });

  it("returns Good for 70-79", () => {
    const result = confidenceLabel(75);
    expect(result.label).toBe("Good");
    expect(result.color).toBe("text-orbital-cyan");
  });

  it("returns Moderate for 60-69", () => {
    const result = confidenceLabel(65);
    expect(result.label).toBe("Moderate");
    expect(result.color).toBe("text-caution");
  });

  it("returns Lean for below 60", () => {
    const result = confidenceLabel(55);
    expect(result.label).toBe("Lean");
  });
});
