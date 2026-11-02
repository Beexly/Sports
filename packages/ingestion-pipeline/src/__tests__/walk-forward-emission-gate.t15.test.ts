/**
 * T15 — the constitutional CRPS circuit breaker, pinned at its boundaries.
 *
 * WHAT THIS FILE PROVES. The walk-forward emission gate is a CONSTITUTION,
 * not a boolean read: the gate opens only when the artifact itself declares
 * itself cleared AND a FROZEN-MANIFEST model satisfies the conjunction the
 * artifact's own rule states --
 *
 *     n >= 150  AND  delta_vs_gaussian_13.45 >= 0.01  AND  crps <= 7.099
 *
 * The defect this file exists to pin is the one the old gate had: it read
 * `passed === true` and nothing else, so a commit that wrote passed:true
 * while the CRPS was still above 7.099 would have opened the gate. Every
 * boundary below is a place that defect would have passed.
 *
 * THE BOUNDARY POLICY, STATED ONCE. The bar is INCLUSIVE: a CRPS of exactly
 * 7.099 clears, and a delta of exactly 0.01 and an n of exactly 150 clear.
 * That is not an arbitrary choice -- it is what the artifact's own rule
 * states ("delta_conditional_vs_gaussian >= 0.01 AND n >= 150", and
 * "CRPS <= 7.099"), and it is what the artifact's own model records say:
 * student_t carries `le_abs_bar_7.099: true` at a CRPS of 7.0115, and
 * `models_meeting_full_gate` lists exactly the two families whose margin
 * clears 0.01. An EXCLUSIVE reading would silently disagree with the
 * artifact, and the artifact is the authority here.
 *
 * THE FILE PATH AND THE OVERRIDE PATH ARE SEPARATE BECAUSE THEY ARE
 * SEPARATE THINGS. The FILE path is exercised against real JSON written to a
 * temp directory, so the shape of the artifact on disk is what is under test.
 * The OVERRIDE path is exercised in memory, because that is the path the
 * three minting tests use and it must not become a second, weaker gate.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  MAX_EMISSION_CRPS,
  MIN_DELTA_VS_GAUSSIAN,
  MIN_GATE_N,
  emissionBlocked,
  evaluateEmissionGateOverride,
  readEmissionGateFromFile,
  type EmissionGateOverride,
} from "../walk-forward-emission-gate.js";

const TMP = mkdtempSync(join(tmpdir(), "t15-emission-gate-"));

afterAll(() => {
  rmSync(TMP, { recursive: true, force: true });
});

/** Write an artifact to the temp dir and evaluate the FILE path against it. */
function evaluateFile(name: string, body: unknown): ReturnType<typeof readEmissionGateFromFile> {
  const path = join(TMP, name);
  writeFileSync(path, typeof body === "string" ? body : JSON.stringify(body), "utf8");
  return readEmissionGateFromFile(path);
}

/**
 * A synthetic artifact in the SPEC-NAMED shape (walk_forward.json).
 *
 * It reproduces the real artifact's structure exactly: the same top-level
 * keys, the same models.frozen_manifest.models map of model families, the
 * same models.nflverse_crosscheck_unfrozen block, and the same
 * rule.passed_if / models.gate_rule strings. Only the numbers move.
 */
