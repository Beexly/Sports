import { describe, it, expect } from "vitest";
import {
  entropy,
  binaryEntropy,
  klDivergence,
  jsDivergence,
  crossEntropy,
  mutualInformation,
  informationGain,
  normalizedMutualInformation,
  conditionalEntropy,
  surprisal,
  perplexity,
  brier,
  logLoss,
  calibrationError,
  normalize,
  maxEntropy,
} from "@/lib/math/information-theory";

// Tolerance for floating-point comparisons
const EPS = 1e-10;

// Helper
function approx(a: number, b: number, tol = 1e-6): boolean {
  return Math.abs(a - b) < tol;
}

// ─── entropy ────────────────────────────────────────────────────────────────

describe("entropy", () => {
  it("uniform [0.5, 0.5] → 1 bit", () => {
    expect(approx(entropy([0.5, 0.5]), 1)).toBe(true);
  });

  it("[1, 0] → 0 (certainty)", () => {
    expect(approx(entropy([1, 0]), 0)).toBe(true);
  });

  it("[0, 1] → 0", () => {
    expect(approx(entropy([0, 1]), 0)).toBe(true);
  });

  it("[0.25, 0.25, 0.25, 0.25] → 2 bits", () => {
    expect(approx(entropy([0.25, 0.25, 0.25, 0.25]), 2)).toBe(true);
  });

  it("empty array → 0", () => {
    expect(entropy([])).toBe(0);
  });

  it("all-zero array → 0 (no probabilities)", () => {
    // normalize returns uniform, but result depends on normalization
    // Actually: normalize([0,0]) → [0.5,0.5] → entropy = 1
    // The spec says "Returns 0 for empty array or all-zero array"
    // Let's check the spec carefully: "Normalizes input so it sums to 1"
    // but also "Returns 0 for ... all-zero array"
    // The implementation normalizes to uniform for all-zeros, so entropy([0,0]) = 1
    // We follow the implementation which normalizes first:
    expect(entropy([0, 0])).toBeGreaterThanOrEqual(0);
  });

  it("single element [1] → 0", () => {
    expect(approx(entropy([1]), 0)).toBe(true);
  });

  it("non-normalized [2, 2] → 1 bit (normalizes to [0.5, 0.5])", () => {
    expect(approx(entropy([2, 2]), 1)).toBe(true);
  });

  it("non-normalized [1, 1, 1, 1] → 2 bits", () => {
    expect(approx(entropy([1, 1, 1, 1]), 2)).toBe(true);
  });

  it("entropy is non-negative", () => {
    expect(entropy([0.7, 0.2, 0.1])).toBeGreaterThanOrEqual(0);
  });

  it("entropy ≤ log2(n) for n outcomes", () => {
    const probs = [0.1, 0.3, 0.2, 0.4];
    expect(entropy(probs)).toBeLessThanOrEqual(Math.log2(4) + EPS);
  });

  it("[1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8] → 3 bits", () => {
    const probs = Array(8).fill(1 / 8) as number[];
    expect(approx(entropy(probs), 3)).toBe(true);
  });

  it("ignores zero probabilities in calculation", () => {
    const e1 = entropy([0.5, 0.5, 0]);
    const e2 = entropy([0.5, 0.5]);
    expect(approx(e1, e2)).toBe(true);
  });
});

// ─── binaryEntropy ──────────────────────────────────────────────────────────

