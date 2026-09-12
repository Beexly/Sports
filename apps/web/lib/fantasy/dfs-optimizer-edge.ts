/**
 * DFS Optimizer — "edge" layer. Ties the two upgrades together and benchmarks
 * them head-to-head against the incumbent optimizer and a LineStar-style
 * point-sum, on the founder-gated illustrative slate.
 *
 * Two engines, two jobs:
 *   • CASH  → `optimizeExact` (dfs-exact): the PROVABLE median-maximising
 *     lineup, computed by an independently-implemented exact DP. The
 *     incumbent `optimizeOne` (dfs-optimizer) is ALSO an exact DP solver for
 *     the same problem, so the two engines are cross-checked against each
 *     other rather than benchmarked against a heuristic — two independently
 *     implemented exact solvers for the same combinatorial optimum must
 *     agree, and disagreement would expose a real bug in one of them.
 *   • GPP   → `selectGppLineups`: generate a diverse cap-legal pool, then rank
 *     by SIMULATED ceiling under correlation + ownership leverage
 *     (dfs-correlation) — the covariance-aware selection a point-sum objective
 *     is structurally blind to.
 *
 * Everything here is a design-around of the patented mechanism (no column-list
 * walk, no rows-inverse iteration bound) AND a better result. Pure; illustrative
 * slate by default.
 */

import {
  optimizeOne,
  metrics,
  objOf,
  type Lineup,
  type LineupMetrics,
} from "./dfs-optimizer";
import { optimizeExact, diversePool } from "./dfs-exact";
import { rankByTournamentScore, simulateLineups, type SimStats } from "./dfs-correlation";
import { type DfsPlayer } from "./dfs-slate";
import { activeDfsSlate } from "@/lib/integrations/dfs";

// ── GPP: generate-then-simulate-then-select ───────────────────────────────────

export type GppLineup = {
  readonly players: Lineup;
  readonly metrics: LineupMetrics;
  readonly sim: SimStats;
};

export type GppOpts = {
  readonly poolMultiple?: number; // candidate pool = count × this
  readonly maxOverlap?: number; // pool diversity: max shared players between lineups
  readonly factor?: number; // k-best over-fetch factor for the diverse pool
  readonly sims?: number;
  readonly seed?: number;
  readonly ownWeight?: number;
  readonly dupWeight?: number;
  readonly stack?: boolean; // require a QB stack in every pool lineup
};

/**
 * The production GPP path: build a DETERMINISTIC diverse pool via exact k-best
 * (top lineups by ceiling with an overlap cap — no random restarts), then rank
 * by correlated tournament upside and return the top `count`, each with full
 * glass-box metrics AND simulation stats (mean / p90 / ceilEV / dupRisk).
 */
export function selectGppLineups(
  count: number,
  opts: GppOpts = {},
  slate: readonly DfsPlayer[] = activeDfsSlate(),
): GppLineup[] {
  const poolMultiple = opts.poolMultiple ?? 6;
  const poolSize = Math.max(count * poolMultiple, count);
  const pool = diversePool(
    { mode: "gpp", minStack: opts.stack ?? true ? 1 : 0 },
    poolSize,
    { maxOverlap: opts.maxOverlap ?? 6, factor: opts.factor ?? 8 },
    slate,
  );

  if (!pool.length) return [];

  const ranked = rankByTournamentScore(pool, {
    sims: opts.sims,
    seed: opts.seed,
    ownWeight: opts.ownWeight,
    dupWeight: opts.dupWeight,
  });

  return ranked.slice(0, count).map((r) => ({
    players: r.players,
    metrics: metrics(r.players),
    sim: r.sim,
  }));
}

// ── the best same-team QB + pass-catcher stack in a slate (generic) ───────────

export function bestStackPair(slate: readonly DfsPlayer[]): { qb: DfsPlayer; catcher: DfsPlayer } | null {
  const qbs = slate.filter((p) => p.pos === "QB");
  let best: { qb: DfsPlayer; catcher: DfsPlayer; ceil: number } | null = null;
  for (const qb of qbs) {
    const catchers = slate.filter((p) => p.team === qb.team && (p.pos === "WR" || p.pos === "TE"));
    for (const c of catchers) {
      const ceil = qb.ceiling + c.ceiling;
      if (!best || ceil > best.ceil) best = { qb, catcher: c, ceil };
    }
  }
  return best ? { qb: best.qb, catcher: best.catcher } : null;
}

