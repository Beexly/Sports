import { describe, it, expect } from "vitest";
// Imported through the PACKAGE BARREL, not by direct path. A module that is not
// re-exported from index.ts is unreachable from apps/web, and a direct-path import here
// would pass while hiding exactly that gap.
import {
  orderingCurrent,
  orderingEdgeFirst,
  orderingModelMinusMarket,
  orderingPricedTierFirst,
  isPricedRow,
  modelMinusMarket,
  RANKING_CANDIDATES,
  type RankingRow,
  type RankingComparator,
} from "../index.js";

const row = (o: Partial<RankingRow> & { confidence: number }): RankingRow => o;

/** Every comparator must be total, antisymmetric and stable. Run the same laws on all. */
const ALL: ReadonlyArray<readonly [string, RankingComparator]> = [
  ["current", orderingCurrent],
  ["pricedTierFirst", orderingPricedTierFirst],
  ["edgeFirst", orderingEdgeFirst],
  ["modelMinusMarket", orderingModelMinusMarket],
];

const SAMPLE: readonly RankingRow[] = [
  row({ confidence: 91, rankingP: 0.91, rankingSource: "blend_indep_conf", expectedClv: 0.0217, trueProb: 0.62, marketFairProb: 0.6, generatedAtMs: 3 }),
  row({ confidence: 85, rankingP: 0.8, rankingSource: "independent_trueProb", expectedClv: 0.2257, trueProb: 0.71, marketFairProb: 0.49, generatedAtMs: 2 }),
  row({ confidence: 78, rankingP: 0.78, rankingSource: "confidence", generatedAtMs: 1 }),
  row({ confidence: 64, generatedAtMs: 5 }),
  row({ confidence: 72, rankingScore: 72, generatedAtMs: 4 }),
  row({ confidence: 56, rankingP: 0.56, rankingSource: "blend_indep_conf", expectedClv: 0, trueProb: 0.5, marketFairProb: 0.5, generatedAtMs: 6 }),
];

describe("ranking candidates: laws that hold for every comparator", () => {
  for (const [name, cmp] of ALL) {
    it(`${name} is antisymmetric`, () => {
      for (const a of SAMPLE) {
        for (const b of SAMPLE) {
          // Sum to zero rather than negate: Math.sign(0) negated is -0, and toBe uses
          // Object.is, which separates 0 from -0.
          expect(Math.sign(cmp(a, b)) + Math.sign(cmp(b, a))).toBe(0);
        }
      }
    });

    it(`${name} is reflexive-zero`, () => {
      for (const a of SAMPLE) expect(cmp(a, a)).toBe(0);
    });

    it(`${name} is total: never returns a non-finite value`, () => {
      for (const a of SAMPLE) {
        for (const b of SAMPLE) expect(Number.isFinite(cmp(a, b))).toBe(true);
      }
    });

    it(`${name} is stable: equal rows keep input order`, () => {
      const x = row({ confidence: 50, generatedAtMs: 1 });
      const y = row({ confidence: 50, generatedAtMs: 1 });
      expect([x, y].sort(cmp)[0]).toBe(x);
    });
  }
});

describe("the barrel", () => {
  it("exposes every candidate by name", () => {
    expect(new Set(Object.keys(RANKING_CANDIDATES))).toEqual(
      new Set(["current", "pricedTierFirst", "edgeFirst", "modelMinusMarket"]),
    );
  });
});

describe("orderingCurrent reproduces the live fallback chain", () => {
  it("pins featured rows first, above a higher-ranked unfeatured row", () => {
    const feat = row({ confidence: 10, rankingP: 0.1, isFeatured: true });
    const better = row({ confidence: 99, rankingP: 0.99 });
    expect([better, feat].sort(orderingCurrent)[0]).toBe(feat);
  });

  it("prefers rankingP over rankingScore over confidence", () => {
    const byP = row({ confidence: 1, rankingP: 0.9 });
    const byScore = row({ confidence: 1, rankingScore: 80 });
    const byConf = row({ confidence: 70 });
    expect([byConf, byScore, byP].sort(orderingCurrent)).toEqual([byP, byScore, byConf]);
  });

  it("clamps rankingP into range rather than letting it dominate", () => {
    const over = row({ confidence: 1, rankingP: 5 });
    const one = row({ confidence: 1, rankingP: 1 });
    expect(orderingCurrent(over, one)).toBe(0);
  });

  it("falls back to confidence when the row carries no ranking fields at all", () => {
    const hi = row({ confidence: 80 });
    const lo = row({ confidence: 20 });
    expect([lo, hi].sort(orderingCurrent)[0]).toBe(hi);
  });
});

