/**
 * Join core for the gse-dataset nflverse tables.
 *
 * Everything below the report builder is pure: parsed rows in, parsed rows out,
 * no file handle. The report builder at the bottom owns the I/O and streams,
 * because the eight participation tables are 183 MB together.
 *
 * A blank join key is a refusal, never a guess. An unmatched row is kept and
 * labelled rather than dropped. A null field stays null: null players_on_field
 * is an absent fact and must not be read as "no players were on the field".
 */

import { asNumber, asString, isBlank } from "./rows";
import type { Decision } from "./rows";

/* ------------------------------------------------------------------ *
 * Parse guards
 * ------------------------------------------------------------------ */

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/* ------------------------------------------------------------------ *
 * Rosters
 * ------------------------------------------------------------------ */

export type RosterLevel = "season" | "weekly";

export interface RosterRecord {
  readonly season: number;
  readonly week: number | null;
  readonly roster_level: RosterLevel;
  readonly team: string | null;
  readonly position: string | null;
  readonly depth_chart_position: string | null;
  readonly jersey_number: number | null;
  readonly status: string | null;
  readonly full_name: string | null;
  readonly gsis_id: string;
  readonly pfr_id: string | null;
}

export function rosterLevel(value: unknown): RosterLevel | null {
  return value === "season" || value === "weekly" ? value : null;
}

export function parseRosterRow(raw: Record<string, unknown>): Decision<RosterRecord> {
  const gsisId = asString(raw.gsis_id);
  if (gsisId === null) return { ok: false, reason: "blank_gsis_id" };
  const season = asNumber(raw.season);
  if (season === null) return { ok: false, reason: "blank_season" };
  const level = rosterLevel(raw.roster_level);
  if (level === null) return { ok: false, reason: "unknown_roster_level" };
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
      gsis_id: gsisId,
      pfr_id: asString(raw.pfr_id),
    },
  };
}

/** A blank gsis id yields no key at all, so a blank can never collide with a real one. */
export function rosterKey(season: number, gsisId: string): string | null {
  if (isBlank(gsisId)) return null;
  return `${season}|${gsisId}`;
}

export interface RosterBucket {
  readonly key: string;
  readonly season: number;
  readonly gsis_id: string;
  readonly seasonRows: readonly RosterRecord[];
  readonly weeklyRows: readonly RosterRecord[];
  /**
   * Two or more SEASON-level rows share this season+gsis_id. The rows are all
   * kept; nothing is chosen between them, so any consumer that needs a single
   * season-level record has to see this flag first.
   */
  readonly ambiguous: boolean;
}

export interface RosterIndex {
  readonly byKey: ReadonlyMap<string, RosterBucket>;
  readonly seasonMin: number | null;
  readonly seasonMax: number | null;
  readonly indexedRows: number;
  readonly seasonLevelRows: number;
  readonly weeklyLevelRows: number;
  readonly ambiguousKeys: number;
  readonly refusals: Readonly<Record<string, number>>;
}

export interface RosterIndexBuilder {
  add(raw: Record<string, unknown>): void;
  finish(): RosterIndex;
}

export function createRosterIndexBuilder(): RosterIndexBuilder {
  const working = new Map<string, { season: number; gsis_id: string; seasonRows: RosterRecord[]; weeklyRows: RosterRecord[] }>();
  const refusals: Record<string, number> = {};
  let indexedRows = 0;
  let seasonLevelRows = 0;
  let weeklyLevelRows = 0;
  let seasonMin: number | null = null;
  let seasonMax: number | null = null;

  return {
    add(raw: Record<string, unknown>): void {
      const decision = parseRosterRow(raw);
      if (!decision.ok) {
        refusals[decision.reason] = (refusals[decision.reason] ?? 0) + 1;
        return;
      }
      const record = decision.row;
      const key = rosterKey(record.season, record.gsis_id);
      if (key === null) {
        refusals.blank_gsis_id = (refusals.blank_gsis_id ?? 0) + 1;
        return;
      }
      indexedRows += 1;
      if (record.roster_level === "season") seasonLevelRows += 1;
      else weeklyLevelRows += 1;
      if (seasonMin === null || record.season < seasonMin) seasonMin = record.season;
      if (seasonMax === null || record.season > seasonMax) seasonMax = record.season;

      let bucket = working.get(key);
      if (bucket === undefined) {
        bucket = { season: record.season, gsis_id: record.gsis_id, seasonRows: [], weeklyRows: [] };
        working.set(key, bucket);
      }
      if (record.roster_level === "season") bucket.seasonRows.push(record);
      else bucket.weeklyRows.push(record);
    },
    finish(): RosterIndex {
      const byKey = new Map<string, RosterBucket>();
      let ambiguousKeys = 0;
      for (const [key, bucket] of working) {
        const ambiguous = bucket.seasonRows.length > 1;
        if (ambiguous) ambiguousKeys += 1;
        byKey.set(key, {
          key,
          season: bucket.season,
          gsis_id: bucket.gsis_id,
          seasonRows: bucket.seasonRows,
          weeklyRows: bucket.weeklyRows,
          ambiguous,
        });
      }
      return { byKey, seasonMin, seasonMax, indexedRows, seasonLevelRows, weeklyLevelRows, ambiguousKeys, refusals };
    },
  };
}

