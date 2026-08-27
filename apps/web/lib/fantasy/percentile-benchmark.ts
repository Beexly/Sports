/**
 * DFS lineup percentile benchmark — R&D / ops, offline only.
 *
 * Ports the VALIDATION METHOD from arXiv:2309.15253 (Mahoney & Paniak,
 * "Method and Validation for Optimal Lineup Creation for Daily Fantasy
 * Football Using Machine Learning and Linear Programming") — not their
 * solver (`dfs-optimizer.ts`'s exact DP dominates their MILP: native FLEX,
 * exact stacking, deterministic, and now the DK two-game rule they omitted)
 * and not their NN (it underperformed its own validation — see
 * docs/ops/edge/2026-08-26-paper-spec-dfs-milp-percentile.md §5). What ports
 * is the honesty move: publish the lineup's percentile against a real field,
 * with n and a bootstrap CI, the same unfakeable posture as the Kill Ledger.
 * Their own headline (median ≈ 31st percentile vs the real DK field) is the
 * published academic baseline any GSE number should be compared against.
 *
 * Pure and deterministic — no network, no DB, no unseeded randomness
 * anywhere in this file (seeded via `mulberry32` from
 * @sports/prediction-engine, the same generator already used across the
 * edge-lab). Real-money contest
 * entry (even the paper's $0.25 stakes) stays a founder action; this module
 * only scores an already-settled lineup against an already-collected field,
 * or generates a seeded random-lineup control.
 */

import { mulberry32 } from "@sports/prediction-engine";
import { DFS_SLOTS, SALARY_CAP, type DfsPlayer, type DfsPos } from "./dfs-slate";
import type { Lineup } from "./dfs-optimizer";

const FLEX_ELIGIBLE: readonly DfsPos[] = ["RB", "WR", "TE"];

// ---------------------------------------------------------------------------
// fieldPercentile — percentile rank + bootstrap 95% CI
// ---------------------------------------------------------------------------

export interface FieldPercentileResult {
  /** Percentile rank of the lineup within the field, 0-100. Ties split evenly (the "mean rank" convention). */
  readonly percentile: number;
  /** Bootstrap 95% CI on that percentile, resampling the field with replacement. */
  readonly ci95: readonly [number, number];
  readonly n: number;
}

function percentileRank(value: number, sample: readonly number[]): number {
  let below = 0;
  let equal = 0;
  for (const v of sample) {
    if (v < value) below++;
    else if (v === value) equal++;
  }
  return (100 * (below + 0.5 * equal)) / sample.length;
}

/**
 * The field is a SAMPLE of a broader population of possible entries (2,300–
 * 37,300 users/week in the source paper) — the true population percentile is
 * uncertain, and that uncertainty is what the CI reports: resample the field
 * with replacement `resamples` times (default 10,000, matching the paper's
 * §2.4), recompute the lineup's percentile against each resample, and take
 * the 2.5th/97.5th percentiles of that bootstrap distribution (nearest-rank).
 * `fieldFpts` must already exclude zero-FPTS entries (scratches/no-shows) —
 * this function does not filter; see the module docstring on caller
 * responsibility for that upstream step.
 */
export function fieldPercentile(
  lineupFpts: number,
  fieldFpts: readonly number[],
  opts: { readonly seed: number; readonly resamples?: number },
): FieldPercentileResult {
  const n = fieldFpts.length;
  if (n === 0) {
    throw new RangeError("fieldPercentile: fieldFpts must be non-empty");
  }
  const resamples = opts.resamples ?? 10_000;
  if (!Number.isInteger(resamples) || resamples < 1) {
    throw new RangeError(`fieldPercentile: resamples must be a positive integer, got ${resamples}`);
  }

  const percentile = percentileRank(lineupFpts, fieldFpts);

  const rng = mulberry32(opts.seed);
  const bootstrap = new Array<number>(resamples);
  for (let b = 0; b < resamples; b++) {
    const resample = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      resample[i] = fieldFpts[Math.floor(rng() * n)]!;
    }
    bootstrap[b] = percentileRank(lineupFpts, resample);
  }
  bootstrap.sort((a, b) => a - b);
  // Nearest-rank index for the 2.5th percentile: Math.floor(0.025*resamples)
  // is one order statistic too high whenever 0.025*resamples lands exactly
  // on an integer (e.g. resamples=200 -> 5, the 6th sorted value, when the
  // 2.5th nearest-rank result is the 5th).
  const loIdx = Math.max(0, Math.ceil(0.025 * resamples) - 1);
  const hiIdx = Math.min(resamples - 1, Math.ceil(0.975 * resamples) - 1);

  return { percentile, ci95: [bootstrap[loIdx]!, bootstrap[hiIdx]!], n };
}

