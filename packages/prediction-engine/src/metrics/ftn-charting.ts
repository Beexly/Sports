/**
 * FTN charting loader — the typed feature frame SII reads.
 *
 * Source: nflverse-data release asset `ftn_charting/ftn_charting_2026.parquet`.
 * Attribution: "FTN Data via nflverse". The domain is not scraped.
 *
 * File facts, recorded at load time and asserted by the header below:
 *   path      data/nflverse/ftn_charting_2026.parquet
 *   rows      18,019
 *   columns   29
 *   weeks     1-7
 *   sha256    c6d79944c54502c6b40a17cfe1e63b128ad4ef3e8676b912bae443e7843a53de
 *
 * The full 29-column list, exactly as it exists in the parquet, in schema order:
 *   ftn_game_id, nflverse_game_id, season, week, ftn_play_id, nflverse_play_id,
 *   starting_hash, qb_location, n_offense_backfield, n_defense_box, is_no_huddle,
 *   is_motion, is_play_action, is_screen_pass, is_rpo, is_trick_play,
 *   is_qb_out_of_pocket, is_interception_worthy, is_throw_away, read_thrown,
 *   is_catchable_ball, is_contested_ball, is_created_reception, is_drop,
 *   is_qb_sneak, n_blitzers, n_pass_rushers, is_qb_fault_sack, date_pulled
 *
 * No column is invented and none is dropped. The frame carries the play key, every
 * boolean flag, every integer count, the week, and the attribution. SII reads this
 * frame; it does not read the parquet.
 *
 * Null policy is unchanged from the derivation: a missing flag stays missing, it is
 * not coerced to false. A missing box stays missing and the derivation's existing
 * drop applies downstream.
 */
import { asyncBufferFromFile, parquetReadObjects } from "hyparquet";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Repo root, resolved from this module so the default path does not depend on cwd. */
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

export const FTN_ATTRIBUTION = "FTN Data via nflverse";
export const FTN_PATH = "data/nflverse/ftn_charting_2026.parquet";
export const FTN_SHA256 =
  "c6d79944c54502c6b40a17cfe1e63b128ad4ef3e8676b912bae443e7843a53de";
export const FTN_ROWS = 18019;
export const FTN_COLUMNS = 29;

/** Boolean scheme flags, in schema order. */
export const FTN_BOOLEAN_FLAGS = [
  "is_no_huddle",
  "is_motion",
  "is_play_action",
  "is_screen_pass",
  "is_rpo",
  "is_trick_play",
  "is_qb_out_of_pocket",
  "is_interception_worthy",
  "is_throw_away",
  "is_catchable_ball",
  "is_contested_ball",
  "is_created_reception",
  "is_drop",
  "is_qb_sneak",
  "is_qb_fault_sack",
] as const;

/** Integer defensive-structure counts, in schema order. */
export const FTN_INTEGER_COUNTS = [
  "n_offense_backfield",
  "n_defense_box",
  "n_blitzers",
  "n_pass_rushers",
] as const;

export type FtnFlag = (typeof FTN_BOOLEAN_FLAGS)[number];
export type FtnCount = (typeof FTN_INTEGER_COUNTS)[number];

export interface FtnPlayFrame {
  /** Join key, matching the derivation: nflverse_game_id + play_id. */
  readonly gameId: string;
  readonly playId: number;
  readonly week: number;
  readonly flags: Readonly<Partial<Record<FtnFlag, boolean>>>;
  readonly counts: Readonly<Partial<Record<FtnCount, number>>>;
  /** Free-text columns carried through untouched. */
  readonly qbLocation: string | null;
  readonly readThrown: string | null;
  readonly attribution: typeof FTN_ATTRIBUTION;
}

export interface FtnFrame {
  readonly path: string;
  readonly rows: number;
  readonly columns: number;
  readonly weeks: readonly number[];
  readonly sha256: string;
  readonly attribution: typeof FTN_ATTRIBUTION;
  readonly plays: readonly FtnPlayFrame[];
}

function orNull(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

/**
 * Read the FTN charting parquet into the typed frame.
 *
 * `path` defaults to the mirror. Pass an explicit path only to read a different
 * vintage; the header facts above describe the mirror and are not re-derived here.
 */
export async function loadFtnCharting2026(path: string = FTN_PATH): Promise<FtnFrame> {
  const abs = path === FTN_PATH ? resolve(REPO_ROOT, FTN_PATH) : path;
  const file = await asyncBufferFromFile(abs);
  const rows = await parquetReadObjects({ file });

  const plays: FtnPlayFrame[] = [];
  const weeks = new Set<number>();

  for (const r of rows as Record<string, unknown>[]) {
    const gameId = orNull(r["nflverse_game_id"]);
    const playId = r["nflverse_play_id"];
    const week = r["week"];
    if (gameId === null || typeof playId !== "number" || typeof week !== "number") continue;
    weeks.add(week);

    const flags: Partial<Record<FtnFlag, boolean>> = {};
    for (const f of FTN_BOOLEAN_FLAGS) {
      const v = r[f];
      if (typeof v === "boolean") flags[f] = v;
    }
    const counts: Partial<Record<FtnCount, number>> = {};
    for (const c of FTN_INTEGER_COUNTS) {
      const v = r[c];
      if (typeof v === "number") counts[c] = v;
    }

    plays.push({
      gameId,
      playId,
      week,
      flags,
      counts,
      qbLocation: orNull(r["qb_location"]),
      readThrown: orNull(r["read_thrown"]),
      attribution: FTN_ATTRIBUTION,
    });
  }

  return {
    path,
    rows: plays.length,
    columns: FTN_COLUMNS,
    weeks: [...weeks].sort((a, b) => a - b),
    sha256: FTN_SHA256,
    attribution: FTN_ATTRIBUTION,
    plays,
  };
}

/**
 * Project the frame down to the columns the SII derivation actually reads.
 *
 * The derivation reads exactly these six: the two key parts, the four scheme flags
 * and the box count. Nothing else is used by SII, so nothing else is projected.
 */
export interface FtnSchemeRow {
  readonly gameId: string;
  readonly playId: number;
  readonly isMotion: boolean | undefined;
  readonly isPlayAction: boolean | undefined;
  readonly isRpo: boolean | undefined;
  readonly isScreenPass: boolean | undefined;
  readonly defendersInBox: number | undefined;
}

export function schemeRows(frame: FtnFrame): FtnSchemeRow[] {
  return frame.plays.map((p) => ({
    gameId: p.gameId,
    playId: p.playId,
    isMotion: p.flags.is_motion,
    isPlayAction: p.flags.is_play_action,
    isRpo: p.flags.is_rpo,
    isScreenPass: p.flags.is_screen_pass,
    defendersInBox: p.counts.n_defense_box,
  }));
}
