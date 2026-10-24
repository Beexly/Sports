/**
 * Emission gate. The constitutional condition, in code.
 *
 * WHAT THIS IS. The gate decides whether generate-signal-slate may write Pick
 * rows at all. It is the only thing standing between the board and a
 * walk-forward result that never cleared its own bar, so it is written as a
 * CONSTITUTION rather than a boolean read:
 *
 *   the gate is OPEN only when ALL of the following hold --
 *
 *     (1) the walk-forward artifact says so itself (its `passed` flag, and,
 *         for the spec-named artifact, its `models.gate_cleared` flag);
 *     (2) the artifact contains a FROZEN-MANIFEST model that satisfies the
 *         conjunction the artifact's own rule states:
 *
 *             n >= 150  AND  delta_vs_gaussian_13.45 >= 0.01  AND  crps <= 7.099
 *
 *     (3) that model comes from the frozen manifest. An UNFROZEN nflverse
 *         cross-check never counts toward clearing, no matter how good it is.
 *
 * WHY THE FULL CONJUNCTION AND NOT JUST crps <= 7.099. The 7.099 bar alone is
 * a LEVEL bar, and a level bar is cleared by a model that merely TIES the
 * baseline. The artifact's own rule (rule.passed_if, models.gate_rule)
 * requires the model to also BEAT the same-games Gaussian 13.45 by 0.01 and
 * to be scored on at least 150 games. A gate that checked only the level
 * would clear a model that ties.
 *
 * WHY THE ARTIFACT'S OWN VERDICT IS ALSO REQUIRED. The spec-named artifact
 * does contain frozen-manifest models that clear the numeric conjunction --
 * its own models_meeting_full_gate list is non-empty -- and the artifact STILL
 * says passed:false, because the same artifact records that the larger
 * unfrozen nflverse cross-check puts every family above 7.099, that 8
 * families were scored and the best reported with no multiple-comparison
 * correction, and that the 2025 two-normal margin is 0.0099. Those are
 * honesty factors no numeric test can express. The artifact states the rule
 * in its own words: "Gate is NOT cleared unless passed is true." So the
 * numeric conjunction is NECESSARY and the artifact's own verdict is
 * NECESSARY; neither one alone opens the gate. Requiring the numeric
 * conjunction on top of the boolean is what closes the hole the old gate
 * left: a commit that writes passed:true without a real CRPS cannot open it.
 *
 * THE TWO FILE SHAPES. This module reads BOTH shapes of the artifact:
 *
 *   1. dfs/walk_forward/walk_forward.json -- the SPEC-NAMED artifact. Its
 *      models.frozen_manifest.models map carries one entry per model family
 *      with { n, crps, delta_vs_gaussian_13.45 }, and its rule.passed_if /
 *      models.gate_rule state the conjunction in words. This is the shape the
 *      constitutional conjunction is written against. Its
 *      models.nflverse_crosscheck_unfrozen.models block is read ONLY so that
 *      it can be reported as excluded; if it is the ONLY thing that would
 *      qualify, that is the reported reason for the block.
 *
 *   2. packages/ingestion-pipeline/walk-forward-gate.json -- the ON-BRANCH
 *      diagnostic. It has no per-family model map; it carries a single
 *      { n, crps, delta }. It is read as a single-model manifest, so the SAME
 *      constitution applies to it. It also carries two OTHER CRPS numbers --
 *      gaussian_close_crps and cvi.nflverse_gaussian_plus_cvi_crps. Those are
 *      the BASELINE's CRPS and a CVI-scaled variant, not the model's own CRPS,
 *      so they are REPORTED but never substituted for the criterion. If the
 *      model's own CRPS was never computed, the criterion was never
 *      evaluated, and that is the finding.
 *
 * Both shapes are held to the same constitution. There is no shape of the
 * artifact, and no argument a caller can pass, that opens the gate by
 * asserting `passed: true` alone.
 *
 * FAIL-CLOSED, EVERY AMBIGUITY BLOCKS. A missing file, an unparseable file,
 * a null CRPS, a non-finite CRPS, a missing n, a missing delta, a missing
 * gate_cleared flag, an empty model map, and an artifact whose own `passed`
 * is false all BLOCK. The gate never guesses a value it did not read.
 *
 * THE VERDICT. readEmissionGate() returns a rich verdict, not a boolean, so a
 * caller can say WHY it blocked. Two distinct findings are reported
 * separately, because they mean different things to whoever has to fix them:
 *
 *   - "the CRPS bar was never reproduced" -- the artifact's model CRPS is
 *     null/absent, so the CRPS <= 7.099 criterion was never EVALUATED on this
 *     branch. This is the on-disk state of walk-forward-gate.json, whose own
 *     `rerun` block admits: "Laplace CRPS 7.1597 was not recomputed: no
 *     Laplace margin module on this branch, and none was written."
 *   - "the CRPS bar is above 7.099" -- a CRPS was computed and it exceeds the
 *     bar. The criterion was evaluated and FAILED.
 *
 * A verdict that collapsed those two into one boolean would be the same
 * defect this module exists to fix.
 *
 * THE OVERRIDE. emissionBlocked(override) accepts an explicit override for
 * tests that need to exercise the minting path. The override is a
 * TEST-HARNESS ESCAPE HATCH from reading the file, and it is deliberately NOT
 * a way around the criteria: it is evaluated by the SAME conjunction as the
 * file. An override that claims `passed: true` with no crps/n/delta is
 * BLOCKED, because a bare boolean is exactly the hole this file was written
 * to close. A caller that wants the gate open must supply the evidence.
 *
 * This module does not write Pick rows.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** The CRPS bar. A model at or below this clears the level criterion. */
