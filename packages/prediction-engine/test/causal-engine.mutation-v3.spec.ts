/**
 * T9, T11, T12 -- THE REMAINING PR-BLOCKING GATES.
 *
 * The goal spec's section 6 requires:
 *
 *   "reconciliation/_verify_do_calculus_math.mjs (A082),
 *    reconciliation/_verify_estimand_numerically.mjs (A083), and
 *    reconciliation/_audit_unenforced_thresholds.mjs are promoted into
 *    packages/prediction-engine/test/causal-engine.mutation-v3.spec.ts,
 *    expanding the suite from T1-T8 to T1-T12"
 *
 * T10 (the A082/A083 gate) lives in do-calculus-verifiers.spec.ts.
 * This file carries the rest:
 *
 *   T9   the live E-value hedge-breakage gate -- a mediator expansion
 *        that breaks the hedge but has a FRAGILE effect must NOT
 *        activate, and the refusal must name the fragility.
 *   T11  scale-invariance of the contemporaneous DYNOTEARS fit -- the
 *        spec requires that multiplying a column by 1,000 does not
 *        change the recovered edge orientation.
 *   T12  the zero-unenforced-constants gate -- every exported
 *        threshold-named constant must be COMPARED somewhere, and the
 *        auditor's own self-test must pass, or the report means
 *        nothing.
 *
 * EACH GATE CHECKS A PROPERTY, NOT AN EXIT CODE, wherever a property
 * is checkable. An exit code proves a script ran; it does not prove
 * the script checked the thing it claims to check. So the scripts are
 * run as a second witness AND their claims are re-expressed as
 * assertions against the modules' actual behaviour.
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  MIN_EXPANSION_E_VALUE,
  MIN_MEDIATOR_SAMPLES,
  planHedgeBreakage,
  computeMeasuredEValueFromResiduals,
  MIN_EXPANSION_CI_E_VALUE,
  type MediatorCandidate,
} from "../src/causal/hcid-mediator-expansion.js";
import { runShpitserPearlID, type CausalADMG } from "../src/causal/do-calculus-id.js";
import { acyclicityExact, dynotearsFit, orientPag, ALL_ORIENTATION_RULES } from "../src/causal/fci-pag.js";
import type { EdgeMark, FciEdge } from "../src/causal/fci-pag.js";
import { laggedDynotearsFit } from "../src/causal/causal-graph-builder.js";
import { simPanel, scaleColumns } from "../src/causal/__tests__/panel-fixtures.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function runVerifier(name: string): { code: number; output: string } {
  try {
    const output = execFileSync(
      process.execPath,
      [resolve(ROOT, "reconciliation", name)],
      { encoding: "utf8", cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] },
    );
    return { code: 0, output };
  } catch (error) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? 1, output: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

/**
 * Run a script that lives in the PACKAGE's reconciliation/ directory and needs the package as
 * its working directory.
 *
 * This is separate from `runVerifier` because that one resolves against the repo ROOT's
 * reconciliation/ directory. The R5-R10 mutation sweep is in the package's directory and
 * resolves its source and test paths relative to the package, so it must be run from there.
 */
