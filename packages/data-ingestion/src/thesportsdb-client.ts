/**
 * TheSportsDB free API — keyless/low-key enrichment fallback (NOT a primary feed).
 *
 * Used as independent enrichment INPUTS only:
 *  - NFL team metadata (stadium, location, colors, badges, crosswalk IDs)
 *  - Season schedules / completed scores (when populated upstream)
 *  - Team rosters / player bios (position, height, nationality — no advanced metrics)
 *
 * NEVER an odds source. No odds endpoints exist on the free tier.
 * Never invents scores, stadiums, or player records. Soft-fails empty on
 * HTTP/parse miss.
 *
 * Access: genuinely free at point of access (thesportsdb.com/free_sports_api,
 * fetched 2026-09-18). The documented public evaluation key "3" is used by
 * default; a production key may be supplied via `options.apiKey` or the
 * `SPORTSDB_API_KEY` env var. "3" is a PUBLIC demo key (documented upstream),
 * not a secret — no credential handling required.
 *
 * Good-citizen throttling: upstream docs imply ~30 req/min; this client
 * enforces a minimum 2500ms gap between requests (max ~24/min, comfortably
 * under). Caching results in the caller is strongly recommended — this data
 * changes rarely (team metadata, seasonal schedules).
 *
 * Coverage gaps vs nflverse/ESPN are documented in
 * docs/research/2026-09-18-props-reverse-engineering/firecrawl/THESPORTSDB-COVERAGE-GAPS.md
 */

import { normalizeComparableText } from "./team-text-match.js";

const SPORTSDB_BASE = "https://www.thesportsdb.com/api/v1/json";
/** Public evaluation key documented by TheSportsDB for the free tier. */
const SPORTSDB_PUBLIC_KEY = "3";
/** Minimum gap between upstream requests (good citizenship, well under ~30/min). */
const SPORTSDB_MIN_REQUEST_INTERVAL_MS = 2500;
/** TheSportsDB league id for the NFL (CONFIRMED from live search_all_teams payload 2026-09-18). */
export const SPORTSDB_NFL_LEAGUE_ID = "4391";

export type SportsDbTeam = {
  readonly idTeam: string;
  /** Crosswalk IDs as published upstream (may be null/empty for some teams). */
  readonly espnId: string | null;
  readonly apiFootballId: string | null;
  readonly name: string;
  readonly short: string | null;
  readonly alternate: string | null;
  readonly league: string;
  readonly stadium: string | null;
  readonly location: string | null;
  readonly formedYear: string | null;
  readonly colorPrimary: string | null;
  readonly badgeUrl: string | null;
  readonly logoUrl: string | null;
};

export type SportsDbEvent = {
  readonly idEvent: string;
  readonly season: string;
  /** Week number as published (intRound), null when absent. */
  readonly week: number | null;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly homeTeamId: string | null;
  readonly awayTeamId: string | null;
  /** ISO date (dateEvent) and full timestamp (strTimestamp) as published. */
  readonly date: string | null;
  readonly timestamp: string | null;
  /** null until final. */
  readonly homeScore: number | null;
  readonly awayScore: number | null;
};

export type SportsDbPlayer = {
  readonly idPlayer: string;
  readonly name: string;
  readonly team: string | null;
  readonly position: string | null;
  readonly nationality: string | null;
  readonly height: string | null;
  readonly weight: string | null;
  readonly bornDate: string | null;
  readonly thumbUrl: string | null;
};

export type SportsDbOptions = {
  readonly apiKey?: string;
  /** Override for tests. Defaults to the public evaluation key "3". */
  readonly fetchImpl?: typeof fetch;
  /** Minimum ms between upstream requests. Default 2500. Pass 0 in tests. */
  readonly minIntervalMs?: number;
};

type Loose = Record<string, unknown>;

let lastRequestAt = 0;

/** Reset the throttle (tests only). */
export function resetSportsDbThrottleForTests(): void {
  lastRequestAt = 0;
}

function resolveKey(options?: SportsDbOptions): string {
  return (
    options?.apiKey ??
    (typeof process !== "undefined"
      ? process.env["SPORTSDB_API_KEY"]
      : undefined) ??
    SPORTSDB_PUBLIC_KEY
  );
}

async function throttledGet(
  path: string,
  options?: SportsDbOptions,
): Promise<Loose | null> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const minInterval = options?.minIntervalMs ?? SPORTSDB_MIN_REQUEST_INTERVAL_MS;
  if (minInterval > 0) {
    const now = Date.now();
    const wait = minInterval - (now - lastRequestAt);
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
  const url = `${SPORTSDB_BASE}/${encodeURIComponent(resolveKey(options))}${path}`;
  try {
    const res = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    lastRequestAt = Date.now();
    if (!res.ok) return null;
    const body = (await res.json()) as Loose;
    return body;
  } catch {
    lastRequestAt = Date.now();
    return null;
  }
}

