/**
 * T6 -- THE ADVERSARY RED-TEAM INTERCEPTION.
 *
 * THE SPEC'S T6, verbatim from Table 5:
 *
 *   "Adversary Red-Team Interception: Blocks direct chains with point E-value < 1.35,
 *    CI E-value < 1.10, placebo permutation leak > 0.005, entity-swap divergence >= 0.02,
 *    or CausalPhys RA < 0.85."
 *
 * WHY THIS FILE IS ABOUT THE CUT-OFF AND NOT ABOUT "IT BLOCKS".
 *
 * A test that only asserts "a bad chain is refused" passes for a hundred wrong reasons:
 * a gate that refuses everything, a gate whose threshold is in the wrong place, a gate
 * that measures the wrong number. The spec's T6 is a set of FIVE CUT-OFFS, and a cut-off
 * is only pinned when BOTH sides of it are asserted -- the value exactly AT the threshold
 * and the value just past it. So every criterion here is tested on both sides.
 *
 * The four floor/ceiling criteria are strict inequalities, so the threshold value itself
 * PASSES:
 *
 *     point E-value  <  1.35   ->  1.35 passes,  1.3499 is refused
 *     CI E-value     <  1.10   ->  1.10 passes,  1.0999 is refused
 *     placebo leak   >  0.005  ->  0.005 passes, 0.0051 is refused
 *     CausalPhys RA  <  0.85   ->  0.85 passes,  0.8499 is refused
 *
 * and the ONE inclusive criterion refuses AT the threshold:
 *
 *     entity-swap    >= 0.02   ->  0.02 is refused, 0.0199 passes
 *
 * That asymmetry is the spec's own (`>=` on the entity-swap, `<` on the other four) and
 * it is asserted exactly, because a gate that "rounds" the entity-swap comparison to `>`
 * would publish a chain sitting precisely on the limit.
 *
 * EVERY BOUNDARY VALUE IN HERE IS A LITERAL, NEVER THE IMPORTED CONSTANT.
 * A boundary test written as `pointEValue: MIN_POINT_E_VALUE` proves nothing: mutate the
 * constant and the test moves with it, still passing. The literals below are the SPEC's
 * numbers, so moving any threshold in the module breaks the test that names it. The
 * mutation sweep (reconciliation/_mutation_sweep_t6_red_team.mjs) proves that it does.
 *
 * NO Math.random. Every input is either a literal or built by a deterministic pattern.
 *
 * THE SWEEP IS INVOKED FROM HERE, so this file is a PR-BLOCKING gate and not a file.
 * The sweep is the thing that proves the boundaries below are PINNED rather than merely
 * asserted: it mutates each threshold, each comparison operator, and the shape of the
 * verdict, and requires the named test here to STOP passing. A test that no mutation
 * can break is not evidence of anything.
 *
 * The sweep runs THIS file, so running the sweep from THIS file would recurse. The
 * sweep sets T6_SWEEP_CHILD=1 in the environment of the run it starts, and the sweep
 * invocation below is skipped when that variable is set. The sweep therefore drives
 * the eleven subject tests, and this file drives the sweep exactly once.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  adversaryRedTeamIntercept,
  measureChainEValues,
  MAX_ENTITY_SWAP_DIVERGENCE,
  MAX_PLACEBO_LEAK,
  MIN_CAUSALPHYS_RA,
  MIN_CI_E_VALUE,
  MIN_POINT_E_VALUE,
  T6_CRITERION,
  T6_REFUSAL,
  type AdversaryRedTeamInput,
  type AdversaryRedTeamVerdict,
} from "../src/causal/adversary-red-team.js";
import {
  computeMeasuredEValueFromResiduals,
  MIN_EXPANSION_CI_E_VALUE,
  MIN_EXPANSION_E_VALUE,
} from "../src/causal/hcid-mediator-expansion.js";

// ---------------------------------------------------------------------------
// THE SPEC'S LITERALS. These are the numbers, written out, on purpose.
// ---------------------------------------------------------------------------

/** The spec's point E-value floor. */
const SPEC_POINT_E_VALUE = 1.35;
/** The spec's CI E-value floor. */
const SPEC_CI_E_VALUE = 1.1;
/** The spec's placebo ceiling. */
const SPEC_PLACEBO_LEAK = 0.005;
/** The spec's entity-swap limit (inclusive). */
const SPEC_ENTITY_SWAP_DIVERGENCE = 0.02;
/** The spec's CausalPhys reliability-accuracy floor. */
const SPEC_CAUSALPHYS_RA = 0.85;