// ---------------------------------------------------------------------------
// randomFeasibleLineups — seeded random-lineup control (the paper's other baseline)
// ---------------------------------------------------------------------------

export interface RandomLineupOpts {
  readonly count: number;
  /** Salary floor for a "feasible" random lineup — paper: 90% of cap. */
  readonly minSalary?: number;
  readonly seed: number;
  /** Safety bound on retries per lineup before giving up on that slot — a real pool never needs more than a handful. */
  readonly maxAttemptsPerLineup?: number;
}

export interface RandomLineupResult {
  readonly lineups: readonly Lineup[];
  readonly requested: number;
  /** True when fewer feasible random lineups were found than requested (pool too thin at this salary floor within the attempt budget). */
  readonly partial: boolean;
}

/**
 * Generate `opts.count` random (NOT optimized) feasible lineups: for each
 * roster slot in `DFS_SLOTS` order, draw uniformly at random among eligible,
 * not-yet-used players, then keep the lineup only if total salary lands in
 * [minSalary, SALARY_CAP] — post-hoc salary filtering, exactly as the source
 * paper describes generating then filtering 35,000 random lineups. A slot
 * with zero eligible candidates is a genuine pool-shape problem (not a
 * salary issue) and throws immediately rather than silently degrading.
 */
export function randomFeasibleLineups(
  pool: readonly DfsPlayer[],
  opts: RandomLineupOpts,
): RandomLineupResult {
  if (!Number.isInteger(opts.count) || opts.count < 0) {
    throw new RangeError(`randomFeasibleLineups: count must be a non-negative integer, got ${opts.count}`);
  }
  const minSalary = opts.minSalary ?? 0.9 * SALARY_CAP;
  const maxAttemptsPerLineup = opts.maxAttemptsPerLineup ?? 200;
  if (!Number.isInteger(maxAttemptsPerLineup) || maxAttemptsPerLineup < 1) {
    throw new RangeError(`randomFeasibleLineups: maxAttemptsPerLineup must be a positive integer, got ${maxAttemptsPerLineup}`);
  }
  const rng = mulberry32(opts.seed);

  const drawOne = (): Lineup | null => {
    const used = new Set<string>();
    const chosen: DfsPlayer[] = [];
    for (const slot of DFS_SLOTS) {
      const eligiblePos: readonly DfsPos[] = slot === ("FLEX" as DfsPos) ? FLEX_ELIGIBLE : [slot];
      const candidates = pool.filter((p) => eligiblePos.includes(p.pos) && !used.has(p.id));
      if (candidates.length === 0) {
        throw new RangeError(`randomFeasibleLineups: no eligible player remains for slot "${slot}" — pool is too thin for this roster shape`);
      }
      const pick = candidates[Math.floor(rng() * candidates.length)]!;
      used.add(pick.id);
      chosen.push(pick);
    }
    const salary = chosen.reduce((s, p) => s + p.salary, 0);
    return salary >= minSalary && salary <= SALARY_CAP ? chosen : null;
  };

  const lineups: Lineup[] = [];
  for (let i = 0; i < opts.count; i++) {
    let found: Lineup | null = null;
    for (let attempt = 0; attempt < maxAttemptsPerLineup && !found; attempt++) {
      found = drawOne();
    }
    if (!found) break; // pool can't meet the salary floor within budget — stop, report partial
    lineups.push(found);
  }

  return { lineups, requested: opts.count, partial: lineups.length < opts.count };
}

// ---------------------------------------------------------------------------
// settleLineupFpts — score a lineup against actual results
// ---------------------------------------------------------------------------

/**
 * Sum a lineup's actual FPTS from a settled-week actuals map (player id ->
 * FPTS). Throws on any player missing from `actuals` rather than treating a
 * scratch as a silent zero — the paper's own honesty finding was that
 * game-time scratches needed explicit handling (they dropped two weeks
 * entirely for it); this module forces the caller to make that call
 * deliberately (zero it, or exclude the week) instead of burying it.
 */
export function settleLineupFpts(lineup: Lineup, actuals: ReadonlyMap<string, number>): number {
  return lineup.reduce((sum, p) => {
    const fpts = actuals.get(p.id);
    if (fpts === undefined) {
      throw new RangeError(`settleLineupFpts: no actual FPTS recorded for player ${p.id} (${p.name})`);
    }
    return sum + fpts;
  }, 0);
}
