/**
 * Weekly-projection LOADER — composes the cleared building blocks into the gated model.
 *
 * `weekly-model.ts` holds the pure math (`projectWeekly`). This is the I/O layer that
 * actually assembles its inputs from the already-cleared nflverse signals:
 *   - `loadExpectedPoints()`  → weekly xFP/game (the central anchor)
 *   - `loadPlayerModel()`     → process grade + typed position
 * joined by `playerId` into `PlayerWeeklyAnchors[]`, then run through `projectWeekly()`.
 *
 * Opponent-adjusted EPA + Vegas/game-environment enter through the model's optional
 * `envOf` seam — neutral by default for v1; the schedule + odds join is the [DATA]
 * go-live enrichment. The output stays GATED (`canPublishProjections:false`) and is NOT
 * registered as a `ProjectionsProvider`: the weekly model is game-grain while the live
 * provider seam is season-grain, so wiring it into start/sit / waivers / trade is part of
 * the [DATA] go-live (which also requires the backtest). This loader exists so the model
 * can run on REAL cleared data now — the precursor the calibration backtest needs.
 *
 * Honest on availability: if a cleared source is unavailable, only the players present in
 * BOTH inputs are projected (no fabricated rows), and `status` reports `source-error`.
 */

import {
  loadExpectedPoints,
  type ExpectedPoints,
} from "../intelligence/expected-points";
import { loadPlayerModel, type PlayerModel } from "../intelligence/player-model";
import {
  projectWeekly,
  type PlayerWeeklyAnchors,
  type MatchupEnvironment,
  type WeeklyModelResult,
} from "./weekly-model";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface LoadWeeklyOptions {
  readonly fetcher?: FetchLike;
  readonly season?: number;
  /** Resolve the matchup environment (opponent EPA / Vegas total / rest) per player. */
  readonly envOf?: (a: PlayerWeeklyAnchors) => MatchupEnvironment;
  readonly now?: Date;
  /** Injectable loaders (default the real cleared loaders) — keeps this unit-testable. */
  readonly loadXfp?: typeof loadExpectedPoints;
  readonly loadGrades?: typeof loadPlayerModel;
}

export interface WeeklyProjectionsLoad {
  /** `live` only when BOTH cleared sources loaded; else `source-error` (partial/empty). */
  readonly status: "live" | "source-error";
  readonly result: WeeklyModelResult;
  /** Players projected (present in BOTH xFP and the process-grade model). */
  readonly playerCount: number;
  readonly source: {
    readonly xfp: "live" | "source-error";
    readonly grades: "live" | "source-error";
  };
  readonly error: string | null;
}

/**
 * Build anchors by joining xFP (per-game points) with the process-grade model (typed
 * position + grade). Only players in BOTH are kept — a player without a process grade has
 * no typed position to project, and one without xFP has no anchor. Pure given its inputs.
 */
export function buildWeeklyAnchors(
  xfp: ExpectedPoints,
  grades: PlayerModel,
): PlayerWeeklyAnchors[] {
  const gradeById = new Map(grades.profiles.map((p) => [p.playerId, p]));
  const anchors: PlayerWeeklyAnchors[] = [];
  for (const row of xfp.rows) {
    const prof = gradeById.get(row.playerId);
    if (!prof) continue;
    anchors.push({
      playerId: row.playerId,
      name: row.name,
      team: row.team,
      position: prof.position, // typed ModelPosition from the player model
      xfpPerGame: row.xfpPerGame,
      processGrade: prof.processGrade,
    });
  }
  return anchors;
}

/** Load + compose the cleared building blocks into the gated weekly projection. */
export async function loadWeeklyProjections(
  opts: LoadWeeklyOptions = {},
): Promise<WeeklyProjectionsLoad> {
  const loadXfp = opts.loadXfp ?? loadExpectedPoints;
  const loadGrades = opts.loadGrades ?? loadPlayerModel;

  const [xfp, grades] = await Promise.all([
    loadXfp({ season: opts.season, fetcher: opts.fetcher }),
    loadGrades({ season: opts.season, fetcher: opts.fetcher }),
  ]);

  const anchors = buildWeeklyAnchors(xfp, grades);
  const result = projectWeekly(anchors, opts.envOf, { now: opts.now });

  const status: "live" | "source-error" =
    xfp.status === "live" && grades.status === "live" ? "live" : "source-error";

  return {
    status,
    result,
    playerCount: anchors.length,
    source: { xfp: xfp.status, grades: grades.status },
    error:
      status === "live"
        ? null
        : "One or more cleared sources were unavailable; weekly projections may be partial.",
  };
}
