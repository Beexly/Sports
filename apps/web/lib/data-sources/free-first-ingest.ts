/**
 * Free-first ingestion entrypoints.
 *
 * Ties the source-router (planning brain) to the verified free adapters (ESPN scores,
 * Open-Meteo weather). The pipeline calls these to get FREE, cleared facts first; each
 * result carries provenance and a spend guard so a paid call only happens when no free
 * cleared source covers the need.
 */

import {
  planIngestion,
  bestFreeClearedSource,
  type Sport,
  type StatNeed,
  type IngestionPlan,
} from "./source-router";
import { fetchEspnScoreboard, type NormalizedGame, type FetchOptions as EspnOpts } from "./free-adapters/espn-scores";
import { fetchWeather, weatherAtKickoff, type WeatherResult, type HourlyWeather, type FetchOptions as MeteoOpts } from "./free-adapters/open-meteo";

/** Source ids we have a working free fetcher for (drives free-first selection). */
export const SOURCES_WITH_FREE_ADAPTER: ReadonlySet<string> = new Set(["espn-public-api", "open-meteo"]);

export type FreeFirstOutcome<T> = {
  readonly need: StatNeed;
  readonly sport: Sport | null;
  /** Source actually used, or null when no free adapter could serve it. */
  readonly usedSourceId: string | null;
  readonly usedFree: boolean;
  /** True when the only cleared coverage costs money (caller may escalate to paid). */
  readonly mustSpend: boolean;
  readonly plan: IngestionPlan;
  readonly data: T | null;
  readonly attribution: string | null;
};

/**
 * Pick the cheapest free, cleared source that we ALSO have an adapter for.
 * Returns undefined when none — the caller consults `plan.mustSpend`.
 */
function freeAdapterSourceId(need: StatNeed, sport: Sport): string | null {
  const best = bestFreeClearedSource(need, sport);
  if (best && SOURCES_WITH_FREE_ADAPTER.has(best.id)) return best.id;
  // Fall back to any free cleared source we have an adapter for.
  const fromPlan = planIngestion(need, sport);
  const candidate = [fromPlan.primary, ...fromPlan.fallbacks].find(
    (s) => s && SOURCES_WITH_FREE_ADAPTER.has(s.id),
  );
  return candidate?.id ?? null;
}

/** Free-first scores for a sport (ESPN public — facts only, attributed). */
export async function fetchScoresFreeFirst(
  sport: Sport,
  opts: EspnOpts = {},
): Promise<FreeFirstOutcome<readonly NormalizedGame[]>> {
  const plan = planIngestion("scores", sport);
  const sourceId = freeAdapterSourceId("scores", sport);

  if (sourceId === "espn-public-api") {
    const games = await fetchEspnScoreboard(sport, opts);
    return {
      need: "scores",
      sport,
      usedSourceId: sourceId,
      usedFree: true,
      mustSpend: false,
      plan,
      data: games,
      attribution: games[0]?.attribution ?? "Scores data via ESPN",
    };
  }

  return { need: "scores", sport, usedSourceId: null, usedFree: false, mustSpend: plan.mustSpend, plan, data: null, attribution: null };
}

export type GameWeather = {
  readonly result: WeatherResult;
  readonly atKickoff: HourlyWeather | null;
};

/** Free weather for a venue (Open-Meteo — open license, attributed). */
export async function fetchWeatherFreeFirst(
  latitude: number,
  longitude: number,
  kickoffIso?: string,
  opts: MeteoOpts = {},
): Promise<FreeFirstOutcome<GameWeather>> {
  // Weather is sport-agnostic; use any sport for the plan lookup.
  const plan = planIngestion("weather", "nfl");
  const result = await fetchWeather(latitude, longitude, opts);
  return {
    need: "weather",
    sport: null,
    usedSourceId: "open-meteo",
    usedFree: true,
    mustSpend: false,
    plan,
    data: { result, atKickoff: kickoffIso ? weatherAtKickoff(result, kickoffIso) : null },
    attribution: result.attribution,
  };
}

/**
 * Spend guard for the pipeline: returns true ONLY when a paid call is justified
 * (no cleared free source covers the need). Call before any paid API request.
 */
export function paidCallJustified(need: StatNeed, sport: Sport): boolean {
  return planIngestion(need, sport).mustSpend;
}
