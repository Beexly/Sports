/**
 * VOID sweep — pure eligibility logic for settling abandoned games (R-05).
 *
 * VOID exists in the schema/types/UI/docs, but before this module no code
 * path ever wrote it: postponed or cancelled games never produce a completed
 * score from the feed, so their picks rotted PENDING forever. The sweep
 * settles those picks as result=VOID so "VOID never counts toward W/L" is
 * actually enforceable.
 *
 * Eligibility contract (fail-closed — when in doubt, do NOT void):
 *   1. A game with BOTH final scores recorded is gradable and is NEVER
 *      void-eligible, regardless of status or elapsed time.
 *   2. A game whose status is POSTPONED or CANCELED is void-eligible
 *      immediately (defensive: The Odds API scores payload carries only a
 *      `completed` boolean — no postponed/cancelled flag — so today nothing
 *      writes those statuses; if a future feed or admin tool does, the sweep
 *      honors it without waiting for the time threshold).
 *   3. Otherwise a game becomes void-eligible once `now` reaches
 *      commenceTime + sweepHours (default 12h, env-configurable via
 *      VOID_SWEEP_HOURS). The window gives the feed time to report a late
 *      final score before the picks are written off.
 *
 * Learning/calibration safety: VOID is not a decisive outcome. The existing
 * filters already exclude it by construction — the worker's
 * eligibleForLearning requires result in (WIN|LOSS|PUSH), and the calibration
 * readers (apps/web/lib/calibration/report.ts,
 * scripts/generate-calibration-report.mjs) query `result IN (WIN,LOSS,PUSH)`.
 * resultToOutcome() in apps/web/lib/calibration/compute.ts maps VOID → null.
 */

/** Default grace window after commenceTime before scoreless games are voided. */
export const DEFAULT_VOID_SWEEP_HOURS = 12;

/**
 * Parse the VOID_SWEEP_HOURS env override. Invalid, non-finite, or
 * non-positive values fall back to the default — a bad env var must never
 * disable the sweep or make it void live games.
 */
export function parseVoidSweepHours(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") return DEFAULT_VOID_SWEEP_HOURS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_VOID_SWEEP_HOURS;
  return parsed;
}

/** Effective sweep window, resolved once at module load (same convention as
 * SHADOW_INDEPENDENT_ESTIMATOR_ENABLED in constants.ts — env changes land on
 * the next deploy/restart). */
export const VOID_SWEEP_HOURS = parseVoidSweepHours(process.env["VOID_SWEEP_HOURS"]);

/** Structural game shape — compatible with the Prisma Game row. */
export interface VoidSweepGame {
  /** GameStatus enum value (SCHEDULED | LIVE | FINAL | POSTPONED | CANCELED). */
  readonly status: string;
  readonly commenceTime: Date;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
}

/** Structural pick shape — compatible with the Prisma Pick row. */
export interface VoidSweepPick {
  readonly id: string;
  /** PickResult enum value (PENDING | WIN | LOSS | PUSH | VOID). */
  readonly result: string;
}

/**
 * Whether a game's PENDING picks should be settled as VOID.
 *
 * Threshold is inclusive: a game is eligible AT exactly
 * commenceTime + sweepHours.
 */
export function isVoidSweepEligible(
  game: VoidSweepGame,
  now: Date,
  sweepHours: number = VOID_SWEEP_HOURS
): boolean {
  // Fail-closed: a recorded final score means the game is gradable by the
  // normal settlement path — never void it, no matter how stale.
  if (game.homeScore !== null && game.awayScore !== null) return false;

  // Explicit abandonment voids immediately.
  if (game.status === "POSTPONED" || game.status === "CANCELED") return true;

  const cutoffMs = game.commenceTime.getTime() + sweepHours * 60 * 60 * 1000;
  return now.getTime() >= cutoffMs;
}

/**
 * The pick ids to settle as VOID for a game this sweep pass.
 *
 * Only PENDING picks are ever returned — already-settled WIN/LOSS/PUSH (and
 * already-VOID) picks are untouched by construction. Returns [] when the game
 * is not void-eligible.
 */
export function picksToVoid(
  game: VoidSweepGame,
  picks: readonly VoidSweepPick[],
  now: Date,
  sweepHours: number = VOID_SWEEP_HOURS
): string[] {
  if (!isVoidSweepEligible(game, now, sweepHours)) return [];
  return picks.filter((pick) => pick.result === "PENDING").map((pick) => pick.id);
}
