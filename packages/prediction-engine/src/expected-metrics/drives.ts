/**
 * Drive aggregation — a pure, deterministic partition of plays into drives (no fit).
 *
 * A drive is a maximal run of plays by one possession team. This module partitions
 * EVERY input play into exactly one drive (partition-completeness invariant) and
 * rolls up per-drive aggregates (result, start/end field position, play count,
 * points, EPA total, success rate). It classifies the drive result from an explicit
 * terminal outcome when the loader supplies one, and otherwise from a robust point
 * fallback — it NEVER infers a safety from a point total (a safety is scored by the
 * defense, not netted by the offense).
 *
 * Definitional metric: there is no model and no correlation gate — only the
 * partition invariant and deterministic ordering.
 */

import { round } from "./numeric.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";

/** One play, mapped from an nflverse play-by-play row. */
export interface DrivePlay {
  /** `game_id`+"-"+`play_id` — join/audit key. */
  readonly playId: string;
  /** `game_id`. */
  readonly gameId: string;
  /** `fixed_drive` ?? `drive`; null → detect drive boundaries by possession change. */
  readonly driveId: number | null;
  /** `posteam` ("" allowed on non-scrimmage plays). */
  readonly posteam: string;
  /** Stable within-game order (derived from `play_id` ascending). */
  readonly playIndex: number;
  /** `yardline_100`. */
  readonly yardline100: number;
  /** Offense-framed points on this play (`sp`/scoring columns); 0 if none. */
  readonly pointsScored: number;
  /** From the success-rate module; may be null (unratable play). */
  readonly isSuccess: boolean | null;
  /** Our EPA for the play (optional; missing counts as 0 in the total). */
  readonly epa: number | null;
  /** `fixed_drive_result` mapped by the loader; authoritative when present. */
  readonly terminalOutcome?: DriveResult;
}

/** Canonical drive outcomes. */
export type DriveResult =
  | "TD"
  | "FG"
  | "PUNT"
  | "TURNOVER"
  | "TURNOVER_ON_DOWNS"
  | "SAFETY"
  | "END_OF_HALF"
  | "END_OF_GAME"
  | "MISSED_FG"
  | "OTHER";

/** One aggregated drive. */
export interface Drive {
  readonly gameId: string;
  readonly driveId: number;
  readonly posteam: string;
  readonly result: DriveResult;
  readonly startYardline100: number;
  readonly endYardline100: number;
  readonly playCount: number;
  /** Σ pointsScored. */
  readonly points: number;
  /** Σ (epa ?? 0). */
  readonly epaTotal: number;
  /** successes / ratable plays; 0 (not NaN) when no play is ratable. */
  readonly successRate: number;
  readonly playIds: readonly string[];
  readonly provenance: ExpectedMetricProvenance;
}

export const DRIVES_MODEL_VERSION = "gse-drives-v1";

const DRIVE_FEATURE_KEYS = ["driveId", "posteam", "playIndex"] as const;

/** Classify a drive result. Explicit terminal outcome wins; else a point fallback. */
function classifyResult(last: DrivePlay): DriveResult {
  if (last.terminalOutcome !== undefined) return last.terminalOutcome; // authoritative
  if (last.pointsScored >= 6) return "TD"; // 6 (missed XP) / 7 / 8 (2-pt) all TD
  if (last.pointsScored === 3) return "FG";
  return "OTHER"; // PUNT / TURNOVER / SAFETY / etc. require terminalOutcome
}

interface DriveAccumulator {
  readonly gameId: string;
  readonly driveId: number;
  readonly posteam: string;
  readonly plays: DrivePlay[];
}

function finalize(acc: DriveAccumulator, provenance: ExpectedMetricProvenance): Drive {
  const ordered = [...acc.plays].sort((a, b) => a.playIndex - b.playIndex);
  const first = ordered[0]!;
  const last = ordered[ordered.length - 1]!;

  let points = 0;
  let epaTotal = 0;
  let ratable = 0;
  let successes = 0;
  for (const p of ordered) {
    points += p.pointsScored;
    epaTotal += p.epa ?? 0;
    if (p.isSuccess !== null) {
      ratable += 1;
      if (p.isSuccess) successes += 1;
    }
  }

  return {
    gameId: acc.gameId,
    driveId: acc.driveId,
    posteam: acc.posteam,
    result: classifyResult(last),
    startYardline100: first.yardline100,
    endYardline100: last.yardline100,
    playCount: ordered.length,
    points: round(points, 4),
    epaTotal: round(epaTotal, 4),
    successRate: ratable === 0 ? 0 : round(successes / ratable, 4),
    playIds: ordered.map((p) => p.playId),
    provenance,
  };
}