function walkForwardArtifact(opts: {
  readonly passed?: boolean;
  readonly gateCleared?: boolean;
  readonly frozenModels?: Record<string, { n?: number | null; crps?: number | null; delta?: number | null }>;
  readonly crosscheckModels?: Record<string, { n?: number | null; crps?: number | null; delta?: number | null }>;
}): Record<string, unknown> {
  const frozen = opts.frozenModels ?? {
    student_t: { n: 570, crps: 7.0115, delta: 0.0156 },
  };
  const crosscheck = opts.crosscheckModels ?? {
    student_t: { n: 2494, crps: 7.1322, delta: 0.0163 },
  };
  const toMap = (
    m: Record<string, { n?: number | null; crps?: number | null; delta?: number | null }>,
  ): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const [name, v] of Object.entries(m)) {
      out[name] = {
        n: v.n ?? null,
        crps: v.crps ?? null,
        "delta_vs_gaussian_13.45": v.delta ?? null,
        per_season: { "2024": 7.119, "2025": 6.9041 },
        "le_abs_bar_7.099": typeof v.crps === "number" && v.crps <= MAX_EMISSION_CRPS,
      };
    }
    return out;
  };
  return {
    label: "T15 synthetic walk-forward artifact.",
    gate_status: "SYNTHETIC",
    passed: opts.passed ?? true,
    provisional: true,
    generated_at: "2026-10-21T00:00:00Z",
    n: 570,
    pooled: {
      n: 570,
      laplace_conditional_crps: 7.0611,
      laplace_one_scale_crps: 7.0203,
      gaussian_close_crps: 7.0271,
      delta_conditional_vs_gaussian: -0.034,
      delta_one_scale_vs_gaussian: 0.0068,
      cell_fallbacks: 105,
    },
    rule: { passed_if: "delta_conditional_vs_gaussian >= 0.01 AND n >= 150" },
    honesty_notes: [
      "Gate is NOT cleared unless passed is true; even then nothing is promoted and mu stays the close.",
    ],
    models: {
      label: "SYNTHETIC",
      frozen_manifest: {
        n: 570,
        models: toMap(frozen),
        models_meeting_full_gate: Object.keys(frozen),
      },
      nflverse_crosscheck_unfrozen: {
        n: 2494,
        models: toMap(crosscheck),
        models_meeting_full_gate: [],
        source: {
          status:
            "UNFROZEN public nflverse games.csv cross-check -- does NOT count for the gate",
        },
      },
      gate_rule:
        "cleared only if a model has n >= 150, beats same-games Gaussian 13.45 by >= 0.01, AND CRPS <= 7.099 (unreproduced bar); frozen manifest only",
      technical_pass_manifest: true,
      gate_cleared: opts.gateCleared ?? true,
      gate_status: "SYNTHETIC",
      caveats: ["SYNTHETIC"],
    },
  };
}

