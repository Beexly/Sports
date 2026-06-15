/**
 * Resilient NCAA scores entrypoint — ESPN primary, henrygd fallback, both FREE.
 *
 * Composes the two free NCAA sources behind the failover primitive so a caller gets a
 * unified, source-tagged feed without worrying which source is up. No paid call on either
 * arm. Works for NCAA football and basketball (the two sports with a second free source).
 */

import { fetchEspnScoreboard, type FetchOptions as EspnFetchOptions } from "./free-adapters/espn-scores";
import { fetchHenrygdScoreboard, HENRYGD_PATHS } from "./free-adapters/henrygd-ncaa";
import {
  resilientNcaaScores,
  toComparableFromEspn,
  toComparableFromHenrygd,
  type ComparableGame,
  type ResilientResult,
} from "./ncaa-consensus";

export type NcaaSport = "ncaaf" | "ncaab";

const HENRYGD_PATH: Record<NcaaSport, string> = {
  ncaaf: HENRYGD_PATHS.cfb,
  ncaab: HENRYGD_PATHS.mbb,
};

export type NcaaScoresOptions = EspnFetchOptions & { readonly henrygdPath?: string };

/**
 * Fetch NCAA scores with automatic free→free failover. ESPN is primary (broad, fast);
 * henrygd is the fallback when ESPN errors or returns nothing. Returns the unified
 * comparable games plus which source served and whether the path was degraded.
 */
export async function fetchNcaaScoresResilient(sport: NcaaSport, opts: NcaaScoresOptions = {}): Promise<ResilientResult> {
  const { henrygdPath, ...espnOpts } = opts;
  return resilientNcaaScores(
    async () =>
      (await fetchEspnScoreboard(sport, espnOpts))
        .map(toComparableFromEspn)
        .filter((g): g is ComparableGame => g !== null),
    async () =>
      (await fetchHenrygdScoreboard(henrygdPath ?? HENRYGD_PATH[sport], { fetchImpl: opts.fetchImpl, timeoutMs: opts.timeoutMs })).map(
        toComparableFromHenrygd,
      ),
  );
}
