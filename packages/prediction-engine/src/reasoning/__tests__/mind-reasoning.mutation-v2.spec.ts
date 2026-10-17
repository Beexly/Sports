import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  evaluateMindPrinciples,
  verifyCandidateExtraction,
  verifyCandidateWithMechanismGate,
  type VerifiedSituationalPrinciple,
  type GameContextVector,
} from "../mind-reasoning.js";

describe("Mutation Test 2.0: Falsification Suite for Content-Driven Inference", () => {
  it("Probe T1: In-Quote Numeric Perturbation (Pure proportionality to numeric_claim at fixed match count)", () => {
    const verifiedRow024: VerifiedSituationalPrinciple = {
      item_id: "arXiv:1710.06551",
      source_doc_hash: "hash_024",
      principle_name: "Sharp Steam Information Flow",
      numeric_claim: "0.024",
      parsed_float_magnitude: 0.024,
      unit_scale_denominator: 0.5,
      evidence_quote: "rapid line movements exceeding 0.024 points per hour reflect syndicate information entry",
      evidence_span: { start_char: 0, end_char: 88, verification_tier: "MSVH_S1_EXACT" },
      mechanism_quote: "syndicate steam captures closing line value before sportsbooks adjust opening numbers",
      mechanism_span: { start_char: 89, end_char: 174, verification_tier: "MSVH_S1_EXACT" },
      applicable_context_fields: ["market_steam_velocity_pts_hr"],
      influence_direction: "positive",
      conditional_threshold: null,
      parsed_threshold_value: null,
      parsed_threshold_operator: null,
      claim_type: "causal",
      influence_description: "Elevates expected win margin when line moves rapidly in favored direction.",
    };

    const verifiedRow048: VerifiedSituationalPrinciple = {
      ...verifiedRow024,
      numeric_claim: "0.048",
      parsed_float_magnitude: 0.048,
      evidence_quote: "rapid line movements exceeding 0.048 points per hour reflect syndicate information entry",
    };

    const context: GameContextVector = { market_steam_velocity_pts_hr: 1.0 };

    const baseResult = evaluateMindPrinciples(context, [verifiedRow024]);
    const mutatedResult = evaluateMindPrinciples(context, [verifiedRow048]);

    // Invariant match count (1 === 1)
    assert.equal(mutatedResult.audit_trail.length, baseResult.audit_trail.length);
    assert.equal(mutatedResult.audit_trail.length, 1);

    // Delta scales by exactly 2.0x
    const ratio = mutatedResult.total_delta / baseResult.total_delta;
    assert.ok(Math.abs(ratio - 2.0) < 1e-6, `Expected delta ratio 2.0, got ${ratio}`);

    // Prose displays mutated number and drops legacy
    assert.ok(mutatedResult.rendered_prose.includes("0.048"), "Rendered prose must contain '0.048'");
    assert.ok(!mutatedResult.rendered_prose.includes("0.024"), "Rendered prose must not contain legacy '0.024'");
  });

  it("Probe T2: Fabricated Claim Injection (Deterministic L1/L2/L3 gate rejection)", () => {
    const rawAbstract = "Wind speeds above 15 mph alter trajectory and reduce deep passing completion rate by 15 percent.";

    // Candidate where quote is real, but claimed number 0.035 is fabricated and absent from quote
    const fabricatedClaimCandidate = {
      evidence_quote: "Wind speeds above 15 mph alter trajectory and reduce deep passing completion rate by 15 percent.",
      mechanism_quote: "Wind speeds above 15 mph alter trajectory",
      numeric_claim: "0.035",
      applicable_context_fields: ["wind_speed_mph"],
    };

    const t2Disposition = verifyCandidateExtraction(rawAbstract, fabricatedClaimCandidate);
    assert.equal(t2Disposition.admitted, false, "Fabricated claim must not be admitted");
    assert.ok(
      ["L1_QUOTE_PROVENANCE_FAIL", "L2_NUMERIC_CONTAINMENT_FAIL", "L3_SAV_OFFSET_FAIL"].includes(
        t2Disposition.rejection_code as string,
      ),
      `Expected L1/L2/L3 rejection code, got ${t2Disposition.rejection_code}`,
    );
  });

  it("Probe T3: Cross-Domain Label & Context Swap (L4 mechanism entailment rejection)", async () => {
    const nflOptimizationAbstract = "In mathematical optimization, the No Free Lunch theorem states that an elevated performance of 1.0 over one class of objective functions is offset over all problems.";

    // Swapping optimization theory under a football betting label
    const swappedLabelCandidate = {
      principle_name: "Reverse Line Movement Divergence",
      evidence_quote: "an elevated performance of 1.0 over one class of objective functions is offset over all problems.",
      mechanism_quote: "the No Free Lunch theorem states that an elevated performance of 1.0 over one class of objective functions is offset",
      numeric_claim: "1.0",
      applicable_context_fields: ["reverse_line_movement_divergence_pct"],
    };

    const t3Disposition = await verifyCandidateWithMechanismGate(nflOptimizationAbstract, swappedLabelCandidate);
    assert.equal(t3Disposition.admitted, false, "Cross-domain swap must be rejected by L4 gate");
    assert.equal(t3Disposition.rejection_code, "L4_MECHANISM_ENTAILMENT_FAIL");
  });

  it("Probe T4: Corpus Artifact Removal (Zero-literature baseline disappearance)", () => {
    const fullActiveGameContext: GameContextVector = {
      altitude_feet: 5280,
      wind_speed_mph: 18,
      ambient_temp_fahrenheit: 28,
      acoustic_crowd_spl_db: 98,
      market_steam_velocity_pts_hr: 0.75,
      reverse_line_movement_divergence_pct: 21.0,
      rest_differential_days: 0,
      ol_continuity_shared_snaps_pct: 85.0,
    };

    const emptyCorpusResult = evaluateMindPrinciples(fullActiveGameContext, []);

    assert.equal(emptyCorpusResult.total_delta, 0, "Empty corpus must yield 0 total delta");
    assert.equal(emptyCorpusResult.audit_trail.length, 0, "Empty corpus must yield 0 audit records");
    assert.equal(emptyCorpusResult.rendered_prose, "", "Empty corpus must yield empty prose");
    assert.ok(
      !/\+395|\+485|18\.5%/.test(JSON.stringify(emptyCorpusResult)),
      "Must not contain hardcoded SGP fair odds or correlation percentages",
    );
  });

  it("Probe T5: Full Mind Corpus Ingestion & Deadband Conflict Resolution Audit (>= 3,000 Verified Principles)", () => {
    const { loadVerifiedMindCorpus } = require("../mind-reasoning.js");
    const corpus = loadVerifiedMindCorpus();

    assert.ok(corpus.length >= 3000, `Expected >= 3,000 verified principles, got ${corpus.length}`);

    const context: GameContextVector = {
      altitude_feet: 5280,
      wind_speed_mph: 18,
      ambient_temp_fahrenheit: 28,
      acoustic_crowd_spl_db: 98,
      market_steam_velocity_pts_hr: 0.75,
      reverse_line_movement_divergence_pct: 21.0,
      rest_differential_days: 0,
      ol_continuity_shared_snaps_pct: 85.0,
    };

    const res = evaluateMindPrinciples(context, corpus);

    assert.ok(res.audit_trail.length > 50, `Expected > 50 audit records, got ${res.audit_trail.length}`);
    assert.ok(res.adjustments.length > 0, "Must have adjustments for active context primitives");

    // Assert that applied adjustments have consensus_ratio >= 0.20 and non-zero final delta
    const applied = res.adjustments.filter(a => a.resolution_status === "APPLIED");
    assert.ok(applied.length > 0, "Must have applied adjustments for consensual features");
    for (const a of applied) {
      assert.ok(a.consensus_ratio >= 0.20, `Applied adjustment ${a.field} must satisfy consensus ratio >= 0.20`);
      assert.ok(a.final_delta !== 0, `Applied adjustment ${a.field} must have non-zero final delta`);
    }

    // Verify L3 character span invariants on audit records
    for (let i = 0; i < Math.min(20, res.audit_trail.length); i++) {
      const rec = res.audit_trail[i];
      assert.ok(rec.evidence_span.start_char >= 0, "evidence_span.start_char must be non-negative");
      assert.ok(rec.evidence_span.end_char >= rec.evidence_span.start_char, "evidence_span.end_char must be >= start_char");
      assert.equal(rec.evidence_span.verification_tier, "MSVH_S1_EXACT");
    }

    // Verify rendered prose references items and applied deltas
    assert.ok(res.rendered_prose.length > 100, "Rendered prose must be populated");

    // Verify deadband conflict resolution on disputed features with opposing literature claims
    const disputedPrinciples: VerifiedSituationalPrinciple[] = [
      {
        item_id: "CLAIM_OFFICIATING_POS",
        source_doc_hash: "hash_crew_strict",
        principle_name: "Strict Officiating Crew Penalty Inflation",
        numeric_claim: "+2.4 penalties/game",
        parsed_float_magnitude: 0.024,
        unit_scale_denominator: 4.0,
        evidence_quote: "Strict crews increase offensive holding penalties by 2.4 infractions",
        evidence_span: { start_char: 0, end_char: 60, verification_tier: "MSVH_S1_EXACT" as const },
        mechanism_quote: "Holding penalties stall drives behind the chains",
        mechanism_span: { start_char: 0, end_char: 48, verification_tier: "MSVH_S1_EXACT" as const },
        applicable_context_fields: ["officiating_crew_penalty_rate" as const],
        influence_direction: "positive" as const,
        conditional_threshold: null,
        parsed_threshold_value: null,
        parsed_threshold_operator: null,
        claim_type: "causal" as const,
        influence_description: "Penalizes visiting offensive drive continuity",
      },
      {
        item_id: "CLAIM_OFFICIATING_NEG",
        source_doc_hash: "hash_crew_lenient",
        principle_name: "Let-Them-Play Officiating Crew Letdown",
        numeric_claim: "-2.4 penalties/game",
        parsed_float_magnitude: 0.024,
        unit_scale_denominator: 4.0,
        evidence_quote: "Lenient crews decrease offensive holding penalties by 2.4 infractions",
        evidence_span: { start_char: 0, end_char: 60, verification_tier: "MSVH_S1_EXACT" as const },
        mechanism_quote: "Lenient crews decrease offensive holding penalties",
        mechanism_span: { start_char: 0, end_char: 50, verification_tier: "MSVH_S1_EXACT" as const },
        applicable_context_fields: ["officiating_crew_penalty_rate" as const],
        influence_direction: "negative" as const,
        conditional_threshold: null,
        parsed_threshold_value: null,
        parsed_threshold_operator: null,
        claim_type: "causal" as const,
        influence_description: "Relaxes holding frequency",
      },
    ];

    const disputedRes = evaluateMindPrinciples({ officiating_crew_penalty_rate: 15.0 }, disputedPrinciples);
    const neutralized = disputedRes.adjustments.filter(a => a.resolution_status === "CONFLICT_NEUTRALIZED");
    assert.ok(neutralized.length > 0, "Must trigger deadband conflict neutralization on disputed features");
    assert.equal(neutralized[0].final_delta, 0.0, "Neutralized adjustment must yield exactly zero delta");
    assert.ok(neutralized[0].consensus_ratio < 0.20, "Consensus ratio must fall below 0.20 deadband");
    assert.ok(disputedRes.rendered_prose.includes("Conflicting literature evidence neutralized adjustments"), "Prose must include conflict frame");
  });

  it("Probe T6: ACWR Content-Driven Invariants (Sweet Spot Zero, Threshold, Negative Hazard, & Schedule Confound)", () => {
    const gabbettAcwrPrinciple: VerifiedSituationalPrinciple = {
      item_id: "arXiv:2102.03453",
      source_doc_hash: "hash_acwr_gabbett",
      principle_name: "Acute-to-Chronic Workload Ratio & In-Game Fatigue Hazard",
      numeric_claim: "+2.2x injury and late-game fatigue hazard above 1.40 ACWR",
      parsed_float_magnitude: 0.22,
      unit_scale_denominator: 0.25,
      evidence_quote: "American football contact and repetitive workload spikes above 1.40 acute-to-chronic workload ratio increase relative injury hazard by 2.2 times and accelerate fourth-quarter neuromuscular fatigue",
      evidence_span: { start_char: 0, end_char: 196, verification_tier: "MSVH_S1_EXACT" },
      mechanism_quote: "acute workload spikes exceed chronic tissue adaptation causing fourth-quarter physical performance degradation and turnover spikes",
      mechanism_span: { start_char: 0, end_char: 131, verification_tier: "MSVH_S1_EXACT" },
      applicable_context_fields: ["acute_chronic_workload_ratio"],
      influence_direction: "negative",
      conditional_threshold: null,
      parsed_threshold_value: null,
      parsed_threshold_operator: null,
      claim_type: "causal",
      influence_description: "Penalizes teams with acute workload spikes exceeding tissue adaptation thresholds",
    };

    // 1. Sweet spot band [0.8, 1.3] yields exactly 0 delta
    const sweetSpotRes = evaluateMindPrinciples({ acute_chronic_workload_ratio: 1.05 }, [gabbettAcwrPrinciple]);
    assert.equal(sweetSpotRes.total_delta, 0.0, "Sweet spot ACWR (1.05) must yield 0 total delta");
    assert.ok(sweetSpotRes.rendered_prose.includes("optimal sweet-spot band"), "Prose must indicate sweet spot");

    // 2. Below hazard threshold (< 1.40) yields exactly 0 delta
    const belowHazardRes = evaluateMindPrinciples({ acute_chronic_workload_ratio: 1.35 }, [gabbettAcwrPrinciple]);
    assert.equal(belowHazardRes.total_delta, 0.0, "ACWR below hazard threshold (1.35) must yield 0 delta");
    assert.ok(belowHazardRes.rendered_prose.includes("below the 1.40 injury hazard threshold"), "Prose must indicate below threshold");

    // 3. Elevated hazard (>= 1.40) yields strictly negative delta and theoretical weight when unconditioned
    const unconditionedRes = evaluateMindPrinciples({ acute_chronic_workload_ratio: 1.52 }, [gabbettAcwrPrinciple]);
    assert.ok(unconditionedRes.total_delta < 0, "Elevated ACWR (1.52) must yield negative hazard delta");
    assert.equal(unconditionedRes.adjustments[0].final_delta, -0.10, "Delta must be clamped to -0.10 probability scale");
    assert.equal(unconditionedRes.audit_trail[0].confidence_weight, 0.3, "Unconditioned ACWR must have weight reduced to theoretical 0.3");
    assert.ok(unconditionedRes.rendered_prose.includes("Schedule confound not conditioned"), "Prose must log schedule confound caveat");

    // 4. Conditioned on current session load restores causal weight (1.0)
    const conditionedRes = evaluateMindPrinciples({ acute_chronic_workload_ratio: 1.52, current_session_load: 650 }, [gabbettAcwrPrinciple]);
    assert.equal(conditionedRes.audit_trail[0].confidence_weight, 1.0, "Conditioned ACWR must use causal weight 1.0");

    // 5. In-quote perturbation scales raw delta proportionally
    const mutatedGabbett: VerifiedSituationalPrinciple = {
      ...gabbettAcwrPrinciple,
      numeric_claim: "+4.4x injury and late-game fatigue hazard above 1.40 ACWR",
      parsed_float_magnitude: 0.44,
      evidence_quote: "American football contact and repetitive workload spikes above 1.40 acute-to-chronic workload ratio increase relative injury hazard by 4.4 times and accelerate fourth-quarter neuromuscular fatigue",
    };
    const baseRaw = unconditionedRes.audit_trail[0].parsed_delta_applied;
    const mutatedRes = evaluateMindPrinciples({ acute_chronic_workload_ratio: 1.52 }, [mutatedGabbett]);
    const mutatedRaw = mutatedRes.audit_trail[0].parsed_delta_applied;
    const ratio = mutatedRaw / baseRaw;
    assert.ok(Math.abs(ratio - 2.0) < 1e-6, `Expected ACWR raw delta ratio 2.0x, got ${ratio}`);
  });

  it("Probe T7: Residual Hardcode Eradication Invariant (Ungrounded principles produce 0 magnitude)", () => {
    const { toVerifiedSituationalPrinciple } = require("../mind-reasoning.js");

    // Case A: Missing magnitude and ungrounded quote
    const ungroundedRecord = {
      item_id: "UNGROUNDED_TEST_01",
      title: "General Training Workload Observations",
      principle_or_feature: "General Workload Observation",
      evidence_quote: "Players undergo weekly training load cycles during the season.",
      applicable_context_fields: ["acute_chronic_workload_ratio"],
      influence_direction: "positive",
      numeric_claim: null,
      parsed_float_magnitude: 0,
      how_it_influences_reasoning: "General notes without numbers",
    };

    const vp = toVerifiedSituationalPrinciple(ungroundedRecord);
    assert.equal(vp.parsed_float_magnitude, 0.0, "Ungrounded principle must have magnitude 0.0 (no 0.22 fallback)");
    // Should also be purged from acute_chronic_workload_ratio due to strict gate
    assert.ok(!vp.applicable_context_fields.includes("acute_chronic_workload_ratio"), "Ungrounded record must be purged from ACWR");

    // Case B: Fabricated 0.22 in parsed magnitude where evidence quote has no number
    const fabricated022Record = {
      item_id: "FABRICATED_022_TEST",
      title: "Fabricated Workload Claim",
      principle_or_feature: "Fabricated Claim",
      evidence_quote: "Repetitive training causes general muscular fatigue during two-a-days.",
      applicable_context_fields: ["acute_chronic_workload_ratio"],
      influence_direction: "negative",
      numeric_claim: "0.22",
      parsed_float_magnitude: 0.22,
      how_it_influences_reasoning: "Fabricated claim",
    };

    const vpFabricated = toVerifiedSituationalPrinciple(fabricated022Record);
    assert.equal(vpFabricated.parsed_float_magnitude, 0.0, "Fabricated 0.22 missing from quote must be zeroed");
  });
});
