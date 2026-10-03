/**
 * ESPN public rankings adapter — FREE, cleared, FACTS ONLY.
 *
 * Polls (AP / Coaches) for college sports at zero marginal cost. Schema verified live
 * against https://site.api.espn.com/apis/site/v2/sports/{path}/rankings. Pure parser
 * tested against a captured fixture. Facts only; attribution required.
 */

import type { Sport } from "../source-router";
import { ESPN_ATTRIBUTION } from "./espn-scores";

const ESPN_PATHS: Partial<Record<Sport, string>> = {
  ncaaf: "football/college-football",
  ncaab: "basketball/mens-college-basketball",
  nfl: "football/nfl",
  nba: "basketball/nba",
};

export type RankedTeam = {
  readonly rank: number;
  readonly previous: number | null;
  readonly team: string;
  readonly abbreviation: string;
  readonly record: string | null;
  readonly points: number | null;
  readonly firstPlaceVotes: number | null;
};

export type RankingPoll = {
  readonly sourceId: "espn-public-api";
  readonly sport: Sport;
  readonly pollName: string;
  readonly pollType: string;
  readonly teams: readonly RankedTeam[];
  readonly attribution: string;
};

type EspnRankTeam = { location?: string; name?: string; abbreviation?: string };
type EspnRank = {
  current?: number;
  previous?: number;
  points?: number;
  firstPlaceVotes?: number;
  team?: EspnRankTeam;
  recordSummary?: string;
};
type EspnPoll = { name?: string; type?: string; ranks?: EspnRank[] };
export type EspnRankings = { rankings?: EspnPoll[] };

function num(v: number | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Pure parser — verified against the live ESPN rankings schema. */
export function parseEspnRankings(json: EspnRankings, sport: Sport): RankingPoll[] {
  const polls = Array.isArray(json.rankings) ? json.rankings : [];
  const out: RankingPoll[] = [];

  for (const poll of polls) {
    const ranks = Array.isArray(poll.ranks) ? poll.ranks : [];
    if (ranks.length === 0) continue;
    const teams: RankedTeam[] = ranks.map((r) => ({
      rank: num(r.current) ?? 0,
      previous: num(r.previous),
      team: r.team?.location ?? r.team?.name ?? "",
      abbreviation: r.team?.abbreviation ?? "",
      record: r.recordSummary ?? null,
      points: num(r.points),
      firstPlaceVotes: num(r.firstPlaceVotes),
    }));
    out.push({
      sourceId: "espn-public-api",
      sport,
      pollName: poll.name ?? "",
      pollType: poll.type ?? "",
      teams,
      attribution: ESPN_ATTRIBUTION,
    });
  }

  return out;
}

export function espnRankingsUrl(sport: Sport): string | null {
  const path = ESPN_PATHS[sport];
  return path ? `https://site.api.espn.com/apis/site/v2/sports/${path}/rankings` : null;
}

export type FetchOptions = { readonly fetchImpl?: typeof fetch; readonly timeoutMs?: number };

export async function fetchEspnRankings(sport: Sport, opts: FetchOptions = {}): Promise<RankingPoll[]> {
  const url = espnRankingsUrl(sport);
  if (!url) return [];
  const doFetch = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 12000);
  try {
    const res = await doFetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`ESPN rankings ${sport} HTTP ${res.status}`);
    const json = (await res.json()) as EspnRankings;
    return parseEspnRankings(json, sport);
  } finally {
    clearTimeout(timer);
  }
}