// ── head-to-head benchmark ────────────────────────────────────────────────────

export type Benchmark = {
  readonly cash: {
    readonly exactObjective: number;
    readonly exactSalary: number;
    readonly exactOptimal: boolean;
    readonly exactNodes: number;
    readonly incumbentObjective: number; // dfs-optimizer's own exact solver, cross-checked
    readonly objectiveGapVsIncumbent: number; // should be ~0 — both solvers are exact
  };
  readonly gpp: {
    readonly naiveCeilingSum: number; // Σceiling of the point-sum-optimal lineup
    readonly naiveNodes: number; // search nodes for the provable GPP optimum
    readonly naiveSimCeilEV: number; // its CORRELATED top-quintile expectation
    readonly selectedCeilingSum: number; // Σceiling of the correlation-selected lineup
    readonly selectedSimCeilEV: number; // its correlated top-quintile expectation
    readonly selectedStacked: number; // # of same-team pass-catchers on the selected lineup
    readonly correlationEdge: number; // selectedSimCeilEV − naiveSimCeilEV (upside point-sum misses)
  };
};

/**
 * Run the comparison. Fully deterministic for the exact + cross-check parts;
 * only the GPP simulation stats are seeded-random (reproducible via `seed`).
 */
export function benchmark(slate: readonly DfsPlayer[] = activeDfsSlate(), seed = 7): Benchmark {
  // ── CASH: cross-check two independently-implemented exact solvers ──
  const exactCash = optimizeExact({ mode: "cash", locks: new Set(), excludes: new Set() }, slate);
  const incumbentLu = optimizeOne({ mode: "cash", stack: false, locks: new Set(), excludes: new Set() }, undefined, slate);
  const incumbentObjective = incumbentLu ? objOf(incumbentLu, "cash") : 0;

  // ── GPP: point-sum-optimal lineup vs correlation-aware SELECTION ──
  // Naive = the lineup a point-sum objective picks (max Σceiling). Selected =
  // what generate-then-simulate-then-select actually ships. Re-simulate both
  // together under one seed for a fair, apples-to-apples correlated comparison.
  const naive = optimizeExact({ mode: "gpp", locks: new Set(), excludes: new Set() }, slate);
  const naiveLu = naive.lineup ?? [];
  const selected = selectGppLineups(1, { sims: 3000, seed, poolMultiple: 8 }, slate);
  const selectedLu = selected[0]?.players ?? naiveLu;

  const sims = simulateLineups([naiveLu, selectedLu], { sims: 4000, seed });
  const naiveSim = sims[0]!;
  const selectedSim = sims[1]!;

  const ceilSum = (lu: readonly DfsPlayer[]) => lu.reduce((s, p) => s + p.ceiling, 0);

  return {
    cash: {
      exactObjective: round1(exactCash.objective),
      exactSalary: exactCash.lineup ? exactCash.lineup.reduce((s, p) => s + p.salary, 0) : 0,
      exactOptimal: exactCash.optimal,
      exactNodes: exactCash.nodes,
      incumbentObjective: round1(incumbentObjective),
      objectiveGapVsIncumbent: round1(exactCash.objective - incumbentObjective),
    },
    gpp: {
      naiveCeilingSum: ceilSum(naiveLu),
      naiveNodes: naive.nodes,
      naiveSimCeilEV: naiveSim.ceilEV,
      selectedCeilingSum: ceilSum(selectedLu),
      selectedSimCeilEV: selectedSim.ceilEV,
      selectedStacked: metrics(selectedLu).stacked,
      correlationEdge: round1(selectedSim.ceilEV - naiveSim.ceilEV),
    },
  };
}

const round1 = (x: number) => Math.round(x * 10) / 10;

// re-exports so callers have one import surface
export { optimizeExact, kBest, diversePool, lateSwap, type ExactResult } from "./dfs-exact";
export { rankByTournamentScore, simulateLineups, duplicationRisk } from "./dfs-correlation";
