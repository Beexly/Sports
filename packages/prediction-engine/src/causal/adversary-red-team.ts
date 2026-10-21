/**
 * T6 -- THE ADVERSARY RED-TEAM INTERCEPTION.
 *
 * THE SPEC'S T6, verbatim from Table 5:
 *
 *   "Adversary Red-Team Interception: Blocks direct chains with point E-value < 1.35,
 *    CI E-value < 1.10, placebo permutation leak > 0.005, entity-swap divergence >= 0.02,
 *    or CausalPhys RA < 0.85."
 *
 * WHAT THIS FILE IS. A gate that stands between "the engine produced an estimate" and
 * "the engine publishes a causal claim". It answers one question -- may this chain be
 * published as a DIRECT causal claim? -- and it answers it with FIVE independent
 * measurements, not one.
 *
 * WHY FIVE, AND WHY INDEPENDENT. The spec's line is a DISJUNCTION ("or"), so a chain is
 * blocked if ANY conjunct fails. A gate that stops at the first failing conjunct is
 * strictly less informative than one that reports all of them: "the point E-value is too
 * small AND the placebo leaks" is a different finding from "the point E-value is too
 * small", and only the first tells the caller how much work the chain still needs. So
 * every criterion is evaluated, every fired criterion is reported, and `blocked` is the
 * disjunction of them.
 *
 * THE CUT-OFFS ARE NOT SYMMETRIC, AND THAT IS THE POINT. Read the spec's line again:
 *
 *     point E-value   <  1.35     a floor: 1.35 itself PASSES
 *     CI E-value      <  1.10     a floor: 1.10 itself PASSES
 *     placebo leak    >  0.005    a ceiling: 0.005 itself PASSES
 *     entity-swap     >= 0.02     a limit: 0.02 itself FAILS
 *     CausalPhys RA   <  0.85     a floor: 0.85 itself PASSES
 *
 * Four of the five are strict inequalities that let the threshold value through, and ONE
 * (the entity-swap divergence) is inclusive, so the threshold value itself is refused. A
 * gate that "rounds" the entity-swap comparison to `>` would let a chain that is exactly
 * at the limit publish itself. The boundary is therefore asserted EXACTLY, in both
 * directions, in the test suite -- and the mutation sweep proves those assertions bite.
 *
 * THE E-VALUES ARE REUSED, NOT RE-DERIVED. This repository already has ONE E-value
 * definition: `eValue()` / `eValueForCi()` in e-value.js, driven by the VanderWeele & Ding
 * (2017) conversion in hcid-mediator-expansion.ts:
 *
 *     RR ~= exp(0.91 * |d|),  d = |mean1 - mean0| / pooledSd
 *     E-value = RR + sqrt(RR * (RR - 1))          (RR >= 1)
 *
 * and the CI E-value is the E-value of the bound closest to the null. That machinery --
 * `computeMeasuredEValueFromResiduals()` -- is the one this module calls. It returns null
 * when an arm holds fewer than 30 observations (n1 < 30 or n0 < 30), or when the pooled
 * spread is degenerate, and this module treats that null as UNMEASURED rather than as a
 * pass. The two E-value FLOORS are likewise reused: hcid-mediator-expansion.ts already
 * carries the spec's 1.35 and 1.10 as MIN_EXPANSION_E_VALUE and MIN_EXPANSION_CI_E_VALUE,
 * and they are the same numbers the spec's step 4.4 and the spec's G4 name. A second copy
 * of 1.35 in this file would be a constant that could drift away from the one the
 * expansion path enforces.
 *
 * WHAT THIS MODULE DOES NOT DO. It does not run the placebo permutation, and it does not
 * run the entity swap. Those are analyses of the data, and the caller performs them; this
 * module judges the measurements they produce. It also does not decide whether the effect
 * is TRUE -- that is not a question a threshold can answer. It answers "is this claim
 * robust enough to be published AS A CAUSAL CLAIM", which is a different and much
 * narrower question, and it is the question the spec asks.
 *
 * UNMEASURED IS NOT A PASS. A criterion whose measurement is missing cannot be shown to
 * clear its threshold, and an unshown robustness is not a robustness that passed. The
 * refusal says which measurement was missing, so the caller knows what to go and measure.
 * (The same rule governs the rest of the engine: see the `eValue` field in
 * causal-claim-gate.ts -- "an unmeasured robustness is not a robustness that passed".)
 *
 * Pure TypeScript, no I/O, deterministic.
 */

