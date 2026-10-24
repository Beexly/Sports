import {
  evaluateMindReasoning,
  loadVerifiedMindCorpus,
  evaluateMindPrinciples,
  mapGameContextToVector,
  type VerifiedSituationalPrinciple,
} from "../packages/prediction-engine/src/reasoning/mind-reasoning.js";
import type { GameContext } from "../packages/prediction-engine/src/reasoning/situational-engine.js";

const fullCorpus = loadVerifiedMindCorpus();
console.log("Loaded corpus size:", fullCorpus.length);

// Diagnostic 1: Rest differential in SCENARIO-06 (Circadian)
const ctxCircadian: GameContext = {
  homeTeam: "BAL",
  awayTeam: "LAC",
  venue: "M&T Bank Stadium, Baltimore",
  restDaysHome: 7,
  restDaysAway: 7,
  weather: "Clear, 58F, wind 7mph",
  marketLine: -3.5,
  marketImpliedProbability: 0.605,
  outcome: "BAL",
  decisionTimestamp: "2026-10-18T17:00:00.000Z",
  decisionWindowMs: 86400000,
  timeZoneShiftHours: 3,
};
const vecCircadian = mapGameContextToVector(ctxCircadian);
console.log("vecCircadian:", vecCircadian);
const evalCircadian = evaluateMindPrinciples(vecCircadian, fullCorpus);
console.log("evalCircadian adjustments:", evalCircadian.adjustments);

// Diagnostic 2: Acoustic SCENARIO-07
const ctxAcoustic: GameContext = {
  homeTeam: "NO",
  awayTeam: "ATL",
  venue: "Caesars Superdome, New Orleans",
  restDaysHome: 7,
  restDaysAway: 7,
  weather: "Dome, 72F",
  marketLine: -2.0,
  marketImpliedProbability: 0.545,
  outcome: "NO",
  decisionTimestamp: "2026-10-18T17:00:00.000Z",
  decisionWindowMs: 86400000,
  crowdDecibels: 102,
};
const prodAcoustic = evaluateMindReasoning(ctxAcoustic);
console.log("prodAcoustic citations:", prodAcoustic.situationalPick.mindCitations.map(c => ({
  id: c.item_id,
  principle: c.principle_or_feature,
  quote: c.evidence_quote,
  matchedContext: c.matchedContext,
  delta: c.numericDelta,
})));

// Diagnostic 3: Workload / ACWR SCENARIO-08
const ctxWorkload: GameContext = {
  homeTeam: "PIT",
  awayTeam: "CIN",
  venue: "Acrisure Stadium, Pittsburgh",
  restDaysHome: 6,
  restDaysAway: 7,
  weather: "Overcast, 48F, wind 11mph",
  marketLine: -1.0,
  marketImpliedProbability: 0.515,
  outcome: "PIT",
  decisionTimestamp: "2026-10-25T17:00:00.000Z",
  decisionWindowMs: 86400000,
  turnoverMarginDelta: -4,
};
const vecWorkload = mapGameContextToVector(ctxWorkload);
console.log("vecWorkload:", vecWorkload);

// Diagnostic 4: Opposing claims SCENARIO-09
const ctxDeadband: GameContext = {
  homeTeam: "CHI",
  awayTeam: "MIN",
  venue: "Soldier Field, Chicago",
  restDaysHome: 7,
  restDaysAway: 7,
  weather: "Breezy, 52F, wind 12mph",
  marketLine: 1.5,
  marketImpliedProbability: 0.465,
  outcome: "MIN",
  decisionTimestamp: "2026-11-01T18:00:00.000Z",
  decisionWindowMs: 86400000,
};
const vecDeadband = mapGameContextToVector(ctxDeadband);
console.log("vecDeadband:", vecDeadband);

// Diagnostic 5: Conditional threshold SCENARIO-11
const ctxCold: GameContext = {
  homeTeam: "GB",
  awayTeam: "CHI",
  venue: "Lambeau Field, Green Bay",
  restDaysHome: 7,
  restDaysAway: 7,
  weather: "Snow flurries, 16F, wind 15mph",
  marketLine: -4.0,
  marketImpliedProbability: 0.620,
  outcome: "GB",
  decisionTimestamp: "2026-12-06T18:00:00.000Z",
  decisionWindowMs: 86400000,
  temperatureF: 16,
  windSpeedMph: 15,
};
const vecCold = mapGameContextToVector(ctxCold);
console.log("vecCold:", vecCold);
const evalCold = evaluateMindPrinciples(vecCold, fullCorpus);
console.log("evalCold adjustments:", evalCold.adjustments);

// Diagnostic 6: Fourth-Down SCENARIO-12
const ctxFourth: GameContext = {
  homeTeam: "DET",
  awayTeam: "GB",
  venue: "Ford Field, Detroit",
  restDaysHome: 7,
  restDaysAway: 7,
  weather: "Dome, 72F",
  marketLine: -2.5,
  marketImpliedProbability: 0.565,
  outcome: "DET",
  decisionTimestamp: "2026-11-26T17:30:00.000Z",
  decisionWindowMs: 86400000,
  coachAggressivenessDelta: 0.40,
};
const vecFourth = mapGameContextToVector(ctxFourth);
console.log("vecFourth:", vecFourth);
const prodFourth = evaluateMindReasoning(ctxFourth);
console.log("prodFourth citations:", prodFourth.situationalPick.mindCitations.map(c => ({
  id: c.item_id,
  principle: c.principle_or_feature,
  quote: c.evidence_quote,
  matchedContext: c.matchedContext,
  delta: c.numericDelta,
})));
