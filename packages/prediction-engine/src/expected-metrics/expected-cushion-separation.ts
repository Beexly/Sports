import type { CovariateRow } from "../edge-lab/covariate-bus.js";
import { mean, stddev } from "./numeric.js";

/** SHADOW expected metric output. */
export interface CushionSeparationMatchup {
  readonly gsisId: string;
  readonly matchupScore: number;
  readonly cushionZ: number;
  readonly separationZ: number;
}

/**
 * Computes a SHADOW expected metric: per-player cushion-vs-separation matchup differential
 * for the NEXT game, computed point-in-time from NGS week data.
 *
 * Target qualification: 20 targets within the trailing window.
 */
export function computeCushionSeparationMatchup(
  rows: readonly CovariateRow[],
  gsisId: string,
  season: number,
  kickoffWeek: number,
  windowWeeks: number = 4
): CushionSeparationMatchup | null {
  if (!Number.isFinite(kickoffWeek) || kickoffWeek <= 1) return null;

  // 1. Point-in-time league filter
  const priorRows = rows.filter(
    (r) =>
      r.statType === "receiving" &&
      r.season === season &&
      r.week > 0 &&
      r.week < kickoffWeek &&
      r.avgCushion !== null &&
      Number.isFinite(r.avgCushion) &&
      r.avgSeparation !== null &&
      Number.isFinite(r.avgSeparation) &&
      r.targets !== null &&
      Number.isFinite(r.targets)
  );

  if (priorRows.length === 0) return null;

  // Compute league-wide baselines point-in-time
  // We use all rows prior to kickoff to establish the baseline.
  // We should weight by targets to get true league-wide means
  let sumLeagueCushion = 0;
  let sumLeagueSeparation = 0;
  let totalLeagueTargets = 0;

  for (const r of priorRows) {
    const t = r.targets!;
    sumLeagueCushion += r.avgCushion! * t;
    sumLeagueSeparation += r.avgSeparation! * t;
    totalLeagueTargets += t;
  }

  if (totalLeagueTargets === 0) return null;

  const leagueMeanCushion = sumLeagueCushion / totalLeagueTargets;
  const leagueMeanSeparation = sumLeagueSeparation / totalLeagueTargets;

  // Calculate standard deviation across player-weeks for the z-scores
  const cushionVals = priorRows.map(r => r.avgCushion!);
  const sepVals = priorRows.map(r => r.avgSeparation!);
  const stdCushion = stddev(cushionVals, mean(cushionVals));
  const stdSeparation = stddev(sepVals, mean(sepVals));

  if (stdCushion === 0 || stdSeparation === 0) return null;

  // 2. Isolate player's trailing window
  const minWeek = kickoffWeek - windowWeeks;
  const playerWindowRows = priorRows.filter(
    (r) => r.gsisId === gsisId && r.week >= minWeek
  );

  let playerTargets = 0;
  let playerSumCushion = 0;
  let playerSumSeparation = 0;

  for (const r of playerWindowRows) {
    const t = r.targets!;
    playerTargets += t;
    playerSumCushion += r.avgCushion! * t;
    playerSumSeparation += r.avgSeparation! * t;
  }

  // 3. Qualification floor
  if (playerTargets < 20) return null;

  const playerAggCushion = playerSumCushion / playerTargets;
  const playerAggSeparation = playerSumSeparation / playerTargets;

  // 4. Compute Z-scores and composite matchup score
  const cushionZ = (playerAggCushion - leagueMeanCushion) / stdCushion;
  const separationZ = (playerAggSeparation - leagueMeanSeparation) / stdSeparation;

  const matchupScore = cushionZ + separationZ;

  return {
    gsisId,
    matchupScore,
    cushionZ,
    separationZ
  };
}