import {
  computeMeasuredEValueFromResiduals,
  MIN_EXPANSION_E_VALUE,
  MIN_EXPANSION_CI_E_VALUE,
} from "./hcid-mediator-expansion.js";

/**
 * The spec's POINT E-value floor: 1.35.
 *
 * REUSED, NOT RE-DECLARED. hcid-mediator-expansion.ts already carries the spec's 1.35
 * as MIN_EXPANSION_E_VALUE -- the spec's step 4.4 ("pass Adversary Review
 * (E-value >= 1.35)") and the spec's G4 ("E-value(RR*) >= 1.35") are the same number.
 * If this file held a second copy, the two could drift, and a chain that cleared the
 * expansion floor could be refused here, or the reverse.
 */
export const MIN_POINT_E_VALUE = MIN_EXPANSION_E_VALUE;

/**
 * The spec's CI E-value floor: 1.10.
 *
 * Reused from MIN_EXPANSION_CI_E_VALUE for the same reason. The floor is LOWER on
 * purpose: it is a floor on a BOUND, not on a central claim.
 */
export const MIN_CI_E_VALUE = MIN_EXPANSION_CI_E_VALUE;

/**
 * The spec's placebo ceiling: 0.005.
 *
 * The spec's G4, third conjunct: "|Delta_placebo| <= 0.005". The placebo replaces the
 * intervention with a randomly permuted signal; the size of the effect the engine then
 * reports is the size of the effect that survives when there is nothing to find. The
 * comparison is STRICT: a leak of exactly 0.005 passes, a leak above it is refused.
 *
 * The same number is the publishable path's MAX_PLACEBO_DELTA (0.005) in
 * literature-retrieval.ts. It is re-declared here rather than imported because that
 * module is a database module and this gate must not acquire a database dependency.
 */
export const MAX_PLACEBO_LEAK = 0.005;

/**
 * The spec's entity-swap limit: 0.02.
 *
 * A HIGH divergence is what refuses the chain: if swapping the entity (replacing the
 * subject of the chain with a comparable one) moves the estimate by 2% or more, then what
 * the chain found is a fact about that entity, not a causal relation, and publishing it
 * as a general causal claim is a lie of scope.
 *
 * The comparison is INCLUSIVE: divergence >= 0.02 refuses. A chain sitting exactly at
 * the limit is refused, and the test suite asserts that.
 */
export const MAX_ENTITY_SWAP_DIVERGENCE = 0.02;

/**
 * The spec's CausalPhys reliability-accuracy floor: 0.85.
 *
 * CausalPhys composes relations and reports the fraction it gets right (RA). A chain
 * whose relation was composed with RA below 0.85 rests on a relation the engine itself
 * does not believe most of the time, so the chain is refused however well the effect
 * identified.
 */
export const MIN_CAUSALPHYS_RA = 0.85;

/**
 * The refusal codes this gate can emit.
 *
 * The OVERALL code is the same whatever fired -- the caller gets one code for "the
 * adversary refused this chain" -- and each fired criterion carries its OWN code, so a
 * caller that wants to know WHICH cut-off was crossed can read it off the criteria.
 */
