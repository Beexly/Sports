/**
 * T8 -- THE PICK PIPELINE. The compile-time phantom brand and the nine runtime gates G1-G9.
 *
 * THE SPEC'S T8, verbatim from Table 5:
 *
 *   "pick-pipeline.ts | Compile-Time Phantom Brand & Runtime Gates G1-G9: Verifies @ts-expect-error
 *    compile-time rejection on unbranded or WITHHELD/INSUFFICIENT/ASSOCIATION_ONLY certificates and
 *    runtime refusal across all nine gates."
 *
 * -------------------------------------------------------------------------------------------
 * WHAT THIS FILE PROVES, AND WHY IT IS BUILT THE WAY IT IS.
 *
 * The spec's T8 row names TWO obligations in one line, and they are checked here separately
 * because they fail in different ways:
 *
 *   1. THE COMPILE-TIME REJECTION. The `@ts-expect-error` block below asserts that TypeScript
 *      REJECTS an unbranded object and a certificate in each of the non-publishable states. Those
 *      assertions are load-bearing in both directions: `@ts-expect-error` FAILS THE BUILD if the
 *      line it precedes does NOT error, so a weakening of the brand that made an unbranded object
 *      assignable would break this file's COMPILATION, not just its runtime assertions. The
 *      mutation sweep (reconciliation/_mutation_sweep_t8_picks.mjs) proves the RUNTIME half is
 *      pinned too.
 *
 *   2. THE RUNTIME REFUSAL ACROSS ALL NINE GATES. Every gate is exercised on BOTH sides of its
 *      own condition, because a gate that refuses everything is not a gate either. And the
 *      conjunction is asserted: ONE failing gate produces ZERO picks, not a degraded pick.
 *
 * EVERY THRESHOLD IN HERE IS A LITERAL, NEVER THE IMPORTED CONSTANT.
 * A boundary test written as `pointEValue: MIN_POINT_E_VALUE` proves nothing: mutate the constant
 * and the test moves with it, still passing. The literals below are the SPEC's numbers, so moving
 * any threshold in the module breaks the test that names it.
 *
 * NO Math.random. Every input is a literal or built by a deterministic pattern, so a failure is
 * reproducible and the suite never flakes.
 *
 * THE FIXTURES ARE THE REPOSITORY'S OWN TYPES.
 * The adversary verdict, the causal-claim verdict, the conformal result, the literature verdict,
 * the calibration samples and the price row are the real types the rest of the engine produces.
 * A test that fed this pipeline a shape the engine never produces would be testing a fiction.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  CERTIFICATE_REFUSAL,
  PICK_GATE_ORDER,
  PICK_GATE_REFUSAL,
  PickGate,
  authorizeCausalPublish,
  emitPicks,
  isValidatedCausalTrace,
  mintBoardOrParlayEntry,
  runPickGates,
  tryValidateCertificate,
  validateCertificate,
  type CausalCertificate,
  type PickGateInput,
  type ValidatedCausalTrace,
} from "../src/picks/pick-pipeline.js";
import type { AdversaryRedTeamVerdict } from "../src/causal/adversary-red-team.js";
import type { CausalClaimVerdict } from "../src/causal/causal-claim-gate.js";
import type { ItcrGateResult } from "../src/calibration/itcr-orca-gate.js";
import type { VerificationVerdict } from "../src/literature/literature-verification.js";
import type { CalibrationSample } from "../src/probability-calibration.js";
import type { DecisionTimePriceRow } from "../src/edge-lab/decision-time-price-archive.js";

// =================================================================================================
// SECTION 1 -- THE COMPILE-TIME BARRIER
// =================================================================================================

/**
 * A minimal VALID certificate, used as the "someCert" of the spec's compile-time example.
 *
 * It is declared as `CausalCertificate<"VALID">` -- the PUBLISHABLE shape -- so the compile-time
 * assertions below are testing the BRAND and not the state narrowing. The state narrowing gets
 * its own assertions, one per bad state.
 */
const VALID_CERT: CausalCertificate<"VALID"> = {
  state: "VALID",
  game_id: "g-1",
  market_id: "m-1",
  true_prob: 0.62,
  market_vig_free_prob: 0.55,
  edge: 0.07,
  audit_trail: [],
};

/** A WITHHELD certificate: the engine declined to state a conclusion. */
const WITHHELD_CERT: CausalCertificate<"WITHHELD"> = {
  ...VALID_CERT,
  state: "WITHHELD",
};

/** An INSUFFICIENT certificate: the evidence does not support a conclusion. */
const INSUFFICIENT_CERT: CausalCertificate<"INSUFFICIENT"> = {
  ...VALID_CERT,
  state: "INSUFFICIENT",
};

/** An ASSOCIATION_ONLY certificate: the variables move together, but no causal claim is licensed. */
const ASSOCIATION_ONLY_CERT: CausalCertificate<"ASSOCIATION_ONLY"> = {
  ...VALID_CERT,
  state: "ASSOCIATION_ONLY",
};

/** A MISSING certificate: the slot was never filled. */
const MISSING_CERT: CausalCertificate<"MISSING"> = {
  ...VALID_CERT,
  state: "MISSING",
};

/**
 * THE COMPILE-TIME BARRIER.
 *
 * Every line here is a REAL compile-time assertion, not a comment. The `@ts-expect-error`
 * directive makes the compiler FAIL if the line below it stops being an error -- so if the brand
 * were weakened (an unbranded object became assignable, or a WITHHELD certificate became
 * publishable), this file would not compile. That is the spec's point: the barrier is in the TYPE
 * SYSTEM, not in a runtime check that a caller can skip.
 *
 * The variants the task names -- an unbranded object, and a WITHHELD / INSUFFICIENT /
 * ASSOCIATION_ONLY certificate -- are each asserted, and the MISSING state is asserted too,
 * because the spec's §6.1 says "passing an absent trace ... is a TypeScript compiler error".
 */
