import { describe, it, expect } from "vitest";
import {
  spearman,
  rSquared,
  olsSlope,
  permutationPValue,
  rankFirstVerdict,
  applyDifficulty,
  withinStratumRankStability,
  textVsNumberDominance,
  ensembleDiversityCurve,
  type DifficultyRow,
  type EnsembleMember,
} from "./2609-19354-rank-first-gate.js";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}
function randn(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * u);
}
/** Heavy-tailed targets: a few big outcomes dominate SS_tot, which is
 *  exactly why R^2 and rank correlation can disagree so sharply. */
function heavyTailedTargets(n: number, seed: number): number[] {
  const rand = mulberry32(seed);
  return Array.from({ length: n }, (_, i) =>
    i % 12 === 0 ? 400 + randn(rand) * 60 : 45 + randn(rand) * 6,
  );
}

describe("spearman", () => {
  it("is 1 for a perfect monotone relationship and -1 when reversed", () => {
    const x = [1, 2, 3, 4, 5, 6];
    expect(spearman(x, [10, 20, 30, 40, 50, 60])).toBeCloseTo(1, 12);
    expect(spearman(x, [60, 50, 40, 30, 20, 10])).toBeCloseTo(-1, 12);
  });

  it("is invariant to any strictly increasing transform of either side", () => {
    const rand = mulberry32(7);
    const a = Array.from({ length: 50 }, () => randn(rand) * 10);
    const b = Array.from({ length: 50 }, () => randn(rand) * 10);
    const base = spearman(a, b);
    expect(spearman(a.map((v) => Math.exp(v / 50)), b.map((v) => v ** 3))).toBeCloseTo(base, 12);
  });

  it("handles ties by average rank and stays inside (-1, 1)", () => {
    expect(Number.isNaN(spearman([1, 2, 3, 4], [5, 5, 5, 5]))).toBe(true);
    const rho = spearman([1, 1, 2, 2, 3], [5, 5, 1, 1, 9]);
    expect(rho).toBeGreaterThan(-1);
    expect(rho).toBeLessThan(1);
  });

  it("rejects malformed input rather than returning a soft number", () => {
    expect(() => spearman([1, 2], [1, 2, 3])).toThrow(/length mismatch/);
    expect(() => spearman([1, 2], [1, 2])).toThrow(/3 pairs/);
  });
});

describe("rSquared and olsSlope", () => {
  it("pins R^2 = 1 on a perfect fit and 0 on the mean predictor", () => {
    const y = [2, 4, 6, 8, 10];
    expect(rSquared([2, 4, 6, 8, 10], y)).toBeCloseTo(1, 12);
    expect(rSquared([6, 6, 6, 6, 6], y)).toBeCloseTo(0, 12);
  });

  it("recovers a known slope and is invariant to the intercept", () => {
    const pred = [1, 2, 3, 4, 5];
    expect(olsSlope([3, 6, 9, 12, 15], pred)).toBeCloseTo(3, 12);
    expect(olsSlope([103, 106, 109, 112, 115], pred)).toBeCloseTo(3, 12);
  });
});

describe("permutationPValue", () => {
  it("rejects the null for genuine signal and fails to reject for noise", () => {
    const rand = mulberry32(99);
    const actual = Array.from({ length: 60 }, (_, i) => i);
    const signal = actual.map((a) => a + randn(rand) * 3);
    const noise = Array.from({ length: 60 }, () => randn(rand));
    // POSITIVE CONTROL: the test must be able to say "yes".
    expect(permutationPValue(signal, actual, 1000, 1)).toBeLessThanOrEqual(0.05);
    // NEGATIVE CONTROL: and it must be able to say "no". Without this, a
    // function that always returned a tiny p-value would pass the line above.
    expect(permutationPValue(noise, actual, 1000, 1)).toBeGreaterThan(0.05);
  });

  it("never reports p = 0 (the +1 correction)", () => {
    const actual = Array.from({ length: 30 }, (_, i) => i);
    expect(permutationPValue(actual, actual, 50, 1)).toBeGreaterThan(0);
  });
});

