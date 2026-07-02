import { describe, it, expect } from "vitest";
import { anytimeValidLedger } from "../anytime-ledger.js";

/** Seeded PRNG (mulberry32) — the fixtures must be deterministic so the
 * Monte-Carlo proofs below are FIXED numbers, never flaky. */
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

const WIN = 100 / 110; // -110 win return
const P_BREAKEVEN = 1 / (1 + WIN); // exact: p*WIN - (1-p) = 0

function breakEvenLedger(gen: () => number, n: number): number[] {
  return Array.from({ length: n }, () => (gen() < P_BREAKEVEN ? WIN : -1));
}

describe("anytimeValidLedger (K11) — unit behavior", () => {
  it("guards: null on empty, non-finite, bad alpha, sub-floor returns, out-of-range null", () => {
    expect(anytimeValidLedger([], {})).toBeNull();
    expect(anytimeValidLedger([0.5, NaN], {})).toBeNull();
    expect(anytimeValidLedger([0.5], { alpha: 0 })).toBeNull();
    expect(anytimeValidLedger([-1.5], {})).toBeNull(); // below the -1 stake floor
    expect(anytimeValidLedger([0.5], { nullMean: -1 })).toBeNull();
    expect(anytimeValidLedger([0.5], { nullMean: 99, range: 1 })).toBeNull();
  });

  it("is DETERMINISTIC and closed-form: identical input -> identical output object", () => {
    const gen = mulberry32(5);
    const ledger = breakEvenLedger(gen, 80);
    expect(anytimeValidLedger(ledger)).toEqual(anytimeValidLedger(ledger));
  });

  it("is ORDER-SENSITIVE: a reordered ledger produces a different evidence path", () => {
    const wins = Array(30).fill(WIN);
    const losses = Array(30).fill(-1);
    const winsFirst = anytimeValidLedger([...wins, ...losses])!;
    const lossesFirst = anytimeValidLedger([...losses, ...wins])!;
    // Same multiset, same final cumulative mean — different sequential path.
    expect(winsFirst.current.cumulativeMean).toBeCloseTo(lossesFirst.current.cumulativeMean, 12);
    expect(winsFirst.current.logEValue).not.toBeCloseTo(lossesFirst.current.logEValue, 6);
  });

  it("an all-losses ledger never rejects 'no edge' and pins the lower bound at the floor", () => {
    const res = anytimeValidLedger(Array(200).fill(-1))!;
    expect(res.everRejected).toBe(false);
    expect(res.lowerBound).toBe(-1);
    // e-value can only have shrunk under pure losses.
    expect(res.current.logEValue).toBeLessThanOrEqual(0);
  });

  it("a strongly profitable ledger rejects H0 and yields a positive, mean-bounded lower bound", () => {
    // 70% winners at -110: true mean ~ +0.336 units/bet — a huge real edge.
    const gen = mulberry32(99);
    const ledger = Array.from({ length: 300 }, () => (gen() < 0.7 ? WIN : -1));
    const res = anytimeValidLedger(ledger)!;
    expect(res.everRejected).toBe(true);
    expect(res.firstRejectedAt).not.toBeNull();
    expect(res.lowerBound).toBeGreaterThan(0);
    // An anytime-valid lower bound must not exceed the observed mean.
    expect(res.lowerBound).toBeLessThanOrEqual(res.current.cumulativeMean);
  });

  it("e-value bookkeeping: eValue = exp(logEValue), threshold crossing consistent with alpha", () => {
    const gen = mulberry32(21);
    const ledger = Array.from({ length: 120 }, () => (gen() < 0.65 ? WIN : -1));
    const res = anytimeValidLedger(ledger, { alpha: 0.05 })!;
    for (const p of [res.points[0]!, res.points[59]!, res.current]) {
      expect(p.eValue).toBeCloseTo(Math.min(Math.exp(p.logEValue), Number.MAX_VALUE), 6);
      expect(p.crossedThreshold).toBe(p.logEValue >= Math.log(1 / 0.05));
    }
  });
});

