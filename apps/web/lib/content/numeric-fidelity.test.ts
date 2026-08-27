import { describe, it, expect } from "vitest";
import {
  extractNumeralTokens,
  auditNumerals,
  signFlip,
  americanOddsToImpliedPercent,
} from "./numeric-fidelity";

describe("extractNumeralTokens", () => {
  it("extracts a percent as one token, not also as a bare integer", () => {
    const tokens = extractNumeralTokens("The model gives this 63% to win.");
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({ value: 63, kind: "percent" });
  });

  it("extracts a record as two components, not also as decimal or integer", () => {
    const tokens = extractNumeralTokens("They enter the week 24-17.");
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toMatchObject({ value: 24, kind: "record_component", raw: "24" });
    expect(tokens[1]).toMatchObject({ value: 17, kind: "record_component", raw: "17" });
  });

  it("computes the correct character index for the second record component", () => {
    const copy = "Record: 24-17 heading in.";
    const tokens = extractNumeralTokens(copy);
    const second = tokens[1]!;
    expect(copy.slice(second.index, second.index + 2)).toBe("17");
  });

  it("extracts a decimal as one token, not also as a bare integer", () => {
    const tokens = extractNumeralTokens("The total sits at 48.5.");
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({ value: 48.5, kind: "decimal" });
  });

  it("extracts a bare integer (unlike the general-copy guard, which skips these)", () => {
    const tokens = extractNumeralTokens("He threw for 3 touchdowns.");
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({ value: 3, kind: "integer" });
  });

  it("extracts a mixed sentence correctly, with no overlap or double-counting", () => {
    const tokens = extractNumeralTokens("Up 24-17 with a 48.5 total and a 63% win share, off a 3-game lead.");
    // record(24,17) + decimal(48.5) + percent(63) + record(3, game... no "3-game" isn't digit-dash-digit)
    const kinds = tokens.map((t) => t.kind);
    expect(kinds).toEqual(["record_component", "record_component", "decimal", "percent", "integer"]);
    expect(tokens.map((t) => t.value)).toEqual([24, 17, 48.5, 63, 3]);
  });

  it("returns no tokens for copy with no numerals", () => {
    expect(extractNumeralTokens("The Eagles are favored at home tonight.")).toEqual([]);
  });

  it("preserves the sign of a negative moneyline, spread, or percent — a sign-dropping token can never ground against a signed source fact", () => {
    expect(extractNumeralTokens("The line is -150 for the favorite.")[0]).toMatchObject({ value: -150, kind: "integer" });
    expect(extractNumeralTokens("Underdog is +150 on the moneyline.")[0]).toMatchObject({ value: 150, kind: "integer" });
    expect(extractNumeralTokens("Spread is -3.5 points.")[0]).toMatchObject({ value: -3.5, kind: "decimal" });
    expect(extractNumeralTokens("Spread is +3.5 points.")[0]).toMatchObject({ value: 3.5, kind: "decimal" });
    expect(extractNumeralTokens("A -62% swing in odds.")[0]).toMatchObject({ value: -62, kind: "percent" });
  });

  it("a signed integer/decimal doesn't interfere with an adjacent record's unsigned components", () => {
    const tokens = extractNumeralTokens("Record improved to 10-6 with a -110 line and 55.5% implied.");
    expect(tokens).toEqual([
      { raw: "10", value: 10, kind: "record_component", index: 19 },
      { raw: "6", value: 6, kind: "record_component", index: 22 },
      { raw: "-110", value: -110, kind: "integer", index: 31 },
      { raw: "55.5%", value: 55.5, kind: "percent", index: 45 },
    ]);
  });
});

describe("signFlip", () => {
  it("negates every fact", () => {
    expect(signFlip([-3.5, 7, 0])).toEqual([3.5, -7, -0]);
  });
});

describe("americanOddsToImpliedPercent", () => {
  it("converts a favorite's negative odds correctly", () => {
    expect(americanOddsToImpliedPercent([-150])[0]).toBeCloseTo(60, 6);
  });

  it("converts an underdog's positive odds correctly", () => {
    expect(americanOddsToImpliedPercent([150])[0]).toBeCloseTo(40, 6);
  });

  it("skips zero and non-finite inputs rather than producing garbage", () => {
    expect(americanOddsToImpliedPercent([0, NaN, Infinity])).toEqual([]);
  });
});

