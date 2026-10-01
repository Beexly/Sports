import { NFL_2026_DIVISION } from "./priors/nfl-2026-clubs.js";

/** Same division in the 2026 club list. Null when either club is unknown or the season is not 2026. */
export function sameDivision2026(homeAbbr: string, awayAbbr: string, season: number): boolean | null {
  if (season !== 2026) return null;
  const home = NFL_2026_DIVISION[homeAbbr];
  const away = NFL_2026_DIVISION[awayAbbr];
  if (home == null || away == null) return null;
  return home === away;
}
