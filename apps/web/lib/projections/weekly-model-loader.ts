/**
 * Weekly-projection LOADER — composes the cleared building blocks into the gated model.
 *
 * `weekly-model.ts` holds the pure math (`projectWeekly`). This is the I/O layer that
 * actually assembles its inputs from the already-cleared nflverse signals:
 *   - `loadExpectedPoints()`     → weekly xFP/game (the central anchor)
 *   - `loadPlayerModel()`        → process grade + typed position
 *   - `loadRosterAvailability()` → conservative band-widen for injured/at-risk players
 * joined by `playerId` (xFP+grade) and `name+team` (availability) into
 * `PlayerWeeklyAnchors[]`, then run through `projectWeekly()`.
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
 * BOTH core inputs are projected (no fabricated rows), `status` reports `source-error`, and
 * the availability enrichment is failure-tolerant (its outage widens nothing, never fails
 * the loader). `isOut` (a hard scratch → 0) is intentionally NOT inferred from the
 * availability read: that module only-widens by design, so a hard zero must come from an
 * explicit official-inactives feed at go-live, never a heuristic.
 */

import {
  loadExpectedPoints,
  type ExpectedPoints,
} from "../intelligence/expected-points";
import { loadPlayerModel, type PlayerModel } from "../intelligence/player-model";
import {
  loadRosterAvailability,
  type RosterAvailabilityResult,
} from "../human-performance/availability";
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
  /**
   * Injectable availability loader. Default: the real cleared roster-availability read
   * (widens bands for at-risk players). Pass `null` to skip the availability join.
   */
  readonly loadAvailability?: typeof loadRosterAvailability | null;
}

export interface WeeklyProjectionsLoad {
  /** `live` only when BOTH core cleared sources loaded; else `source-error` (partial/empty). */
  readonly status: "live" | "source-error";
  readonly result: WeeklyModelResult;
  /** Players projected (present in BOTH xFP and the process-grade model). */
  readonly playerCount: number;
  readonly source: {
    readonly xfp: "live" | "source-error";
    readonly grades: "live" | "source-error";
    /** Enrichment outcome — `skipped` when disabled or no players to enrich. */
    readonly availability: "live" | "source-error" | "skipped";
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

const availabilityKey = (name: string, team: string | null | undefined): string =>
  `${name.trim().toLowerCase()}|${(team ?? "").toUpperCase()}`;

/**
 * Fold the cleared availability read into the anchors: set `availabilityBandWiden` from the
 * conservative modifier (`bandWidenPct`) so injured/at-risk players carry wider bands. Pure;
 * matched by name+team. Players with no availability row (or a zero widen) pass through
 * unchanged. Does NOT set `isOut` — see the file header (only-widens doctrine).
 */
export function applyAvailability(
  anchors: readonly PlayerWeeklyAnchors[],
  roster: RosterAvailabilityResult,
): PlayerWeeklyAnchors[] {
  const widenByKey = new Map(
    roster.rows.map((r) => [availabilityKey(r.player, r.team), r.modifier.bandWidenPct]),
  );
  return anchors.map((a) => {
    const widen = widenByKey.get(availabilityKey(a.name, a.team));
    return widen == null || widen <= 0 ? a : { ...a, availabilityBandWiden: widen };
  });
}

/** Load + compose the cleared building blocks into the gated weekly projection. */
export async function loadWeeklyProjections(
  opts: LoadWeeklyOptions = {},
): Promise<WeeklyProjectionsLoad> {
  const loadXfp = opts.loadXfp ?? loadExpectedPoints;
  const loadGrades = opts.loadGrades ?? loadPlayerModel;
  // `undefined` → use the real loader; explicit `null` → skip availability entirely.
  const loadAvailability =
    opts.loadAvailability === undefined ? loadRosterAvailability : opts.loadAvailability;

  const [xfp, grades] = await Promise.all([
    loadXfp({ season: opts.season, fetcher: opts.fetcher }),
    loadGrades({ season: opts.season, fetcher: opts.fetcher }),
  ]);

  let anchors = buildWeeklyAnchors(xfp, grades);

  // Enrichment: widen bands from the cleared availability read. Failure-tolerant — an
  // availability outage never fails the loader, it just omits the widening (honest).
  let availability: "live" | "source-error" | "skipped" = "skipped";
  if (loadAvailability && anchors.length > 0) {
    try {
      const roster = await loadAvailability({
        players: anchors.map((a) => ({ name: a.name, team: a.team })),
        fetcher: opts.fetcher,
      });
      if (roster.status === "ok") {
        anchors = applyAvailability(anchors, roster);
        availability = "live";
      } else {
        availability = "source-error";
      }
    } catch {
      availability = "source-error";
    }
  }

  const result = projectWeekly(anchors, opts.envOf, { now: opts.now });

  const status: "live" | "source-error" =
    xfp.status === "live" && grades.status === "live" ? "live" : "source-error";

  return {
    status,
    result,
    playerCount: anchors.length,
    source: { xfp: xfp.status, grades: grades.status, availability },
    error:
      status === "live"
        ? null
        : "One or more cleared sources were unavailable; weekly projections may be partial.",
  };
}