/**
 * Partition EVERY input play into exactly one drive and roll up per-drive aggregates.
 *
 *   Mode 1 (explicit): plays with a non-null `driveId` group by (gameId, driveId).
 *   Mode 2 (detect): within a gameId, walk plays in `playIndex` order; start a NEW
 *     drive when `posteam` changes from the previous play, or when `gameId` changes.
 *     Synthesize sequential driveIds 1..k per game.
 *
 * A play with empty `posteam` AND null `driveId` attaches to the CURRENT open drive;
 * if no drive is open yet (e.g. the game's first play), it STARTS a new drive so it
 * is never orphaned. A game is segmented by whichever signal its plays carry; the
 * loader must not feed a game mixing explicit and detect plays.
 *
 * INVARIANT (test-enforced): Σ playCount === plays.length, and the multiset of
 * playIds across all drives === the input playIds. No play is dropped, duplicated,
 * or invented. Output is sorted (gameId asc, driveId asc).
 */
export function buildDrives(plays: readonly DrivePlay[]): Drive[] {
  const provenance: ExpectedMetricProvenance = {
    modelVersion: DRIVES_MODEL_VERSION,
    method: "drive-segmentation",
    featureKeys: [...DRIVE_FEATURE_KEYS],
    featureSchemaHash: computeFeatureSchemaHash(DRIVE_FEATURE_KEYS),
    sampleSize: plays.length,
  };

  // Partition by game first (stable), then within each game by mode.
  const byGame = new Map<string, DrivePlay[]>();
  const gameOrder: string[] = [];
  for (const play of plays) {
    const bucket = byGame.get(play.gameId);
    if (bucket) {
      bucket.push(play);
    } else {
      byGame.set(play.gameId, [play]);
      gameOrder.push(play.gameId);
    }
  }
  gameOrder.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const accumulators: DriveAccumulator[] = [];
  for (const gameId of gameOrder) {
    const gamePlays = [...(byGame.get(gameId) ?? [])].sort((a, b) => a.playIndex - b.playIndex);

    // Explicit mode when the first ordered play carries a driveId.
    const explicit = gamePlays.length > 0 && gamePlays[0]!.driveId !== null;

    if (explicit) {
      // Group by driveId, preserving first-seen driveId order.
      const byDrive = new Map<number, DrivePlay[]>();
      const driveOrder: number[] = [];
      for (const play of gamePlays) {
        const id = play.driveId ?? -1;
        const bucket = byDrive.get(id);
        if (bucket) {
          bucket.push(play);
        } else {
          byDrive.set(id, [play]);
          driveOrder.push(id);
        }
      }
      driveOrder.sort((a, b) => a - b);
      for (const id of driveOrder) {
        const drivePlays = byDrive.get(id) ?? [];
        accumulators.push({
          gameId,
          driveId: id,
          posteam: drivePlays[0]?.posteam ?? "",
          plays: drivePlays,
        });
      }
      continue;
    }

    // Detect mode: possession-change segmentation, synthesized driveIds 1..k.
    let open: DriveAccumulator | null = null;
    let nextDriveId = 1;
    for (const play of gamePlays) {
      if (open === null) {
        open = { gameId, driveId: nextDriveId++, posteam: play.posteam, plays: [play] };
        accumulators.push(open);
        continue;
      }
      // Empty posteam attaches to the open drive (non-scrimmage continuation).
      if (play.posteam === "" || play.posteam === open.posteam) {
        open.plays.push(play);
        continue;
      }
      open = { gameId, driveId: nextDriveId++, posteam: play.posteam, plays: [play] };
      accumulators.push(open);
    }
  }

  const drives = accumulators.map((acc) => finalize(acc, provenance));
  drives.sort((a, b) => (a.gameId < b.gameId ? -1 : a.gameId > b.gameId ? 1 : a.driveId - b.driveId));
  return drives;
}