export const T6_REFUSAL = {
  /** The chain was refused by at least one adversary criterion. */
  intercepted: "REFUSED_T6_ADVERSARY_RED_TEAM",
  /** The chain cleared every criterion. */
  accepted: "ACCEPTED_T6_ADVERSARY_RED_TEAM",
  /** The point E-value is below the 1.35 floor. */
  pointEValueBelowFloor: "REFUSED_T6_POINT_E_VALUE_BELOW_FLOOR",
  /** The point E-value was never measured, so the floor cannot be demonstrated. */
  pointEValueUnmeasured: "REFUSED_T6_POINT_E_VALUE_UNMEASURED",
  /** The CI E-value is below the 1.10 floor. */
  ciEValueBelowFloor: "REFUSED_T6_CI_E_VALUE_BELOW_FLOOR",
  /** The CI E-value was never measured, so the floor cannot be demonstrated. */
  ciEValueUnmeasured: "REFUSED_T6_CI_E_VALUE_UNMEASURED",
  /** The placebo permutation leak is above the 0.005 ceiling. */
  placeboLeakAboveCeiling: "REFUSED_T6_PLACEBO_LEAK_ABOVE_CEILING",
  /** The placebo permutation leak was never measured. */
  placeboLeakUnmeasured: "REFUSED_T6_PLACEBO_LEAK_UNMEASURED",
  /** The entity-swap divergence is at or above the 0.02 limit. */
  entitySwapAtOrAboveLimit: "REFUSED_T6_ENTITY_SWAP_DIVERGENCE_AT_OR_ABOVE_LIMIT",
  /** The entity-swap divergence was never measured. */
  entitySwapUnmeasured: "REFUSED_T6_ENTITY_SWAP_DIVERGENCE_UNMEASURED",
  /** The CausalPhys reliability-accuracy is below the 0.85 floor. */
  causalPhysRaBelowFloor: "REFUSED_T6_CAUSALPHYS_RA_BELOW_FLOOR",
  /** The CausalPhys reliability-accuracy was never measured. */
  causalPhysRaUnmeasured: "REFUSED_T6_CAUSALPHYS_RA_UNMEASURED",
} as const;

export type T6RefusalCode = (typeof T6_REFUSAL)[keyof typeof T6_REFUSAL];

/** The five criteria, by name. */
export const T6_CRITERION = {
  pointEValue: "point-e-value",
  ciEValue: "ci-e-value",
  placeboLeak: "placebo-permutation-leak",
  entitySwapDivergence: "entity-swap-divergence",
  causalPhysRa: "causalphys-ra",
} as const;

export type T6CriterionName = (typeof T6_CRITERION)[keyof typeof T6_CRITERION];

/**
 * Where a measurement came from.
 *
 * "EXPLICIT" -- the caller supplied the number. "DERIVED" -- this module computed it
 * from the arms with the repository's existing E-value machinery. "UNMEASURED" -- there
 * is no number, and the criterion therefore cannot be shown to pass.
 */
export type T6MeasurementSource = "EXPLICIT" | "DERIVED" | "UNMEASURED";

/**
 * The candidate causal chain under adversary review.
 *
 * SELF-CONTAINED ON PURPOSE. This type is declared here, exported, and depends on no
 * not-yet-existing module -- so it can be imported by whatever builds the chain without
 * waiting for the rest of the engine.
 */
export interface AdversaryRedTeamInput {
  /**
   * The chain's identifier, carried through to the verdict so a caller with a queue of
   * chains can tell them apart.
   */
  readonly chainId: string;

  /**
   * The TREATED arm's observations, when the caller has them.
   *
   * When BOTH arms are supplied and no explicit E-value is given, the point and CI
   * E-values are DERIVED from them with `computeMeasuredEValueFromResiduals()` -- the
   * repository's existing VanderWeele & Ding machinery, which is the same function the
   * mediator-expansion path uses. Fewer than 30 observations in either arm (n1 < 30 or
   * n0 < 30) yields a null E-value, which this module reports as UNMEASURED.
   */
  readonly treatedSamples?: readonly number[];

  /** The CONTROL arm's observations. See `treatedSamples`. */
  readonly controlSamples?: readonly number[];

  /**
   * The point E-value, when the caller has already measured it.
   *
   * An explicit value WINS over the derived one: the caller that measured the E-value
   * knows more about how it was measured than this gate does.
   */
  readonly pointEValue?: number | null;

  /**
   * The E-value of the confidence-interval bound closest to the null.
   *
   * Explicit wins over derived, for the same reason as `pointEValue`.
   */
  readonly ciEValue?: number | null;

  /**
   * The placebo permutation leak: |Delta_placebo|, the size of the effect that survives
   * when the intervention is replaced by a random permutation. Above 0.005 refuses.
   */
  readonly placeboLeak?: number | null;

  /**
   * The entity-swap divergence: how far the estimate moves when the subject of the
   * chain is swapped for a comparable one. At or above 0.02 refuses.
   */
  readonly entitySwapDivergence?: number | null;

  /**
   * The CausalPhys reliability-accuracy of the composed relation. Below 0.85 refuses.
   */
  readonly causalPhysRa?: number | null;
}

