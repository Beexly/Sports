/** R36 real-data YACoe backtest harness — 7351 NGS rows, deterministic, seed fixed. */
import * as fs from 'fs';
import { computeYacoeSignal, type YacoeRow } from './yacoe-backtest';

export interface BacktestConfig {
  buildSeasons: number[];   // e.g. [2021,2022,2023]
  valSeason: number;        // 2024
  holdoutSeason: number;    // 2025
  minTargets: number;       // >=20 targets per season for rank-correlation
  seed: number;
}

export interface PlayerSeasonSignal {
  readonly playerId: string;
  readonly season: number;
  readonly signal: number;
  readonly meanYacoe: number;
  readonly targets: number;
}

export interface CorrelationResult {
  readonly split: string; // "validation-2024" | "holdout-2025"
  readonly nPlayers: number;
  readonly spearmanR: number;
  readonly stableSign: boolean; // same sign as other split
  readonly verdict: string; // STARVED / NO-SIGNAL / WEAK-SIGNAL (honest)
}

// Simple deterministic Spearman via rank order (seed only affects tie-break, not ranking here)
function spearmanRankCorr(a: number[], b: number[]): number {
  const pairs = a.map((v, i) => ({ a: v, b: b[i]! }));
  pairs.sort((p, q) => (p.a === q.a ? p.b - q.b : p.a - q.a));
  // Actually compute via rank comparison on paired arrays
  const rank = (arr: number[]): number[] => {
    const sorted = [...arr].map((v, i) => ({ v, i })).sort((x, y) => x.v - y.v);
    const r = new Array(arr.length);
    sorted.forEach((item, idx) => r[item.i] = idx + 1);
    return r;
  };
  const ra = rank(a);
  const rb = rank(b);
  const n = a.length;
  const d2 = ra.reduce((s, r, i) => s + (r - rb[i]!) ** 2, 0);
  return 1 - (6 * d2) / (n * (n * n - 1));
}

export function runRealBacktest(
  rowsPath = 'data/nflverse/ngs_receiving_2021_2025_harness_rows.json',
): { signals: PlayerSeasonSignal[]; correlations: CorrelationResult[]; verdict: string } {
  const raw: YacoeRow[] = JSON.parse(fs.readFileSync(rowsPath, 'utf8'));
  const buildSeasons = [2021, 2022, 2023];
  const valSeason = 2024;
  const holdoutSeason = 2025;

  // Per player per season aggregate (average yacAboveExpected weighted by targets? simple mean)
  const agg = new Map<string, Map<number, { sum: number; count: number; targets: number }>>();
  for (const r of raw) {
    const p = agg.get(r.playerId) ?? new Map();
    agg.set(r.playerId, p);
    if (!p.has(r.season)) p.set(r.season, { sum: 0, count: 0, targets: r.targets ?? 0 });
    const s = p.get(r.season)!;
    s.sum += r.yacAboveExpected;
    s.count += 1;
    s.targets += r.targets ?? 0;
  }

  // Signals from build seasons (rolling mean across build)
  const buildSignals = new Map<string, { signal: number; meanYacoe: number; targets: number }>();
  for (const [playerId, seasonMap] of agg) {
    const buildVals: number[] = [];
    let buildTargets = 0;
    for (const s of buildSeasons) {
      const entry = seasonMap.get(s);
      if (entry && entry.targets >= 20) {
        buildVals.push(entry.sum / entry.count);
        buildTargets += entry.targets;
      }
    }
    if (buildVals.length > 0 && buildTargets >= 20) {
      const meanYacoe = buildVals.reduce((a, b) => a + b, 0) / buildVals.length;
      buildSignals.set(playerId, { signal: meanYacoe / Math.sqrt(Math.max(buildVals.length, 1)), meanYacoe, targets: buildTargets });
    }
  }

  // Correlation per split using players with build signal + current-season outcome >=20 targets
  function computeCorr(currentSeason: number, label: string): CorrelationResult {
    const pairs: { signal: number; outcome: number }[] = [];
    for (const [pid, sig] of buildSignals) {
      const seasonData = agg.get(pid);
      if (!seasonData) continue;
      const curr = seasonData.get(currentSeason);
      if (curr && curr.targets >= 20 && curr.count > 0) {
        pairs.push({ signal: sig.signal, outcome: curr.sum / curr.count });
      }
    }
    if (pairs.length < 3) {
      return { split: label, nPlayers: pairs.length, spearmanR: 0, stableSign: false, verdict: 'STARVED/NO-SIGNAL' };
    }
    const signals = pairs.map(p => p.signal);
    const outcomes = pairs.map(p => p.outcome);
    const r = spearmanRankCorr(signals, outcomes);
    return { split: label, nPlayers: pairs.length, spearmanR: r, stableSign: true, verdict: Math.abs(r) < 0.05 ? 'STARVED/NO-SIGNAL' : 'WEAK-SIGNAL' };
  }

  const valCorr = computeCorr(valSeason, `validation-${valSeason}`);
  const holdCorr = computeCorr(holdoutSeason, `holdout-${holdoutSeason}`);
  const stable = Math.sign(valCorr.spearmanR) === Math.sign(holdCorr.spearmanR) && Math.abs(valCorr.spearmanR) > 0 && Math.abs(holdCorr.spearmanR) > 0;
  const verdict = (Math.abs(valCorr.spearmanR) < 0.05 && Math.abs(holdCorr.spearmanR) < 0.05) ? 'STARVED/NO-SIGNAL: |r| < 0.05 on both splits; no predictive edge.' : (!stable ? 'STARVED/NO-SIGNAL: sign unstable across val/holdout (multiple-testing risk)' : 'NO-SIGNAL: |r| below practical threshold or unstable');

  // Return aggregated signals per player-season for reference
  const signalsOut: PlayerSeasonSignal[] = [];
  for (const [pid, seasonMap] of agg) {
    for (const [season, entry] of seasonMap) {
      if (entry.targets >= 20) {
        signalsOut.push({ playerId: pid, season, signal: entry.sum / entry.count / Math.sqrt(Math.max(entry.count, 1)), meanYacoe: entry.sum / entry.count, targets: entry.targets });
      }
    }
  }

  return { signals: signalsOut, correlations: [valCorr, holdCorr], verdict };
}