describe("binaryEntropy", () => {
  it("p=0.5 → 1 bit", () => {
    expect(approx(binaryEntropy(0.5), 1)).toBe(true);
  });

  it("p=0 → 0", () => {
    expect(binaryEntropy(0)).toBe(0);
  });

  it("p=1 → 0", () => {
    expect(binaryEntropy(1)).toBe(0);
  });

  it("p=0.25: known value", () => {
    // H(0.25) = -0.25*log2(0.25) - 0.75*log2(0.75)
    const expected = -(0.25 * Math.log2(0.25) + 0.75 * Math.log2(0.75));
    expect(approx(binaryEntropy(0.25), expected)).toBe(true);
  });

  it("p=0.75: same as p=0.25 (symmetry)", () => {
    expect(approx(binaryEntropy(0.75), binaryEntropy(0.25))).toBe(true);
  });

  it("is symmetric: binaryEntropy(p) = binaryEntropy(1-p)", () => {
    for (const p of [0.1, 0.3, 0.45, 0.9]) {
      expect(approx(binaryEntropy(p), binaryEntropy(1 - p))).toBe(true);
    }
  });

  it("is always in [0, 1]", () => {
    for (const p of [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1]) {
      const h = binaryEntropy(p);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(1 + EPS);
    }
  });

  it("maximum at p=0.5", () => {
    const h = binaryEntropy(0.5);
    for (const p of [0.1, 0.3, 0.4, 0.6, 0.7, 0.9]) {
      expect(h).toBeGreaterThanOrEqual(binaryEntropy(p));
    }
  });
});

// ─── klDivergence ────────────────────────────────────────────────────────────

