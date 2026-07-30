/**
 * BALLDONTLIE NBA free API — dual path with ESPN for NBA scores.
 * Rate-limited free tier. Facts only. No key for basic games endpoint historically;
 * if 401, caller fails over to ESPN (already primary).
 */

import type { NormalizedGame } from "./espn-scores";

export const BALLDONTLIE_ATTRIBUTION = "Scores data via BALLDONTLIE";

const BASE = "https://api.balldontlie.io/v1";

export type FetchOptions = {
  readonly fetchImpl?: typeof fetch;
  readonly date?: string;
  /** Optional free-tier key when required by provider. */
  readonly apiKey?: string;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchBalldontlieScores(
  opts: FetchOptions = {},
): Promise<readonly NormalizedGame[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const date = opts.date ?? todayIso();
  const key = opts.apiKey ?? process.env["BALLDONTLIE_API_KEY"]?.trim();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (key) headers["Authorization"] = key;

  const url = `${BASE}/games?dates[]=${encodeURIComponent(date)}`;
  const res = await fetchImpl(url, { headers, cache: "no-store" });
  if (!res.ok) throw new Error(`balldontlie HTTP ${res.status}`);
  const json = (await res.json()) as {
    data?: Array<{
      id: number;
      date?: string;
      status?: string;
      home_team_score?: number;
      visitor_team_score?: number;
      home_team?: { full_name?: string; name?: string; abbreviation?: string };
      visitor_team?: { full_name?: string; name?: string; abbreviation?: string };
    }>;
  };

  const out: NormalizedGame[] = [];
  for (const g of json.data ?? []) {
    const homeName = g.home_team?.full_name ?? g.home_team?.name;
    const awayName = g.visitor_team?.full_name ?? g.visitor_team?.name;
    if (!homeName || !awayName) continue;
    const status = (g.status ?? "").toLowerCase();
    const completed = status.includes("final");
    const state = completed ? "post" : status.includes("in") ? "in" : "pre";
    out.push({
      sourceId: "espn-public-api",
      sport: "nba",
      externalId: String(g.id),
      date: (g.date ?? date).slice(0, 10),
      state,
      completed,
      home: {
        team: homeName,
        abbreviation: g.home_team?.abbreviation ?? homeName.slice(0, 3).toUpperCase(),
        score: typeof g.home_team_score === "number" ? g.home_team_score : null,
      },
      away: {
        team: awayName,
        abbreviation: g.visitor_team?.abbreviation ?? awayName.slice(0, 3).toUpperCase(),
        score: typeof g.visitor_team_score === "number" ? g.visitor_team_score : null,
      },
      attribution: BALLDONTLIE_ATTRIBUTION,
    });
  }
  return out;
}
