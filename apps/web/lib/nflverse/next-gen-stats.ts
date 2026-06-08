import { gunzipSync } from "node:zlib";
import { assertIngestible, fetchWithFailover, NFLVERSE_BASE, parseCsv, withMirrors } from "@sports/data-ingestion";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";

type NgsVariant = "receiving" | "passing" | "rushing";

/**
 * The per-season NGS assets (ngs_YYYY_receiving.csv.gz) are unreliable upstream
 * (some years are near-empty stubs). The non-seasonal combined files
 * (ngs_receiving.csv.gz) carry every season, so we read those and filter by
 * season — the same approach player_stats.csv.gz uses.
 */
function ngsCombinedUrl(variant: NgsVariant): string {
  return `${NFLVERSE_BASE}/nextgen_stats/ngs_${variant}.csv.gz`;
}

/**
 * NFL Next Gen Stats (NGS) — tracking-derived metrics that appear in NO box score:
 * receiver separation/cushion/YAC-over-expected, QB CPOE / time-to-throw, and RB
 * rush-yards-over-expected. Read-only from the openly-licensed nflverse `nextgen_stats`
 * release (CC-BY-4.0). Historical fact, not a projection or pick — `canPublishProjections`
 * stays false.
 *
 * The combined files carry BOTH a season-aggregate row (week 0) and one row per played
 * week. We expose the season aggregate (leader boards, unchanged API), the raw weekly
 * grain, and a 4-week trailing aggregate (recent form) for all three variants. Columns
 * that nflverse leaves blank for a given season (e.g. rushing `expected_rush_yards`
 * before the RYOE model existed) are surfaced as `null` — never coerced to a fabricated
 * zero.
 */

/** Number of trailing played weeks that define "recent form". */
export const TRAILING_WINDOW = 4;

export interface NgsReceivingLine {
  readonly playerId: string;
  readonly playerName: string;
  readonly team: string;
  readonly position: string;
  readonly targets: number;
  readonly receptions: number;
  readonly avgSeparation: number;
  readonly avgCushion: number;
  readonly avgYacAboveExpectation: number;
  readonly shareOfIntendedAirYards: number;
  readonly catchPct: number;
  // Previously-dropped real columns (null when absent for the season).
  readonly avgIntendedAirYards: number | null;
  readonly avgExpectedYac: number | null;
  readonly avgYac: number | null;
}

export interface NgsPassingLine {
  readonly playerId: string;
  readonly playerName: string;
  readonly team: string;
  readonly attempts: number;
  readonly cpoe: number; // completion % above expectation
  readonly completionPct: number;
  readonly expectedCompletionPct: number;
  readonly avgTimeToThrow: number;
  readonly aggressiveness: number;
  readonly passerRating: number;
  // Previously-dropped real columns (null when absent for the season).
  readonly avgAirYardsToSticks: number | null;
  readonly avgAirYardsDifferential: number | null;
  readonly maxAirDistance: number | null;
}

export interface NgsRushingLine {
  readonly playerId: string;
  readonly playerName: string;
  readonly team: string;
  readonly rushAttempts: number;
  readonly ryoePerAtt: number; // rush yards over expected per attempt
  readonly efficiency: number;
  readonly pctStackedBox: number; // % attempts vs 8+ defenders
  readonly avgTimeToLos: number;
  // Previously-dropped real columns (null when absent for the season — e.g. pre-RYOE seasons).
  readonly expectedRushYards: number | null;
  readonly rushPctOverExpected: number | null;
}

/**
 * One played-week row per variant (week >= 1). Same shape as the season line minus the
 * leader-board-only framing, plus the `week` it describes. Weekly rows are the raw grain
 * the season aggregate is built from; the trailing aggregate is computed from these.
 */
export interface NgsReceivingWeek extends NgsReceivingLine {
  readonly week: number;
}
export interface NgsPassingWeek extends NgsPassingLine {
  readonly week: number;
}
export interface NgsRushingWeek extends NgsRushingLine {
  readonly week: number;
}

