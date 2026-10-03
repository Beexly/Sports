/**
 * A Feature Selection Method Based on Shapley Values Robust to Concept Shift in Regression
 *
 * arXiv:2304.14774v3 · lane:auto_feature_eng · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Run SHAPEffects backward elimination on the gse-lab metric set (~60-80 features) with LightGBM +
 * TreeSHAP, margin-of-victory-vs-spread as the regression target: train on seasons <= S-2,
 * validation = season S-1 (current regime), q_low/q_high in {(0.25,0.75),(0.1,0.9)}, keeping the
 * better-validation config - outputting a pruned feature set per season plus a 'regime-casualty
 * report' of eliminated features with their negative-influence magnitude for the DFS packet - with
 * adaptive quantile thresholds set from the validation error distribution's own tail mass, and a
 * classification extension via the same local logic on log-loss residuals (grouping by signed log-
 * loss residual quantiles).
 *
 * ACCEPTANCE GATE: Adopt SHAPEffects pruning iff on the 2024 and 2025 held-out test seasons it reduces MAE vs the
 * full-feature baseline by >= 0.15 points AND beats Boruta/Lasso on at least one of the two
 * seasons, with the elimination list stable (>=50% overlap) across the two runs; reject if it
 * merely matches SOTA selectors, eliminates >40% of features, or the dropped-feature sign check
 * fails.
 *
 * Ingest role: feature builder (Shapley-value feature selection robust to concept shift).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2304.14774v3" as const;
export const LANE = "auto_feature_eng" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt SHAPEffects pruning iff on the 2024 and 2025 held-out test seasons it reduces MAE vs the
 * full-feature baseline by >= 0.15 points AND beats Boruta/Lasso on at least one of the two
 * seasons, with the elimination list stable (>=50% overlap) across the two runs; reject if it
 * merely matches SOTA selectors, eliminates >40% of features, or the dropped-feature sign check
 * fails.`;

export const CONFIG = {
  enabled: false,
  method: "Shapley values under concept shift",
  maxFeatures: 64,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

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
 * Monte-Carlo Shapley values for a set function v (characteristic function).
 * v(subset) -> worth; null-safe.
 */
export function shapleyValues(
  features: readonly string[],
  v: (subset: ReadonlySet<string>) => number | null,
  draws = 200,
  seed = 7,
): Record<string, number> | null {
  if (features.length === 0 || !Number.isInteger(draws) || draws <= 0) return null;
  const rng = mulberry32(seed);
  const phi: Record<string, number> = {};
  for (const f of features) phi[f] = 0;
  for (let d = 0; d < draws; d++) {
    const perm = [...features];
    for (let i = perm.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = perm[i]!;
      perm[i] = perm[j]!;
      perm[j] = t;
    }
    const seen = new Set<string>();
    let prev = v(seen);
    if (prev === null) return null;
    for (const f of perm) {
      seen.add(f);
      const cur = v(seen);
      if (cur === null) return null;
      phi[f] = (phi[f] ?? 0) + (cur - prev);
      prev = cur;
    }
  }
  for (const f of features) phi[f] = (phi[f] ?? 0) / draws;
  return phi;
}

/** Concept-shift robustness: min Shapley across time windows. */
export function shiftRobustShapley(
  windows: ReadonlyArray<Record<string, number>>,
): Record<string, number> | null {
  if (windows.length === 0) return null;
  const keys = Object.keys(windows[0] ?? {});
  if (keys.length === 0) return null;
  const out: Record<string, number> = {};
  for (const k of keys) {
    const vals = windows.map((w) => w[k]);
    if (vals.some((x) => !isFiniteNumber(x ?? NaN))) return null;
    out[k] = Math.min(...(vals as number[]));
  }
  return out;
}

/** Select top-k by robust Shapley. */
export function selectTopK(robust: Record<string, number>, k: number): string[] {
  if (!Number.isInteger(k) || k <= 0) return [];
  return Object.entries(robust)
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([name]) => name);
}
