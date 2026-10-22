import { describe, it } from "vitest";
import * as assert from "node:assert/strict";
import {
  evaluateFullCorpus,
  getLoadedCorpusCensus,
  CORPUS_EVALUATOR_DEFAULT_WEIGHT,
} from "../corpus-evaluator.js";
import {
  interpretSituation,
  type GameContext,
} from "../situational-engine.js";
import { deriveRankingProbability } from "../../ranking-prob.js";

describe("Corpus Literature Evaluator — Runtime Verification & Integration Suite", () => {
  it("Proof Req 1 & 4: Loads actual corpus artifacts from disk, touches >50 distinct items, and emits numeric features", () => {
    // 1. Load census directly from disk (non-hardcoded)
    const census = getLoadedCorpusCensus();
    console.log(`\n================ CORPUS ARTIFACT CENSUS FROM DISK ================`);
    console.log(`Total unique items discovered: ${census.totalUniqueItems}`);
    console.log(`Total source JSON files loaded: ${Object.keys(census.fileCensus).length}`);
    let totalRawRows = 0;
    for (const [file, count] of Object.entries(census.fileCensus)) {
      totalRawRows += count;
      console.log(`  - ${file}: ${count} rows`);
    }
    console.log(`Total raw artifact rows across files: ${totalRawRows}`);
    console.log(`==================================================================\n`);

    assert.ok(census.totalUniqueItems > 2000, `Expected > 2,000 unique items on disk, found ${census.totalUniqueItems}`);
    assert.ok(totalRawRows > 3000, `Expected > 3,000 raw rows on disk, found ${totalRawRows}`);

    // 2. Synthetic rich game context (Seattle at Denver, high altitude, freezing, wind, short rest, sharp split)
    const syntheticContext: GameContext = {
      homeTeam: "DEN",
      awayTeam: "SEA",
      venue: "Empower Field at Mile High, Denver",
      restDaysHome: 4,
      restDaysAway: 4,
      weather: "Clear, 28F, wind 18mph",
      marketLine: -1.5,
      marketImpliedProbability: 0.525,
      outcome: "DEN",
      decisionTimestamp: "2026-10-15T23:00:00.000Z",
      decisionWindowMs: 86400000,
      altitudeFt: 5280,
      windSpeedMph: 18,
      temperatureF: 28,
      crowdDecibels: 98,
      publicTicketPct: 72,
      publicHandlePct: 51,
      timeZoneShiftHours: 1,
      olContinuityDelta: 0.25,
      coachAggressivenessDelta: 0.4,
      turnoverMarginDelta: -3,
    };

    // 3. Evaluate corpus against synthetic context
    const evalResult = evaluateFullCorpus(syntheticContext, {
      evaluatorWeight: CORPUS_EVALUATOR_DEFAULT_WEIGHT,
    });

    console.log(`Evaluation Summary:`);
    console.log(`  Loaded Count:    ${evalResult.totalLoadedCount}`);
    console.log(`  Evaluated Count: ${evalResult.itemsEvaluatedCount}`);
    console.log(`  Skipped Count:   ${evalResult.itemsSkippedCount}`);
    console.log(`  Coverage %:      ${evalResult.coveragePct.toFixed(2)}%`);
    console.log(`  Situational Adj: ${evalResult.situationalAdjustment.toFixed(6)}`);
    console.log(`  Feature Vector:`, evalResult.featureVector);

    // Assert Proof Req 1: Touches more than 50 distinct corpus items (actually touches >2,000!)
    assert.ok(
      evalResult.itemsEvaluatedCount > 2000,
      `Expected evaluator to touch > 2,000 items, but touched ${evalResult.itemsEvaluatedCount}`,
    );
    assert.ok(
      evalResult.coveragePct > 65.0,
      `Expected genuine sports literature coverage % > 65%, got ${evalResult.coveragePct.toFixed(2)}%`,
    );

    // Assert non-zero feature vector spanning all 24 scientific engines
    const featureKeys = Object.keys(evalResult.featureVector);
    assert.equal(featureKeys.length, 24, `Expected exactly 24 numeric features, got ${featureKeys.length}`);
    const nonZeroFeatures = featureKeys.filter((k) => evalResult.featureVector[k] !== 0);
    assert.ok(
      nonZeroFeatures.length >= 10,
      `Expected at least 10 non-zero features, got ${nonZeroFeatures.length}: ${nonZeroFeatures.join(", ")}`,
    );

    // Assert scalar situational adjustment is non-zero
    assert.notEqual(evalResult.situationalAdjustment, 0, "Situational adjustment must be a non-zero numeric float");
    assert.ok(
      Number.isFinite(evalResult.situationalAdjustment),
      "Situational adjustment must be a finite float",
    );

    // Assert invariant: evaluated + skipped = total
    assert.equal(
      evalResult.itemsEvaluatedCount + evalResult.itemsSkippedCount,
      evalResult.totalLoadedCount,
      "Sum of evaluated and skipped items must exactly equal total loaded items",
    );

    // Audit logs validation: every item has explicit reason
    const sampleEvaluated = evalResult.itemLogs.find((l) => l.evaluated);
    assert.ok(sampleEvaluated, "Must have evaluated items logged");
    assert.ok(
      sampleEvaluated.reason.includes("Evaluated paper equation"),
      "Evaluated reason must cite paper equation and parameters",
    );
    assert.ok(typeof sampleEvaluated.contribution === "number", "Evaluated item must have numeric contribution");

    const sampleSkipped = evalResult.itemLogs.find((l) => !l.evaluated);
    assert.ok(sampleSkipped, "Must have skipped items logged");
    assert.ok(
      sampleSkipped.reason.length > 20,
      "Skipped item reason must explain non-sports acronym collision or theoretical classification",
    );
  });

  it("Proof Req 2: Integration test — Situational trace changes when evaluator is enabled vs disabled on a fixture", () => {
    const fixtureContext: GameContext = {
      homeTeam: "DEN",
      awayTeam: "SEA",
      venue: "Empower Field at Mile High, Denver",
      restDaysHome: 4,
      restDaysAway: 4,
      weather: "Clear, 28F, wind 18mph",
      marketLine: -1.5,
      marketImpliedProbability: 0.525,
      outcome: "DEN",
      decisionTimestamp: "2026-10-15T23:00:00.000Z",
      decisionWindowMs: 86400000,
      altitudeFt: 5280,
      windSpeedMph: 18,
      temperatureF: 28,
      crowdDecibels: 98,
      publicTicketPct: 72,
      publicHandlePct: 51,
      olContinuityDelta: 0.25,
      turnoverMarginDelta: -3,
    };

    // State A: Evaluator Disabled (weight = 0.0)
    const resultDisabled = interpretSituation(fixtureContext, [], [], { corpusEvaluatorWeight: 0.0 });
    assert.ok(resultDisabled.ok, "interpretSituation should succeed with weight 0.0");
    assert.equal(resultDisabled.data.corpusSituationalShift, 0, "Shift must be exactly 0.0 when weight is 0.0");
    assert.ok(
      resultDisabled.data.reasoningTrace.includes("Net shift: 0.000000 (weight 0)"),
      "Trace must log weight 0 shift",
    );

    // State B: Evaluator Enabled (weight = 1.0)
    const resultEnabled = interpretSituation(fixtureContext, [], [], { corpusEvaluatorWeight: 1.0 });
    assert.ok(resultEnabled.ok, "interpretSituation should succeed with weight 1.0");
    assert.notEqual(resultEnabled.data.corpusSituationalShift, 0, "Shift must be non-zero when weight is 1.0");
    assert.equal(
      resultEnabled.data.corpusSituationalShift,
      resultEnabled.data.corpusEvaluation.situationalAdjustment,
      "Shift must equal situationalAdjustment when weight is 1.0",
    );

    // Assert trace delta
    assert.notEqual(
      resultDisabled.data.reasoningTrace,
      resultEnabled.data.reasoningTrace,
      "Reasoning trace MUST change when corpus evaluator is enabled vs disabled",
    );
    assert.ok(
      resultEnabled.data.reasoningTrace.includes(`Net shift: ${resultEnabled.data.corpusSituationalShift.toFixed(6)} (weight 1)`),
      "Trace must reflect active non-zero corpus shift",
    );
  });

  it("Proof Req 2 (Part B): Integration test — Ranking probability and ranking score change when corpus adjustment is enabled", () => {
    const confidence = 65;
    const independentEdge = {
      modelProb: 0.58,
      marketProb: 0.52,
      rawEdge: 0.06,
      shrunkEdge: 0.045,
      edgeScore: 0.045,
      kellyFraction: 0.03,
      fairOdds: -138,
      decision: "SPEAK" as const,
      modelPricesBetter: true,
      passesHurdle: true,
      passesDisplayFloor: true,
      uncertaintyPenalty: 0,
      sources: ["elo" as const],
      trueProb: 0.58,
    };

    // Baseline ranking (corpusWeight = 0.0)
    const baseline = deriveRankingProbability(confidence, independentEdge, {
      corpusWeight: 0.0,
      corpusAdjustment: 0.05,
    });

    // Active ranking (corpusWeight = 1.0, positive shift +0.05)
    const withPositiveShift = deriveRankingProbability(confidence, independentEdge, {
      corpusWeight: 1.0,
      corpusAdjustment: 0.05,
    });

    // Active ranking (corpusWeight = 1.0, negative shift -0.05)
    const withNegativeShift = deriveRankingProbability(confidence, independentEdge, {
      corpusWeight: 1.0,
      corpusAdjustment: -0.05,
    });

    console.log(`Ranking Score Delta:`);
    console.log(`  Baseline:        ${baseline.rankingScore} (p = ${baseline.rankingP.toFixed(4)})`);
    console.log(`  Positive Shift:  ${withPositiveShift.rankingScore} (p = ${withPositiveShift.rankingP.toFixed(4)})`);
    console.log(`  Negative Shift:  ${withNegativeShift.rankingScore} (p = ${withNegativeShift.rankingP.toFixed(4)})`);

    assert.notEqual(withPositiveShift.rankingP, baseline.rankingP, "Positive corpus adjustment must change rankingP");
    assert.ok(withPositiveShift.rankingP > baseline.rankingP, "Positive corpus adjustment must increase rankingP");
    assert.ok(withNegativeShift.rankingP < baseline.rankingP, "Negative corpus adjustment must decrease rankingP");
    assert.notEqual(withPositiveShift.rankingScore, baseline.rankingScore, "Ranking score must change when corpus adjustment is applied");
  });

  it("Proof Req 5: Premise Registry invocation (GAP-18) — Voronoi pocket control, Kelly uncertainty, and multi-book consensus models are evaluated", () => {
    const fixtureContext: GameContext = {
      homeTeam: "KC",
      awayTeam: "BAL",
      venue: "Arrowhead Stadium",
      restDaysHome: 7,
      restDaysAway: 7,
      weather: "Clear, 72F",
      marketLine: -3.0,
      marketImpliedProbability: 0.585,
      outcome: "KC",
      decisionTimestamp: "2026-10-18T17:00:00.000Z",
      decisionWindowMs: 86400000,
      olContinuityDelta: 0.35,
      dlContinuityDelta: -0.15,
    };

    const evalResult = evaluateFullCorpus(fixtureContext);
    assert.ok(evalResult.registeredPremises, "CorpusEvaluation must include registeredPremises");
    
    // 1. Voronoi Pocket Control
    const { voronoiPocket } = evalResult.registeredPremises;
    assert.ok(voronoiPocket.pocketIntegrityRadiusYards > 0, "Pocket integrity radius must be positive");
    assert.ok(voronoiPocket.trenchControlScore >= 0 && voronoiPocket.trenchControlScore <= 1, "Trench control score in [0, 1]");

    // 2. Kelly Uncertainty
    const { kellyResult } = evalResult.registeredPremises;
    assert.ok(typeof kellyResult.unconstrainedKelly === "number", "Unconstrained Kelly must be numeric");
    assert.ok(kellyResult.optimalStakeFraction >= 0, "Optimal stake fraction must be non-negative");

    // 3. Multi-Book Consensus
    const { consensusResult } = evalResult.registeredPremises;
    assert.ok(consensusResult.fairProbability > 0 && consensusResult.fairProbability < 1, "Consensus fair probability in (0, 1)");
    assert.ok(consensusResult.consensusEntropy > 0, "Consensus entropy must be positive");
  });
});
