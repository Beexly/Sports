/**
 * QB Tight-Window Aggressiveness (SHADOW expected metric).
 *
 * Computes a QB's rate of throws into tight coverage (<1 yd separation) over
 * rolling windows, compared to the league-average rate over the same window.
 *
 * HONESTY (weekly mean ≠ per-throw measurement):
 * The input is the NGS weekly mean `aggressiveness` (a % rate). The module
 * does NOT count individual pass attempts or dropbacks (the covariate bus does
 * not supply volume denominators). Therefore, this is an unweighted plain mean
 * of weekly rates, and the required minimum floor (3) is a count of qualifying
 * WEEKS in the window, not dropbacks.
 *
 * Windows enforce strict point-in-time discipline: only weeks < asOfWeek are
 * evaluated.
 *
 * SHADOW metric: never surfaced to public UI or downstream bets.
 */

import type { CovariateRow } from "../edge-lab/covariate-bus.js";
import { roundMetric } from "./index.js";
import type { PlayerExpectedMetric, ExpectedMetricProvenance } from "./types.js";

export const QB_AGGRESSIVENESS_MODEL_VERSION = "gse-qbagg-v1";
export const MIN_QUALIFYING_WEEKS = 3;

export interface QbAggressivenessModel {
  readonly provenance: ExpectedMetricProvenance;
}

export type QbAggressivenessWindow = "season-to-date" | "last-4-weeks" | "last-8-weeks";

function isQualifyingPassingRow(row: CovariateRow, asOfWeek: number): boolean {
  return (
    row.statType === "passing" &&
    row.aggressiveness !== null &&
    Number.isFinite(row.aggressiveness) &&
    row.week >= 1 &&
    row.week < asOfWeek
  );
}

function filterToWindow(
  playerRows: readonly CovariateRow[],
  window: QbAggressivenessWindow
): CovariateRow[] {
  const sorted = [...playerRows].sort((a, b) => a.week - b.week);
  if (window === "season-to-date") return sorted;
  if (window === "last-4-weeks") return sorted.slice(-4);
  if (window === "last-8-weeks") return sorted.slice(-8);
  return sorted;
}

export function computeQbAggressivenessExpected(
  rows: readonly CovariateRow[],
  asOfWeek: number,
  windowType: QbAggressivenessWindow
): PlayerExpectedMetric[] {
  const validRows = rows.filter((r) => isQualifyingPassingRow(r, asOfWeek));

  const qbRows = new Map<string, CovariateRow[]>();
  for (const row of validRows) {
    let list = qbRows.get(row.gsisId);
    if (!list) {
      list = [];
      qbRows.set(row.gsisId, list);
    }
    list.push(row);
  }

  // Calculate actual mean for each QB that meets the floor
  const qbMeans = new Map<string, { plays: number; actualMean: number; aggressivenessTotal: number }>();

  for (const [gsisId, allPlayerRows] of qbRows.entries()) {
    const windowRows = filterToWindow(allPlayerRows, windowType);
    if (windowRows.length < MIN_QUALIFYING_WEEKS) continue;

    let sum = 0;
    for (const r of windowRows) {
      sum += r.aggressiveness!;
    }
    const actualMean = sum / windowRows.length;
    qbMeans.set(gsisId, { plays: windowRows.length, actualMean, aggressivenessTotal: sum });
  }

  if (qbMeans.size === 0) return [];

  // League expected is the mean of qualifying QBs' means
  let leagueSum = 0;
  for (const stats of qbMeans.values()) {
    leagueSum += stats.actualMean;
  }
  const leagueMean = leagueSum / qbMeans.size;

  const results: PlayerExpectedMetric[] = [];
  for (const [gsisId, stats] of qbMeans.entries()) {
    const overExpected = stats.actualMean - leagueMean;
    const overExpectedTotal = overExpected * stats.plays;

    results.push({
      playerId: gsisId,
      plays: stats.plays,
      actualMean: roundMetric(stats.actualMean, 4),
      expectedMean: roundMetric(leagueMean, 4),
      overExpected: roundMetric(overExpected, 4),
      overExpectedTotal: roundMetric(overExpectedTotal, 4),
    });
  }

  return results;
}