/**
 * A chain that clears EVERY criterion: a strong effect, a tight enough CI, a placebo
 * that leaks nothing, an entity swap that moves nothing, and a relation CausalPhys
 * composed almost perfectly.
 *
 * Every boundary test starts from this and moves exactly ONE number, so a failure says
 * which cut-off moved.
 */
const CLEAN: AdversaryRedTeamInput = {
  chainId: "T6-CLEAN",
  pointEValue: 2.5,
  ciEValue: 1.8,
  placeboLeak: 0.001,
  entitySwapDivergence: 0.005,
  causalPhysRa: 0.95,
};

/** CLEAN with one measurement replaced. */
function chain(overrides: Partial<AdversaryRedTeamInput>): AdversaryRedTeamInput {
  return { ...CLEAN, ...overrides };
}

/** The criterion codes a verdict fired, in order. */
function codes(v: AdversaryRedTeamVerdict): string[] {
  return v.criteria.map((c) => c.code);
}

/**
 * Two arms of `n` observations, the treated arm shifted by `delta`.
 *
 * The control arm alternates 0 and 1 (mean exactly 0.5); the treated arm is the same
 * pattern shifted by `delta`. The construction is deterministic and the arithmetic is
 * exact for the deltas used below (halves and hundredths of a power of two), so the
 * E-value the shared machinery computes is stable across runs.
 */
function twoArms(n: number, delta: number): {
  treated: number[];
  control: number[];
} {
  const control: number[] = [];
  const treated: number[] = [];
  for (let i = 0; i < n; i++) {
    const base = i % 2 === 0 ? 0 : 1;
    control.push(base);
    treated.push(base + delta);
  }
  return { treated, control };
}

// ---------------------------------------------------------------------------
// T6
// ---------------------------------------------------------------------------

