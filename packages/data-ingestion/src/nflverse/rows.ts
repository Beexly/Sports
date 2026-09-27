/**
 * Row projections for the five nflverse grains.
 * A blank join key is a refusal. A missing number stays null. Nothing is filled in.
 */

/**
 * Seasons the pipeline ingests. 2025 is the HOLDOUT; everything before it is
 * eligible training history. Two seasons are not a training set, which is why
 * this list starts at 2018 rather than at 2024.
 *
 * This is the single source of truth. `ingest.ts` imports it rather than keeping
 * its own copy, so a season can never be gated on by the loader and filtered out
 * by the projection (or the reverse).
 */
export const INGEST_SEASONS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] as const;

export type IngestSeason = (typeof INGEST_SEASONS)[number];

/** True when `value` is a season this pipeline ingests. */
export function isIngestSeason(value: number | null): value is IngestSeason {
  return value !== null && (INGEST_SEASONS as readonly number[]).includes(value);
}

export type Keep<T> = { readonly ok: true; readonly row: T };
export type Drop = { readonly ok: false; readonly reason: string };
export type Decision<T> = Keep<T> | Drop;

export function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

/** A real number, or null. Empty strings and non-numeric text are null, never zero. */
export function asNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function asString(value: unknown): string | null {
  if (isBlank(value)) return null;
  return String(value);
}

/** Split a comma- or semicolon-separated id list. A blank cell stays null. */
export function splitIds(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    const ids = value.map((item) => String(item).trim()).filter((item) => item.length > 0);
    return ids.length > 0 ? ids : null;
  }
  if (isBlank(value)) return null;
  const ids = String(value)
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return ids.length > 0 ? ids : null;
}

export interface ContractRow {
  readonly player: string | null;
  readonly team: string | null;
  readonly year_signed: number | null;
  readonly value: number | null;
  readonly apy: number | null;
  readonly guaranteed: number | null;
  readonly years: number | null;
  readonly position: string | null;
  readonly gsis_id: string;
}

/**
 * Keep a contract that was signed in 2024 or 2025, or whose signed length
 * still covers one of those seasons. `years` null does not get a guessed length.
 */
export function contractCoversWindow(yearSigned: number | null, years: number | null): boolean {
  if (yearSigned === null) return false;
  if (isIngestSeason(yearSigned)) return true;
  if (years === null || years <= 0) return false;
  const end = yearSigned + years - 1;
  return INGEST_SEASONS.some((season) => yearSigned <= season && season <= end);
}

export function projectContract(raw: Record<string, unknown>): Decision<ContractRow> {
  const gsis = asString(raw.gsis_id);
  if (gsis === null) return { ok: false, reason: "missing_gsis_id" };
  const yearSigned = asNumber(raw.year_signed);
  const years = asNumber(raw.years);
  if (!contractCoversWindow(yearSigned, years)) return { ok: false, reason: "outside_window" };
  return {
    ok: true,
    row: {
      player: asString(raw.player),
      team: asString(raw.team),
      year_signed: yearSigned,
      value: asNumber(raw.value),
      apy: asNumber(raw.apy),
      guaranteed: asNumber(raw.guaranteed),
      years,
      position: asString(raw.position),
      gsis_id: gsis,
    },
  };
}

export interface RosterRow {
  readonly season: number | null;
  readonly week: number | null;
  readonly roster_level: "season" | "weekly";
  readonly team: string | null;
  readonly position: string | null;
  readonly depth_chart_position: string | null;
  readonly jersey_number: number | null;
  readonly status: string | null;
  readonly full_name: string | null;
  readonly gsis_id: string;
  readonly pfr_id: string | null;
}

export function projectRoster(raw: Record<string, unknown>, level: "season" | "weekly"): Decision<RosterRow> {
  const gsis = asString(raw.gsis_id);
  if (gsis === null) return { ok: false, reason: "missing_gsis_id" };
  const season = asNumber(raw.season);
  if (!isIngestSeason(season)) {
    return { ok: false, reason: "outside_window" };
  }
  return {
    ok: true,
    row: {
      season,
      week: asNumber(raw.week),
      roster_level: level,
      team: asString(raw.team),
      position: asString(raw.position),
      depth_chart_position: asString(raw.depth_chart_position),
      jersey_number: asNumber(raw.jersey_number),
      status: asString(raw.status),
      full_name: asString(raw.full_name),
      gsis_id: gsis,
      pfr_id: asString(raw.pfr_id),
    },
  };
}

