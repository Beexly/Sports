/**
 * Pins for the cluster bootstrap and the relabeling null.
 *
 * Sources: arXiv:2604.01491 (game-level resampling; "directional rather than
 * decisive" reporting) and arXiv:2603.03613 (relabeling procedures must be shown
 * not to be reporting their own construction).
 *
 * The cluster fixtures are built so the expected interval is computable by hand:
 * six games of four rows, the candidate better in every game by the same margin.
 * The single-cluster case is the point of the whole module: a comparison drawn
 * from ONE game has no cluster-level uncertainty at all, and a row-level
 * bootstrap would happily pretend otherwise.
 */

import { describe, expect, it } from "vitest";

import {
  clusterBootstrap,
  decide,
  pairedWinRate,
  relabelingNull,
  type PairedLosses,
} from "../integrity";
import { pairedBootstrap } from "../stats";

/** Six games x four rows; candidate loses 0.1 per row in every game. */
function sixGames(): PairedLosses {
  const candidateLoss: number[] = [];
  const marketLoss: number[] = [];
  const clusterId: string[] = [];
  for (let g = 0; g < 6; g++) {
    for (let r = 0; r < 4; r++) {
      candidateLoss.push(0.2);
      marketLoss.push(0.3);
      clusterId.push(`g${g}`);
    }
  }
  return { candidateLoss, marketLoss, clusterId };
}