export function indexRosters(rows: readonly Record<string, unknown>[]): RosterIndex {
  const builder = createRosterIndexBuilder();
  for (const row of rows) builder.add(row);
  return builder.finish();
}

export function rosterBucket(index: RosterIndex, season: number, gsisId: string): RosterBucket | undefined {
  const key = rosterKey(season, gsisId);
  if (key === null) return undefined;
  return index.byKey.get(key);
}

export function isRosterKeyAmbiguous(index: RosterIndex, season: number, gsisId: string): boolean {
  const bucket = rosterBucket(index, season, gsisId);
  return bucket !== undefined && bucket.ambiguous;
}

/* ------------------------------------------------------------------ *
 * Season view, so a gsis id alone is never looked up across all seasons
 * ------------------------------------------------------------------ */

export interface SeasonRosterIndex {
  readonly season: number;
  get(gsisId: string): RosterBucket | undefined;
  isAmbiguous(gsisId: string): boolean;
}

export function indexForSeason(index: RosterIndex, season: number): SeasonRosterIndex {
  return {
    season,
    get(gsisId: string): RosterBucket | undefined {
      return rosterBucket(index, season, gsisId);
    },
    isAmbiguous(gsisId: string): boolean {
      return isRosterKeyAmbiguous(index, season, gsisId);
    },
  };
}

/* ------------------------------------------------------------------ *
 * Participation personnel
 * ------------------------------------------------------------------ */

export interface PersonnelMatch {
  readonly season: number;
  /** Every roster row for every id on the field. Check `roster_level` before using one. */
  readonly matched: readonly RosterRecord[];
  readonly unmatched: readonly string[];
  readonly ambiguousIds: readonly string[];
  /** Ids that were present but blank. Refused, never matched, never filled in. */
  readonly blankIds: number;
}

/**
 * A null `players_on_field` returns null. It does not return an empty
 * PersonnelMatch, because "we did not record who was on the field" and "no one
 * was on the field" are different facts and the repo keeps them apart.
 */
export function personnelForPlay(playersOnField: unknown, index: SeasonRosterIndex): PersonnelMatch | null {
  if (!isStringArray(playersOnField)) return null;

  const matched: RosterRecord[] = [];
  const unmatched: string[] = [];
  const ambiguousIds: string[] = [];
  let blankIds = 0;

  for (const rawId of playersOnField) {
    if (isBlank(rawId)) {
      blankIds += 1;
      continue;
    }
    const gsisId = rawId.trim();
    const bucket = index.get(gsisId);
    if (bucket === undefined) {
      unmatched.push(gsisId);
      continue;
    }
    if (bucket.ambiguous) ambiguousIds.push(gsisId);
    for (const record of bucket.seasonRows) matched.push(record);
    for (const record of bucket.weeklyRows) matched.push(record);
  }

  return { season: index.season, matched, unmatched, ambiguousIds, blankIds };
}

export function seasonFromGameId(gameId: string): number | null {
  const match = /^(\d{4})_\d{2}_/.exec(gameId);
  if (match === null) return null;
  const season = Number(match[1]);
  return Number.isFinite(season) ? season : null;
}

export type PlayersOnFieldIdFormat = "gsis_id" | "numeric" | "unknown";

const GSIS_ID_PATTERN = /^\d{2}-\d{7}$/;
const NUMERIC_ID_PATTERN = /^\d+$/;

/**
 * The on-disk files change encoding: 2018-2022 carry raw jersey numbers in
 * `players_on_field`, 2023+ carry gsis ids. A jersey number can never be
 * resolved against a gsis roster, so it is reported in its own class and is
 * never coerced into an id.
 */
export function playersOnFieldIdFormat(id: string): PlayersOnFieldIdFormat {
  if (GSIS_ID_PATTERN.test(id)) return "gsis_id";
  if (NUMERIC_ID_PATTERN.test(id)) return "numeric";
  return "unknown";
}

export interface ParticipationPlayerRow {
  readonly nflverse_game_id: string;
  readonly play_id: number;
  readonly season: number | null;
  readonly players_on_field: readonly string[] | null;
}

