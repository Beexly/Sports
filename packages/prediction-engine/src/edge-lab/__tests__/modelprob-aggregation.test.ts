/** Property tests for the independent modelProb aggregation core (C-28 / R71).
 * Pure synthetic fixtures only — see module header for the design-doc status.
 */
import { describe, expect, it } from "vitest";
import {
  MODELPROB_AGGREGATION_METHOD_TAG,
  aggregateModelProb,
  computeLeagueBaseline,
  shrinkSignal,
  shrinkageWeight,
  zScore,
  zToProbability,
  type PlayerSignal,
} from "../modelprob-aggregation.js";
import { buildPickProofReceipt, verifyPickProofReceipt } from "../../pick-proof-receipt.js";

function sig(playerId: string, signal: number | null, n: number, weight = 1): PlayerSignal {
  return { playerId, signal, n, weight };
}

describe("computeLeagueBaseline", () => {
  it("computes mean/std over non-null signals only, dropping nulls", () => {
    const baseline = computeLeagueBaseline([
      sig("P1", 1, 10),
      sig("P2", 3, 10),
      sig("P3", null, 10), // dropped, not imputed to 0
      sig("P4", 5, 10),
    ]);
    expect(baseline).not.toBeNull();
    expect(baseline!.mean).toBeCloseTo(3, 6); // avg(1,3,5)
    expect(baseline!.n).toBe(3);
  });

  it("fails closed (null) with fewer than 2 non-null signals", () => {
    expect(computeLeagueBaseline([sig("P1", 1, 10)])).toBeNull();
    expect(computeLeagueBaseline([])).toBeNull();
  });

  it("fails closed on zero-variance input (nothing to normalize against)", () => {
    expect(computeLeagueBaseline([sig("P1", 5, 10), sig("P2", 5, 10)])).toBeNull();
  });
});

describe("zScore / zToProbability", () => {
  it("z=0 at the league mean, maps to probability 0.5", () => {
    const baseline = { mean: 10, std: 2, n: 50 };
    expect(zScore(10, baseline)).toBe(0);
    expect(zToProbability(0)).toBeCloseTo(0.5, 10);
  });

  it("positive z maps above 0.5, negative below — monotonic in the signal", () => {
    const baseline = { mean: 10, std: 2, n: 50 };
    const above = zToProbability(zScore(14, baseline)); // z=2
    const below = zToProbability(zScore(6, baseline)); // z=-2
    expect(above).toBeGreaterThan(0.5);
    expect(below).toBeLessThan(0.5);
    expect(above).toBeCloseTo(1 - below, 10); // logistic symmetry
  });
});

describe("shrinkageWeight", () => {
  it("n=0 -> 0 (full shrinkage to league mean)", () => {
    expect(shrinkageWeight(0, 50)).toBe(0);
  });

  it("approaches 1 as n grows relative to tau", () => {
    expect(shrinkageWeight(50, 50)).toBeCloseTo(0.5, 10); // n=tau -> exactly 0.5
    expect(shrinkageWeight(5000, 50)).toBeGreaterThan(0.98);
  });

  it("rejects non-positive tau — a silent zero-tau would mean zero shrinkage ever, defeating the point", () => {
    expect(() => shrinkageWeight(10, 0)).toThrow(/tau/);
    expect(() => shrinkageWeight(10, -5)).toThrow(/tau/);
  });
});

describe("shrinkSignal", () => {
  it("n=0 returns exactly pLeague regardless of z (full shrinkage)", () => {
    expect(shrinkSignal(5, 0, { pLeague: 0.5, tau: 50 })).toBe(0.5);
    expect(shrinkSignal(-5, 0, { pLeague: 0.5, tau: 50 })).toBe(0.5);
  });

  it("large n approaches zToProbability(z), not pLeague", () => {
    const z = 1.5;
    const shrunk = shrinkSignal(z, 100_000, { pLeague: 0.5, tau: 50 });
    expect(shrunk).toBeCloseTo(zToProbability(z), 3);
  });

  it("rejects an out-of-range pLeague — never silently clamp a caller's bug", () => {
    expect(() => shrinkSignal(0, 10, { pLeague: 1.5, tau: 50 })).toThrow(/pLeague/);
  });
});

