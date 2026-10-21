/**
 * T8 -- THE PICK PIPELINE. The compile-time phantom brand and the nine runtime gates G1-G9.
 *
 * THE SPEC'S T8, verbatim from Table 5:
 *
 *   "pick-pipeline.ts | Compile-Time Phantom Brand & Runtime Gates G1-G9: Verifies @ts-expect-error
 *    compile-time rejection on unbranded or WITHHELD/INSUFFICIENT/ASSOCIATION_ONLY certificates and
 *    runtime refusal across all nine gates."
 *
 * AND THE SPEC'S §6.1, verbatim:
 *
 *   "declare const ValidatedCausalTraceBrand: unique symbol;
 *    export type RawTraceConclusion = "AGREED" | "WITHHELD" | "INSUFFICIENT" | "ASSOCIATION_ONLY";
 *    export type PublishableConclusion = Exclude<RawTraceConclusion, "WITHHELD" | "INSUFFICIENT" | "ASSOCIATION_ONLY">;
 *    export interface CausalTraceCertificate<C extends RawTraceConclusion = RawTraceConclusion> { ... }
 *    export type ValidatedCausalTrace = CausalTraceCertificate<PublishableConclusion> & {
 *      readonly [ValidatedCausalTraceBrand]: "VALIDATED_CAUSAL_TRACE_V1";
 *    };"
 *
 * AND THE SPEC'S §6.2, verbatim:
 *
 *   "The constructor authorizeCausalPublish(cert: CausalTraceCertificate): ValidatedCausalTrace |
 *    PublishRefusal emits a ValidatedCausalTrace if and only if the indicator conjunction
 *    G_honesty(t) = PROD_k I(Condition_k) = 1 holds."
 *
 * -------------------------------------------------------------------------------------------
 * WHY THIS FILE EXISTS AT ALL, IN THE REPO'S OWN TERMS.
 *
 * The reconciliation audit (reconciliation/design_spec_reconciliation.md) measured the gap this
 * file closes. Section 1 of that document lists `src/picks/pick-pipeline.ts` among the spec'd
 * module paths that do NOT exist, and section 5 records:
 *
 *   "`pick-pipeline.ts` + the `ValidatedCausalTrace` brand | **NOT BUILT** -- the repo has
 *    `publishablePick: false` as a type-level assertion, which is a *weaker* barrier (it bars
 *    publishing, not bad traces)"
 *
 * So the two things that are genuinely new here, and that did not exist anywhere in the package,
 * are:
 *
 *   1. A COMPILE-TIME BARRIER. Nothing downstream of this file can accept an unbranded object, and
 *      a WITHHELD / INSUFFICIENT / ASSOCIATION_ONLY / MISSING certificate cannot be given the
 *      brand at all -- not by a mistake, not by an `as` cast a careless caller writes, but by the
 *      type system. The spec's §6.1 says it outright: "Compile-time barrier: passing an absent
 *      trace, an unbranded trace, or conclusion === 'WITHHELD' is a TypeScript compiler error
 *      (TS2345)."
 *   2. A RUNTIME CONJUNCTION over NINE conditions, where the conjunction is honest: ANY failure
 *      refuses, and a refusal is a refusal rather than a degraded pick.
 *
 * -------------------------------------------------------------------------------------------
 * REUSE, NOT RE-INVENTION. Every threshold in this file is either lifted from the spec verbatim or
 * REUSED from a module that already holds it, so the two copies cannot drift:
 *
 *   G1's sample floor (30)          -- the spec's N_min; the repo's own floor for an E-value arm
 *                                      is also 30 (hcid-mediator-expansion.ts).
 *   G1's coverage floor (0.65)      -- the spec's Cov_sig,t.
 *   G2's consensus floor (0.20)     -- mind-reasoning.ts's conflict deadband (eta_c < 0.20).
 *   G3's positivity floor (0.01)    -- causal-claim-gate.ts's minPositivity default.
 *   G4's E-value floors (1.35/1.10) -- adversary-red-team.ts MIN_POINT_E_VALUE / MIN_CI_E_VALUE.
 *   G4's placebo ceiling (0.005)    -- adversary-red-team.ts MAX_PLACEBO_LEAK.
 *   G5's entity-swap limit (0.02)   -- adversary-red-team.ts MAX_ENTITY_SWAP_DIVERGENCE.
 *   G5's RA floor (0.85)            -- adversary-red-team.ts MIN_CAUSALPHYS_RA.
 *   G6's conformal comparison        -- itcr-orca-gate.ts's alpha_ITCR <= tau_conformal.
 *   G6's copula bounds              -- conformal-copula-kelly.ts frechetHoeffdingBounds.
 *   G7's ECE / REL / RES            -- probability-calibration.ts expectedCalibrationError and
 *                                      brierDecomposition.
 *   G7's ACI level                  -- temporal-conformal.ts's AciState.alpha.
 *   G8's CLV aggregation            -- clv.ts summarizeClv (the repo has no trailing-window CLV,
 *                                      so the window is sliced HERE, once).
 *   G8's conformal half-width       -- conformal-copula-kelly.ts slowConformalHalfWidth.
 *   G9's row validation              -- decision-time-price-archive.ts validateDecisionTimePriceRow.
 *   The published entry's audit hash -- edge-lab/provenance.ts canonicalJson + sha256Hex.
 *
 * The gate EVIDENCE is typed with the repository's own verdict types wherever one exists:
 * `CausalClaimVerdict` (G3), `AdversaryRedTeamVerdict` (G4, G5), `ItcrGateResult` (G6),
 * `VerificationVerdict` (G2), `CalibrationSample` (G7), `ClvVerdict` (G8), and
 * `DecisionTimePriceRow` (G9). This file does not invent a parallel shape for a measurement the
 * repository already measures.
 *
 * WHAT THE REPO DOES NOT HAVE AND THIS FILE THEREFORE SUPPLIES, HONESTLY:
 *
 *   - The fsync in G9. `recordDecisionTimePrice` (edge-lab/decision-time-price-archive.ts) is
 *     ASYNC and returns `{ok, path, day, bytes}`; it does NOT fsync, and there is no fsync call
 *     anywhere in the package's src/ tree. The spec's G9 demands "synchronous fsync confirmation
 *     with finite price and p_t in (0, 1) prior to returning ValidatedCausalTrace". So G9 here
 *     takes a commit RECEIPT -- the caller's own durable write -- and checks it, rather than
 *     pretending the repository's async recorder provides a durability guarantee it does not
 *     provide. The recorder's row validation is still the one that is used
 *     (validateDecisionTimePriceRow), so the price band, the (0,1) probability band, the edge
 *     identity and the covariates hash are the repository's rules, not this file's.
 *
 *   - The G5 faithfulness terms EF and DC. The spec's G5 names EF(R,G) >= 0.95 and DC(R,G) >= 0.90.
 *     The package has no module that computes either (there is no `evidence_faithfulness` or
 *     `decision_coherence` symbol anywhere in src/). So G5 takes them as MEASURED INPUTS and
 *     refuses when they are absent. A measurement that could not be taken is not a measurement
 *     that cleared its floor -- the same rule the rest of the package follows.
 *
 *   - The G1 premise list, the G2 premise verdicts, the G6 conformal trace, the G7 calibration
 *     window, the G8 CLV history and the G9 commit receipt. These are INPUTS: the pipeline gates
 *     the evidence it is handed, it does not re-derive the evidence. The one thing the pipeline
 *     DOES derive is the conjunction, and it derives it honestly.
 *
 * PURE AND DETERMINISTIC. No I/O, no clock, no randomness. The only side effect anywhere near this
 * file is the CALLER's, when it commits a decision-time price row and hands the receipt in.
 */