describe("T15 constitutional CRPS circuit breaker — the three numeric criteria", () => {
  it("opens when a frozen-manifest model satisfies all three criteria", () => {
    const v = evaluateFile(
      "cleared.json",
      walkForwardArtifact({
        frozenModels: { student_t: { n: 570, crps: 7.0115, delta: 0.0156 } },
      }),
    );
    expect(v.blocked).toBe(false);
    expect(v.failedCriterion).toBeNull();
    expect(v.qualifiedModels).toContain("student_t");
    expect(v.declaredRule).toContain("CRPS <= 7.099");
  });

  it("CRPS exactly 7.099 CLEARS the bar (the bar is inclusive)", () => {
    const v = evaluateFile(
      "crps-exact.json",
      walkForwardArtifact({
        frozenModels: { student_t: { n: 570, crps: MAX_EMISSION_CRPS, delta: 0.0156 } },
      }),
    );
    expect(v.blocked).toBe(false);
    expect(v.crps).toBe(MAX_EMISSION_CRPS);
    expect(v.failedCriterion).toBeNull();
  });

  it("CRPS just above 7.099 BLOCKS", () => {
    const v = evaluateFile(
      "crps-above.json",
      walkForwardArtifact({
        frozenModels: { student_t: { n: 570, crps: 7.0991, delta: 0.0156 } },
      }),
    );
    expect(v.blocked).toBe(true);
    expect(v.failedCriterion).toBe("crps_above_bar");
    expect(v.reason).toContain("above 7.099");
  });

  it("delta exactly 0.01 CLEARS the bar (the bar is inclusive)", () => {
    const v = evaluateFile(
      "delta-exact.json",
      walkForwardArtifact({
        frozenModels: { student_t: { n: 570, crps: 7.0115, delta: MIN_DELTA_VS_GAUSSIAN } },
      }),
    );
    expect(v.blocked).toBe(false);
    expect(v.deltaVsGaussian).toBe(MIN_DELTA_VS_GAUSSIAN);
    expect(v.failedCriterion).toBeNull();
  });

  it("delta just below 0.01 BLOCKS", () => {
    const v = evaluateFile(
      "delta-below.json",
      walkForwardArtifact({
        frozenModels: { student_t: { n: 570, crps: 7.0115, delta: 0.0099 } },
      }),
    );
    expect(v.blocked).toBe(true);
    expect(v.failedCriterion).toBe("delta_below_minimum");
  });

  it("n exactly 150 CLEARS the bar (the bar is inclusive)", () => {
    const v = evaluateFile(
      "n-exact.json",
      walkForwardArtifact({
        frozenModels: { student_t: { n: MIN_GATE_N, crps: 7.0115, delta: 0.0156 } },
      }),
    );
    expect(v.blocked).toBe(false);
    expect(v.n).toBe(MIN_GATE_N);
    expect(v.failedCriterion).toBeNull();
  });

  it("n of 149 BLOCKS", () => {
    const v = evaluateFile(
      "n-below.json",
      walkForwardArtifact({
        frozenModels: { student_t: { n: 149, crps: 7.0115, delta: 0.0156 } },
      }),
    );
    expect(v.blocked).toBe(true);
    expect(v.failedCriterion).toBe("n_below_minimum");
  });

  it("each criterion blocks on its own while the other two pass", () => {
    // Only the CRPS is wrong. n and delta both clear.
    const badCrps = evaluateFile(
      "solo-bad-crps.json",
      walkForwardArtifact({
        frozenModels: { student_t: { n: 570, crps: 7.2, delta: 0.05 } },
      }),
    );
    expect(badCrps.blocked).toBe(true);
    expect(badCrps.failedCriterion).toBe("crps_above_bar");
    expect(badCrps.n).toBe(570);
    expect(badCrps.deltaVsGaussian).toBe(0.05);

    // Only the delta is wrong. crps and n both clear.
    const badDelta = evaluateFile(
      "solo-bad-delta.json",
      walkForwardArtifact({
        frozenModels: { student_t: { n: 570, crps: 7.01, delta: 0.005 } },
      }),
    );
    expect(badDelta.blocked).toBe(true);
    expect(badDelta.failedCriterion).toBe("delta_below_minimum");
    expect(badDelta.crps).toBe(7.01);

    // Only n is wrong. crps and delta both clear.
    const badN = evaluateFile(
      "solo-bad-n.json",
      walkForwardArtifact({
        frozenModels: { student_t: { n: 100, crps: 7.01, delta: 0.05 } },
      }),
    );
    expect(badN.blocked).toBe(true);
    expect(badN.failedCriterion).toBe("n_below_minimum");
    expect(badN.crps).toBe(7.01);
    expect(badN.deltaVsGaussian).toBe(0.05);
  });
});

describe("T15 constitutional CRPS circuit breaker — the artifact's own verdict", () => {
  it("passed:false BLOCKS even when a frozen model clears every numeric criterion", () => {
    const v = evaluateFile(
      "declares-not-passed.json",
      walkForwardArtifact({
        passed: false,
        frozenModels: { student_t: { n: 570, crps: 7.0115, delta: 0.0156 } },
      }),
    );
    expect(v.blocked).toBe(true);
    expect(v.failedCriterion).toBe("artifact_declares_not_passed");
    expect(v.passed).toBe(false);
  });

  it("the spec-named artifact's own models.gate_cleared:false BLOCKS", () => {
    // This is the REAL artifact's state: two frozen families clear the
    // numeric conjunction (its own models_meeting_full_gate lists them) and
    // the artifact still says NOT CLEARED. The numeric conjunction alone must
    // not open the gate.
    const v = evaluateFile(
      "gate-not-cleared.json",
      walkForwardArtifact({
        passed: true,
        gateCleared: false,
        frozenModels: {
          student_t: { n: 570, crps: 7.0115, delta: 0.0156 },
          normal_mixture_2: { n: 570, crps: 7.0079, delta: 0.0192 },
        },
      }),
    );
    expect(v.blocked).toBe(true);
    expect(v.failedCriterion).toBe("artifact_does_not_declare_cleared");
    // The numeric criteria DID pass — and that must be visible, because it
    // is the difference between "the bar was missed" and "the artifact's own
    // honesty factors refused it".
    expect(v.qualifiedModels).toEqual(["student_t", "normal_mixture_2"]);
  });

  it("the UNFROZEN cross-check never counts toward clearing", () => {
    // The frozen manifest has nothing that clears. The cross-check has a
    // model that clears every criterion. The gate must still be closed, and
    // must say that the cross-check is the reason it is not the frozen
    // manifest that is blocking.
    const v = evaluateFile(
      "crosscheck-only.json",
      walkForwardArtifact({
        frozenModels: { student_t: { n: 570, crps: 7.2, delta: 0.005 } },
        crosscheckModels: { student_t: { n: 2494, crps: 7.0115, delta: 0.0156 } },
      }),
    );
    expect(v.blocked).toBe(true);
    expect(v.failedCriterion).toBe("only_unfrozen_crosscheck_qualifies");
    expect(v.excludedCrosscheckModels).toContain("crosscheck:student_t");
    expect(v.qualifiedModels).toEqual([]);
  });
});

