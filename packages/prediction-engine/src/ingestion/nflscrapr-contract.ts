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

/* ------------------------------------------------------------------ *
 * Stream 14B — nflscrapR EP / WP / xYAC baselines from the approved
 * nflverse play-by-play path. The deprecated nfl.com JSON endpoint is
 * not used: it returns a 301 to the HTML homepage (probe above). These
 * functions therefore attach baselines to nflverse-shaped rows.
 * ------------------------------------------------------------------ */

export interface NflscraprPbpRow {
  gameId: string;
  playId: number;
  team: string;
  down: 1 | 2 | 3 | 4;
  ydstogo: number;
  yardline100: number;
  /** Offense minus defense. */
  scoreDifferential: number;
  halfSecondsRemaining: number;
  epa: number;
  wpa: number;
  airYards: number;
  yardsAfterCatch: number;
  complete: boolean;
}

export interface NflscraprBaselineRow extends NflscraprPbpRow {
  epBaseline: number;
  wpBaseline: number;
  xyacBaseline: number;
  epaOverBaseline: number;
  wpaOverBaseline: number;
  xyacOverExpected: number;
}

export interface NflscraprBaselineResult {
  rows: NflscraprBaselineRow[];
  epBins: number;
  wpBins: number;
  xyacBins: number;
  note: string;
}

function binKey(...values: number[]): string {
  return values.map((v) => Math.round(v * 10) / 10).join("|");
}

/**
 * Attaches empirical EP, WP, and xYAC baselines to nflverse-shaped rows.
 *
 *   EP baseline: mean EPA in the same (down, ydstogo, yardline) bin.
 *   WP baseline: mean WPA in the same (score differential, half seconds) bin.
 *   xYAC baseline: mean YAC on completed passes in the same air-yard bin.
 *
 * Baselines are computed from the supplied rows themselves, so the caller
 * controls the sample. Rows with no bin-mates fall back to the league mean
 * and say so through `xyacBins`/bin counts. The function appends to `output`
 * when supplied and always returns the attached rows.
 */
export function attachNflscraprPbpBaselines(
  pbp: readonly NflscraprPbpRow[],
  output?: NflscraprBaselineRow[],
): NflscraprBaselineResult {
  if (pbp.length === 0) throw new Error("at least one play-by-play row is required");
  for (const row of pbp) {
    const values = [
      row.down,
      row.ydstogo,
      row.yardline100,
      row.scoreDifferential,
      row.halfSecondsRemaining,
      row.epa,
      row.wpa,
      row.airYards,
      row.yardsAfterCatch,
    ];
    if (!values.every(Number.isFinite)) throw new Error(`row ${row.gameId}/${row.playId} has non-finite values`);
  }
  const epBuckets = new Map<string, number[]>();
  const wpBuckets = new Map<string, number[]>();
  const yacBuckets = new Map<string, number[]>();
  for (const row of pbp) {
    const epKey = binKey(row.down, row.ydstogo, row.yardline100);
    const wpKey = binKey(row.scoreDifferential, row.halfSecondsRemaining / 60);
    const yacKey = binKey(row.airYards);
    if (!epBuckets.has(epKey)) epBuckets.set(epKey, []);
    if (!wpBuckets.has(wpKey)) wpBuckets.set(wpKey, []);
    if (!yacBuckets.has(yacKey)) yacBuckets.set(yacKey, []);
    epBuckets.get(epKey)!.push(row.epa);
    wpBuckets.get(wpKey)!.push(row.wpa);
    if (row.complete) yacBuckets.get(yacKey)!.push(row.yardsAfterCatch);
  }
  const leagueEpa = pbp.reduce((s, r) => s + r.epa, 0) / pbp.length;
  const leagueWpa = pbp.reduce((s, r) => s + r.wpa, 0) / pbp.length;
  const completed = pbp.filter((r) => r.complete);
  const leagueYac = completed.length === 0 ? 0 : completed.reduce((s, r) => s + r.yardsAfterCatch, 0) / completed.length;
  const mean = (values: number[] | undefined, fallback: number) =>
    values === undefined || values.length === 0 ? fallback : values.reduce((s, v) => s + v, 0) / values.length;

  const rows: NflscraprBaselineRow[] = pbp.map((row) => {
    const epBaseline = mean(epBuckets.get(binKey(row.down, row.ydstogo, row.yardline100)), leagueEpa);
    const wpBaseline = mean(wpBuckets.get(binKey(row.scoreDifferential, row.halfSecondsRemaining / 60)), leagueWpa);
    const xyacBaseline = mean(yacBuckets.get(binKey(row.airYards)), leagueYac);
    return {
      ...row,
      epBaseline,
      wpBaseline,
      xyacBaseline,
      epaOverBaseline: row.epa - epBaseline,
      wpaOverBaseline: row.wpa - wpBaseline,
      xyacOverExpected: row.complete ? row.yardsAfterCatch - xyacBaseline : 0,
    };
  });
  if (output) output.push(...rows);
  return {
    rows,
    epBins: epBuckets.size,
    wpBins: wpBuckets.size,
    xyacBins: yacBuckets.size,
    note:
      "Baselines are empirical means over the supplied nflverse rows; the nfl.com JSON endpoint was retired (301 to HTML).",
  };
}
