/**
 * Schedule / venue / rest context — the game-environment row the box score never
 * shows but every sharp checks first.
 *
 * nflverse publishes the authoritative game master as `games.csv` (Lee Sharpe's
 * nfldata, CC-BY-4.0): one row per game with rest days, dome/outdoor roof,
 * playing surface, divisional flag, kickoff temperature/wind, and the CLOSING
 * spread / total. `clv-calibration.ts` already fetches this file to grade closing
 * lines, but its rest / venue / weather columns go unused there. This loader
 * surfaces them for the current (or most-recent scheduled) week, keyed per game.
 *
 * INTEGRITY: real columns only. Future games legitimately ship with empty
 * spread/total/temp/wind (the line and weather are not posted yet) — those are
 * returned as `null` and the UI shows an honest dash, never an invented number.
 * `div_game` is the only field projected to a boolean; everything else is the raw
 * nflverse value parsed to a number/string or left null when absent.
 *
 * Read-only, real nflverse data (CC-BY-4.0), multi-host failover, honest
 * source-error. Performs no writes and is not a scoring input.
 * canPublishProjections false — this is game context, not a point projection or pick.
 */

import { assertIngestible, fetchWithFailover, nflverseUrl, parseCsv, withMirrors } from "@sports/data-ingestion";

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Roof state as nflverse reports it; "unknown" when the source value is absent/foreign. */
export type RoofType = "dome" | "outdoors" | "closed" | "open" | "retractable" | "unknown";

export interface ScheduleContextRow {
  readonly gameId: string; // nflverse game_id, e.g. "2026_18_DAL_WAS"
  readonly season: number;
  readonly week: number;
  readonly gameType: string; // REG | POST | etc.
  readonly gameday: string; // ISO date string from the source (may be empty)
  readonly awayTeam: string;
  readonly homeTeam: string;
  readonly game: string; // "AWAY @ HOME"
  readonly homeRest: number | null; // days of rest, null if absent
  readonly awayRest: number | null;
  readonly restEdge: number | null; // home_rest - away_rest, null if either absent
  readonly roof: RoofType;
  readonly surface: string | null; // grass | fieldturf | sportturf | ...
  readonly divGame: boolean; // div_game == 1
  readonly temp: number | null; // kickoff temperature (F); null when not yet posted
  readonly wind: number | null; // kickoff wind (mph); null when not yet posted
  readonly spreadLine: number | null; // CLOSING spread (+ = home favored); null pre-posting
  readonly totalLine: number | null; // CLOSING total; null pre-posting
}

export interface ScheduleContext {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly week: number;
  readonly sourceRows: number; // total schedule rows read
  readonly rows: readonly ScheduleContextRow[];
  readonly canPublishProjections: false;
  readonly note: string;
  readonly sourceUrl: string;
  readonly error: string | null;
}

let cache: { readonly expiresAt: number; readonly value: ScheduleContext } | null = null;

function finite(v: string | undefined): number | null {
  const n = Number(v ?? "");
  return Number.isFinite(n) && v !== undefined && v !== "" ? n : null;
}

function num(v: string | undefined): number {
  const n = Number(v ?? "");
  return Number.isFinite(n) ? n : 0;
}

function roofOf(v: string | undefined): RoofType {
  switch ((v ?? "").trim().toLowerCase()) {
    case "dome":
      return "dome";
    case "outdoors":
      return "outdoors";
    case "closed":
      return "closed";
    case "open":
      return "open";
    case "retractable":
      return "retractable";
    default:
      return "unknown";
  }
}

function surfaceOf(v: string | undefined): string | null {
  const s = (v ?? "").trim();
  return s.length > 0 ? s : null;
}

/**
 * A game is "scheduled" (has a real kickoff slot) once it carries both teams and
 * a season/week. We do NOT require scores or a posted line — future games qualify
 * and simply report null lines/weather.
 */
function isScheduled(r: CsvRecord): boolean {
  return Boolean(r["away_team"]) && Boolean(r["home_team"]) && finite(r["week"]) !== null && finite(r["season"]) !== null;
}

/**
 * Pick the (season, week) to surface: the latest scheduled REG/POST week in the
 * file at or before `requested` season, preferring the most recent week of the
 * latest season present. The games.csv file extends to the full upcoming season,
 * so "most-recent week" means the highest (season, week) that has scheduled rows.
 */
export function resolveTargetWeek(
  records: readonly CsvRecord[],
  requested?: { season?: number; week?: number },
): { season: number; week: number } | null {
  const scheduled = records.filter(isScheduled);
  if (scheduled.length === 0) return null;

  if (requested?.season != null && requested?.week != null) {
    return { season: requested.season, week: requested.week };
  }

  // Latest season present (bounded by requested.season when given).
  const seasons = scheduled
    .map((r) => num(r["season"]))
    .filter((s) => s > 0 && (requested?.season == null || s <= requested.season));
  if (seasons.length === 0) return null;
  const season = Math.max(...seasons);

  const weeks = scheduled.filter((r) => num(r["season"]) === season).map((r) => num(r["week"]));
  if (weeks.length === 0) return null;
  const week = Math.max(...weeks);
  return { season, week };
}

