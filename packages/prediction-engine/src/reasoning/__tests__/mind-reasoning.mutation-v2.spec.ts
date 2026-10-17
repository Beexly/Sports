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

    // Assert that conflicting fields properly neutralize into deadband (consensus_ratio < 0.20)
    const neutralized = res.adjustments.filter(a => a.resolution_status === "CONFLICT_NEUTRALIZED");
    assert.ok(neutralized.length > 0, "Must trigger deadband conflict neutralization on disputed features");

    // Assert that applied adjustments have consensus_ratio >= 0.20
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
  });
});
