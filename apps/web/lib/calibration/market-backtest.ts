/**
 * Market-calibration backtest over the historical-games archive.
 *
 * For every settled game with closing moneylines we de-vig the home/away prices
 * into the market's fair home-win probability, pair it with the actual result,
 * and run the real calibration math (Brier decomposition, ECE, reliability
 * curve) over the whole sample. This measures how calibrated the CLOSING LINE is
 * — the efficient-market baseline the platform model must beat. It is NOT yet
 * the platform model's own calibration (that requires running the scorer over
 * history, the next step). Read-only; honest empty state when no data is loaded.
 */
import { db } from "@sports/db";
import {
  americanToImpliedProbability,
  removeVig,
  brierDecomposition,
  expectedCalibrationError,
  reliabilityCurve,
  type CalibrationSample,
  type ReliabilityBin,
} from "@sports/prediction-engine";

export interface MarketCalibrationReport {
  readonly status: "ok" | "no-data";
  readonly generatedAt: string;
  readonly sampleSize: number;
  readonly seasonsCovered: number;
  readonly seasonRange: { readonly from: number; readonly to: number } | null;
  readonly baseRate: number; // observed home-win rate
  readonly brier: number;
  readonly reliability: number; // lower is better
  readonly resolution: number; // higher is better
  readonly ece: number;
  readonly curve: readonly ReliabilityBin[];
  readonly note: string;
}

const BASELINE_NOTE =
  "Calibration of the de-vigged CLOSING moneyline (the market's forecast) vs actual home wins. " +
  "This is the efficient-market baseline the platform model must beat — not yet the model's own calibration.";

export async function loadMarketCalibrationBacktest(): Promise<MarketCalibrationReport> {
  const generatedAt = new Date().toISOString();

  const games = await db.historicalGame.findMany({
    where: {
      homeMoneyline: { not: null },
      awayMoneyline: { not: null },
      homeScore: { not: null },
      awayScore: { not: null },
    },
    select: { season: true, homeMoneyline: true, awayMoneyline: true, homeScore: true, awayScore: true },
  });

  const rows = Array.isArray(games) ? games : [];
  const samples: CalibrationSample[] = [];
  const seasons = new Set<number>();
  for (const g of rows) {
    const { homeMoneyline, awayMoneyline, homeScore, awayScore, season } = g;
    if (homeMoneyline === null || awayMoneyline === null || homeScore === null || awayScore === null) continue;
    if (homeScore === awayScore) continue; // ties have no binary home result
    const fair = removeVig(americanToImpliedProbability(homeMoneyline), americanToImpliedProbability(awayMoneyline));
    samples.push({ p: fair.home, y: homeScore > awayScore ? 1 : 0 });
    seasons.add(season);
  }

  if (samples.length === 0) {
    return {
      status: "no-data",
      generatedAt,
      sampleSize: 0,
      seasonsCovered: 0,
      seasonRange: null,
      baseRate: 0,
      brier: 0,
      reliability: 0,
      resolution: 0,
      ece: 0,
      curve: [],
      note: "No settled historical games with closing moneylines yet. Run the historical-games backfill, then re-check.",
    };
  }

  const brier = brierDecomposition(samples);
  const ece = expectedCalibrationError(samples);
  const curve = reliabilityCurve(samples);
  const seasonList = [...seasons].sort((a, b) => a - b);

  return {
    status: "ok",
    generatedAt,
    sampleSize: samples.length,
    seasonsCovered: seasons.size,
    seasonRange: { from: seasonList[0]!, to: seasonList[seasonList.length - 1]! },
    baseRate: brier.baseRate,
    brier: brier.brier,
    reliability: brier.reliability,
    resolution: brier.resolution,
    ece,
    curve,
    note: BASELINE_NOTE,
  };
}