describe("T8_COMPILE -- the phantom brand is a COMPILE-TIME barrier, not a runtime check", () => {
  it("rejects an unbranded object and every non-publishable certificate at compile time", () => {
    // @ts-expect-error - an unbranded object is not a ValidatedCausalTrace
    const unbranded: ValidatedCausalTrace = { certificate: VALID_CERT };

    // @ts-expect-error - a WITHHELD certificate cannot carry the brand
    const withheld: ValidatedCausalTrace = { certificate: WITHHELD_CERT };

    // @ts-expect-error - an INSUFFICIENT certificate cannot carry the brand
    const insufficient: ValidatedCausalTrace = { certificate: INSUFFICIENT_CERT };

    // @ts-expect-error - an ASSOCIATION_ONLY certificate cannot carry the brand
    const associationOnly: ValidatedCausalTrace = { certificate: ASSOCIATION_ONLY_CERT };

    // @ts-expect-error - a MISSING certificate cannot carry the brand
    const missing: ValidatedCausalTrace = { certificate: MISSING_CERT };

    // @ts-expect-error - an absent certificate cannot carry the brand either
    const absent: ValidatedCausalTrace = { certificate: undefined as unknown as CausalCertificate };

    // The assertions above are about the COMPILER, so the values are deliberately never used.
    // What is asserted at runtime is that none of them is a branded trace, which is the other half
    // of the same barrier: the brand is a runtime fact too, and a hand-built object cannot fake
    // it because the brand key is not nameable from outside the module.
    for (const candidate of [unbranded, withheld, insufficient, associationOnly, missing, absent]) {
      expect(isValidatedCausalTrace(candidate)).toBe(false);
    }
  });

  it("refuses to type an unbranded object as a ValidatedCausalTrace", () => {
    // The type-level assertion, spelled once more as a function ARGUMENT, because a downstream
    // FUNCTION is where the barrier has to hold. `mintBoardOrParlayEntry` takes a
    // ValidatedCausalTrace, so this is the spec's "no downstream function accepts a raw number or
    // an optional trace" in its sharpest form: a raw certificate does not compile.
    const mintUnbranded = (): void => {
      // @ts-expect-error - an unbranded certificate is not a ValidatedCausalTrace
      mintBoardOrParlayEntry({ certificate: VALID_CERT });
    };
    expect(typeof mintUnbranded).toBe("function");
  });
});

// =================================================================================================
// SECTION 2 -- THE RUNTIME FIXTURES
// =================================================================================================

/** A causal-claim verdict that is identified, publishable, and hedge-free. */
function publishableClaim(): CausalClaimVerdict {
  return {
    publishable: true,
    refusal_code: null,
    conclusion: "CAUSAL",
    formula: "sum_{z} P(y|do(x),z)P(z)",
    formula_class: "BACKDOOR_G_FORMULA",
    enabling_edges: [],
    hedge_forest_full: null,
    hedge_forest_sub: null,
    hedge_count: 0,
    activating_mediators: [],
    proximal_attempt: null,
    itcr_trace_score: null,
    expansion_attempts: [],
    reason: "the effect is identified by the back-door path",
  };
}

/** A causal-claim verdict blocked by a witnessing hedge. */
function hedgedClaim(): CausalClaimVerdict {
  return {
    ...publishableClaim(),
    publishable: false,
    refusal_code: "REFUSED_G3_NON_IDENTIFIABLE_HEDGE",
    conclusion: "ASSOCIATION_ONLY",
    formula: null,
    formula_class: null,
    hedge_count: 1,
    reason: "the effect is blocked by a witnessing hedge",
  };
}

/**
 * An adversary red-team verdict, with the measurements the caller chose.
 *
 * Every measurement is EXPLICIT, so the verdict's numbers are the ones this test put there -- and
 * the null cases (an unmeasured E-value) are the "unmeasured is not a pass" case the repository's
 * own T6 gate insists on.
 */
function adversaryVerdict(overrides: {
  readonly pointEValue?: number | null;
  readonly ciEValue?: number | null;
  readonly placeboLeak?: number | null;
  readonly entitySwapDivergence?: number | null;
  readonly causalPhysRa?: number | null;
} = {}): AdversaryRedTeamVerdict {
  const point = overrides.pointEValue === undefined ? 1.5 : overrides.pointEValue;
  const ci = overrides.ciEValue === undefined ? 1.2 : overrides.ciEValue;
  const placebo = overrides.placeboLeak === undefined ? 0.001 : overrides.placeboLeak;
  const swap =
    overrides.entitySwapDivergence === undefined ? 0.01 : overrides.entitySwapDivergence;
  const ra = overrides.causalPhysRa === undefined ? 0.9 : overrides.causalPhysRa;
  return {
    chainId: "chain-1",
    blocked: false,
    code: "ACCEPTED_T6_ADVERSARY_RED_TEAM",
    reasons: [],
    measurements: {
      pointEValue: point,
      ciEValue: ci,
      placeboLeak: placebo,
      entitySwapDivergence: swap,
      causalPhysRa: ra,
      pointEValueSource: "EXPLICIT",
      ciEValueSource: "EXPLICIT",
    },
    criteria: [],
  };
}

/** A literature premise verdict that cleared all four layers. */
function admittedVerdict(itemId: string): VerificationVerdict {
  return {
    item_id: itemId,
    l1_provenance: true,
    l2_numeric_containment: true,
    l3_span_anchoring: true,
    l4_mechanism_entailment: true,
    admitted: true,
    rejection_reason: null,
    failed_layers: [],
    source_missing: false,
  };
}

/** A literature premise verdict that failed the L1-L4 conjunction. */
function rejectedVerdict(itemId: string): VerificationVerdict {
  return {
    item_id: itemId,
    l1_provenance: true,
    l2_numeric_containment: false,
    l3_span_anchoring: true,
    l4_mechanism_entailment: true,
    admitted: false,
    rejection_reason: "the claimed magnitude is not in the quote",
    failed_layers: ["L2"],
    source_missing: false,
  };
}

/** A conformal gate verdict that ALLOWED the trace, with the spec's alpha <= tau. */
function allowedItcr(alphaITCR = 0.2, tauConformal = 0.5): ItcrGateResult {
  return {
    status: "ALLOW",
    conformal_Stop_triggered: false,
    refusal_code: null,
    alpha_ITCR: alphaITCR,
    tau_conformal: tauConformal,
    shafer_vovk_rank: 19,
    unbounded_prediction_set: false,
    calibration_set_size: 20,
    miscoverage: 0.1,
    reason: "the trace is conformal at the requested miscoverage",
    offender_node_id: "n1",
    pruned_nodes: [],
    alternative_subgraph: null,
  };
}