describe("aggregateModelProb", () => {
  const baseline = { mean: 0, std: 1, n: 200 };

  it("fails closed with refuse=no_signals when every signal is null", () => {
    const res = aggregateModelProb(
      [sig("P1", null, 20), sig("P2", null, 20)],
      baseline,
      { pLeague: 0.5, tau: 50, minTotalN: 10 },
    );
    expect(res.ok).toBe(false);
    expect(res.modelProb).toBeNull();
    expect(res.refuse).toBe("no_signals");
    expect(res.priced).toBe(false);
  });

  it("fails closed with refuse=starved_n below the required minimum, even with real signals", () => {
    const res = aggregateModelProb(
      [sig("P1", 2, 3), sig("P2", 1.5, 4)], // totalN = 7
      baseline,
      { pLeague: 0.5, tau: 50, minTotalN: 500 },
    );
    expect(res.ok).toBe(false);
    expect(res.modelProb).toBeNull();
    expect(res.refuse).toBe("starved_n");
    expect(res.totalN).toBe(7);
  });

  it("MONOTONICITY: a stronger aggregate signal yields a strictly higher modelProb, all else equal", () => {
    // This is the design doc's own required verification-plan property (§ item 2).
    const weak = aggregateModelProb(
      [sig("P1", 0.5, 200, 1), sig("P2", 0.3, 200, 1)],
      baseline,
      { pLeague: 0.5, tau: 50, minTotalN: 10 },
    );
    const strong = aggregateModelProb(
      [sig("P1", 2.0, 200, 1), sig("P2", 1.8, 200, 1)],
      baseline,
      { pLeague: 0.5, tau: 50, minTotalN: 10 },
    );
    expect(weak.ok).toBe(true);
    expect(strong.ok).toBe(true);
    expect(strong.modelProb!).toBeGreaterThan(weak.modelProb!);
  });

  it("offense-weighting: a heavier-weighted strong signal pulls the aggregate further than a light one", () => {
    const lightWeight = aggregateModelProb(
      [sig("P1", 3, 500, 0.1), sig("P2", 0, 500, 0.9)],
      baseline,
      { pLeague: 0.5, tau: 50, minTotalN: 10 },
    );
    const heavyWeight = aggregateModelProb(
      [sig("P1", 3, 500, 0.9), sig("P2", 0, 500, 0.1)],
      baseline,
      { pLeague: 0.5, tau: 50, minTotalN: 10 },
    );
    expect(heavyWeight.modelProb!).toBeGreaterThan(lightWeight.modelProb!);
  });

  it("drops null-signal and non-positive-weight observations rather than imputing them", () => {
    const withJunk = aggregateModelProb(
      [sig("P1", 2, 300, 1), sig("P2", null, 300, 1), sig("P3", 2, 300, 0)],
      baseline,
      { pLeague: 0.5, tau: 50, minTotalN: 10 },
    );
    const clean = aggregateModelProb([sig("P1", 2, 300, 1)], baseline, {
      pLeague: 0.5,
      tau: 50,
      minTotalN: 10,
    });
    expect(withJunk.contributingSignals).toBe(1);
    expect(withJunk.modelProb).toBe(clean.modelProb);
  });

  it("deterministic: identical input produces identical output", () => {
    const rows: PlayerSignal[] = [sig("P1", 1.2, 40, 0.6), sig("P2", -0.4, 60, 0.4)];
    const a = aggregateModelProb(rows, baseline, { pLeague: 0.5, tau: 30, minTotalN: 10 });
    const b = aggregateModelProb(rows, baseline, { pLeague: 0.5, tau: 30, minTotalN: 10 });
    expect(a).toEqual(b);
  });

  it("carries the versioned method tag and priced:false on every result, ok or refused", () => {
    const ok = aggregateModelProb([sig("P1", 1, 100)], baseline, { pLeague: 0.5, tau: 50, minTotalN: 10 });
    const refused = aggregateModelProb([sig("P1", null, 100)], baseline, {
      pLeague: 0.5,
      tau: 50,
      minTotalN: 10,
    });
    expect(ok.methodTag).toBe(MODELPROB_AGGREGATION_METHOD_TAG);
    expect(refused.methodTag).toBe(MODELPROB_AGGREGATION_METHOD_TAG);
    expect(ok.priced).toBe(false);
    expect(refused.priced).toBe(false);
  });
});

describe("receipt boundary — aggregateModelProb output is a valid pick-proof-receipt modelProb", () => {
  const baseline = { mean: 0, std: 1, n: 200 };
  const hash = (input: string): string => {
    let acc = 7;
    for (let i = 0; i < input.length; i++) acc = (acc * 31 + input.charCodeAt(i)) >>> 0;
    return acc.toString(16).padStart(8, "0");
  };

  it("an ok:true aggregation builds and verifies as a real receipt modelProb", () => {
    const res = aggregateModelProb(
      [sig("P1", 1.5, 300, 0.6), sig("P2", 0.8, 300, 0.4)],
      baseline,
      { pLeague: 0.5, tau: 50, minTotalN: 10 },
    );
    expect(res.ok).toBe(true);
    const receipt = buildPickProofReceipt(
      {
        pickId: "test-pick-1",
        gameId: "test-game-1",
        selection: "TEST -3.5",
        pickType: "SPREAD",
        line: -3.5,
        entryOdds: -110,
        marketFairProb: 0.52,
        confidence: 61,
        edgeScore: 4.2,
        modelProb: res.modelProb, // exact value — receipt itself rounds to 6dp at build
        modelVersion: MODELPROB_AGGREGATION_METHOD_TAG,
        asOf: "2026-08-26T00:00:00.000Z",
      },
      hash,
    );
    // The committed field lives in the hashed canonical payload, not a parallel
    // struct — that IS the honesty property (proof-of-record.ts:141-142).
    expect(receipt.payload).not.toContain("modelProb=none");
    expect(receipt.payload).toContain(`modelProb=${round6(res.modelProb!)}`);
    expect(verifyPickProofReceipt(receipt, hash)).toBe(true);
  });

  it("an ok:false (refused) aggregation commits an honest 'none', never a fabricated modelProb", () => {
    const res = aggregateModelProb([sig("P1", null, 300)], baseline, {
      pLeague: 0.5,
      tau: 50,
      minTotalN: 10,
    });
    expect(res.ok).toBe(false);
    expect(res.modelProb).toBeNull();
    const receipt = buildPickProofReceipt(
      {
        pickId: "test-pick-2",
        gameId: "test-game-2",
        selection: "TEST -3.5",
        pickType: "SPREAD",
        line: -3.5,
        entryOdds: -110,
        marketFairProb: 0.52,
        confidence: 61,
        edgeScore: 4.2,
        modelProb: res.modelProb, // null — must never be coerced to a number
        modelVersion: MODELPROB_AGGREGATION_METHOD_TAG,
        asOf: "2026-08-26T00:00:00.000Z",
      },
      hash,
    );
    expect(receipt.payload).toContain("modelProb=none");
    expect(verifyPickProofReceipt(receipt, hash)).toBe(true);
  });
});

/** Mirrors pick-proof-receipt.ts's private `round(value, 6)` for payload assertions. */
function round6(value: number): number {
  const f = 10 ** 6;
  return Math.round(value * f) / f;
}
