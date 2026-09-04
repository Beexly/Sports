import { describe, expect, it } from "vitest";
import {
  extractGroundedValues,
  extractNumericClaims,
  validateNumericClaims,
} from "@/lib/claude-api/numeric-guard";

/**
 * A realistic pick-explainer grounding block — the exact shape
 * `lib/pick-explainer/grounding.ts` emits. Every number in it is real; the point
 * of the guard is that a real number may only be RESTATED AS WHAT IT IS.
 *
 * Flattened to bare values this block yields
 * `[0, 1.5, 1.9, 2.4, 4.2, 6, 6.1, 14, 18, 22, 54.3, 61.2]` — and `6.1` is not a
 * statistic at all, it is the model version `v6.1.0`.
 */
const GROUNDING = [
  "GAME: Buffalo Bills @ Kansas City Chiefs (NFL)",
  "COMMENCE: 2026-01-17T23:30:00.000Z",
  "PICK: Kansas City Chiefs -2.5 [SPREAD]",
  "CONFIDENCE: 61/100   EDGE INDEX: 18/100",
  "MODEL VERSION: v6.1.0",
  "FACTOR BREAKDOWN — citation token: factor_breakdown at 2026-01-17T12:00:00.000Z",
  "  • ATS form [POSITIVE, weight +2.4]: Away side is covering at home-dog prices.",
  "  • Line movement [POSITIVE, weight +4.2]: Spread moved toward the pick since open.",
  "  ★ Independent edge (kalshi): decision LEAN, agreement CONFIRMS, market fair 54.3%, " +
    "independent 61.2%, expected CLV +1.9pp, priced=false.",
  "  line movement since open: +1.5",
].join("\n");

describe("extractNumericClaims", () => {
  it("pulls percentages, decimals and records but ignores bare prose integers", () => {
    const text = "Our model gives 62% with a 27.5 projected total; the team is 12-4 ATS over 3 weeks.";
    const kinds = extractNumericClaims(text).map((c) => `${c.kind}:${c.value}`);
    expect(kinds).toEqual(expect.arrayContaining(["magnitude:27.5", "record:12", "record:4"]));
    // "3 weeks" is a bare integer → not extracted
    expect(kinds.some((k) => k.endsWith(":3"))).toBe(false);
  });

  it("tags each grounded number with the MEANING its label gives it", () => {
    const kinds = extractNumericClaims(GROUNDING).map((c) => `${c.kind}:${c.value}`);
    // The two independent-edge percentages are PROBABILITIES, not hit rates.
    expect(kinds).toContain("probability:54.3");
    expect(kinds).toContain("probability:61.2");
    // Factor weights and line movement are magnitudes, not percentages.
    expect(kinds).toContain("magnitude:2.4");
    expect(kinds).toContain("magnitude:4.2");
    expect(kinds).toContain("magnitude:1.5");
    // The model version is not a statistic.
    expect(kinds).toContain("version:6.1");
    // Timestamp digits are not statistics.
    expect(kinds).toContain("date:0");
  });

  it("classifies an unlabelled percentage as percent_unknown (fail closed)", () => {
    expect(extractNumericClaims("The number is 44%.").map((c) => c.kind)).toEqual(["percent_unknown"]);
  });
});

describe("extractGroundedValues", () => {
  it("never lets a version string or a timestamp ground anything", () => {
    const values = extractGroundedValues(GROUNDING);
    expect(values.some((v) => v.kind === "version")).toBe(false);
    expect(values.some((v) => v.kind === "date")).toBe(false);
    // 6.1 came only from `v6.1.0`, so it is not available at all.
    expect(values.some((v) => Math.abs(v.value - 6.1) < 0.001)).toBe(false);
  });

  it("drops an unlabelled percentage from the grounding set", () => {
    expect(extractGroundedValues("The number is 44%.")).toEqual([]);
  });
});

