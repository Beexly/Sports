import { describe, it, expect } from "vitest";
import {
  anytimeValidLedger,
  initAnytimeFold,
  foldAnytimePick,
  type AnytimeFoldState,
} from "../anytime-ledger.js";

// Seeded generator — no Math.random anywhere.
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

const RANGE = 20; // the platform's fixed a-priori range (matches public-roi-policy)

/** Mixed-odds ledger: mostly -110-ish, occasional longshots, seeded. */
function genLedger(n: number, seed: number): number[] {
  const rand = mulberry32(seed);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const r = rand();
    if (r < 0.45) out.push(0.909); // -110 win
    else if (r < 0.9) out.push(-1); // loss
    else if (r < 0.97) out.push(4); // +400 win
    else out.push(rand() * RANGE); // occasional big win up to range
  }
  return out;
}

function foldAll(returns: readonly number[], opts: { alpha?: number; nullMean?: number } = {}): AnytimeFoldState {
  let state = initAnytimeFold({ range: RANGE, ...opts })!;
  expect(state).not.toBeNull();
  for (const x of returns) {
    const next = foldAnytimePick(state, x);
    expect(next).not.toBeNull();
    state = next!;
  }
  return state;
}

describe("foldAnytimePick — EXACT equivalence with the batch replay", () => {
  it("reproduces anytimeValidLedger bit-for-bit across 200 seeded mixed-odds ledgers", () => {
    // The load-bearing guarantee: the fold and the batch share one stepper, so
    // the trajectories must be EXACTLY equal (===, not toBeCloseTo) — any float
    // drift means the code paths diverged. Lengths 1..400, varied nulls.
    for (let s = 0; s < 200; s++) {
      const n = 1 + ((s * 37) % 400);
      const returns = genLedger(n, 42_000 + s);
      const nullMean = s % 3 === 0 ? 0 : s % 3 === 1 ? -0.05 : 0.02;
      const batch = anytimeValidLedger(returns, { range: RANGE, nullMean, computeLowerBound: false })!;
      expect(batch).not.toBeNull();

      let state = initAnytimeFold({ range: RANGE, nullMean })!;
      for (let i = 0; i < n; i++) {
        state = foldAnytimePick(state, returns[i]!)!;
        expect(state.logEValue).toBe(batch.points[i]!.logEValue); // EXACT
        expect(state.crossedThreshold).toBe(batch.points[i]!.crossedThreshold);
        expect(state.t).toBe(batch.points[i]!.t);
        expect(state.sumReturns / state.t).toBeCloseTo(batch.points[i]!.cumulativeMean, 12);
      }
      expect(state.everRejected).toBe(batch.everRejected);
      expect(state.firstRejectedAt).toBe(batch.firstRejectedAt);
    }
  }, 60_000);

  it("trips on a genuinely winning ledger (power carried over, not just validity)", () => {
    // 200 straight -110 wins: overwhelming evidence of positive mean.
    const state = foldAll(Array(200).fill(0.909));
    expect(state.everRejected).toBe(true);
    expect(state.firstRejectedAt).not.toBeNull();
    const batch = anytimeValidLedger(Array(200).fill(0.909), { range: RANGE })!;
    expect(state.firstRejectedAt).toBe(batch.firstRejectedAt);
  });

  it("handles a 20,000-pick stream (the live-surface scale the API exists for)", () => {
    const returns = genLedger(20_000, 7);
    const state = foldAll(returns);
    expect(Number.isFinite(state.logEValue)).toBe(true);
    expect(state.t).toBe(20_000);
    const batch = anytimeValidLedger(returns, { range: RANGE, computeLowerBound: false })!;
    expect(state.logEValue).toBe(batch.current.logEValue);
  }, 30_000);
});

describe("foldAnytimePick — immutability, refusals, init guards", () => {
  it("never mutates the input state", () => {
    const s0 = initAnytimeFold({ range: RANGE })!;
    const frozen = Object.freeze({ ...s0 });
    const s1 = foldAnytimePick(s0, 0.909)!;
    expect(s1).not.toBe(s0);
    expect(s0).toEqual(frozen); // unchanged
    expect(s1.t).toBe(1);
  });

  it("refuses bad observations without corrupting the held state", () => {
    const s0 = initAnytimeFold({ range: RANGE })!;
    expect(foldAnytimePick(s0, Number.NaN)).toBeNull();
    expect(foldAnytimePick(s0, -1.5)).toBeNull(); // below the stake floor
    expect(foldAnytimePick(s0, RANGE + 1)).toBeNull(); // above the a-priori range
    const s1 = foldAnytimePick(s0, 0.909)!; // state still usable after refusals
    expect(s1.t).toBe(1);
  });

  it("refuses invalid init options", () => {
    expect(initAnytimeFold({ range: 0 })).toBeNull();
    expect(initAnytimeFold({ range: -5 })).toBeNull();
    expect(initAnytimeFold({ range: Number.POSITIVE_INFINITY })).toBeNull();
    expect(initAnytimeFold({ range: RANGE, alpha: 0 })).toBeNull();
    expect(initAnytimeFold({ range: RANGE, alpha: 1 })).toBeNull();
    expect(initAnytimeFold({ range: RANGE, nullMean: -1 })).toBeNull();
    expect(initAnytimeFold({ range: RANGE, nullMean: RANGE })).toBeNull();
  });
});