/** The gsis ids are read from `players_on_field`; nothing is inferred from the play. */
export function parseParticipationRow(raw: Record<string, unknown>): Decision<ParticipationPlayerRow> {
  const gameId = asString(raw.nflverse_game_id);
  if (gameId === null) return { ok: false, reason: "blank_nflverse_game_id" };
  const playId = asNumber(raw.play_id);
  if (playId === null) return { ok: false, reason: "blank_play_id" };
  const onField = raw.players_on_field;
  return {
    ok: true,
    row: {
      nflverse_game_id: gameId,
      play_id: playId,
      season: seasonFromGameId(gameId),
      players_on_field: isStringArray(onField) ? onField : null,
    },
  };
}

/* ------------------------------------------------------------------ *
 * Snap counts -> rosters, on pfr_player_id = pfr_id AND season
 * ------------------------------------------------------------------ */

export interface SnapRecord {
  readonly season: number;
  readonly week: number | null;
  readonly team: string | null;
  readonly player: string | null;
  readonly position: string | null;
  readonly game_id: string;
  readonly pfr_player_id: string;
}

export function parseSnapRow(raw: Record<string, unknown>): Decision<SnapRecord> {
  const gameId = asString(raw.game_id);
  if (gameId === null) return { ok: false, reason: "blank_game_id" };
  const pfrId = asString(raw.pfr_player_id);
  if (pfrId === null) return { ok: false, reason: "blank_pfr_player_id" };
  const season = asNumber(raw.season);
  if (season === null) return { ok: false, reason: "blank_season" };
  return {
    ok: true,
    row: {
      season,
      week: asNumber(raw.week),
      team: asString(raw.team),
      player: asString(raw.player),
      position: asString(raw.position),
      game_id: gameId,
      pfr_player_id: pfrId,
    },
  };
}

export interface PfrBucket {
  readonly key: string;
  readonly season: number;
  readonly pfr_id: string;
  readonly rows: readonly RosterRecord[];
  readonly gsisIds: readonly string[];
  /** More than one distinct gsis_id claims this pfr id in this season. */
  readonly ambiguous: boolean;
}

export interface PfrRosterIndex {
  readonly byKey: ReadonlyMap<string, PfrBucket>;
  readonly ambiguousKeys: number;
  readonly blankPfrRows: number;
}

export function pfrKey(season: number, pfrId: string): string | null {
  if (isBlank(pfrId)) return null;
  return `${season}|${pfrId}`;
}

export function indexRosterByPfrId(index: RosterIndex): PfrRosterIndex {
  const working = new Map<string, { season: number; pfr_id: string; rows: RosterRecord[]; gsisIds: Set<string> }>();
  let blankPfrRows = 0;

  for (const bucket of index.byKey.values()) {
    for (const record of bucket.seasonRows) collectPfrRow(working, record, () => (blankPfrRows += 1));
    for (const record of bucket.weeklyRows) collectPfrRow(working, record, () => (blankPfrRows += 1));
  }

  const byKey = new Map<string, PfrBucket>();
  let ambiguousKeys = 0;
  for (const [key, entry] of working) {
    const ambiguous = entry.gsisIds.size > 1;
    if (ambiguous) ambiguousKeys += 1;
    byKey.set(key, {
      key,
      season: entry.season,
      pfr_id: entry.pfr_id,
      rows: entry.rows,
      gsisIds: [...entry.gsisIds],
      ambiguous,
    });
  }
  return { byKey, ambiguousKeys, blankPfrRows };
}

function collectPfrRow(
  working: Map<string, { season: number; pfr_id: string; rows: RosterRecord[]; gsisIds: Set<string> }>,
  record: RosterRecord,
  onBlank: () => void,
): void {
  if (record.pfr_id === null) {
    onBlank();
    return;
  }
  const key = pfrKey(record.season, record.pfr_id);
  if (key === null) {
    onBlank();
    return;
  }
  let entry = working.get(key);
  if (entry === undefined) {
    entry = { season: record.season, pfr_id: record.pfr_id, rows: [], gsisIds: new Set<string>() };
    working.set(key, entry);
  }
  entry.rows.push(record);
  entry.gsisIds.add(record.gsis_id);
}

export type SnapJoinStatus = "matched" | "matched_ambiguous" | "unmatched";

export interface SnapJoinRow {
  readonly status: SnapJoinStatus;
  /** The candidate roster rows, empty when unmatched. */
  readonly roster: readonly RosterRecord[];
  /** Non-null only when the pfr id resolved to exactly one gsis_id. Never synthesised. */
  readonly gsis_id: string | null;
  readonly candidateGsisIds: readonly string[];
}