function nonEmptyString(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

function nullableNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Fetch all NFL teams (metadata + crosswalk IDs).
 * Live-verified 2026-09-18 against `search_all_teams.php?l=NFL`.
 * Returns [] on soft-fail.
 */
export async function fetchSportsDbNflTeams(
  options?: SportsDbOptions,
): Promise<SportsDbTeam[]> {
  const body = await throttledGet("/search_all_teams.php?l=NFL", options);
  const teams = (body?.["teams"] as Loose[] | null | undefined) ?? null;
  if (!Array.isArray(teams)) return [];
  const out: SportsDbTeam[] = [];
  for (const t of teams) {
    const name = nonEmptyString(t["strTeam"]);
    const idTeam = nonEmptyString(t["idTeam"]);
    if (!name || !idTeam) continue;
    out.push({
      idTeam,
      espnId: nonEmptyString(t["idESPN"]),
      apiFootballId: nonEmptyString(t["idAPIfootball"]),
      name,
      short: nonEmptyString(t["strTeamShort"]),
      alternate: nonEmptyString(t["strTeamAlternate"]),
      league: nonEmptyString(t["strLeague"]) ?? "NFL",
      stadium: nonEmptyString(t["strStadium"]),
      location: nonEmptyString(t["strLocation"]),
      formedYear: nonEmptyString(t["intFormedYear"]),
      colorPrimary: nonEmptyString(t["strColour1"]),
      badgeUrl: nonEmptyString(t["strBadge"]),
      logoUrl: nonEmptyString(t["strLogo"]),
    });
  }
  return out;
}

/**
 * Fetch a full NFL season's events (schedule + completed scores).
 *
 * Season format on TheSportsDB is like "2026-2027". Pass an explicit season or
 * omit for the season containing the current date (Aug→Jul boundary).
 *
 * NOTE (observed 2026-09-18): `eventsseason.php?id=4391&s=2026-2027` returned
 * `{"events":null}` — either the future season is not yet populated upstream or
 * the season string format differs. This function soft-fails to [] and lets the
 * caller fall back to nflverse/ESPN. Do not treat [] as "no games exist".
 */
export async function fetchSportsDbNflSeasonEvents(
  options?: SportsDbOptions & { readonly season?: string },
): Promise<SportsDbEvent[]> {
  const season = options?.season ?? currentSportsDbSeason();
  const body = await throttledGet(
    `/eventsseason.php?id=${SPORTSDB_NFL_LEAGUE_ID}&s=${encodeURIComponent(season)}`,
    options,
  );
  const events = (body?.["events"] as Loose[] | null | undefined) ?? null;
  if (!Array.isArray(events)) return [];
  const out: SportsDbEvent[] = [];
  for (const e of events) {
    const idEvent = nonEmptyString(e["idEvent"]);
    const homeTeam = nonEmptyString(e["strHomeTeam"]);
    const awayTeam = nonEmptyString(e["strAwayTeam"]);
    if (!idEvent || !homeTeam || !awayTeam) continue;
    out.push({
      idEvent,
      season: nonEmptyString(e["strSeason"]) ?? season,
      week: nullableNumber(e["intRound"]),
      homeTeam,
      awayTeam,
      homeTeamId: nonEmptyString(e["idHomeTeam"]),
      awayTeamId: nonEmptyString(e["idAwayTeam"]),
      date: nonEmptyString(e["dateEvent"]),
      timestamp: nonEmptyString(e["strTimestamp"]),
      homeScore: nullableNumber(e["intHomeScore"]),
      awayScore: nullableNumber(e["intAwayScore"]),
    });
  }
  return out;
}

/**
 * Fetch players for a team by team name (e.g. "Houston Texans").
 * Free-tier player bios: position, height/weight, nationality — no stats.
 * Returns [] on soft-fail.
 */
export async function fetchSportsDbTeamPlayers(
  options: SportsDbOptions & { readonly teamName: string },
): Promise<SportsDbPlayer[]> {
  const body = await throttledGet(
    `/searchplayers.php?t=${encodeURIComponent(options.teamName)}`,
    options,
  );
  const players = (body?.["player"] as Loose[] | null | undefined) ?? null;
  if (!Array.isArray(players)) return [];
  const out: SportsDbPlayer[] = [];
  for (const p of players) {
    const idPlayer = nonEmptyString(p["idPlayer"]);
    const name = nonEmptyString(p["strPlayer"]);
    if (!idPlayer || !name) continue;
    out.push({
      idPlayer,
      name,
      team: nonEmptyString(p["strTeam"]),
      position: nonEmptyString(p["strPosition"]),
      nationality: nonEmptyString(p["strNationality"]),
      height: nonEmptyString(p["strHeight"]),
      weight: nonEmptyString(p["strWeight"]),
      bornDate: nonEmptyString(p["dateBorn"]),
      thumbUrl: nonEmptyString(p["strThumb"]),
    });
  }
  return out;
}

/** TheSportsDB season label containing today's date (NFL runs Sep→Feb). */
export function currentSportsDbSeason(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1; // 1-12
  // Aug or later belongs to the season starting this year; earlier belongs to the season that started last year.
  const start = month >= 8 ? year : year - 1;
  return `${start}-${start + 1}`;
}

/** Map normalized team name / short code / alternate → SportsDbTeam. */
export function buildSportsDbTeamLookup(
  teams: readonly SportsDbTeam[],
): Map<string, SportsDbTeam> {
  const m = new Map<string, SportsDbTeam>();
  for (const t of teams) {
    m.set(normalizeComparableText(t.name), t);
    if (t.short) m.set(normalizeComparableText(t.short), t);
    if (t.alternate) m.set(normalizeComparableText(t.alternate), t);
  }
  return m;
}

/**
 * Resolve a team reference (full name, "Houston Texans"; short, "HOU";
 * alternate, "Texans") to its SportsDbTeam row.
 * Exact normalized match first; then token-contains over full names.
 */
export function lookupSportsDbTeam(
  lookup: ReadonlyMap<string, SportsDbTeam>,
  name: string,
): SportsDbTeam | null {
  const key = normalizeComparableText(name);
  if (!key) return null;
  const exact = lookup.get(key);
  if (exact) return exact;
  const needleTokens = key.split(/\s+/).filter(Boolean);
  for (const [mapKey, team] of lookup) {
    if (mapKey.length <= 4) continue; // skip short-code keys on fuzzy pass
    const hayTokens = new Set(mapKey.split(/\s+/));
    if (needleTokens.every((tok) => hayTokens.has(tok))) return team;
  }
  return null;
}
