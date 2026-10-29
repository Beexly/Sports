/**
 * Manageable Third Down Creation Rate — Q45 SHADOW metric.
 *
 * A rate evaluating within-series play sequencing quality: the share of
 * 2nd & 8+ plays whose next offensive play in the same drive is a 3rd down
 * of 4 or fewer yards to go.
 *
 * Denominator rule (Attempts):
 * Any REG scrimmage row (play_type "pass" or "run") with non-empty posteam,
 * down == 2, and ydstogo >= 8, excluding clock plays (kneels and spikes).
 * If the drive ends on that 2nd down (no next play in the same fixed_drive),
 * it is EXCLUDED from attempts and counted as `resolvedOnSecond`.
 *
 * Numerator rule (Creations):
 * The strictly next play in the same fixed_drive has down == 3 AND ydstogo <= 4.
 * If the next play is a 1st down, it is a conversion (NOT a creation), and is
 * counted separately in diagnostics as `convertedOnSecond`.
 *
 * Kneel and spike rows (qb_kneel == 1 or qb_spike == 1) are strictly excluded
 * from the mapped series and do not serve as "next play" candidates.
 */

import { round } from "./numeric.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";

/** One scrimmage play mapped for the manageable third down rate module. */
export interface ManageableThirdDownPlay {
  readonly playId: string;
  readonly gameId: string;
  readonly week: number;
  readonly posteam: string;
  readonly defteam: string;
  readonly down: number;
  readonly ydstogo: number;
  readonly playType: string;
  readonly qbKneel: 0 | 1;
  readonly qbSpike: 0 | 1;
  readonly fixedDrive: number | null;
}

export const MANAGEABLE_THIRD_DOWN_MODEL_VERSION = "gse-manageable-third-down-v1";
const FEATURE_KEYS = ["down", "ydstogo", "qbKneel", "qbSpike"] as const;

export interface ManageableThirdDownWindowSplit {
  readonly teamId: string;
  readonly windowWeeks: number;
  readonly attempts: number;
  readonly creations: number;
  readonly manageableThirdDownRate: number;
  readonly diagnostics: {
    readonly excludedKneelsOrSpikes: number;
    readonly resolvedOnSecond: number;
    readonly convertedOnSecond: number;
  };
  readonly provenance: ExpectedMetricProvenance;
}

function buildProvenance(sampleSize: number): ExpectedMetricProvenance {
  return {
    modelVersion: MANAGEABLE_THIRD_DOWN_MODEL_VERSION,
    method: "deterministic-rule",
    featureKeys: [...FEATURE_KEYS],
    featureSchemaHash: computeFeatureSchemaHash(FEATURE_KEYS),
    sampleSize,
  };
}

/**
 * Computes the manageable third down rate for each team over specified trailing
 * week windows (point-in-time relative to targetWeek).
 *
 * Requires `plays` to be ordered by game, then by play_id (as mapped).
 */
export function computeManageableThirdDownRate(
  plays: readonly ManageableThirdDownPlay[],
  targetWeek: number,
  windowLimits: readonly number[] = [Number.POSITIVE_INFINITY, 4, 8],
  minAttemptsFloor: number = 30
): ManageableThirdDownWindowSplit[] {
  // Enforce point-in-time discipline: strictly before targetWeek
  const pitPlays = plays.filter((p) => p.week < targetWeek);

  // Identify distinct weeks present per team strictly below targetWeek
  // We compute distinct weeks using all plays except kneels and spikes
  const distinctWeeksByTeam = new Map<string, number[]>();
  for (const p of pitPlays) {
    if (p.qbKneel === 1 || p.qbSpike === 1) continue;

    const team = p.posteam;
    if (!distinctWeeksByTeam.has(team)) {
      distinctWeeksByTeam.set(team, []);
    }
    const weeks = distinctWeeksByTeam.get(team)!;
    if (!weeks.includes(p.week)) {
      weeks.push(p.week);
    }
  }
  for (const weeks of distinctWeeksByTeam.values()) {
    weeks.sort((a, b) => b - a); // descending
  }

  interface TeamStats {
    attempts: number;
    creations: number;
    excludedKneelsOrSpikes: number;
    resolvedOnSecond: number;
    convertedOnSecond: number;
  }

  const results: ManageableThirdDownWindowSplit[] = [];
  const provenanceCache = new Map<number, ExpectedMetricProvenance>();

  for (const windowLimit of windowLimits) {
    const statsByTeam = new Map<string, TeamStats>();

    const seriesPlaysInWindow: ManageableThirdDownPlay[] = [];

    // First, pass through all plays. For kneels and spikes, attribute them to the team
    // if that week falls in the team's window limit. Otherwise, collect valid plays.
    for (const p of pitPlays) {
      const team = p.posteam;
      const teamWeeks = distinctWeeksByTeam.get(team) || [];
      const distinctWeeksInWindow = teamWeeks.slice(0, windowLimit);

      if (!distinctWeeksInWindow.includes(p.week)) continue;

      let stats = statsByTeam.get(team);
      if (!stats) {
        stats = { attempts: 0, creations: 0, excludedKneelsOrSpikes: 0, resolvedOnSecond: 0, convertedOnSecond: 0 };
        statsByTeam.set(team, stats);
      }

      if (p.qbKneel === 1 || p.qbSpike === 1) {
        stats.excludedKneelsOrSpikes++;
      } else {
        seriesPlaysInWindow.push(p);
      }
    }

    // Now evaluate sequence logic on window-filtered seriesPlaysInWindow
    for (let i = 0; i < seriesPlaysInWindow.length; i++) {
      const play = seriesPlaysInWindow[i]!;
      const team = play.posteam;

      if (play.down === 2 && play.ydstogo >= 8) {
        const stats = statsByTeam.get(team)!;

        const nextPlay = i + 1 < seriesPlaysInWindow.length ? seriesPlaysInWindow[i + 1] : null;
        const sameDrive = nextPlay && nextPlay.gameId === play.gameId && nextPlay.fixedDrive === play.fixedDrive;

        if (!sameDrive) {
          stats.resolvedOnSecond++;
        } else {
          stats.attempts++;
          if (nextPlay.down === 3 && nextPlay.ydstogo <= 4) {
            stats.creations++;
          } else if (nextPlay.down === 1) {
            stats.convertedOnSecond++;
          }
        }
      }
    }

    for (const [team, stats] of statsByTeam.entries()) {
      if (stats.attempts >= minAttemptsFloor) {
        if (!provenanceCache.has(stats.attempts)) {
          provenanceCache.set(stats.attempts, buildProvenance(stats.attempts));
        }

        results.push({
          teamId: team,
          windowWeeks: windowLimit,
          attempts: stats.attempts,
          creations: stats.creations,
          manageableThirdDownRate: round(stats.creations / stats.attempts, 4),
          diagnostics: {
            excludedKneelsOrSpikes: stats.excludedKneelsOrSpikes,
            resolvedOnSecond: stats.resolvedOnSecond,
            convertedOnSecond: stats.convertedOnSecond,
          },
          provenance: provenanceCache.get(stats.attempts)!,
        });
      }
    }
  }

  // Deterministic sorting: team asc, window desc
  results.sort((a, b) => {
    if (a.teamId < b.teamId) return -1;
    if (a.teamId > b.teamId) return 1;
    return b.windowWeeks - a.windowWeeks;
  });

  return results;
}
