import { type CovariateRow } from "../edge-lab/covariate-bus.js";
import { type PlayerExpectedMetric, type ExpectedMetricProvenance, computeFeatureSchemaHash } from "./types.js";
import { round, mean } from "./numeric.js";

/**
 * SHADOW EXPECTED METRIC: Per-Player NGS Average Separation
 *
 * Scope is PER-PLAYER only. Team-level WR1 leaderboard is not derivable in v1
 * because no team field exists on CovariateRow.
 *
 * Note on honesty: `avgSeparation` is a weekly MEAN over catch/incompletion
 * frames, not a per-target arrival measurement. All output fields reflect the
 * weekly-mean grain (e.g. weeklyMeanSeparation) and do not fake per-target weight.
 */

export const AVG_SEPARATION_MODEL_VERSION = "v1.0";
export const AVG_SEPARATION_FEATURE_KEYS = ["avgSeparation"] as const;
export const MIN_QUALIFYING_WEEKS = 3;

export type WindowType = "season-to-date" | "last-4-weeks" | "last-8-weeks";

export interface AvgSeparationExpectedResult {
  readonly metrics: readonly PlayerExpectedMetric[];
  readonly provenance: ExpectedMetricProvenance;
}

export function computeAvgSeparationExpected(
  rows: readonly CovariateRow[],
  asOfWeek: number,
  window: WindowType
): AvgSeparationExpectedResult {
  // 1. Filter rows to valid weekly receiving rows up to asOfWeek
  const validRows = rows.filter((r) =>
    r.statType === "receiving" &&
    r.avgSeparation !== null &&
    r.week >= 1 &&
    r.week <= asOfWeek
  );

  // 2. Group by player
  const playerRows = new Map<string, CovariateRow[]>();
  for (const r of validRows) {
    let pr = playerRows.get(r.gsisId);
    if (!pr) {
      pr = [];
      playerRows.set(r.gsisId, pr);
    }
    pr.push(r);
  }

  // 3. Apply window and floor
  const playerMeans = new Map<string, { mean: number; weeks: number }>();
  let sampleSize = 0; // count of rows used across players that meet the floor

  for (const [playerId, pRows] of playerRows.entries()) {
    // sort by week ascending
    pRows.sort((a, b) => a.week - b.week);

    let windowRows: CovariateRow[];
    if (window === "season-to-date") {
      windowRows = pRows;
    } else if (window === "last-4-weeks") {
      windowRows = pRows.slice(-4);
    } else if (window === "last-8-weeks") {
      windowRows = pRows.slice(-8);
    } else {
      windowRows = pRows;
    }

    if (windowRows.length >= MIN_QUALIFYING_WEEKS) {
      const seps = windowRows.map((r) => r.avgSeparation as number);
      const weeklyMeanSeparation = mean(seps);
      playerMeans.set(playerId, { mean: weeklyMeanSeparation, weeks: windowRows.length });
      sampleSize += windowRows.length;
    }
  }

  // 4. Compute league mean
  const means = Array.from(playerMeans.values()).map(x => x.mean);
  const leagueMean = means.length > 0 ? mean(means) : 0;

  // 5. Build results
  const metrics: PlayerExpectedMetric[] = [];
  for (const [playerId, data] of playerMeans.entries()) {
    const actualMean = round(data.mean);
    const expectedMean = round(leagueMean);
    const overExpected = round(data.mean - leagueMean);
    const overExpectedTotal = round(overExpected * data.weeks);

    metrics.push({
      playerId,
      plays: data.weeks, // qualifying week count
      actualMean,
      expectedMean,
      overExpected,
      overExpectedTotal
    });
  }

  const provenance: ExpectedMetricProvenance = {
    modelVersion: AVG_SEPARATION_MODEL_VERSION,
    method: "deterministic-rule",
    featureKeys: AVG_SEPARATION_FEATURE_KEYS,
    featureSchemaHash: computeFeatureSchemaHash(AVG_SEPARATION_FEATURE_KEYS),
    sampleSize
  };

  return {
    metrics,
    provenance
  };
}
