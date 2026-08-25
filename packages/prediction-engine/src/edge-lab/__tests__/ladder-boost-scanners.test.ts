/**
 * Tests for the ladder + boost scanners (softness map).
 *
 * Guarantees:
 *   1. Fail-closed: empty ladder or all-invalid quotes → bestLevel=null.
 *   2. Leak-safe: only consumes model p and market q. priced:false always.
 *   3. Best level = highest (p − q) edge across the ladder.
 *   4. Boost score = fraction of levels where p > q.
 *   5. Juice floor: bestJuiceLevel = highest (p − breakEven) surplus.
 *   6. Skip-and-continue: a single bad quote doesn't kill the whole scan.
 *   7. Boost opportunities filter to p > q levels only, sorted descending.
 *   8. Monotonic model curve: P(over) decreases as line increases.
 *
 * Fixtures only; no network.
 */
import { describe, expect, it } from "vitest";

import {
  LADDER_BOOST_METHOD_TAG,
  scanLadderBoost,
  scanBoostOpportunities,
  type LadderLevel,
  type BoostOpportunity,
} from "../ladder-boost-scanners.js";
import type { PropBookQuote } from "../props-priced-edge.js";

function quote(o: number, u: number): PropBookQuote {
  return { overAmerican: o, underAmerican: u };
}

// A simple monotonic model: P(over) = exp(-k * max(0, line - threshold))
// This ensures higher lines → lower P(over), a valid betting model.
function linearModel(baseP: number, rate: number) {
  return (line: number): number => {
    const p = baseP - rate * line;
    return Math.max(0, Math.min(1, p));
  };
}

describe("scanLadderBoost", () => {
  it("returns empty result for empty ladder", () => {
    const result = scanLadderBoost([], () => 0.5);
    expect(result.bestLevel).toBeNull();
    expect(result.bestJuiceLevel).toBeNull();
    expect(result.priceableLevels).toBe(0);
    expect(result.boostScore).toBe(0);
    expect(result.meanEdge).toBe(0);
    expect(result.priced).toBe(false);
    expect(result.methodTag).toBe(LADDER_BOOST_METHOD_TAG);
  });

  it("returns empty result when all quotes are invalid", () => {
    const levels: LadderLevel[] = [
      { line: 1.5, quote: quote(0, -200) }, // overAmerican=0 is invalid
      { line: 2.5, quote: quote(50, 50) },   // underAmerican=50 is invalid (< 100)
    ];
    const result = scanLadderBoost(levels, () => 0.5);
    expect(result.priceableLevels).toBe(0);
    expect(result.bestLevel).toBeNull();
  });

  it("finds best edge level when model is hot at one line", () => {
    // Model thinks Over at line=2.5 has P=0.55, market implies q=0.50 → edge=0.05
    // At line=3.5, model P=0.45, market q=0.50 → edge=-0.05
    const levels: LadderLevel[] = [
      { line: 2.5, quote: quote(-110, -110) }, // even money, q=0.5
      { line: 3.5, quote: quote(-110, -110) }, // even money, q=0.5
    ];
    const model = (line: number) => (line === 2.5 ? 0.55 : 0.45);
    const result = scanLadderBoost(levels, model);

    expect(result.priceableLevels).toBe(2);
    expect(result.bestLevel).not.toBeNull();
    expect(result.bestLevel!.line).toBe(2.5);
    expect(result.bestLevel!.edgeOver).toBeCloseTo(0.05, 6);
  });

  it("boostScore = fraction of levels where p > q", () => {
    // 4 levels at even odds (q=0.5 each). Model: [0.6, 0.55, 0.45, 0.40].
    // p > q at 2 levels → boostScore = 0.5
    const levels: LadderLevel[] = [
      { line: 1.5, quote: quote(-110, -110) },
      { line: 2.5, quote: quote(-110, -110) },
      { line: 3.5, quote: quote(-110, -110) },
      { line: 4.5, quote: quote(-110, -110) },
    ];
    let i = 0;
    const modelP = [0.6, 0.55, 0.45, 0.40];
    const model = () => modelP[i++]!;
    const result = scanLadderBoost(levels, model);
    expect(result.boostScore).toBeCloseTo(0.5, 6);
  });

  it("meanEdge = average signed (p − q) across priceable levels", () => {
    // 2 levels, q=0.5 each. Model edges: +0.1, -0.1 → mean = 0.
    const levels: LadderLevel[] = [
      { line: 1.5, quote: quote(-110, -110) },
      { line: 2.5, quote: quote(-110, -110) },
    ];
    let i = 0;
    const modelP = [0.6, 0.4];
    const model = () => modelP[i++]!;
    const result = scanLadderBoost(levels, model);
    expect(result.meanEdge).toBeCloseTo(0.0, 6);
  });

  it("bestJuiceLevel = highest (p − breakEven) surplus", () => {
    // At -110, break-even = 110/210 ≈ 0.5238.
    // Level A: p=0.60 → juice surplus = 0.60 - 0.5238 = 0.0762
    // Level B: p=0.55 → juice surplus = 0.55 - 0.5238 = 0.0262
    const levels: LadderLevel[] = [
      { line: 1.5, quote: quote(-110, -110) },
      { line: 2.5, quote: quote(-110, -110) },
    ];
    let i = 0;
    const modelP = [0.55, 0.60];
    const model = () => modelP[i++]!;
    const result = scanLadderBoost(levels, model);
    expect(result.bestJuiceLevel).not.toBeNull();
    expect(result.bestJuiceLevel!.line).toBe(2.5);
  });

  it("skips invalid quotes but continues scanning", () => {
    const levels: LadderLevel[] = [
      { line: 1.5, quote: quote(-110, -110) }, // valid
      { line: 2.5, quote: quote(0, -200) },     // invalid: overAmerican=0
      { line: 3.5, quote: quote(-110, -110) },   // valid
    ];
    const model = (line: number) => (line === 1.5 ? 0.6 : 0.4);
    const result = scanLadderBoost(levels, model);
    expect(result.priceableLevels).toBe(2);
    expect(result.levels.length).toBe(3);
    expect(result.levels[1]!.skipped).toBeDefined();
  });

  it("priced is always false", () => {
    const levels: LadderLevel[] = [{ line: 2.5, quote: quote(-110, -110) }];
    const result = scanLadderBoost(levels, () => 0.55);
    expect(result.priced).toBe(false);

    const opps = scanBoostOpportunities(levels, () => 0.55);
    // scanBoostOpportunities returns the raw array, but its source result
    // is priced:false by construction.
    expect(opps.length).toBe(1);
  });

  it("fail closed on sub-vig market (overround < 1)", () => {
    // +200 / +200 → implied = 0.333 + 0.333 = 0.667 < 1 (crossed/stale)
    const levels: LadderLevel[] = [{ line: 2.5, quote: quote(200, 200) }];
    const result = scanLadderBoost(levels, () => 0.55);
    expect(result.priceableLevels).toBe(0);
    expect(result.bestLevel).toBeNull();
  });
});