export function joinSnapToRoster(snap: SnapRecord, pfrIndex: PfrRosterIndex): SnapJoinRow {
  const key = pfrKey(snap.season, snap.pfr_player_id);
  if (key === null) {
    return { status: "unmatched", roster: [], gsis_id: null, candidateGsisIds: [] };
  }
  const bucket = pfrIndex.byKey.get(key);
  if (bucket === undefined) {
    return { status: "unmatched", roster: [], gsis_id: null, candidateGsisIds: [] };
  }
  if (bucket.ambiguous || bucket.gsisIds.length !== 1) {
    return { status: "matched_ambiguous", roster: bucket.rows, gsis_id: null, candidateGsisIds: bucket.gsisIds };
  }
  return { status: "matched", roster: bucket.rows, gsis_id: bucket.gsisIds[0] ?? null, candidateGsisIds: bucket.gsisIds };
}

/* ------------------------------------------------------------------ *
 * Contracts -> rosters, on gsis_id
 * ------------------------------------------------------------------ */

export interface ContractRecord {
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

export function parseContractRow(raw: Record<string, unknown>): Decision<ContractRecord> {
  const gsisId = asString(raw.gsis_id);
  if (gsisId === null) return { ok: false, reason: "blank_gsis_id" };
  return {
    ok: true,
    row: {
      player: asString(raw.player),
      team: asString(raw.team),
      year_signed: asNumber(raw.year_signed),
      value: asNumber(raw.value),
      apy: asNumber(raw.apy),
      guaranteed: asNumber(raw.guaranteed),
      years: asNumber(raw.years),
      position: asString(raw.position),
      gsis_id: gsisId,
    },
  };
}

export interface GsisIdentity {
  readonly gsis_id: string;
  /** One roster key per season the id appears in. */
  readonly keys: readonly string[];
  readonly names: readonly string[];
  /** More than one full_name, or a season key with duplicate season-level rows. */
  readonly ambiguous: boolean;
}

export interface GsisIdentityIndex {
  readonly byGsisId: ReadonlyMap<string, GsisIdentity>;
  readonly ambiguousIds: number;
}

export function indexContractIdentities(index: RosterIndex): GsisIdentityIndex {
  const working = new Map<string, { keys: string[]; names: Set<string>; ambiguous: boolean }>();
  for (const bucket of index.byKey.values()) {
    let entry = working.get(bucket.gsis_id);
    if (entry === undefined) {
      entry = { keys: [], names: new Set<string>(), ambiguous: false };
      working.set(bucket.gsis_id, entry);
    }
    entry.keys.push(bucket.key);
    if (bucket.ambiguous) entry.ambiguous = true;
    for (const record of bucket.seasonRows) if (record.full_name !== null) entry.names.add(record.full_name);
    for (const record of bucket.weeklyRows) if (record.full_name !== null) entry.names.add(record.full_name);
  }

  const byGsisId = new Map<string, GsisIdentity>();
  let ambiguousIds = 0;
  for (const [gsisId, entry] of working) {
    const ambiguous = entry.ambiguous || entry.names.size > 1;
    if (ambiguous) ambiguousIds += 1;
    byGsisId.set(gsisId, { gsis_id: gsisId, keys: entry.keys, names: [...entry.names], ambiguous });
  }
  return { byGsisId, ambiguousIds };
}

export interface ContractJoinRow {
  readonly status: "matched" | "unmatched";
  readonly identity: GsisIdentity | null;
  readonly rosterKeys: readonly string[];
  readonly names: readonly string[];
  readonly ambiguous: boolean;
}

export function joinContractToRoster(contract: ContractRecord, identityIndex: GsisIdentityIndex): ContractJoinRow {
  const identity = identityIndex.byGsisId.get(contract.gsis_id);
  if (identity === undefined) {
    return { status: "unmatched", identity: null, rosterKeys: [], names: [], ambiguous: false };
  }
  return {
    status: "matched",
    identity,
    rosterKeys: identity.keys,
    names: identity.names,
    ambiguous: identity.ambiguous,
  };
}

/* ------------------------------------------------------------------ *
 * Rate accounting
 * ------------------------------------------------------------------ */

export interface JoinCounts {
  readonly inputRows: number;
  /** Rows whose join key was usable, i.e. rows - blankKey. The match-rate denominator. */
  readonly eligible: number;
  readonly matched: number;
  readonly unmatched: number;
  readonly blankKey: number;
  readonly ambiguous: number;
  /** matched / eligible, or null when nothing was eligible. Never a rounded-up number. */
  readonly matchRate: number | null;
}

export class JoinCounter {
  private inputRows = 0;
  private blankKey = 0;
  private matched = 0;
  private unmatched = 0;
  private ambiguous = 0;

  recordBlankKey(): void {
    this.inputRows += 1;
    this.blankKey += 1;
  }

  recordMatched(ambiguous: boolean): void {
    this.inputRows += 1;
    this.matched += 1;
    if (ambiguous) this.ambiguous += 1;
  }

  recordUnmatched(): void {
    this.inputRows += 1;
    this.unmatched += 1;
  }

