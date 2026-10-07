/**
 * Free ESPN public scoreboard → schedule seed for Game rows.
 * Zero keys. Facts only (teams, commence time). Never invents odds/quotes.
 * Used so signal slate can open when THE_ODDS_API_KEY / Rundown are ABSENT.
 */

import type { SupportedSportKey } from "./config.js";
import { SUPPORTED_SPORTS } from "./config.js";

export type ShortSportKey =
  | "nfl"
  | "ncaaf"
  | "nba"
  | "ncaab"
  | "mlb"
  | "nhl"
  | "mls";

/** Short free-spine key → Odds-API / Sport.key */
export const SHORT_TO_ODDS_SPORT: Record<
  ShortSportKey,
  { key: SupportedSportKey; name: string; displayName: string; espnPath: string }
> = {
  nfl: {
    key: "americanfootball_nfl",
    name: "NFL",
    displayName: "National Football League",
    espnPath: "football/nfl",
  },
  ncaaf: {
    key: "americanfootball_ncaaf",
    name: "NCAAF",
    displayName: "College Football",
    espnPath: "football/college-football",
  },
  nba: {
    key: "basketball_nba",
    name: "NBA",
    displayName: "National Basketball Association",
    espnPath: "basketball/nba",
  },
  ncaab: {
    key: "basketball_ncaab",
    name: "NCAAB",
    displayName: "College Basketball",
    espnPath: "basketball/mens-college-basketball",
  },
  mlb: {
    key: "baseball_mlb",
    name: "MLB",
    displayName: "Major League Baseball",
    espnPath: "baseball/mlb",
  },
  nhl: {
    key: "icehockey_nhl",
    name: "NHL",
    displayName: "National Hockey League",
    espnPath: "hockey/nhl",
  },
  mls: {
    key: "soccer_usa_mls",
    name: "MLS",
    displayName: "Major League Soccer",
    espnPath: "soccer/usa.1",
  },
};

export type EspnSeedGame = {
  readonly externalId: string;
  readonly sportKey: SupportedSportKey;
  readonly sportName: string;
  readonly sportDisplayName: string;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly commenceTime: Date;
  readonly state: "pre" | "in" | "post" | "unknown";
};

type EspnCompetitor = {
  homeAway?: string;
  team?: { displayName?: string; abbreviation?: string };
};
type EspnEvent = {
  id?: string;
  date?: string;
  status?: { type?: { state?: string; completed?: boolean } };
  competitions?: Array<{ competitors?: EspnCompetitor[] }>;
};
type EspnScoreboard = { events?: EspnEvent[] };

function toState(raw: string | undefined): EspnSeedGame["state"] {
  return raw === "pre" || raw === "in" || raw === "post" ? raw : "unknown";
}

/** Pure parse — testable without network. */
export function parseEspnScoreboardForSeed(
  short: ShortSportKey,
  body: EspnScoreboard,
): EspnSeedGame[] {
  const meta = SHORT_TO_ODDS_SPORT[short];
  const out: EspnSeedGame[] = [];
  for (const ev of body.events ?? []) {
    const id = String(ev.id ?? "").trim();
    if (!id) continue;
    const commenceRaw = String(ev.date ?? "").trim();
    if (!commenceRaw) continue;
    const commenceTime = new Date(commenceRaw);
    if (Number.isNaN(commenceTime.getTime())) continue;
    const comps = ev.competitions?.[0]?.competitors ?? [];
    let home = "";
    let away = "";
    for (const c of comps) {
      const name = String(c.team?.displayName ?? "").trim();
      if (!name) continue;
      if (c.homeAway === "home") home = name;
      else if (c.homeAway === "away") away = name;
    }
    if (!home || !away) continue;
    const state = toState(ev.status?.type?.state);
    out.push({
      externalId: `espn:${short}:${id}`,
      sportKey: meta.key,
      sportName: meta.name,
      sportDisplayName: meta.displayName,
      homeTeamName: home,
      awayTeamName: away,
      commenceTime,
      state,
    });
  }
  return out;
}

/**
 * ESPN's scoreboard `dates=YYYYMMDD` is a US Eastern calendar day: a 7:20pm ET
 * kickoff on the 8th is 23:20Z on the 8th, but a 10pm ET kickoff on the 8th is
 * 02:00Z on the 9th and still lives under `dates=20260908`.
 */
export const ESPN_SCOREBOARD_TZ = "America/New_York";

const DAY_MS = 24 * 60 * 60 * 1000;

/** YYYYMMDD of `d` on the wall calendar of `timeZone` (ESPN's scoreboard day). */
export function espnDateKey(d: Date, timeZone: string = ESPN_SCOREBOARD_TZ): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const pick = (type: string): string => parts.find((p) => p.type === type)?.value ?? "";
  return `${pick("year")}${pick("month")}${pick("day")}`;
}

/** Noon UTC on the calendar day a YYYYMMDD key names; a DST-safe day cursor. */
function utcNoonOfKey(key: string): number {
  return Date.UTC(Number(key.slice(0, 4)), Number(key.slice(4, 6)) - 1, Number(key.slice(6, 8)), 12);
}

function keyOfUtcNoon(ms: number): string {
  const d = new Date(ms);
  return (
    `${d.getUTCFullYear()}` +
    `${String(d.getUTCMonth() + 1).padStart(2, "0")}` +
    `${String(d.getUTCDate()).padStart(2, "0")}`
  );
}