describe("absence is never zero", () => {
  it("a null expectedClv trails a row carrying 0.0, which is a real value", () => {
    const contradicts = row({ confidence: 50, expectedClv: 0 });
    const absent = row({ confidence: 99, expectedClv: null });
    expect([absent, contradicts].sort(orderingEdgeFirst)[0]).toBe(contradicts);
  });

  it("a non-finite expectedClv trails as if absent", () => {
    const nan = row({ confidence: 99, expectedClv: Number.NaN });
    const real = row({ confidence: 1, expectedClv: -0.5 });
    expect([nan, real].sort(orderingEdgeFirst)[0]).toBe(real);
  });

  it("modelMinusMarket returns null when either side is missing, never a number", () => {
    expect(modelMinusMarket(row({ confidence: 50, trueProb: 0.6 }))).toBeNull();
    expect(modelMinusMarket(row({ confidence: 50, marketFairProb: 0.5 }))).toBeNull();
    expect(modelMinusMarket(row({ confidence: 50, trueProb: 0.6, marketFairProb: 0.5 }))).toBeCloseTo(0.1, 10);
  });
});

describe("isPricedRow", () => {
  it("treats an absent rankingSource as unpriced", () => {
    expect(isPricedRow(row({ confidence: 90 }))).toBe(false);
  });

  it("treats the confidence path as unpriced", () => {
    expect(isPricedRow(row({ confidence: 90, rankingSource: "confidence" }))).toBe(false);
  });

  it("treats both priced paths as priced", () => {
    expect(isPricedRow(row({ confidence: 1, rankingSource: "independent_trueProb" }))).toBe(true);
    expect(isPricedRow(row({ confidence: 1, rankingSource: "blend_indep_conf" }))).toBe(true);
  });
});

describe("orderingPricedTierFirst: the live inversion, pinned", () => {
  it("never places an unpriced row above a priced one, even at the highest confidence", () => {
    const unpricedTop = row({ confidence: 99, rankingP: 0.99, rankingSource: "confidence" });
    const pricedLow = row({ confidence: 51, rankingP: 0.51, rankingSource: "independent_trueProb", expectedClv: 0.01 });
    expect([unpricedTop, pricedLow].sort(orderingPricedTierFirst)[0]).toBe(pricedLow);
  });

  it("orders tier 1 by EDGE, so the measured inversion is corrected", () => {
    // The real slate: confidence 91 carried the SMALLEST positive edge, confidence 85 the largest.
    const conf91 = SAMPLE[0]!;
    const conf85 = SAMPLE[1]!;
    expect([conf91, conf85].sort(orderingCurrent)[0]).toBe(conf91);
    expect([conf91, conf85].sort(orderingPricedTierFirst)[0]).toBe(conf85);
  });

  it("keeps tier 2 in input order rather than inventing one", () => {
    const a = row({ confidence: 10, rankingSource: "confidence", generatedAtMs: 1 });
    const b = row({ confidence: 90, rankingSource: "confidence", generatedAtMs: 2 });
    expect([a, b].sort(orderingPricedTierFirst)).toEqual([a, b]);
  });

  it("puts a priced row with an absent edge below a priced row with one, still above tier 2", () => {
    const pricedNoEdge = row({ confidence: 95, rankingSource: "blend_indep_conf" });
    const pricedEdge = row({ confidence: 51, rankingSource: "blend_indep_conf", expectedClv: 0.02 });
    const unpriced = row({ confidence: 99, rankingSource: "confidence" });
    expect([unpriced, pricedNoEdge, pricedEdge].sort(orderingPricedTierFirst)).toEqual([
      pricedEdge,
      pricedNoEdge,
      unpriced,
    ]);
  });
});

describe("orderingModelMinusMarket", () => {
  it("ranks the largest model-over-market gap first", () => {
    const small = row({ confidence: 99, trueProb: 0.55, marketFairProb: 0.54 });
    const large = row({ confidence: 1, trueProb: 0.71, marketFairProb: 0.49 });
    expect([small, large].sort(orderingModelMinusMarket)[0]).toBe(large);
  });

  it("trails rows the market never priced", () => {
    const noMarket = row({ confidence: 99, trueProb: 0.86, marketFairProb: null });
    const priced = row({ confidence: 1, trueProb: 0.52, marketFairProb: 0.51 });
    expect([noMarket, priced].sort(orderingModelMinusMarket)[0]).toBe(priced);
  });
});