  counts(): JoinCounts {
    const eligible = this.inputRows - this.blankKey;
    return {
      inputRows: this.inputRows,
      eligible,
      matched: this.matched,
      unmatched: this.unmatched,
      blankKey: this.blankKey,
      ambiguous: this.ambiguous,
      matchRate: eligible === 0 ? null : this.matched / eligible,
    };
  }
}

/* ------------------------------------------------------------------ *
 * Report layer. This is the only part that touches a file.
 * ------------------------------------------------------------------ */

import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

export interface StreamStats {
  readonly lines: number;
  readonly jsonObjects: number;
  readonly blankLines: number;
  readonly nonJsonLines: number;
  readonly nonObjectLines: number;
}

export interface JsonlStreamHandle {
  readonly path: string;
  readonly stats: StreamStats;
}

/** Streams a JSONL file line by line. Nothing is buffered beyond the current line. */
export async function streamJsonl(
  path: string,
  handle: (raw: Record<string, unknown>) => void,
): Promise<JsonlStreamHandle> {
  let lines = 0;
  let jsonObjects = 0;
  let blankLines = 0;
  let nonJsonLines = 0;
  let nonObjectLines = 0;

  const stream = createReadStream(path, { encoding: "utf8" });
  const reader = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const chunk of reader) {
    lines += 1;
    if (chunk.trim() === "") {
      blankLines += 1;
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(chunk);
    } catch {
      nonJsonLines += 1;
      continue;
    }
    if (!isRecord(parsed)) {
      nonObjectLines += 1;
      continue;
    }
    jsonObjects += 1;
    handle(parsed);
  }

  return { path, stats: { lines, jsonObjects, blankLines, nonJsonLines, nonObjectLines } };
}

export interface SamplePlayer {
  readonly gsis_id: string;
  readonly full_name: string | null;
  readonly position: string | null;
  readonly team: string | null;
  readonly roster_level: RosterLevel;
  readonly week: number | null;
}

export interface SampleJoinedPlay {
  readonly nflverse_game_id: string;
  readonly play_id: number;
  readonly season: number;
  readonly players_on_field_count: number;
  readonly matched_roster_rows: number;
  readonly unmatched_gsis_ids: readonly string[];
  readonly ambiguous_gsis_ids: readonly string[];
  readonly blank_ids: number;
  readonly matched_players: readonly SamplePlayer[];
}

export interface SeasonPersonnelSummary {
  readonly season: number;
  readonly file: string;
  readonly rows: number;
  readonly playsWithNullPersonnel: number;
  readonly playsWithEmptyPersonnel: number;
  readonly playsJoined: number;
  readonly idsConsidered: number;
  readonly idsMatched: number;
  readonly idsUnmatched: number;
  readonly idsBlank: number;
  readonly idsAmbiguous: number;
  readonly idsGsisFormat: number;
  readonly idsNumericFormat: number;
  readonly idsUnknownFormat: number;
  /** idsMatched / (idsMatched + idsUnmatched), or null when no usable id was seen. */
  readonly idMatchRate: number | null;
}

export interface PersonnelJoinSummary extends JoinCounts {
  readonly playsWithNullPersonnel: number;
  readonly playsWithEmptyPersonnel: number;
  readonly playsWithUnusablePersonnel: number;
  readonly playsJoined: number;
  readonly idsConsidered: number;
  readonly idsMatched: number;
  readonly idsUnmatched: number;
  readonly idsBlank: number;
  readonly idsAmbiguous: number;
  /** idsMatched / (idsMatched + idsUnmatched), or null when no usable id was seen. */
  readonly idMatchRate: number | null;
  readonly perFile: readonly { readonly file: string; readonly rows: number }[];
  readonly perSeason: readonly SeasonPersonnelSummary[];
}

export interface SnapJoinSummary extends JoinCounts {
  readonly matchedExactly: number;
  readonly matchedAmbiguous: number;
  readonly matchedRows: readonly { readonly game_id: string; readonly pfr_player_id: string }[];
}

export interface ContractJoinSummary extends JoinCounts {
  readonly gsisIdsInRoster: number;
  readonly gsisIdsAmbiguousInRoster: number;
}