import {
  MIN_POINT_E_VALUE,
  MIN_CI_E_VALUE,
  MAX_PLACEBO_LEAK,
  MAX_ENTITY_SWAP_DIVERGENCE,
  MIN_CAUSALPHYS_RA,
  type AdversaryRedTeamVerdict,
} from "../causal/adversary-red-team.js";
import { G3_REFUSAL, type CausalClaimVerdict } from "../causal/causal-claim-gate.js";
import type { ItcrGateResult } from "../calibration/itcr-orca-gate.js";
import {
  frechetHoeffdingBounds,
  slowConformalHalfWidth,
  type FrechetHoeffdingBounds,
} from "../calibration/conformal-copula-kelly.js";
import type { AciState } from "../calibration/temporal-conformal.js";
import {
  brierDecomposition,
  expectedCalibrationError,
  type CalibrationSample,
} from "../probability-calibration.js";
import { summarizeClv, type ClvVerdict } from "../clv.js";
import {
  validateDecisionTimePriceRow,
  type DecisionTimePriceRow,
} from "../edge-lab/decision-time-price-archive.js";
import { canonicalJson, sha256Hex } from "../edge-lab/provenance.js";
import type { VerificationVerdict } from "../literature/literature-verification.js";
import type { PrincipleApplicationAuditRecord } from "../reasoning/mind-reasoning.js";

// =================================================================================================
// SECTION 1 -- THE CERTIFICATE AND ITS STATES
// =================================================================================================

/**
 * The states a causal trace certificate can be in.
 *
 * The spec's §6.1 names three non-publishable states ("WITHHELD", "INSUFFICIENT",
 * "ASSOCIATION_ONLY") and one publishable one, which the spec calls "AGREED". This file calls the
 * publishable one "VALID", because that is the name the T8 contract uses and because "VALID" says
 * what the type system does with it: only "VALID" can carry the brand.
 *
 * "MISSING" is the state of a certificate that was never produced. It is a state of the SLOT, not
 * of a certificate object, and it is modelled here as the nullable input to the validator so that
 * "no certificate at all" is refused by the same machinery, with its own reason code, rather than
 * being a crash or a silent null check.
 */
export type CertificateState =
  | "VALID"
  | "WITHHELD"
  | "INSUFFICIENT"
  | "ASSOCIATION_ONLY"
  | "MISSING";

/** The five certificate states, by name. */
export const CERTIFICATE_STATE = {
  VALID: "VALID",
  WITHHELD: "WITHHELD",
  INSUFFICIENT: "INSUFFICIENT",
  ASSOCIATION_ONLY: "ASSOCIATION_ONLY",
  MISSING: "MISSING",
} as const;

/**
 * The states a certificate may hold and still be published. Strictly "VALID".
 *
 * `Extract` over a literal union, not a hand-written list, so adding a state to
 * `CertificateState` cannot silently widen what is publishable.
 */
export type PublishableState = Extract<CertificateState, "VALID">;

/**
 * THE CERTIFICATE. The evidence one pick rests on.
 *
 * The generic parameter is the WHOLE POINT of the compile-time barrier: a certificate whose
 * `state` is "WITHHELD" is not a `CausalCertificate<"VALID">`, and the brand requires
 * `CausalCertificate<"VALID">`. So a WITHHELD certificate cannot be laundered into a publishable
 * one by widening a type parameter -- the compiler stops it.
 *
 * The spec's §6.1 calls this field `conclusion`; this file calls it `state` because that is what
 * the T8 contract calls it, and because the state names it fixes (VALID / WITHHELD / INSUFFICIENT
 * / ASSOCIATION_ONLY / MISSING) are the ones a caller branches on.
 */
export interface CausalCertificate<S extends CertificateState = CertificateState> {
  /** The state of this certificate. Only "VALID" may be branded. */
  readonly state: S;
  readonly game_id: string;
  readonly market_id: string;
  /** The engine's probability for the pick, in (0,1). */
  readonly true_prob: number;
  /** The market's vig-free probability for the pick, in (0,1). */
  readonly market_vig_free_prob: number;
  /** true_prob - market_vig_free_prob. */
  readonly edge: number;
  /** The premise audit trail the conclusion rests on. */
  readonly audit_trail: readonly PrincipleApplicationAuditRecord[];
}

/** A certificate whose state is "VALID" -- the only kind that may be branded. */
export type PublishableCertificate = CausalCertificate<PublishableState>;

// =================================================================================================
// SECTION 2 -- THE PHANTOM BRAND
// =================================================================================================

/**
 * THE BRAND KEY.
 *
 * A module-private `unique symbol`, NOT exported. Two consequences, both wanted:
 *
 *   1. The property name is not nameable from outside this module, so no caller can write it into
 *      an object literal. An unbranded object literal `{ certificate: someCert }` is therefore not
 *      assignable to `ValidatedCausalTrace`, and TypeScript says so (TS2345).
 *   2. At RUNTIME the key still exists, so the brand is not merely a type-level fiction: a branded
 *      trace literally carries it, and `isValidatedCausalTrace` can check it. A hand-built object
 *      literal cannot fake it, because it cannot name the key.
 *
 * Why a runtime symbol rather than the spec's `declare const`: the spec's §6.1 writes
 * `declare const ValidatedCausalTraceBrand: unique symbol;`, which has NO runtime existence at all
 * -- so under that spelling nothing can be checked at runtime and the "brand" would be a comment
 * on a type. This file keeps the spec's shape (a `unique symbol` keyed property carrying the
 * spec's literal "VALIDATED_CAUSAL_TRACE_V1") and gives the key a runtime existence, so the
 * barrier is enforced in BOTH spaces. The key stays private, so the property is still unwritable
 * from outside -- which is what makes the brand unforgeable.
 */
const ValidatedCausalTraceBrand: unique symbol = Symbol(
  "sports.prediction-engine.ValidatedCausalTrace.v1",
);

/** The literal the brand property must carry. */
export type ValidatedCausalTraceBrandValue = "VALIDATED_CAUSAL_TRACE_V1";

/**
 * A causal trace that has been VALIDATED: it passed every runtime gate, and it carries the
 * compile-time brand.
 *
 * THE BRAND IS NOMINAL, NOT STRUCTURAL. `ValidatedCausalTrace` is not merely
 * `CausalCertificate<"VALID">`; it is that PLUS a property keyed by a symbol no caller can name.
 * Two consequences the spec cares about:
 *
 *   - An unbranded object is rejected at compile time (TS2345). There is no way to write the
 *     property, so there is no way to satisfy the type.
 *   - A WITHHELD / INSUFFICIENT / ASSOCIATION_ONLY / MISSING certificate is rejected at compile time
 *     too, and not only because of the brand: `certificate` is `CausalCertificate<"VALID">`, so a
 *     certificate in any other state fails the type on its own.
 */