export const MAX_EMISSION_CRPS = 7.099;

/** Minimum games a model must be scored on to count. */
export const MIN_GATE_N = 150;

/** Minimum CRPS advantage over the same-games Gaussian 13.45 baseline. */
export const MIN_DELTA_VS_GAUSSIAN = 0.01;

/**
 * The override a caller may pass. It carries the same evidence the artifact
 * supplies, so the file path and the override path are evaluated by ONE
 * function and cannot drift apart.
 */
export type EmissionGateOverride = {
  readonly passed: boolean;
  readonly crps?: number | null;
  readonly n?: number | null;
  readonly deltaVsGaussian?: number | null;
};

/** Which shape of the artifact was read. */
export type EmissionGateShape = "walk_forward" | "flat" | "none";

/** Why the gate is closed. The first one is the thing to fix. */
export type EmissionGateBlockReason =
  /** No artifact file could be read at any known path. */
  | "file_missing"
  /** A file was found but is not valid JSON, or is not a JSON object. */
  | "file_unparseable"
  /** The artifact's own `passed` flag is false. */
  | "artifact_declares_not_passed"
  /** The artifact's own `models.gate_cleared` flag is false or absent. */
  | "artifact_does_not_declare_cleared"
  /** The artifact carries no frozen-manifest model to evaluate. */
  | "no_model_candidates"
  /** The CRPS in force was never computed (null/absent). */
  | "crps_not_reproduced"
  /** The CRPS in force is present but is not a finite number. */
  | "crps_not_finite"
  /** The CRPS in force exceeds MAX_EMISSION_CRPS. */
  | "crps_above_bar"
  /** The sample size is missing. */
  | "n_missing"
  /** The sample size is below MIN_GATE_N. */
  | "n_below_minimum"
  /** The delta-vs-Gaussian is missing. */
  | "delta_missing"
  /** The delta-vs-Gaussian is below MIN_DELTA_VS_GAUSSIAN. */
  | "delta_below_minimum"
  /** The only qualifying candidates live in the unfrozen cross-check. */
  | "only_unfrozen_crosscheck_qualifies";

/** A CRPS number that was read but is NOT the criterion (baseline/variant). */
export type EmissionGateCrpsContext = {
  readonly source: string;
  readonly value: number;
};

