/**
 * LSRQC KERNEL v1 — violation-delta RANKING core (pure).
 *
 * SINGLE SOURCE OF TRUTH for the baseline inductive-invariant predicate the
 * admit / receipt / miner paths all reason over (`BASE_INDS`), plus the pure
 * ranking math that scores a proposed STRENGTHENING by how many additional
 * near-miss states it would catch.
 *
 * ██ RANKING / LOGGING ONLY. ██ Nothing here gates an admit decision or
 * activates a version. The confidence gate `softGate(Δ)=σ(βΔ)` and the
 * multi-window `support ≥ kMin` guard are used to ORDER proposals for a human,
 * never to admit or refuse traffic. Deliberately NO OPD, NO gradients, NO
 * optimizer on the money / admit path — these are hindsight statistics over
 * already-projected abstract states.
 *
 * SEED analogs (do not let this drift):
 *   - delta          → the confidence-gate signal g = σ(βΔ): how much MORE the
 *                      strengthened certificate would catch on this window.
 *   - support ≥ kMin → Prop2 multi-window variance guard: a strengthening only
 *                      ranks if it pays off across ≥ kMin independent windows,
 *                      not one lucky window.
 *   - strength       → Σ max(0, delta): total realized catch across windows.
 */

import type { AbstractControlState } from "./srqc-projection";

/** A single inductive-invariant conjunct: TRUE when the state is OK under it,
 *  FALSE when the state VIOLATES it. */
export type IndInvPred = (s: AbstractControlState) => boolean;

/**
 * The baseline inductive invariant — the SAME two conjuncts the admit / receipt
 * / miner paths use (kept here as the one authoritative definition):
 *   1. AtMostOnePendingPerInvocation — never two attempts pending (GE2).
 *   2. RejectedImpliesBound — a rejected fingerprint only on a bound id.
 * A state VIOLATES the baseline iff either conjunct returns false.
 */
export const BASE_INDS: IndInvPred[] = [
  (s) => s.pendingCountClass !== "GE2",
  (s) => !(s.hasRejectedFp && !s.fingerprintBound),
];

/** Count the states in `states` that VIOLATE at least one predicate in `preds`
 *  (i.e. some conjunct returns false). Defaults to the baseline invariant. */
export function violationCount(
  states: readonly AbstractControlState[],
  preds: readonly IndInvPred[] = BASE_INDS,
): number {
  let n = 0;
  for (const s of states) {
    if (preds.some((p) => !p(s))) n += 1;
  }
  return n;
}

/**
 * The ADDITIONAL violations a strengthened certificate (BASE ∪ extraPreds)
 * would catch on `states` beyond the baseline — a non-negative near-miss count.
 *
 * NOTE ON SIGN: the strengthened set can only flag MORE states than the
 * baseline (AND-composition is monotone), so the meaningful ranking magnitude
 * is `violationCount(BASE ∪ extra) − violationCount(BASE) ≥ 0`. That is what is
 * returned here so every downstream consumer (`max(0, delta)`, `support = #{Δ>0}`,
 * `softGate` monotone-increasing in Δ) is well-defined; a strengthening that
 * adds no new catch on a window yields Δ = 0.
 */
export function delta(
  states: readonly AbstractControlState[],
  extraPreds: readonly IndInvPred[] = [],
): number {
  const base = violationCount(states, BASE_INDS);
  const strengthened = violationCount(states, [...BASE_INDS, ...extraPreds]);
  return strengthened - base;
}

export interface WindowStats {
  readonly mean: number;
  readonly variance: number;
  readonly support: number;
  readonly strength: number;
  readonly deltas: number[];
}

/**
 * Aggregate the per-window delta of a strengthening across many windows:
 *   mean      — average per-window delta
 *   variance  — POPULATION variance of the per-window deltas
 *   support   — # windows with delta > 0 (Prop2 multi-window guard)
 *   strength  — Σ max(0, delta) — total realized additional catch
 *   deltas    — the per-window deltas, in input order
 */
export function multiWindowStats(
  windows: readonly (readonly AbstractControlState[])[],
  extraPreds: readonly IndInvPred[] = [],
): WindowStats {
  const deltas = windows.map((w) => delta(w, extraPreds));
  const n = deltas.length;
  const mean = n === 0 ? 0 : deltas.reduce((a, b) => a + b, 0) / n;
  const variance =
    n === 0 ? 0 : deltas.reduce((a, d) => a + (d - mean) ** 2, 0) / n;
  const support = deltas.filter((d) => d > 0).length;
  const strength = deltas.reduce((a, d) => a + Math.max(0, d), 0);
  return { mean, variance, support, strength, deltas };
}

/**
 * Rank ranking-bearing items (anything carrying `support` + `strength`) by
 * realized strength, keeping only those supported across ≥ `kMin` windows and
 * with positive strength. Stable-ish: sorts DESC by strength. RANKING ONLY.
 */
export function rankByStrength<T extends { support: number; strength: number }>(
  items: readonly T[],
  kMin = 2,
): T[] {
  return items
    .filter((i) => i.support >= kMin && i.strength > 0)
    .slice()
    .sort((a, b) => b.strength - a.strength);
}

/**
 * The confidence gate g = σ(βΔ). Monotone increasing in Δ; used to LOG / RANK a
 * proposal's evidence, NEVER to admit or refuse traffic.
 */
export function softGate(d: number, beta = 5): number {
  return 1 / (1 + Math.exp(-beta * d));
}
