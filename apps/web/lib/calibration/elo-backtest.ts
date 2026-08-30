/**
 * Elo vs market calibration over historical games.
 *
 * Runs the results-only Elo backtest (ratings warm up on EVERY game) and scores
 * it on exactly the games that also have closing moneylines — the same subset on
 * which we de-vig the closing line. Both forecasters are then calibrated on the
 * identical games, so comparing their Brier scores honestly answers "does a
 * simple independent model match the market?" (Lower Brier = better calibrated.
 * Markets are efficient, so beating the close is hard — the value is in seeing
 * where Elo and the market diverge.) Read-only; honest empty state until loaded.
 */
import { db } from "@sports/db";
import {
  eloBacktest,
  americanToImpliedProbability,
  removeVig,
  brierDecomposition,
  expectedCalibrationError,
  type EloBacktestGame,
  type EloBacktestReport,
  type CalibrationSample,
} from "@sports/prediction-engine";

export interface MarketCalibration {
  readonly sampleSize: number;
  readonly brier: number;
  readonly reliability: number;
  readonly resolution: number;
  readonly ece: number;
  readonly baseRate: number;
}

export interface EloVsMarketReport {
  readonly status: "ok" | "no-data";
  readonly generatedAt: string;
  readonly comparisonSampleSize: number;
  readonly seasonRange: { readonly from: number; readonly to: number } | null;
  readonly elo: EloBacktestReport;
  readonly market: MarketCalibration;
  readonly betterCalibrated: "elo" | "market" | "tie";
  readonly note: string;
}

const EMPTY_ELO: EloBacktestReport = {
  sampleSize: 0, accuracy: 0, brier: 0, reliability: 0, resolution: 0, ece: 0, baseRate: 0, curve: [], teamsRated: 0,
};

export async function loadEloVsMarketBacktest(): Promise<EloVsMarketReport> {
  const generatedAt = new Date().toISOString();

  const games = await db.historicalGame.findMany({
    where: { homeScore: { not: null }, awayScore: { not: null } },
    select: { season: true, week: true, homeTeam: true, awayTeam: true, homeScore: true, awayScore: true, homeMoneyline: true, awayMoneyline: true },
  });
  const rows = Array.isArray(games) ? games : [];

  const eloGames: EloBacktestGame[] = [];
  const marketSamples: CalibrationSample[] = [];
  const seasons = new Set<number>();
  for (const g of rows) {
    if (g.homeScore === null || g.awayScore === null) continue;
    const hasMarket =
      g.homeMoneyline !== null && g.awayMoneyline !== null && g.homeScore !== g.awayScore;
    eloGames.push({
      season: g.season, week: g.week, homeTeam: g.homeTeam, awayTeam: g.awayTeam,
      homeScore: g.homeScore, awayScore: g.awayScore, includeInCalibration: hasMarket,
    });
    if (hasMarket) {
      const fair = removeVig(americanToImpliedProbability(g.homeMoneyline!), americanToImpliedProbability(g.awayMoneyline!));
      marketSamples.push({ p: fair.home, y: g.homeScore > g.awayScore ? 1 : 0 });
      seasons.add(g.season);
    }
  }

  if (marketSamples.length === 0) {
    return {
      status: "no-data",
      generatedAt,
      comparisonSampleSize: 0,
      seasonRange: null,
      elo: EMPTY_ELO,
      market: { sampleSize: 0, brier: 0, reliability: 0, resolution: 0, ece: 0, baseRate: 0 },
      betterCalibrated: "tie",
      note: "No historical games with closing moneylines yet. Run the historical-games backfill, then re-check.",
    };
  }

  const elo = eloBacktest(eloGames);
  const mb = brierDecomposition(marketSamples);
  const market: MarketCalibration = {
    sampleSize: marketSamples.length,
    brier: mb.brier,
    reliability: mb.reliability,
    resolution: mb.resolution,
    ece: expectedCalibrationError(marketSamples),
    baseRate: mb.baseRate,
  };
  const seasonList = [...seasons].sort((a, b) => a - b);
  const betterCalibrated = elo.brier < market.brier ? "elo" : elo.brier > market.brier ? "market" : "tie";

  return {
    status: "ok",
    generatedAt,
    comparisonSampleSize: marketSamples.length,
    seasonRange: { from: seasonList[0]!, to: seasonList[seasonList.length - 1]! },
    elo,
    market,
    betterCalibrated,
    note:
      `Elo (results-only) vs the de-vigged closing line on the same ${marketSamples.length} games. ` +
      `Lower Brier = better calibrated; market is the efficient baseline. betterCalibrated=${betterCalibrated}.`,
  };
}