describe("T6 -- the adversary red-team interception", () => {
  /**
   * THE GATE OPENS. A chain that clears all five cut-offs is published, and the verdict
   * says so in the same fields a refusal would use -- so a caller never has to guess
   * whether "no criteria" means "passed" or "never ran".
   */
  it("a chain that clears every criterion is NOT blocked", () => {
    const verdict = adversaryRedTeamIntercept(CLEAN);

    expect(verdict.blocked).toBe(false);
    expect(verdict.code).toBe(T6_REFUSAL.accepted);
    expect(verdict.criteria).toEqual([]);
    expect(verdict.reasons).toEqual([]);
    expect(verdict.chainId).toBe("T6-CLEAN");
    // The measurements are echoed back, so the verdict is a record, not just a decision.
    expect(verdict.measurements.pointEValue).toBe(2.5);
    expect(verdict.measurements.ciEValue).toBe(1.8);
    expect(verdict.measurements.placeboLeak).toBe(0.001);
    expect(verdict.measurements.entitySwapDivergence).toBe(0.005);
    expect(verdict.measurements.causalPhysRa).toBe(0.95);
  });

  /**
   * CUT-OFF 1 -- THE POINT E-VALUE. 1.35 PASSES; 1.3499 IS REFUSED.
   *
   * The spec's inequality is strict (`< 1.35`), so a chain sitting exactly on the floor
   * is admitted. A gate that refused it would be inventing a stricter rule than the
   * spec states, and a gate that admitted 1.3499 would be inventing a looser one.
   */
  it("the point E-value cut-off is exact: 1.35 passes, 1.3499 is refused", () => {
    const at = adversaryRedTeamIntercept(chain({ pointEValue: SPEC_POINT_E_VALUE }));
    expect(at.blocked).toBe(false);
    expect(at.code).toBe(T6_REFUSAL.accepted);
    expect(at.criteria).toEqual([]);

    const justUnder = adversaryRedTeamIntercept(chain({ pointEValue: 1.3499 }));
    expect(justUnder.blocked).toBe(true);
    expect(justUnder.code).toBe(T6_REFUSAL.intercepted);
    expect(codes(justUnder)).toEqual([T6_REFUSAL.pointEValueBelowFloor]);
    expect(justUnder.criteria[0]?.criterion).toBe(T6_CRITERION.pointEValue);
    expect(justUnder.criteria[0]?.value).toBe(1.3499);
    expect(justUnder.criteria[0]?.threshold).toBe(SPEC_POINT_E_VALUE);
    // The reason names the number and the floor it missed.
    expect(justUnder.reasons[0]).toContain("1.3499");
    expect(justUnder.reasons[0]).toContain("1.35");
  });

  /**
   * CUT-OFF 2 -- THE CI E-VALUE. 1.10 PASSES; 1.0999 IS REFUSED.
   *
   * The CI floor is LOWER than the point floor on purpose: it is a floor on a BOUND, not
   * on a central claim. The two are separate criteria, and the spec makes them a
   * conjunction -- a chain with a strong point estimate and a hopeless confidence bound
   * is still refused.
   */
  it("the CI E-value cut-off is exact: 1.1 passes, 1.0999 is refused", () => {
    const at = adversaryRedTeamIntercept(chain({ ciEValue: SPEC_CI_E_VALUE }));
    expect(at.blocked).toBe(false);
    expect(at.criteria).toEqual([]);

    const justUnder = adversaryRedTeamIntercept(chain({ ciEValue: 1.0999 }));
    expect(justUnder.blocked).toBe(true);
    expect(codes(justUnder)).toEqual([T6_REFUSAL.ciEValueBelowFloor]);
    expect(justUnder.criteria[0]?.criterion).toBe(T6_CRITERION.ciEValue);
    expect(justUnder.criteria[0]?.value).toBe(1.0999);
    expect(justUnder.criteria[0]?.threshold).toBe(SPEC_CI_E_VALUE);
    expect(justUnder.reasons[0]).toContain("1.0999");
  });

  /**
   * CUT-OFF 3 -- THE PLACEBO LEAK. 0.005 PASSES; 0.0051 IS REFUSED.
   *
   * The spec's inequality is `> 0.005`, so the ceiling value itself is admitted. A
   * leak of exactly 0.005 is the spec's own boundary, not a leak.
   */
  it("the placebo cut-off is exact: 0.005 passes, 0.0051 is refused", () => {
    const at = adversaryRedTeamIntercept(chain({ placeboLeak: SPEC_PLACEBO_LEAK }));
    expect(at.blocked).toBe(false);
    expect(at.criteria).toEqual([]);

    const justOver = adversaryRedTeamIntercept(chain({ placeboLeak: 0.0051 }));
    expect(justOver.blocked).toBe(true);
    expect(codes(justOver)).toEqual([T6_REFUSAL.placeboLeakAboveCeiling]);
    expect(justOver.criteria[0]?.criterion).toBe(T6_CRITERION.placeboLeak);
    expect(justOver.criteria[0]?.value).toBe(0.0051);
    expect(justOver.criteria[0]?.threshold).toBe(SPEC_PLACEBO_LEAK);
    expect(justOver.reasons[0]).toContain("0.0051");
  });

  /**
   * CUT-OFF 4 -- THE ENTITY-SWAP DIVERGENCE. 0.02 IS REFUSED; 0.0199 PASSES.
   *
   * THIS ONE IS INCLUSIVE, and that is the spec's own wording (`>= 0.02`). A divergence
   * of exactly 0.02 means the estimate moved two percent when the subject was swapped,
   * which is the spec's definition of "this is a fact about the entity, not a causal
   * relation" -- so the chain is refused AT the limit. The direction of the criterion is
   * also worth stating: it is a HIGH divergence that refuses. A chain whose estimate
   * barely moves under the swap is the one that survives.
   */
  it("the entity-swap cut-off is exact: 0.02 is refused, 0.0199 passes", () => {
    const at = adversaryRedTeamIntercept(chain({ entitySwapDivergence: SPEC_ENTITY_SWAP_DIVERGENCE }));
    expect(at.blocked).toBe(true);
    expect(codes(at)).toEqual([T6_REFUSAL.entitySwapAtOrAboveLimit]);
    expect(at.criteria[0]?.criterion).toBe(T6_CRITERION.entitySwapDivergence);
    expect(at.criteria[0]?.value).toBe(0.02);
    expect(at.criteria[0]?.threshold).toBe(SPEC_ENTITY_SWAP_DIVERGENCE);
    expect(at.reasons[0]).toContain("0.02");

    const justUnder = adversaryRedTeamIntercept(chain({ entitySwapDivergence: 0.0199 }));
    expect(justUnder.blocked).toBe(false);
    expect(justUnder.criteria).toEqual([]);
  });

  /**
   * CUT-OFF 5 -- THE CAUSALPHYS RELIABILITY-ACCURACY. 0.85 PASSES; 0.8499 IS REFUSED.
   */
  it("the CausalPhys RA cut-off is exact: 0.85 passes, 0.8499 is refused", () => {
    const at = adversaryRedTeamIntercept(chain({ causalPhysRa: SPEC_CAUSALPHYS_RA }));
    expect(at.blocked).toBe(false);
    expect(at.criteria).toEqual([]);

    const justUnder = adversaryRedTeamIntercept(chain({ causalPhysRa: 0.8499 }));
    expect(justUnder.blocked).toBe(true);
    expect(codes(justUnder)).toEqual([T6_REFUSAL.causalPhysRaBelowFloor]);
    expect(justUnder.criteria[0]?.criterion).toBe(T6_CRITERION.causalPhysRa);
    expect(justUnder.criteria[0]?.value).toBe(0.8499);
    expect(justUnder.criteria[0]?.threshold).toBe(SPEC_CAUSALPHYS_RA);
    expect(justUnder.reasons[0]).toContain("0.8499");
  });

  /**
   * THE FIVE CRITERIA ARE INDEPENDENT, AND EVERY ONE THAT FIRES IS REPORTED.
   *
   * The spec's line is a disjunction ("or"), so one failure is enough to block -- but a
   * gate that stops at the FIRST failure tells the caller only that the chain is not
   * publishable, not how far from publishable it is. A chain that fails all five is
   * reported with all five, each with its own code, its own numbers, and its own
   * sentence.
   *
   * A second chain fails exactly TWO of the five, and is reported with exactly those two
   * -- which is what proves the gate is not simply reporting everything every time.
   */
  it("every fired criterion is reported, not just the first", () => {
    const all = adversaryRedTeamIntercept(
      chain({
        pointEValue: 1.2,
        ciEValue: 1.05,
        placeboLeak: 0.02,
        entitySwapDivergence: 0.05,
        causalPhysRa: 0.6,
      }),
    );

    expect(all.blocked).toBe(true);
    expect(all.code).toBe(T6_REFUSAL.intercepted);
    expect(all.criteria.length).toBe(5);
    // EVERY criterion, in the fixed order, with its own code.
    expect(codes(all)).toEqual([
      T6_REFUSAL.pointEValueBelowFloor,
      T6_REFUSAL.ciEValueBelowFloor,
      T6_REFUSAL.placeboLeakAboveCeiling,
      T6_REFUSAL.entitySwapAtOrAboveLimit,
      T6_REFUSAL.causalPhysRaBelowFloor,
    ]);
    expect(all.criteria.map((c) => c.criterion)).toEqual([
      T6_CRITERION.pointEValue,
      T6_CRITERION.ciEValue,
      T6_CRITERION.placeboLeak,
      T6_CRITERION.entitySwapDivergence,
      T6_CRITERION.causalPhysRa,
    ]);
    // One reason per fired criterion -- the reasons are not a summary.
    expect(all.reasons.length).toBe(5);
    for (const reason of all.reasons) expect(reason.length).toBeGreaterThan(0);
    // And each reason names the number that failed it.
    expect(all.reasons[0]).toContain("1.2");
    expect(all.reasons[1]).toContain("1.05");
    expect(all.reasons[2]).toContain("0.02");
    expect(all.reasons[3]).toContain("0.05");
    expect(all.reasons[4]).toContain("0.6");

    const two = adversaryRedTeamIntercept(
      chain({ pointEValue: 1.2, entitySwapDivergence: 0.05 }),
    );
    expect(two.blocked).toBe(true);
    expect(codes(two)).toEqual([
      T6_REFUSAL.pointEValueBelowFloor,
      T6_REFUSAL.entitySwapAtOrAboveLimit,
    ]);
    expect(two.reasons.length).toBe(2);
  });

  /**
   * AN UNMEASURED CRITERION IS REFUSED, NOT PASSED.
   *
   * A criterion whose measurement is missing cannot be shown to clear its threshold, and
   * an unshown robustness is not a robustness that passed -- the same rule the rest of
   * the engine follows (see the `eValue` field in causal-claim-gate.ts). The refusal
   * says WHICH measurement was missing, so the caller knows what to go and measure.
   *
   * This is also the case where the arms are too small to yield an E-value at all: the
   * shared machinery returns null below 30 observations per arm, and null means
   * unmeasured here, not "1.0, so it failed the floor".
   */
  it("an unmeasured criterion is refused, not passed", () => {
    const nothing: AdversaryRedTeamInput = { chainId: "T6-EMPTY" };
    const verdict = adversaryRedTeamIntercept(nothing);

    expect(verdict.blocked).toBe(true);
    expect(codes(verdict)).toEqual([
      T6_REFUSAL.pointEValueUnmeasured,
      T6_REFUSAL.ciEValueUnmeasured,
      T6_REFUSAL.placeboLeakUnmeasured,
      T6_REFUSAL.entitySwapUnmeasured,
      T6_REFUSAL.causalPhysRaUnmeasured,
    ]);
    expect(verdict.measurements.pointEValue).toBeNull();
    expect(verdict.measurements.pointEValueSource).toBe("UNMEASURED");
    expect(verdict.criteria.every((c) => c.value === null)).toBe(true);
    expect(verdict.reasons[0]).toContain("never measured");

    // An arm below 30 observations cannot produce an E-value at all.
    const small = twoArms(29, 0.5);
    const measured = measureChainEValues(small.treated, small.control);
    expect(measured.pointEValue).toBeNull();
    expect(measured.ciEValue).toBeNull();

    const fromSmallArms = adversaryRedTeamIntercept({
      chainId: "T6-SMALL",
      treatedSamples: small.treated,
      controlSamples: small.control,
      placeboLeak: 0.001,
      entitySwapDivergence: 0.005,
      causalPhysRa: 0.95,
    });
    expect(fromSmallArms.blocked).toBe(true);
    expect(codes(fromSmallArms)).toEqual([
      T6_REFUSAL.pointEValueUnmeasured,
      T6_REFUSAL.ciEValueUnmeasured,
    ]);
  });

  /**
   * THE E-VALUES ARE DERIVED FROM THE ARMS BY THE REPOSITORY'S EXISTING MACHINERY.
   *
   * The module does not have its own E-value formula: it calls
   * `computeMeasuredEValueFromResiduals()`, the same VanderWeele & Ding (2017)
   * conversion the mediator-expansion path uses, and the numbers it reports are that
   * function's numbers, bit for bit. If the module had drifted onto a second formula,
   * this equality would fail.
   *
   * A strong effect clears the point floor and the CI floor; a weak effect clears
   * neither, and the two refusals are reported separately.
   */
  it("the E-values are derived from the arms with the shared machinery", () => {
    const strong = twoArms(40, 0.5);
    const strongStats = computeMeasuredEValueFromResiduals(strong.treated, strong.control);
    expect(strongStats).not.toBeNull();
    expect(strongStats?.measuredEValue).toBeGreaterThan(SPEC_POINT_E_VALUE);
    expect(strongStats?.measuredCiEValue).toBeGreaterThan(SPEC_CI_E_VALUE);

    const strongVerdict = adversaryRedTeamIntercept({
      chainId: "T6-DERIVED-STRONG",
      treatedSamples: strong.treated,
      controlSamples: strong.control,
      placeboLeak: 0.001,
      entitySwapDivergence: 0.005,
      causalPhysRa: 0.95,
    });
    expect(strongVerdict.blocked).toBe(false);
    // EXACTLY the shared machinery's numbers, not a re-derivation of them.
    expect(strongVerdict.measurements.pointEValue).toBe(strongStats?.measuredEValue);
    expect(strongVerdict.measurements.ciEValue).toBe(strongStats?.measuredCiEValue);
    expect(strongVerdict.measurements.pointEValueSource).toBe("DERIVED");
    expect(strongVerdict.measurements.ciEValueSource).toBe("DERIVED");

    const weak = twoArms(40, 0.02);
    const weakStats = computeMeasuredEValueFromResiduals(weak.treated, weak.control);
    expect(weakStats?.measuredEValue).toBeLessThan(SPEC_POINT_E_VALUE);

    const weakVerdict = adversaryRedTeamIntercept({
      chainId: "T6-DERIVED-WEAK",
      treatedSamples: weak.treated,
      controlSamples: weak.control,
      placeboLeak: 0.001,
      entitySwapDivergence: 0.005,
      causalPhysRa: 0.95,
    });
    expect(weakVerdict.blocked).toBe(true);
    expect(codes(weakVerdict)).toEqual([
      T6_REFUSAL.pointEValueBelowFloor,
      T6_REFUSAL.ciEValueBelowFloor,
    ]);
    expect(weakVerdict.measurements.pointEValue).toBe(weakStats?.measuredEValue);
    expect(weakVerdict.measurements.pointEValueSource).toBe("DERIVED");
  });

  /**
   * AN EXPLICIT E-VALUE WINS OVER THE DERIVED ONE.
   *
   * The caller that measured the E-value knows more about how it was measured than the
   * gate does, so an explicit number is taken as given -- and the verdict says which of
   * the two it used, because a gate that silently swapped one for the other would be
   * judging a number the caller never supplied.
   */
  it("an explicit E-value wins over the derived one", () => {
    const arms = twoArms(40, 0.02);
    const derived = measureChainEValues(arms.treated, arms.control);
    expect(derived.pointEValue).not.toBeNull();
    expect(derived.pointEValue).toBeLessThan(SPEC_POINT_E_VALUE);

    const verdict = adversaryRedTeamIntercept({
      chainId: "T6-EXPLICIT",
      treatedSamples: arms.treated,
      controlSamples: arms.control,
      pointEValue: 2.5,
      ciEValue: 1.8,
      placeboLeak: 0.001,
      entitySwapDivergence: 0.005,
      causalPhysRa: 0.95,
    });

    expect(verdict.blocked).toBe(false);
    expect(verdict.measurements.pointEValue).toBe(2.5);
    expect(verdict.measurements.pointEValueSource).toBe("EXPLICIT");
    expect(verdict.measurements.ciEValueSource).toBe("EXPLICIT");
  });

  /**
   * THE THRESHOLDS ARE THE SPEC'S NUMBERS, AND THEY ARE THE ENGINE'S SHARED CONSTANTS.
   *
   * Two things are pinned here. First, the literal values: 1.35, 1.10, 0.005, 0.02,
   * 0.85. A threshold that drifts is a threshold that no longer means what the spec
   * says. Second, the IDENTITY with the constants the rest of the engine already
   * enforces (MIN_EXPANSION_E_VALUE and MIN_EXPANSION_CI_E_VALUE in
   * hcid-mediator-expansion.ts): the spec's step 4.4 and the spec's G4 name the same
   * numbers, and a second copy of 1.35 in a second file is a constant waiting to drift
   * away from the first.
   */
  it("the thresholds are the spec's numbers and the shared constants", () => {
    expect(MIN_POINT_E_VALUE).toBe(SPEC_POINT_E_VALUE);
    expect(MIN_CI_E_VALUE).toBe(SPEC_CI_E_VALUE);
    expect(MAX_PLACEBO_LEAK).toBe(SPEC_PLACEBO_LEAK);
    expect(MAX_ENTITY_SWAP_DIVERGENCE).toBe(SPEC_ENTITY_SWAP_DIVERGENCE);
    expect(MIN_CAUSALPHYS_RA).toBe(SPEC_CAUSALPHYS_RA);

    expect(MIN_POINT_E_VALUE).toBe(MIN_EXPANSION_E_VALUE);
    expect(MIN_CI_E_VALUE).toBe(MIN_EXPANSION_CI_E_VALUE);
  });
});