export type ValidatedCausalTrace = {
  readonly certificate: PublishableCertificate;
  readonly [ValidatedCausalTraceBrand]: ValidatedCausalTraceBrandValue;
};

/**
 * THE CERTIFICATE-STATE REFUSAL CODES.
 *
 * One code per non-publishable state, so a caller can tell "we declined to say" from "we could
 * not say" from "we are only allowed to say it associatively" from "there was nothing to check". A
 * single generic "invalid" code would throw away the distinction the whole point of the states is.
 */
export const CERTIFICATE_REFUSAL = {
  /** No certificate was supplied at all. */
  missing: "REFUSED_CERTIFICATE_MISSING",
  /** The certificate exists and says WITHHELD. */
  withheld: "REFUSED_CERTIFICATE_WITHHELD",
  /** The certificate exists and says INSUFFICIENT. */
  insufficient: "REFUSED_CERTIFICATE_INSUFFICIENT",
  /** The certificate exists and says ASSOCIATION_ONLY. */
  associationOnly: "REFUSED_CERTIFICATE_ASSOCIATION_ONLY",
} as const;

export type CertificateRefusalCode =
  (typeof CERTIFICATE_REFUSAL)[keyof typeof CERTIFICATE_REFUSAL];

/** Every refusal this module can emit: a certificate-state refusal or a gate refusal. */
export type PublishRefusalCode = CertificateRefusalCode | PickGateRefusalCode;

/** A refusal to publish, with a machine-readable code and a sentence a human reads. */
export interface PublishRefusal {
  readonly refusal_code: PublishRefusalCode;
  readonly reason: string;
}

/** The outcome of a non-throwing validation attempt. */
export type CertificateValidation =
  | { readonly ok: true; readonly trace: ValidatedCausalTrace }
  | { readonly ok: false; readonly refusal: PublishRefusal };

/** The reason a certificate in a given state is refused. */
function refusalForState(state: CertificateState): PublishRefusal {
  switch (state) {
    case "MISSING":
      return {
        refusal_code: CERTIFICATE_REFUSAL.missing,
        reason:
          "no causal trace certificate was supplied, so there is nothing to publish; " +
          "a missing certificate is not a publishable one",
      };
    case "WITHHELD":
      return {
        refusal_code: CERTIFICATE_REFUSAL.withheld,
        reason:
          "the certificate is WITHHELD: the engine declined to state a conclusion, and a " +
          "declined conclusion cannot be published as one",
      };
    case "INSUFFICIENT":
      return {
        refusal_code: CERTIFICATE_REFUSAL.insufficient,
        reason:
          "the certificate is INSUFFICIENT: the evidence does not support a conclusion, and an " +
          "unsupported conclusion cannot be published as one",
      };
    case "ASSOCIATION_ONLY":
      return {
        refusal_code: CERTIFICATE_REFUSAL.associationOnly,
        reason:
          "the certificate is ASSOCIATION_ONLY: the engine may state that the variables move " +
          "together, but not that one causes the other, so the causal brand cannot be applied",
      };
    case "VALID":
      // Unreachable: the validator only calls this for a non-VALID state. Throwing rather than
      // returning a refusal keeps the type honest -- a refusal for a VALID certificate would be a
      // lie, and a caller that reaches it has a bug.
      throw new Error("pick-pipeline: refusalForState called with the VALID state");
  }
}

/**
 * VALIDATE A CERTIFICATE AND BRAND IT.
 *
 * THROWS on a missing, WITHHELD, INSUFFICIENT or ASSOCIATION_ONLY certificate. The throw is the
 * point: the alternative -- returning null and letting the caller check -- is how an unbranded
 * value leaks downstream, because every call site then has to remember to check.
 *
 * The returned trace is the ONLY way to obtain a `ValidatedCausalTrace` in this package. There is
 * no other export that produces one, and the brand property cannot be written from outside.
 *
 * @throws Error whose message is the refusal's reason.
 */
export function validateCertificate(
  certificate: CausalCertificate | null | undefined,
): ValidatedCausalTrace {
  const result = tryValidateCertificate(certificate);
  if (!result.ok) {
    throw new Error(`pick-pipeline: ${result.refusal.refusal_code}: ${result.refusal.reason}`);
  }
  return result.trace;
}

/**
 * VALIDATE A CERTIFICATE WITHOUT THROWING.
 *
 * The same decision as `validateCertificate`, returned as a value. A caller that wants to branch
 * on the refusal rather than catch an exception uses this; the two MUST NOT disagree, so this
 * function is the single implementation and `validateCertificate` is the thin throwing wrapper
 * around it.
 */
export function tryValidateCertificate(
  certificate: CausalCertificate | null | undefined,
): CertificateValidation {
  if (certificate === null || certificate === undefined) {
    return { ok: false, refusal: refusalForState("MISSING") };
  }
  if (certificate.state !== "VALID") {
    return { ok: false, refusal: refusalForState(certificate.state) };
  }
  // The brand property is written here and nowhere else in the package. The cast is the ONLY place
  // the type system is asked to believe something it cannot check, and it is checked above:
  // `certificate.state` is "VALID" by this point, so the certificate really is a
  // CausalCertificate<"VALID">.
  const trace = {
    certificate: certificate as PublishableCertificate,
    [ValidatedCausalTraceBrand]: "VALIDATED_CAUSAL_TRACE_V1",
  } as ValidatedCausalTrace;
  return { ok: true, trace };
}

/**
 * IS THIS A BRANDED TRACE?
 *
 * The runtime half of the barrier. A branded trace carries the private brand key; a hand-built
 * object literal cannot, because the key is not nameable from outside this module. So this is not
 * "does it have the right shape" -- it is "was this minted by validateCertificate".
 */
export function isValidatedCausalTrace(value: unknown): value is ValidatedCausalTrace {
  if (typeof value !== "object" || value === null) return false;
  const branded = value as Record<symbol, unknown>;
  return branded[ValidatedCausalTraceBrand] === "VALIDATED_CAUSAL_TRACE_V1";
}

// =================================================================================================
// SECTION 3 -- THE NINE GATES
// =================================================================================================

/** The nine gate ids. */
export const PickGate = {
  G1: "G1",
  G2: "G2",
  G3: "G3",
  G4: "G4",
  G5: "G5",
  G6: "G6",
  G7: "G7",
  G8: "G8",
  G9: "G9",
} as const;

export type PickGateId = (typeof PickGate)[keyof typeof PickGate];

/** The nine gates, in the order the spec's §6.2 table lists them. */
export const PICK_GATE_ORDER: readonly PickGateId[] = [
  PickGate.G1,
  PickGate.G2,
  PickGate.G3,
  PickGate.G4,
  PickGate.G5,
  PickGate.G6,
  PickGate.G7,
  PickGate.G8,
  PickGate.G9,
];

/**
 * THE REFUSAL CODES, one per gate, verbatim from the spec's §6.2 table.
 *
 * The codes are the CONTRACT. A caller branches on them, so they are frozen strings and each
 * gate's code is distinct from every other gate's.
 */
