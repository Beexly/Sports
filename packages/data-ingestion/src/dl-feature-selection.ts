/**
 * Features selection in NBA outcome prediction through Deep Learning
 *
 * arXiv:2111.09695v1 · lane:markets · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Run a GSE feature-selection audit per league: horse race of single strength-summary features
 * (dynamic Elo K~=30, HFA~=40, 20% offseason regression; win frequency; net rating) vs rich box-
 * score feature sets under strict walk-forward protocol; encode the winner as the default feature
 * set (NBA prior: start from dynamic Elo, not box-score); also test Elo + Four-Factors
 * differentials as a hybrid.
 *
 * ACCEPTANCE GATE: ADAPT (weak) confirmed iff under strict walk-forward, Elo-based features match or beat Four-
 * Factors features on AUC (difference >= -0.005 tolerated given the paper's pooled-CV inflation);
 * if Four Factors win walk-forward, the paper's finding is a CV artifact — keep the audit harness.
 *
 * Ingest role: feature builder (deep-learning feature selection: permutation importance + SHAP-lite).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2111.09695v1" as const;
export const LANE = "markets" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT (weak) confirmed iff under strict walk-forward, Elo-based features match or beat Four-
 * Factors features on AUC (difference >= -0.005 tolerated given the paper's pooled-CV inflation);
 * if Four Factors win walk-forward, the paper's finding is a CV artifact — keep the audit harness.`;

export const CONFIG = {
  enabled: false,
  selection: "permutation importance + gradient attribution",
  retrainGate: "log-loss gain >= 0.004",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export type Matrix = readonly number[][];

/** Permutation importance for one feature column (drop in score). */
export function permutationImportance(
  X: Matrix,
  score: (X: Matrix) => number | null,
  feature: number,
  seed = 7,
): number | null {
  if (X.length === 0 || !Number.isInteger(feature) || feature < 0) return null;
  const d = X[0]?.length ?? 0;
  if (feature >= d) return null;
  const base = score(X);
  if (base === null) return null;
  let a = (seed >>> 0) || 1;
  const perm = X.map((row) => row[feature] ?? 0);
  for (let i = perm.length - 1; i > 0; i--) {
    a = (a * 1664525 + 1013904223) >>> 0;
    const j = a % (i + 1);
    const t = perm[i]!;
    perm[i] = perm[j]!;
    perm[j] = t;
  }
  const Xp = X.map((row, i) => row.map((v, j) => (j === feature ? perm[i] ?? v : v)));
  const pert = score(Xp);
  if (pert === null) return null;
  return base - pert;
}

/** Rank features by permutation importance. */
export function rankFeatures(
  X: Matrix,
  score: (X: Matrix) => number | null,
  features: readonly string[],
): Array<{ feature: string; importance: number }> | null {
  if (features.length === 0) return null;
  const d = X[0]?.length ?? 0;
  if (features.length !== d) return null;
  const out: Array<{ feature: string; importance: number }> = [];
  for (let j = 0; j < d; j++) {
    const imp = permutationImportance(X, score, j);
    if (imp === null) return null;
    out.push({ feature: features[j] ?? `f${j}`, importance: imp });
  }
  out.sort((a, b) => b.importance - a.importance);
  return out;
}

/** Gradient-lite attribution: |x * d(score)/dx| via finite differences. */
export function gradientAttribution(
  x: readonly number[],
  score: (x: readonly number[]) => number | null,
  eps = 1e-4,
): number[] | null {
  if (x.length === 0 || !x.every(isFiniteNumber) || !isFiniteNumber(eps) || eps <= 0) return null;
  const base = score(x);
  if (base === null) return null;
  const out: number[] = [];
  for (let j = 0; j < x.length; j++) {
    const xp = x.map((v, k) => (k === j ? v + eps : v));
    const sp = score(xp);
    if (sp === null) return null;
    out.push(Math.abs((x[j] ?? 0) * ((sp - base) / eps)));
  }
  return out;
}

/** Drop low-importance features under the gate. */
export function selectFeatures(
  ranked: ReadonlyArray<{ feature: string; importance: number }>,
  keepFrac = 0.5,
): string[] {
  if (ranked.length === 0 || !isFiniteNumber(keepFrac) || keepFrac <= 0 || keepFrac > 1) return [];
  const k = Math.max(1, Math.floor(ranked.length * keepFrac));
  return ranked.slice(0, k).map((r) => r.feature);
}
