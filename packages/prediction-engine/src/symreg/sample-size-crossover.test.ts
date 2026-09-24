/**
 * Sample-size crossover for symbolic regression — tests (arXiv 2103.15147v3).
 *
 * ACCEPTANCE GATE: SR dominates at small n and ensembles take over at
 * large n -> a finite crossover n*; win rates and weighted scores follow
 * the gate's plurality rule; degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  crossoverN,
  doctrineVerdict,
  weightedScore,
  winRates,
  type SizeResult,
} from "./sample-size-crossover";

function paperLike(): SizeResult[] {
  // SR wins at small n, ensembles win at large n (the paper's claim).
  return [
    { n: 32, r2: { sr: 0.60, lasso: 0.50, rf: 0.45, gb: 0.48 } },
    { n: 100, r2: { sr: 0.66, lasso: 0.60, rf: 0.58, gb: 0.61 } },
    { n: 250, r2: { sr: 0.70, lasso: 0.68, rf: 0.71, gb: 0.72 } },
    { n: 500, r2: { sr: 0.72, lasso: 0.72, rf: 0.76, gb: 0.77 } },
    { n: 1000, r2: { sr: 0.73, lasso: 0.75, rf: 0.80, gb: 0.81 } },
  ];
}

describe("winRates", () => {
  it("gives SR the small-n plurality", () => {
    const wr = winRates(paperLike());
    expect(wr.sr).toBeCloseTo(0.4, 12);
    expect(wr.gb).toBeCloseTo(0.6, 12);
    expect(wr.sr + wr.lasso + wr.rf + wr.gb).toBeCloseTo(1, 12);
    expect(() => winRates([])).toThrow();
  });
});

describe("crossoverN", () => {
  it("finds the size where ensembles take and hold the lead", () => {
    expect(crossoverN(paperLike())).toBe(250);
    // SR never beaten -> null.
    const srAlways = paperLike().map((r) => ({
      n: r.n,
      r2: { ...r.r2, sr: 0.99 },
    }));
    expect(crossoverN(srAlways)).toBeNull();
    expect(() => crossoverN([])).toThrow();
  });
});

describe("weightedScore + doctrineVerdict", () => {
  it("weights small-n performance and applies the adoption gate", () => {
    const ws = weightedScore(paperLike());
    // Small-n weighting widens SR's edge over Lasso vs the plain mean gap
    // (SR's advantage lives at small n).
    const plainGap = (rs: SizeResult[], m: "sr" | "lasso"): number =>
      rs.reduce((a, r) => a + r.r2[m], 0) / rs.length;
    const gapPlain = plainGap(paperLike(), "sr") - plainGap(paperLike(), "lasso");
    expect(ws.sr - ws.lasso).toBeGreaterThan(gapPlain);
    const v = doctrineVerdict(paperLike());
    expect(v.adoptSrFirst).toBe(true);
    expect(v.srWinRate).toBeCloseTo(0.4, 12);
    expect(v.srVsLasso).toBeGreaterThan(0);
    expect(v.crossover).toBe(250);
  });

  it("rejects SR-first when SR finishes outside the top 2", () => {
    const bad = paperLike().map((r) => ({
      n: r.n,
      r2: { sr: 0.3, lasso: r.r2.lasso, rf: r.r2.rf, gb: r.r2.gb },
    }));
    const v = doctrineVerdict(bad);
    expect(v.adoptSrFirst).toBe(false);
    expect(v.reason).toContain("REJECT");
  });
});
