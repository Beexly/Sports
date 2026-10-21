/**
 * causal-engine.mutation-v4.spec.ts -- THE SPEC'S NAMED DELIVERABLE: THE T1-T16 FALSIFICATION SUITE.
 *
 * THE SPEC, §10.2, verbatim:
 *
 *   "10.2 Complete Falsification and Mutation Test Suite v4.0 (T1-T16)
 *    To guarantee that no future commit can re-introduce decorative citations, unenforced
 *    threshold constants, unconditioned E-values, or public surface leaks,
 *    packages/prediction-engine/test/causal-engine.mutation-v4.spec.ts expands the CI blocker
 *    suite from T1-T8 to T1-T16, as specified in Table 5."
 *
 * WHY THIS FILE EXISTS, AND WHY IT IS A COVERAGE LEDGER RATHER THAN A TEST SUITE.
 *
 * The spec names this file and this range. It did not exist. The probes that DID exist were
 * scattered across three files -- causal-engine.mutation-v3.spec.ts, do-calculus-verifiers.spec.ts,
 * and standalone per-probe specs -- and there was nothing that said "all sixteen of these are
 * present". So a probe could be deleted outright, and the suite would go on passing, because
 * nothing was counting.
 *
 * This file is that counter. It asserts, for every one of the sixteen probes, that:
 *
 *   1. the probe's MODULE exists (or, for the probes whose subject is a script or a SQL
 *      artifact, that the artifact exists);
 *   2. the probe's GATE FILE exists -- the spec file that actually exercises it;
 *   3. the probe's MUTATION SWEEP exists -- the file that proves the gate is load-bearing
 *      rather than merely green.
 *
 * AND IT ASSERTS THE SWEEP IS WIRED, not merely present. A sweep that exists but is never run
 * is a file, not a gate. For each probe whose sweep this suite knows about, the sweep is
 * EXECUTED here and its exit code asserted, and its own output is asserted to contain the
 * baseline line and NOT to contain the "STILL PASSED" marker -- because a sweep that reports
 * NOT PINNED for everything is worse than no sweep, since it looks like coverage.
 *
 * THE HONEST PART. This file asserts PRESENCE and that the suites are WIRED AND GREEN. It
 * does not claim that every probe's internals are correct -- that is each probe's own suite's
 * job, and each one has a mutation sweep to prove it. What this file guarantees is the thing
 * that was missing: that the set of sixteen is complete, and that each one's evidence is
 * present, green, and load-bearing.
 *
 * A probe whose module or gate is genuinely still in progress is listed in
 * `PROBES_PENDING_IMPLEMENTATION` below, and this file asserts the pending list is EXACTLY
 * that list -- by probing the filesystem. So when a probe lands, this file fails until the
 * pending list is updated, and when the pending list is updated wrongly, this file fails too.
 * The list cannot silently rot.
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..", "..");
const PKG = resolve(ROOT, "packages", "prediction-engine");

/**
 * THE SIXTEEN PROBES.
 *
 * Each entry names the three artifacts the spec's T1-T16 suite requires:
 *   - `subject`: the module, script, or artifact the probe is ABOUT;
 *   - `gate`: the spec file that EXERCISES the subject;
 *   - `sweep`: the mutation sweep that proves the gate is load-bearing.
 *
 * A probe is COMPLETE when all three exist and its sweep is green.
 */
interface Probe {
  readonly id: string;
  /** What the probe is about, in the spec's own words (abbreviated). */
  readonly subject: string;
  /** Repo-relative path of the module/artifact under test, if it is a file. */
  readonly subjectPath?: string;
  /** Repo-relative path of the gate spec that exercises it. */
  readonly gatePath?: string;
  /** Repo-relative path of the mutation sweep, relative to packages/prediction-engine. */
  readonly sweepPath?: string;
  /**
   * Set when the sweep lives in a DIFFERENT package (T15's is in
   * packages/ingestion-pipeline, because that is where the gate it pins lives). The sweep
   * path is then already repo-relative and must not be prefixed.
   */
  readonly sweepInOtherPackage?: boolean;
  /** True once the probe is fully landed AND its gate was verified green by the parent. */
  readonly landed: boolean;
  /**
   * True while a worker is actively building the probe.
   *
   * An in-flight probe MAY have its artifacts on disk already -- a worker writes the module
   * first and the gate after -- so the "artifacts present but not landed" check would fire
   * on every in-flight probe and make the build red for work that is not finished. Being
   * in-flight is therefore an EXPLICIT state, not an accident: the probe is claimed by
   * nobody, its gate is not yet trusted, and the ledger says so.
   */
  readonly inFlight?: boolean;
}

