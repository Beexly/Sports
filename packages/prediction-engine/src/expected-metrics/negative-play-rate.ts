/**
 * Negative-play rate — a deterministic, closed-form metric measuring the share
 * of a team's offensive plays that result in negative yardage.
 *
 * A "negative play" is strictly one where `yards_gained < 0`. 0-yard plays (like
 * spikes or stuffs) are NOT negative.
 *
 * Denominator exclusions:
 * - `qb_kneel == "1"` rows (clock management, not an offensive failure).
 * - `play_type == "no_play"` (penalty-nullified snaps never enter the denominator).
 * - Non-finite or missing `yards_gained` (unratable, counted in excludedRows).
 *
 * Spikes (0 yards) remain in the denominator.
 *
 * Rates are computed over point-in-time windows (season-to-date, last 4 distinct weeks,
 * last 8 distinct weeks).
 */

import { round } from "./numeric.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";
import { type PbpRow } from "./nflverse-pbp-mapper.js";

const NEGATIVE_PLAY_FEATURE_KEYS = ["play_type", "qb_kneel", "yards_gained"] as const;
export const NEGATIVE_PLAY_RATE_MODEL_VERSION = "gse-negative-play-rate-v1";

function buildProvenance(sampleSize: number): ExpectedMetricProvenance {
  return {
    modelVersion: NEGATIVE_PLAY_RATE_MODEL_VERSION,
    method: "deterministic-rule",
    featureKeys: [...NEGATIVE_PLAY_FEATURE_KEYS],
    featureSchemaHash: computeFeatureSchemaHash(NEGATIVE_PLAY_FEATURE_KEYS),
    sampleSize,
  };
}

/** Output rate for a single window. */
export interface NegativePlayRateWindow {
  /** Total valid plays in the window. */
  readonly qualifyingPlays: number;
  /** Plays with yards_gained < 0. */
  readonly negativePlays: number;
  /** Number of distinct weeks contributing plays. */
  readonly distinctWeeks: number;
  /** Unratable rows (e.g. NaN yards_gained) dropped from the denominator. */
  readonly excludedRows: number;

  /** Team's negative play rate. Null if below floor (<3 distinct weeks OR <100 qualifying plays). */
  readonly negativePlayRate: number | null;
  /** League-wide negative play rate for the SAME window. */
  readonly leagueRate: number;
  /** leagueRate - teamRate (positive means team is better at avoiding negative plays). */
  readonly rateVsLeague: number | null;
}

export interface NegativePlayRateSplit {
  readonly teamId: string;
  readonly targetWeek: number;
  readonly seasonToDate: NegativePlayRateWindow;
  readonly last4: NegativePlayRateWindow;
  readonly last8: NegativePlayRateWindow;
  readonly provenance: ExpectedMetricProvenance;
}

interface TeamRawCounts {
  qualifyingPlays: number;
  negativePlays: number;
  excludedRows: number;
}

/** Compute the league average rate for a specific set of weeks. */
function computeLeagueRate(
  allPlays: readonly PbpRow[],
  targetWeek: number,
  includedWeeks: ReadonlySet<number>
): number {
  let leagueQualifying = 0;
  let leagueNegative = 0;

  for (const play of allPlays) {
    const playWeekStr = play["week"];
    if (!playWeekStr) continue;
    const playWeek = Number(playWeekStr);
    if (!Number.isFinite(playWeek) || playWeek >= targetWeek) continue;
    if (!includedWeeks.has(playWeek)) continue;

    const playType = play["play_type"];
    // Explicit string cast avoids typescript narrowing to exact values when dealing with Record<string, string> values in PbpRow, which triggers TS2367.
    const pt = playType as string;
    if (pt !== "pass" && pt !== "run") continue;
    if (play["qb_kneel"] === "1") continue;

    // yards_gained handling
    const ygStr = play["yards_gained"];
    if (ygStr === undefined || ygStr === "") continue;
    const yg = Number(ygStr);
    if (!Number.isFinite(yg)) continue;

    leagueQualifying++;
    if (yg < 0) leagueNegative++;
  }

  if (leagueQualifying === 0) return 0;
  return round(leagueNegative / leagueQualifying, 4);
}

