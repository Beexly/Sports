/**
 * Continuous Ensemble Weather Forecasting with Diffusion Models
 *
 * arXiv:2410.05431v2 · lane:mixed · verdict:ADAPT · owner:Mimo
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Ensemble combination primitives: normalized weighted blending of per-model prediction vectors,
 * inverse-variance stacking weights, and rank blending that averages each candidate's rank across
 * rankers.
 *
 * Improvement (wiring record): Adopt a continuous-trajectory diffusion weather forecaster for in-game conditions, conditioned on
 * the pregame spread/total as a market-consistency constraint so the same ensemble stays calibrated to
 * the closing line and serves both live-betting win probability and pregame pricing.
 *
 * ACCEPTANCE GATE: ADOPT the continuous-trajectory forecaster if, on 2024, its CRPS at 30- and 60-minute leads beats
 * the per-horizon baselines by ≥5% AND sampled trajectories are monotone-coherent (no lead-time
 * crossing artifacts in ≥95% of sampled members).
 *
 * Ingest role: ensemble combination (weighted blends, inverse-variance stacking, rank blends).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2410.05431v2" as const;
export const LANE = "mixed" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the continuous-trajectory forecaster if, on 2024, its CRPS at 30- and 60-minute leads beats the per-horizon baselines by ≥5% AND sampled trajectories are monotone-coherent (no lead-time crossing artifacts in ≥95% of sampled members).`;

/** Disabled by default: additive utility only, never auto-wired into a live ingestion path. */
export const ENABLED = false as const;

export const CONFIG = {
  enabled: false,
  method: "normalized weighted blend + inverse-variance stacking",
} as const;
/** Numeric guard: rejects NaN, Infinity, and non-numbers. */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Weighted blend of per-model prediction vectors; weights are normalized. */
export function blendEnsemble(
  preds: ReadonlyArray<readonly number[]>,
  weights: readonly number[],
): number[] | null {
  if (preds.length === 0 || preds.length !== weights.length) return null;
  if (!weights.every((w) => isFiniteNumber(w) && w >= 0)) return null;
  const first = preds[0];
  if (first === undefined) return null;
  const n = first.length;
  if (n === 0 || !preds.every((p) => p.length === n && p.every(isFiniteNumber))) return null;
  const wSum = weights.reduce((a, b) => a + b, 0);
  if (wSum <= 0) return null;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (let m = 0; m < preds.length; m++) acc += (weights[m] ?? 0) * (preds[m]?.[i] ?? 0);
    out.push(acc / wSum);
  }
  return out;
}

/** Inverse-variance stacking weights: w_i proportional to 1/variance_i. */
export function inverseVarianceWeights(variances: readonly number[]): number[] | null {
  if (variances.length === 0) return null;
  if (!variances.every((v) => isFiniteNumber(v) && v > 0)) return null;
  const inv = variances.map((v) => 1 / v);
  const sum = inv.reduce((a, b) => a + b, 0);
  if (sum <= 0) return null;
  return inv.map((v) => v / sum);
}

/** Rank blend: average each candidate's rank across rankers (lower = better). */
export function rankBlend(rankings: ReadonlyArray<readonly number[]>): number[] | null {
  if (rankings.length === 0) return null;
  const first = rankings[0];
  if (first === undefined) return null;
  const n = first.length;
  if (n === 0 || !rankings.every((r) => r.length === n && r.every(isFiniteNumber))) return null;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (const r of rankings) acc += r[i] ?? 0;
    out.push(acc / rankings.length);
  }
  return out;
}