export interface SnapRow {
  readonly season: number | null;
  readonly week: number | null;
  readonly team: string | null;
  readonly player: string | null;
  readonly position: string | null;
  readonly offense_snaps: number | null;
  readonly offense_pct: number | null;
  readonly defense_snaps: number | null;
  readonly defense_pct: number | null;
  readonly st_snaps: number | null;
  readonly st_pct: number | null;
  readonly game_id: string;
  readonly pfr_player_id: string;
}

/**
 * Snap counts publish `game_id` and `pfr_player_id`. They do not publish `gsis_id`.
 * A missing game id or PFR id is refused. A gsis id is not invented.
 */
export function projectSnap(raw: Record<string, unknown>): Decision<SnapRow> {
  const gameId = asString(raw.game_id);
  if (gameId === null) return { ok: false, reason: "missing_game_id" };
  const pfr = asString(raw.pfr_player_id);
  if (pfr === null) return { ok: false, reason: "missing_pfr_player_id" };
  const season = asNumber(raw.season);
  if (!isIngestSeason(season)) {
    return { ok: false, reason: "outside_window" };
  }
  return {
    ok: true,
    row: {
      season,
      week: asNumber(raw.week),
      team: asString(raw.team),
      player: asString(raw.player),
      position: asString(raw.position),
      offense_snaps: asNumber(raw.offense_snaps),
      offense_pct: asNumber(raw.offense_pct),
      defense_snaps: asNumber(raw.defense_snaps),
      defense_pct: asNumber(raw.defense_pct),
      st_snaps: asNumber(raw.st_snaps),
      st_pct: asNumber(raw.st_pct),
      game_id: gameId,
      pfr_player_id: pfr,
    },
  };
}

export interface ParticipationRow {
  readonly nflverse_game_id: string;
  readonly play_id: number;
  readonly possession_team: string | null;
  readonly offense_formation: string | null;
  readonly offense_personnel: string | null;
  readonly defenders_in_box: number | null;
  readonly defense_personnel: string | null;
  readonly number_of_pass_rushers: number | null;
  /** Parsed from `players_on_play`. Blank stays null. Not a guessed roster. */
  readonly players_on_field: string[] | null;
  readonly n_offense: number | null;
  readonly n_defense: number | null;
}

export function projectParticipation(raw: Record<string, unknown>): Decision<ParticipationRow> {
  const gameId = asString(raw.nflverse_game_id);
  if (gameId === null) return { ok: false, reason: "missing_nflverse_game_id" };
  const playId = asNumber(raw.play_id);
  if (playId === null) return { ok: false, reason: "missing_play_id" };
  const onPlay = splitIds(raw.players_on_play);
  const offense = splitIds(raw.offense_players);
  const defense = splitIds(raw.defense_players);
  const players = onPlay ?? (offense || defense ? [...(offense ?? []), ...(defense ?? [])] : null);
  return {
    ok: true,
    row: {
      nflverse_game_id: gameId,
      play_id: playId,
      possession_team: asString(raw.possession_team),
      offense_formation: asString(raw.offense_formation),
      offense_personnel: asString(raw.offense_personnel),
      defenders_in_box: asNumber(raw.defenders_in_box),
      defense_personnel: asString(raw.defense_personnel),
      number_of_pass_rushers: asNumber(raw.number_of_pass_rushers),
      players_on_field: players,
      n_offense: asNumber(raw.n_offense),
      n_defense: asNumber(raw.n_defense),
    },
  };
}

export interface FourthDownRow {
  readonly game_id: string;
  readonly play_id: number;
  readonly season: number | null;
  readonly go_wp: number | null;
  readonly punt_wp: number | null;
  readonly fg_wp: number | null;
}

export function projectFourthDown(raw: Record<string, unknown>): Decision<FourthDownRow> {
  const gameId = asString(raw.game_id);
  if (gameId === null) return { ok: false, reason: "missing_game_id" };
  const playId = asNumber(raw.play_id);
  if (playId === null) return { ok: false, reason: "missing_play_id" };
  const season = asNumber(raw.season);
  if (season !== null && !isIngestSeason(season)) {
    return { ok: false, reason: "outside_window" };
  }
  return {
    ok: true,
    row: {
      game_id: gameId,
      play_id: playId,
      season,
      go_wp: asNumber(raw.go_wp),
      punt_wp: asNumber(raw.punt_wp),
      fg_wp: asNumber(raw.fg_wp),
    },
  };
}

export function tally<T>(rows: readonly Record<string, unknown>[], project: (raw: Record<string, unknown>) => Decision<T>): {
  kept: T[];
  refused: Record<string, number>;
} {
  const kept: T[] = [];
  const refused: Record<string, number> = {};
  for (const raw of rows) {
    const decision = project(raw);
    if (decision.ok) kept.push(decision.row);
    else refused[decision.reason] = (refused[decision.reason] ?? 0) + 1;
  }
  return { kept, refused };
}