describe("T15 constitutional CRPS circuit breaker — fail closed on every ambiguity", () => {
  it("a missing file BLOCKS with file_missing", () => {
    const v = readEmissionGateFromFile(join(TMP, "does-not-exist.json"));
    expect(v.blocked).toBe(true);
    expect(v.failedCriterion).toBe("file_missing");
  });

  it("an unparseable file BLOCKS with file_unparseable", () => {
    const v = evaluateFile("broken.json", "{ this is not json");
    expect(v.blocked).toBe(true);
    expect(v.failedCriterion).toBe("file_unparseable");
  });

  it("a non-object JSON file BLOCKS with file_unparseable", () => {
    const v = evaluateFile("array.json", [1, 2, 3]);
    expect(v.blocked).toBe(true);
    expect(v.failedCriterion).toBe("file_unparseable");
  });

  it("a null CRPS BLOCKS and says the bar was NEVER REPRODUCED", () => {
    const v = evaluateFile(
      "null-crps.json",
      walkForwardArtifact({
        frozenModels: { student_t: { n: 570, crps: null, delta: 0.0156 } },
      }),
    );
    expect(v.blocked).toBe(true);
    expect(v.failedCriterion).toBe("crps_not_reproduced");
    expect(v.reason).toContain("never reproduced");
    // The distinction the old gate could not make: the criterion was never
    // EVALUATED, which is a different finding from a criterion that FAILED.
    expect(v.reason).not.toContain("above 7.099");
  });

  it("a missing CRPS BLOCKS as never reproduced", () => {
    const v = evaluateFile(
      "missing-crps.json",
      walkForwardArtifact({
        frozenModels: { student_t: { n: 570, delta: 0.0156 } },
      }),
    );
    expect(v.blocked).toBe(true);
    expect(v.failedCriterion).toBe("crps_not_reproduced");
  });

  it("a missing n BLOCKS as n_missing", () => {
    const v = evaluateFile(
      "missing-n.json",
      walkForwardArtifact({
        frozenModels: { student_t: { crps: 7.0115, delta: 0.0156 } },
      }),
    );
    expect(v.blocked).toBe(true);
    expect(v.failedCriterion).toBe("n_missing");
  });

  it("a missing delta BLOCKS as delta_missing", () => {
    const v = evaluateFile(
      "missing-delta.json",
      walkForwardArtifact({
        frozenModels: { student_t: { n: 570, crps: 7.0115 } },
      }),
    );
    expect(v.blocked).toBe(true);
    expect(v.failedCriterion).toBe("delta_missing");
  });

  it("a non-finite CRPS BLOCKS as crps_not_finite", () => {
    // 1e999 parses to Infinity -- a number that is present but not finite.
    // JSON.stringify cannot produce it (it writes NaN as null), so the raw
    // artifact text is written directly.
    const path = join(TMP, "infinite-crps.json");
    writeFileSync(
      path,
      JSON.stringify(walkForwardArtifact({})).replace(
        '"crps":7.0115',
        '"crps":1e999',
      ),
      "utf8",
    );
    const v = readEmissionGateFromFile(path);
    expect(v.blocked).toBe(true);
    expect(v.failedCriterion).toBe("crps_not_finite");
  });

  it("a non-numeric CRPS is a non-finite CRPS, not a reproduced one", () => {
    // The artifact says "crps": "7.0" -- a string where a number belongs.
    // The criterion was evaluated against a value that is not a number, so
    // this is crps_not_finite, NOT crps_not_reproduced.
    const path = join(TMP, "string-crps.json");
    writeFileSync(
      path,
      JSON.stringify(walkForwardArtifact({})).replace(
        '"crps":7.0115',
        '"crps":"7.0"',
      ),
      "utf8",
    );
    const v = readEmissionGateFromFile(path);
    expect(v.blocked).toBe(true);
    expect(v.failedCriterion).toBe("crps_not_finite");
  });

  it("an empty frozen-manifest model map BLOCKS as no_model_candidates", () => {
    const v = evaluateFile(
      "no-models.json",
      walkForwardArtifact({ frozenModels: {} }),
    );
    expect(v.blocked).toBe(true);
    expect(v.failedCriterion).toBe("no_model_candidates");
  });
});