/** The numbers this gate judged. */
export interface AdversaryRedTeamMeasurements {
  readonly pointEValue: number | null;
  readonly ciEValue: number | null;
  readonly placeboLeak: number | null;
  readonly entitySwapDivergence: number | null;
  readonly causalPhysRa: number | null;
  /** Where the point E-value came from. */
  readonly pointEValueSource: T6MeasurementSource;
  /** Where the CI E-value came from. */
  readonly ciEValueSource: T6MeasurementSource;
}

/** One criterion that fired, and the numbers behind it. */
export interface AdversaryRedTeamCriterionHit {
  /** The criterion's name. */
  readonly criterion: T6CriterionName;
  /** The refusal code for this criterion. */
  readonly code: T6RefusalCode;
  /** The measured value, or null when it was never measured. */
  readonly value: number | null;
  /** The threshold the value was compared against. */
  readonly threshold: number;
  /** The comparison, written out, e.g. "value < 1.35". */
  readonly relation: string;
  /** The sentence a human reads. */
  readonly reason: string;
}

/** The gate's verdict. */
export interface AdversaryRedTeamVerdict {
  /** The chain this verdict is about. */
  readonly chainId: string;
  /** True when at least one criterion fired. */
  readonly blocked: boolean;
  /** The overall code: REFUSED_T6_ADVERSARY_RED_TEAM or ACCEPTED_T6_ADVERSARY_RED_TEAM. */
  readonly code: T6RefusalCode;
  /** One sentence per fired criterion, in the order the criteria are evaluated. */
  readonly reasons: readonly string[];
  /** The numbers the gate judged, and where they came from. */
  readonly measurements: AdversaryRedTeamMeasurements;
  /** EVERY criterion that fired -- not just the first. */
  readonly criteria: readonly AdversaryRedTeamCriterionHit[];
}

/**
 * The E-values of a two-arm contrast, measured with the repository's existing machinery.
 *
 * `computeMeasuredEValueFromResiduals()` (hcid-mediator-expansion.ts) implements the
 * VanderWeele & Ding (2017, Annals of Internal Medicine 167(4):268-274) conversion:
 *
 *     RR ~= exp(0.91 * |d|),  d = |mean1 - mean0| / pooledSd
 *     E-value = RR + sqrt(RR * (RR - 1))
 *
 * and the CI E-value is the E-value of the bound closest to the null. It returns null
 * when an arm holds fewer than 30 observations (n1 < 30 or n0 < 30) or when the pooled
 * spread is degenerate -- and a null here is UNMEASURED, not a pass.
 */
export interface ChainEValueMeasurement {
  readonly pointEValue: number | null;
  readonly ciEValue: number | null;
}

/**
 * Measure the E-values of a two-arm contrast.
 *
 * A thin, honest wrapper over the repository's one E-value implementation. It exists so
 * that the "n1 < 30 or n0 < 30 yields a null E-value" rule has ONE home, and so that a
 * caller that has arms (rather than a number) can hand them to the gate directly.
 */
export function measureChainEValues(
  treatedSamples: readonly number[],
  controlSamples: readonly number[],
): ChainEValueMeasurement {
  const stats = computeMeasuredEValueFromResiduals(treatedSamples, controlSamples);
  if (stats === null) {
    return { pointEValue: null, ciEValue: null };
  }
  return { pointEValue: stats.measuredEValue, ciEValue: stats.measuredCiEValue };
}

/** Full-precision number formatting, so a reason string shows the number it judged. */
function num(v: number): string {
  return String(v);
}

/** The reason for a measurement that was never taken. */
function unmeasuredReason(label: string, thresholdPhrase: string): string {
  return `the ${label} was never measured, so ${thresholdPhrase} cannot be demonstrated`;
}

/** The reason for a measurement that was taken and did not clear the cut-off. */
function refusedReason(label: string, value: number, thresholdPhrase: string): string {
  return `the ${label} ${num(value)} is ${thresholdPhrase}`;
}

/** Build one fired criterion. */
function hit(
  criterion: T6CriterionName,
  code: T6RefusalCode,
  value: number | null,
  threshold: number,
  relation: string,
  reason: string,
): AdversaryRedTeamCriterionHit {
  return { criterion, code, value, threshold, relation, reason };
}

