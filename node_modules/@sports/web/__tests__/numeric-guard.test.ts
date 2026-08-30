import { describe, expect, it } from "vitest";
import { extractNumericClaims, validateNumericClaims } from "@/lib/claude-api/numeric-guard";

describe("extractNumericClaims", () => {
  it("pulls percentages, decimals and records but ignores bare prose integers", () => {
    const text = "Our model gives 62% with a 27.5 projected total; the team is 12-4 ATS over 3 weeks.";
    const kinds = extractNumericClaims(text).map((c) => `${c.kind}:${c.value}`);
    expect(kinds).toEqual(expect.arrayContaining(["percent:62", "decimal:27.5", "record:12", "record:4"]));
    // "3 weeks" is a bare integer → not extracted
    expect(kinds.some((k) => k === "decimal:3" || k === "percent:3")).toBe(false);
  });
});

describe("validateNumericClaims", () => {
  it("passes when every stat is grounded in the payload", () => {
    const text = "Confidence 72%, line 27.5, recent form 12-4.";
    const v = validateNumericClaims(text, { allowed: [72, 27.5, 12, 4] });
    expect(v.grounded).toBe(true);
    expect(v.ungrounded).toHaveLength(0);
  });

  it("flags a hallucinated stat not present in the payload", () => {
    const text = "Our model hits 88% on these — a 19.3 edge.";
    const v = validateNumericClaims(text, { allowed: [72, 27.5] });
    expect(v.grounded).toBe(false);
    expect(v.ungrounded.map((c) => c.value)).toEqual(expect.arrayContaining([88, 19.3]));
  });

  it("is grounded when there are no stat-shaped numbers at all", () => {
    expect(validateNumericClaims("A measured, data-backed look at tonight's slate.", { allowed: [] }).grounded).toBe(true);
  });
});