function computeWindow(
  teamCountsByWeek: ReadonlyMap<number, TeamRawCounts>,
  allPlays: readonly PbpRow[],
  targetWeek: number,
  maxWeeks: number | null
): NegativePlayRateWindow {
  // Extract and sort distinct weeks for this team (most recent first)
  const sortedWeeks = Array.from(teamCountsByWeek.keys()).sort((a, b) => b - a);
  const includedWeeks = new Set<number>();

  let windowQualifying = 0;
  let windowNegative = 0;
  let windowExcluded = 0;
  let windowDistinct = 0;

  for (const w of sortedWeeks) {
    if (maxWeeks !== null && windowDistinct >= maxWeeks) break;
    const counts = teamCountsByWeek.get(w)!;

    // In our convention, a week only counts as a distinct week if it has qualifying plays
    // (excluding it otherwise handles byes gracefully).
    if (counts.qualifyingPlays > 0) {
      windowQualifying += counts.qualifyingPlays;
      windowNegative += counts.negativePlays;
      windowExcluded += counts.excludedRows;
      windowDistinct++;
      includedWeeks.add(w);
    }
  }

  const leagueRate = computeLeagueRate(allPlays, targetWeek, includedWeeks);

  let teamRate: number | null = null;
  let rateVsLeague: number | null = null;

  if (windowDistinct >= 3 && windowQualifying >= 100) {
    teamRate = round(windowNegative / windowQualifying, 4);
    rateVsLeague = round(leagueRate - teamRate, 4);
  }

  return {
    qualifyingPlays: windowQualifying,
    negativePlays: windowNegative,
    distinctWeeks: windowDistinct,
    excludedRows: windowExcluded,
    negativePlayRate: teamRate,
    leagueRate,
    rateVsLeague,
  };
}

export function negativePlayRateByTeam(
  plays: readonly PbpRow[],
  targetWeek: number
): NegativePlayRateSplit[] {
  // Map: posteam -> week -> raw counts
  const teamData = new Map<string, Map<number, TeamRawCounts>>();
  let totalQualifying = 0;

  for (const play of plays) {
    const playWeekStr = play["week"];
    if (!playWeekStr) continue;
    const playWeek = Number(playWeekStr);
    if (!Number.isFinite(playWeek) || playWeek >= targetWeek) continue;

    const posteam = play["posteam"];
    if (!posteam) continue;

    const playType = play["play_type"];
    const pt = playType as string;
    if (pt !== "pass" && pt !== "run") continue;
    if (play["qb_kneel"] === "1") continue;

    let teamMap = teamData.get(posteam);
    if (!teamMap) {
      teamMap = new Map();
      teamData.set(posteam, teamMap);
    }

    let counts = teamMap.get(playWeek);
    if (!counts) {
      counts = { qualifyingPlays: 0, negativePlays: 0, excludedRows: 0 };
      teamMap.set(playWeek, counts);
    }

    // Unratable check
    const ygStr = play["yards_gained"];
    if (ygStr === undefined || ygStr === "") {
      counts.excludedRows++;
      continue;
    }
    const yg = Number(ygStr);
    if (!Number.isFinite(yg)) {
      counts.excludedRows++;
      continue;
    }

    counts.qualifyingPlays++;
    totalQualifying++;
    if (yg < 0) {
      counts.negativePlays++;
    }
  }

  const provenance = buildProvenance(totalQualifying);
  const splits: NegativePlayRateSplit[] = [];

  for (const [teamId, teamCountsByWeek] of teamData) {
    const seasonToDate = computeWindow(teamCountsByWeek, plays, targetWeek, null);
    const last4 = computeWindow(teamCountsByWeek, plays, targetWeek, 4);
    const last8 = computeWindow(teamCountsByWeek, plays, targetWeek, 8);

    splits.push({
      teamId,
      targetWeek,
      seasonToDate,
      last4,
      last8,
      provenance,
    });
  }

  // Sort by teamId for determinism
  splits.sort((a, b) => (a.teamId < b.teamId ? -1 : 1));
  return splits;
}
