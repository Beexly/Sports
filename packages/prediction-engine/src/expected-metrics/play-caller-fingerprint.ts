/**
 * Play-caller tendency fingerprint (SHADOW) — internal reasoning fuel.
 *
 * This module measures a team-window's offensive predictability and diversification
 * from play-by-play. It computes:
 *   1. Diversification: Shannon entropy and effective groupings over offense_personnel.
 *   2. Predictability: First-order Markov predictability over next-play type (pass/run)
 *      conditioned on (current play type, current personnel grouping).
 *
 * It supports full-season and rolling 8-game windows. It requires a coach-attribution
 * mapping to attribute each team-week window to an explicit play-caller.
 * It enforces point-in-time discipline (plays from week W do not enter week W's window)
 * and a 200-play floor, shrinking small-sample estimates toward the league mean.
 */

import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";

export const PLAY_CALLER_FINGERPRINT_MODEL_VERSION = "gse-playcaller-v1";
const FINGERPRINT_FEATURE_KEYS = ["personnel", "playType", "driveId", "coach"] as const;

export interface FingerprintPlay {
  readonly playId: string;
  readonly gameId: string;
  readonly season: number;
  readonly week: number;
  readonly teamId: string;
  /** Pass, run, or excluded (e.g. kneel, spike, punt, field_goal, no_play) */
  readonly playType: "pass" | "run" | "excluded";
  /** Personnel grouping (e.g., "11", "12", "21") parsed from `offense_personnel`. Null if missing/unparseable. */
  readonly personnelGrouping: string | null;
  /** Drive partition ID for sequencing bounds. */
  readonly driveId: number | null;
}

/** Coach mapping provided by the caller to attribute team-weeks. */
export interface CoachMapping {
  readonly season: number;
  readonly week: number;
  readonly teamId: string;
  readonly coachName: string;
}

export interface PlayCallerFingerprintResult {
  readonly teamId: string;
  readonly coachName: string | null;
  readonly windowKind: "season" | "roll8";
  readonly targetWeek: number;
  readonly targetSeason: number;
  readonly playsCounted: number;
  readonly distinctGroupingsK: number;
  readonly normalizedEntropy: number;
  readonly effectiveGroupings: number;
  readonly predictability: number;
  readonly shrunkNormalizedEntropy: number;
  readonly shrunkPredictability: number;
  readonly provenance: ExpectedMetricProvenance;
}

function buildProvenance(sampleSize: number): ExpectedMetricProvenance {
  return {
    modelVersion: PLAY_CALLER_FINGERPRINT_MODEL_VERSION,
    method: "deterministic-rule",
    featureKeys: [...FINGERPRINT_FEATURE_KEYS],
    featureSchemaHash: computeFeatureSchemaHash(FINGERPRINT_FEATURE_KEYS),
    sampleSize,
  };
}

/** Extracts unique (season, week) pairs from plays to define point-in-time windows. */
function getTargetWindows(plays: readonly FingerprintPlay[]): { season: number; week: number }[] {
  const seen = new Set<string>();
  const targets: { season: number; week: number }[] = [];
  for (const p of plays) {
    const key = `${p.season}-${p.week}`;
    if (!seen.has(key)) {
      seen.add(key);
      targets.push({ season: p.season, week: p.week });
    }
  }
  return targets;
}

function getCoachName(mappings: readonly CoachMapping[], season: number, week: number, teamId: string): string | null {
  for (const m of mappings) {
    if (m.season === season && m.week === week && m.teamId === teamId) {
      return m.coachName;
    }
  }
  return null;
}

/** Computes Shannon entropy given counts. Returns 0 if no counts. */
function computeEntropy(counts: Map<string, number>): number {
  let total = 0;
  for (const count of counts.values()) {
    total += count;
  }
  if (total === 0) return 0;

  let h = 0;
  for (const count of counts.values()) {
    if (count > 0) {
      const p = count / total;
      h -= p * Math.log(p);
    }
  }
  return h;
}

