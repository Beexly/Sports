// ============================================================
// Per-market gated selection with error caps (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * below to pass on real walk-forward data, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2609.22632 — "Classification with Abstention under Class-Conditional Error Constraints"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: classification with abstention under
 * class-conditional error constraints — one learned gate per class
 * (here: market types spread/total/moneyline) with separate error caps
 * set from bankroll tolerance; the objective minimizes additive
 * ambiguity (abstention rate) subject to the caps, with randomized
 * tie-breaking at the gate boundary. Weekly realized per-class error
 * logging and quarterly cap re-fits keep the caps honest.
 *
 * IMPROVEMENT (from ledger): Build per-market gated selection for the posted card: classes = market types (spread, total, moneyline), one learned gate per class with separate error caps set from bankroll tolerance, minimizing additive ambiguity (abstention rate) subject to the caps, with the paper's randomized tie-breaking at the gate boundary, weekly realized per-class error logging, and quarterly cap re-fits.
 *
 * ACCEPTANCE GATE: ADAPT accepted if per-class gating holds all market types under their caps with >= 15% lower abstention than the global gate on walk-forward seasons; else REJECT. Hard fail: if any market type's realized error exceeds its cap in >1 of 4 test seasons, fall back to additive-only and re-test before any ship decision.
 */

export type MarketType = "spread" | "total" | "moneyline";

export interface ClassGate {
  marketType: MarketType;
  /** Error cap from bankroll tolerance. */
  errorCap: number;
  /** Confidence threshold: post iff confidence ≥ threshold (tie-break below). */
  threshold: number;
}

/** Seeded RNG for randomized tie-breaking. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Per-class gate decision with randomized tie-breaking at the boundary:
 * post iff confidence > threshold, abstain iff < threshold, and flip a
 * coin exactly at the threshold.
 */
export function classGateDecision(
  gate: ClassGate,
  confidence: number,
  rand: () => number,
): boolean {
  if (confidence > gate.threshold) return true;
  if (confidence < gate.threshold) return false;
  return rand() < 0.5;
}

/** Realized error rate of posted picks for one class. */
export function classErrorRate(posted: boolean[], correct: (0 | 1)[]): number {
  let n = 0;
  let errors = 0;
  for (let i = 0; i < posted.length; i++) {
    if (posted[i]) {
      n++;
      if (correct[i] === 0) errors++;
    }
  }
  return n > 0 ? errors / n : 0;
}

/** Abstention rate for one class. */
export function classAbstentionRate(posted: boolean[]): number {
  if (posted.length === 0) return 0;
  return posted.filter((p) => !p).length / posted.length;
}

export interface PerClassGateResult {
  perClassUnderCap: boolean;
  abstentionReduction: number;
  hardFail: boolean;
  passes: boolean;
}

/**
 * Acceptance-gate helper: every market type under its cap, ≥15% lower
 * abstention than the global gate; hard fail if any type exceeds its cap
 * in >1 of 4 seasons.
 */
export function perClassGatePasses(
  perClassError: Record<MarketType, number>,
  caps: Record<MarketType, number>,
  perClassAbstention: number,
  globalAbstention: number,
  seasonsOverCap: Record<MarketType, number>,
): PerClassGateResult {
  const types: MarketType[] = ["spread", "total", "moneyline"];
  const perClassUnderCap = types.every((t) => perClassError[t]! <= caps[t]! + 1e-12);
  const abstentionReduction =
    globalAbstention > 0 ? (globalAbstention - perClassAbstention) / globalAbstention : 0;
  const hardFail = types.some((t) => seasonsOverCap[t]! > 1);
  return {
    perClassUnderCap,
    abstentionReduction,
    hardFail,
    passes: perClassUnderCap && abstentionReduction >= 0.15 && !hardFail,
  };
}
