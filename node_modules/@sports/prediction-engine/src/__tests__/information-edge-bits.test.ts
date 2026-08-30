import { describe, expect, it } from "vitest";
import {
  DEFAULT_INFORMATION_EDGE_THRESHOLD_BITS,
  DETECTABILITY_TOTAL_BITS,
  binaryCrossEntropyBits,
  binaryEntropyBits,
  empiricalBaseRate,
  gateInformationEdge,
  permutationNullBandBits,
  priorOnlyEdgeBits,
  priorOnlyInformationGainBits,
  realisedEdgeBits,
  realisedInformationGainBits,
  type EdgeCandidate,
} from "../information-edge-bits.js";

/** Perfectly confident predictions that are always right. */
function confidentAndCorrect(n = 20): EdgeCandidate[] {
  return Array.from({ length: n }, (_, i) => {
    const y: 0 | 1 = i % 2 === 0 ? 1 : 0;
    return { p: y === 1 ? 1 : 0, y };
  });
}

/** Perfectly confident predictions that are always wrong — the anti-gaming case. */
function confidentAndWrong(n = 20): EdgeCandidate[] {
  return Array.from({ length: n }, (_, i) => {
    const y: 0 | 1 = i % 2 === 0 ? 1 : 0;
    return { p: y === 1 ? 0 : 1, y };
  });
}

/**
 * Genuinely informative book: p ∈ {0.8, 0.2}, each side right 80% of the time.
 * Empirical base rate is exactly 0.5, so permutation preserves it.
 */
function informativeBook(n = 60): EdgeCandidate[] {
  const out: EdgeCandidate[] = [];
  for (let i = 0; i < n; i++) {
    const high = i % 2 === 0;
    const y: 0 | 1 = high ? (i % 10 === 0 ? 0 : 1) : i % 10 === 1 ? 1 : 0;
    out.push({ p: high ? 0.8 : 0.2, y });
  }
  return out;
}

describe("binaryEntropyBits", () => {
  it("is exactly 1 bit at p=0.5", () => {
    expect(binaryEntropyBits(0.5)).toBe(1);
  });

  it("is exactly 0 at the degenerate ends, with no NaN", () => {
    expect(binaryEntropyBits(0)).toBe(0);
    expect(binaryEntropyBits(1)).toBe(0);
    expect(Number.isNaN(binaryEntropyBits(0))).toBe(false);
    expect(Number.isNaN(binaryEntropyBits(1))).toBe(false);
  });

  it("matches the known value H(0.11) ≈ 0.5 bit", () => {
    expect(binaryEntropyBits(0.11)).toBeCloseTo(0.5, 3);
  });

  it("is symmetric and never exceeds 1 bit", () => {
    for (const p of [0.01, 0.11, 0.25, 0.37, 0.5, 0.83]) {
      expect(binaryEntropyBits(p)).toBeCloseTo(binaryEntropyBits(1 - p), 12);
      expect(binaryEntropyBits(p)).toBeLessThanOrEqual(1);
      expect(binaryEntropyBits(p)).toBeGreaterThanOrEqual(0);
    }
  });

  it("clamps out-of-range input and rejects non-finite input", () => {
    expect(binaryEntropyBits(-0.4)).toBe(0);
    expect(binaryEntropyBits(1.7)).toBe(0);
    expect(Number.isNaN(binaryEntropyBits(NaN))).toBe(true);
    expect(Number.isNaN(binaryEntropyBits(Infinity))).toBe(true);
  });
});