/**
 * 4-week trailing aggregate (recent form) for one player/variant. Means are computed over
 * the player's own most-recent <= TRAILING_WINDOW played weeks present in the data — no
 * inferred zero-fill for missing weeks. Volume fields (attempts/targets/rushAttempts) are
 * summed; rate/tracking fields are averaged over the weeks that actually carry a value.
 */
export interface NgsTrailingReceiving {
  readonly playerId: string;
  readonly playerName: string;
  readonly team: string;
  readonly position: string;
  readonly weeks: number; // count of weeks in the window (1..TRAILING_WINDOW)
  readonly windowStartWeek: number;
  readonly windowEndWeek: number;
  readonly targets: number;
  readonly receptions: number;
  readonly avgSeparation: number | null;
  readonly avgCushion: number | null;
  readonly avgYacAboveExpectation: number | null;
  readonly shareOfIntendedAirYards: number | null;
  readonly catchPct: number | null;
  readonly avgIntendedAirYards: number | null;
  readonly avgExpectedYac: number | null;
  readonly avgYac: number | null;
}
export interface NgsTrailingPassing {
  readonly playerId: string;
  readonly playerName: string;
  readonly team: string;
  readonly weeks: number;
  readonly windowStartWeek: number;
  readonly windowEndWeek: number;
  readonly attempts: number;
  readonly cpoe: number | null;
  readonly completionPct: number | null;
  readonly expectedCompletionPct: number | null;
  readonly avgTimeToThrow: number | null;
  readonly aggressiveness: number | null;
  readonly passerRating: number | null;
  readonly avgAirYardsToSticks: number | null;
  readonly avgAirYardsDifferential: number | null;
  readonly maxAirDistance: number | null;
}
export interface NgsTrailingRushing {
  readonly playerId: string;
  readonly playerName: string;
  readonly team: string;
  readonly weeks: number;
  readonly windowStartWeek: number;
  readonly windowEndWeek: number;
  readonly rushAttempts: number;
  readonly ryoePerAtt: number | null;
  readonly efficiency: number | null;
  readonly pctStackedBox: number | null;
  readonly avgTimeToLos: number | null;
  readonly expectedRushYards: number | null;
  readonly rushPctOverExpected: number | null;
}

export interface NflverseNextGenStats {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly seasonType: "REG";
  readonly sourceRows: number;
  /** Season-aggregate leader boards (week 0). Unchanged API for existing callers. */
  readonly receiving: readonly NgsReceivingLine[];
  readonly passing: readonly NgsPassingLine[];
  readonly rushing: readonly NgsRushingLine[];
  /** Raw played-week grain (week >= 1), every player, sorted by player then week. */
  readonly receivingWeekly: readonly NgsReceivingWeek[];
  readonly passingWeekly: readonly NgsPassingWeek[];
  readonly rushingWeekly: readonly NgsRushingWeek[];
  /** 4-week trailing aggregate (recent form), one row per qualifying player. */
  readonly receivingTrailing: readonly NgsTrailingReceiving[];
  readonly passingTrailing: readonly NgsTrailingPassing[];
  readonly rushingTrailing: readonly NgsTrailingRushing[];
  /** Width of the trailing recent-form window, in played weeks. */
  readonly trailingWindow: number;
  readonly canPublishProjections: false;
  readonly blockReason: string;
  readonly sourceUrls: Record<"receiving" | "passing" | "rushing", string>;
  readonly error: string | null;
}

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const MIN_TARGETS = 30;
const MIN_ATTEMPTS = 100;
const MIN_RUSHES = 50;
const TOP_N = 25;

let ngsCache: { readonly expiresAt: number; readonly value: NflverseNextGenStats } | null = null;

