/**
 * Match Chat: Real Time Generative AI and Generative Computing for Tennis
 *
 * arXiv:2509.12592v1 · lane:experimental · verdict:ADAPT · owner:Hermes · doctrine:PROPRIETARY_EDGE
 *
 * Mechanism: Experiment statistics for offline evaluation: ablation gaps (with-module minus without-module), Cohen's d effect sizes, normal-approximation sign-test p-values, and mean confidence intervals for backtest reporting.
 *
 * Improvement (record):
 * GSE ports the live-likelihood momentum-blend pattern to NFL: pre-game engine win probability anchored with a per-drive momentum term (cumulative EPA delta vs expected, leverage-weighted by score differential x time remaining) and calibrated decay.
 *
 * ACCEPTANCE GATE:
 * Adopt the momentum-blend live model as GSE's in-play WP/spread component if on the 2022-2024 test window it beats nflfastR in-game WP on mean log-loss by >=0.005 AND the fitted decay lambda > 0.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: offline experiment reporter. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2509.12592v1" as const;
export const LANE = "experimental" as const;
export const VERDICT = "ADAPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt the momentum-blend live model as GSE's in-play WP/spread component if on the 2022-2024 test window it beats nflfastR in-game WP on mean log-loss by >=0.005 AND the fitted decay lambda > 0.`;

/**
 * Disabled by default: the acceptance gate above requires live/backtest data not
 * available inside this module. Flip only after the gate is evaluated offline and
 * a human approves wiring into a live ingestion path.
 */
export const ENABLED = false;
/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Standard normal CDF via the Abramowitz-Stegun approximation. */
function normalCdfApprox(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-(x * x) / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (x > 0) p = 1 - p;
  return p;
}

/** Ablation gap: metric with the module minus metric without it. */
export function ablationGap(withModule: number, withoutModule: number): number | null {
  if (!isFiniteNumber(withModule) || !isFiniteNumber(withoutModule)) return null;
  return withModule - withoutModule;
}

/** Cohen's d effect size between two samples (pooled standard deviation). */
export function cohensD(a: number[], b: number[]): number | null {
  if (a.length < 2 || b.length < 2) return null;
  const all = [...a, ...b];
  if (!all.every(isFiniteNumber)) return null;
  const mean = (v: number[]): number => v.reduce((s, x) => s + x, 0) / v.length;
  const ma = mean(a);
  const mb = mean(b);
  const va = a.reduce((s, x) => s + (x - ma) * (x - ma), 0) / (a.length - 1);
  const vb = b.reduce((s, x) => s + (x - mb) * (x - mb), 0) / (b.length - 1);
  const sp = Math.sqrt(((a.length - 1) * va + (b.length - 1) * vb) / (a.length + b.length - 2));
  if (sp === 0) return null;
  return (ma - mb) / sp;
}

/** Two-sided sign-test p-value via the normal approximation. */
export function signTestPValue(wins: number, trials: number): number | null {
  if (!Number.isInteger(wins) || !Number.isInteger(trials)) return null;
  if (wins < 0 || wins > trials || trials === 0) return null;
  const z = (wins - trials / 2) / Math.sqrt(trials / 4);
  return 2 * (1 - normalCdfApprox(Math.abs(z)));
}

/** Sample mean with a z-based confidence interval. */
export function meanCi(values: number[], z = 1.96): { mean: number; lo: number; hi: number } | null {
  if (values.length === 0 || !values.every(isFiniteNumber)) return null;
  if (!isFiniteNumber(z) || z <= 0) return null;
  const m = values.reduce((s, v) => s + v, 0) / values.length;
  const sd = Math.sqrt(values.reduce((s, v) => s + (v - m) * (v - m), 0) / values.length);
  const se = sd / Math.sqrt(values.length);
  return { mean: m, lo: m - z * se, hi: m + z * se };
}