/**
 * EVERY Eastern calendar day from the one `now` falls on through the one the
 * horizon ends on, inclusive, in order and without gaps (C-95).
 *
 * The previous version stepped three UTC days at a time ("ESPN range-friendly")
 * from a UTC date key, which had two holes for a US schedule: two of every
 * three days were never asked for at all, and a late-evening ET fixture
 * (Sunday Night Football, a West Coast MLB game) was filed under the wrong day
 * whenever the run happened after 8pm ET, because the UTC date had already
 * rolled over. ESPN's `dates=A-B` range form is not a substitute: measured
 * live 2026-09-08, `dates=20260912-20260918&limit=300` returned 84 events for
 * a span whose Saturday alone returns 80 on its own call, so the range form
 * drops most of a busy day. One request per Eastern day is the only shape
 * that reaches every game.
 *
 * Day stepping runs on a noon-UTC cursor over the calendar day, never on
 * `now + i * 24h`: a 24h step across a DST change either repeats a day (fall)
 * or skips one (spring) when `now` sits within an hour of Eastern midnight.
 */
export function espnHorizonDateKeys(
  now: Date,
  horizonDays: number,
  timeZone: string = ESPN_SCOREBOARD_TZ,
): string[] {
  const days = Math.max(0, Math.floor(horizonDays));
  const startKey = espnDateKey(now, timeZone);
  const endKey = espnDateKey(new Date(now.getTime() + days * DAY_MS), timeZone);
  const keys: string[] = [];
  let cursor = utcNoonOfKey(startKey);
  // `days + 2` bounds the walk in case the end key ever sorted before the start.
  for (let i = 0; i <= days + 2; i += 1) {
    const key = keyOfUtcNoon(cursor);
    keys.push(key);
    if (key >= endKey) break;
    cursor += DAY_MS;
  }
  return keys;
}

/**
 * ESPN's scoreboard endpoint returns a small default page and silently truncates the
 * event list on busy dates (CFB Saturdays, multi-league soccer days). An explicit limit
 * forces the full board so games are never dropped before reaching the Game table, but
 * only inside ESPN's accepted range: measured live 2026-09-05, limit=300..500 returns the
 * full CFB board (80 events for 20250906) while limit>=999 falls back to the 25-event
 * default page. The prior value (1000) caused the truncation it was meant to prevent.
 * Keep in step with apps/web/lib/data-sources/free-adapters/espn-scores.ts.
 */
export const ESPN_SCOREBOARD_LIMIT = 300;

export async function fetchEspnSeedGamesForSport(
  short: ShortSportKey,
  opts?: {
    readonly fetchImpl?: typeof fetch;
    readonly timeoutMs?: number;
    readonly now?: Date;
    readonly horizonDays?: number;
  },
): Promise<{ games: EspnSeedGame[]; error: string | null }> {
  const meta = SHORT_TO_ODDS_SPORT[short];
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const timeoutMs = opts?.timeoutMs ?? 12_000;
  const now = opts?.now ?? new Date();
  const horizonDays = opts?.horizonDays ?? 21;
  const base = `https://site.api.espn.com/apis/site/v2/sports/${meta.espnPath}/scoreboard`;
  // Undated "now" + sparse future dates so CFB/NFL preseason weeks land in Game table.
  const dateKeys = ["", ...espnHorizonDateKeys(now, horizonDays)];
  const byId = new Map<string, EspnSeedGame>();
  const errors: string[] = [];

  for (const dates of dateKeys) {
    const params = new URLSearchParams();
    if (dates) params.set("dates", dates);
    params.set("limit", String(ESPN_SCOREBOARD_LIMIT));
    const url = `${base}?${params.toString()}`;
    try {
      const res = await fetchImpl(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        errors.push(`espn ${short}${dates ? ` ${dates}` : ""} HTTP ${res.status}`);
        continue;
      }
      const body = (await res.json()) as EspnScoreboard;
      for (const g of parseEspnScoreboardForSeed(short, body)) {
        byId.set(g.externalId, g);
      }
    } catch (err) {
      errors.push(
        `espn ${short}${dates ? ` ${dates}` : ""}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return {
    games: [...byId.values()],
    error: byId.size === 0 && errors.length > 0 ? errors[0]! : null,
  };
}

export async function fetchAllEspnSeedGames(opts?: {
  readonly fetchImpl?: typeof fetch;
  readonly shorts?: readonly ShortSportKey[];
  readonly now?: Date;
  readonly horizonDays?: number;
}): Promise<{ games: EspnSeedGame[]; errors: string[] }> {
  const shorts =
    opts?.shorts ??
    (Object.keys(SHORT_TO_ODDS_SPORT) as ShortSportKey[]);
  const errors: string[] = [];
  const games: EspnSeedGame[] = [];
  // Serial — keep ESPN friendly under cron.
  for (const short of shorts) {
    const r = await fetchEspnSeedGamesForSport(short, {
      fetchImpl: opts?.fetchImpl,
      now: opts?.now,
      horizonDays: opts?.horizonDays,
    });
    if (r.error) errors.push(r.error);
    games.push(...r.games);
  }
  return { games, errors };
}

/** Ensure SUPPORTED_SPORTS meta exists for a key (defensive). */
export function sportMetaForKey(key: SupportedSportKey): {
  key: SupportedSportKey;
  name: string;
  displayName: string;
} {
  const found = SUPPORTED_SPORTS.find((s) => s.key === key);
  if (found) return found;
  return { key, name: key, displayName: key };
}