interface WindowData {
  readonly plays: FingerprintPlay[];
}

export function computePlayCallerFingerprint(
  allPlays: readonly FingerprintPlay[],
  coachMappings: readonly CoachMapping[]
): PlayCallerFingerprintResult[] {
  const results: PlayCallerFingerprintResult[] = [];
  const targets = getTargetWindows(allPlays);

  for (const target of targets) {
    // League-wide plays STRICTLY before target week in the same season
    const leaguePlays = allPlays.filter((p) => p.season === target.season && p.week < target.week);
    if (leaguePlays.length === 0) continue;

    const leagueGroupings = new Set<string>();
    for (const p of leaguePlays) {
      if (p.playType !== "excluded" && p.personnelGrouping !== null) {
        leagueGroupings.add(p.personnelGrouping);
      }
    }
    const K = leagueGroupings.size;

    // We calculate league-wide means to shrink towards.
    // However, if we do it cleanly, we can first compute raw stats for all teams,
    // then find the league mean, then apply shrinkage.

    // 1. Group league plays by team
    const teamPlays = new Map<string, FingerprintPlay[]>();
    for (const p of leaguePlays) {
      const bucket = teamPlays.get(p.teamId);
      if (bucket) bucket.push(p);
      else teamPlays.set(p.teamId, [p]);
    }

    // 2. We also need rolling-8 game windows.
    // For each team, get their distinct games before target.week.

    interface TeamStats {
      normalizedEntropy: number;
      predictability: number;
      playsCounted: number;
      effectiveGroupings: number;
    }

    function computeStatsForPlays(plays: FingerprintPlay[]): TeamStats | null {
      const validPlays = plays.filter((p) => p.playType !== "excluded" && p.personnelGrouping !== null);
      if (validPlays.length < 200) return null;

      const personnelCounts = new Map<string, number>();
      for (const p of validPlays) {
        const count = personnelCounts.get(p.personnelGrouping!) ?? 0;
        personnelCounts.set(p.personnelGrouping!, count + 1);
      }
      const H = computeEntropy(personnelCounts);
      const normalizedEntropy = K > 1 ? H / Math.log(K) : 0;
      const effectiveGroupings = Math.exp(H);

      // Sequencing: First-order Markov
      // H(next), H(next|current)
      let nextCounts = new Map<string, number>();
      let jointCounts = new Map<string, number>(); // key: "personnel|currentType|nextType"
      let currentGivenCounts = new Map<string, number>(); // key: "personnel|currentType"

      let seqValidPlays = 0;

      // Ensure plays are sorted chronologically within drives to safely compare consecutive
      // (Assumed sorted by playIndex already, we check consecutive by index and drive)
      for (let i = 0; i < plays.length - 1; i++) {
        const current = plays[i]!;
        const next = plays[i + 1]!;

        if (current.playType === "excluded" || next.playType === "excluded") continue;
        if (current.personnelGrouping === null) continue;
        // Must be in the same drive (so consecutive)
        if (current.driveId === null || current.driveId !== next.driveId) continue;
        // Must be the same team (redundant if split by team, but safe)
        if (current.teamId !== next.teamId) continue;

        seqValidPlays++;
        nextCounts.set(next.playType, (nextCounts.get(next.playType) ?? 0) + 1);

        const condKey = `${current.personnelGrouping}|${current.playType}`;
        const jointKey = `${condKey}|${next.playType}`;

        currentGivenCounts.set(condKey, (currentGivenCounts.get(condKey) ?? 0) + 1);
        jointCounts.set(jointKey, (jointCounts.get(jointKey) ?? 0) + 1);
      }

      const H_next = computeEntropy(nextCounts);

      let H_next_given_current = 0;
      let totalSeqPlays = 0;
      for (const c of currentGivenCounts.values()) totalSeqPlays += c;

      if (totalSeqPlays > 0) {
          for (const [condKey, condCount] of currentGivenCounts.entries()) {
              const p_cond = condCount / totalSeqPlays;

              // Compute H(next | this condKey)
              let h_sub = 0;
              for (const nextType of ["pass", "run"]) {
                  const jointKey = `${condKey}|${nextType}`;
                  const jCount = jointCounts.get(jointKey) ?? 0;
                  if (jCount > 0) {
                      const p_next_given_cond = jCount / condCount;
                      h_sub -= p_next_given_cond * Math.log(p_next_given_cond);
                  }
              }
              H_next_given_current += p_cond * h_sub;
          }
      }

      const predictability = H_next > 0 ? 1 - (H_next_given_current / H_next) : 0;

      return {
        normalizedEntropy,
        effectiveGroupings,
        predictability,
        playsCounted: validPlays.length,
      };
    }

    // First pass to compute stats and collect for league mean
    const seasonStats = new Map<string, TeamStats>();
    const roll8Stats = new Map<string, TeamStats>();

    let leagueTotalEntropy = 0;
    let leagueTotalPredict = 0;
    let leagueTeamsEntropy = 0;
    let leagueTeamsPredict = 0;

    for (const [teamId, plays] of teamPlays.entries()) {
      const sStats = computeStatsForPlays(plays);
      if (sStats) {
        seasonStats.set(teamId, sStats);
        leagueTotalEntropy += sStats.normalizedEntropy;
        leagueTeamsEntropy += 1;
        leagueTotalPredict += sStats.predictability;
        leagueTeamsPredict += 1;
      }

      // Roll 8
      const games = Array.from(new Set(plays.map(p => p.gameId))).sort();
      const last8Games = new Set(games.slice(-8));
      const roll8Plays = plays.filter(p => last8Games.has(p.gameId));

      const rStats = computeStatsForPlays(roll8Plays);
      if (rStats) {
        roll8Stats.set(teamId, rStats);
      }
    }

    const leagueMeanEntropy = leagueTeamsEntropy > 0 ? leagueTotalEntropy / leagueTeamsEntropy : 0;
    const leagueMeanPredict = leagueTeamsPredict > 0 ? leagueTotalPredict / leagueTeamsPredict : 0;

    // Second pass to apply shrinkage and output
    for (const teamId of teamPlays.keys()) {
      const coachName = getCoachName(coachMappings, target.season, target.week, teamId);

      const sStats = seasonStats.get(teamId);
      if (sStats) {
        const weight = sStats.playsCounted / (sStats.playsCounted + 100);
        results.push({
          teamId,
          coachName,
          windowKind: "season",
          targetSeason: target.season,
          targetWeek: target.week,
          playsCounted: sStats.playsCounted,
          distinctGroupingsK: K,
          normalizedEntropy: sStats.normalizedEntropy,
          effectiveGroupings: sStats.effectiveGroupings,
          predictability: sStats.predictability,
          shrunkNormalizedEntropy: (sStats.normalizedEntropy * weight) + (leagueMeanEntropy * (1 - weight)),
          shrunkPredictability: (sStats.predictability * weight) + (leagueMeanPredict * (1 - weight)),
          provenance: buildProvenance(sStats.playsCounted)
        });
      }

      const rStats = roll8Stats.get(teamId);
      if (rStats) {
        const weight = rStats.playsCounted / (rStats.playsCounted + 100);
        results.push({
          teamId,
          coachName,
          windowKind: "roll8",
          targetSeason: target.season,
          targetWeek: target.week,
          playsCounted: rStats.playsCounted,
          distinctGroupingsK: K,
          normalizedEntropy: rStats.normalizedEntropy,
          effectiveGroupings: rStats.effectiveGroupings,
          predictability: rStats.predictability,
          shrunkNormalizedEntropy: (rStats.normalizedEntropy * weight) + (leagueMeanEntropy * (1 - weight)),
          shrunkPredictability: (rStats.predictability * weight) + (leagueMeanPredict * (1 - weight)),
          provenance: buildProvenance(rStats.playsCounted)
        });
      }
    }
  }

  return results;
}