/** The full verdict. `blocked` is the answer; everything else explains it. */
export type EmissionGateVerdict = {
  /** True when emission is refused. */
  readonly blocked: boolean;
  /** The artifact's own `passed` flag, or false when it could not be read. */
  readonly passed: boolean;
  /** The model's own CRPS that was evaluated, or null when never reproduced. */
  readonly crps: number | null;
  /** Which model the evaluated CRPS came from, for the reason text. */
  readonly crpsSource: string | null;
  /** The sample size that was evaluated, or null. */
  readonly n: number | null;
  /** The delta-vs-Gaussian that was evaluated, or null. */
  readonly deltaVsGaussian: number | null;
  /** Other CRPS numbers in the artifact, reported but never substituted. */
  readonly crpsContext: readonly EmissionGateCrpsContext[];
  /** Frozen-manifest models that cleared every numeric criterion, by name. */
  readonly qualifiedModels: readonly string[];
  /** Unfrozen cross-check models that would have qualified. Never counted. */
  readonly excludedCrosscheckModels: readonly string[];
  /** Every failing criterion, most diagnostic first. */
  readonly failedCriteria: readonly EmissionGateBlockReason[];
  /** The first failing criterion, or null when the gate is open. */
  readonly failedCriterion: EmissionGateBlockReason | null;
  /** A human-readable explanation of the block. */
  readonly reason: string;
  /** Which artifact shape was read. */
  readonly shape: EmissionGateShape;
  /** The path the artifact was read from, or null. */
  readonly sourcePath: string | null;
  /** The artifact's own rule text, when it declares one. */
  readonly declaredRule: string | null;
};

/** A single model's evidence, as read from the artifact. */
type ModelCandidate = {
  readonly name: string;
  readonly n: number | null;
  readonly crps: number | null;
  readonly deltaVsGaussian: number | null;
  /** True when this candidate came from the UNFROZEN cross-check. */
  readonly unfrozen: boolean;
};

/**
 * Directories to search for the artifact, nearest first.
 *
 * The artifact lives at the repo root (dfs/walk_forward/walk_forward.json) and
 * at packages/ingestion-pipeline/walk-forward-gate.json. The process cwd
 * varies -- the web app runs from apps/web, the package tests run from
 * packages/ingestion-pipeline -- so the search walks up from the cwd.
 */
