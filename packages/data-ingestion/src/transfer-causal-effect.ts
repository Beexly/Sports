/**
 * Transfer Learning for Causal Effect Estimation
 *
 * arXiv:2305.09126v3 · lane:causal_injury · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Adopt the 'never naively merge domains' rule for cross-era/league causal questions (e.g., effect
 * of the new kickoff rule on expected return EPA): fit propensity + outcome nuisance on 2018-2023
 * source data, then l1 bias-correction of the difference on 2024-2025 target data, then DR plug-in
 * for the ACE (3-headed TARNet + DR variant) - with a pre-flight diagnostic: fit l1-regularized
 * propensity models in both domains and compare supports, proceeding only if the difference is
 * sparse; otherwise report target-only with wide uncertainty - and an adaptive l1-TCL extension
 * using source-domain fitted support overlap as empirical-Bayes l1 weights.
 *
 * ACCEPTANCE GATE: ADOPT l1-TCL for a GSE causal question only if the pre-flight support-overlap diagnostic shows a
 * sparse difference AND the semi-synthetic test shows <=0.7x target-only error; otherwise REJECT
 * transfer and report target-only estimates with honest uncertainty.
 *
 * Ingest role: feature builder (transfer learning for causal effect estimation: source->target reweight).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2305.09126v3" as const;
export const LANE = "causal_injury" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT l1-TCL for a GSE causal question only if the pre-flight support-overlap diagnostic shows a
 * sparse difference AND the semi-synthetic test shows <=0.7x target-only error; otherwise REJECT
 * transfer and report target-only estimates with honest uncertainty.`;

export const CONFIG = {
  enabled: false,
  method: "importance-weighted transfer",
  source: "college tracking",
  target: "NFL",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface TransferUnit {
  readonly x: readonly number[];
  readonly w: 0 | 1;
  readonly y: number;
  readonly source: boolean;
}

export function isTransferUnit(x: unknown): x is TransferUnit {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    Array.isArray(o["x"]) && (o["x"] as unknown[]).every(isFiniteNumber) &&
    (o["w"] === 0 || o["w"] === 1) &&
    isFiniteNumber(o["y"]) &&
    typeof o["source"] === "boolean"
  );
}

/** Density-ratio weights via logistic domain classifier (offline recipe hook). */
export function densityRatioWeights(
  units: readonly TransferUnit[],
  domainScore: (x: readonly number[]) => number | null,
): number[] | null {
  if (units.length === 0) return null;
  const out: number[] = [];
  for (const u of units) {
    const s = domainScore(u.x);
    if (s === null || !isFiniteNumber(s) || s <= 0 || s >= 1) return null;
    out.push(u.source ? (1 - s) / s : 1);
  }
  return out;
}

/** Weighted difference-in-means ATE on the target domain. */
export function weightedATE(units: readonly unknown[], weights: readonly number[]): number | null {
  const v: TransferUnit[] = [];
  for (const u of units) if (isTransferUnit(u)) v.push(u);
  if (v.length === 0 || weights.length !== v.length) return null;
  if (!weights.every((w) => isFiniteNumber(w) && w >= 0)) return null;
  let num1 = 0;
  let den1 = 0;
  let num0 = 0;
  let den0 = 0;
  for (let i = 0; i < v.length; i++) {
    const u = v[i]!;
    const w = weights[i] ?? 0;
    if (u.source) continue;
    if (u.w === 1) {
      num1 += w * u.y;
      den1 += w;
    } else {
      num0 += w * u.y;
      den0 += w;
    }
  }
  if (den1 === 0 || den0 === 0) return null;
  return num1 / den1 - num0 / den0;
}

/** Effective sample size of the weights (transfer diagnostic). */
export function effectiveSampleSize(weights: readonly number[]): number | null {
  if (weights.length === 0 || !weights.every((w) => isFiniteNumber(w) && w >= 0)) return null;
  const s1 = weights.reduce((a, b) => a + b, 0);
  const s2 = weights.reduce((a, b) => a + b * b, 0);
  if (s2 === 0) return null;
  return (s1 * s1) / s2;
}