/**
 * THE GATE.
 *
 * Blocks a direct causal chain when ANY of the spec's five criteria fires, and reports
 * EVERY criterion that fired.
 *
 * The order of evaluation is fixed, so `reasons` and `criteria` are deterministic:
 * point E-value, CI E-value, placebo leak, entity-swap divergence, CausalPhys RA.
 */
export function adversaryRedTeamIntercept(
  input: AdversaryRedTeamInput,
): AdversaryRedTeamVerdict {
  const derived: ChainEValueMeasurement =
    input.treatedSamples !== undefined && input.controlSamples !== undefined
      ? measureChainEValues(input.treatedSamples, input.controlSamples)
      : { pointEValue: null, ciEValue: null };

  // An explicit measurement wins over the derived one.
  const pointEValue = input.pointEValue ?? derived.pointEValue;
  const ciEValue = input.ciEValue ?? derived.ciEValue;

  const pointEValueSource: T6MeasurementSource =
    input.pointEValue !== undefined && input.pointEValue !== null
      ? "EXPLICIT"
      : derived.pointEValue !== null
        ? "DERIVED"
        : "UNMEASURED";
  const ciEValueSource: T6MeasurementSource =
    input.ciEValue !== undefined && input.ciEValue !== null
      ? "EXPLICIT"
      : derived.ciEValue !== null
        ? "DERIVED"
        : "UNMEASURED";

  const placeboLeak = input.placeboLeak ?? null;
  const entitySwapDivergence = input.entitySwapDivergence ?? null;
  const causalPhysRa = input.causalPhysRa ?? null;

  const measurements: AdversaryRedTeamMeasurements = {
    pointEValue,
    ciEValue,
    placeboLeak,
    entitySwapDivergence,
    causalPhysRa,
    pointEValueSource,
    ciEValueSource,
  };

  const criteria: AdversaryRedTeamCriterionHit[] = [];

  // --- 1. POINT E-VALUE --------------------------------------------------
  // The spec's floor: point E-value < 1.35 blocks; 1.35 itself passes.
  const pointEValueMissing = pointEValue === null;
  const pointEValueBelowFloor = pointEValue !== null && pointEValue < MIN_POINT_E_VALUE;
  if (pointEValueMissing || pointEValueBelowFloor) {
    criteria.push(
      pointEValue === null
        ? hit(
            T6_CRITERION.pointEValue,
            T6_REFUSAL.pointEValueUnmeasured,
            null,
            MIN_POINT_E_VALUE,
            "not measured",
            unmeasuredReason("point E-value", `the spec's floor of ${num(MIN_POINT_E_VALUE)}`),
          )
        : hit(
            T6_CRITERION.pointEValue,
            T6_REFUSAL.pointEValueBelowFloor,
            pointEValue,
            MIN_POINT_E_VALUE,
            `value < ${num(MIN_POINT_E_VALUE)}`,
            refusedReason(
              "point E-value",
              pointEValue,
              `below the spec's floor of ${num(MIN_POINT_E_VALUE)}`,
            ),
          ),
    );
  }

  // --- 2. CI E-VALUE -----------------------------------------------------
  // The spec's floor: CI E-value < 1.10 blocks; 1.10 itself passes.
  const ciEValueMissing = ciEValue === null;
  const ciEValueBelowFloor = ciEValue !== null && ciEValue < MIN_CI_E_VALUE;
  if (ciEValueMissing || ciEValueBelowFloor) {
    criteria.push(
      ciEValue === null
        ? hit(
            T6_CRITERION.ciEValue,
            T6_REFUSAL.ciEValueUnmeasured,
            null,
            MIN_CI_E_VALUE,
            "not measured",
            unmeasuredReason("CI E-value", `the spec's floor of ${num(MIN_CI_E_VALUE)}`),
          )
        : hit(
            T6_CRITERION.ciEValue,
            T6_REFUSAL.ciEValueBelowFloor,
            ciEValue,
            MIN_CI_E_VALUE,
            `value < ${num(MIN_CI_E_VALUE)}`,
            refusedReason(
              "CI E-value",
              ciEValue,
              `below the spec's floor of ${num(MIN_CI_E_VALUE)}`,
            ),
          ),
    );
  }

  // --- 3. PLACEBO PERMUTATION LEAK --------------------------------------
  // The spec's ceiling: placebo leak > 0.005 blocks; 0.005 itself passes.
  const placeboLeakMissing = placeboLeak === null;
  const placeboLeakAboveCeiling = placeboLeak !== null && placeboLeak > MAX_PLACEBO_LEAK;
  if (placeboLeakMissing || placeboLeakAboveCeiling) {
    criteria.push(
      placeboLeak === null
        ? hit(
            T6_CRITERION.placeboLeak,
            T6_REFUSAL.placeboLeakUnmeasured,
            null,
            MAX_PLACEBO_LEAK,
            "not measured",
            unmeasuredReason(
              "placebo permutation leak",
              `the spec's ceiling of ${num(MAX_PLACEBO_LEAK)}`,
            ),
          )
        : hit(
            T6_CRITERION.placeboLeak,
            T6_REFUSAL.placeboLeakAboveCeiling,
            placeboLeak,
            MAX_PLACEBO_LEAK,
            `value > ${num(MAX_PLACEBO_LEAK)}`,
            refusedReason(
              "placebo permutation leak",
              placeboLeak,
              `above the spec's ceiling of ${num(MAX_PLACEBO_LEAK)}`,
            ),
          ),
    );
  }

  // --- 4. ENTITY-SWAP DIVERGENCE ----------------------------------------
  // The spec's limit: entity-swap divergence >= 0.02 blocks; 0.02 itself FAILS.
  const entitySwapMissing = entitySwapDivergence === null;
  const entitySwapAtOrAboveLimit = entitySwapDivergence !== null && entitySwapDivergence >= MAX_ENTITY_SWAP_DIVERGENCE;
  if (entitySwapMissing || entitySwapAtOrAboveLimit) {
    criteria.push(
      entitySwapDivergence === null
        ? hit(
            T6_CRITERION.entitySwapDivergence,
            T6_REFUSAL.entitySwapUnmeasured,
            null,
            MAX_ENTITY_SWAP_DIVERGENCE,
            "not measured",
            unmeasuredReason(
              "entity-swap divergence",
              `the spec's limit of ${num(MAX_ENTITY_SWAP_DIVERGENCE)}`,
            ),
          )
        : hit(
            T6_CRITERION.entitySwapDivergence,
            T6_REFUSAL.entitySwapAtOrAboveLimit,
            entitySwapDivergence,
            MAX_ENTITY_SWAP_DIVERGENCE,
            `value >= ${num(MAX_ENTITY_SWAP_DIVERGENCE)}`,
            refusedReason(
              "entity-swap divergence",
              entitySwapDivergence,
              `at or above the spec's limit of ${num(MAX_ENTITY_SWAP_DIVERGENCE)}`,
            ),
          ),
    );
  }

  // --- 5. CAUSALPHYS RELIABILITY-ACCURACY -------------------------------
  // The spec's floor: CausalPhys RA < 0.85 blocks; 0.85 itself passes.
  const causalPhysRaMissing = causalPhysRa === null;
  const causalPhysRaBelowFloor = causalPhysRa !== null && causalPhysRa < MIN_CAUSALPHYS_RA;
  if (causalPhysRaMissing || causalPhysRaBelowFloor) {
    criteria.push(
      causalPhysRa === null
        ? hit(
            T6_CRITERION.causalPhysRa,
            T6_REFUSAL.causalPhysRaUnmeasured,
            null,
            MIN_CAUSALPHYS_RA,
            "not measured",
            unmeasuredReason(
              "CausalPhys reliability-accuracy",
              `the spec's floor of ${num(MIN_CAUSALPHYS_RA)}`,
            ),
          )
        : hit(
            T6_CRITERION.causalPhysRa,
            T6_REFUSAL.causalPhysRaBelowFloor,
            causalPhysRa,
            MIN_CAUSALPHYS_RA,
            `value < ${num(MIN_CAUSALPHYS_RA)}`,
            refusedReason(
              "CausalPhys reliability-accuracy",
              causalPhysRa,
              `below the spec's floor of ${num(MIN_CAUSALPHYS_RA)}`,
            ),
          ),
    );
  }

  const reasons = criteria.map((c) => c.reason);

  return {
    chainId: input.chainId,
    blocked: criteria.length > 0,
    code: criteria.length > 0 ? T6_REFUSAL.intercepted : T6_REFUSAL.accepted,
    reasons,
    measurements,
    criteria,
  };
}