function toNumber(value: string | undefined): number {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Parse a cell that may be legitimately absent (blank string for seasons where nflverse
 * never computed the metric). Returns `null` rather than a fabricated 0 — the integrity
 * rule: absent columns show as an honest dash, never an invented value.
 */
function finite(value: string | undefined, decimals = 2): number | null {
  if (value === undefined || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? round(parsed, decimals) : null;
}

/** Mean of only the values that are actually present; null when none are. */
function meanOf(values: readonly (number | null)[], decimals = 2): number | null {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  return round(present.reduce((s, v) => s + v, 0) / present.length, decimals);
}

/** Max of only the values that are present; null when none are. */
function maxOf(values: readonly (number | null)[], decimals = 2): number | null {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  return round(Math.max(...present), decimals);
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

async function fetchNgsVariant({
  variant,
  fetcher,
  timeoutMs,
}: {
  variant: NgsVariant;
  fetcher: FetchLike;
  timeoutMs: number;
}): Promise<{ readonly url: string; readonly records: readonly CsvRecord[] }> {
  const url = ngsCombinedUrl(variant);
  const { response } = await fetchWithFailover(withMirrors(url), fetcher, { timeoutMs });
  const buffer = Buffer.from(await response.arrayBuffer());
  const text = gunzipSync(buffer).toString("utf8");
  return { url, records: parseCsv(text).records };
}

/** Latest REG season that actually has season-aggregate (week 0) rows, at or before requested. */
function resolveActiveSeason(records: readonly CsvRecord[], requested: number): number {
  const seasons = Array.from(
    new Set(
      records
        .filter((row) => row["season_type"] === "REG" && toNumber(row["week"]) === 0)
        .map((row) => toNumber(row["season"]))
        .filter((season) => season > 0),
    ),
  ).sort((a, b) => a - b);
  const atOrBefore = seasons.filter((season) => season <= requested);
  return atOrBefore.at(-1) ?? seasons.at(-1) ?? requested;
}

/** REG rows for a season, split by grain: week 0 is the season aggregate; week >= 1 is weekly. */
function seasonRows(records: readonly CsvRecord[], season: number): readonly CsvRecord[] {
  return records.filter((row) => row["season_type"] === "REG" && toNumber(row["season"]) === season);
}
function seasonAggregateRows(records: readonly CsvRecord[], season: number): readonly CsvRecord[] {
  return seasonRows(records, season).filter((row) => toNumber(row["week"]) === 0);
}
function weeklyRows(records: readonly CsvRecord[], season: number): readonly CsvRecord[] {
  return seasonRows(records, season).filter((row) => toNumber(row["week"]) >= 1);
}

function name(row: CsvRecord): string {
  return row["player_display_name"] || `${row["player_first_name"] ?? ""} ${row["player_last_name"] ?? ""}`.trim() || "UNKNOWN";
}

// --- Row mappers: one CSV row -> one typed line (shared by season-aggregate and weekly grain) ---

function mapReceiving(row: CsvRecord): NgsReceivingLine {
  return {
    playerId: row["player_gsis_id"] ?? "",
    playerName: name(row),
    team: row["team_abbr"] ?? "",
    position: row["player_position"] ?? "",
    targets: toNumber(row["targets"]),
    receptions: toNumber(row["receptions"]),
    avgSeparation: round(toNumber(row["avg_separation"])),
    avgCushion: round(toNumber(row["avg_cushion"])),
    avgYacAboveExpectation: round(toNumber(row["avg_yac_above_expectation"])),
    shareOfIntendedAirYards: round(toNumber(row["percent_share_of_intended_air_yards"]) / 100, 3),
    catchPct: round(toNumber(row["catch_percentage"]) / 100, 3),
    avgIntendedAirYards: finite(row["avg_intended_air_yards"]),
    avgExpectedYac: finite(row["avg_expected_yac"]),
    avgYac: finite(row["avg_yac"]),
  };
}

function mapPassing(row: CsvRecord): NgsPassingLine {
  return {
    playerId: row["player_gsis_id"] ?? "",
    playerName: name(row),
    team: row["team_abbr"] ?? "",
    attempts: toNumber(row["attempts"]),
    cpoe: round(toNumber(row["completion_percentage_above_expectation"])),
    completionPct: round(toNumber(row["completion_percentage"]), 1),
    expectedCompletionPct: round(toNumber(row["expected_completion_percentage"]), 1),
    avgTimeToThrow: round(toNumber(row["avg_time_to_throw"])),
    aggressiveness: round(toNumber(row["aggressiveness"]), 1),
    passerRating: round(toNumber(row["passer_rating"]), 1),
    avgAirYardsToSticks: finite(row["avg_air_yards_to_sticks"]),
    avgAirYardsDifferential: finite(row["avg_air_yards_differential"]),
    maxAirDistance: finite(row["max_air_distance"]),
  };
}

function mapRushing(row: CsvRecord): NgsRushingLine {
  return {
    playerId: row["player_gsis_id"] ?? "",
    playerName: name(row),
    team: row["team_abbr"] ?? "",
    rushAttempts: toNumber(row["rush_attempts"]),
    ryoePerAtt: round(toNumber(row["rush_yards_over_expected_per_att"])),
    efficiency: round(toNumber(row["efficiency"])),
    pctStackedBox: round(toNumber(row["percent_attempts_gte_eight_defenders"]) / 100, 3),
    avgTimeToLos: round(toNumber(row["avg_time_to_los"])),
    expectedRushYards: finite(row["expected_rush_yards"]),
    rushPctOverExpected: finite(row["rush_pct_over_expected"], 3),
  };
}

// --- Season-aggregate leader boards (week 0). Unchanged ranking + thresholds + TOP_N. ---

function buildReceiving(records: readonly CsvRecord[], season: number): NgsReceivingLine[] {
  return seasonAggregateRows(records, season)
    .filter((row) => toNumber(row["targets"]) >= MIN_TARGETS)
    .map(mapReceiving)
    .sort((a, b) => b.avgSeparation - a.avgSeparation)
    .slice(0, TOP_N);
}

function buildPassing(records: readonly CsvRecord[], season: number): NgsPassingLine[] {
  return seasonAggregateRows(records, season)
    .filter((row) => toNumber(row["attempts"]) >= MIN_ATTEMPTS)
    .map(mapPassing)
    .sort((a, b) => b.cpoe - a.cpoe)
    .slice(0, TOP_N);
}

function buildRushing(records: readonly CsvRecord[], season: number): NgsRushingLine[] {
  return seasonAggregateRows(records, season)
    .filter((row) => toNumber(row["rush_attempts"]) >= MIN_RUSHES)
    .map(mapRushing)
    .sort((a, b) => b.ryoePerAtt - a.ryoePerAtt)
    .slice(0, TOP_N);
}

// --- Weekly grain (week >= 1): every player, every played week, sorted by player then week. ---

function buildReceivingWeekly(records: readonly CsvRecord[], season: number): NgsReceivingWeek[] {
  return weeklyRows(records, season)
    .map((row): NgsReceivingWeek => ({ ...mapReceiving(row), week: toNumber(row["week"]) }))
    .sort((a, b) => a.playerId.localeCompare(b.playerId) || a.week - b.week);
}
function buildPassingWeekly(records: readonly CsvRecord[], season: number): NgsPassingWeek[] {
  return weeklyRows(records, season)
    .map((row): NgsPassingWeek => ({ ...mapPassing(row), week: toNumber(row["week"]) }))
    .sort((a, b) => a.playerId.localeCompare(b.playerId) || a.week - b.week);
}
function buildRushingWeekly(records: readonly CsvRecord[], season: number): NgsRushingWeek[] {
  return weeklyRows(records, season)
    .map((row): NgsRushingWeek => ({ ...mapRushing(row), week: toNumber(row["week"]) }))
    .sort((a, b) => a.playerId.localeCompare(b.playerId) || a.week - b.week);
}

/** Group weekly rows by player, keep the most-recent <= TRAILING_WINDOW played weeks. */
function trailingWindowGroups<T extends { playerId: string; week: number }>(
  weekly: readonly T[],
): Map<string, T[]> {
  const byPlayer = new Map<string, T[]>();
  for (const row of weekly) {
    if (!row.playerId) continue;
    const list = byPlayer.get(row.playerId) ?? [];
    list.push(row);
    byPlayer.set(row.playerId, list);
  }
  for (const [id, list] of byPlayer) {
    const window = [...list].sort((a, b) => b.week - a.week).slice(0, TRAILING_WINDOW);
    window.sort((a, b) => a.week - b.week);
    byPlayer.set(id, window);
  }
  return byPlayer;
}

function buildReceivingTrailing(weekly: readonly NgsReceivingWeek[]): NgsTrailingReceiving[] {
  const rows: NgsTrailingReceiving[] = [];
  for (const [, w] of trailingWindowGroups(weekly)) {
    const last = w[w.length - 1]!;
    rows.push({
      playerId: last.playerId,
      playerName: last.playerName,
      team: last.team,
      position: last.position,
      weeks: w.length,
      windowStartWeek: w[0]!.week,
      windowEndWeek: last.week,
      targets: w.reduce((s, r) => s + r.targets, 0),
      receptions: w.reduce((s, r) => s + r.receptions, 0),
      avgSeparation: meanOf(w.map((r) => r.avgSeparation)),
      avgCushion: meanOf(w.map((r) => r.avgCushion)),
      avgYacAboveExpectation: meanOf(w.map((r) => r.avgYacAboveExpectation)),
      shareOfIntendedAirYards: meanOf(w.map((r) => r.shareOfIntendedAirYards), 3),
      catchPct: meanOf(w.map((r) => r.catchPct), 3),
      avgIntendedAirYards: meanOf(w.map((r) => r.avgIntendedAirYards)),
      avgExpectedYac: meanOf(w.map((r) => r.avgExpectedYac)),
      avgYac: meanOf(w.map((r) => r.avgYac)),
    });
  }
  return rows.sort((a, b) => a.playerId.localeCompare(b.playerId));
}

function buildPassingTrailing(weekly: readonly NgsPassingWeek[]): NgsTrailingPassing[] {
  const rows: NgsTrailingPassing[] = [];
  for (const [, w] of trailingWindowGroups(weekly)) {
    const last = w[w.length - 1]!;
    rows.push({
      playerId: last.playerId,
      playerName: last.playerName,
      team: last.team,
      weeks: w.length,
      windowStartWeek: w[0]!.week,
      windowEndWeek: last.week,
      attempts: w.reduce((s, r) => s + r.attempts, 0),
      cpoe: meanOf(w.map((r) => r.cpoe)),
      completionPct: meanOf(w.map((r) => r.completionPct), 1),
      expectedCompletionPct: meanOf(w.map((r) => r.expectedCompletionPct), 1),
      avgTimeToThrow: meanOf(w.map((r) => r.avgTimeToThrow)),
      aggressiveness: meanOf(w.map((r) => r.aggressiveness), 1),
      passerRating: meanOf(w.map((r) => r.passerRating), 1),
      avgAirYardsToSticks: meanOf(w.map((r) => r.avgAirYardsToSticks)),
      avgAirYardsDifferential: meanOf(w.map((r) => r.avgAirYardsDifferential)),
      maxAirDistance: maxOf(w.map((r) => r.maxAirDistance)),
    });
  }
  return rows.sort((a, b) => a.playerId.localeCompare(b.playerId));
}

function buildRushingTrailing(weekly: readonly NgsRushingWeek[]): NgsTrailingRushing[] {
  const rows: NgsTrailingRushing[] = [];
  for (const [, w] of trailingWindowGroups(weekly)) {
    const last = w[w.length - 1]!;
    rows.push({
      playerId: last.playerId,
      playerName: last.playerName,
      team: last.team,
      weeks: w.length,
      windowStartWeek: w[0]!.week,
      windowEndWeek: last.week,
      rushAttempts: w.reduce((s, r) => s + r.rushAttempts, 0),
      ryoePerAtt: meanOf(w.map((r) => r.ryoePerAtt)),
      efficiency: meanOf(w.map((r) => r.efficiency)),
      pctStackedBox: meanOf(w.map((r) => r.pctStackedBox), 3),
      avgTimeToLos: meanOf(w.map((r) => r.avgTimeToLos)),
      expectedRushYards: meanOf(w.map((r) => r.expectedRushYards)),
      rushPctOverExpected: meanOf(w.map((r) => r.rushPctOverExpected), 3),
    });
  }
  return rows.sort((a, b) => a.playerId.localeCompare(b.playerId));
}

export function resetNextGenStatsCacheForTests(): void {
  ngsCache = null;
}

export async function loadNflverseNextGenStats({
  season = latestNflverseInspectionSeason(),
  timeoutMs = 15000,
  cacheTtlMs = 30 * 60 * 1000,
  fetcher = fetch,
}: {
  season?: number;
  timeoutMs?: number;
  cacheTtlMs?: number;
  fetcher?: FetchLike;
} = {}): Promise<NflverseNextGenStats> {
  // Governance: a forbidden/paid source would throw here before any fetch.
  assertIngestible("nflverse");

  const now = Date.now();
  if (cacheTtlMs > 0 && fetcher === fetch && ngsCache && ngsCache.expiresAt > now) {
    return ngsCache.value;
  }

  try {
    const [receiving, passing, rushing] = await Promise.all([
      fetchNgsVariant({ variant: "receiving", fetcher, timeoutMs }),
      fetchNgsVariant({ variant: "passing", fetcher, timeoutMs }),
      fetchNgsVariant({ variant: "rushing", fetcher, timeoutMs }),
    ]);
    const activeSeason = resolveActiveSeason(receiving.records, season);
    const receivingWeekly = buildReceivingWeekly(receiving.records, activeSeason);
    const passingWeekly = buildPassingWeekly(passing.records, activeSeason);
    const rushingWeekly = buildRushingWeekly(rushing.records, activeSeason);
    const value: NflverseNextGenStats = {
      generatedAt: new Date().toISOString(),
      status: "live",
      season: activeSeason,
      seasonType: "REG",
      sourceRows: receiving.records.length + passing.records.length + rushing.records.length,
      receiving: buildReceiving(receiving.records, activeSeason),
      passing: buildPassing(passing.records, activeSeason),
      rushing: buildRushing(rushing.records, activeSeason),
      receivingWeekly,
      passingWeekly,
      rushingWeekly,
      receivingTrailing: buildReceivingTrailing(receivingWeekly),
      passingTrailing: buildPassingTrailing(passingWeekly),
      rushingTrailing: buildRushingTrailing(rushingWeekly),
      trailingWindow: TRAILING_WINDOW,
      canPublishProjections: false,
      blockReason:
        "Next Gen Stats are real tracking-derived season aggregates from nflverse. They describe what happened, not what will happen; nothing here is a projection, pick, or significant trend.",
      sourceUrls: { receiving: receiving.url, passing: passing.url, rushing: rushing.url },
      error: null,
    };
    if (cacheTtlMs > 0 && fetcher === fetch) ngsCache = { expiresAt: now + cacheTtlMs, value };
    return value;
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      status: "source-error",
      season,
      seasonType: "REG",
      sourceRows: 0,
      receiving: [],
      passing: [],
      rushing: [],
      receivingWeekly: [],
      passingWeekly: [],
      rushingWeekly: [],
      receivingTrailing: [],
      passingTrailing: [],
      rushingTrailing: [],
      trailingWindow: TRAILING_WINDOW,
      canPublishProjections: false,
      blockReason:
        "Next Gen Stats could not load from nflverse. The product shows an empty state instead of fabricated tracking data.",
      sourceUrls: {
        receiving: ngsCombinedUrl("receiving"),
        passing: ngsCombinedUrl("passing"),
        rushing: ngsCombinedUrl("rushing"),
      },
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