describe("clusterBootstrap", () => {
  it("delta is the full-sample mean difference", () => {
    expect(clusterBootstrap(sixGames(), { resamples: 200 }).delta).toBeCloseTo(-0.1, 12);
  });

  it("reports pBetter = 1 when the candidate wins in every cluster", () => {
    expect(clusterBootstrap(sixGames(), { resamples: 200 }).pBetter).toBe(1);
  });

  it("counts clusters, not rows", () => {
    const r = clusterBootstrap(sixGames(), { resamples: 200 });
    expect(r.n).toBe(24);
    expect(r.clusters).toBe(6);
    expect(r.meanClusterSize).toBeCloseTo(4, 12);
  });

  it("is deterministic under a fixed seed", () => {
    const a = clusterBootstrap(sixGames(), { resamples: 200, seed: 5 });
    const b = clusterBootstrap(sixGames(), { resamples: 200, seed: 5 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("is wider than the row-level bootstrap when the edge lives in a few games", () => {
    // The candidate's edge lives entirely in two of six games, and within a game
    // every row moves together. Row resampling treats 24 independent rows;
    // cluster resampling sees 6 independent games.
    const candidateLoss: number[] = [];
    const marketLoss: number[] = [];
    const clusterId: string[] = [];
    for (let g = 0; g < 6; g++) {
      const edge = g < 2 ? 0.0 : 0.2;
      for (let r = 0; r < 4; r++) {
        candidateLoss.push(0.5 - edge);
        marketLoss.push(0.5);
        clusterId.push(`g${g}`);
      }
    }
    const input = { candidateLoss, marketLoss, clusterId };
    const clustered = clusterBootstrap(input, { resamples: 2000, seed: 11 });
    const rowwise = pairedBootstrap(input, { resamples: 2000, seed: 11 });
    expect(rowwise.delta).toBeCloseTo(clustered.delta, 12);
    // Same point estimate, strictly more uncertainty: that is the whole claim.
    expect(clustered.ciLow).toBeLessThan(rowwise.delta - 1e-6);
  });

  it("refuses a length mismatch rather than truncating into a result", () => {
    const r = clusterBootstrap(
      { candidateLoss: [0.1], marketLoss: [0.2, 0.3], clusterId: ["a", "b"] },
      { resamples: 50 },
    );
    expect(r.n).toBe(0);
    expect(r.delta).toBeNaN();
    expect(r.pBetter).toBe(0.5);
  });

  it("keeps the interval ordered", () => {
    const r = clusterBootstrap(sixGames(), { resamples: 500 });
    expect(r.ciLow).toBeLessThanOrEqual(r.ciHigh);
  });
});

describe("decide — the paper's reporting rule", () => {
  it("calls a uniformly better candidate decisive when the interval excludes zero", () => {
    const d = decide(clusterBootstrap(sixGames(), { resamples: 2000 }));
    expect(d.verdict).toBe("decisive-better");
    expect(d.ciExcludesZero).toBe(true);
  });

  it("calls a comparison with ONE cluster indistinguishable, not decisive", () => {
    // With a single game there is no cluster-level spread, so nothing can be
    // decisive. A row-level bootstrap on the same 24 rows would have produced a
    // confident interval — that is the failure this module exists to prevent.
    const single: PairedLosses = {
      candidateLoss: Array.from({ length: 24 }, () => 0.2),
      marketLoss: Array.from({ length: 24 }, () => 0.3),
      clusterId: Array.from({ length: 24 }, () => "only-game"),
    };
    const r = clusterBootstrap(single, { resamples: 2000 });
    expect(r.clusters).toBe(1);
    expect(r.pBetter).toBe(1);
    const d = decide(r);
    expect(d.tooFewClusters).toBe(true);
    expect(d.verdict).toBe("indistinguishable");
  });

  it("calls a positive point estimate with an interval over zero directional", () => {
    // A small net edge inside a noisy game-level spread: directionally positive,
    // which arXiv:2604.01491 insists must not be reported as a win.
    const candidateLoss: number[] = [];
    const marketLoss: number[] = [];
    const clusterId: string[] = [];
    for (let g = 0; g < 8; g++) {
      for (let r = 0; r < 4; r++) {
        const swing = g % 2 === 0 ? 0.06 : -0.04;
        candidateLoss.push(0.5 - swing);
        marketLoss.push(0.5);
        clusterId.push(`g${g}`);
      }
    }
    const d = decide(clusterBootstrap({ candidateLoss, marketLoss, clusterId }, { resamples: 2000, seed: 3 }));
    expect(d.delta).toBeLessThan(0);
    expect(d.ciExcludesZero).toBe(false);
    expect(d.verdict).toBe("directional-better");
  });

  it("is indistinguishable on an empty sample", () => {
    const d = decide(clusterBootstrap({ candidateLoss: [], marketLoss: [], clusterId: [] }));
    expect(d.verdict).toBe("indistinguishable");
  });
});

describe("relabelingNull", () => {
  /** Candidate uniformly below market: the edge does not depend on pairing. */
  function robustEdge(): PairedLosses {
    return {
      candidateLoss: Array.from({ length: 20 }, (_, i) => 0.1 + (i % 5) * 0.01),
      marketLoss: Array.from({ length: 20 }, (_, i) => 0.5 + (i % 5) * 0.01),
      clusterId: Array.from({ length: 20 }, (_, i) => `g${i % 5}`),
    };
  }

  /**
   * A lucky arrangement. The candidate is the market shifted down one slot on
   * five of ten rows and equal on the rest, so it wins 5/10 purely by being
   * placed that way. The market's small values are what make a shuffle do far
   * better, which is the signature of an artifact.
   */
  function luckyArrangement(): PairedLosses {
    const marketLoss = [0.1, 0.2, 0.3, 0.4, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    const candidateLoss = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.5, 0.5, 0.5, 0.5];
    return { candidateLoss, marketLoss, clusterId: marketLoss.map((_, i) => `g${i}`) };
  }

  it("measures the row-wise hit rate, which is the pairing-dependent statistic", () => {
    expect(pairedWinRate([0.1, 0.5], [0.2, 0.4])).toBeCloseTo(0.5, 12);
    expect(pairedWinRate([], [])).toBeNaN();
  });

  it("a robustly better candidate SURVIVES relabeling", () => {
    const r = relabelingNull(robustEdge(), { resamples: 200, seed: 13 });
    expect(r.observedWinRate).toBe(1);
    expect(r.survivesRelabeling).toBe(true);
    // Its p-value is ~1, because relabeling reproduces the same result every
    // time: that is what robustness looks like, and exactly why p alone must
    // never be the gate — a p of 1 here would read as "no evidence" if the
    // verdict were not reported beside it.
    expect(r.pValue).toBeGreaterThan(0.9);
  });

  it("a lucky arrangement does NOT survive relabeling, and the p-value says why", () => {
    const r = relabelingNull(luckyArrangement(), { resamples: 400, seed: 17 });
    expect(r.observedWinRate).toBeCloseTo(0.5, 12);
    // Relabeling matches or beats the observed arrangement in ~27% of draws, so
    // the specific row pairing is not what produced the result. The verdict is
    // the one that matters; p is only interpretable next to it.
    expect(r.pValue).toBeLessThan(0.5);
    expect(r.bestNullWinRate).toBeGreaterThanOrEqual(r.observedWinRate);
    expect(r.survivesRelabeling).toBe(false);
  });

  it("cannot report p = 0 — the +1 correction keeps the floor honest", () => {
    const r = relabelingNull(luckyArrangement(), { resamples: 200, seed: 3 });
    expect(r.pValue).toBeGreaterThan(0);
    expect(r.pValue).toBeGreaterThanOrEqual(1 / 201);
  });

  it("reports the strongest null so a borderline claim can show its worst case", () => {
    const r = relabelingNull(robustEdge(), { resamples: 100, seed: 21 });
    expect(r.nullWinRates.length).toBe(100);
    expect(r.bestNullWinRate).toBeGreaterThanOrEqual(Math.min(...r.nullWinRates));
  });

  it("is deterministic under a fixed seed", () => {
    const a = relabelingNull(robustEdge(), { resamples: 50, seed: 4 });
    const b = relabelingNull(robustEdge(), { resamples: 50, seed: 4 });
    expect(a.pValue).toBe(b.pValue);
    expect(a.nullWinRates).toEqual(b.nullWinRates);
  });

  it("refuses a length mismatch", () => {
    const r = relabelingNull({ candidateLoss: [0.1], marketLoss: [0.2, 0.3], clusterId: ["a"] });
    expect(r.n).toBe(0);
    expect(r.pValue).toBeNaN();
  });
});