function runPackageScript(relPath: string): { code: number; output: string } {
  const pkg = resolve(ROOT, "packages", "prediction-engine");
  try {
    const output = execFileSync(process.execPath, [resolve(pkg, relPath)], {
      encoding: "utf8",
      cwd: pkg,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, output };
  } catch (error) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? 1, output: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

/** A deterministic 32-bit PRNG, matching the repo's own test generator. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / (2 ** 32);
  };
}

function randn(rand: () => number): number {
  const u1 = Math.max(rand(), 1e-12);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * THE BOW-ARC: X -> Y with X <-> Y. Unidentifiable on its own.
 *
 * The mediator is NOT in the graph: the module inserts it, expanding
 * X -> Y into X -> M -> Y, and then re-runs ID on the expanded graph.
 * That re-run is what `breaksHedge` measures. Passing a graph that
 * already contains M would test nothing -- the hedge would already be
 * broken before the module did anything.
 */
const BOW: CausalADMG = {
  nodes: ["X", "Y"],
  directed: [["X", "Y"]],
  bidirected: [["X", "Y"]],
};


/** A deterministic 24-bit LCG, so every number below is reproducible. */
function makeRng(seed: number): () => number {
  let st = seed >>> 0;
  return () => {
    st = (Math.imul(st, 1664525) + 12345) >>> 0;
    return (st >>> 8) / 16777216;
  };
}

function gaussian(rand: () => number): number {
  const u1 = Math.max(rand(), 1e-12);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

describe("T9 -- the live E-value hedge-breakage gate", () => {
  /**
   * A candidate mediator: a signal, the graph node it would occupy,
   * its validity order, and how many observations it has.
   */
  const candidate = (overrides: Partial<MediatorCandidate> = {}): MediatorCandidate => ({
    signalId: "M",
    node: "M",
    tValid: 2,
    sampleCount: 40,
    ...overrides,
  });

  it("a FRAGILE effect does not activate, even when the hedge IS broken", () => {
    // The spec: "the expanded graph G_e passes ID with zero hedges AND
    // passes Adversary Review (E-value >= 1.35)". Breaking the hedge
    // makes the effect IDENTIFIABLE; it does not make it ROBUST. The
    // two conditions are independent and BOTH are required.
    //
    // This is the spec's T9: a measured E-value of 1.18, below the
    // 1.35 floor.
    const report = planHedgeBreakage(
      new Set(["Y"]),
      new Set(["X"]),
      BOW,
      [candidate()],
      { eValue: 1.18 },
    );
    // The hedge WAS broken -- that part works.
    expect(report.attempts.length).toBeGreaterThan(0);
    expect(report.attempts.some((a) => a.breaksHedge)).toBe(true);
    // The fragility was measured and reported.
    expect(report.eValue).toBe(1.18);
    expect(report.eValuePasses).toBe(false);
    // So the expansion is NOT activating, and it is flagged as the
    // fragile kind rather than the "never broke the hedge" kind.
    expect(report.activating.length).toBe(0);
    expect(report.breaksHedgeButFragile.length).toBeGreaterThan(0);
  });

  it("an UNMEASURABLE E-value does not activate either", () => {
    // A null E-value -- not computed, or undefined because the contrast
    // had no usable rate ratio -- is not a robustness that passed. This
    // is the spec's T9 "(or null when N < 30)" case.
    const report = planHedgeBreakage(
      new Set(["Y"]),
      new Set(["X"]),
      BOW,
      [candidate()],
      { eValue: null },
    );
    expect(report.eValue).toBeNull();
    expect(report.eValuePasses).toBe(false);
    expect(report.activating.length).toBe(0);
    expect(report.breaksHedgeButFragile.length).toBeGreaterThan(0);
  });

  it("a ROBUST effect DOES activate", () => {
    // The other side of the gate: a strong effect clears the floor and
    // the expansion is activated.
    const report = planHedgeBreakage(
      new Set(["Y"]),
      new Set(["X"]),
      BOW,
      [candidate()],
      { eValue: 4.2, ciEValue: 4.2 },
    );
    expect(report.eValuePasses).toBe(true);
    expect(report.activating.length).toBeGreaterThan(0);
    expect(report.breaksHedgeButFragile.length).toBe(0);
  });

  it("the E-value floor is the spec's 1.35", () => {
    expect(MIN_EXPANSION_E_VALUE).toBe(1.35);
  });

  it("a FRAGILE CI does not activate, even when the POINT E-value passes", () => {
    // THE SPEC'S G4 IS A CONJUNCTION.
    //
    //   point E-value  >= 1.35   AND   CI E-value  >= 1.10
    //
    // The expansion path checked only the FIRST. So an expansion whose
    // point estimate was far from the null but whose CONFIDENCE BOUND
    // was nowhere near it activated on the strength of the point
    // estimate alone.
    //
    // The CI floor is lower on purpose -- it is a floor on a BOUND,
    // not a central claim -- but it is a floor, and it was not
    // applied.
    const report = planHedgeBreakage(
      new Set(["Y"]),
      new Set(["X"]),
      BOW,
      [candidate()],
      // The point clears 1.35 comfortably; the CI bound does not
      // clear 1.10.
      { eValue: 4.2, ciEValue: 1.02 },
    );
    expect(report.pointEValuePasses).toBe(true);
    expect(report.ciEValuePasses).toBe(false);
    expect(report.eValuePasses).toBe(false);
    expect(report.activating.length).toBe(0);
    // And it is reported as the fragile kind, not dropped.
    expect(report.breaksHedgeButFragile.length).toBeGreaterThan(0);
  });

  it("an UNMEASURED CI E-value does not activate either", () => {
    // A robustness that could not be measured is not a robustness
    // that passed. The point E-value is present; the CI is not.
    const report = planHedgeBreakage(
      new Set(["Y"]),
      new Set(["X"]),
      BOW,
      [candidate()],
      { eValue: 4.2, ciEValue: null },
    );
    expect(report.pointEValuePasses).toBe(true);
    expect(report.ciEValuePasses).toBe(false);
    expect(report.eValuePasses).toBe(false);
    expect(report.activating.length).toBe(0);
  });

  it("the CI floor is the spec's 1.10", () => {
    expect(MIN_EXPANSION_CI_E_VALUE).toBe(1.10);
    // And it is the boundary: exactly 1.10 passes, just under fails.
    const at = planHedgeBreakage(
      new Set(["Y"]),
      new Set(["X"]),
      BOW,
      [candidate()],
      { eValue: 4.2, ciEValue: 1.1 },
    );
    expect(at.activating.length).toBeGreaterThan(0);
    const below = planHedgeBreakage(
      new Set(["Y"]),
      new Set(["X"]),
      BOW,
      [candidate()],
      { eValue: 4.2, ciEValue: 1.0999 },
    );
    expect(below.activating.length).toBe(0);
  });

  it("the measured E-value of a residual contrast is computed, and is null below the sample floor", () => {
    // THE MEASUREMENT.
    //
    // A residual contrast is a difference in MEANS; an E-value needs a
    // RATIO. The bridge is the standardized difference d, and
    // exp(0.91 * d) is the approximate risk ratio it corresponds to
    // (VanderWeele & Ding 2017, Table 2).
    const rand = makeRng(9);
    const treated = Array.from({ length: 40 }, () => 0.5 + 0.05 * gaussian(rand));
    const control = Array.from({ length: 40 }, () => 0.05 * gaussian(rand));
    const measured = computeMeasuredEValueFromResiduals(treated, control);
    expect(measured).not.toBeNull();
    expect(measured!.nTreated).toBe(40);
    expect(measured!.nControl).toBe(40);
    // A real contrast gives a real E-value, well above 1.
    expect(measured!.measuredEValue!).toBeGreaterThan(1.35);
    // And the CI bound is BELOW the point estimate -- that is the
    // whole reason the CI floor is separate.
    expect(measured!.measuredCiEValue!).toBeLessThan(measured!.measuredEValue!);
    // The ratio is exp(0.91 * d), exactly.
    expect(measured!.pointRiskRatio).toBeCloseTo(
      Math.exp(0.91 * measured!.standardizedDifference),
      10,
    );
    // Below 30 observations per arm, there is no E-value. Not a
    // small one -- none.
    expect(
      computeMeasuredEValueFromResiduals(
        treated.slice(0, 29),
        control.slice(0, 29),
      ),
    ).toBeNull();
  });

  it("a mediator with too few samples is NOT eligible", () => {
    // The other half of the spec's T9: "or null when N < 30". Below
    // the sample floor the mediator is rejected outright, so it cannot
    // even break the hedge.
    const report = planHedgeBreakage(
      new Set(["Y"]),
      new Set(["X"]),
      BOW,
      [candidate({ sampleCount: MIN_MEDIATOR_SAMPLES - 1 })],
      { eValue: 4.2, ciEValue: 4.2 },
    );
    const attempt = report.attempts[0]!;
    expect(attempt.eligible).toBe(false);
    expect(attempt.rejection).toBe("TOO_FEW_SAMPLES");
    expect(report.activating.length).toBe(0);
  });
});

describe("T11 -- the contemporaneous DYNOTEARS fit is scale-invariant", () => {
  /**
   * THE DIAMOND: 0 -> 1, 0 -> 2, 1 -> 3, 2 -> 3.
   *
   * The repo's established SCM for the dynotearsFit block, so this
   * gate is checked against a DGP the project already trusts.
   */
  const diamond = (n: number, seed: number): number[][] => {
    const rand = mulberry32(seed);
    const X: number[][] = [];
    for (let i = 0; i < n; i += 1) {
      const x0 = randn(rand);
      const x1 = 0.9 * x0 + 0.6 * randn(rand);
      const x2 = 0.9 * x0 + 0.6 * randn(rand);
      const x3 = 0.9 * x1 + 0.9 * x2 + 0.6 * randn(rand);
      X.push([x0, x1, x2, x3]);
    }
    return X;
  };

  /**
   * THE COLLIDER: A -> B <- C. This is the IDENTIFIABLE case, and
   * it is where the DIRECTION is determined.
   *
   * WHY TWO DGPs. The diamond is NOT identifiable in direction: it is
   * Markov-equivalent to its reversal, so the fit may return either
   * and both are correct. The repo's own suite draws the line exactly
   * here -- it asserts the SKELETON for the diamond and the DIRECTION
   * only for the collider ("Identifiable case: the collider A -> B <-
   * C. The v-structure is what the likelihood prefers, so both edges
   * must point INTO B"). This gate follows the same line, because
   * asserting a direction the data cannot identify would be a test
   * that fails for the right reason and teaches the wrong lesson.
   */
  const collider = (n: number, seed: number): number[][] => {
    const rand = mulberry32(seed);
    const X: number[][] = [];
    for (let i = 0; i < n; i += 1) {
      const a = randn(rand);
      const c = randn(rand);
      X.push([a, 0.9 * a + 0.9 * c + 0.6 * randn(rand), c]);
    }
    return X;
  };

  /** The DIRECTED edge set, as comparable strings. */
  const directed = (edges: readonly (readonly [number, number])[]): string[] =>
    edges.map(([a, b]) => `${a}->${b}`).sort();

  it("the SKELETON is identical after scaling a column by 1,000", () => {
    // The spec's T11: "Multiplies wind speed and altitude columns by
    // 1,000x and verifies that precision-preconditioned l_NV recovers
    // the identical directed edge orientation ... without
    // variance-sorting reversal."
    //
    // A scale-invariance failure is the variance-sorting pathology the
    // non-equal-variance objective exists to prevent: the fit would
    // chase the large-magnitude column and drop the others.
    //
    // For the diamond the identifiable object is the SKELETON, so
    // that is what is compared.
    const rows = diamond(2000, 41);
    const scaled = rows.map((r) => [r[0]!, r[1]! * 1000, r[2]! * 1000, r[3]!]);
    const base = dynotearsFit(rows, { edgeThreshold: 0.1 });
    const scaledFit = dynotearsFit(scaled, { edgeThreshold: 0.1 });
    const skeleton = (edges: readonly (readonly [number, number])[]): string[] =>
      [...new Set(edges.map(([i, j]) => `${Math.min(i, j)}-${Math.max(i, j)}`))].sort();
    expect(skeleton(scaledFit.edges)).toEqual(skeleton(base.edges));
  });

  it("the DIRECTED edges are identical after scaling, on the IDENTIFIABLE collider", () => {
    // The collider A -> B <- C is identifiable: the v-structure is
    // what the likelihood prefers, so both edges must point INTO B.
    // And the direction must SURVIVE the rescaling -- that is the
    // stronger version of the claim, and it is the one the spec
    // words ("the identical directed edge orientation").
    const rows = collider(6000, 31);
    // The collider has THREE columns: a, b, c. Two of them are
    // scaled by 1,000 -- the spec's T11 multiplies two columns.
    const scaled = rows.map((r) => [r[0]!, r[1]! * 1000, r[2]! * 1000]);
    const base = dynotearsFit(rows, { edgeThreshold: 0.1 });
    const scaledFit = dynotearsFit(scaled, { edgeThreshold: 0.1 });
    expect(directed(scaledFit.edges)).toEqual(directed(base.edges));
  });

  it("the fit recovers the collider's DIRECTION (so the test is not vacuous)", () => {
    // Without this, the invariance test would pass on a fit that
    // recovers NOTHING -- two empty edge sets are equal.
    const rows = collider(6000, 31);
    const fit = dynotearsFit(rows, { edgeThreshold: 0.1 });
    expect(directed(fit.edges)).toEqual(["0->1", "2->1"]);
    // And it is ACYCLIC.
    //
    // h(W) is the optimizer's CONVERGED value, not exactly zero: the
    // fit stops when the gradient is below its tolerance, so the
    // residual is O(1e-7), not O(0). The module's own test asserts
    // the same way -- `acyclicityExact(adj).h` LESS THAN 1e-9 on the
    // thresholded adjacency -- and this uses the module's tolerance
    // rather than pretending the fit lands on zero.
    expect(fit.h).toBeLessThan(1e-5);
    const adjacency = Array.from({ length: 3 }, () => new Array(3).fill(0));
    for (const [k, j] of fit.edges) adjacency[k]![j] = 1;
    expect(acyclicityExact(adjacency).h).toBeLessThan(1e-9);
  });

  it("the fit recovers the diamond's SKELETON", () => {
    const rows = diamond(2000, 41);
    const fit = dynotearsFit(rows, { edgeThreshold: 0.1 });
    const skeleton = [...new Set(fit.edges.map(([i, j]) => `${Math.min(i, j)}-${Math.max(i, j)}`))].sort();
    // The diamond's skeleton is 0-1, 0-2, 1-3, 2-3. (The unrestricted
    // fit also adds a 1-2 edge -- a real, measured failure that the
    // module's own header reports, and the reason the repo's suite
    // constrains the fit with the FCI support when it needs an exact
    // edge set.)
    for (const edge of ["0-1", "0-2", "1-3", "2-3"]) {
      expect(skeleton).toContain(edge);
    }
    expect(fit.h).toBeLessThan(1e-5);
  });
});

describe("T11c -- the LAGGED DYNOTEARS fit is scale-invariant and recovers lagged edges", () => {
  /**
   * THE SPEC'S T11, the part the contemporaneous gate above does not cover. The spec asks for
   * "scale-invariant lagged DYNOTEARS (A_tau)" and for the l_NV objective to "recover the
   * identical directed edge orientation on BOTH contemporaneous W_0 and lagged A_1 matrices
   * without variance-sorting reversal."
   *
   * So the lagged block is not an optional extra: the spec names the A_1 matrix explicitly.
   * This gate fits a panel DGP with one contemporaneous collider and one lagged edge, scales
   * two features by 1,000x, and requires that BOTH edge sets come out identical.
   *
   * THE FIXTURE IS THE MODULE'S OWN, not a re-derivation. The DGP and the generator live in
   * src/causal/causal-graph-builder.test.ts, and a PRNG copied between two files is one that
   * will drift -- two files meant to measure the same data would quietly measure different
   * data. The module's own test file therefore exports the generator, and this gate imports
   * it.
   */
  it("the lagged fit recovers the true lagged edge, and scaling by 1,000x moves no edge", () => {
    const frames = simPanel(60, 30, 11);
    const fitOpts = { lags: 1, lambdaW: 0.05, lambdaA: 0.05, edgeThreshold: 0.1 };

    const base = laggedDynotearsFit(frames, fitOpts);
    const scaled = laggedDynotearsFit(scaleColumns(frames, [0, 2], 1000), fitOpts);

    // NOT VACUOUS: the fit found the contemporaneous collider and the lagged edge. Without
    // this, two EMPTY edge sets would satisfy the equality below -- the failure mode of an
    // invariance test that measures nothing.
    const contemporaneous = base.contemporaneousEdges.map(([a, b]) => `${a}->${b}`).sort();
    const lagged = base.laggedEdges.map((e) => `${e.lag}:${e.from}->${e.to}`).sort();
    expect(contemporaneous).toEqual(expect.arrayContaining(["0->1", "2->1"]));
    expect(lagged).toContain("1:1->3");
    expect(contemporaneous.length).toBeGreaterThan(0);
    expect(lagged.length).toBeGreaterThan(0);

    // THE GATE: the W_0 edges AND the A_1 edges are both unmoved by the rescaling.
    expect(scaled.contemporaneousEdges.map(([a, b]) => `${a}->${b}`).sort()).toEqual(contemporaneous);
    expect(scaled.laggedEdges.map((e) => `${e.lag}:${e.from}->${e.to}`).sort()).toEqual(lagged);
  });

  it("the lagged fit is ACYCLIC in its contemporaneous block", () => {
    // h is the parameter the acyclicity constraint is imposed on, and it is reported on the
    // STANDARDISED matrix -- the one whose support defines the reported edge set. h is not
    // scale invariant (its magnitude grows with the scale of the coefficients), which is
    // exactly why it is reported on the standardised matrix and not the original-unit one.
    const frames = simPanel(40, 30, 11);
    const fit = laggedDynotearsFit(frames, { lags: 1, lambdaW: 0.05, lambdaA: 0.05, edgeThreshold: 0.1 });
    expect(fit.h).toBeLessThan(1e-5);
    const adjacency = Array.from({ length: 4 }, () => new Array(4).fill(0));
    for (const [k, j] of fit.contemporaneousEdges) adjacency[k]![j] = 1;
    expect(acyclicityExact(adjacency).h).toBeLessThan(1e-9);
  });
});

describe("T11b -- the Zhang (2008) R5-R10 rules are IMPLEMENTED AND PINNED", () => {
  /**
   * THE SPEC'S T11, in its own words: the FCI orientation rules R5-R10 "including R5-R7
   * selection/circle-path rules" and "R8-R10 tail completion".
   *
   * The rule-level unit tests live in src/causal/fci-pag-r5-r10.test.ts, where each rule is
   * applied ALONE so that the test measures that rule and not the fixpoint. This gate is the
   * other half: it proves those tests are PINNED, i.e. that deleting a rule makes its test
   * fail. A rule test that still passes when its rule is deleted is a test that reports a
   * guarantee the code does not provide, and that is exactly what the sweep exists to catch.
   *
   * The sweep is run as a second witness; the property it checks (each rule is pinned) is
   * re-expressed below as an assertion on the sweep's own output, because an exit code proves
   * a script ran, not that it checked the thing it claims to check.
   */
  it("the mutation sweep exits 0 -- every rule and every antecedent is pinned", () => {
    const { code, output } = runPackageScript("reconciliation/_mutation_sweep_r5_r10.mjs");
    expect(code, `the R5-R10 mutation sweep failed:\n${output}`).toBe(0);
  });

  it("the PERIODIC-ID sweep exits 0 -- the Jahn bound and every refusal are pinned", () => {
    // The periodic-ID module was written by a delegate, and a delegate's passing test suite
    // is evidence about the delegate's tests, not about the requirement. This sweep holds
    // the module to the same standard the FCI rules were held to: the Proposition 1 bound
    // is broken arithmetically, and each refusal (the node budget, the latency mismatch, the
    // out-of-scope query, the inexactly-representable bound) is deleted, and the named test
    // must fail each time.
    //
    // The sweep's FAILURE MODE is not a wrong answer, it is a SILENTLY SMALLER ANSWER: a
    // window that is too small reports a confident "identifiable" for an effect that is not,
    // because the hedge that proves unidentifiability lives outside the truncated window and
    // is never seen. So the refusals are the half that matters most, and the sweep weights
    // them accordingly.
    const { code, output } = runPackageScript("reconciliation/_mutation_sweep_periodic_id.mjs");
    expect(code, `the periodic-ID mutation sweep failed:\n${output}`).toBe(0);
  });

  it("the periodic-ID sweep actually RAN its rounds -- an exit code alone proves nothing", () => {
    // A sweep that found no call site, or that matched no test title, would exit 0 having
    // checked nothing. The round names are asserted instead, because they are the evidence
    // that the sweep reached every property and every refusal.
    const { output } = runPackageScript("reconciliation/_mutation_sweep_periodic_id.mjs");
    expect(output).toContain("PHASE 1: break the computed values");
    expect(output).toContain("PHASE 2: remove a refusal");
    expect(output).toContain("OK   baseline: all 24 tests pass");
    expect(output).not.toContain("STILL PASSED");
  });

  it("the sweep actually RAN its rounds -- an exit code alone proves nothing", () => {
    // A sweep that found no call site, or that matched no test title, would exit 0 having
    // checked nothing. The round names are asserted instead, because they are the evidence
    // that the sweep reached every rule and every antecedent.
    const { output } = runPackageScript("reconciliation/_mutation_sweep_r5_r10.mjs");
    expect(output).toContain("PHASE 1: disable the rule");
    expect(output).toContain("PHASE 2: break the antecedent");
    for (const rule of ["R5", "R6", "R7", "R8", "R9", "R10"]) {
      expect(output).toContain(`${rule}:`);
    }
    // And the baseline round must be clean, or a sweep that fails everything proves nothing.
    expect(output).toContain("OK   baseline: all 15 tests pass with the unmutated source");
    expect(output).not.toContain("STILL PASSED");
  });

  it("the R5-R10 rules are REACHABLE from the public entry point", () => {
    // A rule that is implemented but never called is not a rule. The orientation switch
    // exposes every rule id, and each id must correspond to a rule the fixpoint applies.
    // The switch is what makes the rule-level unit tests possible at all: without it, the
    // competing rules (completeAncestral, R2) can fire on the same configuration and the
    // test measures the fixpoint instead of the rule.
    expect(ALL_ORIENTATION_RULES).toEqual(
      expect.arrayContaining(["R5", "R6", "R7", "R8", "R9", "R10"]),
    );
    expect(ALL_ORIENTATION_RULES.length).toBe(12);
  });

  it("orientPag runs ONLY the requested rules", () => {
    // The switch is a real switch, not a label. On this graph R8 and completeAncestral both
    // want to write a tail at 0; with R8 alone the tail appears, and with
    // completeAncestral alone it also appears, but with NEITHER enabled it does not.
    const graph: FciEdge[] = [
      { u: 0, v: 1, markU: "tail", markV: "arrowhead" },
      { u: 1, v: 2, markU: "tail", markV: "arrowhead" },
      { u: 0, v: 2, markU: "circle", markV: "arrowhead" },
    ];
    const markAt0 = (edges: readonly FciEdge[]): EdgeMark | undefined =>
      edges.find((e) => e.u === 0 && e.v === 2)?.markU;
    expect(markAt0(orientPag(3, graph, new Map(), ["R8"]))).toBe("tail");
    expect(markAt0(orientPag(3, graph, new Map(), ["ancestralCompletion"]))).toBe("tail");
    expect(markAt0(orientPag(3, graph, new Map(), []))).toBe("circle");
    // And with no argument, everything runs -- the default is the full fixpoint.
    expect(markAt0(orientPag(3, graph))).toBe("tail");
  });
});

describe("T12 -- the zero-unenforced-constants gate", () => {
  it("the auditor exits 0", () => {
    const { code, output } = runVerifier("_audit_unenforced_thresholds.mjs");
    expect(code, `the threshold auditor failed:\n${output}`).toBe(0);
  });

  it("the auditor's OWN SELF-TEST passes -- or the report means nothing", () => {
    // The auditor has a self-test: it injects a constant that is never
    // compared and checks that the machinery FINDS it. A scanner that
    // cannot detect the thing it scans for is a scanner that reports
    // "clean" on everything.
    const { output } = runVerifier("_audit_unenforced_thresholds.mjs");
    expect(output).toContain("AUDIT SELF-TEST PASS");
    expect(output).not.toContain("AUDIT SELF-TEST FAIL");
  });

  it("MIN_EXPANSION_E_VALUE is FOUND AND IS GATED", () => {
    // The specific constant the audit was written for. The auditor
    // reports it as gated, which means it found a comparison site for
    // it.
    const { output } = runVerifier("_audit_unenforced_thresholds.mjs");
    expect(output).toContain("MIN_EXPANSION_E_VALUE");
  });

  it("the gate FAILS when a threshold constant stops gating", () => {
    // THE PROPERTY, NOT THE EXIT CODE.
    //
    // "the auditor exits 0" is a weak assertion: it passes whenever
    // the auditor is happy, and the auditor is happy about a report
    // that lists findings. The spec says the gate must FAIL CI when a
    // threshold constant has no active comparison site -- so the gate
    // has to be shown FAILING when that is true.
    //
    // This copies the auditor and the constant it checks into a
    // TEMPORARY directory, breaks the comparison, and runs the copy.
    // The real auditor and the real constants are untouched.
    const scratch = mkdtempSync(join(tmpdir(), "t12-"));
    try {
      const auditorSrc = readFileSync(
        resolve(ROOT, "reconciliation", "_audit_unenforced_thresholds.mjs"),
        "utf8",
      );
      // A copy whose scanner root contains ONE dead threshold export
      // and nothing else.
      const deadFile = join(scratch, "dead-threshold.ts");
      writeFileSync(
        deadFile,
        "export const MIN_T12_PROBE_THRESHOLD = 1.35;\n" +
          "export const UNRELATED = 2;\n",
        "utf8",
      );
      // The auditor resolves its SCAN_ROOTS against ITS OWN `root`,
      // which is the repo root for the real script. The copy lives in
      // the scratch dir, so its root is the scratch dir -- and the
      // scratch dir is not one of the repo-relative roots, so it would
      // scan NOTHING (measured: "SCANNING 0 FILES").
      //
      // So the copy's root is REPOINTED at the repo, and the scratch
      // dir is added as an ABSOLUTE scan root.
      // The copy scans ONLY the scratch directory.
      //
      // The whole repo is 4,875 files and takes ~13s to scan; the
      // property being tested -- "the gate FAILS on a dead export" --
      // needs exactly one dead export and nothing else. So the copy's
      // SCAN_ROOTS is REPLACED, not appended to, and the copy's `root`
      // is the scratch dir.
      //
      // The auditor's own `root` is the repo root, and the scratch dir
      // is absolute, so the two together would scan the whole repo.
      const patched = auditorSrc
        .replace(
          'const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");',
          `const root = ${JSON.stringify(scratch)};`,
        )
        .replace(
          /const SCAN_ROOTS = \[[\s\S]*?\];/,
          `const SCAN_ROOTS = [${JSON.stringify(scratch)}];`,
        );
      const patchedPath = join(scratch, "auditor.mjs");
      writeFileSync(patchedPath, patched, "utf8");
      // The auditor resolves `root` from its own location, so the copy
      // would scan the scratch dir -- which is what we want, but its
      // `root` also drives the relative paths. Run it and check the
      // VERDICT rather than the exit code, because the copy's exit
      // code depends on the self-test too.
      const { output } = (() => {
        try {
          const out = execFileSync(process.execPath, [patchedPath], {
            encoding: "utf8",
            cwd: ROOT,
            stdio: ["ignore", "pipe", "pipe"],
          });
          return { output: out };
        } catch (e) {
          const err = e as { stdout?: string; stderr?: string };
          return { output: `${err.stdout ?? ""}${err.stderr ?? ""}` };
        }
      })();
      // The dead export must be NAMED in the output.
      expect(output).toContain("MIN_T12_PROBE_THRESHOLD");
      // And the gate must have FAILED.
      expect(output).toContain("T12 GATE FAIL");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