describe("rankFirstVerdict", () => {
  it("promotes a usable model that ranks well", () => {
    const rand = mulberry32(11);
    const actual = Array.from({ length: 80 }, () => randn(rand) * 10 + 50);
    const pred = actual.map((a) => a + randn(rand) * 4);
    const r = rankFirstVerdict({ pred, actual, rhoFloor: 0.3, permutations: 600, seed: 3 });
    expect(r.verdict).toBe("promote");
    expect(r.rho).toBeGreaterThan(0.3);
    expect(r.pValue).toBeLessThanOrEqual(0.05);
  });

  it("reproduces the paper's headline: rho clears the rank floor while R^2 fails the accuracy gate", () => {
    // The 2609.19354 best configuration scored rho 0.6664 with R^2 0.2387 —
    // ordering evidence that a point-accuracy gate throws away.
    const actual = heavyTailedTargets(90, 5);
    const rand = mulberry32(21);
    const pred = actual.map((a) => 40 + a * 0.12 + randn(rand) * 5);
    const r = rankFirstVerdict({
      pred, actual, rhoFloor: 0.3, r2GateFloor: 0.3, permutations: 600, seed: 4,
    });
    expect(r.rho).toBeGreaterThan(0.3);
    expect(r.r2).toBeLessThan(0.3);
    expect(r.verdict).toBe("promote");
    expect(r.rankBeatsAccuracyGate).toBe(true);
    expect(r.reasons.join(" ")).toMatch(/point-accuracy gate discards/);
  });

  it("rejects a sign-inverted model rather than promoting it as 'correlated'", () => {
    // The paper's Qwen 3B P1 sat at rho = -0.1305.
    const actual = Array.from({ length: 70 }, (_, i) => i);
    const pred = actual.map((a) => -a + 30);
    const r = rankFirstVerdict({ pred, actual, rhoFloor: 0.2, permutations: 400, seed: 8 });
    expect(r.rho).toBeLessThan(0);
    expect(r.verdict).toBe("reject-sign-inverted");
    expect(r.reasons.join(" ")).toMatch(/orders events backwards/);
  });

  it("rejects constant predictions as degenerate", () => {
    const actual = Array.from({ length: 40 }, (_, i) => i);
    const r = rankFirstVerdict({ pred: actual.map(() => 5), actual, rhoFloor: 0.2, permutations: 200, seed: 2 });
    expect(r.verdict).toBe("reject-degenerate");
    expect(Number.isNaN(r.rho)).toBe(true);
  });

  it("rejects a real but too-weak rank signal", () => {
    const rand = mulberry32(31);
    const actual = Array.from({ length: 80 }, () => randn(rand));
    const pred = actual.map((a) => a + randn(rand) * 4);
    const r = rankFirstVerdict({ pred, actual, rhoFloor: 0.6, permutations: 400, seed: 6 });
    expect(r.verdict).toBe("reject-below-rho-floor");
  });

  it("does not promote a model whose signal is indistinguishable from noise", () => {
    const rand = mulberry32(77);
    const actual = Array.from({ length: 60 }, () => randn(rand));
    const pred = Array.from({ length: 60 }, () => randn(rand));
    const r = rankFirstVerdict({ pred, actual, rhoFloor: 0.1, permutations: 1000, seed: 12 });
    expect(r.verdict).toBe("reject-null-not-rejected");
    expect(r.pValue).toBeGreaterThan(0.05);
  });

  it("refuses a perfectly monotone but unusably scaled model", () => {
    // rho ~ 1 by construction, but the output range is ~1000x the target
    // range. Ranking it first would hand downstream EV and sizing math
    // numbers it cannot use. This is the footgun the gate has to close.
    const rand = mulberry32(41);
    const jitter = mulberry32(42);
    const actual = Array.from({ length: 60 }, (_, i) => (i / 59) * 0.98 + 0.01 + randn(jitter) * 0.002);
    const ordered = Array.from({ length: 60 }, (_, i) => i / 59);
    const r = rankFirstVerdict({
      pred: ordered.map((o) => o * 1000),
      actual, rhoFloor: 0.3, permutations: 300, seed: 9,
    });
    expect(Math.abs(r.rho)).toBeGreaterThan(0.95);
    expect(r.verdict).toBe("reject-scale-unusable");
    expect(r.reasons.join(" ")).toMatch(/EV or sizing/);
  });
});