export interface JoinReport {
  readonly generated_at: string;
  readonly dataset: string;
  readonly season_range: {
    readonly min: number | null;
    readonly max: number | null;
    readonly seasons: readonly number[];
    readonly source: string;
  };
  readonly inputs: {
    readonly rosters: StreamStats;
    readonly snap_counts: StreamStats;
    readonly contracts: StreamStats;
    readonly participation: readonly { readonly file: string; readonly rows: number }[];
    readonly participation_total_rows: number;
  };
  readonly roster_index: {
    readonly indexed_rows: number;
    readonly keys: number;
    readonly season_level_rows: number;
    readonly weekly_level_rows: number;
    readonly ambiguous_keys: number;
    /** The actual keys, capped, so an ambiguous key can be looked up in the source. */
    readonly ambiguous_key_samples: readonly string[];
    readonly refusals: Readonly<Record<string, number>>;
  };
  readonly pfr_index: {
    readonly keys: number;
    readonly ambiguous_keys: number;
    readonly roster_rows_with_blank_pfr_id: number;
  };
  readonly joins: {
    readonly participation_personnel: PersonnelJoinSummary;
    readonly snaps_to_rosters: SnapJoinSummary;
    readonly contracts_to_rosters: ContractJoinSummary;
  };
  readonly sample_joined_plays: readonly SampleJoinedPlay[];
  readonly notes: readonly string[];
}

export interface BuildJoinReportOptions {
  readonly rostersPath: string;
  readonly snapCountsPath: string;
  readonly contractsPath: string;
  readonly participationPaths: readonly string[];
  readonly sampleSize?: number;
  readonly generatedAt?: string;
}

export const DEFAULT_SAMPLE_SIZE = 20;

interface MutableSeasonPersonnel {
  readonly season: number;
  readonly file: string;
  rows: number;
  playsWithNullPersonnel: number;
  playsWithEmptyPersonnel: number;
  playsJoined: number;
  idsConsidered: number;
  idsMatched: number;
  idsUnmatched: number;
  idsBlank: number;
  idsAmbiguous: number;
  idsGsisFormat: number;
  idsNumericFormat: number;
  idsUnknownFormat: number;
}

function seasonTotalsFor(
  working: Map<number, MutableSeasonPersonnel>,
  season: number,
  file: string,
): MutableSeasonPersonnel {
  let entry = working.get(season);
  if (entry === undefined) {
    entry = {
      season,
      file,
      rows: 0,
      playsWithNullPersonnel: 0,
      playsWithEmptyPersonnel: 0,
      playsJoined: 0,
      idsConsidered: 0,
      idsMatched: 0,
      idsUnmatched: 0,
      idsBlank: 0,
      idsAmbiguous: 0,
      idsGsisFormat: 0,
      idsNumericFormat: 0,
      idsUnknownFormat: 0,
    };
    working.set(season, entry);
  }
  return entry;
}