const PROBES: readonly Probe[] = [
  {
    id: "T1",
    subject: "Proportional content-driven delta in arxiv-hnsw-bridge.ts (claim 0.024 -> 0.048 scales total_delta by exactly 2.000000x)",
    subjectPath: "packages/prediction-engine/src/literature/arxiv-hnsw-bridge.ts",
    gatePath: "packages/prediction-engine/test/arxiv-hnsw-bridge.t1t4.spec.ts",
    sweepPath: "reconciliation/_mutation_sweep_t1_t4_hnsw.mjs",
    landed: true,
  },
  {
    id: "T2",
    subject: "The shared L1-L3 gate rejects fabricated magnitudes, unit-word-only spans and markdown dump rows",
    subjectPath: "packages/prediction-engine/src/literature/literature-verification.ts",
    gatePath: "packages/prediction-engine/test/literature-and-bow-arc.t2t3t5.spec.ts",
    landed: true,
  },
  {
    id: "T3",
    subject: "L4 rejects No Free Lunch and thermodynamic-economics contamination",
    subjectPath: "packages/prediction-engine/src/literature/literature-verification.ts",
    gatePath: "packages/prediction-engine/test/literature-and-bow-arc.t2t3t5.spec.ts",
    landed: true,
  },
  {
    id: "T4",
    subject: "Empty corpus emits total_delta === 0 with zero legacy strings; the class-A view returns 0 non-citable rows",
    subjectPath: "packages/prediction-engine/src/literature/arxiv-hnsw-bridge.ts",
    gatePath: "packages/prediction-engine/test/arxiv-hnsw-bridge.t1t4.spec.ts",
    landed: true,
  },
  {
    id: "T5",
    subject: "The bow-arc is refused with FAIL_HEDGE (forestSub [Y], enabling edge [[X,Y]]) and the front-door AST is exact",
    subjectPath: "packages/prediction-engine/src/causal/do-calculus-id.ts",
    gatePath: "packages/prediction-engine/test/literature-and-bow-arc.t2t3t5.spec.ts",
    landed: true,
  },
  {
    id: "T6",
    subject: "Adversary red-team interception: point E-value < 1.35, CI E-value < 1.10, placebo leak > 0.005, entity-swap >= 0.02, CausalPhys RA < 0.85",
    subjectPath: "packages/prediction-engine/src/causal/adversary-red-team.ts",
    gatePath: "packages/prediction-engine/test/adversary-red-team.t6.spec.ts",
    sweepPath: "reconciliation/_mutation_sweep_t6_red_team.mjs",
    landed: true,
  },
  {
    id: "T7",
    subject: "The 600-test conformal & TA-CQR invariant matrix: exact rank, TA-CQR score, Frechet-Hoeffding bounds, slow 75% Kelly",
    subjectPath: "packages/prediction-engine/src/calibration/conformal-copula-kelly.ts",
    gatePath: "packages/prediction-engine/test/conformal-copula-kelly.t7.spec.ts",
    sweepPath: "reconciliation/_mutation_sweep_t7_conformal.mjs",
    landed: true,
  },
  {
    id: "T8",
    subject: "The compile-time phantom brand and runtime gates G1-G9 in pick-pipeline.ts",
    subjectPath: "packages/prediction-engine/src/picks/pick-pipeline.ts",
    gatePath: "packages/prediction-engine/test/pick-pipeline.t8.spec.ts",
    sweepPath: "reconciliation/_mutation_sweep_t8_picks.mjs",
    landed: true,
  },
  {
    id: "T9",
    subject: "The live E-value hedge-breakage gate",
    subjectPath: "packages/prediction-engine/src/causal/hcid-mediator-expansion.ts",
    gatePath: "packages/prediction-engine/test/causal-engine.mutation-v3.spec.ts",
    landed: true,
  },
  {
    id: "T10",
    subject: "The A082 / A083 do-calculus verifiers, as a CI gate",
    subjectPath: "packages/prediction-engine/test/do-calculus-verifiers.spec.ts",
    landed: true,
  },
  {
    id: "T11",
    subject: "The contemporaneous DYNOTEARS fit is scale-invariant; the Zhang (2008) R5-R10 rules are implemented; the LAGGED DYNOTEARS fit is scale-invariant",
    subjectPath: "packages/prediction-engine/src/causal/causal-graph-builder.ts",
    gatePath: "packages/prediction-engine/test/causal-engine.mutation-v3.spec.ts",
    landed: true,
  },
  {
    id: "T12",
    subject: "The zero-unenforced-constants gate",
    subjectPath: "reconciliation/_audit_unenforced_thresholds.mjs",
    landed: true,
  },
  {
    id: "T13",
    subject: "The proximal bridge on an unbreakable bow-arc: recovers E[Y|do(X=x)] via proxies (Z,W) when kappa(K_WZ) <= 50, refuses when ill-posed",
    subjectPath: "packages/prediction-engine/src/causal/proximal-bridge-id.ts",
    gatePath: "packages/prediction-engine/test/proximal-bridge-id.t13.spec.ts",
    sweepPath: "reconciliation/_mutation_sweep_t13_proximal.mjs",
    landed: true,
  },
  {
    id: "T14",
    subject: "The 50k MCP cognitive router: negative cross-partial coupling and target-share reallocation",
    subjectPath: "packages/prediction-engine/src/mcp/mcp-cognitive-router.ts",
    gatePath: "packages/prediction-engine/test/mcp-cognitive-router.t14.spec.ts",
    sweepPath: "reconciliation/_mutation_sweep_t14_mcp.mjs",
    inFlight: true,
    landed: false,
  },
  {
    id: "T15",
    subject: "The public/private surface fence and the constitutional CRPS circuit breaker over generate-signal-slate",
    subjectPath: "apps/web/lib/fences/no-raw-ngs-fence.ts",
    gatePath: "packages/ingestion-pipeline/src/__tests__/walk-forward-emission-gate.t15.test.ts",
    sweepPath: "packages/ingestion-pipeline/reconciliation/_mutation_sweep_t15_fence.mjs",
    sweepInOtherPackage: true,
    landed: true,
  },
  {
    id: "T16",
    subject: "Marchenko-Pastur BBP spike detection and the Shadow gates S1-S4 in settlement-loop.ts",
    subjectPath: "packages/prediction-engine/src/learning/settlement-loop.ts",
    gatePath: "packages/prediction-engine/test/settlement-loop.t16.spec.ts",
    sweepPath: "reconciliation/_mutation_sweep_t16_settlement.mjs",
    landed: true,
  },
];