// ---------------------------------------------------------------------------
// THE SWEEP. This is what makes the eleven tests above a GATE rather than a file.
// ---------------------------------------------------------------------------

/** The package root, from this file at test/. */
const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** The sweep, relative to the package root. */
const SWEEP_REL = "reconciliation/_mutation_sweep_t6_red_team.mjs";

/**
 * The sweep's result, memoised.
 *
 * The sweep takes minutes, and the two assertions below need the SAME run -- one for
 * the exit code and one for the output. Running it twice would double the suite's
 * wall time for no extra evidence, and would double the window in which the source
 * tree is mutated.
 */
let SWEEP_RESULT: { code: number; output: string } | null = null;

/**
 * Run the sweep and return its exit code and its output.
 *
 * The sweep mutates the source tree, so it is run with the working directory set to
 * the package root (where its relative paths resolve) and it is run EXACTLY ONCE per
 * suite run -- the sweep's own child runs are told to skip this invocation.
 */
function runSweep(): { code: number; output: string } {
  if (SWEEP_RESULT) return SWEEP_RESULT;
  try {
    const output = execFileSync(process.execPath, [resolve(PKG, SWEEP_REL)], {
      encoding: "utf8",
      cwd: PKG,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, T6_SWEEP_CHILD: "0" },
    });
    SWEEP_RESULT = { code: 0, output };
  } catch (error) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    SWEEP_RESULT = { code: e.status ?? 1, output: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
  return SWEEP_RESULT;
}