export async function buildJoinReport(options: BuildJoinReportOptions): Promise<JoinReport> {
  const sampleSize = options.sampleSize ?? DEFAULT_SAMPLE_SIZE;

  const rosterBuilder = createRosterIndexBuilder();
  const rostersHandle = await streamJsonl(options.rostersPath, (raw) => rosterBuilder.add(raw));
  const rosterIndex = rosterBuilder.finish();

  const pfrIndex = indexRosterByPfrId(rosterIndex);
  const identityIndex = indexContractIdentities(rosterIndex);

  // Snaps ---------------------------------------------------------------
  const snapCounter = new JoinCounter();
  let matchedExactly = 0;
  let matchedAmbiguous = 0;
  const matchedRows: { game_id: string; pfr_player_id: string }[] = [];
  const snapHandle = await streamJsonl(options.snapCountsPath, (raw) => {
    const decision = parseSnapRow(raw);
    if (!decision.ok) {
      snapCounter.recordBlankKey();
      return;
    }
    const joined = joinSnapToRoster(decision.row, pfrIndex);
    if (joined.status === "unmatched") snapCounter.recordUnmatched();
    else {
      snapCounter.recordMatched(joined.status === "matched_ambiguous");
      if (matchedRows.length < 5) matchedRows.push({ game_id: decision.row.game_id, pfr_player_id: decision.row.pfr_player_id });
    }
    if (joined.status === "matched") matchedExactly += 1;
    if (joined.status === "matched_ambiguous") matchedAmbiguous += 1;
  });

  // Contracts ------------------------------------------------------------
  const contractCounter = new JoinCounter();
  const contractsHandle = await streamJsonl(options.contractsPath, (raw) => {
    const decision = parseContractRow(raw);
    if (!decision.ok) {
      contractCounter.recordBlankKey();
      return;
    }
    const joined = joinContractToRoster(decision.row, identityIndex);
    if (joined.status === "unmatched") contractCounter.recordUnmatched();
    else contractCounter.recordMatched(joined.ambiguous);
  });

  // Participation --------------------------------------------------------
  const playCounter = new JoinCounter();
  let playsWithNullPersonnel = 0;
  let playsWithEmptyPersonnel = 0;
  let playsWithUnusablePersonnel = 0;
  let playsJoined = 0;
  let idsConsidered = 0;
  let idsMatched = 0;
  let idsUnmatched = 0;
  let idsBlank = 0;
  let idsAmbiguous = 0;
  const sample: SampleJoinedPlay[] = [];
  const seasonViews = new Map<number, SeasonRosterIndex>();
  const perFile: { file: string; rows: number }[] = [];
  const perSeasonWorking = new Map<number, MutableSeasonPersonnel>();

  for (const path of options.participationPaths) {
    let fileRows = 0;
    const handle = await streamJsonl(path, (raw) => {
      fileRows += 1;
      const decision = parseParticipationRow(raw);
      if (!decision.ok) {
        playCounter.recordBlankKey();
        return;
      }
      const row = decision.row;
      const season = row.season;
      if (season === null) {
        playCounter.recordBlankKey();
        return;
      }
      const seasonTotalsRow = seasonTotalsFor(perSeasonWorking, season, path);
      seasonTotalsRow.rows += 1;

      const rawOnField = raw.players_on_field;
      if (rawOnField === null) {
        playCounter.recordBlankKey();
        playsWithNullPersonnel += 1;
        seasonTotalsRow.playsWithNullPersonnel += 1;
        return;
      }
      if (!isStringArray(rawOnField)) {
        playCounter.recordBlankKey();
        playsWithUnusablePersonnel += 1;
        return;
      }
      if (rawOnField.length === 0) {
        playCounter.recordBlankKey();
        playsWithEmptyPersonnel += 1;
        seasonTotalsRow.playsWithEmptyPersonnel += 1;
        return;
      }
      let view = seasonViews.get(season);
      if (view === undefined) {
        view = indexForSeason(rosterIndex, season);
        seasonViews.set(season, view);
      }

      const personnel = personnelForPlay(rawOnField, view);
      if (personnel === null) {
        playCounter.recordBlankKey();
        playsWithUnusablePersonnel += 1;
        return;
      }

      const ambiguous = personnel.ambiguousIds.length > 0;
      playCounter.recordMatched(ambiguous);
      playsJoined += 1;
      seasonTotalsRow.playsJoined += 1;
      idsConsidered += rawOnField.length;
      seasonTotalsRow.idsConsidered += rawOnField.length;
      for (const id of rawOnField) {
        const format = playersOnFieldIdFormat(id.trim());
        if (format === "gsis_id") seasonTotalsRow.idsGsisFormat += 1;
        else if (format === "numeric") seasonTotalsRow.idsNumericFormat += 1;
        else seasonTotalsRow.idsUnknownFormat += 1;
      }
      idsMatched += rawOnField.length - personnel.unmatched.length - personnel.blankIds;
      seasonTotalsRow.idsMatched += rawOnField.length - personnel.unmatched.length - personnel.blankIds;
      idsUnmatched += personnel.unmatched.length;
      seasonTotalsRow.idsUnmatched += personnel.unmatched.length;
      idsBlank += personnel.blankIds;
      seasonTotalsRow.idsBlank += personnel.blankIds;
      idsAmbiguous += personnel.ambiguousIds.length;
      seasonTotalsRow.idsAmbiguous += personnel.ambiguousIds.length;

      // Only plays that actually produced a matched roster row, so the sample
      // shows real join output. The 2018-2022 encoding is documented in perSeason.
      if (sample.length < sampleSize && personnel.matched.length > 0) {
        sample.push(toSamplePlay(row, personnel, rawOnField.length));
      }
    });
    perFile.push({ file: handle.path, rows: fileRows });
  }

  const participationTotalRows = perFile.reduce((sum, entry) => sum + entry.rows, 0);
  const idDenominator = idsMatched + idsUnmatched;
  const playCounts = playCounter.counts();
  const perSeason = [...perSeasonWorking.values()]
    .sort((a, b) => a.season - b.season)
    .map((entry) => {
      const denominator = entry.idsMatched + entry.idsUnmatched;
      return {
        season: entry.season,
        file: entry.file,
        rows: entry.rows,
        playsWithNullPersonnel: entry.playsWithNullPersonnel,
        playsWithEmptyPersonnel: entry.playsWithEmptyPersonnel,
        playsJoined: entry.playsJoined,
        idsConsidered: entry.idsConsidered,
        idsMatched: entry.idsMatched,
        idsUnmatched: entry.idsUnmatched,
        idsBlank: entry.idsBlank,
        idsAmbiguous: entry.idsAmbiguous,
        idsGsisFormat: entry.idsGsisFormat,
        idsNumericFormat: entry.idsNumericFormat,
        idsUnknownFormat: entry.idsUnknownFormat,
        idMatchRate: denominator === 0 ? null : entry.idsMatched / denominator,
      };
    });

  return {
    generated_at: options.generatedAt ?? new Date().toISOString(),
    dataset: "gse-dataset",
    season_range: {
      min: rosterIndex.seasonMin,
      max: rosterIndex.seasonMax,
      seasons: rosterIndex.byKey.size === 0 ? [] : collectSeasons(rosterIndex),
      source: "rosters.jsonl season column",
    },
    inputs: {
      rosters: rostersHandle.stats,
      snap_counts: snapHandle.stats,
      contracts: contractsHandle.stats,
      participation: perFile,
      participation_total_rows: participationTotalRows,
    },
    roster_index: {
      indexed_rows: rosterIndex.indexedRows,
      keys: rosterIndex.byKey.size,
      season_level_rows: rosterIndex.seasonLevelRows,
      weekly_level_rows: rosterIndex.weeklyLevelRows,
      ambiguous_keys: rosterIndex.ambiguousKeys,
      ambiguous_key_samples: [...rosterIndex.byKey.values()].filter((bucket) => bucket.ambiguous).slice(0, 20).map((bucket) => bucket.key),
      refusals: rosterIndex.refusals,
    },
    pfr_index: {
      keys: pfrIndex.byKey.size,
      ambiguous_keys: pfrIndex.ambiguousKeys,
      roster_rows_with_blank_pfr_id: pfrIndex.blankPfrRows,
    },
    joins: {
      participation_personnel: {
        ...playCounts,
        playsWithNullPersonnel,
        playsWithEmptyPersonnel,
        playsWithUnusablePersonnel,
        playsJoined,
        idsConsidered,
        idsMatched,
        idsUnmatched,
        idsBlank,
        idsAmbiguous,
        idMatchRate: idDenominator === 0 ? null : idsMatched / idDenominator,
        perFile,
        perSeason,
      },
      snaps_to_rosters: {
        ...snapCounter.counts(),
        matchedExactly,
        matchedAmbiguous,
        matchedRows,
      },
      contracts_to_rosters: {
        ...contractCounter.counts(),
        gsisIdsInRoster: identityIndex.byGsisId.size,
        gsisIdsAmbiguousInRoster: identityIndex.ambiguousIds,
      },
    },
    sample_joined_plays: sample,
    notes: [
      "ID FORMAT CHANGES BY SEASON. players_on_field holds raw jersey numbers in 2018-2022 and gsis ids in 2023-2025. See joins.participation_personnel.perSeason: idsNumericFormat and idsGsisFormat. The 2018-2022 ids cannot be resolved against a gsis roster and are reported as idsUnmatched, not coerced. The overall idMatchRate of about 0.38 is a consequence of that encoding split; in 2023-2025 it is 1.0.",
      "sample_joined_plays holds only plays that produced at least one matched roster row, so every id in it came out of the files and resolved against the roster. 2018-2022 plays are absent from the sample because their players_on_field values are jersey numbers and match nothing by construction.",
      "Personnel joins are scoped to the season parsed from nflverse_game_id; participation rows carry no season column.",
      "A players_on_field of null is counted as playsWithNullPersonnel and is never joined as an empty personnel list.",
      "personnelForPlay is season-scoped, not week-scoped. Weekly roster rows for the whole season are returned alongside the season-level row; consumers must filter on roster_level.",
      "A snap row whose pfr id resolves to more than one gsis_id is counted as matched_ambiguous and is given no gsis_id.",
      "A snap row with no roster match is kept as an unmatched row and is never given a synthesised gsis_id.",
      "Match rates are matched / eligible, where eligible is inputRows minus blankKey. idMatchRate is idsMatched / (idsMatched + idsUnmatched).",
      "Row counts are every line in the file, including lines a parser refused; refusals are counted separately and never silently dropped from the denominator.",
    ],
  };
}