export const PICK_GATE_REFUSAL = {
  G1: "REFUSED_G1_INSUFFICIENT_BRIDGE_SAMPLES",
  G2: "REFUSED_G2_UNGROUNDED_OR_CONFLICTED_LIT",
  G3: "REFUSED_G3_NON_IDENTIFIABLE_HEDGE",
  G4: "REFUSED_G4_FRAGILE_E_VALUE_OR_PLACEBO",
  G5: "REFUSED_G5_ENTITY_BIAS_OR_LOW_RA",
  G6: "REFUSED_G6_CONFORMAL_STOP_OR_FRECHET_VIOLATION",
  G7: "REFUSED_G7_CALIBRATION_DRIFT_OR_MISCOVERAGE",
  G8: "REFUSED_G8_NEGATIVE_CLV_OR_SUBTHRESHOLD_EDGE",
  G9: "REFUSED_G9_PRICE_ARCHIVE_WRITE_FAIL",
} as const;

export type PickGateRefusalCode =
  (typeof PICK_GATE_REFUSAL)[keyof typeof PICK_GATE_REFUSAL];

/** The outcome of one gate. */
export interface GateOutcome {
  /** Which gate this is. */
  readonly gate: PickGateId;
  /** True when the gate's condition held. */
  readonly passed: boolean;
  /** The gate's refusal code. Null when the gate passed. */
  readonly refusal_code: PickGateRefusalCode | null;
  /** Why the gate refused, in a sentence. Null when the gate passed. */
  readonly reason: string | null;
}

// -------------------------------------------------------------------------------------------------
// THE INPUT. One group per gate, so a missing measurement is a missing FIELD, not a silent zero.
// -------------------------------------------------------------------------------------------------

/** One active signal premise, for G1. */
export interface BridgePremise {
  /** A stable id for the premise, so a refusal can name it. */
  readonly premise_id: string;
  /** The premise's sample count, N_s. Must be >= 30. */
  readonly sample_count: number;
  /** The premise's probability, p_s. Must be strictly inside (0,1). */
  readonly probability: number;
  /**
   * The premise's direction. Must be -1 or +1.
   *
   * The domain is the repository's own (bridge-model.ts's `homeSign`), which is -1 | 0 | 1 -- and
   * the ZERO is the case the audit measured: "the engine has NO gate that requires a premise to
   * be DIRECTIONAL before it votes". A premise with no direction cannot support a directional
   * claim, so G1 refuses it.
   */
  readonly home_sign: -1 | 0 | 1;
}

/** G1's evidence: the active bridge premises and the signal coverage. */
export interface BridgeGateInput {
  /** The active premises, S_active. */
  readonly premises: readonly BridgePremise[];
  /**
   * Cov_sig,t: the fraction of registered signal families present. Must be >= 0.65.
   *
   * It is one number for the whole pick, not one per premise: section 5.1 defines it as "the
   * fraction of registered signal families present", and the spec's G1 row lists it inside the
   * conjunction without indexing it by s.
   */
  readonly signal_coverage: number;
}

/** G2's evidence: the active literature premises and the conflict consensus. */
export interface LiteratureGateInput {
  /**
   * The active literature premises' verification verdicts, M_c^active.
   *
   * The repository's `VerificationVerdict` already carries the spec's L1-L4 as four booleans plus
   * the `admitted` conjunction and the list of failed layers, so the gate reads the repository's
   * own verdict rather than a parallel shape.
   */
  readonly verdicts: readonly VerificationVerdict[];
  /**
   * The conflict consensus over those premises, eta_c.
   *
   * `conflict_count` is how many premises are in conflict. Zero means the set is empty, which the
   * spec allows ("either M_c^active = empty (pure bridge) or eta_c >= 0.20"), and it also covers
   * the case where the premises agree: mind-reasoning.ts's deadband fires only when there are
   * opposing claims.
   */
  readonly conflict_consensus: {
    /** The directional consensus ratio, eta_c. Must be >= 0.20 when there is a conflict. */
    readonly consensus_ratio: number;
    /** How many premises are in conflict. */
    readonly conflict_count: number;
  };
}

/** G3's evidence: the causal-claim verdict and the intervention's positivity. */
export interface IdentifiabilityGateInput {
  /** The verdict from the repository's own do-calculus gate. */
  readonly causal_claim: CausalClaimVerdict;
  /**
   * The positivity of the intervention, P(x | Pa(X)_G \ X). Null when unmeasured.
   *
   * The spec's G3 makes positivity a conjunct of G3 itself, and the repository's gate only
   * enforces it on the identified path, so the pipeline re-checks the measured value against the
   * spec's floor rather than inferring it from the verdict.
   */
  readonly positivity: number | null;
}

/** G5's rationale-graph faithfulness measurements the repository does not compute. */
export interface RationaleFaithfulness {
  /** EF(R,G): the evidence-fidelity score. Must be >= 0.95. */
  readonly evidence_faithfulness: number | null;
  /** DC(R,G): the decision-coherence score. Must be >= 0.90. */
  readonly decision_coherence: number | null;
}

/** One SGP joint, for G6's copula bound. */
export interface SgpJoint {
  readonly label: string;
  /** The marginal probability of leg A. */
  readonly pa: number;
  /** The marginal probability of leg B. */
  readonly pb: number;
  /** The joint probability of A and B. */
  readonly joint: number;
}

/** G6's evidence: the conformal gate result and the SGP joints. */
export interface ConformalGateInput {
  /** The verdict from the repository's own inference-time conformal gate. */
  readonly itcr: ItcrGateResult;
  /** The SGP joints, for the Frechet-Hoeffding copula bound. */
  readonly sgp_joints: readonly SgpJoint[];
}

/** G7's evidence: the calibration window. */
export interface CalibrationWindow {
  /** The trailing samples. */
  readonly samples: readonly CalibrationSample[];
  /**
   * The trailing coverage errors, err_k. 0 = covered, 1 = not covered.
   *
   * The spec's G7 sums (err_k - alpha) over the window, so err is the 0/1 miscoverage indicator
   * and alpha is the ACI's adapted level.
   */
  readonly coverage_errors: readonly number[];
  /** The ACI state, whose `alpha` is the adapted miscoverage level. */
  readonly aci: AciState;
}

/** One settled pick's closing-line value, for G8. */
export interface ClvObservation {
  /** The signed CLV of the pick. */
  readonly value: number;
  /** The pick's CLV verdict. */
  readonly verdict: ClvVerdict;
}

/** G8's evidence: the trailing CLV history and the conformal edge. */
export interface ClvGateInput {
  /** The CLV observations, most recent last. */
  readonly observations: readonly ClvObservation[];
  /** The engine's point probability for the pick, p_t. */
  readonly point_forecast: number;
  /** The trailing nonconformity scores the slow conformal half-width is computed over. */
  readonly trailing_scores: readonly number[];
  /** The vig-free market price, q_market. */
  readonly market_price: number;
}

