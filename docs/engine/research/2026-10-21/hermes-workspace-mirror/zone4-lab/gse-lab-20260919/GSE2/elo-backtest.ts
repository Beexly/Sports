/**
 * Elo independent-model backtest.
 *
 * Runs a sequential team-Elo over historical results (chronological, with
 * offseason regression toward the mean) and measures how calibrated its
 * pre-game home-win probabilities are against actual outcomes. Elo uses NO
 * market data, so comparing its calibration to the de-vigged closing line
 * answers "can a simple results-only model match (or beat) the market?".
 *
 * Pure and db-free. Ratings warm up on EVERY game; calibration is recorded only
 * for games flagged `includeInCalibration` (so the apps layer can score Elo on
 * exactly the subset that also has closing odds — an apples-to-apples compare).
 */
import { eloWinProbability, updateEloRatings, type EloOptions } from "./elo-estimator.js";
import {
  brierDecomposition,
  expectedCalibrationError,
  reliabilityCurve,
  type CalibrationSample,
  type ReliabilityBin,
} from "./probability-calibration.js";

export interface EloBacktestGame {
  readonly season: number;
  readonly week: number;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly homeScore: number;
  readonly awayScore: number;
  /** Record this game in the calibration sample (default true). Ratings always update. */
  readonly includeInCalibration?: boolean;
}

export interface EloBacktestReport {
  readonly sampleSize: number;
  readonly accuracy: number; // share of scored games whose higher-prob side won
  readonly brier: number;
  readonly reliability: number;
  readonly resolution: number;
  readonly ece: number;
  readonly baseRate: number; // home-win rate in the sample
  readonly curve: readonly ReliabilityBin[];
  readonly teamsRated: number;
}

export interface EloBacktestOptions extends EloOptions {
  readonly k?: number;
  readonly initialRating?: number; // default 1500
  /** Fraction of (rating − mean) kept across an offseason. Default 0.75. */
  readonly seasonCarryover?: number;
}

export function eloBacktest(games: readonly EloBacktestGame[], options: EloBacktestOptions = {}): EloBacktestReport {
  const k = options.k ?? 20;
  const init = options.initialRating ?? 1500;
  const carry = options.seasonCarryover ?? 0.75;
  const eloOpts: EloOptions = { homeAdvantage: options.homeAdvantage, scale: options.scale };

  const ordered = [...games].sort((a, b) => a.season - b.season || a.week - b.week);
  const ratings = new Map<string, number>();
  const ratingOf = (team: string): number => ratings.get(team) ?? init;

  const samples: CalibrationSample[] = [];
  let correct = 0;
  let prevSeason: number | null = null;

  for (const g of ordered) {
    // Offseason: regress every rating toward the mean when the season advances.
    if (prevSeason !== null && g.season !== prevSeason) {
      for (const [team, r] of ratings) ratings.set(team, init + carry * (r - init));
    }
    prevSeason = g.season;

    const hR = ratingOf(g.homeTeam);
    const aR = ratingOf(g.awayTeam);
    const pHome = eloWinProbability(hR, aR, eloOpts);
    const tie = g.homeScore === g.awayScore;
    const homeWon = g.homeScore > g.awayScore;

    if (!tie && g.includeInCalibration !== false) {
      samples.push({ p: pHome, y: homeWon ? 1 : 0 });
      if (pHome >= 0.5 === homeWon) correct += 1;
    }

    // Update ratings on every game (ties get half credit).
    if (tie) {
      const delta = k * (0.5 - pHome);
      ratings.set(g.homeTeam, hR + delta);
      ratings.set(g.awayTeam, aR - delta);
    } else {
      const upd = updateEloRatings(hR, aR, homeWon, k, eloOpts);
      ratings.set(g.homeTeam, upd.home);
      ratings.set(g.awayTeam, upd.away);
    }
  }

  if (samples.length === 0) {
    return { sampleSize: 0, accuracy: 0, brier: 0, reliability: 0, resolution: 0, ece: 0, baseRate: 0, curve: [], teamsRated: ratings.size };
  }
  const brier = brierDecomposition(samples);
  return {
    sampleSize: samples.length,
    accuracy: Math.round((correct / samples.length) * 1000) / 1000,
    brier: brier.brier,
    reliability: brier.reliability,
    resolution: brier.resolution,
    ece: expectedCalibrationError(samples),
    baseRate: brier.baseRate,
    curve: reliabilityCurve(samples),
    teamsRated: ratings.size,
  };
}
