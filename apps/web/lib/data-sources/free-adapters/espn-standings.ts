/**
 * ESPN public standings adapter — FREE, cleared, FACTS ONLY.
 *
 * Team records, point differential, and streaks for all sports at zero marginal cost.
 * Schema verified live against https://site.api.espn.com/apis/v2/sports/{path}/standings
 * (note: apis/v2, not apis/site/v2). Pure parser tested against a captured fixture.
 */

import type { Sport } from "../source-router";
import { ESPN_ATTRIBUTION } from "./espn-scores";

const ESPN_PATHS: Record<Sport, string> = {
  nfl: "football/nfl",
  ncaaf: "football/college-football",
  nba: "basketball/nba",
  ncaab: "basketball/mens-college-basketball",
  mlb: "baseball/mlb",
  nhl: "hockey/nhl",
  mls: "soccer/usa.1",
};

export type TeamStanding = {
  readonly group: string;
  readonly team: string;
  readonly abbreviation: string;
  readonly wins: number | null;
  readonly losses: number | null;
  readonly ties: number | null;
  readonly winPercent: number | null;
  readonly pointsFor: number | null;
  readonly pointsAgainst: number | null;
  readonly pointDifferential: number | null;
  readonly streak: string | null;
};

export type Standings = {
  readonly sourceId: "espn-public-api";
  readonly sport: Sport;
  readonly teams: readonly TeamStanding[];
  readonly attribution: string;
};

type EspnStat = { name?: string; value?: number; displayValue?: string };
type EspnEntry = { team?: { displayName?: string; abbreviation?: string }; stats?: EspnStat[] };
type EspnGroup = { name?: string; standings?: { entries?: EspnEntry[] } };
export type EspnStandings = { children?: EspnGroup[] };

function statNum(stats: EspnStat[], name: string): number | null {
  const s = stats.find((x) => x.name === name);
  if (!s) return null;
  if (typeof s.value === "number" && Number.isFinite(s.value)) return s.value;
  const n = s.displayValue !== undefined ? Number(s.displayValue) : NaN;
  return Number.isFinite(n) ? n : null;
}

function statStr(stats: EspnStat[], name: string): string | null {
  return stats.find((x) => x.name === name)?.displayValue ?? null;
}

/** Pure parser — verified against the live ESPN standings schema. */
export function parseEspnStandings(json: EspnStandings, sport: Sport): Standings {
  const groups = Array.isArray(json.children) ? json.children : [];
  const teams: TeamStanding[] = [];

  for (const group of groups) {
    const entries = Array.isArray(group.standings?.entries) ? group.standings!.entries! : [];
    for (const entry of entries) {
      const stats = Array.isArray(entry.stats) ? entry.stats : [];
      teams.push({
        group: group.name ?? "",
        team: entry.team?.displayName ?? "",
        abbreviation: entry.team?.abbreviation ?? "",
        wins: statNum(stats, "wins"),
        losses: statNum(stats, "losses"),
        ties: statNum(stats, "ties"),
        winPercent: statNum(stats, "winPercent"),
        pointsFor: statNum(stats, "pointsFor"),
        pointsAgainst: statNum(stats, "pointsAgainst"),
        pointDifferential: statNum(stats, "pointDifferential"),
        streak: statStr(stats, "streak"),
      });
    }
  }

  return { sourceId: "espn-public-api", sport, teams, attribution: ESPN_ATTRIBUTION };
}

export function espnStandingsUrl(sport: Sport): string {
  return `https://site.api.espn.com/apis/v2/sports/${ESPN_PATHS[sport]}/standings`;
}

export type FetchOptions = { readonly fetchImpl?: typeof fetch; readonly timeoutMs?: number };

export async function fetchEspnStandings(sport: Sport, opts: FetchOptions = {}): Promise<Standings> {
  const doFetch = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 12000);
  try {
    const res = await doFetch(espnStandingsUrl(sport), { signal: controller.signal });
    if (!res.ok) throw new Error(`ESPN standings ${sport} HTTP ${res.status}`);
    const json = (await res.json()) as EspnStandings;
    return parseEspnStandings(json, sport);
  } finally {
    clearTimeout(timer);
  }
}