/** G9's evidence: the decision-time price archive commit receipt. */
export interface PriceArchiveCommit {
  /** The committed row. */
  readonly row: DecisionTimePriceRow;
  /** True when the write was committed. */
  readonly committed: boolean;
  /** True when the commit was confirmed durable by an fsync. */
  readonly fsynced: boolean;
}

/** Everything the nine gates read. */
export interface PickGateInput {
  /** G1: the active bridge premises and the signal coverage. */
  readonly bridge: BridgeGateInput;
  /** G2: the active literature premises and the conflict consensus. */
  readonly literature: LiteratureGateInput;
  /** G3: the causal-claim verdict and the positivity. */
  readonly identifiability: IdentifiabilityGateInput;
  /** G4 and G5: the adversary red-team verdict. */
  readonly adversary: AdversaryRedTeamVerdict;
  /** G5: the rationale-graph faithfulness measurements. */
  readonly rationale: RationaleFaithfulness;
  /** G6: the conformal gate result and the SGP joints. */
  readonly conformal: ConformalGateInput;
  /** G7: the calibration window. */
  readonly calibration: CalibrationWindow;
  /** G8: the trailing CLV history and the conformal edge. */
  readonly clv: ClvGateInput;
  /** G9: the decision-time price archive commit. */
  readonly price_archive: PriceArchiveCommit;
}

// -------------------------------------------------------------------------------------------------
// THE THRESHOLDS. Reused from the modules that already hold them.
// -------------------------------------------------------------------------------------------------

/**
 * G1's sample floor, N_min = 30.
 *
 * The spec's number. The repo's own floor for an E-value arm is also 30
 * (hcid-mediator-expansion.ts, MIN_MEDIATOR_SAMPLES), so this is the repo's floor too.
 */
export const MIN_BRIDGE_PREMISE_SAMPLES = 30;

/** G1's coverage floor, Cov_sig,t >= 0.65. */
export const MIN_SIGNAL_COVERAGE = 0.65;

/**
 * G2's conflict-consensus floor, eta_c >= 0.20.
 *
 * The spec's number, and the same deadband mind-reasoning.ts uses (it neutralizes a conflicting
 * adjustment when the consensus ratio falls below 0.20).
 */
export const MIN_CONSENSUS_RATIO = 0.2;

/** G3's positivity floor, P(x | Pa(X)_G \ X) >= 0.01. */
export const MIN_POSITIVITY = 0.01;

/** G5's evidence-fidelity floor, EF(R,G) >= 0.95. */
export const MIN_EVIDENCE_FAITHFULNESS = 0.95;

/** G5's decision-coherence floor, DC(R,G) >= 0.90. */
export const MIN_DECISION_COHERENCE = 0.9;

/** G7's calibration-drift budget, ECE_30 - ECE_250 <= 0.02. */
export const MAX_CALIBRATION_DRIFT = 0.02;

/** G7's ACI coverage-stability budget, |mean(err_k) - alpha| <= 0.03. */
export const MAX_COVERAGE_INSTABILITY = 0.03;

/** G7's trailing window for the short-horizon ECE, ECE_30. */
export const CALIBRATION_SHORT_WINDOW = 30;

/** G7's trailing window for the long-horizon baseline ECE, ECE_250. */
export const CALIBRATION_LONG_WINDOW = 250;

/** G8's trailing CLV window: the spec's trailing 50-evaluation family. */
export const CLV_TRAILING_WINDOW = 50;

/** G8's CLV floor, mean CLV_50 >= -0.002. */
export const MIN_TRAILING_CLV = -0.002;

/** G8's edge floor, p_lo_conf - q_market > 0.015. */
export const MIN_CONFORMAL_EDGE = 0.015;

/** The bin count the ECE and the Murphy decomposition are computed over. */
export const CALIBRATION_BINS = 10;

// -------------------------------------------------------------------------------------------------
// THE GATES.
// -------------------------------------------------------------------------------------------------

/** G1 -- Bridge Premise & Sample Sufficiency. */
function gateG1(input: PickGateInput): GateOutcome {
  const bridge = input.bridge;
  if (bridge.premises.length === 0) {
    return {
      gate: PickGate.G1,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G1,
      reason:
        "no active bridge premise was supplied, so the premise and sample sufficiency " +
        "condition cannot be demonstrated",
    };
  }
  for (const premise of bridge.premises) {
    if (premise.sample_count < MIN_BRIDGE_PREMISE_SAMPLES) {
      return {
        gate: PickGate.G1,
        passed: false,
        refusal_code: PICK_GATE_REFUSAL.G1,
        reason:
          `premise ${premise.premise_id} has ${premise.sample_count} samples, below the ` +
          `floor of ${MIN_BRIDGE_PREMISE_SAMPLES}`,
      };
    }
    if (!(premise.probability > 0 && premise.probability < 1)) {
      return {
        gate: PickGate.G1,
        passed: false,
        refusal_code: PICK_GATE_REFUSAL.G1,
        reason:
          `premise ${premise.premise_id} has probability ${premise.probability}, which is ` +
          `not strictly inside (0,1)`,
      };
    }
    // The direction requirement. A sign of 0 is the case the audit measured: the premise has no
    // direction, so it cannot vote on a direction.
    if (premise.home_sign === 0) {
      return {
        gate: PickGate.G1,
        passed: false,
        refusal_code: PICK_GATE_REFUSAL.G1,
        reason:
          `premise ${premise.premise_id} has no direction (homeSign = 0); a premise that ` +
          `does not point either way cannot support a directional claim`,
      };
    }
  }
  if (!(bridge.signal_coverage >= MIN_SIGNAL_COVERAGE)) {
    return {
      gate: PickGate.G1,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G1,
      reason:
        `the signal coverage ${bridge.signal_coverage} is below the floor of ` +
        `${MIN_SIGNAL_COVERAGE}`,
    };
  }
  return { gate: PickGate.G1, passed: true, refusal_code: null, reason: null };
}

/** G2 -- Literature Grounding & Conflict Consensus. */
function gateG2(input: PickGateInput): GateOutcome {
  for (const verdict of input.literature.verdicts) {
    if (!verdict.admitted) {
      return {
        gate: PickGate.G2,
        passed: false,
        refusal_code: PICK_GATE_REFUSAL.G2,
        reason:
          `literature premise ${verdict.item_id} failed the L1-L4 verification ` +
          `conjunction (failed layers: ${verdict.failed_layers.join(", ") || "none reported"})`,
      };
    }
  }
  // The consensus condition applies only when there IS a conflict. With no conflicting premise
  // the set is empty, which the spec allows ("either M_c^active = empty (pure bridge) or
  // eta_c >= 0.20"), and it also covers the case where the premises agree: mind-reasoning.ts's
  // deadband fires only when there are opposing claims.
  const consensus = input.literature.conflict_consensus;
  if (consensus.conflict_count > 0 && !(consensus.consensus_ratio >= MIN_CONSENSUS_RATIO)) {
    return {
      gate: PickGate.G2,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G2,
      reason:
        `the conflicting literature premises have a consensus ratio of ` +
        `${consensus.consensus_ratio}, below the floor of ${MIN_CONSENSUS_RATIO}`,
    };
  }
  return { gate: PickGate.G2, passed: true, refusal_code: null, reason: null };
}

