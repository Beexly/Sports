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
 * release (CC-BY-4.0). Season-aggregate rows (week 0) only. Historical fact, not a
 * projection or pick — `canPublishProjections` stays false.
 */

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
}

export interface NflverseNextGenStats {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly seasonType: "REG";
  readonly sourceRows: number;
  readonly receiving: readonly NgsReceivingLine[];
  readonly passing: readonly NgsPassingLine[];
  readonly rushing: readonly NgsRushingLine[];
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

/** NGS combined files carry weekly rows plus a season-aggregate row at week 0. */
function seasonAggregateRows(records: readonly CsvRecord[], season: number): readonly CsvRecord[] {
  return records.filter(
    (row) => row["season_type"] === "REG" && toNumber(row["week"]) === 0 && toNumber(row["season"]) === season,
  );
}

function name(row: CsvRecord): string {
  return row["player_display_name"] || `${row["player_first_name"] ?? ""} ${row["player_last_name"] ?? ""}`.trim() || "UNKNOWN";
}

function buildReceiving(records: readonly CsvRecord[], season: number): NgsReceivingLine[] {
  return seasonAggregateRows(records, season)
    .filter((row) => toNumber(row["targets"]) >= MIN_TARGETS)
    .map((row): NgsReceivingLine => ({
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
    }))
    .sort((a, b) => b.avgSeparation - a.avgSeparation)
    .slice(0, TOP_N);
}

function buildPassing(records: readonly CsvRecord[], season: number): NgsPassingLine[] {
  return seasonAggregateRows(records, season)
    .filter((row) => toNumber(row["attempts"]) >= MIN_ATTEMPTS)
    .map((row): NgsPassingLine => ({
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
    }))
    .sort((a, b) => b.cpoe - a.cpoe)
    .slice(0, TOP_N);
}

function buildRushing(records: readonly CsvRecord[], season: number): NgsRushingLine[] {
  return seasonAggregateRows(records, season)
    .filter((row) => toNumber(row["rush_attempts"]) >= MIN_RUSHES)
    .map((row): NgsRushingLine => ({
      playerId: row["player_gsis_id"] ?? "",
      playerName: name(row),
      team: row["team_abbr"] ?? "",
      rushAttempts: toNumber(row["rush_attempts"]),
      ryoePerAtt: round(toNumber(row["rush_yards_over_expected_per_att"])),
      efficiency: round(toNumber(row["efficiency"])),
      pctStackedBox: round(toNumber(row["percent_attempts_gte_eight_defenders"]) / 100, 3),
      avgTimeToLos: round(toNumber(row["avg_time_to_los"])),
    }))
    .sort((a, b) => b.ryoePerAtt - a.ryoePerAtt)
    .slice(0, TOP_N);
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
    const value: NflverseNextGenStats = {
      generatedAt: new Date().toISOString(),
      status: "live",
      season: activeSeason,
      seasonType: "REG",
      sourceRows: receiving.records.length + passing.records.length + rushing.records.length,
      receiving: buildReceiving(receiving.records, activeSeason),
      passing: buildPassing(passing.records, activeSeason),
      rushing: buildRushing(rushing.records, activeSeason),
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
