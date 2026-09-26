/**
 * The one entry point that knows about the world.
 *
 * `dfs-optimizer.ts` solves the salary-cap problem. `dfs-signals.ts` knows about
 * weather, implied team totals, backup quarterbacks and the airwave.
 * `dfs-correlation.ts` knows that a lineup's score is correlated and that a
 * chalky lineup gets duplicated. Before this module, nothing connected them, so
 * every solve ran blind to all three and the only thing standing between a bad
 * environment and a lineup was a human remembering to care.
 *
 * `solveSlate` wires them together and returns the reasoning along with the
 * lineups — the mode advice, the suppression report, and the correlated
 * tournament ranking. A lineup you cannot interrogate is a lineup you will
 * repeat a mistake with.
 *
 * DEPENDENCY DIRECTION. signals -> optimizer, and this module -> everything.
 * `dfs-optimizer.ts` imports nothing from here or from dfs-signals; it receives
 * the penalty as a plain function. Keep it that way.
 */

import type { DfsPlayer } from "./dfs-slate";
import { activeDfsSlate } from "@/lib/integrations/dfs";
import {
  generateLineups,
  metrics,
  type GenResult,
  type LineupMetrics,
  type Lineup,
  type Mode,
  type OptOpts,
} from "./dfs-optimizer";
import { rankByTournamentScore, type SimOpts, type SimStats } from "./dfs-correlation";
import { adviseMode, explainSlate, signalPenalty, type ModeAdvice } from "./dfs-signals";
import { EMPTY_CONTEXT, type SignalContext, type SignalReport } from "@/lib/signals/spine";

export type SolveOpts = {
  readonly mode: Mode;
  readonly stack: boolean;
  readonly locks?: ReadonlySet<string>;
  readonly excludes?: ReadonlySet<string>;
  readonly count?: number;
  readonly maxExposure?: number;
  readonly slate?: readonly DfsPlayer[];
  readonly context?: SignalContext;
  readonly contest?: { readonly fieldSize: number; readonly placesPaid: number; readonly singleEntry: boolean };
  readonly sim?: SimOpts;
};

export type SolvedLineup = {
  readonly players: Lineup;
  readonly metrics: LineupMetrics;
  readonly sim: SimStats;
  /** Signal-moved players that made this lineup, with their reasons. */
  readonly carried: readonly SignalReport[];
};

export type SolveResult = {
  readonly lineups: readonly SolvedLineup[];
  readonly exposure: GenResult["exposure"];
  readonly partial: boolean;
  readonly requested: number;
  readonly exposureTarget: number;
  /** Whether the chosen objective matches the contest's payout shape (L-3). */
  readonly modeAdvice: ModeAdvice | null;
  /** Every player the signals moved, biggest absolute move first. */
  readonly moved: readonly SignalReport[];
};

/**
 * Solve a slate with the world switched on.
 *
 * Ranking is by CORRELATED tournament score, not by raw projection: a lineup's
 * pieces move together, and a lineup the whole field also built is worth less
 * than its score suggests. `rankByTournamentScore` already prices both.
 */
export function solveSlate(opts: SolveOpts): SolveResult {
  const slate = opts.slate ?? activeDfsSlate();
  const ctx = opts.context ?? EMPTY_CONTEXT;
  const count = opts.count ?? 20;

  const optOpts: OptOpts = {
    mode: opts.mode,
    stack: opts.stack,
    locks: opts.locks ?? new Set<string>(),
    excludes: opts.excludes ?? new Set<string>(),
  };

  const pen = signalPenalty(ctx, opts.mode);
  const gen = generateLineups(optOpts, count, opts.maxExposure ?? 0.6, slate, pen);

  const moved = explainSlate(slate, ctx);
  const movedByName = new Map(moved.map((m) => [m.player, m]));

  const ranked = rankByTournamentScore(gen.lineups.map((l) => l.players), opts.sim ?? {});
  const lineups: SolvedLineup[] = ranked.map((r) => ({
    players: r.players,
    metrics: metrics(r.players),
    sim: r.sim,
    carried: r.players
      .map((p) => movedByName.get(p.name))
      .filter((m): m is SignalReport => m !== undefined),
  }));

  return {
    lineups,
    exposure: gen.exposure,
    partial: gen.partial,
    requested: gen.requested,
    exposureTarget: gen.exposureTarget,
    modeAdvice: opts.contest ? adviseMode(opts.contest, opts.mode) : null,
    moved,
  };
}