/** G3 -- Shpitser-Pearl do-Calculus Identifiability. */
function gateG3(input: PickGateInput): GateOutcome {
  const identifiability = input.identifiability;
  const claim = identifiability.causal_claim;
  if (claim.hedge_count !== 0) {
    return {
      gate: PickGate.G3,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G3,
      reason:
        `the effect is blocked by ${claim.hedge_count} witnessing hedge(s), so it is not ` +
        `identified in the supplied graph`,
    };
  }
  // A hedge is the spec's headline refusal; a positivity violation is a different failure with
  // the repository's own code, and it is reported as such rather than flattened into the hedge
  // code. The spec's G3 code is the one this gate owns; the detail rides in the reason.
  if (claim.refusal_code === G3_REFUSAL.positivityViolation) {
    return {
      gate: PickGate.G3,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G3,
      reason: `the effect is identified but the intervention violates positivity: ${claim.reason}`,
    };
  }
  if (!claim.publishable) {
    return {
      gate: PickGate.G3,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G3,
      reason: `the effect is not publishable as causal: ${claim.reason}`,
    };
  }
  // Positivity is a conjunct of the spec's G3, and an unmeasured positivity is not a satisfied
  // one -- the same rule causal-claim-gate.ts applies on the identified path.
  if (identifiability.positivity === null) {
    return {
      gate: PickGate.G3,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G3,
      reason:
        "the positivity condition could not be checked: P(x | Pa(X) \\ X) was not supplied, " +
        "and a positivity that cannot be checked is not a positivity that held",
    };
  }
  if (!(identifiability.positivity >= MIN_POSITIVITY)) {
    return {
      gate: PickGate.G3,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G3,
      reason:
        `the intervention violates positivity: P(x | Pa(X) \\ X) = ` +
        `${identifiability.positivity} is below the floor of ${MIN_POSITIVITY}`,
    };
  }
  return { gate: PickGate.G3, passed: true, refusal_code: null, reason: null };
}

/** G4 -- Adversary E-Value & Counterfactual Survival. */
function gateG4(input: PickGateInput): GateOutcome {
  const measurements = input.adversary.measurements;
  const point = measurements.pointEValue;
  const ci = measurements.ciEValue;
  const placebo = measurements.placeboLeak;

  if (point === null) {
    return {
      gate: PickGate.G4,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G4,
      reason:
        `the point E-value was never measured, so the floor of ${MIN_POINT_E_VALUE} cannot ` +
        `be demonstrated`,
    };
  }
  if (!(point >= MIN_POINT_E_VALUE)) {
    return {
      gate: PickGate.G4,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G4,
      reason: `the point E-value ${point} is below the floor of ${MIN_POINT_E_VALUE}`,
    };
  }
  if (ci === null) {
    return {
      gate: PickGate.G4,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G4,
      reason:
        `the CI E-value was never measured, so the floor of ${MIN_CI_E_VALUE} cannot be ` +
        `demonstrated`,
    };
  }
  if (!(ci >= MIN_CI_E_VALUE)) {
    return {
      gate: PickGate.G4,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G4,
      reason: `the CI E-value ${ci} is below the floor of ${MIN_CI_E_VALUE}`,
    };
  }
  if (placebo === null) {
    return {
      gate: PickGate.G4,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G4,
      reason:
        `the placebo permutation leak was never measured, so the ceiling of ` +
        `${MAX_PLACEBO_LEAK} cannot be demonstrated`,
    };
  }
  if (!(Math.abs(placebo) <= MAX_PLACEBO_LEAK)) {
    return {
      gate: PickGate.G4,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G4,
      reason: `the placebo permutation leak ${placebo} exceeds the ceiling of ${MAX_PLACEBO_LEAK}`,
    };
  }
  return { gate: PickGate.G4, passed: true, refusal_code: null, reason: null };
}

/** G5 -- Entity-Swap & Rationale Graph Faithfulness. */
function gateG5(input: PickGateInput): GateOutcome {
  const swap = input.adversary.measurements.entitySwapDivergence;
  if (swap === null) {
    return {
      gate: PickGate.G5,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G5,
      reason:
        `the entity-swap divergence was never measured, so the limit of ` +
        `${MAX_ENTITY_SWAP_DIVERGENCE} cannot be demonstrated`,
    };
  }
  // The spec's condition is STRICT: ||p_orig - p_swapped|| < 0.02. A divergence of exactly 0.02
  // does not pass. The repository's T6 gate refuses at-or-above the limit, which is the same
  // comparison.
  if (!(swap < MAX_ENTITY_SWAP_DIVERGENCE)) {
    return {
      gate: PickGate.G5,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G5,
      reason:
        `the entity-swap divergence ${swap} is not below the limit of ` +
        `${MAX_ENTITY_SWAP_DIVERGENCE}; the finding is about that entity, not a causal relation`,
    };
  }
  // The repository's T6 gate measures the spec's RA(R,G) as `causalPhysRa`, against the same
  // 0.85 floor.
  const ra = input.adversary.measurements.causalPhysRa;
  if (ra === null) {
    return {
      gate: PickGate.G5,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G5,
      reason:
        `the rationale accuracy was never measured, so the floor of ${MIN_CAUSALPHYS_RA} ` +
        `cannot be demonstrated`,
    };
  }
  if (!(ra >= MIN_CAUSALPHYS_RA)) {
    return {
      gate: PickGate.G5,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G5,
      reason: `the rationale accuracy ${ra} is below the floor of ${MIN_CAUSALPHYS_RA}`,
    };
  }
  const ef = input.rationale.evidence_faithfulness;
  if (ef === null) {
    return {
      gate: PickGate.G5,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G5,
      reason:
        `the evidence faithfulness was never measured, so the floor of ` +
        `${MIN_EVIDENCE_FAITHFULNESS} cannot be demonstrated`,
    };
  }
  if (!(ef >= MIN_EVIDENCE_FAITHFULNESS)) {
    return {
      gate: PickGate.G5,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G5,
      reason: `the evidence faithfulness ${ef} is below the floor of ${MIN_EVIDENCE_FAITHFULNESS}`,
    };
  }
  const dc = input.rationale.decision_coherence;
  if (dc === null) {
    return {
      gate: PickGate.G5,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G5,
      reason:
        `the decision coherence was never measured, so the floor of ` +
        `${MIN_DECISION_COHERENCE} cannot be demonstrated`,
    };
  }
  if (!(dc >= MIN_DECISION_COHERENCE)) {
    return {
      gate: PickGate.G5,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G5,
      reason: `the decision coherence ${dc} is below the floor of ${MIN_DECISION_COHERENCE}`,
    };
  }
  return { gate: PickGate.G5, passed: true, refusal_code: null, reason: null };
}