/** A conformal gate verdict that HALTED the trace. */
function haltedItcr(): ItcrGateResult {
  return {
    status: "HALT",
    conformal_Stop_triggered: true,
    refusal_code: null,
    alpha_ITCR: 0.95,
    tau_conformal: 0.5,
    shafer_vovk_rank: 19,
    unbounded_prediction_set: false,
    calibration_set_size: 20,
    miscoverage: 0.1,
    reason: "the trace exceeded the absolute nonconformity ceiling",
    offender_node_id: "n1",
    halt_reason: "ABOVE_MAX_TRACE_NONCONFORMITY",
    pruned_nodes: [],
    alternative_subgraph: {
      found: false,
      alpha_after_prune: null,
      pruned_nodes: [],
      surviving_nodes: [],
      conclusion_survives: false,
      reason: "no alternative was attempted",
    },
  };
}

/**
 * The calibration samples of the passing fixture.
 *
 * A quarter of them are p=0.9/y=1 and the rest p=0.1/y=0. The two bins are far apart, so the
 * Murphy resolution term is large and the reliability term small -- which is exactly the
 * REL_cat < RES_cat condition the spec's G7 asks for.
 */
function calibrationSamples(): CalibrationSample[] {
  const samples: CalibrationSample[] = [];
  for (let i = 0; i < 300; i += 1) {
    if (i % 4 === 0) samples.push({ p: 0.9, y: 1 });
    else samples.push({ p: 0.1, y: 0 });
  }
  return samples;
}

/**
 * The trailing coverage errors of the passing fixture.
 *
 * One in ten misses coverage, which matches an adapted alpha of 0.1 -- so the ACI coverage
 * stability conjunct |mean(err) - alpha| <= 0.03 holds exactly.
 */
function coverageErrors(): number[] {
  const errors: number[] = [];
  for (let i = 0; i < 300; i += 1) errors.push(i % 10 === 0 ? 1 : 0);
  return errors;
}

/** A decision-time price row the repository's own validator accepts. */
function priceRow(overrides: Partial<DecisionTimePriceRow> = {}): DecisionTimePriceRow {
  return {
    game_id: "g-1",
    market_id: "m-1",
    side: "HOME",
    decision_time_price: -110,
    decision_time_utc: "2026-03-01T12:00:00.000Z",
    model_probability: 0.62,
    devigged_market_prob: 0.55,
    edge: 0.07,
    model_source: "test",
    covariates_hash: "a".repeat(64),
    ...overrides,
  };
}

/**
 * THE ALL-PASS INPUT.
 *
 * Every gate's condition holds, so a pipeline run on it must publish. Each gate's own failing
 * fixture is derived from THIS one by changing exactly one thing, so a refusal can only be
 * attributed to the thing that was changed.
 */
function passingInput(): PickGateInput {
  return {
    bridge: {
      premises: [
        {
          premise_id: "p1",
          sample_count: 30,
          probability: 0.62,
          home_sign: 1,
        },
      ],
      signal_coverage: 0.65,
    },
    literature: {
      verdicts: [admittedVerdict("lit-1")],
      conflict_consensus: { consensus_ratio: 1, conflict_count: 0 },
    },
    identifiability: {
      causal_claim: publishableClaim(),
      positivity: 0.5,
    },
    adversary: adversaryVerdict(),
    rationale: { evidence_faithfulness: 0.95, decision_coherence: 0.9 },
    conformal: {
      itcr: allowedItcr(),
      sgp_joints: [{ label: "A&B", pa: 0.6, pb: 0.5, joint: 0.4 }],
    },
    calibration: {
      samples: calibrationSamples(),
      coverage_errors: coverageErrors(),
      aci: { alpha: 0.1 },
    },
    clv: {
      observations: [
        { value: 0.01, verdict: "BEAT_CLOSE" },
        { value: 0.02, verdict: "BEAT_CLOSE" },
      ],
      point_forecast: 0.62,
      trailing_scores: [0.01, 0.01, 0.01, 0.02],
      market_price: 0.55,
    },
    price_archive: { row: priceRow(), committed: true, fsynced: true },
  };
}

/**
 * A DRAFT of the gate input: the same shape, with the top level writable.
 *
 * The module's input type is deeply readonly, which is right for a caller and wrong for a test
 * that wants to break ONE field. The draft makes the top level assignable and the fixtures below
 * rebuild the nested group they touch, so a fixture can never accidentally change two things.
 */
type GateInputDraft = { -readonly [K in keyof PickGateInput]: PickGateInput[K] };

/** A fresh draft of the all-pass input. */
function draft(): GateInputDraft {
  return passingInput();
}

// =================================================================================================
// SECTION 3 -- THE CERTIFICATE STATES
// =================================================================================================

describe("T8_CERT -- every non-publishable certificate state is refused with its own code", () => {
  it("accepts a VALID certificate and brands it", () => {
    const trace = validateCertificate(VALID_CERT);
    expect(trace.certificate.state).toBe("VALID");
    expect(trace.certificate.game_id).toBe("g-1");
    // The brand is a runtime fact, not only a type-level one.
    expect(isValidatedCausalTrace(trace)).toBe(true);
  });

  it("refuses a MISSING certificate with the MISSING code", () => {
    const result = tryValidateCertificate(null);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.refusal.refusal_code).toBe(CERTIFICATE_REFUSAL.missing);
  });

  it("refuses a WITHHELD certificate with the WITHHELD code", () => {
    const result = tryValidateCertificate(WITHHELD_CERT);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.refusal.refusal_code).toBe(CERTIFICATE_REFUSAL.withheld);
  });

  it("refuses an INSUFFICIENT certificate with the INSUFFICIENT code", () => {
    const result = tryValidateCertificate(INSUFFICIENT_CERT);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.refusal.refusal_code).toBe(CERTIFICATE_REFUSAL.insufficient);
  });

  it("refuses an ASSOCIATION_ONLY certificate with the ASSOCIATION_ONLY code", () => {
    const result = tryValidateCertificate(ASSOCIATION_ONLY_CERT);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.refusal.refusal_code).toBe(CERTIFICATE_REFUSAL.associationOnly);
  });

  it("refuses a certificate that declares itself MISSING", () => {
    const result = tryValidateCertificate(MISSING_CERT);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.refusal.refusal_code).toBe(CERTIFICATE_REFUSAL.missing);
  });

  it("gives each non-publishable state a DISTINCT refusal code", () => {
    const codes = [
      CERTIFICATE_REFUSAL.missing,
      CERTIFICATE_REFUSAL.withheld,
      CERTIFICATE_REFUSAL.insufficient,
      CERTIFICATE_REFUSAL.associationOnly,
    ];
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("throws rather than returning an unbranded value for a refused certificate", () => {
    expect(() => validateCertificate(WITHHELD_CERT)).toThrow(/REFUSED_CERTIFICATE_WITHHELD/);
    expect(() => validateCertificate(null)).toThrow(/REFUSED_CERTIFICATE_MISSING/);
  });

  it("treats undefined and null as the same MISSING state", () => {
    const fromUndefined = tryValidateCertificate(undefined);
    const fromNull = tryValidateCertificate(null);
    expect(fromUndefined.ok).toBe(false);
    expect(fromNull.ok).toBe(false);
    if (fromUndefined.ok || fromNull.ok) throw new Error("unreachable");
    expect(fromUndefined.refusal.refusal_code).toBe(fromNull.refusal.refusal_code);
  });
});

