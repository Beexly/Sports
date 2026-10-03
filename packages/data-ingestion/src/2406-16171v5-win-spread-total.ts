/**
 * Exploring the Difficulty of Estimating Win Probability: A Simulation Study
 *
 * arXiv:2406.16171v5 · lane:win_spread_total · verdict:ADOPT · owner:Mimo
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Market-mapping primitives: logistic spread-to-win-probability conversion, over probability from a
 * normal total model centered on the projected total (Abramowitz-Stegun CDF), and push probability
 * from a key-number table with a flat fallback.
 *
 * Improvement (wiring record): Replace the standard bootstrap on the win-probability model with a game-clustered bootstrap (and
 * extend to drive-nested hierarchical resampling), because game-level clustering is what determines
 * whether WP confidence intervals hold their nominal coverage under intra-game dependence.
 *
 * ACCEPTANCE GATE: ADOPT game-clustered resampling if, pre-registered: at the chosen φ, pooled empirical coverage ≥
 * 0.85 (nominal 90%) with mean width ≤ 1.8× the standard-bootstrap width, on at least 3 of 4 held-out
 * seasons. REJECT φ-tuning (keep simple game-cluster bootstrap, φ = 1) if no φ clears 0.85 coverage or
 * the width penalty exceeds 2×.
 *
 * Ingest role: market mapping (spread to win prob, total to over prob, push table).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2406.16171v5" as const;
export const LANE = "win_spread_total" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT game-clustered resampling if, pre-registered: at the chosen φ, pooled empirical coverage ≥ 0.85 (nominal 90%) with mean width ≤ 1.8× the standard-bootstrap width, on at least 3 of 4 held-out seasons. REJECT φ-tuning (keep simple game-cluster bootstrap, φ = 1) if no φ clears 0.85 coverage or the width penalty exceeds 2×.`;

/** Disabled by default: additive utility only, never auto-wired into a live ingestion path. */
export const ENABLED = false as const;

export const CONFIG = {
  enabled: false,
  method: "logistic spread mapping + normal total model + key-number push table",
  spreadScale: 0.28,
  totalSd: 13.5,
} as const;
/** Numeric guard: rejects NaN, Infinity, and non-numbers. */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Implied win probability for the team laying `spread` (negative spread = favorite). */
export function spreadToWinProb(spread: number): number | null {
  if (!isFiniteNumber(spread)) return null;
  return 1 / (1 + Math.exp(spread * 0.28));
}

/** Standard normal CDF via the Abramowitz-Stegun erf approximation. */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-(z * z) / 2);
  const p =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z >= 0 ? 1 - p : p;
}

/** Over probability given the market total and the model-projected total. */
export function totalToOverProb(marketTotal: number, projectedTotal: number, sd = 13.5): number | null {
  if (!isFiniteNumber(marketTotal) || !isFiniteNumber(projectedTotal)) return null;
  if (!isFiniteNumber(sd) || sd <= 0) return null;
  return 1 - normalCdf((marketTotal - projectedTotal) / sd);
}

/** Push probability from a key-number table, with a flat fallback for off-key numbers. */
export function pushProbability(spread: number): number | null {
  if (!isFiniteNumber(spread)) return null;
  const key = Math.abs(Math.round(spread));
  const table: Record<number, number> = {
    0: 0.0,
    1: 0.03,
    2: 0.03,
    3: 0.09,
    4: 0.04,
    5: 0.03,
    6: 0.05,
    7: 0.06,
    8: 0.03,
    9: 0.02,
    10: 0.04,
  };
  const v = table[key];
  return v === undefined ? 0.015 : v;
}
