/**
 * @file backtest-pre-week6-corpus.ts
 * Rigorous backtest of the Full-Corpus Literature Evaluator on frozen Pre-Week-6 2026 data.
 *
 * Rules:
 *  - Only data strictly prior to Week 6, 2026 is evaluated.
 *  - Measures Brier score, Log Loss, and calibration deltas with evaluator on vs off.
 *  - Evaluates promotion gate criteria pursuant to MODEL_PROMOTION_GATE_CONTRACT.md.
 *  - If delta does not improve by >= 0.002 Brier points or N < 500, keeps weight at 0.0.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  evaluateFullCorpus,
  getLoadedCorpusCensus,
  CORPUS_EVALUATOR_DEFAULT_WEIGHT,
} from "../packages/prediction-engine/src/reasoning/corpus-evaluator.js";
import type { GameContext } from "../packages/prediction-engine/src/reasoning/situational-engine.js";

interface SettledGame {
  readonly game_id: string;
  readonly week: number;
  readonly home_team: string;
  readonly away_team: string;
  readonly venue: string;
  readonly roof: string;
  readonly spread_line: number;
  readonly temp_f: number;
  readonly wind_mph: number;
  readonly home_score: number;
  readonly away_score: number;
  readonly home_win: 0 | 1;
  readonly market_implied_p: number;
}

interface BacktestResult {
  readonly sampleSize: number;
  readonly baselineBrier: number;
  readonly baselineLogLoss: number;
  readonly challengerBrier: number;
  readonly challengerLogLoss: number;
  readonly deltaBrier: number;
  readonly deltaLogLoss: number;
  readonly weightTested: number;
  readonly promotionGatePassed: boolean;
  readonly gateReason: string;
}

export function runPreWeek6Backtest(testedWeight = 1.0): BacktestResult {
  const fixturePath = path.resolve(
    process.cwd(),
    "docs/predictions/research/2026-10-17/PRE_WEEK6_2026_SETTLED_GAMES.json",
  );

  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Settled games fixture not found at: ${fixturePath}`);
  }

  const rawGames: SettledGame[] = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
  // Strict filter: weeks 1 through 5 of 2026 ONLY
  const preWeek6Games = rawGames.filter((g) => g.week >= 1 && g.week <= 5);

  let baselineBrierSum = 0;
  let challengerBrierSum = 0;
  let baselineLogLossSum = 0;
  let challengerLogLossSum = 0;

  for (const game of preWeek6Games) {
    const isDenver = game.home_team === "DEN";
    const ctx: GameContext = {
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      venue: game.venue,
      restDaysHome: 7,
      restDaysAway: 7,
      weather: `Temp ${game.temp_f}F, wind ${game.wind_mph}mph, ${game.roof}`,
      marketLine: game.spread_line,
      marketImpliedProbability: game.market_implied_p,
      outcome: game.home_team,
      decisionTimestamp: "2026-10-01T00:00:00.000Z",
      decisionWindowMs: 86400000,
      altitudeFt: isDenver ? 5280 : 0,
      windSpeedMph: game.wind_mph,
      temperatureF: game.temp_f,
    };

    const corpusEval = evaluateFullCorpus(ctx);
    const pBase = game.market_implied_p;
    const y = game.home_win;

    // Baseline metric
    baselineBrierSum += Math.pow(pBase - y, 2);
    baselineLogLossSum += -(y * Math.log(Math.max(1e-6, pBase)) + (1 - y) * Math.log(Math.max(1e-6, 1 - pBase)));

    // Challenger metric: baseline shifted by testedWeight * situationalAdjustment
    const pChallenger = Math.max(1e-4, Math.min(1 - 1e-4, pBase + testedWeight * corpusEval.situationalAdjustment));
    challengerBrierSum += Math.pow(pChallenger - y, 2);
    challengerLogLossSum += -(y * Math.log(pChallenger) + (1 - y) * Math.log(1 - pChallenger));
  }

  const n = preWeek6Games.length;
  const baselineBrier = baselineBrierSum / n;
  const challengerBrier = challengerBrierSum / n;
  const baselineLogLoss = baselineLogLossSum / n;
  const challengerLogLoss = challengerLogLossSum / n;
  const deltaBrier = challengerBrier - baselineBrier;
  const deltaLogLoss = challengerLogLoss - baselineLogLoss;

  // Promotion Gate Check per MODEL_PROMOTION_GATE_CONTRACT.md:
  // Requires:
  //  1. n >= 500 settled paired events (or n >= 100 for sub-markets)
  //  2. deltaBrier <= -0.002 (at least 0.002 Brier improvement over baseline)
  let promotionGatePassed = false;
  let gateReason = "";

  if (n < 500) {
    gateReason = `Sample size N=${n} is below frozen promotion gate threshold (nMin=500). Pursuant to standing doctrine, weight must remain 0.0.`;
  } else if (deltaBrier > -0.002) {
    gateReason = `Delta Brier (${deltaBrier > 0 ? "+" : ""}${deltaBrier.toFixed(6)}) does not beat the required deltaPrac improvement floor (-0.002). Weight remains 0.0.`;
  } else {
    promotionGatePassed = true;
    gateReason = `Promotion gate cleared: N=${n} >= 500 and delta Brier = ${deltaBrier.toFixed(6)} <= -0.002.`;
  }

  return {
    sampleSize: n,
    baselineBrier,
    baselineLogLoss,
    challengerBrier,
    challengerLogLoss,
    deltaBrier,
    deltaLogLoss,
    weightTested: testedWeight,
    promotionGatePassed,
    gateReason,
  };
}

// CLI execution
if (import.meta.url.endsWith(process.argv[1] ?? "") || process.argv.includes("--run")) {
  const census = getLoadedCorpusCensus();
  console.log(`========================================================================`);
  console.log(`   FULL-CORPUS LITERATURE EVALUATOR: PRE-WEEK-6 2026 BACKTEST REPORT    `);
  console.log(`========================================================================`);
  console.log(`Corpus Loaded From Disk:`);
  console.log(`  Unique Items:   ${census.totalUniqueItems}`);
  console.log(`  Source Files:   ${Object.keys(census.fileCensus).length}`);
  console.log(`  Evaluator Base: CORPUS_EVALUATOR_DEFAULT_WEIGHT = ${CORPUS_EVALUATOR_DEFAULT_WEIGHT}`);
  console.log(`------------------------------------------------------------------------`);

  // Run backtests at various test weights
  const weights = [0.0, 0.05, 0.1, 0.25, 0.5, 1.0];
  console.log(`Evaluating ${weights.length} weight configurations over frozen pre-Week-6 holdout:`);
  console.log(`------------------------------------------------------------------------`);

  for (const w of weights) {
    const res = runPreWeek6Backtest(w);
    console.log(`Weight: ${w.toFixed(2)} | N=${res.sampleSize} games (Weeks 1-5, 2026)`);
    console.log(`  Baseline Brier:   ${res.baselineBrier.toFixed(6)} | Log Loss: ${res.baselineLogLoss.toFixed(6)}`);
    console.log(`  Challenger Brier: ${res.challengerBrier.toFixed(6)} | Log Loss: ${res.challengerLogLoss.toFixed(6)}`);
    console.log(`  Delta Brier:      ${res.deltaBrier >= 0 ? "+" : ""}${res.deltaBrier.toFixed(6)} units`);
    console.log(`  Delta Log Loss:   ${res.deltaLogLoss >= 0 ? "+" : ""}${res.deltaLogLoss.toFixed(6)} units`);
    console.log(`  Gate Status:      ${res.promotionGatePassed ? "PROMOTABLE" : "HOLD (WEIGHT = 0.0)"}`);
    console.log(`  Gate Reason:      ${res.gateReason}`);
    console.log(`------------------------------------------------------------------------`);
  }
}