// =================================================================================================
// SECTION 4 -- THE NINE GATES
// =================================================================================================

describe("T8_GATES -- all nine gates are evaluated, and each refuses with its own code", () => {
  it("returns exactly nine outcomes, in the spec's order", () => {
    const outcomes = runPickGates(passingInput());
    expect(outcomes).toHaveLength(9);
    expect(outcomes.map((o) => o.gate)).toEqual([...PICK_GATE_ORDER]);
    expect(PICK_GATE_ORDER).toEqual([
      PickGate.G1,
      PickGate.G2,
      PickGate.G3,
      PickGate.G4,
      PickGate.G5,
      PickGate.G6,
      PickGate.G7,
      PickGate.G8,
      PickGate.G9,
    ]);
  });

  it("passes every gate on the all-pass input", () => {
    const outcomes = runPickGates(passingInput());
    for (const outcome of outcomes) {
      expect(outcome.passed, `${outcome.gate}: ${outcome.reason ?? ""}`).toBe(true);
      expect(outcome.refusal_code).toBeNull();
      expect(outcome.reason).toBeNull();
    }
  });

  it("gives each gate a DISTINCT refusal code", () => {
    const codes = Object.values(PICK_GATE_REFUSAL);
    expect(codes).toHaveLength(9);
    expect(new Set(codes).size).toBe(9);
  });

  // --- G1 -----------------------------------------------------------------------------------
  it("G1 refuses a premise with fewer than 30 samples", () => {
    const input = draft();
    input.bridge = {
      ...input.bridge,
      premises: [{ ...input.bridge.premises[0]!, sample_count: 29 }],
    };
    const g1 = runPickGates(input)[0]!;
    expect(g1.gate).toBe(PickGate.G1);
    expect(g1.passed).toBe(false);
    expect(g1.refusal_code).toBe(PICK_GATE_REFUSAL.G1);
  });

  it("G1 accepts exactly 30 samples", () => {
    const input = draft();
    input.bridge = {
      ...input.bridge,
      premises: [{ ...input.bridge.premises[0]!, sample_count: 30 }],
    };
    expect(runPickGates(input)[0]!.passed).toBe(true);
  });

  it("G1 refuses a premise with NO DIRECTION -- the audit's measured gap", () => {
    const input = draft();
    input.bridge = {
      ...input.bridge,
      premises: [{ ...input.bridge.premises[0]!, home_sign: 0 as const }],
    };
    const g1 = runPickGates(input)[0]!;
    expect(g1.gate).toBe(PickGate.G1);
    expect(g1.passed).toBe(false);
    expect(g1.refusal_code).toBe(PICK_GATE_REFUSAL.G1);
    expect(g1.reason).toMatch(/direction/i);
  });

  it("G1 refuses a premise whose probability is not strictly inside (0,1)", () => {
    const atZero = draft();
    atZero.bridge = {
      ...atZero.bridge,
      premises: [{ ...atZero.bridge.premises[0]!, probability: 0 }],
    };
    expect(runPickGates(atZero)[0]!.passed).toBe(false);
    const atOne = draft();
    atOne.bridge = {
      ...atOne.bridge,
      premises: [{ ...atOne.bridge.premises[0]!, probability: 1 }],
    };
    expect(runPickGates(atOne)[0]!.passed).toBe(false);
  });

  it("G1 refuses a signal coverage below 0.65 and accepts exactly 0.65", () => {
    const low = draft();
    low.bridge = { ...low.bridge, signal_coverage: 0.6499 };
    expect(runPickGates(low)[0]!.refusal_code).toBe(PICK_GATE_REFUSAL.G1);
    const exact = draft();
    exact.bridge = { ...exact.bridge, signal_coverage: 0.65 };
    expect(runPickGates(exact)[0]!.passed).toBe(true);
  });

  it("G1 refuses when no active premise was supplied at all", () => {
    const input = draft();
    input.bridge = { ...input.bridge, premises: [] };
    const g1 = runPickGates(input)[0]!;
    expect(g1.passed).toBe(false);
    expect(g1.refusal_code).toBe(PICK_GATE_REFUSAL.G1);
  });

  // --- G2 -----------------------------------------------------------------------------------
  it("G2 refuses a literature premise that failed the L1-L4 conjunction", () => {
    const input = draft();
    input.literature = { ...input.literature, verdicts: [rejectedVerdict("lit-1")] };
    const g2 = runPickGates(input)[1]!;
    expect(g2.gate).toBe(PickGate.G2);
    expect(g2.passed).toBe(false);
    expect(g2.refusal_code).toBe(PICK_GATE_REFUSAL.G2);
  });

  it("G2 refuses a conflict consensus below 0.20 and accepts exactly 0.20", () => {
    const low = draft();
    low.literature = {
      ...low.literature,
      conflict_consensus: { consensus_ratio: 0.1999, conflict_count: 2 },
    };
    expect(runPickGates(low)[1]!.refusal_code).toBe(PICK_GATE_REFUSAL.G2);
    const exact = draft();
    exact.literature = {
      ...exact.literature,
      conflict_consensus: { consensus_ratio: 0.2, conflict_count: 2 },
    };
    expect(runPickGates(exact)[1]!.passed).toBe(true);
  });

  it("G2 does not demand a consensus ratio when there is no conflict", () => {
    const input = draft();
    input.literature = {
      ...input.literature,
      conflict_consensus: { consensus_ratio: 0, conflict_count: 0 },
    };
    expect(runPickGates(input)[1]!.passed).toBe(true);
  });

  // --- G3 -----------------------------------------------------------------------------------
  it("G3 refuses an effect blocked by a witnessing hedge", () => {
    const input = draft();
    input.identifiability = { ...input.identifiability, causal_claim: hedgedClaim() };
    const g3 = runPickGates(input)[2]!;
    expect(g3.gate).toBe(PickGate.G3);
    expect(g3.passed).toBe(false);
    expect(g3.refusal_code).toBe(PICK_GATE_REFUSAL.G3);
  });

  it("G3 refuses a positivity below 0.01 and accepts exactly 0.01", () => {
    const low = draft();
    low.identifiability = { ...low.identifiability, positivity: 0.009 };
    expect(runPickGates(low)[2]!.refusal_code).toBe(PICK_GATE_REFUSAL.G3);
    const exact = draft();
    exact.identifiability = { ...exact.identifiability, positivity: 0.01 };
    expect(runPickGates(exact)[2]!.passed).toBe(true);
  });

  it("G3 refuses an UNMEASURED positivity -- unmeasured is not a pass", () => {
    const input = draft();
    input.identifiability = { ...input.identifiability, positivity: null };
    const g3 = runPickGates(input)[2]!;
    expect(g3.passed).toBe(false);
    expect(g3.refusal_code).toBe(PICK_GATE_REFUSAL.G3);
  });

  // --- G4 -----------------------------------------------------------------------------------
  it("G4 refuses a point E-value below 1.35 and accepts exactly 1.35", () => {
    const low = draft();
    low.adversary = adversaryVerdict({ pointEValue: 1.3499 });
    expect(runPickGates(low)[3]!.refusal_code).toBe(PICK_GATE_REFUSAL.G4);
    const exact = draft();
    exact.adversary = adversaryVerdict({ pointEValue: 1.35 });
    expect(runPickGates(exact)[3]!.passed).toBe(true);
  });

  it("G4 refuses a CI E-value below 1.10 and accepts exactly 1.10", () => {
    const low = draft();
    low.adversary = adversaryVerdict({ ciEValue: 1.0999 });
    expect(runPickGates(low)[3]!.refusal_code).toBe(PICK_GATE_REFUSAL.G4);
    const exact = draft();
    exact.adversary = adversaryVerdict({ ciEValue: 1.1 });
    expect(runPickGates(exact)[3]!.passed).toBe(true);
  });

  it("G4 refuses a placebo leak above 0.005 and accepts exactly 0.005", () => {
    const high = draft();
    high.adversary = adversaryVerdict({ placeboLeak: 0.0051 });
    expect(runPickGates(high)[3]!.refusal_code).toBe(PICK_GATE_REFUSAL.G4);
    const exact = draft();
    exact.adversary = adversaryVerdict({ placeboLeak: 0.005 });
    expect(runPickGates(exact)[3]!.passed).toBe(true);
  });

  it("G4 refuses an UNMEASURED E-value", () => {
    const input = draft();
    input.adversary = adversaryVerdict({ pointEValue: null });
    const g4 = runPickGates(input)[3]!;
    expect(g4.passed).toBe(false);
    expect(g4.refusal_code).toBe(PICK_GATE_REFUSAL.G4);
  });

  // --- G5 -----------------------------------------------------------------------------------
  it("G5 refuses an entity-swap divergence AT 0.02 -- the spec's inequality is strict", () => {
    const atLimit = draft();
    atLimit.adversary = adversaryVerdict({ entitySwapDivergence: 0.02 });
    const g5 = runPickGates(atLimit)[4]!;
    expect(g5.gate).toBe(PickGate.G5);
    expect(g5.passed).toBe(false);
    expect(g5.refusal_code).toBe(PICK_GATE_REFUSAL.G5);
    const below = draft();
    below.adversary = adversaryVerdict({ entitySwapDivergence: 0.0199 });
    expect(runPickGates(below)[4]!.passed).toBe(true);
  });

  it("G5 refuses a rationale accuracy below 0.85 and accepts exactly 0.85", () => {
    const low = draft();
    low.adversary = adversaryVerdict({ causalPhysRa: 0.8499 });
    expect(runPickGates(low)[4]!.refusal_code).toBe(PICK_GATE_REFUSAL.G5);
    const exact = draft();
    exact.adversary = adversaryVerdict({ causalPhysRa: 0.85 });
    expect(runPickGates(exact)[4]!.passed).toBe(true);
  });

  it("G5 refuses an evidence faithfulness below 0.95 and accepts exactly 0.95", () => {
    const low = draft();
    low.rationale = { ...low.rationale, evidence_faithfulness: 0.9499 };
    expect(runPickGates(low)[4]!.refusal_code).toBe(PICK_GATE_REFUSAL.G5);
    const exact = draft();
    exact.rationale = { ...exact.rationale, evidence_faithfulness: 0.95 };
    expect(runPickGates(exact)[4]!.passed).toBe(true);
  });

  it("G5 refuses a decision coherence below 0.90 and accepts exactly 0.90", () => {
    const low = draft();
    low.rationale = { ...low.rationale, decision_coherence: 0.8999 };
    expect(runPickGates(low)[4]!.refusal_code).toBe(PICK_GATE_REFUSAL.G5);
    const exact = draft();
    exact.rationale = { ...exact.rationale, decision_coherence: 0.9 };
    expect(runPickGates(exact)[4]!.passed).toBe(true);
  });

  it("G5 refuses an UNMEASURED faithfulness term", () => {
    const input = draft();
    input.rationale = { ...input.rationale, evidence_faithfulness: null };
    const g5 = runPickGates(input)[4]!;
    expect(g5.passed).toBe(false);
    expect(g5.refusal_code).toBe(PICK_GATE_REFUSAL.G5);
  });

  // --- G6 -----------------------------------------------------------------------------------
  it("G6 refuses a conformal stop", () => {
    const input = draft();
    input.conformal = { ...input.conformal, itcr: haltedItcr() };
    const g6 = runPickGates(input)[5]!;
    expect(g6.gate).toBe(PickGate.G6);
    expect(g6.passed).toBe(false);
    expect(g6.refusal_code).toBe(PICK_GATE_REFUSAL.G6);
  });

  it("G6 refuses a copula joint outside the Frechet-Hoeffding bounds", () => {
    const input = draft();
    // pa = 0.6, pb = 0.5 -> the joint must lie in [0.1, 0.5]. 0.9 is outside it.
    input.conformal = {
      ...input.conformal,
      sgp_joints: [{ label: "A&B", pa: 0.6, pb: 0.5, joint: 0.9 }],
    };
    const g6 = runPickGates(input)[5]!;
    expect(g6.passed).toBe(false);
    expect(g6.refusal_code).toBe(PICK_GATE_REFUSAL.G6);
  });

  it("G6 refuses a nonconformity above the conformal threshold", () => {
    const input = draft();
    input.conformal = { ...input.conformal, itcr: allowedItcr(0.9, 0.5) };
    const g6 = runPickGates(input)[5]!;
    expect(g6.passed).toBe(false);
    expect(g6.refusal_code).toBe(PICK_GATE_REFUSAL.G6);
  });

  it("G6 accepts a copula joint exactly ON the Frechet-Hoeffding bound", () => {
    const input = draft();
    // pa = 0.6, pb = 0.5 -> the upper bound is min(0.6, 0.5) = 0.5.
    input.conformal = {
      ...input.conformal,
      sgp_joints: [{ label: "A&B", pa: 0.6, pb: 0.5, joint: 0.5 }],
    };
    expect(runPickGates(input)[5]!.passed).toBe(true);
  });

  // --- G7 -----------------------------------------------------------------------------------
  it("G7 refuses a calibration drift above the 0.02 budget", () => {
    // The trailing 30 games are grossly miscalibrated (p = 0.5, every one a win) while the
    // trailing 250 are well separated, so the short-horizon ECE exceeds the long-horizon
    // baseline by more than 0.02.
    const samples = calibrationSamples().slice(0, 270);
    for (let i = 0; i < 30; i += 1) samples.push({ p: 0.5, y: 1 });
    const input = draft();
    input.calibration = { ...input.calibration, samples };
    const g7 = runPickGates(input)[6]!;
    expect(g7.gate).toBe(PickGate.G7);
    expect(g7.passed).toBe(false);
    expect(g7.refusal_code).toBe(PICK_GATE_REFUSAL.G7);
    expect(g7.reason).toMatch(/ECE/);
  });

  it("G7 refuses a non-positive Brier Skill Score", () => {
    // One bin, one constant forecast: there is no resolution to speak of, so REL is not below
    // RES and the skill score is not positive.
    const flat: CalibrationSample[] = [];
    for (let i = 0; i < 300; i += 1) flat.push({ p: 0.5, y: i % 2 === 0 ? 0 : 1 });
    const input = draft();
    input.calibration = {
      ...input.calibration,
      samples: flat,
      coverage_errors: new Array(300).fill(0),
    };
    const g7 = runPickGates(input)[6]!;
    expect(g7.passed).toBe(false);
    expect(g7.refusal_code).toBe(PICK_GATE_REFUSAL.G7);
  });

  it("G7 refuses an ACI coverage instability above 0.03", () => {
    const input = draft();
    // Every window misses coverage -> a mean error of 1.0 against an alpha of 0.5.
    input.calibration = {
      ...input.calibration,
      coverage_errors: new Array(300).fill(1),
      aci: { alpha: 0.5 },
    };
    const g7 = runPickGates(input)[6]!;
    expect(g7.passed).toBe(false);
    expect(g7.refusal_code).toBe(PICK_GATE_REFUSAL.G7);
  });

  // --- G8 -----------------------------------------------------------------------------------
  it("G8 refuses a trailing CLV below -0.002 and accepts exactly -0.002", () => {
    const low = draft();
    low.clv = { ...low.clv, observations: [{ value: -0.003, verdict: "LOST_TO_CLOSE" }] };
    expect(runPickGates(low)[7]!.refusal_code).toBe(PICK_GATE_REFUSAL.G8);
    const exact = draft();
    exact.clv = {
      ...exact.clv,
      observations: [{ value: -0.002, verdict: "MATCHED_CLOSE" }],
    };
    expect(runPickGates(exact)[7]!.passed).toBe(true);
  });

  it("G8 refuses a conformal lower-bound edge that does not exceed 0.015", () => {
    // The half-width over the trailing scores is the largest of them, so p_lo = 0.62 - 0.02 = 0.60
    // against a market price of 0.55 -> an edge of 0.05, which passes. Push the market price up
    // so the edge is 0.01.
    const input = draft();
    input.clv = { ...input.clv, market_price: 0.59 };
    const g8 = runPickGates(input)[7]!;
    expect(g8.gate).toBe(PickGate.G8);
    expect(g8.passed).toBe(false);
    expect(g8.refusal_code).toBe(PICK_GATE_REFUSAL.G8);
  });

  it("G8 refuses when there are no CLV observations at all", () => {
    const input = draft();
    input.clv = { ...input.clv, observations: [] };
    const g8 = runPickGates(input)[7]!;
    expect(g8.passed).toBe(false);
    expect(g8.refusal_code).toBe(PICK_GATE_REFUSAL.G8);
  });

  // --- G9 -----------------------------------------------------------------------------------
  it("G9 refuses a price row that was never committed", () => {
    const input = draft();
    input.price_archive = { ...input.price_archive, committed: false };
    const g9 = runPickGates(input)[8]!;
    expect(g9.gate).toBe(PickGate.G9);
    expect(g9.passed).toBe(false);
    expect(g9.refusal_code).toBe(PICK_GATE_REFUSAL.G9);
  });

  it("G9 refuses a committed row whose durability was NOT confirmed by an fsync", () => {
    const input = draft();
    input.price_archive = { ...input.price_archive, fsynced: false };
    const g9 = runPickGates(input)[8]!;
    expect(g9.passed).toBe(false);
    expect(g9.refusal_code).toBe(PICK_GATE_REFUSAL.G9);
    expect(g9.reason).toMatch(/fsync/i);
  });

  it("G9 refuses a row the repository's own validator rejects", () => {
    const input = draft();
    // The price must be a plausible American price (|price| >= 100). 42 is not.
    input.price_archive = {
      ...input.price_archive,
      row: priceRow({ decision_time_price: 42 }),
    };
    const g9 = runPickGates(input)[8]!;
    expect(g9.passed).toBe(false);
    expect(g9.refusal_code).toBe(PICK_GATE_REFUSAL.G9);
  });
});

