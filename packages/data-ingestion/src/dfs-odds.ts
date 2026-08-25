/**
 * Licensed Odds API DFS region (`us_dfs`) — DraftKings / FanDuel DFS prices.
 *
 * Same vendor contract as featured US books. The Odds API documents `us_dfs`
 * as indicative DFS contest pricing, not a sportsbook board. Default OFF
 * (`ODDS_DFS_INGEST`) so we do not spend credits or feed DFS numbers into
 * the MIN_BOOKMAKERS sportsbook path.
 *
 * Does not scrape. Does not hit unofficial DFS endpoints.
 */

import type { OddsApiEvent } from "@sports/types";
import { MARKETS, ODDS_DFS_REGION, type Market, type SupportedSportKey } from "./config.js";
import type { OddsApiClient, OddsApiFetchResult } from "./odds-api-client.js";

export const DFS_ODDS_BOOKS = ["draftkings", "fanduel"] as const;

export function isDfsOddsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = (env.ODDS_DFS_INGEST ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export async function fetchDfsOddsIfEnabled(
  client: Pick<OddsApiClient, "getOdds">,
  sportKey: SupportedSportKey,
  env: NodeJS.ProcessEnv = process.env,
  markets: readonly Market[] = MARKETS,
): Promise<OddsApiFetchResult<OddsApiEvent[]> | null> {
  if (!isDfsOddsEnabled(env)) return null;
  return client.getOdds(sportKey, [...markets], {
    regions: ODDS_DFS_REGION,
    bookmakers: [...DFS_ODDS_BOOKS],
  });
}