/** G6 -- Inference-Time Conformal Stopping & Copula Bounds. */
function gateG6(input: PickGateInput): GateOutcome {
  const itcr = input.conformal.itcr;
  if (itcr.status === "HALT") {
    return {
      gate: PickGate.G6,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G6,
      reason: `the conformal gate stopped the reasoning trace: ${itcr.halt_reason}`,
    };
  }
  if (itcr.status === "REFUSED") {
    return {
      gate: PickGate.G6,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G6,
      reason: `the conformal gate refused the reasoning trace: ${itcr.refusal_code}`,
    };
  }
  // alpha_ITCR <= tau_conformal. The ITCR gate's own ALLOW verdict already establishes this, so
  // the comparison is asserted here rather than assumed: this gate is the place the spec's
  // inequality is checked.
  if (!(itcr.alpha_ITCR <= itcr.tau_conformal)) {
    return {
      gate: PickGate.G6,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G6,
      reason:
        `the graph factuality nonconformity ${itcr.alpha_ITCR} exceeds the conformal ` +
        `threshold ${itcr.tau_conformal}`,
    };
  }
  for (const joint of input.conformal.sgp_joints) {
    let bounds: FrechetHoeffdingBounds;
    try {
      bounds = frechetHoeffdingBounds(joint.pa, joint.pb);
    } catch (error) {
      return {
        gate: PickGate.G6,
        passed: false,
        refusal_code: PICK_GATE_REFUSAL.G6,
        reason:
          `the marginals of SGP joint ${joint.label} are not probabilities, so the copula ` +
          `bound cannot be checked: ${String(error)}`,
      };
    }
    if (joint.joint < bounds.lower || joint.joint > bounds.upper) {
      return {
        gate: PickGate.G6,
        passed: false,
        refusal_code: PICK_GATE_REFUSAL.G6,
        reason:
          `the joint probability ${joint.joint} of SGP joint ${joint.label} is outside the ` +
          `Frechet-Hoeffding bounds [${bounds.lower}, ${bounds.upper}]`,
      };
    }
  }
  return { gate: PickGate.G6, passed: true, refusal_code: null, reason: null };
}

/** G7 -- Murphy Calibration & ACI Coverage Stability. */
function gateG7(input: PickGateInput): GateOutcome {
  const window = input.calibration;
  const samples = window.samples;

  // ECE_30 - ECE_250 <= 0.02: the trailing 30-game ECE against the trailing 250-game baseline.
  const shortSamples = samples.slice(Math.max(0, samples.length - CALIBRATION_SHORT_WINDOW));
  const longSamples = samples.slice(Math.max(0, samples.length - CALIBRATION_LONG_WINDOW));
  const eceShort = expectedCalibrationError(shortSamples, CALIBRATION_BINS);
  const eceLong = expectedCalibrationError(longSamples, CALIBRATION_BINS);
  if (!(eceShort - eceLong <= MAX_CALIBRATION_DRIFT)) {
    return {
      gate: PickGate.G7,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G7,
      reason:
        `the trailing ${CALIBRATION_SHORT_WINDOW}-game ECE ${eceShort} exceeds the trailing ` +
        `${CALIBRATION_LONG_WINDOW}-game baseline ${eceLong} by more than ` +
        `${MAX_CALIBRATION_DRIFT}`,
    };
  }

  // REL_cat < RES_cat: a positive Brier Skill Score. The spec's Murphy identity is
  // BS = REL - RES + UNC, so a positive skill score (BS below the base rate's UNC) holds exactly
  // when REL < RES -- and the repository's brierDecomposition reports those two terms directly.
  const decomposition = brierDecomposition(samples, CALIBRATION_BINS);
  if (!(decomposition.reliability < decomposition.resolution)) {
    return {
      gate: PickGate.G7,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G7,
      reason:
        `the reliability term ${decomposition.reliability} is not below the resolution term ` +
        `${decomposition.resolution}, so the Brier Skill Score is not positive`,
    };
  }

  // |mean(err_k) - alpha| <= 0.03, the ACI coverage stability.
  const errors = window.coverage_errors;
  if (errors.length === 0) {
    return {
      gate: PickGate.G7,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G7,
      reason:
        "no coverage errors were supplied, so the ACI coverage stability cannot be checked",
    };
  }
  const alpha = window.aci.alpha;
  const meanError = errors.reduce((sum, e) => sum + e, 0) / errors.length;
  if (!(Math.abs(meanError - alpha) <= MAX_COVERAGE_INSTABILITY)) {
    return {
      gate: PickGate.G7,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G7,
      reason:
        `the mean coverage error ${meanError} is more than ${MAX_COVERAGE_INSTABILITY} away ` +
        `from the adapted miscoverage level ${alpha}`,
    };
  }
  return { gate: PickGate.G7, passed: true, refusal_code: null, reason: null };
}

/** G8 -- Positive CLV History & Conformal Lower-Bound Edge. */
function gateG8(input: PickGateInput): GateOutcome {
  // The trailing 50-evaluation family. The repository has NO trailing-window CLV function, so the
  // window is sliced here -- once, in one place -- and the repository's summarizeClv does the
  // aggregation.
  const trailing = input.clv.observations.slice(-CLV_TRAILING_WINDOW);
  if (trailing.length === 0) {
    return {
      gate: PickGate.G8,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G8,
      reason: "no CLV observations were supplied, so the CLV history cannot be checked",
    };
  }
  const summary = summarizeClv(trailing);
  const averageClv = summary.averageClv;
  if (averageClv === null) {
    return {
      gate: PickGate.G8,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G8,
      reason: "the trailing CLV could not be averaged, so the CLV floor cannot be checked",
    };
  }
  if (!(averageClv >= MIN_TRAILING_CLV)) {
    return {
      gate: PickGate.G8,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G8,
      reason:
        `the trailing ${CLV_TRAILING_WINDOW}-evaluation mean CLV ${averageClv} is below the ` +
        `floor of ${MIN_TRAILING_CLV}`,
    };
  }
  // The conservative lower conformal probability bound, p_lo_conf: the point forecast less the
  // repository's own slow (250-game, unweighted, 75%) conformal half-width. The half-width is the
  // spec's own W_{0.75,slow}(x_t) from section 5.1, computed by the repository's function.
  let halfWidth: number;
  try {
    halfWidth = slowConformalHalfWidth(input.clv.trailing_scores);
  } catch (error) {
    return {
      gate: PickGate.G8,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G8,
      reason:
        `the conformal half-width could not be computed, so the lower bound cannot be ` +
        `checked: ${String(error)}`,
    };
  }
  const lowerBound = input.clv.point_forecast - halfWidth;
  const edgeValue = lowerBound - input.clv.market_price;
  if (!(edgeValue > MIN_CONFORMAL_EDGE)) {
    return {
      gate: PickGate.G8,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G8,
      reason:
        `the conservative lower conformal bound ${lowerBound} beats the vig-free market ` +
        `price ${input.clv.market_price} by ${edgeValue}, which does not exceed the edge floor ` +
        `of ${MIN_CONFORMAL_EDGE}`,
    };
  }
  return { gate: PickGate.G8, passed: true, refusal_code: null, reason: null };
}

