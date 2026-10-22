/**
 * nflscrapR play-by-play URL contract.
 *
 * DESCRIPTION in maksimhorowitz/nflscrapR says License: CC0. GitHub's
 * licence API returns NONE, so the R sources were not copied. The URL
 * formula below is the one `proper_jsonurl_formatting` builds.
 *
 * Garrett approved this scrape. A live probe on 2026-10-22 of the 2015
 * regular-season finale id 2016010310 returned HTTP 301 to
 * https://www.nfl.com/ and an HTML homepage, not JSON. The approved
 * play-by-play path is therefore nflverse, which this repo already uses.
 */

export const NFLSCRAPR_JSON_PROBE = {
  gameId: "2016010310",
  measuredOn: "2026-10-22",
  httpStatus: 301,
  location: "https://www.nfl.com/",
  body: "html-homepage",
  successor: "nflverse",
} as const;

export function nflscraprGameJsonUrl(gameId: string): string {
  if (!/^\d{10}$/.test(gameId)) {
    throw new Error("nflscrapR game id must be 10 digits");
  }
  return `http://www.nfl.com/liveupdate/game-center/${gameId}/${gameId}_gtd.json`;
}

/** Package contract: regular season weeks are 1-17. It was last pushed in 2020, before the 18-week season. */
export function nflscraprRegularWeeks(weeks: readonly number[]): number[] {
  if (weeks.length === 0 || weeks.some((w) => !Number.isInteger(w) || w < 1 || w > 17)) {
    throw new Error("nflscrapR regular-season weeks are integers 1 through 17");
  }
  return [...weeks];
}

export function approvedPbpSource(): "nflverse" {
  return NFLSCRAPR_JSON_PROBE.successor;
}