describe("binaryCrossEntropyBits", () => {
  it("is exactly 1 bit for a coin flip either way", () => {
    expect(binaryCrossEntropyBits(0.5, 1)).toBe(1);
    expect(binaryCrossEntropyBits(0.5, 0)).toBe(1);
  });

  it("is near zero for a confident hit and large-but-finite for a confident miss", () => {
    expect(binaryCrossEntropyBits(1, 1)).toBeCloseTo(0, 5);
    const miss = binaryCrossEntropyBits(1, 0);
    expect(Number.isFinite(miss)).toBe(true);
    expect(miss).toBeCloseTo(19.93, 1);
  });

  it("honours a custom probability floor", () => {
    expect(binaryCrossEntropyBits(0, 1, 1e-3)).toBeCloseTo(Math.log2(1000), 6);
  });

  it("falls back to the default floor for an out-of-range or non-finite floor", () => {
    const atDefault = binaryCrossEntropyBits(0, 1);
    for (const bad of [0, -1e-3, 0.5, 0.9, 2, NaN, Infinity]) {
      expect(binaryCrossEntropyBits(0, 1, bad)).toBe(atDefault);
    }
  });

  it("charges EXACTLY -log2(floor) for a confident miss on either side", () => {
    // The module header quotes -log2(probabilityFloor) as the cost of a confident
    // miss. Clamping p (rather than the charged probability) and then taking 1-p
    // round-trips through 1-(1-floor) and silently loses ~11 digits, so the y=0
    // branch would charge 19.93156856928269 instead of 19.931568569324174.
    expect(binaryCrossEntropyBits(0, 1)).toBe(-Math.log2(1e-6));
    expect(binaryCrossEntropyBits(1, 0)).toBe(-Math.log2(1e-6));
    expect(binaryCrossEntropyBits(0, 1, 1e-4)).toBe(-Math.log2(1e-4));
    expect(binaryCrossEntropyBits(1, 0, 1e-4)).toBe(-Math.log2(1e-4));
  });

  it("is symmetric under (p, y) -> (1-p, 1-y)", () => {
    // Only to ~1e-12, and that ceiling is IEEE754's, not the implementation's:
    // 1 - 0.95 === 0.050000000000000044 !== 0.05, so the two calls are not even
    // being handed the same number. Exactness is only achievable at the clamped
    // extremes, which the -log2(floor) test above pins with toBe.
    for (const p of [0, 0.05, 0.2, 0.37, 0.5, 0.8, 0.999, 1]) {
      expect(binaryCrossEntropyBits(p, 1)).toBeCloseTo(binaryCrossEntropyBits(1 - p, 0), 12);
      expect(binaryCrossEntropyBits(p, 0)).toBeCloseTo(binaryCrossEntropyBits(1 - p, 1), 12);
    }
    // exact where the values are exactly representable
    expect(binaryCrossEntropyBits(0.5, 1)).toBe(binaryCrossEntropyBits(0.5, 0));
    expect(binaryCrossEntropyBits(0.25, 1)).toBe(binaryCrossEntropyBits(0.75, 0));
  });

  it("rejects non-finite input rather than pretending to be certain", () => {
    expect(Number.isNaN(binaryCrossEntropyBits(NaN, 1))).toBe(true);
    expect(Number.isNaN(binaryCrossEntropyBits(Infinity, 0))).toBe(true);
  });

  it("is monotone in the charged probability and never negative", () => {
    let previous = Infinity;
    for (const p of [0.99, 0.9, 0.7, 0.5, 0.3, 0.1, 0.01]) {
      const ce = binaryCrossEntropyBits(p, 1);
      expect(ce).toBeGreaterThan(previous === Infinity ? -1 : previous);
      expect(ce).toBeGreaterThanOrEqual(0);
      previous = ce;
    }
  });
});

describe("per-pick edge functions reject unusable probabilities", () => {
  // The platform's native confidence scale is 0-100 (see CLAUDE.md). A caller that
  // passes `confidence` instead of a probability must NOT be handed the maximum
  // achievable edge. Under a silent clamp, priorOnlyEdgeBits(65) === 1 (the ceiling)
  // and realisedEdgeBits(65, 1) === 0.99999 on the supposedly ungameable basis.
  const unusable = [65, 100, 1.5, 1.0000001, -0.1, -3, NaN, Infinity, -Infinity];

  it("priorOnlyEdgeBits returns NaN instead of a maximal score", () => {
    for (const p of unusable) {
      expect(Number.isNaN(priorOnlyEdgeBits(p))).toBe(true);
    }
    // and specifically is not the ceiling it used to return
    expect(priorOnlyEdgeBits(65)).not.toBe(1);
  });

  it("realisedEdgeBits returns NaN instead of a near-maximal score", () => {
    for (const p of unusable) {
      expect(Number.isNaN(realisedEdgeBits(p, 1))).toBe(true);
      expect(Number.isNaN(realisedEdgeBits(p, 0))).toBe(true);
    }
    expect(realisedEdgeBits(65, 1)).not.toBeGreaterThan(0.9);
  });

  it("realisedEdgeBits returns NaN for a non-binary outcome", () => {
    for (const y of [2, -1, 0.5, NaN]) {
      expect(Number.isNaN(realisedEdgeBits(0.9, y as 0 | 1))).toBe(true);
    }
  });

  it("still accepts the legitimate closed interval, including the endpoints", () => {
    expect(priorOnlyEdgeBits(0)).toBe(1);
    expect(priorOnlyEdgeBits(1)).toBe(1);
    expect(Number.isFinite(realisedEdgeBits(0, 0))).toBe(true);
    expect(Number.isFinite(realisedEdgeBits(1, 1))).toBe(true);
  });
});