describe("T15 constitutional CRPS circuit breaker — the on-disk 2462-game artifact", () => {
  it("the artifact on disk BLOCKS, and the baseline CRPS is never substituted for the model's own", () => {
    // The real packages/ingestion-pipeline/walk-forward-gate.json: n=2462,
    // crps=7.1597, gaussian_close_crps=7.154021, delta=-0.0057, passed=false.
    //
    // The artifact used to carry crps=null with a rerun block admitting the
    // Laplace CRPS "was not recomputed". GAP-15 then implemented analytic
    // crps_laplace and the artifact was re-evaluated with a real number, so the
    // block reason moved from "never reproduced" to "above the bar": 7.1597
    // exceeds MAX_EMISSION_CRPS 7.099. The gate must still refuse, and the
    // artifact's own `passed:false` is the first criterion that closes it.
    const path = join(process.cwd(), "walk-forward-gate.json");
    const v = readEmissionGateFromFile(path);
    expect(v.blocked).toBe(true);
    expect(v.failedCriteria).toContain("artifact_declares_not_passed");
    expect(v.failedCriteria).toContain("crps_above_bar");
    // The evaluated CRPS is the MODEL's own (crps_laplace), NOT the Gaussian
    // baseline reported beside it. If the gate had substituted the baseline,
    // this would read 7.154021.
    expect(v.crps).toBe(7.1597);
    expect(v.crps).not.toBe(7.154021);
    expect(v.crpsContext.map((c) => c.source)).toContain("gaussian_close_crps");
    expect(v.crpsContext.find((c) => c.source === "gaussian_close_crps")?.value).toBe(7.154021);
  });

  it("the on-disk artifact reads as the flat shape", () => {
    const path = join(process.cwd(), "walk-forward-gate.json");
    const v = readEmissionGateFromFile(path);
    expect(v.shape).toBe("flat");
    expect(v.n).toBe(2462);
  });
});

describe("T15 constitutional CRPS circuit breaker — the override path", () => {
  it("a bare { passed: true } override BLOCKS (the hole the old gate left)", () => {
    const v = evaluateEmissionGateOverride({ passed: true });
    expect(v.blocked).toBe(true);
    expect(v.failedCriterion).toBe("crps_not_reproduced");
  });

  it("an override that carries the evidence OPENS the gate", () => {
    const override: EmissionGateOverride = {
      passed: true,
      crps: 7.0,
      n: 570,
      deltaVsGaussian: 0.02,
    };
    expect(evaluateEmissionGateOverride(override).blocked).toBe(false);
    expect(emissionBlocked(override)).toBe(false);
  });

  it("an override with passed:false BLOCKS however good the numbers are", () => {
    expect(
      emissionBlocked({ passed: false, crps: 7.0, n: 570, deltaVsGaussian: 0.02 }),
    ).toBe(true);
  });

  it("an override whose CRPS is above the bar BLOCKS", () => {
    expect(
      emissionBlocked({ passed: true, crps: 7.2, n: 570, deltaVsGaussian: 0.02 }),
    ).toBe(true);
  });
});