describe("applyDifficulty (the paper's DoD step)", () => {
  it("multiplies each raw signal by its difficulty coefficient", () => {
    expect(applyDifficulty([8, 9, 7.5], [1.6, 2, 3.4])).toEqual([12.8, 18, 25.5]);
  });

  it("rejects a non-positive or non-finite difficulty", () => {
    expect(() => applyDifficulty([8], [0])).toThrow(/difficulty must be > 0/);
    expect(() => applyDifficulty([8], [-1])).toThrow(/difficulty must be > 0/);
    expect(() => applyDifficulty([8, 9], [1])).toThrow(/length mismatch/);
  });
});

describe("withinStratumRankStability", () => {
  const levels = [1, 1.5, 2.2, 3.1];

  function build(signalWithinStratum: boolean): DifficultyRow[] {
    const rand = mulberry32(signalWithinStratum ? 55 : 56);
    const indep = mulberry32(signalWithinStratum ? 155 : 156);
    const rows: DifficultyRow[] = [];
    for (const d of levels) {
      for (let i = 0; i < 12; i++) {
        // Signal case: raw tracks actual. Artifact case: raw is difficulty
        // plus INDEPENDENT noise, so it carries no within-stratum signal.
        const actual = d * 8 + randn(rand);
        const raw = signalWithinStratum ? actual + randn(indep) * 0.3 : d + randn(indep) * 0.02;
        rows.push({ raw, difficulty: d, actual });
      }
    }
    return rows;
  }

  it("confirms an edge that survives conditioning on difficulty", () => {
    const r = withinStratumRankStability(build(true));
    expect(r.rhoOverall).toBeGreaterThan(0.5);
    expect(r.rhoWithinWeighted).toBeGreaterThan(0.5);
    expect(Math.abs(r.attenuation)).toBeLessThan(0.1);
    expect(r.stable).toBe(true);
    expect(r.strata).toHaveLength(levels.length);
    expect(r.strata.every((s) => s.n === 12)).toBe(true);
  });

  it("catches an edge that is only difficulty ordering in disguise", () => {
    const r = withinStratumRankStability(build(false));
    // Pooled rho looks fine...
    expect(r.rhoOverall).toBeGreaterThan(0.5);
    // ...but inside a difficulty stratum there is no signal left.
    expect(r.rhoWithinWeighted).toBeLessThan(0.3);
    expect(r.attenuation).toBeLessThan(-0.1);
    expect(r.stable).toBe(false);
  });

  it("reports strata too small to estimate instead of counting them as zero", () => {
    const rows: DifficultyRow[] = [];
    for (let i = 0; i < 20; i++) rows.push({ raw: 10 + i, difficulty: 1, actual: 10 + i });
    rows.push({ raw: 5, difficulty: 9.9, actual: 50 });
    const r = withinStratumRankStability(rows, { minStratum: 5 });
    const tiny = r.strata.find((s) => s.difficulty === 9.9);
    expect(tiny?.n).toBe(1);
    expect(Number.isNaN(tiny!.rhoWithin)).toBe(true);
    // The 20-row stratum still carries the weighted mean on its own.
    expect(r.rhoWithinWeighted).toBeCloseTo(1, 6);
  });

  it("rejects a non-positive difficulty and empty input", () => {
    expect(() => withinStratumRankStability([])).toThrow(/no rows/);
    expect(() => withinStratumRankStability([{ raw: 1, difficulty: 0, actual: 1 }])).toThrow(
      /difficulty must be > 0/,
    );
  });
});

