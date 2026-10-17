import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  evaluateMindReasoning,
  loadMindCorpus,
  type MindRecord,
} from "../mind-reasoning.js";
import {
  interpretSituation,
  type GameContext,
} from "../situational-engine.js";

describe("Autonomous Mind Reasoning & Generation Suite", () => {
  it("Requirement 1: Absorbed Mind Corpus contains >= 3,000 structured literature records", () => {
    const records = loadMindCorpus();
    console.log(`\n================ MIND CORPUS ARTIFACT AUDIT ================`);
    console.log(`Total Mind Records Loaded: ${records.length}`);
    assert.ok(records.length >= 3000, `Expected >= 3,000 mind records, found ${records.length}`);

    // Verify schema integrity on random sample
    for (let i = 0; i < 50; i++) {
      const idx = Math.floor(Math.random() * records.length);
      const rec = records[idx];
      assert.ok(rec.item_id && typeof rec.item_id === "string", `Row ${idx} missing item_id`);
      assert.ok(rec.source && typeof rec.source === "string", `Row ${idx} missing source`);
      assert.ok(rec.principle_or_feature && typeof rec.principle_or_feature === "string", `Row ${idx} missing principle_or_feature`);
      assert.ok(rec.evidence_quote && typeof rec.evidence_quote === "string", `Row ${idx} missing evidence_quote`);
      assert.ok(Array.isArray(rec.applicable_contexts) && rec.applicable_contexts.length > 0, `Row ${idx} missing applicable_contexts`);
      assert.ok(rec.how_it_influences_reasoning && typeof rec.how_it_influences_reasoning === "string", `Row ${idx} missing how_it_influences_reasoning`);
    }
    console.log(`Schema validation passed on 50 sample rows.`);
    console.log(`============================================================\n`);
  });

  it("Requirement 2: Engine autonomously generates Pick, Parlay, and Fantasy/DFS from Mind Principles", () => {
    const seaAtDenCtx: GameContext = {
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

    const res = evaluateMindReasoning(seaAtDenCtx);

    console.log(`\n================ AUTONOMOUS MIND REASONING OUTPUTS ================`);
    console.log(`Matchup: ${seaAtDenCtx.awayTeam} at ${seaAtDenCtx.homeTeam}`);
    console.log(`Applicable Principles Matched: ${res.applicablePrinciples.length}`);
    console.log(`Net Situational Adjustment: ${(res.netSituationalAdjustment * 100).toFixed(2)}%`);

    // 1. Situational Pick Verification
    console.log(`\n--- [1] SITUATIONAL PICK / LEAN ---`);
    console.log(`Selection:   ${res.situationalPick.selection}`);
    console.log(`Conviction:  ${res.situationalPick.conviction}`);
    console.log(`Fair Prob:   ${(res.situationalPick.modelFairProbability * 100).toFixed(2)}%`);
    console.log(`Market Prob: ${(res.situationalPick.marketImpliedProbability * 100).toFixed(2)}%`);
    console.log(`Edge:        ${(res.situationalPick.rawEdge * 100).toFixed(2)}%`);
    console.log(`Citations:   ${res.situationalPick.mindCitations.length} primary principles cited:`);
    for (const c of res.situationalPick.mindCitations) {
      console.log(`  * [${c.item_id}] ${c.principle_or_feature} -> "${c.evidence_quote}"`);
    }

    assert.ok(res.situationalPick.selection.length > 0, "Pick selection must not be empty");
    assert.ok(res.situationalPick.modelFairProbability > 0 && res.situationalPick.modelFairProbability < 1, "Fair probability must be valid");
    assert.ok(res.situationalPick.mindCitations.length > 0, "Must cite mind principles");

    // 2. Same-Game Parlay Verification
    console.log(`\n--- [2] CORRELATED SAME-GAME PARLAY (SGP) ---`);
    console.log(`Name:        ${res.sameGameParlay.name}`);
    console.log(`Estimated Fair Odds: +${res.sameGameParlay.estimatedFairOdds} vs Retail: +${res.sameGameParlay.retailIndependentOdds}`);
    console.log(`Correlation Edge:    +${res.sameGameParlay.correlationAdvantagePct}%`);
    console.log(`Legs:`);
    for (const leg of res.sameGameParlay.legs) {
      console.log(`  - [${leg.marketType}] ${leg.selection}: ${leg.correlationRationale}`);
    }

    assert.ok(res.sameGameParlay.legs.length >= 3, "SGP must have at least 3 correlated legs");
    assert.ok(res.sameGameParlay.correlationAdvantagePct > 0, "SGP must have positive correlation advantage");
    assert.ok(res.sameGameParlay.mindCitations.length > 0, "SGP must cite copula / correlation principles");

    // 3. Fantasy & DFS Advice Verification
    console.log(`\n--- [3] FANTASY & DFS SITUATIONAL ADVICE ---`);
    console.log(`Cash Strategy: ${res.fantasyDfsAdvice.cashGameStrategy}`);
    console.log(`GPP Strategy:  ${res.fantasyDfsAdvice.tournamentGppStrategy}`);
    console.log(`Targets:`);
    for (const tgt of res.fantasyDfsAdvice.targets) {
      console.log(`  - [${tgt.action}] ${tgt.playerOrUnit} (${tgt.team}): ${tgt.reasoning}`);
    }

    assert.ok(res.fantasyDfsAdvice.targets.length >= 3, "Must produce target recommendations");
    assert.ok(res.fantasyDfsAdvice.mindCitations.length > 0, "Must cite tracking/trench/workload principles");

    // 4. Reasoning Trace Verification
    console.log(`\n--- [4] MASTER CITED REASONING TRACE ---`);
    console.log(res.reasoningTrace);
    console.log(`===================================================================\n`);

    assert.ok(res.reasoningTrace.includes("MIND KNOWLEDGE ACTIVATION"), "Trace must indicate mind activation");
    assert.ok(res.reasoningTrace.includes(res.situationalPick.selection), "Trace must include pick selection");
    assert.ok(res.reasoningTrace.includes(res.sameGameParlay.name), "Trace must include SGP name");
  });

  it("Requirement 3 (Exit Criterion): Changing the Mind Artifact changes the Reasoning Trace and Generated Outputs", () => {
    const seaAtDenCtx: GameContext = {
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

    // Run A: Original full mind corpus
    const fullCorpus = loadMindCorpus();
    const resultFull = evaluateMindReasoning(seaAtDenCtx, fullCorpus);

    // Run B: Mutated mind corpus where altitude, trench, steam, and copula principles are removed/suppressed
    const mutatedCorpus: MindRecord[] = fullCorpus.filter(r => {
      const contexts = r.applicable_contexts || [];
      return !contexts.some(c => [
        "altitude",
        "mile_high",
        "oxygen_saturation",
        "ol_continuity",
        "trench",
        "pass_rush",
        "sgp",
        "copula",
        "steam",
        "line_movement",
        "ticket_handle_split",
      ].includes(c));
    });

    const resultMutated = evaluateMindReasoning(seaAtDenCtx, mutatedCorpus);

    console.log(`\n================ MIND MUTATION DIFFERENTIAL AUDIT ================`);
    console.log(`Full Mind Applicable Matches:    ${resultFull.applicablePrinciples.length}`);
    console.log(`Mutated Mind Applicable Matches: ${resultMutated.applicablePrinciples.length}`);
    console.log(`Full Mind Fair Probability:      ${(resultFull.situationalPick.modelFairProbability * 100).toFixed(4)}%`);
    console.log(`Mutated Mind Fair Probability:   ${(resultMutated.situationalPick.modelFairProbability * 100).toFixed(4)}%`);
    console.log(`Full Mind Top Citation ID:       ${resultFull.situationalPick.mindCitations[0]?.item_id}`);
    console.log(`Mutated Mind Top Citation ID:    ${resultMutated.situationalPick.mindCitations[0]?.item_id}`);
    console.log(`==================================================================\n`);

    // Strict exit criterion assertions:
    // 1. Matches count must differ
    assert.notEqual(
      resultFull.applicablePrinciples.length,
      resultMutated.applicablePrinciples.length,
      "Mutating mind corpus must change applicable principle matches count",
    );

    // 2. Fair probability must change
    assert.notEqual(
      resultFull.situationalPick.modelFairProbability,
      resultMutated.situationalPick.modelFairProbability,
      "Mutating mind corpus must change situational pick fair probability",
    );

    // 3. Citations must change
    assert.notEqual(
      resultFull.situationalPick.mindCitations[0]?.item_id,
      resultMutated.situationalPick.mindCitations[0]?.item_id,
      "Mutating mind corpus must change primary cited item_id",
    );

    // 4. SGP rationale must change
    assert.notEqual(
      resultFull.sameGameParlay.rationale,
      resultMutated.sameGameParlay.rationale,
      "Mutating mind corpus must change SGP rationale",
    );

    // 5. Reasoning trace must change
    assert.notEqual(
      resultFull.reasoningTrace,
      resultMutated.reasoningTrace,
      "Mutating mind corpus must change master reasoning trace",
    );
  });

  it("Requirement 4: Full integration into interpretSituation connects Mind Evaluation to Layer 2 reading", () => {
    const seaAtDenCtx: GameContext = {
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

    const reading = interpretSituation(seaAtDenCtx, []);
    assert.ok(reading.ok, "interpretSituation should return ok");
    if (!reading.ok) return;

    assert.ok(reading.data.mindEvaluation, "SituationalReading must contain mindEvaluation");
    assert.ok(reading.data.mindEvaluation.applicablePrinciples.length > 0, "Mind evaluation must have matched principles");
    assert.ok(reading.data.mindEvaluation.situationalPick.selection.length > 0, "Mind evaluation must have a pick");
    assert.ok(reading.data.mindEvaluation.sameGameParlay.legs.length >= 3, "Mind evaluation must have SGP");
    assert.ok(reading.data.mindEvaluation.fantasyDfsAdvice.targets.length >= 3, "Mind evaluation must have DFS targets");
    assert.ok(reading.data.reasoningTrace.includes("Mind Reasoning:"), "Reasoning trace must include Mind Reasoning summary");
  });
});
