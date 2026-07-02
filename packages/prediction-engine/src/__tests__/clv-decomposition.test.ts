import { describe, it, expect } from "vitest";
import { decomposeClv, informationScore, type ClvDecompositionItem } from "../clv-decomposition.js";

/** Seeded PRNG (mulberry32) for deterministic synthetic fixtures. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function syntheticItems(
  n: number,
  seed: number,
  clvOf: (infoScore: number, disagreement: number, noise: number) => number,
): ClvDecompositionItem[] {
  const gen = mulberry32(seed);
  return Array.from({ length: n }, () => {
    const evidenceCategoryCount = Math.floor(gen() * 5); // 0..4
    const usedDerivedHistory = gen() < 0.5;
    const hoursToKickoffAtLock = gen() * 48;
    const bookDisagreementAtLock = gen() * 3;
    const item: ClvDecompositionItem = {
      clvValue: 0,
      evidenceCategoryCount,
      usedDerivedHistory,
      hoursToKickoffAtLock,
      bookDisagreementAtLock,
    };
    const noise = (gen() - 0.5) * 0.6;
    return { ...item, clvValue: clvOf(informationScore(item), bookDisagreementAtLock, noise) };
  });
}

describe("decomposeClv (Phase 5) — honest association decomposition", () => {
  it("recovers a KNOWN information slope with a CI that excludes zero", () => {
    // Ground truth: clv = 2 * infoScore + noise. The bootstrapped coefficient
    // must bracket ~2 and clearly exclude 0.
    const items = syntheticItems(120, 7, (info, _liq, noise) => 2 * info + noise);
    const res = decomposeClv(items, "POINTS", { resamples: 2000, seed: 3 })!;
    expect(res.informationCoefficient).not.toBeNull();
    expect(res.informationCoefficient!.point).toBeGreaterThan(1.8);
    expect(res.informationCoefficient!.point).toBeLessThan(2.2);
    expect(res.informationCoefficient!.low).toBeGreaterThan(0);
    expect(res.varianceExplained).toBeGreaterThan(0.8); // info dominates by construction
  });

  it("reports NO detectable effect on pure noise (CI straddles zero) — the machinery cannot be forced to find a story", () => {
    const items = syntheticItems(120, 11, (_info, _liq, noise) => noise * 5);
    const res = decomposeClv(items, "POINTS", { resamples: 2000, seed: 5 })!;
    expect(res.informationCoefficient).not.toBeNull();
    expect(res.informationCoefficient!.low).toBeLessThan(0);
    expect(res.informationCoefficient!.high).toBeGreaterThan(0);
    expect(res.varianceExplained).toBeLessThan(0.2);
    expect(res.residualShare).toBeGreaterThan(0.8);
  });

  it("NEVER causally labels the residual: banned bettor-behavior words are absent", () => {
    const items = syntheticItems(50, 13, (info, _l, noise) => info + noise);
    const res = decomposeClv(items, "POINTS", { resamples: 500, seed: 1 })!;
    const lower = res.note.toLowerCase();
    for (const banned of ["public", "sharp", "square"]) {
      expect(lower).not.toContain(banned);
    }
    expect(res.note).toContain("not a causal story");
  });

  it("liquidity coefficient picks up a genuine disagreement association", () => {
    const items = syntheticItems(120, 17, (_info, liq, noise) => 1.5 * liq + noise);
    const res = decomposeClv(items, "POINTS", { resamples: 2000, seed: 9 })!;
    expect(res.liquidityCoefficient!.point).toBeGreaterThan(1.2);
    expect(res.liquidityCoefficient!.low).toBeGreaterThan(0);
  });

  it("is deterministic (bcaCi's fixed-seed convention flows through)", () => {
    const items = syntheticItems(60, 19, (info, liq, noise) => info - 0.5 * liq + noise);
    const a = decomposeClv(items, "POINTS", { resamples: 800, seed: 21 })!;
    const b = decomposeClv(items, "POINTS", { resamples: 800, seed: 21 })!;
    expect(a).toEqual(b);
  });

  it("guards: null on n<3 and non-finite inputs", () => {
    const two = syntheticItems(2, 23, (i, _l, n2) => i + n2);
    expect(decomposeClv(two, "POINTS")).toBeNull();
    const bad = syntheticItems(10, 29, (i, _l, n2) => i + n2).map((it, idx) =>
      idx === 3 ? { ...it, clvValue: NaN } : it,
    );
    expect(decomposeClv(bad, "POINTS")).toBeNull();
  });

  it("out-of-sample sanity: a slope fit on the first half predicts the second half's direction", () => {
    const items = syntheticItems(200, 31, (info, _l, noise) => 1.2 * info + noise);
    const first = decomposeClv(items.slice(0, 100), "POINTS", { resamples: 800, seed: 33 })!;
    const second = decomposeClv(items.slice(100), "POINTS", { resamples: 800, seed: 35 })!;
    // Same generator, disjoint samples: the SIGN must replicate out-of-sample.
    expect(Math.sign(first.informationCoefficient!.point)).toBe(
      Math.sign(second.informationCoefficient!.point),
    );
    expect(second.informationCoefficient!.low).toBeGreaterThan(0);
  });
});