function collectSeasons(index: RosterIndex): number[] {
  const seasons = new Set<number>();
  for (const bucket of index.byKey.values()) seasons.add(bucket.season);
  return [...seasons].sort((a, b) => a - b);
}

function toSamplePlay(row: ParticipationPlayerRow, personnel: PersonnelMatch, onFieldCount: number): SampleJoinedPlay {
  const seasonRows = personnel.matched.filter((record) => record.roster_level === "season");
  const weeklyRows = personnel.matched.filter((record) => record.roster_level === "weekly");
  const players: SamplePlayer[] = [];
  for (const record of [...seasonRows, ...weeklyRows]) {
    if (players.length >= 3) break;
    players.push({
      gsis_id: record.gsis_id,
      full_name: record.full_name,
      position: record.position,
      team: record.team,
      roster_level: record.roster_level,
      week: record.week,
    });
  }
  return {
    nflverse_game_id: row.nflverse_game_id,
    play_id: row.play_id,
    season: personnel.season,
    players_on_field_count: onFieldCount,
    matched_roster_rows: personnel.matched.length,
    unmatched_gsis_ids: personnel.unmatched.slice(0, 3),
    ambiguous_gsis_ids: personnel.ambiguousIds.slice(0, 3),
    blank_ids: personnel.blankIds,
    matched_players: players,
  };
}