/** G9 -- Decision-Time Price Archive Commit. */
function gateG9(input: PickGateInput): GateOutcome {
  const commit = input.price_archive;
  if (!commit.committed) {
    return {
      gate: PickGate.G9,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G9,
      reason: "the decision-time price row was not committed to the archive",
    };
  }
  if (!commit.fsynced) {
    return {
      gate: PickGate.G9,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G9,
      reason:
        "the decision-time price row was written but its durability was not confirmed by an " +
        "fsync, so the archive may not hold the price the decision was made at",
    };
  }
  // The repository's own row validation: the price band, the (0,1) probability band, the edge
  // identity and the covariates hash. A row that fails it was never a recordable row.
  try {
    validateDecisionTimePriceRow(commit.row);
  } catch (error) {
    return {
      gate: PickGate.G9,
      passed: false,
      refusal_code: PICK_GATE_REFUSAL.G9,
      reason: `the decision-time price row is not recordable: ${String(error)}`,
    };
  }
  return { gate: PickGate.G9, passed: true, refusal_code: null, reason: null };
}

/**
 * RUN ALL NINE GATES.
 *
 * Returns ONE outcome per gate, always nine, in the spec's order (G1..G9). Every gate is
 * evaluated: the conjunction is a conjunction, and a gate that is not reached is a gate that did
 * not pass. The order is fixed so the output is deterministic and diffable.
 */
export function runPickGates(input: PickGateInput): GateOutcome[] {
  const outcomes: GateOutcome[] = [];
  outcomes.push(gateG1(input));
  outcomes.push(gateG2(input));
  outcomes.push(gateG3(input));
  outcomes.push(gateG4(input));
  outcomes.push(gateG5(input));
  outcomes.push(gateG6(input));
  outcomes.push(gateG7(input));
  outcomes.push(gateG8(input));
  outcomes.push(gateG9(input));
  return outcomes;
}

// =================================================================================================
// SECTION 4 -- THE EMIT
// =================================================================================================

/** A published board or parlay entry. The spec's §6.1 `PublishedBoardEntry`. */
export interface PublishedBoardEntry {
  readonly game_id: string;
  readonly market_id: string;
  readonly published_prob: number;
  readonly edge: number;
  /**
   * The deterministic hash of the audit trail the conclusion rests on.
   *
   * It is the repository's own hashing (edge-lab/provenance.ts: canonical JSON, then SHA-256) over
   * a canonical projection of the trail, so two trails that differ in any recorded field hash
   * differently and two identical trails hash identically.
   */
  readonly audit_hash: string;
}

/**
 * MINT A BOARD OR PARLAY ENTRY FROM A VALIDATED TRACE.
 *
 * The spec's §6.1 function, verbatim:
 *
 *   "export function mintBoardOrParlayEntry(trace: ValidatedCausalTrace): PublishedBoardEntry {
 *      return { game_id: ..., published_prob: trace.trueProb, edge: trace.edge,
 *               audit_hash: computeDeterministicHash(trace.audit_trail) }; }"
 *
 * THE SIGNATURE IS THE POINT. It takes a `ValidatedCausalTrace`, not a certificate and not a
 * number, so this function CANNOT be called with an unbranded object: the compiler stops it. That
 * is the spec's "no downstream function accepts a raw number or an optional trace".
 */
export function mintBoardOrParlayEntry(trace: ValidatedCausalTrace): PublishedBoardEntry {
  return {
    game_id: trace.certificate.game_id,
    market_id: trace.certificate.market_id,
    published_prob: trace.certificate.true_prob,
    edge: trace.certificate.edge,
    audit_hash: auditTrailHash(trace.certificate.audit_trail),
  };
}

/**
 * The deterministic hash of an audit trail.
 *
 * A canonical projection of the trail -- the fields that record WHAT was claimed and WHAT was
 * concluded -- hashed with the repository's own canonical JSON + SHA-256. The projection is
 * explicit rather than a blind JSON.stringify of the records, because a record's optional
 * threshold_evaluation may be absent and the repository's canonicalJson rejects undefined.
 */
function auditTrailHash(trail: readonly PrincipleApplicationAuditRecord[]): string {
  const payload = {
    audit_trail: trail.map((record) => ({
      item_id: record.item_id,
      source_doc_hash: record.source_doc_hash,
      principle_name: record.principle_name,
      parsed_delta_applied: record.parsed_delta_applied,
      resolution_status: record.resolution_status,
    })),
  };
  return sha256Hex(canonicalJson(payload));
}

/** The outcome of the pipeline. */
export interface PickEmission {
  /** The entries to publish. EMPTY when anything refused. */
  readonly entries: readonly PublishedBoardEntry[];
  /** One outcome per gate, in order. */
  readonly gates: readonly GateOutcome[];
  /** The refusal, when anything refused. */
  readonly refusal: PublishRefusal | null;
}

/** The pipeline's input: the certificate and the evidence the nine gates read. */
export interface PickPipelineInput {
  /** The certificate. Null or undefined means MISSING. */
  readonly certificate: CausalCertificate | null | undefined;
  /** The evidence the nine gates read. */
  readonly gates: PickGateInput;
}

/**
 * THE EMIT.
 *
 * THE RULE, from the task's own contract and the spec's §6.2: the conjunction is a conjunction.
 * If the certificate is not publishable, or if ANY of the nine gates fails, the pipeline publishes
 * NOTHING. It does not publish a degraded pick, it does not publish the entries that passed, and
 * it does not publish an entry with a note attached.
 *
 * That is the whole reason the gates exist. A gate that can be partially honoured is a gate that
 * is not a gate: the engine would publish exactly the claims the gates were built to withhold,
 * and the refusal codes would be decoration.
 */
export function emitPicks(input: PickPipelineInput): PickEmission {
  const validation = tryValidateCertificate(input.certificate);
  const gates = runPickGates(input.gates);

  if (!validation.ok) {
    return { entries: [], gates, refusal: validation.refusal };
  }
  const failed = gates.find((outcome) => !outcome.passed);
  if (failed !== undefined) {
    return {
      entries: [],
      gates,
      refusal: {
        refusal_code: failed.refusal_code ?? PICK_GATE_REFUSAL.G1,
        reason: failed.reason ?? "the gate failed without a reason",
      },
    };
  }
  return { entries: [mintBoardOrParlayEntry(validation.trace)], gates, refusal: null };
}

/**
 * AUTHORIZE A CAUSAL PUBLISH.
 *
 * The spec's §6.2 constructor, by its own name: "authorizeCausalPublish(cert: CausalTraceCertificate):
 * ValidatedCausalTrace | PublishRefusal emits a ValidatedCausalTrace if and only if the indicator
 * conjunction G_honesty(t) = PROD_k I(Condition_k) = 1 holds."
 *
 * So the answer is EITHER a branded trace OR a refusal -- never a trace with a caveat, and never a
 * refusal with a trace attached.
 */
export function authorizeCausalPublish(
  certificate: CausalCertificate | null | undefined,
  gates: PickGateInput,
): ValidatedCausalTrace | PublishRefusal {
  const validation = tryValidateCertificate(certificate);
  if (!validation.ok) return validation.refusal;

  const failed = runPickGates(gates).find((outcome) => !outcome.passed);
  if (failed !== undefined) {
    return {
      refusal_code: failed.refusal_code ?? PICK_GATE_REFUSAL.G1,
      reason:
        `the honesty conjunction failed at ${failed.gate}: ` +
        `${failed.refusal_code ?? "UNKNOWN"}: ${failed.reason ?? "no reason recorded"}`,
    };
  }
  return validation.trace;
}