describe("validateNumericClaims", () => {
  /**
   * REGRESSION: the guard used to compare VALUES only —
   * `grounding.allowed.some((a) => Math.abs(a - v) <= tolerance)` — so any number
   * appearing anywhere in the grounding whitelisted that value in ANY context.
   * Every fabrication below PASSED against the block above.
   */
  describe("a value may only be spent as the KIND it was grounded as", () => {
    it("rejects a true probability restated as a historical cover rate", () => {
      const v = validateNumericClaims(
        "The Chiefs have covered in 61.2% of similar spots (source: factor_breakdown at 2026-01-17T12:00:00.000Z)",
        { text: GROUNDING },
      );
      expect(v.grounded).toBe(false);
      expect(v.ungrounded.map((c) => `${c.kind}:${c.value}`)).toContain("rate:61.2");
    });

    it("rejects a factor weight restated as a percentage", () => {
      const v = validateNumericClaims(
        "ATS form carries a 2.4% historical hit premium (source: factor_breakdown at 2026-01-17T12:00:00.000Z)",
        { text: GROUNDING },
      );
      expect(v.grounded).toBe(false);
      expect(v.ungrounded.map((c) => c.value)).toContain(2.4);
    });

    it("rejects a market fair probability restated as a win rate", () => {
      const v = validateNumericClaims(
        "This side wins 54.3% of the time historically (source: factor_breakdown at 2026-01-17T12:00:00.000Z)",
        { text: GROUNDING },
      );
      expect(v.grounded).toBe(false);
      expect(v.ungrounded.map((c) => c.value)).toContain(54.3);
    });

    it("rejects a statistic whose value came only from the model version string", () => {
      const v = validateNumericClaims(
        "Similar spots have returned 6.1% above the market (source: factor_breakdown at 2026-01-17T12:00:00.000Z)",
        { text: GROUNDING },
      );
      expect(v.grounded).toBe(false);
      expect(v.ungrounded.map((c) => c.value)).toContain(6.1);
    });
  });

  /**
   * The other half of the contract: a guard that rejects everything is not a fix.
   * These are the legitimate restatements the surfaces are supposed to produce.
   */
  describe("legitimate grounded claims still pass", () => {
    it("accepts probabilities restated as probabilities", () => {
      const v = validateNumericClaims(
        "The book's de-vigged market fair probability is 54.3% while the independent estimate is 61.2%.",
        { text: GROUNDING },
      );
      expect(v.ungrounded).toEqual([]);
      expect(v.grounded).toBe(true);
    });

    it("accepts a factor weight restated as a weight", () => {
      const v = validateNumericClaims("Line movement carries a weight of 4.2 in the breakdown.", {
        text: GROUNDING,
      });
      expect(v.grounded).toBe(true);
    });

    it("accepts an observed rate restated as an observed rate", () => {
      const grounding = "60-69: estimated 65%, actual 63% (sample 8)";
      const v = validateNumericClaims(
        "You were overconfident in the 60-69 band this week, calling 65% when the actual rate was 63%.",
        { text: grounding },
      );
      expect(v.ungrounded).toEqual([]);
      expect(v.grounded).toBe(true);
    });

    it("is grounded when there are no stat-shaped numbers at all", () => {
      expect(
        validateNumericClaims("A measured, data-backed look at tonight's slate.", { text: GROUNDING }).grounded,
      ).toBe(true);
    });
  });

  it("flags a hallucinated stat not present in the payload at all", () => {
    const v = validateNumericClaims("Our model hits 88% on these — a 19.3 edge.", { text: GROUNDING });
    expect(v.grounded).toBe(false);
    expect(v.ungrounded.map((c) => c.value)).toEqual(expect.arrayContaining([88, 19.3]));
  });

  it("fails closed on a claim whose role cannot be read from its label", () => {
    // 54.3 IS in the grounding — as a probability. Unlabelled, it grounds nothing.
    expect(validateNumericClaims("The number is 54.3%.", { text: GROUNDING }).grounded).toBe(false);
  });

  describe("structured caller-supplied values", () => {
    it("lets real integer tallies ground a W-L record", () => {
      const v = validateNumericClaims("The published board went 7-4 last week.", {
        values: [
          { value: 7, kind: "count" },
          { value: 4, kind: "count" },
        ],
      });
      expect(v.grounded).toBe(true);
    });

    it("still rejects a record the tallies do not support", () => {
      const v = validateNumericClaims("The published board went 9-1 last week.", {
        values: [
          { value: 7, kind: "count" },
          { value: 4, kind: "count" },
        ],
      });
      expect(v.grounded).toBe(false);
    });

    it("does not let a count ground a percentage", () => {
      const v = validateNumericClaims("The board hit 7% of the time.", {
        values: [{ value: 7, kind: "count" }],
      });
      expect(v.grounded).toBe(false);
    });
  });
});
