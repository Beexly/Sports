import { describe, it, expect } from "vitest";
import { computeAtsResults } from "../context-enrichment";

/**
 * Unit tests for computeAtsResults — the pure ATS math extracted from settleGameLogs.
 *
 * Spread convention: negative = home favored (e.g. -7 means home must win by >7).
 * coverMargin = (homeScore - awayScore) + spread
 *   > 0 → home covers → homeAts=WIN, awayAts=LOSS
 *   < 0 → away covers → homeAts=LOSS, awayAts=WIN
 *   |x| < 0.5 → PUSH (both)
 */

describe("computeAtsResults", () => {
  it("returns PUSH/PUSH when spread is null (no line available)", () => {
    const r = computeAtsResults(28, 17, null);
    expect(r.homeAts).toBe("PUSH");
    expect(r.awayAts).toBe("PUSH");
  });

  it("home covers: home wins by more than the spread", () => {
    // Home -7: home must win by >7. Home wins 28-17 = +11 margin.
    // coverMargin = 11 + (-7) = 4 → home covers
    const r = computeAtsResults(28, 17, -7);
    expect(r.homeAts).toBe("WIN");
    expect(r.awayAts).toBe("LOSS");
  });

  it("away covers: home wins but by less than the spread", () => {
    // Home -7: home must win by >7. Home wins 24-20 = +4 margin.
    // coverMargin = 4 + (-7) = -3 → away covers
    const r = computeAtsResults(24, 20, -7);
    expect(r.homeAts).toBe("LOSS");
    expect(r.awayAts).toBe("WIN");
  });

  it("away covers: home is underdog and loses outright", () => {
    // Home +3: home is dog by 3. Home loses 14-21 = -7 margin.
    // coverMargin = -7 + 3 = -4 → away covers
    const r = computeAtsResults(14, 21, 3);
    expect(r.homeAts).toBe("LOSS");
    expect(r.awayAts).toBe("WIN");
  });

  it("home covers: home is underdog but loses by less than spread", () => {
    // Home +7: home gets 7 points. Home loses 17-21 = -4 margin.
    // coverMargin = -4 + 7 = 3 → home covers
    const r = computeAtsResults(17, 21, 7);
    expect(r.homeAts).toBe("WIN");
    expect(r.awayAts).toBe("LOSS");
  });

  it("push: home wins by exactly the spread (integer spread lands exactly)", () => {
    // Home -7: home wins 24-17 = +7 margin. coverMargin = 7 + (-7) = 0 → push
    const r = computeAtsResults(24, 17, -7);
    expect(r.homeAts).toBe("PUSH");
    expect(r.awayAts).toBe("PUSH");
  });

  it("push: coverMargin within ±0.5 noise band", () => {
    // Floating-point margin of 0.3 is still within push zone
    const r = computeAtsResults(21, 17, -4.3);
    // coverMargin = 4 - 4.3 = -0.3 → |−0.3| < 0.5 → push
    expect(r.homeAts).toBe("PUSH");
    expect(r.awayAts).toBe("PUSH");
  });

  it("half-point spread eliminates true pushes: home covers by 0.5", () => {
    // Home -3.5: home wins 27-20 = +7 margin. coverMargin = 7 - 3.5 = 3.5 → home
    const r = computeAtsResults(27, 20, -3.5);
    expect(r.homeAts).toBe("WIN");
    expect(r.awayAts).toBe("LOSS");
  });

  it("half-point spread: away covers by 0.5", () => {
    // Home -3.5: home wins 24-21 = +3 margin. coverMargin = 3 - 3.5 = -0.5 → away
    const r = computeAtsResults(24, 21, -3.5);
    expect(r.homeAts).toBe("LOSS");
    expect(r.awayAts).toBe("WIN");
  });

  it("home wins outright as underdog (home covers the +line)", () => {
    // Home +10: home is dog. Home wins 23-20 = +3 margin.
    // coverMargin = 3 + 10 = 13 → home covers comfortably
    const r = computeAtsResults(23, 20, 10);
    expect(r.homeAts).toBe("WIN");
    expect(r.awayAts).toBe("LOSS");
  });

  it("zero spread: home wins covers; away wins fails to cover", () => {
    const homeCover = computeAtsResults(21, 17, 0);
    expect(homeCover.homeAts).toBe("WIN");

    const awayCover = computeAtsResults(17, 21, 0);
    expect(awayCover.homeAts).toBe("LOSS");
  });

  it("result is symmetric: home WIN === away LOSS always", () => {
    const cases: Array<[number, number, number]> = [
      [28, 17, -7],
      [17, 21, 7],
      [24, 17, -3.5],
    ];
    for (const [h, a, s] of cases) {
      const r = computeAtsResults(h, a, s);
      if (r.homeAts === "WIN") expect(r.awayAts).toBe("LOSS");
      if (r.homeAts === "LOSS") expect(r.awayAts).toBe("WIN");
      if (r.homeAts === "PUSH") expect(r.awayAts).toBe("PUSH");
    }
  });
});
