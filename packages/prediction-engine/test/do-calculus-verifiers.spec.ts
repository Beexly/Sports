/**
 * T10 -- THE A082 / A083 VERIFIERS, AS A PR-BLOCKING CI GATE.
 *
 * The goal spec's section 6 requires the one-off scripts in
 * reconciliation/ to be promoted into permanent, PR-blocking CI gates:
 *
 *   "reconciliation/_verify_do_calculus_math.mjs (A082),
 *    reconciliation/_verify_estimand_numerically.mjs (A083), and
 *    reconciliation/_audit_unenforced_thresholds.mjs are promoted into
 *    packages/prediction-engine/test/causal-engine.mutation-v3.spec.ts,
 *    expanding the suite from T1-T8 to T1-T12"
 *
 * A script that only runs when a human remembers to run it is not a
 * CI gate. So this file RUNS them and fails the suite when they fail.
 *
 * WHY THE SUITE-SCOPED GATE, AND NOT A SUBPROCESS.
 *
 * A subprocess that exits 0 proves the script ran. It does not prove
 * the script CHECKED anything, and it does not tell the reader WHICH
 * claim failed. So the verifiers' own claims are re-expressed here as
 * assertions against the module's actual output, and the subprocess is
 * run alongside as a second, independent witness. If the module
 * regresses, the assertion fails with a precise message; if the
 * verifier's harness regresses, the subprocess fails.
 *
 * THE CLAIMS BEING PROMOTED.
 *
 *   T10a  The Napkin graph (W -> Z -> X -> Y, W <-> X, W <-> Y)
 *         yields the spec's exact ratio tree. This is the X20 fix.
 *   T10b  The bow-arc is still refused with FAIL_HEDGE.
 *   T10c  The front-door tree is unchanged.
 *   T10d  A082's own script exits 0.
 *   T10e  A083's own script exits 0.
 *   T10f  The class and the tree agree -- the invariant X20 violated.
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  formatSymbolicFactor,
  FormulaClass,
  runShpitserPearlID,
  type CausalADMG,
  type SymbolicFactor,
} from "../src/causal/do-calculus-id.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** The Napkin / Case-3 graph: the one the X20 report names. */
const NAPKIN: CausalADMG = {
  nodes: ["W", "Z", "X", "Y"],
  directed: [
    ["W", "Z"],
    ["Z", "X"],
    ["X", "Y"],
  ],
  bidirected: [
    ["W", "X"],
    ["W", "Y"],
  ],
};

/** The bow-arc: X -> Y with X <-> Y. Unidentifiable, and must stay so. */
const BOW: CausalADMG = {
  nodes: ["X", "Y"],
  directed: [["X", "Y"]],
  bidirected: [["X", "Y"]],
};

/** The front-door graph: X -> M -> Y with X <-> Y. */
const FRONT: CausalADMG = {
  nodes: ["X", "M", "Y"],
  directed: [
    ["X", "M"],
    ["M", "Y"],
  ],
  bidirected: [["X", "Y"]],
};

/**
 * The spec's published Napkin tree, character for character.
 *
 * Pinned from the MEASURED output, not from the report -- and the
 * report's own prose said "yields the exact ratio tree", which is a
 * claim about a string. So the string is the assertion.
 */
const NAPKIN_RATIO_TREE =
  "Sum_{W}[(P(W) * P(X|W,Z)@d * P(Y|W,Z,X))] / Sum_{W}[(P(W) * P(X|W,Z)@d)]";

/** Walk the tree and report whether it contains a RATIO node. */
function hasRatioNode(factor: SymbolicFactor, seen = new Set<SymbolicFactor>()): boolean {
  if (seen.has(factor)) return false;
  seen.add(factor);
  switch (factor.kind) {
    case "RATIO":
      return true;
    case "PRODUCT":
      return factor.factors.some((f) => hasRatioNode(f, seen));
    case "MARGINAL_SUM":
      return hasRatioNode(factor.body, seen);
    case "OBSERVATIONAL_COND":
      return false;
    case "ASSIGNED_DENSITY":
      return false;
  }
}

/** Run one of the reconciliation/ verifier scripts and report its exit code. */
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