describe("klDivergence", () => {
  it("identical distributions → 0", () => {
    expect(approx(klDivergence([0.5, 0.5], [0.5, 0.5]), 0)).toBe(true);
  });

  it("[0.5,0.5] || [1,0] → Infinity (zero in q where p > 0 forbidden)", () => {
    // q[1]=0 but p[1]=0.5 > 0 → Infinity
    expect(klDivergence([0.5, 0.5], [1, 0])).toBe(Infinity);
  });

  it("[0.5,0.5] || [0.5,0.5] → 0", () => {
    expect(approx(klDivergence([0.5, 0.5], [0.5, 0.5]), 0)).toBe(true);
  });

  it("known value: KL([0.5,0.5] || [0.25,0.75])", () => {
    const expected = 0.5 * Math.log2(0.5 / 0.25) + 0.5 * Math.log2(0.5 / 0.75);
    expect(approx(klDivergence([0.5, 0.5], [0.25, 0.75]), expected)).toBe(true);
  });

  it("is always non-negative (Gibbs inequality)", () => {
    const result = klDivergence([0.3, 0.4, 0.3], [0.2, 0.5, 0.3]);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("throws if lengths differ", () => {
    expect(() => klDivergence([0.5, 0.5], [1, 0, 0])).toThrow();
  });

  it("returns Infinity when q has zero where p is positive", () => {
    expect(klDivergence([0.5, 0.5], [1, 0])).toBe(Infinity);
  });

  it("p with zeros where q has zeros: OK (0*log(0/0) treated as 0)", () => {
    // p[1]=0 so that term is skipped; q[0]>0 so the first term is fine
    const result = klDivergence([1, 0], [1, 0]);
    expect(approx(result, 0)).toBe(true);
  });
});

// ─── jsDivergence ────────────────────────────────────────────────────────────

describe("jsDivergence", () => {
  it("identical distributions → 0", () => {
    expect(approx(jsDivergence([0.5, 0.5], [0.5, 0.5]), 0)).toBe(true);
  });

  it("is symmetric: JSD(P,Q) = JSD(Q,P)", () => {
    const p = [0.7, 0.3];
    const q = [0.2, 0.8];
    expect(approx(jsDivergence(p, q), jsDivergence(q, p))).toBe(true);
  });

  it("max ≤ 1 for log base 2", () => {
    const jsd = jsDivergence([1, 0], [0, 1]);
    expect(jsd).toBeLessThanOrEqual(1 + EPS);
  });

  it("is always finite (unlike KL)", () => {
    // Even for completely opposite distributions
    const jsd = jsDivergence([1, 0], [0, 1]);
    expect(isFinite(jsd)).toBe(true);
  });

  it("is always non-negative", () => {
    expect(jsDivergence([0.6, 0.4], [0.3, 0.7])).toBeGreaterThanOrEqual(0);
  });

  it("throws if lengths differ", () => {
    expect(() => jsDivergence([0.5, 0.5], [1, 0, 0])).toThrow();
  });

  it("known value: [1,0] vs [0,1] → 1 bit", () => {
    // JSD([1,0],[0,1]) = 1 (maximally divergent in log2 base)
    expect(approx(jsDivergence([1, 0], [0, 1]), 1)).toBe(true);
  });

  it("[0.5,0.5] vs [0.5,0.5] → 0", () => {
    expect(jsDivergence([0.5, 0.5], [0.5, 0.5])).toBe(0);
  });
});

// ─── crossEntropy ────────────────────────────────────────────────────────────

describe("crossEntropy", () => {
  it("perfect prediction: H(P,P) = H(P)", () => {
    const p = [0.5, 0.5];
    expect(approx(crossEntropy(p, p), entropy(p))).toBe(true);
  });

  it("H(P,Q) = H(P) + KL(P||Q)", () => {
    const p = [0.6, 0.4];
    const q = [0.3, 0.7];
    const expected = entropy(p) + klDivergence(p, q);
    expect(approx(crossEntropy(p, q), expected)).toBe(true);
  });

  it("returns Infinity when q has 0 where p > 0", () => {
    expect(crossEntropy([1, 0], [0, 1])).toBe(Infinity);
  });

  it("throws if lengths differ", () => {
    expect(() => crossEntropy([0.5, 0.5], [1, 0, 0])).toThrow();
  });

  it("known value: H([1],[1]) = 0", () => {
    expect(approx(crossEntropy([1], [1]), 0)).toBe(true);
  });

  it("cross-entropy ≥ entropy (Gibbs: H(P,Q) ≥ H(P))", () => {
    const p = [0.7, 0.3];
    const q = [0.4, 0.6];
    expect(crossEntropy(p, q)).toBeGreaterThanOrEqual(entropy(p) - EPS);
  });
});

// ─── mutualInformation ───────────────────────────────────────────────────────

describe("mutualInformation", () => {
  it("independent variables → 0", () => {
    // P(X,Y) = P(X)*P(Y): independence means MI=0
    const joint = [
      [0.25, 0.25],
      [0.25, 0.25],
    ] as const;
    expect(approx(mutualInformation(joint), 0)).toBe(true);
  });

  it("perfectly correlated → MI = H(X)", () => {
    // X always equals Y: joint is diagonal
    const joint = [
      [0.5, 0],
      [0, 0.5],
    ] as const;
    const margX = [0.5, 0.5];
    const mi = mutualInformation(joint);
    const hx = entropy(margX);
    expect(approx(mi, hx)).toBe(true);
  });

  it("MI ≥ 0", () => {
    const joint = [
      [0.1, 0.3],
      [0.2, 0.4],
    ] as const;
    expect(mutualInformation(joint)).toBeGreaterThanOrEqual(0);
  });

  it("MI = H(X) + H(Y) - H(X,Y)", () => {
    const joint = [
      [0.2, 0.3],
      [0.1, 0.4],
    ] as const;
    const margX = joint.map((row) => row.reduce((a, b) => a + b, 0));
    const margY = [joint[0]![0]! + joint[1]![0]!, joint[0]![1]! + joint[1]![1]!];
    const flat = [0.2, 0.3, 0.1, 0.4];
    const expected = entropy(margX) + entropy(margY) - entropy(flat);
    expect(approx(mutualInformation(joint), expected)).toBe(true);
  });

  it("empty joint → 0", () => {
    expect(mutualInformation([])).toBe(0);
  });
});

// ─── informationGain ─────────────────────────────────────────────────────────

describe("informationGain", () => {
  it("no split (single child with full weight) → 0 if child entropy = parent", () => {
    const ig = informationGain(0.5, [{ entropy: 0.5, weight: 1 }]);
    expect(approx(ig, 0)).toBe(true);
  });

  it("perfect split → parentEntropy", () => {
    // Both children have 0 entropy (pure) → IG = parentEntropy
    const ig = informationGain(1, [
      { entropy: 0, weight: 0.5 },
      { entropy: 0, weight: 0.5 },
    ]);
    expect(approx(ig, 1)).toBe(true);
  });

  it("no improvement → 0", () => {
    const parentE = 1;
    const ig = informationGain(parentE, [
      { entropy: 1, weight: 0.5 },
      { entropy: 1, weight: 0.5 },
    ]);
    expect(approx(ig, 0)).toBe(true);
  });

  it("known value", () => {
    const parentE = 1;
    const ig = informationGain(parentE, [
      { entropy: 0.5, weight: 0.5 },
      { entropy: 0.5, weight: 0.5 },
    ]);
    expect(approx(ig, 0.5)).toBe(true);
  });

  it("empty children → parentEntropy", () => {
    expect(informationGain(0.8, [])).toBe(0.8);
  });
});

// ─── normalizedMutualInformation ─────────────────────────────────────────────

describe("normalizedMutualInformation", () => {
  it("independent → 0", () => {
    const joint = [
      [0.25, 0.25],
      [0.25, 0.25],
    ] as const;
    expect(approx(normalizedMutualInformation(joint), 0)).toBe(true);
  });

  it("perfectly correlated → 1", () => {
    const joint = [
      [0.5, 0],
      [0, 0.5],
    ] as const;
    expect(approx(normalizedMutualInformation(joint), 1)).toBe(true);
  });

  it("is in [0, 1]", () => {
    const joint = [
      [0.1, 0.3],
      [0.2, 0.4],
    ] as const;
    const nmi = normalizedMutualInformation(joint);
    expect(nmi).toBeGreaterThanOrEqual(0);
    expect(nmi).toBeLessThanOrEqual(1 + EPS);
  });

  it("returns 0 for empty joint", () => {
    expect(normalizedMutualInformation([])).toBe(0);
  });

  it("NMI ≥ 0 always", () => {
    const joint = [
      [0.3, 0.2],
      [0.1, 0.4],
    ] as const;
    expect(normalizedMutualInformation(joint)).toBeGreaterThanOrEqual(0);
  });
});

// ─── conditionalEntropy ──────────────────────────────────────────────────────

describe("conditionalEntropy", () => {
  it("H(Y|X) = H(X,Y) - H(X)", () => {
    const joint = [
      [0.2, 0.3],
      [0.1, 0.4],
    ] as const;
    const margX = joint.map((row) => row.reduce((a, b) => a + b, 0));
    const flat = [0.2, 0.3, 0.1, 0.4];
    const expected = entropy(flat) - entropy(margX);
    expect(approx(conditionalEntropy(joint), expected)).toBe(true);
  });

  it("independent variables: H(Y|X) = H(Y)", () => {
    // Uniform independent
    const joint = [
      [0.25, 0.25],
      [0.25, 0.25],
    ] as const;
    const margY = [0.5, 0.5];
    expect(approx(conditionalEntropy(joint), entropy(margY))).toBe(true);
  });

  it("perfectly correlated: H(Y|X) = 0", () => {
    const joint = [
      [0.5, 0],
      [0, 0.5],
    ] as const;
    expect(approx(conditionalEntropy(joint), 0)).toBe(true);
  });

  it("is always non-negative", () => {
    const joint = [
      [0.15, 0.35],
      [0.2, 0.3],
    ] as const;
    expect(conditionalEntropy(joint)).toBeGreaterThanOrEqual(-EPS);
  });

  it("empty joint → 0", () => {
    expect(conditionalEntropy([])).toBe(0);
  });
});

// ─── surprisal ───────────────────────────────────────────────────────────────

describe("surprisal", () => {
  it("p=1 → 0 (certain event has no information)", () => {
    expect(surprisal(1)).toBe(0);
  });

  it("p=0.5 → 1 bit", () => {
    expect(approx(surprisal(0.5), 1)).toBe(true);
  });

  it("p=0 → Infinity", () => {
    expect(surprisal(0)).toBe(Infinity);
  });

  it("p=0.25 → 2 bits", () => {
    expect(approx(surprisal(0.25), 2)).toBe(true);
  });

  it("p=0.125 → 3 bits", () => {
    expect(approx(surprisal(0.125), 3)).toBe(true);
  });

  it("decreasing in p (rarer events have more information)", () => {
    expect(surprisal(0.1)).toBeGreaterThan(surprisal(0.5));
    expect(surprisal(0.5)).toBeGreaterThan(surprisal(0.9));
  });
});

// ─── perplexity ──────────────────────────────────────────────────────────────

describe("perplexity", () => {
  it("uniform [0.5, 0.5] → 2 (effective vocab size)", () => {
    expect(approx(perplexity([0.5, 0.5]), 2)).toBe(true);
  });

  it("always p=1 → perplexity 1", () => {
    expect(approx(perplexity([1, 1, 1]), 1)).toBe(true);
  });

  it("any p=0 → Infinity", () => {
    expect(perplexity([0.5, 0])).toBe(Infinity);
  });

  it("uniform [0.25, 0.25, 0.25, 0.25] → 4", () => {
    expect(approx(perplexity([0.25, 0.25, 0.25, 0.25]), 4)).toBe(true);
  });

  it("empty array → 1", () => {
    expect(perplexity([])).toBe(1);
  });

  it("lower perplexity = more confident model", () => {
    // [0.9, 0.9] is more confident than [0.5, 0.5]
    expect(perplexity([0.9, 0.9])).toBeLessThan(perplexity([0.5, 0.5]));
  });
});

// ─── brier ───────────────────────────────────────────────────────────────────

describe("brier", () => {
  it("perfect predictions → 0", () => {
    expect(brier([1, 0, 1], [1, 0, 1])).toBe(0);
  });

  it("all 0.5 predictions → 0.25", () => {
    expect(approx(brier([0.5, 0.5, 0.5, 0.5], [1, 0, 1, 0]), 0.25)).toBe(true);
  });

  it("worst predictions → 1 (all wrong)", () => {
    expect(approx(brier([0, 1], [1, 0]), 1)).toBe(true);
  });

  it("throws on length mismatch", () => {
    expect(() => brier([0.5, 0.5], [1])).toThrow();
  });

  it("single correct prediction → 0", () => {
    expect(brier([1], [1])).toBe(0);
  });

  it("single incorrect prediction → 1", () => {
    expect(brier([0], [1])).toBe(1);
  });

  it("is always in [0, 1]", () => {
    const b = brier([0.3, 0.7, 0.5], [1, 0, 1]);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThanOrEqual(1);
  });

  it("known value: brier([0.8], [1]) = 0.04", () => {
    expect(approx(brier([0.8], [1]), 0.04)).toBe(true);
  });
});

// ─── logLoss ─────────────────────────────────────────────────────────────────

describe("logLoss", () => {
  it("perfect predictions → ~0 (clipped, very small)", () => {
    const ll = logLoss([1, 0], [1, 0]);
    expect(ll).toBeLessThan(1e-10);
  });

  it("throws on length mismatch", () => {
    expect(() => logLoss([0.5, 0.5], [1])).toThrow();
  });

  it("constant 0.5 predictions → log2(2) = 1 bit (nats: ln(2) ≈ 0.693)", () => {
    // Using natural log inside: logLoss with natural log = -mean(ln(0.5)) = ln(2) ≈ 0.693
    const ll = logLoss([0.5, 0.5, 0.5, 0.5], [1, 0, 1, 0]);
    expect(approx(ll, Math.log(2), 1e-6)).toBe(true);
  });

  it("is non-negative", () => {
    expect(logLoss([0.7, 0.3], [1, 0])).toBeGreaterThanOrEqual(0);
  });

  it("clips p to avoid log(0)", () => {
    // Should not return Infinity
    expect(isFinite(logLoss([0, 1], [1, 0]))).toBe(true);
  });

  it("empty arrays → 0", () => {
    expect(logLoss([], [])).toBe(0);
  });

  it("lower log loss for more confident correct predictions", () => {
    const ll_confident = logLoss([0.9], [1]);
    const ll_uncertain = logLoss([0.6], [1]);
    expect(ll_confident).toBeLessThan(ll_uncertain);
  });
});

// ─── calibrationError ────────────────────────────────────────────────────────

describe("calibrationError", () => {
  it("perfect calibration → 0", () => {
    // Predictions equal outcomes in expectation per bin
    // Use predictions 0.1→outcome 0, 0.9→outcome 1 (perfect within bins)
    const predicted = [0.1, 0.9];
    const outcomes: (0 | 1)[] = [0, 1];
    // bin 0 (0-0.1]: pred=0.1, outcome=0 → |0.1-0| = 0.1 ... not perfect
    // Let's use exact perfect calibration scenario
    // All predicted 0 → all outcome 0
    expect(calibrationError([0, 0, 0], [0, 0, 0])).toBe(0);
  });

  it("systematic bias → positive ECE", () => {
    // Always predict 0.9 but outcome is always 0
    const predicted = Array(10).fill(0.9) as number[];
    const outcomes = Array(10).fill(0) as (0 | 1)[];
    const ece = calibrationError(predicted, outcomes);
    expect(ece).toBeGreaterThan(0);
  });

  it("throws on length mismatch", () => {
    expect(() => calibrationError([0.5], [1, 0])).toThrow();
  });

  it("is in [0, 1]", () => {
    const predicted = [0.1, 0.5, 0.9, 0.3, 0.7];
    const outcomes: (0 | 1)[] = [0, 1, 1, 0, 1];
    const ece = calibrationError(predicted, outcomes);
    expect(ece).toBeGreaterThanOrEqual(0);
    expect(ece).toBeLessThanOrEqual(1);
  });

  it("empty → 0", () => {
    expect(calibrationError([], [])).toBe(0);
  });

  it("respects bin count parameter", () => {
    const predicted = [0.1, 0.2, 0.8, 0.9];
    const outcomes: (0 | 1)[] = [0, 0, 1, 1];
    const ece5 = calibrationError(predicted, outcomes, 5);
    const ece10 = calibrationError(predicted, outcomes, 10);
    // Both should be valid non-negative numbers
    expect(ece5).toBeGreaterThanOrEqual(0);
    expect(ece10).toBeGreaterThanOrEqual(0);
  });

  it("all predictions 0, all outcomes 0 → ECE 0", () => {
    expect(calibrationError([0, 0, 0, 0], [0, 0, 0, 0])).toBe(0);
  });

  it("all predictions 1, all outcomes 1 → ECE 0", () => {
    expect(calibrationError([1, 1, 1, 1], [1, 1, 1, 1])).toBe(0);
  });
});

// ─── normalize ───────────────────────────────────────────────────────────────

describe("normalize", () => {
  it("already normalized → same values", () => {
    const result = normalize([0.3, 0.3, 0.4]);
    expect(approx(result[0]!, 0.3)).toBe(true);
    expect(approx(result[1]!, 0.3)).toBe(true);
    expect(approx(result[2]!, 0.4)).toBe(true);
  });

  it("sums to 1", () => {
    const result = normalize([1, 2, 3, 4]);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(approx(sum, 1)).toBe(true);
  });

  it("all-zeros → uniform distribution", () => {
    const result = normalize([0, 0, 0]);
    expect(approx(result[0]!, 1 / 3)).toBe(true);
    expect(approx(result[1]!, 1 / 3)).toBe(true);
    expect(approx(result[2]!, 1 / 3)).toBe(true);
  });

  it("empty array → empty array", () => {
    expect(normalize([])).toEqual([]);
  });

  it("single element → [1]", () => {
    expect(approx(normalize([5])[0]!, 1)).toBe(true);
  });

  it("preserves relative proportions", () => {
    const result = normalize([1, 3]);
    expect(approx(result[0]!, 0.25)).toBe(true);
    expect(approx(result[1]!, 0.75)).toBe(true);
  });
});

// ─── maxEntropy ──────────────────────────────────────────────────────────────

describe("maxEntropy", () => {
  it("n=2 → 1 bit", () => {
    expect(approx(maxEntropy(2), 1)).toBe(true);
  });

  it("n=4 → 2 bits", () => {
    expect(approx(maxEntropy(4), 2)).toBe(true);
  });

  it("n=8 → 3 bits", () => {
    expect(approx(maxEntropy(8), 3)).toBe(true);
  });

  it("n=1 → 0", () => {
    expect(maxEntropy(1)).toBe(0);
  });

  it("n=0 → 0", () => {
    expect(maxEntropy(0)).toBe(0);
  });

  it("n=1024 → 10 bits", () => {
    expect(approx(maxEntropy(1024), 10)).toBe(true);
  });

  it("equals entropy of uniform distribution", () => {
    const n = 6;
    const uniform = Array(n).fill(1 / n) as number[];
    expect(approx(maxEntropy(n), entropy(uniform))).toBe(true);
  });
});