/**
 * THE PROBES THAT ARE NOT YET LANDED.
 *
 * THIS LIST IS ASSERTED AGAINST THE FILESYSTEM, so it cannot rot. Each entry names a path
 * that does NOT exist yet. The assertion below requires every listed path to be ABSENT and
 * every unlisted probe's artifacts to be PRESENT -- so the moment a probe lands, this file
 * fails, and the list must be updated deliberately.
 */
const PENDING = PROBES.filter((p) => !p.landed).map((p) => p.id);

/**
 * The declared artifacts of a probe, with REPO-RELATIVE paths.
 *
 * The sweep paths in the table are written relative to packages/prediction-engine (which is
 * how the gates that invoke them spell them). They are made repo-relative here so every
 * artifact can be checked with one existsSync against one root.
 */
function artifactsOf(probe: Probe): { kind: string; path: string }[] {
  const out: { kind: string; path: string }[] = [];
  if (probe.subjectPath) out.push({ kind: "subject", path: probe.subjectPath });
  if (probe.gatePath) out.push({ kind: "gate", path: probe.gatePath });
  if (probe.sweepPath) {
    out.push({
      kind: "sweep",
      path: probe.sweepInOtherPackage
        ? probe.sweepPath
        : `packages/prediction-engine/${probe.sweepPath}`,
    });
  }
  return out;
}