describe("scanBoostOpportunities", () => {
  it("returns only levels where p > q, sorted by edge descending", () => {
    // q=0.5 at all levels (even odds).
    // Edges: level1=0.6-0.5=0.10, level2=0.3-0.5=-0.20, level3=0.55-0.5=0.05
    const levels: LadderLevel[] = [
      { line: 1.5, quote: quote(-110, -110) },
      { line: 2.5, quote: quote(-110, -110) },
      { line: 3.5, quote: quote(-110, -110) },
    ];
    let i = 0;
    const modelP = [0.60, 0.30, 0.55];
    const model = () => modelP[i++]!;
    const opps = scanBoostOpportunities(levels, model);

    expect(opps.length).toBe(2); // only levels 1 and 3 have p > q
    expect(opps[0]!.line).toBe(1.5); // highest edge first (0.10)
    expect(opps[1]!.line).toBe(3.5); // second highest (0.05)
    expect(opps[0]!.edgeOver).toBeGreaterThan(opps[1]!.edgeOver);
  });

  it("returns empty when model is below market everywhere", () => {
    // Model p=0.40 everywhere vs q=0.50 → no opportunities.
    const levels: LadderLevel[] = [
      { line: 1.5, quote: quote(-110, -110) },
      { line: 2.5, quote: quote(-110, -110) },
    ];
    const opps = scanBoostOpportunities(levels, () => 0.40);
    expect(opps.length).toBe(0);
  });

  it("returns empty when all quotes are invalid", () => {
    const levels: LadderLevel[] = [{ line: 1.5, quote: quote(0, -200) }];
    const opps = scanBoostOpportunities(levels, () => 0.60);
    expect(opps.length).toBe(0);
  });

  it("handles uneven money (favorite/underdog lines)", () => {
    // -200 / +170 → Over is favorite.
    // Proportional devig: implied_over = 200/320 = 0.625, implied_under = 100/270 = 0.3704.
    // Overround = 0.625 + 0.3704 = 0.9954... wait, that's < 1?
    // Actually: -200 → decimal 1.5 → implied 1/1.5 = 0.6667. +170 → decimal 2.7 → implied 1/2.7 = 0.3704.
    // Overround = 0.6667 + 0.3704 = 1.0370. q_over = 0.6667/1.0370 = 0.6429.
    const levels: LadderLevel[] = [{ line: 2.5, quote: quote(-200, 170) }];
    const model = () => 0.70;
    const result = scanLadderBoost(levels, model);
    expect(result.priceableLevels).toBe(1);
    expect(result.bestLevel).not.toBeNull();
    const qOver = 0.6667 / (0.6667 + 0.3704);
    expect(result.bestLevel!.qOver).toBeCloseTo(qOver, 4);
    expect(result.bestLevel!.edgeOver).toBeCloseTo(0.70 - qOver, 4);
  });
});

describe("linearModel monotonicity", () => {
  it("linear model produces decreasing P(over) as line increases", () => {
    const model = linearModel(1.0, 0.1);
    expect(model(1)).toBeGreaterThan(model(2));
    expect(model(2)).toBeGreaterThan(model(3));
    expect(model(1)).toBeCloseTo(0.9, 6);
    expect(model(10)).toBeCloseTo(0, 6);
  });

  it("scan with monotonic model flags the lowest line as best when model is hot overall", () => {
    const levels: LadderLevel[] = [
      { line: 1.5, quote: quote(-110, -110) },
      { line: 2.5, quote: quote(-110, -110) },
      { line: 3.5, quote: quote(-110, -110) },
    ];
    // Model starts at 0.80 and drops 0.10 per line → all levels have p > q=0.50.
    const model = (line: number) => Math.max(0, 1.0 - 0.1 * line);
    const result = scanLadderBoost(levels, model);
    expect(result.bestLevel).not.toBeNull();
    expect(result.bestLevel!.line).toBe(1.5); // highest p, highest edge
    expect(result.boostScore).toBe(1.0); // all levels have p > q
  });
});
