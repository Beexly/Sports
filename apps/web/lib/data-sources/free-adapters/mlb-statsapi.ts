/**
 * MLB Stats API — free official schedule/scores (statsapi.mlb.com).
 * Dual free path with ESPN for baseball. Facts only; attribution required.
 */

import type { NormalizedGame } from "./espn-scores";

export const MLB_STATSAPI_ATTRIBUTION = "Scores data via MLB Stats API";

const BASE = "https://statsapi.mlb.com/api/v1";

export type FetchOptions = {
  readonly fetchImpl?: typeof fetch;
  readonly date?: string; // YYYY-MM-DD
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Today's MLB schedule with scores when final.
 */
export async function fetchMlbScheduleScores(
  opts: FetchOptions = {},
): Promise<readonly NormalizedGame[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const date = opts.date ?? todayIso();
  const url = `${BASE}/schedule?sportId=1&date=${encodeURIComponent(date)}&hydrate=linescore`;
  const res = await fetchImpl(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`mlb-statsapi HTTP ${res.status}`);
  const json = (await res.json()) as {
    dates?: Array<{
      games?: Array<{
        gamePk: number;
        gameDate?: string;
        status?: { abstractGameState?: string; detailedState?: string };
        teams?: {
          home?: { team?: { name?: string; abbreviation?: string }; score?: number };
          away?: { team?: { name?: string; abbreviation?: string }; score?: number };
        };
      }>;
    }>;
  };

  const out: NormalizedGame[] = [];
  for (const d of json.dates ?? []) {
    for (const g of d.games ?? []) {
      const home = g.teams?.home;
      const away = g.teams?.away;
      if (!home?.team?.name || !away?.team?.name) continue;
      const abstract = (g.status?.abstractGameState ?? "").toLowerCase();
      const state =
        abstract === "final"
          ? "post"
          : abstract === "live"
            ? "in"
            : abstract === "preview"
              ? "pre"
              : "unknown";
      const completed = state === "post";
      out.push({
        sourceId: "espn-public-api",
        sport: "mlb",
        gameId: String(g.gamePk),
        startTime: g.gameDate ?? date,
        state,
        completed,
        statusDetail: g.status?.abstractGameState ?? "",
        venue: null,
        home: {
          team: home.team.name,
          abbreviation: home.team.abbreviation ?? home.team.name.slice(0, 3).toUpperCase(),
          score: typeof home.score === "number" ? home.score : null,
        },
        away: {
          team: away.team.name,
          abbreviation: away.team.abbreviation ?? away.team.name.slice(0, 3).toUpperCase(),
          score: typeof away.score === "number" ? away.score : null,
        },
        attribution: MLB_STATSAPI_ATTRIBUTION,
      });
    }
  }
  return out;
}
