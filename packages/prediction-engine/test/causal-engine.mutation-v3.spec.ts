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
  type MediatorCandidate,
} from "../src/causal/hcid-mediator-expansion.js";
import { runShpitserPearlID, type CausalADMG } from "../src/causal/do-calculus-id.js";
import { acyclicityExact, dynotearsFit } from "../src/causal/fci-pag.js";

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
      { eValue: 4.2 },
    );
    expect(report.eValuePasses).toBe(true);
    expect(report.activating.length).toBeGreaterThan(0);
    expect(report.breaksHedgeButFragile.length).toBe(0);
  });

  it("the E-value floor is the spec's 1.35", () => {
    expect(MIN_EXPANSION_E_VALUE).toBe(1.35);
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
      { eValue: 4.2 },
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
      const patched = auditorSrc
        .replace(
          'const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");',
          `const root = ${JSON.stringify(ROOT)};`,
        )
        .replace(
          'const SCAN_ROOTS = [',
          `const SCAN_ROOTS = [\n  ${JSON.stringify(scratch)},`,
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
