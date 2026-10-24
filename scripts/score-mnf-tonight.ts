import { scoreGame } from "../packages/prediction-engine/src/scoring.js";
import { computeGseActionScore } from "../packages/prediction-engine/src/gse-score/gse-action-score.js";
import type { OddsInput } from "@sports/types";

console.log("=== RUNNING GALAXY SPORTS EDGE PREDICTION ENGINE FOR MNF ===");

// 1. Bookmaker odds for Falcons at Saints
const oddsInput: OddsInput = {
  sport: "americanfootball_nfl",
  gameId: "401872979",
  homeTeam: "New Orleans Saints",
  awayTeam: "Atlanta Falcons",
  commenceTime: "2026-10-06T00:15:00.000Z",
  bookmakerOdds: [
    // DraftKings
    { bookmaker: "draftkings", market: "SPREAD", homeSpread: -1.5, homeSpreadPrice: -108, awaySpread: 1.5, awaySpreadPrice: -112 },
    { bookmaker: "draftkings", market: "H2H", homePrice: -120, awayPrice: 100 },
    { bookmaker: "draftkings", market: "TOTALS", totalOverUnder: 47.5, overPrice: -112, underPrice: -108 },
    // FanDuel
    { bookmaker: "fanduel", market: "SPREAD", homeSpread: -1.5, homeSpreadPrice: -110, awaySpread: 1.5, awaySpreadPrice: -110 },
    { bookmaker: "fanduel", market: "H2H", homePrice: -118, awayPrice: 100 },
    { bookmaker: "fanduel", market: "TOTALS", totalOverUnder: 47.5, overPrice: -110, underPrice: -110 },
    // BetMGM
    { bookmaker: "betmgm", market: "SPREAD", homeSpread: -1.5, homeSpreadPrice: -110, awaySpread: 1.5, awaySpreadPrice: -110 },
    { bookmaker: "betmgm", market: "H2H", homePrice: -125, awayPrice: 105 },
    { bookmaker: "betmgm", market: "TOTALS", totalOverUnder: 47.5, overPrice: -110, underPrice: -110 },
    // Fanatics
    { bookmaker: "fanatics", market: "SPREAD", homeSpread: -1.5, homeSpreadPrice: -110, awaySpread: 1.5, awaySpreadPrice: -110 },
    { bookmaker: "fanatics", market: "H2H", homePrice: -125, awayPrice: 105 },
    { bookmaker: "fanatics", market: "TOTALS", totalOverUnder: 47.5, overPrice: -110, underPrice: -110 },
  ],
  context: {
    spreadOpeningLine: -2.5,
    totalOpeningLine: 45.5,
    homeRestDays: 7,
    awayRestDays: 7,
    homeAtsForm: { coverCount: 1, gameCount: 3, pushCount: 0 },
    awayAtsForm: { coverCount: 1, gameCount: 3, pushCount: 0 },
    isDivisional: true,
  }
};

const picks = scoreGame(oddsInput);
console.log(`\n--- ENGINE GENERATED ${picks.length} SCORED PICKS ---`);
for (const p of picks) {
  console.log(`\nMarket: ${p.market}`);
  console.log(`Selection: ${p.selection}`);
  console.log(`Line: ${p.line ?? 'N/A'} @ ${p.price ?? 'N/A'}`);
  console.log(`Edge Score: ${p.edgeScore.toFixed(2)} | Edge Index: ${p.edgeIndex}`);
  console.log(`Tier: ${p.tier} | Grade: ${p.grade} | Risk: ${p.riskLevel}`);
  console.log(`Confidence: ${p.confidence.toFixed(1)}%`);
  console.log(`Fair Value: ${p.fairValueProbability.toFixed(3)} | Implied: ${p.impliedProbability.toFixed(3)}`);
  if (p.independentEdge) {
    console.log(`Independent Edge: ${p.independentEdge.verdict} | Shin Edge: ${(p.independentEdge.shinEdge * 100).toFixed(2)}%`);
  }
}

// 2. Run GSE Action Score
console.log("\n--- RUNNING GSE ACTION SCORE CONTRACTS ---");
const actionResult = computeGseActionScore({
  marketProbability: 0.52, // Falcons +1.5 market prob
  modelParliament: {
    votes: [
      { modelId: "elo-shadow", probability: 0.54, confidence: 0.85, evidenceWeight: 1 },
      { modelId: "market-reconcile-shadow", probability: 0.55, confidence: 0.88, evidenceWeight: 1 },
      { modelId: "injury-trench-differential", probability: 0.58, confidence: 0.82, evidenceWeight: 1.2 }
    ]
  },
  featureContract: {
    features: [
      { key: "market_fair_probability", value: 0.52, quality: 0.98, required: true, ageMinutes: 5 },
      { key: "injury_differential_score", value: 0.72, quality: 0.95, required: true, ageMinutes: 10 },
      { key: "qb_stability_score", value: 0.85, quality: 0.90, required: true, ageMinutes: 15 },
      { key: "source_freshness_score", value: 0.95, quality: 0.95, ageMinutes: 5 }
    ],
    maxAgeMinutes: 60
  },
  calibration: {
    baselineBrierScore: 0.23,
    brierScore: 0.21,
    driftScore: 0.015,
    expectedCalibrationError: 0.022,
    sampleCount: 650
  }
});

console.log(`Action Score: ${actionResult.score.toFixed(1)}/100`);
console.log(`Decision: ${actionResult.decision}`);
console.log(`Confidence: ${actionResult.confidenceScore.toFixed(1)}%`);
console.log(`Probability Edge: ${(actionResult.probabilityEdge * 100).toFixed(2)}%`);
console.log(`No-Bet Strength: ${actionResult.noBetStrength.toFixed(2)}`);
console.log(`Drivers:`, actionResult.drivers);