describe("T6 -- the mutation sweep that pins the gate", () => {
  /**
   * THE SWEEP IS A GATE, NOT A FILE.
   *
   * The sweep mutates each threshold, each comparison operator, and the shape of the
   * verdict, and requires the named test above to STOP passing. A sweep that finds
   * nothing proves nothing; a sweep that reports failures and exits 0 is worse than no
   * sweep at all, because it is a gate that reports a false signal. So the exit code
   * is asserted here, AND the sweep's own output is asserted -- an exit code alone does
   * not prove the rounds ran.
   *
   * The sweep is skipped when it is the one running this file (T6_SWEEP_CHILD=1), so
   * the sweep drives the eleven subject tests and this file drives the sweep once.
   */
  it.skipIf(process.env.T6_SWEEP_CHILD === "1")(
    "the mutation sweep exits 0 -- every threshold, every boundary, every criterion is pinned",
    () => {
      const { code, output } = runSweep();
      expect(code, `the T6 mutation sweep failed:\n${output}`).toBe(0);
    },
    600_000,
  );

  /**
   * THE SWEEP ACTUALLY RAN ITS ROUNDS.
   *
   * An exit code alone proves nothing: a sweep whose mutation fragments no longer match
   * the source, or whose test titles no longer match the tests, can exit 0 having
   * checked nothing. So the OUTPUT is asserted as well -- the baseline line must be
   * there, the pass line must be there, and the string that means "this mutation
   * survived" must NOT be there.
   */
  it.skipIf(process.env.T6_SWEEP_CHILD === "1")(
    "the sweep actually RAN its rounds -- an exit code alone proves nothing",
    () => {
      const { output } = runSweep();
      // The baseline: every subject test passes with the unmutated source.
      expect(output).toContain("OK baseline: all 12 tests pass");
      // Every declared mutation was detected.
      expect(output).toContain("mutations detected: 18/18; failures: 0");
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
   * The defect this file exists to prevent, in the sweep, is a sweep that reports
   * failures and still exits 0. The exit code must be derived from the failure count
   * and from nothing else. This reads the sweep and checks the shape of its exit --
   * because a sweep that is merely run and observed to pass today can still be a sweep
   * that would exit 0 on a red baseline tomorrow.
   */
  it("the sweep is fail-closed -- a failure makes it exit non-zero", () => {
    const sweepPath = resolve(PKG, SWEEP_REL);
    expect(existsSync(sweepPath), `the sweep is missing: ${sweepPath}`).toBe(true);
    // Normalised, so a CRLF checkout does not make these assertions vacuous.
    const source = readFileSync(sweepPath, "utf8").replace(/\r\n/g, "\n");

    // Every failure is recorded on one array...
    expect(source).toContain("const FAILURES = []");
    expect(source).toContain("FAILURES.push(message)");
    // ...and the exit code is derived from that array and from nothing else. The
    // OLD shape -- a counter named `broken` -- is exactly the defect this test
    // exists to catch, so it must be ABSENT, not present.
    expect(source).toContain("if (FAILURES.length > 0) {");
    expect(source).toContain("process.exit(1);");
    expect(source).toContain("process.exit(0);");
    expect(source).not.toContain("process.exit(broken === 0 ? 0 : 1);");
    // And the sweep refuses to run against a red baseline rather than reporting
    // numbers that describe nothing.
    expect(source).toContain("PHASES SKIPPED");
  });
});