describe("auditNumerals", () => {
  it("passes when every numeral is grounded in the source facts", () => {
    const audit = auditNumerals("Final: 24-17, a 48.5 total.", { numbers: [24, 17, 48.5] });
    expect(audit.ok).toBe(true);
    expect(audit.fabricated).toEqual([]);
    expect(audit.tokenCount).toBe(3);
  });

  it("flags a numeral with no grounding at all as fabricated", () => {
    const audit = auditNumerals("Final: 24-17, but they're really a 31-point team.", { numbers: [24, 17] });
    expect(audit.ok).toBe(false);
    expect(audit.fabricated).toHaveLength(1);
    expect(audit.fabricated[0]!.value).toBe(31);
  });

  it("flags a bare integer with no grounding — stricter than value-membership-only guards", () => {
    const audit = auditNumerals("He threw for 3 touchdowns.", { numbers: [24, 17] });
    expect(audit.ok).toBe(false);
    expect(audit.fabricated[0]!.value).toBe(3);
  });

  it("grounds a value via the boilerplate escape hatch", () => {
    const audit = auditNumerals("The 2026 season continues.", { numbers: [24, 17], boilerplate: [2026] });
    expect(audit.ok).toBe(true);
  });

  it("respects tolerance: within it grounds, just outside it fabricates", () => {
    const inTolerance = auditNumerals("Total: 48.55", { numbers: [48.5], tolerance: 0.1 });
    expect(inTolerance.ok).toBe(true);
    const outOfTolerance = auditNumerals("Total: 48.7", { numbers: [48.5], tolerance: 0.1 });
    expect(outOfTolerance.ok).toBe(false);
  });

  it("throws on a non-finite or negative tolerance rather than silently grounding every finite numeral", () => {
    // Infinity would make isGrounded true for ANY numeral against ANY fact —
    // the exact "no fabricated stats" bypass this module exists to prevent.
    expect(() => auditNumerals("He threw for 99 touchdowns.", { numbers: [3], tolerance: Infinity })).toThrow(RangeError);
    expect(() => auditNumerals("He threw for 3 touchdowns.", { numbers: [3], tolerance: NaN })).toThrow(RangeError);
    expect(() => auditNumerals("He threw for 3 touchdowns.", { numbers: [3], tolerance: -0.1 })).toThrow(RangeError);
  });

  it("grounds a sign-flipped value via the signFlip derivation", () => {
    const audit = auditNumerals("They're favored by 3.5.", { numbers: [-3.5] }, [signFlip]);
    expect(audit.ok).toBe(true);
  });

  it("without the derivation, the same sign-flipped copy is correctly flagged", () => {
    const audit = auditNumerals("They're favored by 3.5.", { numbers: [-3.5] });
    expect(audit.ok).toBe(false);
  });

  it("grounds an implied percent derived from American odds", () => {
    const audit = auditNumerals(
      "That price implies a 60% win probability.",
      { numbers: [-150] },
      [americanOddsToImpliedPercent],
    );
    expect(audit.ok).toBe(true);
  });

  it("catches a hallucinated implied percent that doesn't match the actual odds", () => {
    const audit = auditNumerals(
      "That price implies a 75% win probability.",
      { numbers: [-150] },
      [americanOddsToImpliedPercent],
    );
    expect(audit.ok).toBe(false);
    expect(audit.fabricated[0]!.value).toBe(75);
  });

  it("composes multiple derivations together", () => {
    const audit = auditNumerals(
      "Favored by 3.5, a price implying 60%.",
      { numbers: [-3.5] },
      [signFlip, americanOddsToImpliedPercent],
    );
    // signFlip(-3.5) grounds 3.5; americanOddsToImpliedPercent(-3.5) is nonsense
    // (not real odds) but harmless -- it just adds an unused candidate. The
    // 60% must come from elsewhere, so this composed audit should still fail.
    expect(audit.fabricated.some((f) => f.value === 60)).toBe(true);
  });

  it("reports a well-formed empty result for copy with no numerals", () => {
    const audit = auditNumerals("No numbers here at all.", { numbers: [24, 17] });
    expect(audit.ok).toBe(true);
    expect(audit.tokenCount).toBe(0);
    expect(audit.fabricated).toEqual([]);
  });

  it("dedupes allowedValues across facts, boilerplate, and derivations", () => {
    const audit = auditNumerals("", { numbers: [3.5, -3.5], boilerplate: [3.5] }, [signFlip]);
    // facts {3.5,-3.5} + boilerplate {3.5} + signFlip({3.5,-3.5}) = {-3.5,3.5}
    // union should just be {3.5, -3.5}, deduped
    expect(new Set(audit.allowedValues)).toEqual(new Set([3.5, -3.5]));
  });
});