/**
 * Project the schedule rows for one (season, week) into compact, serializable
 * context rows. PURE — the loader feeds real records, tests feed a fixture.
 * Missing line/weather fields become null (honest dash), never fabricated.
 */
export function buildScheduleContext(
  records: readonly CsvRecord[],
  season: number,
  week: number,
): ScheduleContextRow[] {
  const rows: ScheduleContextRow[] = [];
  for (const r of records) {
    if (!isScheduled(r)) continue;
    if (num(r["season"]) !== season || num(r["week"]) !== week) continue;

    const away = r["away_team"] ?? "";
    const home = r["home_team"] ?? "";
    const homeRest = finite(r["home_rest"]);
    const awayRest = finite(r["away_rest"]);

    rows.push({
      gameId: r["game_id"] ?? `${season}_${week}_${away}_${home}`,
      season,
      week,
      gameType: r["game_type"] ?? "REG",
      gameday: r["gameday"] ?? "",
      awayTeam: away,
      homeTeam: home,
      game: `${away} @ ${home}`,
      homeRest,
      awayRest,
      restEdge: homeRest != null && awayRest != null ? homeRest - awayRest : null,
      roof: roofOf(r["roof"]),
      surface: surfaceOf(r["surface"]),
      divGame: num(r["div_game"]) === 1,
      temp: finite(r["temp"]),
      wind: finite(r["wind"]),
      spreadLine: finite(r["spread_line"]),
      totalLine: finite(r["total_line"]),
    });
  }

  // Stable order: away @ home alphabetical, so the table reads deterministically.
  rows.sort((a, b) => a.game.localeCompare(b.game));
  return rows;
}

export function resetScheduleContextCacheForTests(): void {
  cache = null;
}

/**
 * Load per-game schedule / venue / rest context for the current (or most-recent
 * scheduled) week from nflverse `games.csv`. Pass `{ season, week }` to pin a
 * specific week; otherwise the latest scheduled week in the file is used.
 *
 * nflverse `games.csv` columns used (defensive — missing → null, never invented):
 *   game_id, season, game_type, week, gameday, away_team, home_team,
 *   home_rest, away_rest, roof, surface, div_game, temp, wind,
 *   spread_line, total_line
 */
export async function loadScheduleContext({
  season,
  week,
  timeoutMs = 15000,
  cacheTtlMs = 30 * 60 * 1000,
  fetcher = fetch,
}: {
  season?: number;
  week?: number;
  timeoutMs?: number;
  cacheTtlMs?: number;
  fetcher?: FetchLike;
} = {}): Promise<ScheduleContext> {
  // Governance: a forbidden/paid source would throw here before any fetch.
  assertIngestible("nflverse");

  // A call is "default" only when neither season nor week is bound; only that call
  // reads/writes the shared cache. A season-bounded or fully-pinned call must bypass
  // the cache so it can never serve a different season's result.
  const isDefault = season == null && week == null;
  const now = Date.now();
  if (isDefault && cacheTtlMs > 0 && fetcher === fetch && cache && cache.expiresAt > now) {
    return cache.value;
  }

  const url = nflverseUrl("schedules", 0);
  try {
    const { response } = await fetchWithFailover(withMirrors(url), fetcher, { timeoutMs });
    const { records } = parseCsv(await response.text());
    if (records.length === 0) throw new Error("empty schedules");

    // Bound the resolution whenever a season is supplied (week optional → the
    // latest scheduled week of that season), so a caller can pin the schedule to
    // the data season without already knowing the target week. Fully unbounded
    // only on the default call (latest scheduled week of the most recent season).
    const target = resolveTargetWeek(records, season != null ? { season, week } : undefined);
    if (target === null) throw new Error("no scheduled games in schedule file");

    const rows = buildScheduleContext(records, target.season, target.week);
    const value: ScheduleContext = {
      generatedAt: new Date().toISOString(),
      status: "live",
      season: target.season,
      week: target.week,
      sourceRows: records.length,
      rows,
      canPublishProjections: false,
      note: "Per-game rest, roof, surface, divisional flag, kickoff weather, and the CLOSING spread/total for the week, read from nflverse schedules (games.csv). Lines and weather that are not yet posted show as a dash rather than a fabricated number. Context, not a point projection or pick.",
      sourceUrl: url,
      error: null,
    };
    if (isDefault && cacheTtlMs > 0 && fetcher === fetch) cache = { expiresAt: now + cacheTtlMs, value };
    return value;
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      status: "source-error",
      season: 0,
      week: 0,
      sourceRows: 0,
      rows: [],
      canPublishProjections: false,
      note: "Schedule context could not load from nflverse schedules. The product shows an empty state instead of fabricated rest/venue/weather data.",
      sourceUrl: url,
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
