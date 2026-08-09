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

export async function fetchEspnSeedGamesForSport(
  short: ShortSportKey,
  opts?: { readonly fetchImpl?: typeof fetch; readonly timeoutMs?: number },
): Promise<{ games: EspnSeedGame[]; error: string | null }> {
  const meta = SHORT_TO_ODDS_SPORT[short];
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const timeoutMs = opts?.timeoutMs ?? 12_000;
  const url = `https://site.api.espn.com/apis/site/v2/sports/${meta.espnPath}/scoreboard`;
  try {
    const res = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { games: [], error: `espn ${short} HTTP ${res.status}` };
    const body = (await res.json()) as EspnScoreboard;
    return { games: parseEspnScoreboardForSeed(short, body), error: null };
  } catch (err) {
    return {
      games: [],
      error: `espn ${short}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function fetchAllEspnSeedGames(opts?: {
  readonly fetchImpl?: typeof fetch;
  readonly shorts?: readonly ShortSportKey[];
}): Promise<{ games: EspnSeedGame[]; errors: string[] }> {
  const shorts =
    opts?.shorts ??
    (Object.keys(SHORT_TO_ODDS_SPORT) as ShortSportKey[]);
  const errors: string[] = [];
  const games: EspnSeedGame[] = [];
  // Serial — keep ESPN friendly under cron.
  for (const short of shorts) {
    const r = await fetchEspnSeedGamesForSport(short, { fetchImpl: opts?.fetchImpl });
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
