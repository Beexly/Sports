/** Separation weighted-mean backtest harness — pure function, no market input.
 * SYNTHETIC property tests only; real-data backtest BLOCKED until ingestion run.
 * Uses rolling weighted mean (weight = targets) vs league-season mean/sd.
 */
export interface SeparationRow {
  readonly playerId: string;
  readonly week: number;
  readonly season: number;
  readonly avgSeparation: number | null;
  readonly targets: number;
}

export interface SeparationBacktestResult {
  readonly playerId: string;
  readonly rollingWeightedMeanSeparation: number | null;
  readonly signal: number | null; // (rolling mean - league mean) / league sd
  readonly totalTargets: number;
  readonly priced: false;
}

export function computeSeparationBacktest(
  rows: readonly SeparationRow[],
  minSample: number = 30,
): readonly SeparationBacktestResult[] {
  // Per-season league aggregates (weighted by targets)
  const seasonSums: Record<number, { weightedSum: number; totalTargets: number }> = {};
  const seasonVals: Record<number, number[]> = {};
  for (const r of rows) {
    if (r.avgSeparation === null || r.targets <= 0) continue;
    const s = r.season;
    if (!seasonSums[s]) {
      seasonSums[s] = { weightedSum: 0, totalTargets: 0 };
      seasonVals[s] = [];
    }
    seasonSums[s]!.weightedSum += r.avgSeparation * r.targets;
    seasonSums[s]!.totalTargets += r.targets;
    seasonVals[s]!.push(r.avgSeparation);
  }

  const seasonLeagueMean: Record<number, number> = {};
  const seasonLeagueSd: Record<number, number> = {};
  for (const s of Object.keys(seasonSums).map(Number)) {
    const agg = seasonSums[s]!;
    const mean = agg.weightedSum / agg.totalTargets;
    seasonLeagueMean[s] = mean;
    const vars = seasonVals[s]!.map((v) => (v - mean) ** 2);
    const variance = vars.reduce((a, b) => a + b, 0) / seasonVals[s]!.length;
    seasonLeagueSd[s] = Math.sqrt(variance);
  }

  const byPlayer = new Map<string, SeparationRow[]>();
  for (const r of rows) {
    const arr = byPlayer.get(r.playerId) ?? [];
    arr.push(r);
    byPlayer.set(r.playerId, arr);
  }

  const out: SeparationBacktestResult[] = [];
  for (const [playerId, arr] of byPlayer) {
    const sorted = [...arr].sort((a, b) => (a.season - b.season) || (a.week - b.week));
    let weightedSum = 0;
    let totalTargets = 0;
    for (const r of sorted) {
      if (r.avgSeparation !== null && r.targets > 0) {
        weightedSum += r.avgSeparation * r.targets;
        totalTargets += r.targets;
      }
    }
    const rollingMean = totalTargets >= minSample ? weightedSum / totalTargets : null;
    if (rollingMean === null || !Number.isFinite(rollingMean)) {
      out.push({ playerId, rollingWeightedMeanSeparation: null, signal: null, totalTargets, priced: false });
      continue;
    }
    // Signal computed against the most recent season present in rows for this player
    const lastSeason = sorted[sorted.length - 1]!.season;
    const mean = seasonLeagueMean[lastSeason] ?? rollingMean;
    const sd = seasonLeagueSd[lastSeason] ?? 1;
    const signal = sd > 0 ? (rollingMean - mean) / sd : 0;
    out.push({ playerId, rollingWeightedMeanSeparation: rollingMean, signal, totalTargets, priced: false });
  }
  return out;
}
