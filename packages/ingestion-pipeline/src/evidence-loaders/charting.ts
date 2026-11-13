/**
 * Charting evidence loader.
 *
 * Field provenance, verified against the actual artefacts (2026-11-12):
 *
 * - sackRateAllowedPct <- trends `sack_rate_allowed_pct` (REAL, required).
 *   The old pipeline read `sack_rate_allowed`, a key that does not exist; its
 *   `??` default fired for all 32 teams and flattened the trench advantage.
 *   This loader never reads the bogus key.
 *
 * - pressureRateAllowedPct: NO source exists. The trends file has no
 *   pressure-rate key. `qb_hit_rate_allowed_pct` is QB *hits*, not pressure,
 *   and is never substituted. data/nflverse/ftn_charting_2026.parquet
 *   (18,019 rows) was inspected with hyparquet; its 29 columns are:
 *     ftn_game_id, nflverse_game_id, season, week, ftn_play_id,
 *     nflverse_play_id, starting_hash, qb_location, n_offense_backfield,
 *     n_defense_box, is_no_huddle, is_motion, is_play_action, is_screen_pass,
 *     is_rpo, is_trick_play, is_qb_out_of_pocket, is_interception_worthy,
 *     is_throw_away, read_thrown, is_catchable_ball, is_contested_ball,
 *     is_created_reception, is_drop, is_qb_sneak, n_blitzers, n_pass_rushers,
 *     is_qb_fault_sack, date_pulled
 *   There is no pressure, hit, or block-win-rate column.
 *
 * - passBlockWinRate / runBlockWinRate: NO source in either artefact.
 *
 * ChartingRecord requires all four numbers, so the record cannot be built
 * honestly today: loadCharting returns MISSING naming the absent pressure
 * column. The sack-rate read still runs first, so a team missing
 * `sack_rate_allowed_pct` gets a reason that names that key instead.
 *
 * Coverage: the trends file's weeks_covered is [1..7] — weeks 1 through 7,
 * never 1–9. asOf is the file's generated_at, not the read time.
 */

import type { ChartingRecord, Evidence } from "@sports/prediction-engine/src/evidence/types.js";
import { missing } from "@sports/prediction-engine/src/evidence/types.js";
import { canonicalTeamCode, tryCanonicalTeamCode } from "@sports/prediction-engine/src/evidence/team-codes.js";
import { loadTrendsFile, requireNumber, type TrendsFile } from "./trends.js";

export interface ChartingOptions {
  readonly trendsPath?: string;
  readonly trends?: TrendsFile;
}

/** Stable source id spanning both artefacts this loader is responsible for. */
export const CHARTING_SOURCE = "trends:nfl_2026_w1_w7+ftn_charting_2026";

/**
 * The one genuinely sourceable charting field, read with the REAL key name.
 * Exported so the REAL read is directly verifiable while the full record is
 * blocked on the absent pressure/block columns. Throws TrendsKeyError naming
 * the key when it is absent — the old bogus `sack_rate_allowed` is never read.
 */
export function readSackRateAllowedPct(
  team: string,
  row: Readonly<Record<string, unknown>>,
): number {
  return requireNumber(team, row, "sack_rate_allowed_pct");
}

/**
 * Find rows whose key resolves to the canonical code. The trends artefact
 * keys Washington as "WAS" while the canonical code is "WSH"; resolving the
 * file's keys through canonicalTeamCode is honest alias resolution, not a
 * fallback to another team. Multiple matches are a conflict, never a pick.
 */
function matchingRows<T>(
  table: Readonly<Record<string, T>>,
  code: string,
): Array<readonly [string, T]> {
  const out: Array<readonly [string, T]> = [];
  for (const [key, row] of Object.entries(table)) {
    if (tryCanonicalTeamCode(key) === code) out.push([key, row] as const);
  }
  return out;
}

export function loadCharting(team: string, opts: ChartingOptions = {}): Evidence<ChartingRecord> {
  let code: string;
  try {
    code = canonicalTeamCode(team);
  } catch (err) {
    return missing(`unknown team "${team}": ${(err as Error).message}`, CHARTING_SOURCE);
  }

  let file: TrendsFile;
  try {
    file = opts.trends ?? loadTrendsFile(opts.trendsPath);
  } catch (err) {
    return missing(`trends file unreadable: ${(err as Error).message}`, CHARTING_SOURCE);
  }

  const matches = matchingRows(file.teams, code);
  const first = matches[0];
  if (matches.length === 0 || first === undefined) {
    return missing(`trends has no row for ${code}`, CHARTING_SOURCE, file.generatedAt);
  }
  if (matches.length > 1) {
    return missing(
      `trends has conflicting rows for ${code}: ${matches.map(([k]) => k).join(", ")}`,
      CHARTING_SOURCE,
      file.generatedAt,
    );
  }
  const row = first[1];

  // Gate on the real sack-rate key first: when it is absent the reason must
  // name it. The value itself is REAL (see readSackRateAllowedPct) but cannot
  // ship inside a ChartingRecord whose other three fields have no source.
  try {
    readSackRateAllowedPct(code, row);
  } catch (err) {
    return missing((err as Error).message, CHARTING_SOURCE, file.generatedAt);
  }

  // Verified absent in both artefacts (see header). A partial measurement is
  // MISSING with the reason — never a hits number in a pressure field, never
  // a zero, never another team's rate.
  return missing("no pressure-rate column in trends or ftn_charting", CHARTING_SOURCE, file.generatedAt);
}