describe("T10 -- the A082 / A083 verifiers, as a CI gate", () => {
  it("T10a: the Napkin graph yields the spec's exact ratio tree (the X20 fix)", () => {
    const result = runShpitserPearlID(new Set(["Y"]), new Set(["X"]), NAPKIN);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.formulaClass).toBe(FormulaClass.TianCFactorRatio);
    // The EXACT tree. Not "contains a ratio" -- the tree.
    expect(formatSymbolicFactor(result.formula)).toBe(NAPKIN_RATIO_TREE);
  });

  it("T10b: the bow-arc is still refused with FAIL_HEDGE", () => {
    const result = runShpitserPearlID(new Set(["Y"]), new Set(["X"]), BOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("FAIL_HEDGE");
  });

  it("T10c: the front-door tree is unchanged", () => {
    const result = runShpitserPearlID(new Set(["Y"]), new Set(["X"]), FRONT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.formulaClass).toBe(FormulaClass.CComponentFactorization);
    expect(formatSymbolicFactor(result.formula)).toBe(
      "Sum_{M}[(P(M|X) * Sum_{X}[(P(X) * P(Y|X,M))])]",
    );
  });

  it("T10d: A082 exits 0", () => {
    const { code, output } = runVerifier("_verify_do_calculus_math.mjs");
    expect(code, `A082 failed:\n${output}`).toBe(0);
    expect(output).toContain("every mathematical claim reproduces");
  });

  it("T10e: A083 exits 0", () => {
    const { code, output } = runVerifier("_verify_estimand_numerically.mjs");
    expect(code, `A083 failed:\n${output}`).toBe(0);
    expect(output).toContain("the module's estimands are numerically right");
  });

  it("T10g: the independent estimand probe -- the DENSITY form recovers ~5, the MEAN form does not", () => {
    // THE INDEPENDENT EVIDENCE.
    //
    // A082 asserts the tree and A083 asserts the number, but both
    // evaluate the module's OWN tree. This probe is a third,
    // independent witness: it computes the candidate estimands
    // DIRECTLY from the spec's DGP, with no reference to the
    // module's tree at all.
    //
    // It is what establishes that the DENSITY convention is the right
    // one -- not merely that the module is self-consistent. On the
    // spec's DGP (true do-effect 5):
    //
    //   the goal-spec ratio, treatment as a DENSITY : 5.0141
    //   the module's tree,   treatment as a MEAN    : 3.8621
    //
    // So the probe fails if the density/mean distinction is ever
    // collapsed, because then the two numbers converge and the
    // difference that makes the convention necessary disappears.
    const { code, output } = runVerifier("_probe_napkin_estimands.mjs");
    expect(code, `the estimand probe failed:\n${output}`).toBe(0);
    // The truth, from the intervention simulation.
    expect(output).toContain("TRUE do(X)   by intervention simulation : 5.0000");
    // The density form recovers it.
    expect(output).toMatch(/GOAL RATIO\s+p\(x\|w,z\) as a DENSITY\s+: 5\.0\d+/);
    // The mean form does NOT.
    expect(output).toMatch(/MODULE TREE\s+E\[x\|w,z\] as a MEAN\s+: 3\.8\d+/);
    // And the CI base HOLDS, so the DGP really is a distribution the
    // Napkin graph describes -- the discrepancy is the module's, not
    // the DGP's.
    expect(output).toContain("Z _||_ Y | W,X");
    expect(output).not.toMatch(/Z _\|\|_ Y \| W,X[\s\S]{0,200}VIOLATED/);
  });

  it("T10f: the class and the tree agree -- the invariant X20 violated", () => {
    // The class said TIAN_C_FACTOR_RATIO while the tree was a bare
    // P(Y|X). The tree must now BE a ratio wherever the class says so
    // on the graph where the bug lived.
    const result = runShpitserPearlID(new Set(["Y"]), new Set(["X"]), NAPKIN);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.formulaClass).toBe(FormulaClass.TianCFactorRatio);
    expect(hasRatioNode(result.formula)).toBe(true);
    // And the unadjusted conditional is gone.
    expect(formatSymbolicFactor(result.formula)).not.toBe("P(Y|X)");
  });
});