describe("prior-only (GAMEABLE) information gain", () => {
  it("is exactly 0 for an uninformative p = baseRate book", () => {
    const flat: EdgeCandidate[] = Array.from({ length: 25 }, () => ({ p: 0.5 }));
    expect(priorOnlyInformationGainBits(flat)).toBe(0);
    expect(priorOnlyEdgeBits(0.5)).toBe(0);
  });

  it("awards a full bit to an overconfident model with no accuracy at all", () => {
    // This is the failure mode the module exists to expose: prior bits are maximal
    // for a model that is confidently WRONG on every single pick.
    expect(priorOnlyInformationGainBits(confidentAndWrong(40))).toBe(1);
    expect(priorOnlyInformationGainBits(confidentAndCorrect(40))).toBe(1);
  });

  it("gives ~0.0659 bits for a flat 65% book and ~0.0072 for a flat 55% book", () => {
    const at65: EdgeCandidate[] = Array.from({ length: 10 }, () => ({ p: 0.65 }));
    const at55: EdgeCandidate[] = Array.from({ length: 10 }, () => ({ p: 0.55 }));
    expect(priorOnlyInformationGainBits(at65)).toBeCloseTo(0.0659319, 7);
    expect(priorOnlyInformationGainBits(at55)).toBeCloseTo(0.0072255, 7);
  });

  it("returns 0 for empty input and skips unusable probabilities", () => {
    expect(priorOnlyInformationGainBits([])).toBe(0);
    expect(priorOnlyInformationGainBits([{ p: NaN }, { p: 2 }, { p: -1 }])).toBe(0);
    expect(priorOnlyInformationGainBits([{ p: NaN }, { p: 0.65 }])).toBeCloseTo(0.0659319, 7);
  });

  it("honours a non-default base rate", () => {
    expect(priorOnlyEdgeBits(0.25, { baseRate: 0.25 })).toBe(0);
    expect(priorOnlyEdgeBits(0.5, { baseRate: 0.25 })).toBeLessThan(0);
  });
});

describe("realised (HONEST) information gain — the anti-gaming property", () => {
  it("scores ~1 bit for a perfectly confident and CORRECT model", () => {
    expect(realisedInformationGainBits(confidentAndCorrect())).toBeCloseTo(1, 4);
  });

  it("scores STRONGLY NEGATIVE for a perfectly confident and WRONG model", () => {
    const bits = realisedInformationGainBits(confidentAndWrong());
    expect(bits).toBeLessThan(-15);
    expect(bits).toBeCloseTo(1 - 19.9316, 2);
    expect(Number.isFinite(bits)).toBe(true);
  });

  it("separates the two bases on identical garbage input", () => {
    // The whole point of the module, in one assertion pair.
    const garbage = confidentAndWrong(50);
    expect(priorOnlyInformationGainBits(garbage)).toBe(1);
    expect(realisedInformationGainBits(garbage)).toBeLessThan(-15);
  });

  it("scores ~-9 bits for a coin-flip overconfident model (half right, half wrong)", () => {
    const halfWrong: EdgeCandidate[] = [
      ...confidentAndCorrect(10),
      ...confidentAndWrong(10),
    ];
    expect(realisedInformationGainBits(halfWrong)).toBeCloseTo(1 - 19.9316 / 2, 2);
  });

  it("is exactly 0 for an uninformative p = baseRate book", () => {
    const flat: EdgeCandidate[] = Array.from({ length: 20 }, (_, i) => ({
      p: 0.5,
      y: (i % 2) as 0 | 1,
    }));
    expect(realisedInformationGainBits(flat)).toBe(0);
  });

  it("matches a hand-computed value for a 90%-confident 9-from-10 book", () => {
    const book: EdgeCandidate[] = Array.from({ length: 10 }, (_, i) => ({
      p: 0.9,
      y: (i === 0 ? 0 : 1) as 0 | 1,
    }));
    expect(realisedInformationGainBits(book)).toBeCloseTo(0.531004, 5);
  });

  it("returns 0 for empty input and skips unsettled entries", () => {
    expect(realisedInformationGainBits([])).toBe(0);
    expect(realisedInformationGainBits([{ p: 0.9 }, { p: 0.8 }])).toBe(0);
  });

  it("handles n=1 on both bases", () => {
    expect(realisedEdgeBits(0.9, 1)).toBeCloseTo(1 - 0.152003, 5);
    expect(realisedEdgeBits(0.9, 0)).toBeCloseTo(1 - 3.321928, 5);
    expect(realisedInformationGainBits([{ p: 0.9, y: 1 }])).toBeCloseTo(0.847997, 5);
  });
});