// =================================================================================================
// SECTION 5 -- THE CONJUNCTION AND THE EMIT
// =================================================================================================

describe("T8_EMIT -- the conjunction is a conjunction: one failing gate publishes NOTHING", () => {
  it("publishes exactly one entry when every gate passes", () => {
    const emission = emitPicks({ certificate: VALID_CERT, gates: passingInput() });
    expect(emission.refusal).toBeNull();
    expect(emission.entries).toHaveLength(1);
    const entry = emission.entries[0]!;
    expect(entry.game_id).toBe("g-1");
    expect(entry.market_id).toBe("m-1");
    expect(entry.published_prob).toBe(0.62);
    expect(entry.edge).toBe(0.07);
    // The audit hash is the repository's own SHA-256 over a canonical projection, so it is a
    // 64-char lowercase hex digest.
    expect(entry.audit_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("reports all nine gate outcomes even on the passing run", () => {
    const emission = emitPicks({ certificate: VALID_CERT, gates: passingInput() });
    expect(emission.gates).toHaveLength(9);
    expect(emission.gates.every((g) => g.passed)).toBe(true);
  });

  it("publishes ZERO picks when G1 fails", () => {
    const input = draft();
    input.bridge = {
      ...input.bridge,
      premises: [{ ...input.bridge.premises[0]!, sample_count: 10 }],
    };
    const emission = emitPicks({ certificate: VALID_CERT, gates: input });
    expect(emission.entries).toHaveLength(0);
    expect(emission.refusal?.refusal_code).toBe(PICK_GATE_REFUSAL.G1);
  });

  it("publishes ZERO picks when G9 fails", () => {
    const input = draft();
    input.price_archive = { ...input.price_archive, fsynced: false };
    const emission = emitPicks({ certificate: VALID_CERT, gates: input });
    expect(emission.entries).toHaveLength(0);
    expect(emission.refusal?.refusal_code).toBe(PICK_GATE_REFUSAL.G9);
  });

  it("publishes ZERO picks -- not a degraded pick -- when ANY ONE gate fails", () => {
    // Every gate is broken in turn, one at a time, and each run must publish nothing. The
    // breakers are listed in the spec's gate order, and each is checked against the gate it
    // breaks, so a refusal can be attributed to the gate that caused it.
    const breakers: readonly {
      readonly gate: string;
      readonly breakIt: (input: GateInputDraft) => void;
    }[] = [
      {
        gate: "G1",
        breakIt: (i) => {
          i.bridge = { ...i.bridge, premises: [] };
        },
      },
      {
        gate: "G2",
        breakIt: (i) => {
          i.literature = { ...i.literature, verdicts: [rejectedVerdict("lit-1")] };
        },
      },
      {
        gate: "G3",
        breakIt: (i) => {
          i.identifiability = { ...i.identifiability, causal_claim: hedgedClaim() };
        },
      },
      {
        gate: "G4",
        breakIt: (i) => {
          i.adversary = adversaryVerdict({ pointEValue: 0.5 });
        },
      },
      {
        gate: "G5",
        breakIt: (i) => {
          i.adversary = adversaryVerdict({ entitySwapDivergence: 0.5 });
        },
      },
      {
        gate: "G6",
        breakIt: (i) => {
          i.conformal = { ...i.conformal, itcr: haltedItcr() };
        },
      },
      {
        gate: "G7",
        breakIt: (i) => {
          i.calibration = {
            ...i.calibration,
            coverage_errors: new Array(300).fill(1),
            aci: { alpha: 0.5 },
          };
        },
      },
      {
        gate: "G8",
        breakIt: (i) => {
          i.clv = { ...i.clv, observations: [{ value: -0.5, verdict: "LOST_TO_CLOSE" }] };
        },
      },
      {
        gate: "G9",
        breakIt: (i) => {
          i.price_archive = { ...i.price_archive, committed: false };
        },
      },
    ];
    expect(breakers).toHaveLength(9);

    for (const { gate, breakIt } of breakers) {
      const input = draft();
      breakIt(input);
      const emission = emitPicks({ certificate: VALID_CERT, gates: input });
      expect(emission.entries, `${gate} must publish nothing`).toHaveLength(0);
      expect(emission.refusal, `${gate} must refuse`).not.toBeNull();
      const failed = emission.gates.filter((g) => !g.passed);
      expect(failed.length, `${gate} must fail`).toBeGreaterThan(0);
      expect(failed.map((g) => g.gate)).toContain(gate);
    }
  });

  it("publishes ZERO picks when the certificate is not publishable", () => {
    for (const certificate of [
      null,
      undefined,
      WITHHELD_CERT,
      INSUFFICIENT_CERT,
      ASSOCIATION_ONLY_CERT,
    ]) {
      const emission = emitPicks({ certificate, gates: passingInput() });
      expect(emission.entries).toHaveLength(0);
      expect(emission.refusal).not.toBeNull();
    }
  });

  it("reports the certificate refusal code, not a gate code, when the certificate is bad", () => {
    const emission = emitPicks({ certificate: WITHHELD_CERT, gates: passingInput() });
    expect(emission.refusal?.refusal_code).toBe(CERTIFICATE_REFUSAL.withheld);
  });
});

// =================================================================================================
// SECTION 6 -- THE SPEC'S CONSTRUCTOR
// =================================================================================================

describe("T8_AUTHORIZE -- authorizeCausalPublish emits a branded trace OR a refusal, never both", () => {
  it("emits a branded trace when the conjunction holds", () => {
    const result = authorizeCausalPublish(VALID_CERT, passingInput());
    expect(isValidatedCausalTrace(result)).toBe(true);
    const trace = result as ValidatedCausalTrace;
    expect(trace.certificate.game_id).toBe("g-1");
  });

  it("emits a REFUSAL when a gate fails, and no trace", () => {
    const input = draft();
    input.clv = { ...input.clv, observations: [{ value: -0.5, verdict: "LOST_TO_CLOSE" }] };
    const result = authorizeCausalPublish(VALID_CERT, input);
    expect(isValidatedCausalTrace(result)).toBe(false);
    expect("refusal_code" in result).toBe(true);
  });

  it("emits a REFUSAL when the certificate is not publishable, and no trace", () => {
    const result = authorizeCausalPublish(ASSOCIATION_ONLY_CERT, passingInput());
    expect(isValidatedCausalTrace(result)).toBe(false);
    expect("refusal_code" in result).toBe(true);
  });
});

// =================================================================================================
// SECTION 7 -- THE DOWNSTREAM BARRIER
// =================================================================================================

describe("T8_MINT -- a downstream function cannot accept an unbranded trace", () => {
  it("mints a board entry from a branded trace, with the certificate's own numbers", () => {
    const trace = validateCertificate(VALID_CERT);
    const entry = mintBoardOrParlayEntry(trace);
    expect(entry.game_id).toBe("g-1");
    expect(entry.market_id).toBe("m-1");
    expect(entry.published_prob).toBe(0.62);
    expect(entry.edge).toBe(0.07);
    expect(entry.audit_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hashes two identical trails identically and two different trails differently", () => {
    const a = validateCertificate({ ...VALID_CERT, audit_trail: [] });
    const b = validateCertificate({ ...VALID_CERT, audit_trail: [] });
    expect(mintBoardOrParlayEntry(a).audit_hash).toBe(mintBoardOrParlayEntry(b).audit_hash);

    const withTrail = validateCertificate({
      ...VALID_CERT,
      audit_trail: [
        {
          item_id: "lit-1",
          source_doc_hash: "b".repeat(64),
          principle_name: "wind",
          triggered_context_field: "wind_speed_mph",
          observed_context_value: 12,
          baseline_context_value: 5,
          evidence_quote: "q",
          evidence_span: { start_char: 0, end_char: 1, verification_tier: "MSVH_S1_EXACT" },
          mechanism_quote: "q",
          mechanism_span: { start_char: 0, end_char: 1, verification_tier: "MSVH_S1_EXACT" },
          numeric_claim: "1.0",
          parsed_delta_applied: 0.01,
          claim_type: "causal",
          confidence_weight: 1,
          resolution_status: "APPLIED",
        },
      ],
    });
    expect(mintBoardOrParlayEntry(withTrail).audit_hash).not.toBe(
      mintBoardOrParlayEntry(a).audit_hash,
    );
  });
});


// =================================================================================================
// SECTION 8 -- THE SWEEP. This is what makes the sixty tests above a GATE rather than a file.
// =================================================================================================

/** The package root, from this file at test/. */
const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** The sweep, relative to the package root. */
const SWEEP_REL = "reconciliation/_mutation_sweep_t8_picks.mjs";

/**
 * The sweep's result, memoised.
 *
 * The sweep takes minutes, and the two assertions below need the SAME run -- one for the exit
 * code and one for the output. Running it twice would double the suite's wall time for no extra
 * evidence, and would double the window in which the source tree is mutated.
 */
let SWEEP_RESULT: { code: number; output: string } | null = null;

/**
 * Run the sweep and return its exit code and its output.
 *
 * The sweep mutates the source tree, so it is run with the working directory set to the package
 * root (where its relative paths resolve) and it is run EXACTLY ONCE per suite run -- the
 * sweep's own child runs are told to skip this invocation.
 */
function runSweep(): { code: number; output: string } {
  if (SWEEP_RESULT) return SWEEP_RESULT;
  try {
    const output = execFileSync(process.execPath, [resolve(PKG, SWEEP_REL)], {
      encoding: "utf8",
      cwd: PKG,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, T8_SWEEP_CHILD: "0" },
    });
    SWEEP_RESULT = { code: 0, output };
  } catch (error) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    SWEEP_RESULT = { code: e.status ?? 1, output: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
  return SWEEP_RESULT;
}

describe("T8_SWEEP -- the mutation sweep that pins the gate", () => {
  /**
   * THE SWEEP IS A GATE, NOT A FILE.
   *
   * The sweep breaks the brand, skips a gate, and makes the emit publish a pick despite a
   * failure, and requires the named test above to STOP passing each time. A sweep that finds
   * nothing proves nothing; a sweep that reports failures and exits 0 is worse than no sweep
   * at all, because it is a gate that reports a false signal. So the exit code is asserted here,
   * AND the sweep's own output is asserted -- an exit code alone does not prove the rounds ran.
   *
   * The sweep is skipped when it is the one running this file (T8_SWEEP_CHILD=1), so the sweep
   * drives the sixty subject tests and this file drives the sweep once.
   */
  it.skipIf(process.env.T8_SWEEP_CHILD === "1")(
    "the mutation sweep exits 0 -- the brand, the nine gates, and the conjunction are pinned",
    () => {
      const { code, output } = runSweep();
      expect(code, `the T8 mutation sweep failed:\n${output}`).toBe(0);
    },
    600_000,
  );

  /**
   * THE SWEEP ACTUALLY RAN ITS ROUNDS.
   *
   * The exit code alone does not prove the rounds ran: a sweep that mutated nothing and found
   * nothing would also exit 0. So the output itself is asserted -- the baseline line (every
   * subject test passed with the unmutated source), the count of detected mutations, and the
   * absence of any surviving mutation.
   */
  it.skipIf(process.env.T8_SWEEP_CHILD === "1")(
    "the sweep actually RAN its rounds -- an exit code alone proves nothing",
    () => {
      const { output } = runSweep();
      // The baseline: every subject test passes with the unmutated source.
      expect(output).toContain("OK baseline: all 61 tests pass");
      // Every declared mutation was detected.
      expect(output).toContain("mutations detected: 6/6; failures: 0");
      expect(output).toContain("SWEEP RESULT: PASS");
      // And no mutation survived.
      expect(output).not.toContain("STILL PASSED");
      expect(output).not.toContain("SWEEP RESULT: FAIL");
    },
    600_000,
  );

  /**
   * THE SWEEP IS FAIL-CLOSED, AND THAT IS ASSERTED FROM THE SOURCE.
   *
   * The defect this test exists to prevent is a sweep that reports failures and still exits 0.
   * The exit code must be derived from the failure count and from nothing else -- so the shape
   * of the exit is read out of the sweep's own source, because a sweep that merely runs and
   * observes to pass today can still be a sweep that would exit 0 on a red baseline tomorrow.
   */
  it("the sweep is fail-closed -- a failure makes it exit non-zero", () => {
    const sweepPath = resolve(PKG, SWEEP_REL);
    expect(existsSync(sweepPath), `the sweep is missing: ${sweepPath}`).toBe(true);
    // Normalised, so a CRLF checkout does not make these assertions vacuous.
    const source = readFileSync(sweepPath, "utf8").replace(/\r\n/g, "\n");

    // The failure count is what the exit code is derived from, and nothing else.
    expect(source).toContain("let broken = 0;");
    expect(source).toContain("broken++;");
    expect(source).toContain("process.exit(broken === 0 ? 0 : 1);");
    // And the sweep's own summary is machine-checkable, so a gate can read it.
    expect(source).toContain("SWEEP RESULT: PASS");
    expect(source).toContain("SWEEP RESULT: FAIL");
  });
});