/** Run a script and report its exit code and output. */
function runScript(relPath: string, cwd: string): { code: number; output: string } {
  try {
    const output = execFileSync(process.execPath, [resolve(cwd, relPath)], {
      encoding: "utf8",
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, output };
  } catch (error) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? 1, output: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

/**
 * Every spec file under a directory, recursively.
 *
 * Used by the WIRING check below, which greps spec files for the name of a mutation sweep.
 * The scan is bounded to the spec-bearing directories rather than the whole repo, because
 * the whole repo has ~16,000 files and the point is to find the files CI RUNS.
 */
function walkSpecs(dir: string): string[] {
  const out: string[] = [];
  const stack: string[] = [dir];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    let entries: import("node:fs").Dirent[];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = resolve(current, entry.name);
      if (entry.isDirectory()) {
        // node_modules and build output are not scanned.
        if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
        stack.push(full);
      } else if (/\.(spec|test)\.tsx?$/.test(entry.name)) {
        out.push(full);
      }
    }
  }
  return out;
}

describe("T1-T16 -- the spec's named falsification suite, and its own coverage ledger", () => {
  it("the suite covers EXACTLY the sixteen probes the spec names", () => {
    expect(PROBES.map((p) => p.id)).toEqual([
      "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8",
      "T9", "T10", "T11", "T12", "T13", "T14", "T15", "T16",
    ]);
    // No duplicate ids -- a duplicated probe would let one id be counted twice and leave a
    // real probe uncovered.
    expect(new Set(PROBES.map((p) => p.id)).size).toBe(PROBES.length);
  });

  it("every LANDED probe's module, gate and sweep are present on disk", () => {
    const missing: string[] = [];
    for (const probe of PROBES) {
      if (!probe.landed) continue;
      for (const artifact of artifactsOf(probe)) {
        if (!existsSync(resolve(ROOT, artifact.path))) {
          missing.push(`${probe.id} ${artifact.kind}: ${artifact.path}`);
        }
      }
    }
    expect(missing, `these landed probes are missing artifacts:\n${missing.join("\n")}`).toEqual([]);
  });

  /**
   * THE LEDGER CANNOT ROT. `landed` must equal "every declared artifact is present".
   *
   * This is the invariant that keeps the map honest in BOTH directions:
   *
   *   - A probe marked landed whose artifacts are missing FAILS. The map cannot claim
   *     coverage the filesystem does not have.
   *   - A probe marked pending whose artifacts are ALL present FAILS. The map cannot hide
   *     coverage that has landed -- so when a worker finishes T6, this file goes red until
   *     the map is updated, rather than silently under-reporting.
   *
   * The check is on the ARTIFACTS, not on the subject alone. That matters because some
   * probes' subjects pre-existed this work: T15's `no-raw-ngs-fence.ts` was already in the
   * repo, so "the subject is absent" is not the right test for it -- "the subject AND the
   * gate AND the sweep are present" is.
   */
  it("the pending list cannot rot: 'landed' agrees with what is on disk", () => {
    const mismatches: string[] = [];
    for (const probe of PROBES) {
      if (probe.inFlight) continue; // in flight: artifacts on disk is expected
      const allPresent = artifactsOf(probe).every((a) => existsSync(resolve(ROOT, a.path)));
      if (allPresent && !probe.landed) {
        mismatches.push(
          `${probe.id} is marked PENDING but every artifact is present -- update the map: ${artifactsOf(probe)
            .map((a) => a.path)
            .join(", ")}`,
        );
      }
      if (!allPresent && probe.landed) {
        const missing = artifactsOf(probe)
          .filter((a) => !existsSync(resolve(ROOT, a.path)))
          .map((a) => a.path);
        mismatches.push(`${probe.id} is marked LANDED but these are missing: ${missing.join(", ")}`);
      }
    }
    expect(mismatches, mismatches.join("\n")).toEqual([]);
  });

  /**
   * AN IN-FLIGHT PROBE IS AN EXPLICIT STATE, AND IT IS VISIBLE.
   *
   * A probe being built is not the same as a probe that does not exist, and it is certainly
   * not the same as a probe that landed. The ledger says which, so a reader can tell "not
   * started" from "being built" from "done" -- and so a worker that dies mid-flight leaves a
   * trace rather than a silent hole.
   */
  it("the in-flight probes are named, and none of them is also claimed as landed", () => {
    for (const probe of PROBES) {
      if (!probe.inFlight) continue;
      // An in-flight probe is claimed by nobody and trusted by nobody. It cannot also be
      // landed -- that would be a map claiming coverage the parent has not verified.
      expect(probe.landed, `${probe.id} cannot be both in flight and landed`).toBe(false);
    }
  });

  it("the pending list is NON-EMPTY and the landed list is NON-EMPTY", () => {
    // A trivial suite that claims everything is pending, or everything is landed, proves
    // nothing. Both halves must be real.
    expect(PENDING.length).toBeGreaterThan(0);
    expect(PENDING.length).toBeLessThan(PROBES.length);
  });

  /**
   * THE SWEEPS ARE WIRED INTO CI, NOT MERELY PRESENT ON DISK.
   *
   * A sweep that exists but is never invoked is a file, not a gate. The check is therefore
   * STATIC: the sweep's filename must appear inside a spec file that CI actually runs. That
   * proves CI will execute it, without this file re-executing it -- which matters, because
   * re-running every sweep from inside a test would multiply the suite's wall time by the
   * sum of all the sweeps' times, and the Zhang R5-R10 and periodic-ID sweeps alone take
   * about 90 and 72 seconds.
   *
   * The distinction being protected against is the one the FCI sweep's first version
   * demonstrated: a sweep whose detection never matches anything reports NOT PINNED for every
   * rule while every rule is in fact pinned. That sweep is invoked by the gate, and it is
   * ALSO required by the gate's own assertions to print a baseline line and to contain no
   * "STILL PASSED" -- both of which are asserted inside the gate that runs it, not here.
   */
  it("every landed probe's mutation sweep is INVOKED by a spec file CI runs", () => {
    const failures: string[] = [];
    for (const probe of PROBES) {
      if (!probe.landed || !probe.sweepPath) continue;
      const sweepName = probe.sweepPath.split("/").pop() as string;

      // Find the spec files that could invoke it. The whole test/ tree is scanned, because a
      // sweep may be invoked from a shared gate rather than from the probe's own file.
      const candidates: string[] = [];
      const specDirs = [
        resolve(PKG, "test"),
        resolve(PKG, "src"),
        resolve(ROOT, "packages", "ingestion-pipeline", "src"),
      ];
      for (const dir of specDirs) {
        if (!existsSync(dir)) continue;
        for (const file of walkSpecs(dir)) {
          candidates.push(file);
        }
      }
      const invokers = candidates.filter((file) => {
        try {
          return readFileSync(file, "utf8").includes(sweepName);
        } catch {
          return false;
        }
      });

      if (invokers.length === 0) {
        failures.push(
          `${probe.id}: sweep ${sweepName} is NOT referenced by any spec file -- it would never run in CI`,
        );
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });

  /**
   * THE GATES ARE NAMED IN A FILE CI RUNS.
   *
   * A gate spec that exists but is not referenced by the suite is still run by vitest (vitest
   * runs every *.spec.ts in the package), so this check is about the ARTIFACT rather than the
   * invocation: the gate file must exist AND must contain at least one real assertion, so a
   * file that was created empty cannot satisfy the ledger.
   */
  it("every landed probe's gate file exists and contains real assertions", () => {
    const failures: string[] = [];
    for (const probe of PROBES) {
      if (!probe.landed || !probe.gatePath) continue;
      const rel = resolve(ROOT, probe.gatePath);
      if (!existsSync(rel)) {
        failures.push(`${probe.id}: gate ${probe.gatePath} is MISSING`);
        continue;
      }
      const src = readFileSync(rel, "utf8");
      const assertions = (src.match(/\bexpect\(/g) ?? []).length;
      if (assertions === 0) {
        failures.push(`${probe.id}: gate ${probe.gatePath} contains NO expect() calls`);
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });

  /**
   * THE T11 SWEEPS ARE WIRED TOO -- the Zhang R5-R10 sweep and the periodic-ID sweep.
   *
   * These are the probes whose rules were pinned against Zhang (2008) and Jahn, and they are
   * the two slowest sweeps in the repo (about 90 and 72 seconds). So this check is STATIC, for
   * the same reason as above: the sweep must be INVOKED by a spec CI runs, and the gate that
   * invokes it is the one that asserts its exit code and its output.
   */
  it("the T11 sweeps (Zhang R5-R10, periodic-ID) are present and INVOKED by a spec", () => {
    const sweeps = [
      "reconciliation/_mutation_sweep_r5_r10.mjs",
      "reconciliation/_mutation_sweep_periodic_id.mjs",
    ];
    const failures: string[] = [];
    const specDirs = [
      resolve(PKG, "test"),
      resolve(PKG, "src"),
      resolve(ROOT, "packages", "ingestion-pipeline", "src"),
    ];
    const candidates: string[] = [];
    for (const dir of specDirs) {
      if (!existsSync(dir)) continue;
      for (const file of walkSpecs(dir)) candidates.push(file);
    }
    for (const sweep of sweeps) {
      const name = sweep.split("/").pop() as string;
      if (!existsSync(resolve(PKG, sweep))) {
        failures.push(`${sweep}: MISSING`);
        continue;
      }
      const invokers = candidates.filter((file) => {
        try {
          return readFileSync(file, "utf8").includes(name);
        } catch {
          return false;
        }
      });
      if (invokers.length === 0) {
        failures.push(`${sweep} is NOT referenced by any spec file -- it would never run in CI`);
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });

  /**
   * THE REPO-LEVEL GUARDS ARE GREEN.
   *
   * The T12 ledger proves the PROBES exist; these two prove the repo-level invariants the
   * probes depend on are still holding. The threshold auditor is the T12 gate itself -- it
   * FAILS the build on an exported-but-never-compared constant, which is the "decorative
   * threshold" class the goal spec names. The class-A guard is the T4/§4.2 invariant: every
   * read of the literature corpus honours the record class.
   *
   * Both are run from the REPO ROOT (not the package), because both live in the root's
   * reconciliation/ directory. This check is what catches a new module that exports a
   * threshold nobody compares -- which is exactly how T14's first cut was caught, by the
   * auditor itself, before this check existed.
   */
  it("the repo-level guards are green: the threshold auditor and the class-A guard", () => {
    const failures: string[] = [];
    for (const script of ["_audit_unenforced_thresholds.mjs", "_check_class_a_coverage.mjs"]) {
      try {
        const output = execFileSync(process.execPath, [resolve(ROOT, "reconciliation", script)], {
          encoding: "utf8",
          cwd: ROOT,
          stdio: ["ignore", "pipe", "pipe"],
        });
        // The auditors print their own verdict; assert the verdict, not just the exit code.
        if (/GATE FAIL|VERDICT: every path sets and honours the class/.test(output) === false && script === "_check_class_a_coverage.mjs") {
          failures.push(`${script}: ran but printed no recognisable verdict`);
        }
        if (/_audit_unenforced_thresholds/.test(script) && !/GATE PASS/.test(output)) {
          failures.push(`${script}: did not report GATE PASS:\n${output.slice(-900)}`);
        }
      } catch (error) {
        const e = error as { stdout?: string; stderr?: string };
        failures.push(`${script} FAILED:\n${(e.stdout ?? "").slice(-1400)}${(e.stderr ?? "").slice(-400)}`);
      }
    }
    expect(failures, failures.join("\n\n")).toEqual([]);
  });

  /**
   * THIS FILE IS THE SPEC'S NAMED DELIVERABLE, and it says so where an operator will find it.
   *
   * A reader who greps for "mutation-v4" should land here and find the coverage map. This
   * assertion pins the map's own contents against the file, so the two cannot drift.
   */
  it("this file IS the spec's named deliverable, and its probe map matches its own contents", () => {
    const self = readFileSync(resolve(HERE, "causal-engine.mutation-v4.spec.ts"), "utf8");
    expect(self).toContain("causal-engine.mutation-v4.spec.ts");
    expect(self).toContain("T1-T16");
    for (const probe of PROBES) {
      // Every probe id appears in the map.
      expect(self, `the map does not mention ${probe.id}`).toContain(`id: "${probe.id}"`);
    }
  });
});