describe("empiricalBaseRate", () => {
  it("counts settled outcomes only and falls back to 0.5", () => {
    expect(empiricalBaseRate(informativeBook(60))).toBe(0.5);
    expect(empiricalBaseRate([{ p: 0.7, y: 1 }, { p: 0.4, y: 1 }, { p: 0.2 }])).toBe(1);
    expect(empiricalBaseRate([])).toBe(0.5);
    expect(empiricalBaseRate([{ p: 0.7 }])).toBe(0.5);
  });

  it("applies the SAME usability filter as the gain functions", () => {
    // A settled sample with an unusable p is scored by neither gain function, so it
    // must not move the base rate either.
    const withGarbage: EdgeCandidate[] = [
      { p: NaN, y: 1 },
      { p: 4, y: 1 },
      { p: 0.5, y: 1 },
      { p: 0.5, y: 0 },
    ];
    expect(empiricalBaseRate(withGarbage)).toBe(0.5);
    expect(empiricalBaseRate([{ p: NaN, y: 1 }, { p: -2, y: 0 }])).toBe(0.5); // nothing usable
  });

  it("keeps the mutual-information identity exact when garbage is present", () => {
    // H(Y) - H(Y|P) must be exactly 0 for a book whose usable half is a coin flip
    // forecast at the coin-flip rate. If the base rate were computed over a wider
    // set than the cross-entropy, the two halves of the subtraction would disagree.
    const withGarbage: EdgeCandidate[] = [
      { p: NaN, y: 1 },
      { p: NaN, y: 1 },
      { p: 0.5, y: 1 },
      { p: 0.5, y: 0 },
    ];
    const baseRate = empiricalBaseRate(withGarbage);
    expect(realisedInformationGainBits(withGarbage, { baseRate })).toBe(0);

    // Same identity on a genuinely skewed book: p == the empirical rate everywhere
    // carries zero information about which pick wins.
    const skewed: EdgeCandidate[] = [
      { p: 7, y: 1 },
      ...Array.from({ length: 10 }, (_, i) => ({ p: 0.8, y: (i < 8 ? 1 : 0) as 0 | 1 })),
    ];
    expect(empiricalBaseRate(skewed)).toBe(0.8);
    expect(
      realisedInformationGainBits(skewed, { baseRate: empiricalBaseRate(skewed) }),
    ).toBeCloseTo(0, 12);
  });
});

