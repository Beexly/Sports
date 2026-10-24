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
      record_class: "CITABLE_VERIFIED",
      citable: true,
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

    // Verify L3 character span invariants on audit records.
    //
    // The offsets are NULLABLE, because a record whose quote is not in
    // the document it names has no span. The previous assertion read
    // `start_char >= 0` on a non-nullable type, which meant a record
    // that had been given a FABRICATED offset 0 satisfied it. Now the
    // check is the honest one: a CITABLE_VERIFIED record must carry a
    // REAL span that points into the document, and a record with no span
    // must say so with the S0 tier rather than claiming EXACT.
    for (let i = 0; i < Math.min(20, res.audit_trail.length); i++) {
      const rec = res.audit_trail[i];
      assert.ok(rec, "audit trail entry must exist");
      const start = rec.evidence_span.start_char;
      const end = rec.evidence_span.end_char;
      if (rec.evidence_span.verification_tier === "MSVH_S1_EXACT") {
        // An EXACT claim must be backed by real offsets.
        assert.ok(start !== null && start >= 0, "an EXACT span must have a non-negative start_char");
        assert.ok(end !== null && end > start, "an EXACT span must have end_char > start_char");
      } else {
        // An unverified span must not carry offsets at all.
        assert.equal(start, null, "a non-EXACT span must not carry a start_char");
        assert.equal(end, null, "a non-EXACT span must not carry an end_char");
      }    }

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
        record_class: "CITABLE_VERIFIED" as const,
        citable: true,
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
        record_class: "CITABLE_VERIFIED" as const,
        citable: true,
      },
    ];

    const disputedRes = evaluateMindPrinciples({ officiating_crew_penalty_rate: 15.0 }, disputedPrinciples);
    const neutralized = disputedRes.adjustments.filter(a => a.resolution_status === "CONFLICT_NEUTRALIZED");
    assert.ok(neutralized.length > 0, "Must trigger deadband conflict neutralization on disputed features");
    assert.equal(neutralized[0]!.final_delta, 0.0, "Neutralized adjustment must yield exactly zero delta");
    assert.ok(neutralized[0]!.consensus_ratio < 0.20, "Consensus ratio must fall below 0.20 deadband");
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
      record_class: "CITABLE_VERIFIED",
      citable: true,
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
    assert.equal(unconditionedRes.adjustments[0]!.final_delta, -0.10, "Delta must be clamped to -0.10 probability scale");
    assert.equal(unconditionedRes.audit_trail[0]!.confidence_weight, 0.3, "Unconditioned ACWR must have weight reduced to theoretical 0.3");
    assert.ok(unconditionedRes.rendered_prose.includes("Schedule confound not conditioned"), "Prose must log schedule confound caveat");

    // 4. Conditioned on current session load restores causal weight (1.0)
    const conditionedRes = evaluateMindPrinciples({ acute_chronic_workload_ratio: 1.52, current_session_load: 650 }, [gabbettAcwrPrinciple]);
    assert.equal(conditionedRes.audit_trail[0]!.confidence_weight, 1.0, "Conditioned ACWR must use causal weight 1.0");

    // 5. In-quote perturbation scales raw delta proportionally
    const mutatedGabbett: VerifiedSituationalPrinciple = {
      ...gabbettAcwrPrinciple,
      numeric_claim: "+4.4x injury and late-game fatigue hazard above 1.40 ACWR",
      parsed_float_magnitude: 0.44,
      evidence_quote: "American football contact and repetitive workload spikes above 1.40 acute-to-chronic workload ratio increase relative injury hazard by 4.4 times and accelerate fourth-quarter neuromuscular fatigue",
    };
    const baseRaw = unconditionedRes.audit_trail[0]!.parsed_delta_applied;
    const mutatedRes = evaluateMindPrinciples({ acute_chronic_workload_ratio: 1.52 }, [mutatedGabbett]);
    const mutatedRaw = mutatedRes.audit_trail[0]!.parsed_delta_applied;
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

  // ======================================================================
  // PROBE T8: THE CLASS-A EXCLUSIVITY INVARIANT.
  //
  // A record that is not CITABLE_VERIFIED may not mint a delta. Before
  // the class system existed, EVERY record in the corpus could mint one
  // -- including the 3,509 whose quotes were in no document at all and
  // the 1,704 whose numbers were nowhere near the quote. The delta is a
  // claim about the world made in the name of literature, so the
  // literature has to be there.
  // ======================================================================
  it("Probe T8: Unverified Records May Not Mint A Delta (Class-A Exclusivity)", () => {
    const { toVerifiedSituationalPrinciple, matchApplicablePrinciples, isClassACitable } =
      require("../mind-reasoning.js");

    const base = {
      item_id: "CLASS_A_TEST_01",
      source: "test",
      title: "Steam Information Flow",
      principle_or_feature: "Steam",
      domain: "market_microstructure",
      numeric_claim: { value: 0.024, unit: "points_per_hour", metric: "market_steam_velocity_pts_hr" },
      parsed_float_magnitude: 0.024,
      unit_scale_denominator: 0.5,
      evidence_quote: "rapid line movements exceeding 0.024 points per hour reflect syndicate information entry",
      mechanism_quote: "syndicate steam captures closing line value before sportsbooks adjust opening numbers",
      evidence_span: { start_char: 0, end_char: 88, verification_tier: "MSVH_S1_EXACT" },
      mechanism_span: { start_char: 89, end_char: 174, verification_tier: "MSVH_S1_EXACT" },
      applicable_context_fields: ["market_steam_velocity_pts_hr"],
      applicable_contexts: ["market"],
      influence_direction: "positive",
      conditional_threshold: null,
      parsed_threshold_value: null,
      parsed_threshold_operator: null,
      claim_type: "causal",
      influence_description: "test",
      how_it_influences_reasoning: "test",
    };

    // A CITABLE_VERIFIED record DOES mint a delta.
    const citable = { ...base, record_class: "CITABLE_VERIFIED", citable: true };
    assert.equal(isClassACitable(citable), true, "a CITABLE_VERIFIED record is class-A citable");

    // A CITABLE_VERIFIED record DOES mint a delta. This is the POSITIVE
    // CONTROL: without it, the assertions below would pass whether the
    // class filter exists or not, because a record that produces no
    // delta at all also produces no delta when it is filtered. The
    // mutation check in reconciliation/_mutation_check_honesty_tests.mjs
    // proved exactly that: with a context that yielded no match, the
    // suite stayed green when the filter was removed.
    const ctx = {
      homeTeam: "HOME",
      awayTeam: "AWAY",
      venue: "Levi's Stadium",
      restDaysHome: 3,
      restDaysAway: 3,
      weather: "10 mph wind, 60 F",
      marketLine: null,
      marketImpliedProbability: 0.5,
      outcome: "HOME",
      decisionTimestamp: "2026-10-20T00:00:00Z",
      decisionWindowMs: 0,
      windSpeedMph: 10,
      temperatureF: 60,
      crowdDecibels: 95,
      // These two produce a NON-ZERO market_steam_velocity_pts_hr
      // (0.75), so the field is actually observed and a delta is
      // possible. Without them the observed value is 0.0, the delta is
      // 0, and every assertion below is vacuous.
      publicTicketPct: 75,
      publicHandlePct: 60,
      olContinuityDelta: 0.25,
    };

    const citableMatches = matchApplicablePrinciples(ctx as never, [citable]);
    assert.equal(
      citableMatches.length,
      1,
      "a CITABLE_VERIFIED record must produce a principle match (positive control)",
    );

    for (const [cls, tier] of [
      ["HONESTLY_UNCITED_PRIOR", "MSVH_S0_UNCITED"],
      ["DERIVED_MARKET_SYNTHESIS", "MSVH_S0_DERIVED_TABLE"],
    ] as const) {
      const nonCitable = {
        ...base,
        record_class: cls,
        citable: false,
        verification_tier: tier,
        evidence_span: { start_char: null, end_char: null, verification_tier: tier },
        mechanism_span: { start_char: null, end_char: null, verification_tier: tier },
      };
      assert.equal(isClassACitable(nonCitable), false, `${cls} must not be class-A citable`);

      const matches = matchApplicablePrinciples(ctx as never, [nonCitable]);
      assert.equal(
        matches.length,
        0,
        `${cls} must not produce a principle match (and therefore no delta)`,
      );
    }

    // A record with NO class at all is not citable. The honest default
    // for an unknown provenance is "unverified", not "assume the best".
    assert.equal(isClassACitable(base as never), false, "a record with no class must not be citable");
  });

  // ======================================================================
  // PROBE T8b: THE SECOND DELTA SITE.
  //
  // `evaluateMindPrinciples` is a DIFFERENT path from
  // `matchApplicablePrinciples`: it takes already-converted principles
  // and writes the final adjustment and the prose that reports it. A
  // filter at one site does not cover the other, and a mutation check
  // proved it: removing the filter here left the whole suite green.
  //
  // The mutation check is in
  // reconciliation/_mutation_check_honesty_tests.mjs. It reintroduces
  // each defect and requires the suite to fail.
  // ======================================================================
  it("Probe T8b: Unverified Principles May Not Reach The Final Adjustment", () => {
    const { evaluateMindPrinciples } = require("../mind-reasoning.js");

    const citablePrinciple: VerifiedSituationalPrinciple = {
      item_id: "T8B_CITABLE",
      source_doc_hash: "hash_citable",
      principle_name: "Steam Information Flow",
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
      influence_description: "Elevates expected win margin.",
      record_class: "CITABLE_VERIFIED",
      citable: true,
    };

    const context: GameContextVector = { market_steam_velocity_pts_hr: 1.0 };

    // The citable principle DOES reach the audit trail.
    const citableRes = evaluateMindPrinciples(context, [citablePrinciple]);
    assert.equal(
      citableRes.audit_trail.length,
      1,
      "a CITABLE_VERIFIED principle must reach the audit trail",
    );

    // The SAME principle, marked non-citable, must NOT -- even though
    // its numbers, its fields and its quote are all unchanged. The only
    // thing that changed is whether there is a document behind it.
    for (const [cls, tier] of [
      ["HONESTLY_UNCITED_PRIOR", "MSVH_S0_UNCITED"],
      ["DERIVED_MARKET_SYNTHESIS", "MSVH_S0_DERIVED_TABLE"],
    ] as const) {
      const nonCitable: VerifiedSituationalPrinciple = {
        ...citablePrinciple,
        record_class: cls,
        citable: false,
        evidence_span: { start_char: null, end_char: null, verification_tier: tier },
        mechanism_span: { start_char: null, end_char: null, verification_tier: tier },
      };
      const res = evaluateMindPrinciples(context, [nonCitable]);
      assert.equal(
        res.audit_trail.length,
        0,
        `${cls} must not reach the audit trail`,
      );
      assert.equal(res.total_delta, 0.0, `${cls} must not produce a total delta`);
      assert.ok(
        !res.rendered_prose.includes("0.024"),
        `${cls} must not appear in the rendered prose`,
      );
    }
  });

  // ======================================================================
  // PROBE T9: NO FABRICATED SPAN.
  //
  // The consumer used to paper over a missing span with
  // `start_char: 0, end_char: quote.length, verification_tier:
  // "MSVH_S1_EXACT"` -- which asserts "verified verbatim at offset 0"
  // for a quote that is in no document. That is the same fabrication the
  // corpus builder had, reproduced downstream. A record with no span HAS
  // no span.
  // ======================================================================
  it("Probe T9: A Record With No Span Gets No Span (No Fabricated Offset 0)", () => {
    const { toVerifiedSituationalPrinciple } = require("../mind-reasoning.js");

    const noSpanRecord = {
      item_id: "NO_SPAN_TEST_01",
      source: "test",
      title: "Foundational Principle",
      principle_or_feature: "Foundational",
      numeric_claim: { value: 0.2, unit: "probability", metric: "offensive_pace_sec_per_play" },
      parsed_float_magnitude: 0.2,
      evidence_quote: "A hand-authored principle with no source document on disk at all.",
      mechanism_quote: "The mechanism is also hand-authored and cites nothing.",
      applicable_contexts: ["offense"],
      influence_direction: "positive",
      claim_type: "theoretical",
      influence_description: "test",
      how_it_influences_reasoning: "test",
      record_class: "HONESTLY_UNCITED_PRIOR",
      citable: false,
      verification_tier: "MSVH_S0_UNCITED",
    };

    const vp = toVerifiedSituationalPrinciple(noSpanRecord);

    // The offsets must be NULL, not 0.
    assert.equal(vp.evidence_span.start_char, null, "a missing span must not become offset 0");
    assert.equal(vp.evidence_span.end_char, null, "a missing span must not become quote.length");
    // And the tier must not claim EXACT.
    assert.notEqual(
      vp.evidence_span.verification_tier,
      "MSVH_S1_EXACT",
      "a missing span must not claim the EXACT tier",
    );
    assert.equal(vp.evidence_span.verification_tier, "MSVH_S0_UNCITED");
    assert.equal(vp.mechanism_span.start_char, null, "a missing mechanism span must not become offset 0");
    assert.equal(vp.citable, false, "a HONESTLY_UNCITED_PRIOR is not citable");
  });

  // ======================================================================
  // PROBE T10: THE LOADERS MUST NOT BE THE SAME FUNCTION.
  //
  // "loadVerifiedMindCorpus" loads the CORPUS -- every record, including
  // the ones the builder stamped HONESTLY_UNCITED_PRIOR,
  // DERIVED_MARKET_SYNTHESIS and REJECTED_CORRUPT. A consumer that
  // wants LITERATURE must reach for loadCitableMindCorpus, which
  // filters on the class.
  //
  // The two being the same function is the defect: then "Verified" in
  // the name means nothing, and a caller that reaches for the loader
  // with "Verified" in its name gets uncitable records with it.
  // ======================================================================
  it("Probe T10: The Citable Loader Excludes Every Non-Citable Record", () => {
    const { loadVerifiedMindCorpus, loadCitableMindCorpus } = require("../mind-reasoning.js");

    const corpus = loadVerifiedMindCorpus();
    const citable = loadCitableMindCorpus();

    // The corpus loader loads everything.
    assert.ok(corpus.length >= 3000, `the corpus loader must load the corpus, got ${corpus.length}`);

    // The citable loader loads strictly fewer, and every one of them is
    // citable.
    assert.ok(
      citable.length < corpus.length,
      `the citable loader must be a strict subset: ${citable.length} vs ${corpus.length}`,
    );
    assert.ok(citable.length > 0, "the citable loader must not be empty");
    for (const p of citable as readonly { citable: boolean; record_class: string; item_id: string }[]) {
      assert.equal(p.citable, true, `${p.item_id} is in the citable set but not citable`);
      assert.equal(p.record_class, "CITABLE_VERIFIED", `${p.item_id} has the wrong class`);
    }

    // And the corpus really does contain uncitable records, or the
    // filter is untested.
    const corpusUncitable = (corpus as readonly { citable: boolean }[]).filter((p) => !p.citable);
    assert.ok(
      corpusUncitable.length > 0,
      "the corpus must contain uncitable records, or the filter is untested",
    );
  });
});