describe("textVsNumberDominance", () => {
  it("detects the paper's finding: reasoning text carries more rank signal than self-reported numbers", () => {
    const rand = mulberry32(64);
    const actual = Array.from({ length: 70 }, () => randn(rand) * 10);
    const numeric = actual.map((a) => a + randn(rand) * 14);
    const textual = actual.map((a) => a + randn(rand) * 3);
    const r = textVsNumberDominance({ numeric, textual, actual, permutations: 600, seed: 14 });
    expect(r.rhoTextual).toBeGreaterThan(r.rhoNumeric);
    expect(r.textDominates).toBe(true);
    expect(r.significant).toBe(true);
    expect(r.pValue).toBeLessThanOrEqual(0.05);
  });

  it("CONTROL: reports no dominance when the two features are equally informative", () => {
    // Without this, a function that always returned textDominates = true
    // would satisfy the test above.
    const rand = mulberry32(65);
    const actual = Array.from({ length: 70 }, () => randn(rand) * 10);
    const numeric = actual.map((a) => a + randn(rand) * 7);
    const textual = actual.map((a) => a + randn(rand) * 7);
    const r = textVsNumberDominance({ numeric, textual, actual, permutations: 1000, seed: 15 });
    expect(Math.abs(r.margin)).toBeLessThan(0.25);
    expect(r.significant).toBe(false);
    expect(r.pValue).toBeGreaterThan(0.05);
  });

  it("CONTROL: detects the reverse ordering, so the sign is not hard-wired", () => {
    const rand = mulberry32(66);
    const actual = Array.from({ length: 70 }, () => randn(rand) * 10);
    const numeric = actual.map((a) => a + randn(rand) * 3);
    const textual = actual.map((a) => a + randn(rand) * 14);
    const r = textVsNumberDominance({ numeric, textual, actual, permutations: 600, seed: 16 });
    expect(r.margin).toBeLessThan(0);
    expect(r.textDominates).toBe(false);
  });
});

describe("ensembleDiversityCurve", () => {
  const n = 60;
  const actual = Array.from({ length: n }, (_, i) => i);
  const r1 = mulberry32(71);
  const r2 = mulberry32(72);
  const r3 = mulberry32(73);

  const members: EnsembleMember[] = [
    { name: "good-a", pred: actual.map((a) => a + randn(r1) * 12) },
    { name: "good-b", pred: actual.map((a) => a + randn(r2) * 12) },
    { name: "weak", pred: actual.map(() => randn(r3) * 40) },
    { name: "inverted", pred: actual.map((a) => -a) },
  ];

  it("selects the strongest member first and finds the saturation knee", () => {
    const curve = ensembleDiversityCurve(members, actual, { saturationEpsilon: 0.01, maxSize: 4 });
    expect(curve.points).toHaveLength(4);
    expect(["good-a", "good-b"]).toContain(curve.points[0]!.added);
    expect(curve.points[0]!.pooledRho).toBeGreaterThan(0.5);
    expect(curve.saturationSize).not.toBeNull();
    expect(curve.saturationSize!).toBeLessThanOrEqual(3);
    expect(curve.selected).toEqual(curve.points.map((p) => p.added));
  });

  it("honours maxSize so the pool can be stopped at the knee", () => {
    const curve = ensembleDiversityCurve(members, actual, { maxSize: 2 });
    expect(curve.points).toHaveLength(2);
    expect(curve.points[1]!.size).toBe(2);
  });

  it("CONTROL: a pool of pure noise never reaches a usable rho", () => {
    const rn = mulberry32(74);
    const noise: EnsembleMember[] = [0, 1, 2].map((i) => ({
      name: `noise-${i}`,
      pred: Array.from({ length: n }, () => randn(rn) * 30),
    }));
    const curve = ensembleDiversityCurve(noise, actual, { maxSize: 3 });
    expect(curve.bestPooledRho).toBeLessThan(0.35);
  });

  it("rejects malformed member input", () => {
    expect(() => ensembleDiversityCurve([], actual)).toThrow(/no members/);
    expect(() => ensembleDiversityCurve([{ name: "x", pred: [1, 2] }], actual)).toThrow(
      /length mismatch/,
    );
  });
});