describe("gateInformationEdge", () => {
  it("defaults to a 0.02 bit/prediction threshold", () => {
    const verdict = gateInformationEdge([{ p: 0.9, y: 1 }]);
    expect(verdict.threshold).toBe(DEFAULT_INFORMATION_EDGE_THRESHOLD_BITS);
    expect(verdict.threshold).toBe(0.02);
  });

  it("auto-selects the realised basis only when every usable pick has settled", () => {
    expect(gateInformationEdge(informativeBook(20)).basis).toBe("realised");
    expect(gateInformationEdge([{ p: 0.8, y: 1 }, { p: 0.7 }]).basis).toBe("prior");
    expect(gateInformationEdge([]).basis).toBe("prior");
  });

  it("honours an explicit realised basis on unsettled input rather than downgrading", () => {
    const verdict = gateInformationEdge([{ p: 0.9 }, { p: 0.8 }], { basis: "realised" });
    expect(verdict.basis).toBe("realised");
    expect(verdict.n).toBe(0);
    expect(verdict.eligible).toBe(false);
    expect(verdict.reason).toContain("realised bits require outcomes");
  });

  it("flips eligibility exactly around the threshold (prior basis)", () => {
    const slate: EdgeCandidate[] = Array.from({ length: 12 }, () => ({ p: 0.65 }));
    const bits = priorOnlyInformationGainBits(slate); // ≈ 0.065934

    const below = gateInformationEdge(slate, { basis: "prior", thresholdBits: bits - 1e-9 });
    const exact = gateInformationEdge(slate, { basis: "prior", thresholdBits: bits });
    const above = gateInformationEdge(slate, { basis: "prior", thresholdBits: bits + 1e-9 });

    expect(below.eligible).toBe(true);
    expect(exact.eligible).toBe(true); // gate is >= threshold
    expect(above.eligible).toBe(false);
    expect(above.reason).toContain("Do not publish");
  });

  it("flips eligibility exactly around the threshold (realised basis)", () => {
    const book = informativeBook(60);
    const bits = realisedInformationGainBits(book);
    expect(gateInformationEdge(book, { thresholdBits: bits }).eligible).toBe(true);
    expect(gateInformationEdge(book, { thresholdBits: bits + 1e-9 }).eligible).toBe(false);
  });

  it("rejects a flat 55% book at the default threshold but a 65% book clears it", () => {
    const at55: EdgeCandidate[] = Array.from({ length: 30 }, () => ({ p: 0.55 }));
    const at65: EdgeCandidate[] = Array.from({ length: 30 }, () => ({ p: 0.65 }));
    expect(gateInformationEdge(at55, { basis: "prior" }).eligible).toBe(false);
    expect(gateInformationEdge(at65, { basis: "prior" }).eligible).toBe(true);
  });

  it("labels a prior-basis pass as confidence, not edge", () => {
    const verdict = gateInformationEdge(confidentAndWrong(40), { basis: "prior" });
    expect(verdict.eligible).toBe(true);
    expect(verdict.bits).toBe(1);
    expect(verdict.reason).toContain("PRIOR-ONLY");
    expect(verdict.reason).toContain("NOT evidence of edge");
  });

  it("refuses the same slate on the realised basis and says why", () => {
    const verdict = gateInformationEdge(confidentAndWrong(40));
    expect(verdict.basis).toBe("realised");
    expect(verdict.eligible).toBe(false);
    expect(verdict.bits).toBeLessThan(-15);
    expect(verdict.reason).toContain("NEGATIVE");
  });

  it("handles empty input", () => {
    const verdict = gateInformationEdge([]);
    expect(verdict.n).toBe(0);
    expect(verdict.bits).toBe(0);
    expect(verdict.eligible).toBe(false);
    expect(verdict.reason).toContain("n=0");
    expect(verdict.status).toBe("shadow");
    expect(verdict.priced).toBe(false);
  });

  it("marks a threshold-clearing but under-powered book as provisional", () => {
    const thin = gateInformationEdge([{ p: 0.9, y: 1 }]);
    expect(thin.n).toBe(1);
    expect(thin.eligible).toBe(true);
    expect(thin.bits * thin.n).toBeLessThan(DETECTABILITY_TOTAL_BITS);
    expect(thin.reason).toContain("provisional");

    const powered = gateInformationEdge(informativeBook(60));
    expect(powered.eligible).toBe(true);
    expect(powered.bits * powered.n).toBeGreaterThan(DETECTABILITY_TOTAL_BITS);
    expect(powered.reason).toContain("distinguishable from zero");
  });

  it("enforces minSamples", () => {
    const verdict = gateInformationEdge(informativeBook(10), { minSamples: 25 });
    expect(verdict.n).toBe(10);
    expect(verdict.eligible).toBe(false);
    expect(verdict.reason).toContain("minSamples=25");
  });

  it("excludes unusable entries from n", () => {
    const verdict = gateInformationEdge(
      [{ p: 0.8, y: 1 }, { p: NaN, y: 1 }, { p: 3, y: 0 }, { p: 0.2, y: 0 }],
      { basis: "realised" },
    );
    expect(verdict.n).toBe(2);
  });

  it("reports the resolved base rate and falls back on nonsense", () => {
    expect(gateInformationEdge([{ p: 0.6, y: 1 }], { baseRate: 0.4 }).baseRate).toBe(0.4);
    expect(gateInformationEdge([{ p: 0.6, y: 1 }], { baseRate: 9 }).baseRate).toBe(0.5);
    expect(gateInformationEdge([{ p: 0.6, y: 1 }], { baseRate: NaN }).baseRate).toBe(0.5);
    expect(gateInformationEdge([{ p: 0.6, y: 1 }], { thresholdBits: NaN }).threshold).toBe(0.02);
  });

  it("plumbs probabilityFloor all the way through to the realised bits", () => {
    // A confident miss must cost exactly -log2(floor), so raising the floor must
    // make the penalty smaller by exactly the difference of the two logs.
    const miss: EdgeCandidate[] = [{ p: 1, y: 0 }];
    const strict = gateInformationEdge(miss, { probabilityFloor: 1e-6 }).bits;
    const lenient = gateInformationEdge(miss, { probabilityFloor: 1e-2 }).bits;
    expect(strict).toBeCloseTo(1 - Math.log2(1e6), 9);
    expect(lenient).toBeCloseTo(1 - Math.log2(1e2), 9);
    expect(lenient - strict).toBeCloseTo(Math.log2(1e6) - Math.log2(1e2), 9);
    // an out-of-range floor must fall back, not be honoured
    expect(gateInformationEdge(miss, { probabilityFloor: 0.9 }).bits).toBe(strict);
  });

  it("handles degenerate base rates of 0 and 1 without NaN", () => {
    for (const baseRate of [0, 1]) {
      const verdict = gateInformationEdge([{ p: 0.9, y: 1 }], { baseRate });
      expect(verdict.baseRate).toBe(baseRate);
      // H(0) = H(1) = 0, so the gain is just the negated cross-entropy
      expect(verdict.bits).toBeCloseTo(-0.152003, 5);
      expect(Number.isNaN(verdict.bits)).toBe(false);
      expect(verdict.eligible).toBe(false);
    }
  });

  it("GATE SAFETY: a single unsettled pick silently downgrades a settled book to the GAMEABLE basis", () => {
    // Auto-basis is all-or-nothing. Adding ONE unsettled pick to a fully settled
    // book flips `basis` from realised to prior while `eligible` stays true — so
    // `eligible` means two different things depending on a field callers may not
    // read. The loud reason text is the only guardrail; pin it.
    const settledOnly = gateInformationEdge(informativeBook(40));
    expect(settledOnly.basis).toBe("realised");
    expect(settledOnly.eligible).toBe(true);

    const withOneUnsettled = gateInformationEdge([...informativeBook(40), { p: 0.99 }]);
    expect(withOneUnsettled.basis).toBe("prior");
    expect(withOneUnsettled.n).toBe(41);
    expect(withOneUnsettled.eligible).toBe(true);
    expect(withOneUnsettled.reason).toContain("CONFIDENCE, not accuracy");
    expect(withOneUnsettled.reason).toContain("NOT evidence of edge");
    // and the two verdicts are genuinely different numbers, not a relabelling
    expect(withOneUnsettled.bits).not.toBeCloseTo(settledOnly.bits, 6);
  });

  it("does not mutate its input", () => {
    const book = informativeBook(20);
    const snapshot = JSON.stringify(book);
    gateInformationEdge(book);
    gateInformationEdge(book, { basis: "prior" });
    expect(JSON.stringify(book)).toBe(snapshot);
  });
});

