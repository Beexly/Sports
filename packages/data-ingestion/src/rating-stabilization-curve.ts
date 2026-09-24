/**
 * Who's good this year? Comparing the Information Content of Games in the Four Major US Sports
 *
 * arXiv:1501.07179v1 · lane:tracking · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Produce an empirical stabilization curve for NFL ratings from the paper's information-content
 * analysis: chronological rolling-origin evaluation (fit decay-weighted Bradley-Terry + margin-of-
 * victory on weeks 1..t, predict week t+1, t=4..17, 2015-2024), sweep decay half-lives {2,4,8,16
 * weeks, infinite}, and adopt a finite half-life for GSE's in-season team ratings -- telling
 * content 'after week X, ratings are signal' -- plus learn per-team decay rates (contenders decay
 * slowly, rebuilders fast).
 *
 * ACCEPTANCE GATE: ADOPT a finite decay half-life for GSE in-season ratings IF the best finite half-life beats the
 * static BT by >= 0.5% log-loss on the 2015-2024 rolling-origin test AND the stabilization curve
 * identifies a week after which marginal information gain per game drops below 0.2pp accuracy.
 *
 * Ingest role: feature builder (decay half-life sweep + stabilization-week diagnostic).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1501.07179v1" as const;
export const LANE = "tracking" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT a finite decay half-life for GSE in-season ratings IF the best finite half-life beats the
 * static BT by >= 0.5% log-loss on the 2015-2024 rolling-origin test AND the stabilization curve
 * identifies a week after which marginal information gain per game drops below 0.2pp accuracy.`;

export const CONFIG = {
  enabled: false,
  halfLives: [2, 4, 8, 16, Number.POSITIVE_INFINITY],
  marginalGainThresholdPp: 0.2,
  minLogLossGain: 0.005,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface RollingEvalPoint {
  readonly week: number;
  readonly halfLifeWeeks: number;
  readonly logLoss: number;
}

export function isRollingEvalPoint(x: unknown): x is RollingEvalPoint {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    isFiniteNumber(o["week"]) &&
    typeof o["halfLifeWeeks"] === "number" &&
    !Number.isNaN(o["halfLifeWeeks"]) &&
    isFiniteNumber(o["logLoss"])
  );
}

/** Mean log-loss per half-life across the rolling-origin sweep. */
export function halfLifeSweep(points: readonly unknown[]): Array<{ halfLifeWeeks: number; meanLogLoss: number; n: number }> {
  const groups = new Map<number, number[]>();
  for (const p of points) {
    if (!isRollingEvalPoint(p)) continue;
    const g = groups.get(p.halfLifeWeeks) ?? [];
    g.push(p.logLoss);
    groups.set(p.halfLifeWeeks, g);
  }
  const out: Array<{ halfLifeWeeks: number; meanLogLoss: number; n: number }> = [];
  for (const [hl, losses] of groups) {
    out.push({ halfLifeWeeks: hl, meanLogLoss: losses.reduce((a, b) => a + b, 0) / losses.length, n: losses.length });
  }
  out.sort((a, b) => a.halfLifeWeeks - b.halfLifeWeeks);
  return out;
}

/** Best finite half-life; null if static (Infinity) wins or data missing. */
export function bestFiniteHalfLife(points: readonly unknown[]): number | null {
  const sweep = halfLifeSweep(points);
  if (sweep.length === 0) return null;
  const finite = sweep.filter((s) => Number.isFinite(s.halfLifeWeeks));
  if (finite.length === 0) return null;
  let best = finite[0]!;
  for (const s of finite) if (s.meanLogLoss < best.meanLogLoss) best = s;
  const staticEntry = sweep.find((s) => !Number.isFinite(s.halfLifeWeeks));
  if (staticEntry && staticEntry.meanLogLoss <= best.meanLogLoss) return null;
  return best.halfLifeWeeks;
}

/**
 * Gate (a): best finite half-life beats static BT by >= 0.5% relative log-loss.
 */
export function finiteBeatsStatic(points: readonly unknown[], minRelativeGain = 0.005): boolean {
  const sweep = halfLifeSweep(points);
  const finite = sweep.filter((s) => Number.isFinite(s.halfLifeWeeks));
  const staticEntry = sweep.find((s) => !Number.isFinite(s.halfLifeWeeks));
  if (finite.length === 0 || !staticEntry) return false;
  const best = Math.min(...finite.map((s) => s.meanLogLoss));
  return (staticEntry.meanLogLoss - best) / staticEntry.meanLogLoss >= minRelativeGain;
}

/**
 * Stabilization week: first week after which the marginal accuracy gain per
 * game drops below thresholdPp percentage points (gate (b)).
 */
export function stabilizationWeek(marginalAccuracyGainsPp: readonly number[], thresholdPp = 0.2): number | null {
  if (marginalAccuracyGainsPp.length === 0) return null;
  if (!marginalAccuracyGainsPp.every(isFiniteNumber)) return null;
  for (let i = 0; i < marginalAccuracyGainsPp.length; i++) {
    if ((marginalAccuracyGainsPp[i] ?? Infinity) < thresholdPp) return i + 1;
  }
  return null;
}
