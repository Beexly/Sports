/**
 * ACCEPTANCE HARNESS for the falsifier itself (Wave 3, LANE B / C-75 queue #3).
 *
 * Standing law (docs/ops/PLAN-2026-08-26-NORTHSTAR.md §2, blind-spot #1): "no
 * instrument's verdict counts until the instrument has killed known-bad and
 * passed known-planted-good at multiple n." This file is that law made
 * executable, kept green forever: it runs `falsifyBind` against three
 * purpose-built fixtures (a genuine planted edge, pure noise, and a
 * confidently inverted model) at n in {100, 1000, 5000} and fails the moment
 * any of those nine outcomes drifts from what the instrument is required to
 * see. This is the acceptance suite the falsifier itself must pass before any
 * of its verdicts on real data are trusted — see the four defects it would
 * have caught (C-65, supM erasure, C-70, C-74), all found only by hand-audit
 * because this harness did not yet exist.
 */
import { describe, expect, it } from "vitest";
import { falsifyBind, type BacktestRow } from "../falsify.js";

const N_LEVELS = [100, 1000, 5000] as const;

/** Deterministic LCG — reproducible fixtures, no `Math.random()` flakiness. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
}

/**
 * Shared row shape: real chronological spread (season alternates, week
 * cycles, knownAtWeek always 2 weeks before outcomeWeek) so leakage and split
 * both get a fair, non-degenerate test rather than a wall of identical rows.
 */
function baseRow(i: number, outcome: 0 | 1, modelProb: number): BacktestRow {
  const week = (i % 12) + 3;
  return {
    season: i % 2 === 0 ? 2024 : 2025,
    outcomeWeek: week,
    knownAtWeek: week - 2,
    outcome,
    modelProb,
    marketProb: 0.5,
  };
}

/**
 * KNOWN-GOOD: modelProb tracks the REALIZED outcome of each individual row
 * (elevated when outcome=1, depressed when outcome=0, plus noise so it is
 * not a perfect oracle) — a genuine row-level informational edge, not merely
 * a correct aggregate base rate.
 *
 * A constant modelProb across all rows was tried first and rejected: with
 * every row carrying the identical (p, q) pair, permuting the outcome labels
 * changes nothing about the statistic (the count of 1s is permutation-
 * invariant and p is the same everywhere), so `origStat` and every permuted
 * `permStat` are equal up to floating-point summation-order noise alone —
 * shuffle degenerates to a coin flip and the fixture is falsely KILLED. That
 * is not a fixture bug to route around; it is the shuffle gate correctly
 * refusing to credit an aggregate-only claim, which is exactly what it must
 * do. The row-level design below is what a real edge requires to survive it.
 */
function plantedEdgeRows(n: number, seed: number): BacktestRow[] {
  const rnd = lcg(seed);
  const rows: BacktestRow[] = [];
  for (let i = 0; i < n; i++) {
    const outcome = rnd() < 0.55 ? 1 : 0;
    const noise = (rnd() - 0.5) * 0.1; // +/- 0.05, so this is not a perfect oracle
    const modelProb = outcome === 1 ? 0.68 + noise : 0.32 + noise;
    rows.push(baseRow(i, outcome, modelProb));
  }
  return rows;
}

/** KNOWN-BAD (noise): modelProb carries zero information about the outcome. */
function pureNoiseRows(n: number, seed: number): BacktestRow[] {
  const rnd = lcg(seed);
  const rows: BacktestRow[] = [];
  for (let i = 0; i < n; i++) {
    const outcome = rnd() < 0.5 ? 1 : 0;
    const modelProb = 0.2 + rnd() * 0.6; // drawn independently of `outcome`
    rows.push(baseRow(i, outcome as 0 | 1, modelProb));
  }
  return rows;
}

/**
 * KNOWN-BAD (inverted): the mirror image of `plantedEdgeRows` — modelProb is
 * elevated exactly when the row will resolve 0, and depressed exactly when
 * it will resolve 1. Confidently, systematically wrong at the row level,
 * which is a different failure mode than noise and must be caught the same
 * way: negative LLR, not merely a non-positive one.
 */
function invertedModelRows(n: number, seed: number): BacktestRow[] {
  const rnd = lcg(seed);
  const rows: BacktestRow[] = [];
  for (let i = 0; i < n; i++) {
    const outcome = rnd() < 0.55 ? 1 : 0;
    const noise = (rnd() - 0.5) * 0.1;
    const modelProb = outcome === 1 ? 0.32 + noise : 0.68 + noise;
    rows.push(baseRow(i, outcome, modelProb));
  }
  return rows;
}

describe.each(N_LEVELS)("falsifier acceptance harness — n=%d", (n) => {
  it("planted edge: SURVIVOR, all 4 gates PASS", () => {
    const res = falsifyBind(plantedEdgeRows(n, 1_000_000 + n), { seed: 7 });
    expect(res.leakage.verdict).toBe("PASS");
    expect(res.shuffle.verdict).toBe("PASS");
    expect(res.split.verdict).toBe("PASS");
    expect(res.multiplicity.verdict).toBe("PASS");
    expect(res.overall.verdict).toBe("SURVIVOR");
  });

  it("pure noise: KILLED (shuffle cannot beat label permutations)", () => {
    const res = falsifyBind(pureNoiseRows(n, 2_000_000 + n), { seed: 7 });
    expect(res.shuffle.verdict).toBe("KILLED");
    expect(res.overall.verdict).toBe("KILLED");
  });

  it("inverted model: KILLED (negative LLR — confidently wrong is not noise)", () => {
    const res = falsifyBind(invertedModelRows(n, 3_000_000 + n), { seed: 7 });
    expect(res.shuffle.verdict).toBe("KILLED");
    expect(res.multiplicity.verdict).toBe("KILLED");
    expect(res.overall.verdict).toBe("KILLED");
  });
});
