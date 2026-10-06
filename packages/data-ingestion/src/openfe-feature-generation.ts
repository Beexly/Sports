/**
 * OpenFE: Automated Feature Generation with Expert-level Performance
 *
 * arXiv:2211.12507 · lane:auto_feature_eng · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build 'GSE-OpenFE' as a batch feature-discovery service: game/team-game rows from nflverse
 * 2006-2024, expansion operators restricted to time-safe ones (GroupByThenMean/Std/Min/Max/Count
 * with expanding-window semantics keyed by team_id and season — computed only from prior games),
 * binary ops on rate features, zero-guards; FeatureBoost (LightGBM base + GBDT residual fitter per
 * candidate, delta = train-loss reduction, successive pruning over season blocks); Stage II
 * attribution; survivors promoted to the feature store with provenance (operator, keys, window);
 * offline weekly regeneration, features frozen per season — then make FeatureBoost time-aware and
 * residual-targeted: score candidates per rolling-season block requiring delta > 0 in >=3 of 4
 * validation seasons (stability filter killing era-specific flukes), with permutation importance
 * in validation-season log-loss as the final filter instead of MDI.
 *
 * ACCEPTANCE GATE: ADOPT the discovered feature set iff test log-loss improves by >= 0.003 on the 2024 NFL held-out
 * vs the hand-built baseline, with zero leakage violations (every GroupBy feature provably
 * computable from pre-game data; audit via recomputation on a row-sample); REJECT if gain < 0.003,
 * any surviving feature fails the time-safety audit, or validation-selected features degrade test
 * (selection overfit).
 *
 * Ingest role: feature builder (OpenFE automated feature generation: candidate ops + successive halving).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2211.12507" as const;
export const LANE = "auto_feature_eng" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the discovered feature set iff test log-loss improves by >= 0.003 on the 2024 NFL held-out
 * vs the hand-built baseline, with zero leakage violations (every GroupBy feature provably
 * computable from pre-game data; audit via recomputation on a row-sample); REJECT if gain < 0.003,
 * any surviving feature fails the time-safety audit, or validation-selected features degrade test
 * (selection overfit).`;

export const CONFIG = {
  enabled: false,
  method: "OpenFE",
  candidateOps: ["add", "sub", "mul", "div", "groupby-mean"],
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export type FeOp = "add" | "sub" | "mul" | "div" | "groupby-mean";

export interface FeCandidate {
  readonly name: string;
  readonly op: FeOp;
  readonly parents: readonly string[];
}

/** Apply a binary op safely (div guards zero). */
export function applyBinaryOp(a: readonly number[], b: readonly number[], op: FeOp): number[] | null {
  if (a.length !== b.length || a.length === 0) return null;
  if (!a.every(isFiniteNumber) || !b.every(isFiniteNumber)) return null;
  switch (op) {
    case "add":
      return a.map((v, i) => v + (b[i] ?? 0));
    case "sub":
      return a.map((v, i) => v - (b[i] ?? 0));
    case "mul":
      return a.map((v, i) => v * (b[i] ?? 0));
    case "div":
      return a.map((v, i) => {
        const d = b[i] ?? 0;
        return d === 0 ? 0 : v / d;
      });
    default:
      return null;
  }
}

/** Groupby-mean encoding. */
export function groupbyMean(values: readonly number[], groups: readonly string[]): Map<string, number> | null {
  if (values.length !== groups.length || values.length === 0) return null;
  if (!values.every(isFiniteNumber)) return null;
  const sums = new Map<string, { s: number; n: number }>();
  for (let i = 0; i < values.length; i++) {
    const g = groups[i] ?? "";
    const e = sums.get(g) ?? { s: 0, n: 0 };
    e.s += values[i] ?? 0;
    e.n++;
    sums.set(g, e);
  }
  const out = new Map<string, number>();
  for (const [g, e] of sums) out.set(g, e.s / e.n);
  return out;
}

/** Successive halving: keep top half by score each round. */
export function successiveHalving(
  candidates: ReadonlyArray<{ name: string; score: number }>,
  rounds = 2,
): string[] | null {
  if (candidates.length === 0 || !Number.isInteger(rounds) || rounds <= 0) return null;
  if (!candidates.every((c) => typeof c.name === "string" && isFiniteNumber(c.score))) return null;
  let pool = [...candidates].sort((a, b) => b.score - a.score);
  for (let r = 0; r < rounds && pool.length > 1; r++) {
    pool = pool.slice(0, Math.max(1, Math.ceil(pool.length / 2)));
  }
  return pool.map((c) => c.name);
}

/** Generate all binary-op candidates from a feature list. */
export function candidateNames(features: readonly string[], ops: readonly FeOp[]): FeCandidate[] {
  const out: FeCandidate[] = [];
  for (let i = 0; i < features.length; i++) {
    for (let j = i + 1; j < features.length; j++) {
      for (const op of ["add", "sub", "mul", "div"] as FeOp[]) {
        if (!ops.includes(op)) continue;
        out.push({ name: `${features[i]}_${op}_${features[j]}`, op, parents: [features[i] ?? "", features[j] ?? ""] });
      }
    }
  }
  return out;
}