describe("DETECTABILITY_TOTAL_BITS", () => {
  it("is chi-squared_1(0.95) / (2 ln 2) ~= 2.7710 total bits", () => {
    expect(DETECTABILITY_TOTAL_BITS).toBeCloseTo(2.771, 3);
    expect(DETECTABILITY_TOTAL_BITS).toBeCloseTo(3.841458820694124 / (2 * Math.LN2), 12);
    // the doc's two anchors: ~100 settled => 0.028 bits/pick, ~140 => 0.020
    expect(DETECTABILITY_TOTAL_BITS / 100).toBeCloseTo(0.0277, 4);
    expect(DETECTABILITY_TOTAL_BITS / 140).toBeCloseTo(0.0198, 4);
  });
});

describe("permutationNullBandBits", () => {
  it("is deterministic under a fixed seed and varies with the seed", () => {
    const book = informativeBook(60);
    const a = permutationNullBandBits(book, { seed: 7, permutations: 120 });
    const b = permutationNullBandBits(book, { seed: 7, permutations: 120 });
    expect(a).toEqual(b);

    const c = permutationNullBandBits(book, { seed: 99, permutations: 120 });
    expect(c.observedBits).toBe(a.observedBits);
    expect(c.meanNullBits).not.toBe(a.meanNullBits);
  });

  it("places a genuinely informative book above its permuted null", () => {
    const band = permutationNullBandBits(informativeBook(60), { seed: 3, permutations: 200 });
    expect(band.n).toBe(60);
    expect(band.permutations).toBe(200);
    expect(band.observedBits).toBeCloseTo(0.278073, 5);
    expect(band.meanNullBits).toBeLessThan(0);
    expect(band.exceedsNull).toBe(true);
    expect(band.pValue).toBeCloseTo(1 / 201, 6);
    expect(band.status).toBe("shadow");
    expect(band.priced).toBe(false);
  });

  it("does not clear its null for a confidently wrong book", () => {
    const band = permutationNullBandBits(confidentAndWrong(40), { seed: 5, permutations: 100 });
    expect(band.observedBits).toBeLessThan(-15);
    expect(band.exceedsNull).toBe(false);
    // A perfectly anti-correlated book sits at the exact MINIMUM of the null
    // support, so every single replica is >= observed and the p-value is exactly 1.
    expect(band.pValue).toBe(1);
    expect(band.meanNullBits).toBeGreaterThan(band.observedBits);
    expect(band.meanNullBits).toBeCloseTo(1 - 19.9316 / 2, 1);
  });

  // ── The p/y book below has a closed-form null, which lets these tests check the
  // SHUFFLE ITSELF rather than just eyeballing the summary numbers.
  //
  // informativeBook(60) is 30 forecasts at p=0.8 and 30 at p=0.2, with exactly 30
  // wins and 30 losses. If k of the p=0.8 slots receive a win, then
  //   totalCE(k) = 2k*(-log2 0.8) + 2(30-k)*(-log2 0.2)
  //   bits(k)    = 1 - totalCE(k)/60 = -1.3219280948873620 + k/15
  // so EVERY legitimate replica must land on that 31-point lattice. A shuffle that
  // dropped, duplicated or invented an outcome would land between lattice points.
  const LATTICE_BASE = 1 - -Math.log2(0.2); // bits(0) = -1.3219280948873623
  const latticeK = (bits: number): number => (bits - LATTICE_BASE) * 15;

  it("its permuted replicas preserve the outcome multiset exactly", () => {
    const band = permutationNullBandBits(informativeBook(60), { seed: 3, permutations: 200 });

    // observed pairing: 24 of the 30 p=0.8 slots won
    expect(latticeK(band.observedBits)).toBeCloseTo(24, 9);

    // the reported p95 is a real replica, so it must sit on the lattice too
    const k95 = latticeK(band.p95NullBits);
    expect(k95).toBeCloseTo(Math.round(k95), 9);
    expect(Number.isInteger(Math.round(k95))).toBe(true);
    expect(Math.round(k95)).toBeGreaterThanOrEqual(0);
    expect(Math.round(k95)).toBeLessThanOrEqual(30);
  });

  it("centres the null on its analytic expectation (catches a biased shuffle)", () => {
    // Under a uniform shuffle k is hypergeometric with E[k] = 15, so
    // E[bits] = H(0.5) - mean_i CE(p_i, ybar) = 1 - 1.3219280948873623 = -0.3219281.
    // sd(bits) = 0.1302, so over 200 replicas the mean sits within ~0.03 of it.
    const band = permutationNullBandBits(informativeBook(60), { seed: 3, permutations: 200 });
    const analyticCentre = 1 - (0.5 * -Math.log2(0.8) + 0.5 * -Math.log2(0.2));
    expect(analyticCentre).toBeCloseTo(-0.3219281, 6);
    expect(band.meanNullBits).toBeCloseTo(analyticCentre, 1);
    expect(latticeK(band.meanNullBits)).toBeCloseTo(15, 0);

    // A shuffle biased toward the identity would drag the mean up toward the
    // observed value; assert it stays far below it.
    expect(band.meanNullBits).toBeLessThan(band.observedBits - 0.5);
  });

  it("puts p95 at the correct tail: above the mean, below the observed, inside the support", () => {
    const band = permutationNullBandBits(informativeBook(60), { seed: 3, permutations: 200 });
    expect(band.p95NullBits).toBeGreaterThan(band.meanNullBits);
    expect(band.p95NullBits).toBeLessThan(band.observedBits);
    // support is [bits(0), bits(30)] = [-1.32193, 0.67807]
    expect(band.p95NullBits).toBeGreaterThanOrEqual(LATTICE_BASE);
    expect(band.p95NullBits).toBeLessThanOrEqual(LATTICE_BASE + 2);
  });

  it("pins the p95 ORDER STATISTIC index itself", () => {
    // The two-value book above CANNOT pin the index: its null has only 31 distinct
    // values, so sorted[189] and sorted[190] tie and an off-by-one is invisible.
    // This book has 40 distinct forecasts, so the null is effectively continuous and
    // adjacent order statistics separate.
    const continuousBook: EdgeCandidate[] = Array.from({ length: 40 }, (_, i) => ({
      p: 0.05 + i * 0.0225,
      y: (i % 3 === 0 ? 0 : 1) as 0 | 1,
    }));

    // permutations=20 => ceil(0.95*20)-1 = 18, the 19th of 20. Dropping the -1
    // picks the 20th (the maximum) and moves this to +0.00901837253076343.
    expect(
      permutationNullBandBits(continuousBook, { seed: 3, permutations: 20 }).p95NullBits,
    ).toBeCloseTo(-0.04642393878788287, 12);

    // permutations=137 => 0.95*137 = 130.15 is NOT an integer, which is what
    // separates ceil from floor/round. floor/round give -0.05559553452242039.
    expect(
      permutationNullBandBits(continuousBook, { seed: 3, permutations: 137 }).p95NullBits,
    ).toBeCloseTo(-0.04822950466317111, 12);
  });

  it("DEGENERATE: a constant-probability book can never exceed its own null", () => {
    // Every forecast identical => permuting outcomes cannot change the (p, y)
    // multiset, so observed and every replica are analytically EQUAL and differ
    // only by float summation order. A bare `>` would let that noise decide
    // significance; the tie margin must refuse it, for every seed.
    for (let seed = 1; seed <= 25; seed++) {
      const flat: EdgeCandidate[] = Array.from({ length: 21 }, (_, i) => ({
        p: 0.73,
        y: (i % 3 === 0 ? 0 : 1) as 0 | 1,
      }));
      const band = permutationNullBandBits(flat, { seed, permutations: 40 });
      expect(band.exceedsNull).toBe(false);
      expect(band.pValue).toBe(1);
      expect(band.meanNullBits).toBeCloseTo(band.observedBits, 10);
    }
  });

  it("DEGENERATE: a book with only one outcome value can never exceed its own null", () => {
    const allWins: EdgeCandidate[] = Array.from({ length: 12 }, (_, i) => ({
      p: 0.5 + i * 0.02,
      y: 1 as const,
    }));
    const band = permutationNullBandBits(allWins, { seed: 8, permutations: 50 });
    expect(band.observedBits).toBeGreaterThan(0); // it does clear a bits threshold...
    expect(band.exceedsNull).toBe(false); // ...but carries no detectable association
    expect(band.pValue).toBe(1);
  });

  it("the null centre is NOT always <= 0 — it tracks the option baseRate", () => {
    // 18/20 wins forecast at a flat 0.9, judged against the DEFAULT 0.5 base rate.
    // Null centre = H(0.5) - [0.9*-log2(0.9) + 0.1*-log2(0.1)] = +0.531, strictly
    // positive. Reading meanNullBits as a signed verdict would be wrong here.
    const skewed: EdgeCandidate[] = Array.from({ length: 20 }, (_, i) => ({
      p: 0.9,
      y: (i < 18 ? 1 : 0) as 0 | 1,
    }));
    const band = permutationNullBandBits(skewed, { seed: 4, permutations: 200 });
    expect(band.meanNullBits).toBeGreaterThan(0);
    expect(band.meanNullBits).toBeCloseTo(0.531004, 5);
    expect(band.exceedsNull).toBe(false);

    // Re-judged against its OWN empirical rate the centre collapses to 0 (Gibbs:
    // the centre is H(ybar) - mean_i CE(p_i, ybar) <= 0, with equality iff p == ybar,
    // which is exactly this book). Analytically 0; float summation lands ~1e-17 off.
    const centred = permutationNullBandBits(skewed, {
      seed: 4,
      permutations: 200,
      baseRate: empiricalBaseRate(skewed),
    });
    expect(centred.meanNullBits).toBeCloseTo(0, 12);
    expect(centred.meanNullBits).toBeLessThan(band.meanNullBits - 0.5);
  });

  it("re-centred on its own empirical rate, the null centre is STRICTLY negative when p != ybar", () => {
    // Gibbs with a book that actually discriminates: p in {0.8, 0.2}, ybar = 0.5,
    // so the centre is 1 - 1.3219281 = -0.3219281, strictly below zero.
    const book = informativeBook(60);
    const band = permutationNullBandBits(book, {
      seed: 6,
      permutations: 200,
      baseRate: empiricalBaseRate(book),
    });
    expect(empiricalBaseRate(book)).toBe(0.5);
    expect(band.meanNullBits).toBeLessThan(-0.25);
    expect(band.meanNullBits).toBeCloseTo(-0.3219281, 1);
  });

  it("does not mutate its input", () => {
    const book = informativeBook(20);
    const snapshot = JSON.stringify(book);
    permutationNullBandBits(book, { seed: 11, permutations: 50 });
    expect(JSON.stringify(book)).toBe(snapshot);
  });

  it("resolves permutations and seed defensively", () => {
    const book = informativeBook(20);
    expect(permutationNullBandBits(book, { permutations: 0 }).permutations).toBe(200);
    expect(permutationNullBandBits(book, { permutations: -5 }).permutations).toBe(200);
    expect(permutationNullBandBits(book, { permutations: 2.5 }).permutations).toBe(200);
    expect(permutationNullBandBits(book, { permutations: NaN }).permutations).toBe(200);
    expect(permutationNullBandBits(book, { seed: 1.5 }).seed).toBe(1);
    expect(permutationNullBandBits(book).seed).toBe(1);
  });

  it("degrades safely below two settled samples", () => {
    const band = permutationNullBandBits([{ p: 0.9, y: 1 }], { seed: 2 });
    expect(band.n).toBe(1);
    expect(band.permutations).toBe(0);
    expect(band.observedBits).toBeCloseTo(0.847997, 5);
    expect(Number.isNaN(band.meanNullBits)).toBe(true);
    expect(Number.isNaN(band.p95NullBits)).toBe(true);
    expect(band.exceedsNull).toBe(false);

    const empty = permutationNullBandBits([], { seed: 2 });
    expect(empty.n).toBe(0);
    expect(empty.observedBits).toBe(0);
    expect(empty.exceedsNull).toBe(false);
  });
});