/**
 * THE ADVERSARIAL-PEEKING PROOF — the claim that earns the word "anytime".
 * Under a TRUE break-even world (mean exactly 0 by construction), an adversary
 * who checks the e-value after EVERY settled pick and stops at the most
 * favorable moment can do no better than "did it EVER cross 1/alpha" — which
 * is literally the supremum over all stopping times that Ville's inequality
 * bounds by alpha. So: simulate 2000 independent break-even ledgers, count
 * ever-crossings, and the rate must sit within the alpha budget.
 *
 * Budget reasoning: at NSIM=2000 the MC standard error of a rate near 0.05 is
 * sqrt(.05*.95/2000) ~ 0.49pp, so alpha + 3*SE ~ 0.0646 is a ceiling that
 * cannot flake if the construction is valid, and a broken construction (e.g.
 * a non-supermartingale bet) blows through it immediately. E-processes are
 * typically CONSERVATIVE (realized FP well under alpha) — the power test
 * below is what guards against the trivial "never rejects" degeneracy.
 */
describe("K11 adversarial optional-stopping proof (Monte-Carlo, seeded)", () => {
  it("false-positive rate under worst-case peeking stays within the Ville budget", () => {
    const NSIM = 2000;
    const N_MAX = 300;
    const gen = mulberry32(20260702);
    let falseRejections = 0;
    for (let s = 0; s < NSIM; s++) {
      const ledger = breakEvenLedger(gen, N_MAX);
      const res = anytimeValidLedger(ledger, { computeLowerBound: false })!;
      if (res.everRejected) falseRejections++;
    }
    const fpr = falseRejections / NSIM;
    // OBSERVED (deterministic, from the actual run): fpr = 0.0195 — comfortably
    // inside the Ville budget AND meaningfully non-zero (the bettor genuinely
    // bets; this is not a dead test passing vacuously). Ceiling = alpha + 3 MC SE.
    expect(fpr).toBeLessThanOrEqual(0.0646);
  });

  it("has real power under a genuine edge (not trivially valid by never rejecting)", () => {
    // POWER SANITY, not a power study: certifying a small edge sequentially is
    // genuinely slow (a +6pp edge at -110 has an optimal log-growth of only
    // ~0.007 nats/bet -> ~400+ bets to cross ln(20) on average — that is the
    // honest cost of anytime validity, not a defect). The sanity check uses a
    // LARGE edge (+8pp) over 500 picks, where the machine must usually reject.
    const P_EDGE = P_BREAKEVEN + 0.08;
    const NSIM = 400;
    const N_MAX = 500;
    const gen = mulberry32(31337);
    let rejected = 0;
    for (let s = 0; s < NSIM; s++) {
      const ledger = Array.from({ length: N_MAX }, () => (gen() < P_EDGE ? WIN : -1));
      if (anytimeValidLedger(ledger, { computeLowerBound: false })!.everRejected) rejected++;
    }
    const power = rejected / NSIM;
    // OBSERVED (deterministic, from the actual run): power = 0.7200.
    expect(power).toBeGreaterThan(0.5);
  });

  it("the anytime lower bound is also valid: P(lowerBound > 0) <= alpha budget under true mean 0", () => {
    const NSIM = 400;
    const N_MAX = 300;
    const gen = mulberry32(424242);
    let boundViolations = 0;
    for (let s = 0; s < NSIM; s++) {
      const ledger = breakEvenLedger(gen, N_MAX);
      if (anytimeValidLedger(ledger)!.lowerBound > 0) boundViolations++;
    }
    // alpha + 3*SE at NSIM=400: 0.05 + 3*sqrt(.05*.95/400) ~ 0.0827.
    // OBSERVED (deterministic, from the actual run): 0.0325 — inside the budget
    // and non-trivial (the bound is sharp enough to matter, not vacuously -1).
    expect(boundViolations / NSIM).toBeLessThanOrEqual(0.0827);
  });
});
