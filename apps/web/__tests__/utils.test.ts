import { describe, it, expect } from "vitest";
import { cn, formatDate, formatDateTime, formatGameTime, formatCurrency, formatRelative, generateSlug, truncate, confidenceLabel } from "@/lib/utils";

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
  it("returns Strong for 80+", () => {
    const result = confidenceLabel(80);
    expect(result.label).toBe("Strong");
    expect(result.color).toContain("green");
  });

  it("returns Good for 70-79", () => {
    const result = confidenceLabel(75);
    expect(result.label).toBe("Good");
    expect(result.color).toContain("blue");
  });

  it("returns Moderate for 60-69", () => {
    const result = confidenceLabel(65);
    expect(result.label).toBe("Moderate");
    expect(result.color).toContain("yellow");
  });

  it("returns Lean for below 60", () => {
    const result = confidenceLabel(55);
    expect(result.label).toBe("Lean");
  });

  it("returns Strong for exactly 80 (boundary)", () => {
    expect(confidenceLabel(80).label).toBe("Strong");
  });

  it("returns Good for exactly 70 (boundary)", () => {
    expect(confidenceLabel(70).label).toBe("Good");
  });

  it("returns Moderate for exactly 60 (boundary)", () => {
    expect(confidenceLabel(60).label).toBe("Moderate");
  });
});

describe("formatDate", () => {
  it("formats a Date object to 'Mon d, yyyy'", () => {
    // Noon UTC — same calendar day across all UTC-11..UTC+11 offsets
    expect(formatDate(new Date("2026-01-15T12:00:00Z"))).toBe("Jan 15, 2026");
  });

  it("accepts an ISO date string as input", () => {
    expect(formatDate("2026-07-04T12:00:00Z")).toBe("Jul 4, 2026");
  });

  it("formats December correctly", () => {
    expect(formatDate(new Date("2026-12-25T12:00:00Z"))).toBe("Dec 25, 2026");
  });
});

describe("formatDateTime", () => {
  it("includes the date portion in output", () => {
    const result = formatDateTime(new Date("2026-01-15T12:00:00Z"));
    expect(result).toContain("Jan 15, 2026");
  });

  it("includes 'at' as the date-time separator", () => {
    const result = formatDateTime(new Date("2026-01-15T12:00:00Z"));
    expect(result).toContain("at");
  });

  it("includes a 12-hour clock component", () => {
    const result = formatDateTime(new Date("2026-01-15T12:00:00Z"));
    expect(result).toMatch(/\d+:\d+ [AP]M/);
  });
});

describe("formatGameTime", () => {
  it("contains the month name and bullet separator", () => {
    const result = formatGameTime(new Date("2026-01-15T12:00:00Z"));
    expect(result).toContain("Jan");
    expect(result).toContain("·");
  });

  it("contains a 12-hour time component", () => {
    const result = formatGameTime(new Date("2026-01-15T12:00:00Z"));
    expect(result).toMatch(/\d+:\d+ [AP]M/);
  });

  it("contains the day-of-month number", () => {
    const result = formatGameTime(new Date("2026-01-15T12:00:00Z"));
    expect(result).toContain("15");
  });
});

describe("formatCurrency", () => {
  it("converts cents to a USD dollar string ($19.00 for 1900 cents)", () => {
    expect(formatCurrency(1900)).toBe("$19.00");
  });

  it("formats zero cents as $0.00", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats the Elite tier price (4900 cents = $49.00)", () => {
    expect(formatCurrency(4900)).toBe("$49.00");
  });

  it("formats sub-dollar amounts (99 cents = $0.99)", () => {
    expect(formatCurrency(99)).toBe("$0.99");
  });
});

describe("formatRelative", () => {
  it("returns a string with 'ago' for a past date", () => {
    // 1 hour ago
    const past = new Date(Date.now() - 60 * 60 * 1000);
    expect(formatRelative(past)).toContain("ago");
  });

  it("accepts an ISO string as input", () => {
    // A date far in the past — stable "years ago" output
    const result = formatRelative("2020-01-01T00:00:00Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("ago");
  });

  it("returns a non-empty string for a recent date", () => {
    const recent = new Date(Date.now() - 5 * 60 * 1000);
    const result = formatRelative(recent);
    expect(result.length).toBeGreaterThan(0);
  });
});
