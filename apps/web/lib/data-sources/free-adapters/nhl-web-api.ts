/**
 * NHL public web API — free dual path with ESPN for NHL scores.
 * https://api-web.nhle.com (public, no key).
 */

import type { NormalizedGame } from "./espn-scores";

export const NHL_WEB_ATTRIBUTION = "Scores data via NHL public API";

export type FetchOptions = {
  readonly fetchImpl?: typeof fetch;
  readonly date?: string; // YYYY-MM-DD
};

export async function fetchNhlWebScores(
  opts: FetchOptions = {},
): Promise<readonly NormalizedGame[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const date = opts.date ?? new Date().toISOString().slice(0, 10);
  const url = `https://api-web.nhle.com/v1/score/${date}`;
  const res = await fetchImpl(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`nhl-web-api HTTP ${res.status}`);
  const json = (await res.json()) as {
    games?: Array<{
      id: number;
      gameState?: string;
      startTimeUTC?: string;
      homeTeam?: { commonName?: { default?: string }; abbrev?: string; score?: number };
      awayTeam?: { commonName?: { default?: string }; abbrev?: string; score?: number };
    }>;
  };

  const out: NormalizedGame[] = [];
  for (const g of json.games ?? []) {
    const homeName = g.homeTeam?.commonName?.default;
    const awayName = g.awayTeam?.commonName?.default;
    if (!homeName || !awayName) continue;
    const st = (g.gameState ?? "").toUpperCase();
    const completed = st === "OFF" || st === "FINAL";
    const state = completed ? "post" : st === "LIVE" || st === "CRIT" ? "in" : "pre";
    out.push({
      sourceId: "espn-public-api",
      sport: "nhl",
      externalId: String(g.id),
      date: (g.startTimeUTC ?? date).slice(0, 10),
      state,
      completed,
      home: {
        team: homeName,
        abbreviation: g.homeTeam?.abbrev ?? homeName.slice(0, 3).toUpperCase(),
        score: typeof g.homeTeam?.score === "number" ? g.homeTeam.score : null,
      },
      away: {
        team: awayName,
        abbreviation: g.awayTeam?.abbrev ?? awayName.slice(0, 3).toUpperCase(),
        score: typeof g.awayTeam?.score === "number" ? g.awayTeam.score : null,
      },
      attribution: NHL_WEB_ATTRIBUTION,
    });
  }
  return out;
}
