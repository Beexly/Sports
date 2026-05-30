/**
 * Targeted coverage for lib/utils.ts.
 *
 * All functions are pure helpers. Tests verify:
 *   - generateSlug: whitespace collapse, special-char removal, leading/trailing
 *     dash trimming, consecutive-dash collapse
 *   - truncate: no-op when length ≤ maxLength, ellipsis when length > maxLength,
 *     exact-boundary case
 *   - confidenceLabel: all four branches (>=80 Strong, >=70 Good, >=60 Moderate,
 *     below-60 Lean)
 *   - formatCurrency: correct USD formatting from cents
 *   - formatDate / formatDateTime / formatGameTime: shape verification (smoke)
 */

import { describe, it, expect } from "vitest";
import {
  generateSlug,
  truncate,
  confidenceLabel,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatGameTime,
} from "@/lib/utils";

// ============================================================
// generateSlug
// ============================================================

describe("generateSlug", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(generateSlug("Hello World")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(generateSlug("NBA! Picks & Picks")).toBe("nba-picks-picks");
  });

  it("collapses consecutive hyphens to one", () => {
    expect(generateSlug("one  --  two")).toBe("one-two");
  });

  it("trims leading and trailing hyphens", () => {
    expect(generateSlug("  trim me  ")).toBe("trim-me");
  });

  it("handles all special characters with no alphanumeric content as empty string", () => {
    expect(generateSlug("!!!")).toBe("");
  });

  it("preserves existing hyphens between words", () => {
    expect(generateSlug("well-formed slug")).toBe("well-formed-slug");
  });

  it("handles already-valid slugs unchanged", () => {
    expect(generateSlug("already-a-slug")).toBe("already-a-slug");
  });

  it("handles numeric content", () => {
    expect(generateSlug("Week 21 recap 2026")).toBe("week-21-recap-2026");
  });
});

// ============================================================
// truncate
// ============================================================

describe("truncate", () => {
  it("returns the string unchanged when length <= maxLength", () => {
    expect(truncate("short", 10)).toBe("short");
  });

  it("returns the string unchanged when length === maxLength", () => {
    expect(truncate("exact", 5)).toBe("exact");
  });

  it("appends '...' and slices when length > maxLength", () => {
    expect(truncate("hello world", 8)).toBe("hello...");
  });

  it("truncates to exactly maxLength characters including '...'", () => {
    const result = truncate("abcdefghij", 7);
    expect(result).toBe("abcd...");
    expect(result.length).toBe(7);
  });

  it("handles empty string", () => {
    expect(truncate("", 5)).toBe("");
  });
});

// ============================================================
// confidenceLabel — four branches
// ============================================================

describe("confidenceLabel", () => {
  it("returns Strong (green) for confidence >= 80", () => {
    expect(confidenceLabel(80)).toEqual({ label: "Strong", color: "text-green-600" });
    expect(confidenceLabel(100)).toEqual({ label: "Strong", color: "text-green-600" });
  });

  it("returns Good (blue) for confidence >= 70 and < 80", () => {
    expect(confidenceLabel(70)).toEqual({ label: "Good", color: "text-blue-600" });
    expect(confidenceLabel(79)).toEqual({ label: "Good", color: "text-blue-600" });
  });

  it("returns Moderate (yellow) for confidence >= 60 and < 70", () => {
    expect(confidenceLabel(60)).toEqual({ label: "Moderate", color: "text-yellow-600" });
    expect(confidenceLabel(69)).toEqual({ label: "Moderate", color: "text-yellow-600" });
  });

  it("returns Lean (gray) for confidence below 60", () => {
    expect(confidenceLabel(59)).toEqual({ label: "Lean", color: "text-gray-500" });
    expect(confidenceLabel(0)).toEqual({ label: "Lean", color: "text-gray-500" });
  });
});

// ============================================================
// formatCurrency
// ============================================================

describe("formatCurrency", () => {
  it("formats 1900 cents as $19.00", () => {
    expect(formatCurrency(1900)).toBe("$19.00");
  });

  it("formats 4999 cents as $49.99", () => {
    expect(formatCurrency(4999)).toBe("$49.99");
  });

  it("formats 0 cents as $0.00", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats 100 cents as $1.00", () => {
    expect(formatCurrency(100)).toBe("$1.00");
  });
});

// ============================================================
// Date formatters — shape smoke tests
// ============================================================

describe("formatDate", () => {
  it("returns a non-empty string for a valid date", () => {
    const result = formatDate(new Date("2026-05-18T12:00:00Z"));
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("contains the year", () => {
    const result = formatDate(new Date("2026-05-18T00:00:00.000Z"));
    expect(result).toContain("2026");
  });

  it("accepts a date string as input", () => {
    const result = formatDate("2026-05-18T00:00:00.000Z");
    expect(result).toContain("2026");
  });
});

describe("formatDateTime", () => {
  it("returns a non-empty string for a valid date", () => {
    const result = formatDateTime(new Date("2026-05-18T12:00:00Z"));
    expect(typeof result).toBe("string");
    expect(result).toContain("2026");
  });

  it("includes 'at' separating date and time", () => {
    const result = formatDateTime(new Date("2026-05-18T12:00:00Z"));
    expect(result).toContain("at");
  });
});

describe("formatGameTime", () => {
  it("returns a non-empty string for a valid date", () => {
    const result = formatGameTime(new Date("2026-05-18T20:00:00Z"));
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes a '·' separator between date and time", () => {
    const result = formatGameTime(new Date("2026-05-18T20:00:00Z"));
    expect(result).toContain("·");
  });
});
