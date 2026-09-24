/**
 * Analyzing Skill Element in Online Fantasy Cricket
 *
 * arXiv:2512.22254v1 · lane:props_dfs · verdict:ADAPT · owner:Hermes · doctrine:SITUATIONAL
 *
 * Mechanism: Props/DFS edge primitives: projection-vs-line edge percent, salary efficiency (projected points per $1k), ownership-fade scores, and stack correlation boosts.
 *
 * Improvement (record):
 * GSE's DFS optimizer splits lineup generation by contest structure: GPP lineups maximize ceiling via stack-heavy, low-ownership diverse lineups while double-ups use high-floor median-optimized lineups.
 *
 * ACCEPTANCE GATE:
 * ADOPT only if the backtest reproduces the predicted ceiling/median crossover with statistical significance over >=1 full season and >=10% ROI difference between matched and mismatched strategy-contest pairs.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Ingest role: props/DFS feature builder. Live data: NO — pure offline transforms over stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null.
 */

export const ARXIV_ID = "2512.22254v1" as const;
export const LANE = "props_dfs" as const;
export const VERDICT = "ADAPT" as const;

/** Numeric acceptance gate, verbatim from the record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT only if the backtest reproduces the predicted ceiling/median crossover with statistical significance over >=1 full season and >=10% ROI difference between matched and mismatched strategy-contest pairs.`;

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
