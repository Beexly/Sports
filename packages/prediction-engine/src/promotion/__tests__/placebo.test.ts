/**
 * Contract §5 invariant #3 — "Placebo rejects": a challenger that is the
 * champion plus zero-mean seeded noise (on BOTH the paired probability leg
 * and the CLV leg) must not get promoted at a rate above the significance
 * level, across many seeded runs. This is the direct anti-DEC-062 property
 * test: the declined promoter's tautological comparison made "can this ever
 * promote" and "can this ever be safely stopped" both unanswerable; this
 * test proves the second half directly.
 *
 * Per the task brief: >= 200 seeded runs, n = 600 paired brier rows per
 * run, asserting eligibility rate <= 0.07 (alpha=0.05 plus sampling
 * slack — with 250 runs a true rate of 0.05 has a binomial std dev of
 * ~0.014, so 0.07 is a generous ~1.4-sigma allowance, not a loosened bar).
 *
 * The noise is genuinely zero-mean on the challenger's underlying
 * distribution (uniform, symmetric around 0), matching the contract's "K =
 * C + zero-mean seeded noise" definition. Note this makes the paired-Brier
 * leg's TRUE effect slightly negative (adding independent noise to a
 * probability strictly increases expected squared error versus the
 * (equally) well-calibrated champion: E[d_i] ~= -Var(noise) < 0), which is
 * the honest real-world shape of "no true improvement, just noise" — an
 * even harder bar than sitting exactly on the null boundary.
 */

import { describe, expect, it } from "vitest";
import { evaluatePromotion } from "../evaluate.js";
import type { ClvRow, PairedBrierRow, PromotionInput } from "../types.js";
import { baseWindow } from "./fixtures.js";

// Local seeded PRNG (mulberry32), matching this repo's seeded-test
// convention (see packages/prediction-engine/src/edge-lab/rng.ts) —
// re-implemented here (rather than imported) so this property test's
// randomness source is self-contained and auditable in one file.
type Rng = () => number;
function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

const WINDOW_START = Date.parse("2026-02-01T00:00:00.000Z");
const WINDOW_END = Date.parse("2026-04-01T00:00:00.000Z");

function timesFor(index: number, n: number): { lockedAt: string; settledAt: string } {
  const span = WINDOW_END - WINDOW_START - 2 * 86_400_000;
  const lockedMs = WINDOW_START + 86_400_000 + Math.floor((span * index) / Math.max(n, 1));
  const settledMs = lockedMs + 3_600_000;
  return { lockedAt: new Date(lockedMs).toISOString(), settledAt: new Date(settledMs).toISOString() };
}

/** One placebo trial. Returns the full gate's verdict for a challenger that
 * is the champion plus independent zero-mean seeded noise. */
function runPlacebo(seed: number, nPairs: number, nClvPerSide: number): "ELIGIBLE" | "NOT_ELIGIBLE" {
  const rng = mulberry32(seed);

  const brierRows: PairedBrierRow[] = Array.from({ length: nPairs }, (_, i) => {
    const trueProb = 0.2 + 0.6 * rng(); // varying but well-calibrated champion, in [0.2, 0.8]
    const championProb = trueProb;
    const noise = (rng() - 0.5) * 0.1; // zero-mean, uniform in [-0.05, 0.05)
    const challengerProb = clamp(championProb + noise, 0.001, 0.999);
    const outcome: 0 | 1 = rng() < trueProb ? 1 : 0;
    const { lockedAt, settledAt } = timesFor(i, nPairs);
    return { eventId: `evt-${i}`, championProb, challengerProb, outcome, lockedAt, settledAt };
  });

  const baseMean = 0.01;
  const baseSpread = 0.01;
  const noiseSpread = 0.01;
  const championClvRows: ClvRow[] = Array.from({ length: nClvPerSide }, (_, i) => {
    const clv = baseMean + baseSpread * (rng() * 2 - 1);
    const { lockedAt, settledAt } = timesFor(i, nClvPerSide);
    return { pickId: `c-${seed}-${i}`, model: "champion" as const, clv, lockedAt, settledAt };
  });
  const challengerClvRows: ClvRow[] = Array.from({ length: nClvPerSide }, (_, i) => {
    const base = baseMean + baseSpread * (rng() * 2 - 1);
    const noise = noiseSpread * (rng() * 2 - 1); // zero-mean
    const { lockedAt, settledAt } = timesFor(i, nClvPerSide);
    return { pickId: `k-${seed}-${i}`, model: "challenger" as const, clv: base + noise, lockedAt, settledAt };
  });

  const input: PromotionInput = {
    window: baseWindow(),
    championId: "champion-v1",
    challengerId: `challenger-placebo-${seed}`,
    codeRevision: "rev-placebo",
    brierRows,
    clvRows: [...championClvRows, ...challengerClvRows],
  };

  return evaluatePromotion(input, "2026-04-02T00:00:00.000Z").verdict;
}

describe("evaluatePromotion — contract invariant 3: placebo rejects", () => {
  it("challenger = champion + zero-mean seeded noise ⇒ eligibility rate <= 0.07 across >= 200 seeded runs", () => {
    const RUNS = 250;
    const N_PAIRS = 600;
    const N_CLV_PER_SIDE = 150;

    let eligibleCount = 0;
    for (let seed = 0; seed < RUNS; seed++) {
      if (runPlacebo(seed, N_PAIRS, N_CLV_PER_SIDE) === "ELIGIBLE") {
        eligibleCount++;
      }
    }

    const rate = eligibleCount / RUNS;
    // eslint-disable-next-line no-console -- surfaced deliberately for the audit trail
    console.log(`[placebo] eligible ${eligibleCount}/${RUNS} runs, rate=${rate.toFixed(4)}`);

    expect(RUNS).toBeGreaterThanOrEqual(200);
    expect(rate).toBeLessThanOrEqual(0.07);
  });
});
