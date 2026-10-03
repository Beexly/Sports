/**
 * Rethinking Player Evaluation in Sports: Goals Above Expectation and Beyond
 *
 * arXiv:2509.20083v2 · lane:props_dfs · verdict:ADAPT · owner:Hermes · doctrine:SITUATIONAL
 *
 * Mechanism: Props/DFS edge primitives: projection-vs-line edge percent, salary efficiency (projected points per $1k), ownership-fade scores, and stack correlation boosts.
 *
 * Improvement (record):
 * GSE publishes a weekly QB leaderboard of robust CATE estimates (rCPAE with valid CIs) correcting for selection bias via per-QB propensity scores — a QB evaluation product grounded in causal inference.
 *
 * ACCEPTANCE GATE:
 * ADOPT as a GSE QB-evaluation product only if: (a) the reproduction matches the paper's ordering within the top 10 (+-2 rank tolerance), (b) >=5 QBs show BH-significant positive effects per season, and (c) the robustness slop checks pass.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: props/DFS feature builder. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2509.20083v2" as const;
export const LANE = "props_dfs" as const;
export const VERDICT = "ADAPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT as a GSE QB-evaluation product only if: (a) the reproduction matches the paper's ordering within the top 10 (+-2 rank tolerance), (b) >=5 QBs show BH-significant positive effects per season, and (c) the robustness slop checks pass.`;

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

/** Edge of a projection over a prop line, in percent of |line|. */
export function projectionEdgePct(projection: number, line: number): number | null {
  if (!isFiniteNumber(projection) || !isFiniteNumber(line) || line === 0) return null;
  return ((projection - line) / Math.abs(line)) * 100;
}

/** Projected fantasy points per $1k of DFS salary. */
export function salaryEfficiency(projection: number, salary: number): number | null {
  if (!isFiniteNumber(projection) || !isFiniteNumber(salary) || salary <= 0) return null;
  return (projection / salary) * 1000;
}

/** Ownership-faded projection: value that survives high roster percentages. */
export function ownershipFadeScore(projection: number, ownershipPct: number): number | null {
  if (!isFiniteNumber(projection)) return null;
  if (!isFiniteNumber(ownershipPct) || ownershipPct < 0 || ownershipPct > 100) return null;
  return projection * (1 - ownershipPct / 100);
}

/** Stacking boost: scale a base projection by teammate correlation in [-1,1]. */
export function stackCorrelationBoost(baseProj: number, correlation: number): number | null {
  if (!isFiniteNumber(baseProj)) return null;
  if (!isFiniteNumber(correlation) || correlation < -1 || correlation > 1) return null;
  return baseProj * (1 + correlation);
}