function searchDirs(): readonly string[] {
  const out: string[] = [];
  let dir = resolve(process.cwd());
  for (let i = 0; i < 4; i += 1) {
    out.push(dir);
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return out;
}

/**
 * Candidate paths for the artifact.
 *
 * The SPEC-NAMED shape is probed first across every level, so a tree that has
 * both artifacts reads the spec-named one no matter where the process cwd
 * sits. The on-branch diagnostic is probed second.
 */
function candidatePaths(): readonly string[] {
  const dirs = searchDirs();
  const out: string[] = [];
  for (const dir of dirs) {
    out.push(join(dir, "dfs", "walk_forward", "walk_forward.json"));
  }
  for (const dir of dirs) {
    out.push(join(dir, "packages", "ingestion-pipeline", "walk-forward-gate.json"));
    out.push(join(dir, "walk-forward-gate.json"));
  }
  return out;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Read a numeric field, keeping "present but not a finite number" distinct
 * from "absent". A field that is present and is not a finite number is a
 * DIFFERENT finding from a field that was never computed.
 */
function readNumber(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return Number.NaN;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Read the per-family model candidates out of a parsed artifact.
 *
 * Handles both shapes:
 *
 *   - walk_forward shape: models.frozen_manifest.models is a map of family
 *     name -> { n, crps, delta_vs_gaussian_13.45 }. The UNFROZEN nflverse
 *     cross-check (models.nflverse_crosscheck_unfrozen.models) is read too,
 *     but tagged `unfrozen` so it can never qualify.
 *
 *   - flat shape: the artifact itself describes one model, via { n, crps,
 *     delta }.
 */
function readCandidates(doc: Record<string, unknown>): ModelCandidate[] {
  const out: ModelCandidate[] = [];

  const models = asRecord(doc["models"]);
  if (models) {
    const frozen = asRecord(models["frozen_manifest"]);
    const frozenModels = frozen ? asRecord(frozen["models"]) : null;
    if (frozenModels) {
      for (const [name, raw] of Object.entries(frozenModels)) {
        const m = asRecord(raw);
        if (!m) continue;
        out.push({
          name,
          n: readNumber(m["n"]),
          crps: readNumber(m["crps"]),
          deltaVsGaussian: readNumber(m["delta_vs_gaussian_13.45"]),
          unfrozen: false,
        });
      }
    }
    const cross = asRecord(models["nflverse_crosscheck_unfrozen"]);
    const crossModels = cross ? asRecord(cross["models"]) : null;
    if (crossModels) {
      for (const [name, raw] of Object.entries(crossModels)) {
        const m = asRecord(raw);
        if (!m) continue;
        out.push({
          name: `crosscheck:${name}`,
          n: readNumber(m["n"]),
          crps: readNumber(m["crps"]),
          deltaVsGaussian: readNumber(m["delta_vs_gaussian_13.45"]),
          unfrozen: true,
        });
      }
    }
    return out;
  }

  // Flat shape: one implicit model. The artifact's own `delta` is the
  // delta-vs-baseline, with the same sign convention as
  // delta_vs_gaussian_13.45 (positive = the model BEATS the baseline).
  out.push({
    name: "flat",
    n: readNumber(doc["n"]),
    crps: readNumber(doc["crps"]),
    deltaVsGaussian: readNumber(doc["delta"]),
    unfrozen: false,
  });
  return out;
}

/**
 * Read the CRPS numbers that are NOT the criterion, so the verdict can report
 * them. These are the baseline's CRPS and the CVI-scaled variant: context,
 * never a substitute for the model's own CRPS.
 */
function readCrpsContext(doc: Record<string, unknown>): readonly EmissionGateCrpsContext[] {
  const out: EmissionGateCrpsContext[] = [];
  const push = (source: string, value: unknown): void => {
    if (isFiniteNumber(value)) out.push({ source, value });
  };
  push("gaussian_close_crps", doc["gaussian_close_crps"]);
  const pooled = asRecord(doc["pooled"]);
  if (pooled) push("pooled.gaussian_close_crps", pooled["gaussian_close_crps"]);
  const cvi = asRecord(doc["cvi"]);
  if (cvi) {
    push("cvi.nflverse_gaussian_plus_cvi_crps", cvi["nflverse_gaussian_plus_cvi_crps"]);
  }
  return out;
}

/**
 * Evaluate ONE candidate against the constitutional conjunction.
 *
 * Returns the failing criterion, or null when the candidate qualifies.
 *
 * The order of the checks IS the order of the conjunction as the artifact
 * states it, and the order is the point: a null CRPS is a criterion that was
 * never EVALUATED, which is a different finding from a CRPS that was
 * evaluated and FAILED.
 */
function firstFailure(c: ModelCandidate): EmissionGateBlockReason | null {
  if (c.crps === null) return "crps_not_reproduced";
  if (!isFiniteNumber(c.crps)) return "crps_not_finite";
  if (c.crps > MAX_EMISSION_CRPS) return "crps_above_bar";
  if (c.n === null) return "n_missing";
  if (!isFiniteNumber(c.n)) return "n_missing";
  if (c.n < MIN_GATE_N) return "n_below_minimum";
  if (c.deltaVsGaussian === null) return "delta_missing";
  if (!isFiniteNumber(c.deltaVsGaussian)) return "delta_missing";
  if (c.deltaVsGaussian < MIN_DELTA_VS_GAUSSIAN) return "delta_below_minimum";
  return null;
}

/** Human-readable text for a failing criterion. */
function describe(reason: EmissionGateBlockReason, c: ModelCandidate): string {
  switch (reason) {
    case "crps_not_reproduced":
      return (
        `the CRPS bar was never reproduced: model "${c.name}" reports no CRPS of its own, ` +
        `so the CRPS <= ${MAX_EMISSION_CRPS} criterion was never evaluated on this branch`
      );
    case "crps_not_finite":
      return `model "${c.name}" reports a CRPS that is not a finite number`;
    case "crps_above_bar":
      return `the CRPS bar is above ${MAX_EMISSION_CRPS}: model "${c.name}" has CRPS ${c.crps}`;
    case "n_missing":
      return `model "${c.name}" reports no usable sample size, so n >= ${MIN_GATE_N} was never evaluated`;
    case "n_below_minimum":
      return `model "${c.name}" is scored on n=${c.n}, below the n >= ${MIN_GATE_N} minimum`;
    case "delta_missing":
      return (
        `model "${c.name}" reports no delta vs Gaussian 13.45, so the ` +
        `>= ${MIN_DELTA_VS_GAUSSIAN} criterion was never evaluated`
      );
    case "delta_below_minimum":
      return (
        `model "${c.name}" beats Gaussian 13.45 by ${c.deltaVsGaussian}, ` +
        `below the required ${MIN_DELTA_VS_GAUSSIAN}`
      );
    case "only_unfrozen_crosscheck_qualifies":
      return (
        "only the UNFROZEN nflverse cross-check clears the bar; the frozen manifest does not, " +
        "and an unfrozen cross-check never counts toward clearing the gate"
      );
    case "artifact_declares_not_passed":
      return "the walk-forward artifact declares passed:false, so the gate is closed";
    case "artifact_does_not_declare_cleared":
      return (
        "the walk-forward artifact does not declare models.gate_cleared:true, " +
        "so the gate is closed"
      );
    case "no_model_candidates":
      return "the walk-forward artifact contains no frozen-manifest model to evaluate";
    case "file_unparseable":
      return "the walk-forward artifact is not a readable JSON object";
    case "file_missing":
      return "no walk-forward artifact was found at any known path";
    default:
      return reason;
  }
}

/** A frozen-manifest candidate that failed nothing, used as a placeholder. */
function emptyCandidate(): ModelCandidate {
  return { name: "none", n: null, crps: null, deltaVsGaussian: null, unfrozen: false };
}

/**
 * Evaluate a parsed artifact against the constitutional conjunction.
 *
 * Shared by the file path and the override path, so there is exactly ONE
 * implementation of the constitution.
 */
function evaluate(
  doc: Record<string, unknown>,
  sourcePath: string | null,
  shape: EmissionGateShape,
): EmissionGateVerdict {
  const artifactPassed = doc["passed"] === true;
  const candidates = readCandidates(doc);
  const frozen = candidates.filter((c) => !c.unfrozen);
  const crpsContext = readCrpsContext(doc);

  const models = asRecord(doc["models"]);
  const topRule = asRecord(doc["rule"]);
  const declaredRule =
    (models && typeof models["gate_rule"] === "string" ? (models["gate_rule"] as string) : null) ??
    (topRule && typeof topRule["passed_if"] === "string"
      ? (topRule["passed_if"] as string)
      : null);

  // The spec-named artifact carries its own gate verdict in TWO places: the
  // top-level `passed` flag and `models.gate_cleared`. The real artifact has
  // both false. The on-branch diagnostic has no models block, so the
  // top-level `passed` flag is its only verdict. A spec-shaped artifact with
  // a missing or false gate_cleared is closed: the artifact did not declare
  // itself cleared.
  //
  // BOTH must agree for the spec-named shape. The top-level flag is the
  // artifact's overall verdict; models.gate_cleared is the models block's
  // verdict on the frozen manifest. The real artifact sets both false, and
  // its own honesty_notes say so: "Gate is NOT cleared unless passed is
  // true."
  const isWalkForward = models !== null;
  const modelsCleared = isWalkForward ? models!["gate_cleared"] === true : true;
  const gateCleared = artifactPassed && modelsCleared;

  const base = {
    passed: artifactPassed,
    crpsContext,
    shape,
    sourcePath,
    declaredRule,
  } as const;

  const qualified: string[] = [];
  const failures: EmissionGateBlockReason[] = [];
  let firstCandidate: ModelCandidate | null = null;

  for (const c of frozen) {
    const failure = firstFailure(c);
    if (failure === null) {
      qualified.push(c.name);
      continue;
    }
    if (firstCandidate === null) firstCandidate = c;
    if (!failures.includes(failure)) failures.push(failure);
  }

  const excludedCrosscheckModels = candidates
    .filter((c) => c.unfrozen && firstFailure(c) === null)
    .map((c) => c.name);

  const winner = frozen.find((c) => c.name === qualified[0]) ?? null;
  const lead = firstCandidate ?? frozen[0] ?? emptyCandidate();

  // The artifact's own verdict is authoritative. It carries honesty factors
  // (an unfrozen cross-check above the bar, best-of-N selection without
  // multiple-comparison correction, a thin per-season margin) that no numeric
  // test can express, so a file that declares itself not-cleared is closed
  // even when a model inside it clears the numeric conjunction.
  if (!gateCleared) {
    // Report WHICH of the artifact's own two verdicts refused it.
    const verdictReason: EmissionGateBlockReason = !artifactPassed
      ? "artifact_declares_not_passed"
      : "artifact_does_not_declare_cleared";
    const numericNote =
      failures.length > 0
        ? ` (and the numeric criteria are not met either: ${describe(failures[0]!, lead)})`
        : "";
    return {
      ...base,
      blocked: true,
      crps: lead.crps,
      crpsSource: lead.name,
      n: lead.n,
      deltaVsGaussian: lead.deltaVsGaussian,
      qualifiedModels: qualified,
      excludedCrosscheckModels,
      failedCriteria: [verdictReason, ...failures],
      failedCriterion: verdictReason,
      reason: `${describe(verdictReason, lead)}${numericNote}`,
    };
  }

  if (frozen.length === 0) {
    return {
      ...base,
      blocked: true,
      crps: null,
      crpsSource: null,
      n: null,
      deltaVsGaussian: null,
      qualifiedModels: [],
      excludedCrosscheckModels,
      failedCriteria: ["no_model_candidates"],
      failedCriterion: "no_model_candidates",
      reason: describe("no_model_candidates", emptyCandidate()),
    };
  }

  if (qualified.length > 0 && winner) {
    return {
      ...base,
      blocked: false,
      crps: winner.crps,
      crpsSource: winner.name,
      n: winner.n,
      deltaVsGaussian: winner.deltaVsGaussian,
      qualifiedModels: qualified,
      excludedCrosscheckModels,
      failedCriteria: [],
      failedCriterion: null,
      reason: `cleared by ${qualified.length} frozen-manifest model(s): ${qualified.join(", ")}`,
    };
  }

  // Nothing in the frozen manifest qualified. If the ONLY thing that WOULD
  // qualify is the unfrozen cross-check, say so -- it is a distinct failure
  // from "the bar was not reached", and it is the failure the spec artifact
  // actually records.
  if (excludedCrosscheckModels.length > 0) {
    return {
      ...base,
      blocked: true,
      crps: lead.crps,
      crpsSource: lead.name,
      n: lead.n,
      deltaVsGaussian: lead.deltaVsGaussian,
      qualifiedModels: [],
      excludedCrosscheckModels,
      failedCriteria: ["only_unfrozen_crosscheck_qualifies", ...failures],
      failedCriterion: "only_unfrozen_crosscheck_qualifies",
      reason: describe("only_unfrozen_crosscheck_qualifies", lead),
    };
  }

  const reason = failures[0] ?? "no_model_candidates";
  return {
    ...base,
    blocked: true,
    crps: lead.crps,
    crpsSource: lead.name,
    n: lead.n,
    deltaVsGaussian: lead.deltaVsGaussian,
    qualifiedModels: [],
    excludedCrosscheckModels,
    failedCriteria: failures,
    failedCriterion: reason,
    reason: describe(reason, lead),
  };
}

/** The verdict for a file that could not be read at all. */
function unreadableVerdict(
  reason: EmissionGateBlockReason,
  detail: string,
  sourcePath: string | null,
): EmissionGateVerdict {
  return {
    blocked: true,
    passed: false,
    crps: null,
    crpsSource: null,
    n: null,
    deltaVsGaussian: null,
    crpsContext: [],
    qualifiedModels: [],
    excludedCrosscheckModels: [],
    failedCriteria: [reason],
    failedCriterion: reason,
    reason: detail,
    shape: "none",
    sourcePath,
    declaredRule: null,
  };
}

/**
 * Read ONE specific artifact file and evaluate it.
 *
 * Exported so a caller -- and the T15 test -- can point the gate at an exact
 * path and exercise the FILE path against real JSON on disk. A missing file
 * is a BLOCK with reason "file_missing"; an unreadable one is a BLOCK with
 * reason "file_unparseable". Neither throws.
 */
export function readEmissionGateFromFile(path: string): EmissionGateVerdict {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return unreadableVerdict("file_missing", `no walk-forward artifact at ${path}`, path);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return unreadableVerdict(
      "file_unparseable",
      `the walk-forward artifact at ${path} is not valid JSON`,
      path,
    );
  }
  const doc = asRecord(parsed);
  if (!doc) {
    return unreadableVerdict(
      "file_unparseable",
      `the walk-forward artifact at ${path} is not a JSON object`,
      path,
    );
  }
  const shape: EmissionGateShape = doc["models"] ? "walk_forward" : "flat";
  return evaluate(doc, path, shape);
}

/**
 * Read the walk-forward artifact from the well-known paths and evaluate it.
 *
 * Returns a rich verdict. A missing file is a BLOCK with reason
 * "file_missing", never a throw.
 */
export function readEmissionGate(): EmissionGateVerdict {
  let sawFile = false;
  let lastUnparseable: string | null = null;

  for (const path of candidatePaths()) {
    let text: string;
    try {
      text = readFileSync(path, "utf8");
    } catch {
      // No file at this path. Keep looking; a missing file blocks only when
      // NO candidate is present.
      continue;
    }
    sawFile = true;
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      lastUnparseable = path;
      continue;
    }
    const doc = asRecord(parsed);
    if (!doc) {
      lastUnparseable = path;
      continue;
    }
    const shape: EmissionGateShape = doc["models"] ? "walk_forward" : "flat";
    return evaluate(doc, path, shape);
  }

  if (sawFile) {
    return unreadableVerdict(
      "file_unparseable",
      `the walk-forward artifact at ${lastUnparseable} is not a readable JSON object`,
      lastUnparseable,
    );
  }

  return unreadableVerdict(
    "file_missing",
    "no walk-forward artifact found at any known path, so the gate is closed",
    null,
  );
}

/**
 * Evaluate an explicit override against the SAME constitutional conjunction.
 *
 * This is the test-harness escape hatch from reading the file, and it is
 * deliberately not a way around the criteria: an override that asserts
 * `passed: true` with no CRPS, no n, and no delta is BLOCKED, because a bare
 * boolean is exactly the hole this gate exists to close.
 */
export function evaluateEmissionGateOverride(
  override: EmissionGateOverride,
): EmissionGateVerdict {
  const doc: Record<string, unknown> = {
    passed: override.passed,
    n: override.n ?? null,
    crps: override.crps ?? null,
    delta: override.deltaVsGaussian ?? null,
  };
  return evaluate(doc, null, "flat");
}

/**
 * Whether emission is blocked.
 *
 * The signature is unchanged for existing callers: an override is used when
 * given, otherwise the artifact on disk is read. What changed is that
 * `passed: true` alone no longer opens the gate -- the constitutional
 * conjunction does.
 */
export function emissionBlocked(override?: EmissionGateOverride): boolean {
  const verdict = override
    ? evaluateEmissionGateOverride(override)
    : readEmissionGate();
  return verdict.blocked;
}

export function zeroEmissionNote(): string {
  return "emission gate closed: 0 picks, 0 parlays, 0 DFS. No moneyline upsert from independent fairs.";
}
