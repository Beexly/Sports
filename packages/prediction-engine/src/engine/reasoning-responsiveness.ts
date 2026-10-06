/**
 * reasoning-responsiveness.ts — turns "the engine reasons" from an
 * assertion into a MEASURED property.
 *
 * Two properties, both measurable:
 *
 *  1. RESPONSIVENESS — hold the code fixed, sweep one input axis, and
 *     measure whether the output moves, in which direction, and how far.
 *
 *  2. SELECTION-AWARENESS — hold every magnitude fixed and change only
 *     WHICH signal is selected. A magnitude-driven averager passes (1)
 *     and fails (2); a reasoning spine passes both.
 *
 * The failure mode this module exists to catch: a stub that returns a
 * plausible constant. Such a stub satisfies every existing structural
 * test in the engine (shape is right, value is truthy, adapter never
 * throws) and is caught here, because INERT means span === 0.
 *
 * Why verdicts are graded rather than boolean: real math saturates.
 * `nflPasserRating` caps its touchdown term at 2.375, so 2 TD and 10 TD
 * over 10 attempts legitimately score the same. A naive "output must
 * change" probe false-fails that. So a sweep is judged against a
 * DECLARED response shape, and the measured plateau is reported rather
 * than hidden — an undocumented plateau is a bug, a documented one is
 * the model.
 */

/** Shape a sweep is expected to trace as its axis increases. */
export type ResponseShape =
  /** Output never decreases (ties allowed). */
  | "monotonic_up"
  /** Output never increases (ties allowed). */
  | "monotonic_down"
  /** Output rises to a single interior maximum, then falls. */
  | "single_peak"
  /** Output falls to a single interior minimum, then rises. */
  | "single_trough";

export type ResponseVerdict =
  /** Matches the declared shape. The spine tracks this input. */
  | "SHAPE_OK"
  /** Total span is zero: the output never moved. The stub signature. */
  | "INERT"
  /**
   * Every point is a declared boundary and the output is flat across
   * all of them. A designed constant — documented, therefore not a bug.
   * Distinguished from INERT because a reader must be able to tell
   * "nobody explained this constant" from "this constant is the model".
   */
  | "DECLARED_CONSTANT"
  /** Moved, but not in the declared shape. Wrong sign or wrong turning point. */
  | "SHAPE_VIOLATION";

/** One point on a swept axis. */
export interface SweepPoint {
  /** The axis value that produced this reading. */
  readonly input: number;
  /** The scalar readout of the engine's answer at this input. */
  readonly output: number;
  /**
   * True when this point is a documented saturation boundary rather
   * than an interior reading (e.g. the NFL rating cap, a fractional
   * Kelly cap, an admissible-domain edge). Declared per point by the
   * probe author, never inferred, so a real stub cannot hide here.
   */
  readonly boundary?: boolean;
}

export interface SweepResult {
  readonly name: string;
  readonly verdict: ResponseVerdict;
  /** max(output) − min(output). Zero means the spine ignored the axis. */
  readonly span: number;
  /** span / |axis range|. Input-scale-free measure of responsiveness. */
  readonly normalizedSpan: number;
  /** Longest run of consecutive equal outputs — the saturation plateau. */
  readonly longestPlateau: number;
  /** Count of adjacent points where the response reversed direction. */
  readonly directionFlips: number;
  /** Mean absolute step between adjacent outputs. */
  readonly meanAbsStep: number;
  /** Axis index at which the declared shape turns (peaks only). */
  readonly turningIndex: number | null;
}

export interface SweepSpec {
  /** Stable identifier used in failure messages and the report. */
  readonly name: string;
  /** What the sweep is expected to prove, in one clause. */
  readonly hypothesis: string;
  readonly shape: ResponseShape;
  readonly points: readonly SweepPoint[];
}

function isMonotonicUp(pts: readonly SweepPoint[]): boolean {
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]!;
    const cur = pts[i]!;
    if (cur.output < prev.output) return false;
  }
  return true;
}

function isMonotonicDown(pts: readonly SweepPoint[]): boolean {
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]!;
    const cur = pts[i]!;
    if (cur.output > prev.output) return false;
  }
  return true;
}

/** Largest k such that all steps before k are ≥0 and all steps from k are ≤0. */
function peakTurningIndex(pts: readonly SweepPoint[]): number {
  let best = 0;
  let bestScore = -1;
  for (let k = 0; k < pts.length; k++) {
    let ok = true;
    for (let i = 1; i <= k && ok; i++) {
      if (pts[i]!.output < pts[i - 1]!.output) ok = false;
    }
    for (let i = k + 1; i < pts.length && ok; i++) {
      if (pts[i]!.output > pts[i - 1]!.output) ok = false;
    }
    if (!ok) continue;
    // Prefer the split that actually separates rising from falling.
    const risesBefore = pts.slice(0, k + 1).some((p, i) => i > 0 && p.output > pts[i - 1]!.output);
    const fallsAfter = pts.slice(k + 1).some((p, i) => i >= 0 && p.output < pts[k + i]!.output);
    const score = (risesBefore ? 1 : 0) + (fallsAfter ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = k;
    }
  }
  return best;
}

/** Smallest k such that all steps before k are ≤0 and all steps from k are ≥0. */
function troughTurningIndex(pts: readonly SweepPoint[]): number {
  let best = 0;
  let bestScore = -1;
  for (let k = 0; k < pts.length; k++) {
    let ok = true;
    for (let i = 1; i <= k && ok; i++) {
      if (pts[i]!.output > pts[i - 1]!.output) ok = false;
    }
    for (let i = k + 1; i < pts.length && ok; i++) {
      if (pts[i]!.output < pts[i - 1]!.output) ok = false;
    }
    if (!ok) continue;
    const fallsBefore = pts.slice(0, k + 1).some((p, i) => i > 0 && p.output < pts[i - 1]!.output);
    const risesAfter = pts.slice(k + 1).some((p, i) => i >= 0 && p.output > pts[k + i]!.output);
    const score = (fallsBefore ? 1 : 0) + (risesAfter ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = k;
    }
  }
  return best;
}

/**
 * Evaluate one swept axis against its declared response shape.
 *
 * INERT is reported before any shape check: an output that never moved
 * cannot be said to have traced any shape, including a flat one.
 */
export function evaluateSweep(spec: SweepSpec): SweepResult {
  const pts = spec.points;
  if (pts.length < 2) {
    throw new Error(`sweep "${spec.name}" needs at least 2 points to measure responsiveness`);
  }
  for (let i = 1; i < pts.length; i++) {
    if (pts[i]!.input <= pts[i - 1]!.input) {
      throw new Error(`sweep "${spec.name}" axis must be strictly increasing (index ${i})`);
    }
  }

  let min = Infinity;
  let max = -Infinity;
  let sumAbsStep = 0;
  let flips = 0;
  let plateau = 1;
  let runPlateau = 1;
  let lastSign = 0;

  for (let i = 0; i < pts.length; i++) {
    const out = pts[i]!.output;
    if (!Number.isFinite(out)) {
      throw new Error(`sweep "${spec.name}" produced a non-finite output at input ${pts[i]!.input}`);
    }
    if (out < min) min = out;
    if (out > max) max = out;
    if (i === 0) continue;
    const delta = out - pts[i - 1]!.output;
    sumAbsStep += Math.abs(delta);
    if (delta === 0) {
      runPlateau += 1;
    } else {
      if (runPlateau > plateau) plateau = runPlateau;
      runPlateau = 1;
      const sign = delta > 0 ? 1 : -1;
      if (lastSign !== 0 && sign !== lastSign) flips += 1;
      lastSign = sign;
    }
  }
  if (runPlateau > plateau) plateau = runPlateau;

  const span = max - min;
  const axisRange = pts[pts.length - 1]!.input - pts[0]!.input;
  const normalizedSpan = axisRange === 0 ? 0 : span / axisRange;

  let verdict: ResponseVerdict;
  let turningIndex: number | null = null;

  if (span === 0) {
    // A flat sweep is only innocent if the author declared it flat.
    // Otherwise it is the stub signature, and no amount of confidence
    // in the code changes that.
    verdict = pts.every((p) => p.boundary === true) ? "DECLARED_CONSTANT" : "INERT";
  } else {
    switch (spec.shape) {
      case "monotonic_up":
        verdict = isMonotonicUp(pts) ? "SHAPE_OK" : "SHAPE_VIOLATION";
        break;
      case "monotonic_down":
        verdict = isMonotonicDown(pts) ? "SHAPE_OK" : "SHAPE_VIOLATION";
        break;
      case "single_peak":
        turningIndex = peakTurningIndex(pts);
        verdict =
          isMonotonicUp(pts.slice(0, turningIndex + 1)) &&
          isMonotonicDown(pts.slice(turningIndex))
            ? "SHAPE_OK"
            : "SHAPE_VIOLATION";
        break;
      case "single_trough":
        turningIndex = troughTurningIndex(pts);
        verdict =
          isMonotonicDown(pts.slice(0, turningIndex + 1)) &&
          isMonotonicUp(pts.slice(turningIndex))
            ? "SHAPE_OK"
            : "SHAPE_VIOLATION";
        break;
    }
  }

  return {
    name: spec.name,
    verdict,
    span,
    normalizedSpan,
    longestPlateau: plateau,
    directionFlips: flips,
    meanAbsStep: sumAbsStep / (pts.length - 1),
    turningIndex,
  };
}

// ── Selection discrimination ───────────────────────────────────────────────

/**
 * A selection pair: identical magnitudes, different selected signal.
 * `heldConstant` names what is deliberately identical between the two
 * arms so a reader can confirm the test isolates selection alone.
 */
export interface SelectionPair<T> {
  /** Stable identifier used in failure messages and the report. */
  readonly name: string;
  /** What differing selection is expected to change, in one clause. */
  readonly hypothesis: string;
  /** Field(s) proven equal across both arms. */
  readonly heldConstant: string;
  readonly selected: T;
  readonly rejected: T;
  /** Scalar readout of the engine's answer for this arm. */
  readonly read: (input: T) => number;
}

export interface SelectionResult {
  readonly name: string;
  /** Both arms answered, and the answers differ. The spine selected. */
  readonly discriminated: boolean;
  readonly selectedReading: number;
  readonly rejectedReading: number;
  /** |selected − rejected|. */
  readonly gap: number;
}

/**
 * Measure selection-awareness: with every magnitude held equal, does
 * changing WHICH signal is selected change the answer?
 *
 * A pure averager collapses to gap === 0 here even while scoring well
 * on every responsiveness sweep, which is exactly why both halves of
 * this module are required.
 */
export function evaluateSelection<T>(pair: SelectionPair<T>): SelectionResult {
  const a = pair.read(pair.selected);
  const b = pair.read(pair.rejected);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new Error(`selection pair "${pair.name}" produced a non-finite reading`);
  }
  return {
    name: pair.name,
    discriminated: a !== b,
    selectedReading: a,
    rejectedReading: b,
    gap: Math.abs(a - b),
  };
}

// ── Report ──────────────────────────────────────────────────────────────────

export interface SpineResponsivenessReport {
  readonly sweeps: readonly SweepResult[];
  readonly selections: readonly SelectionResult[];
  /** Count of sweeps that traced their declared shape. */
  readonly responsive: number;
  /** Count of sweeps that never moved without being declared flat. Must be 0. */
  readonly inert: number;
  /** Count of sweeps that are flat AND declared as designed constants. */
  readonly declaredConstants: number;
  /** Count of sweeps that moved the wrong way. Must be 0. */
  readonly violations: number;
  /** Count of selection pairs the spine discriminated. */
  readonly discriminating: number;
}

/** Aggregate sweep and selection measurements into one report. */
export function buildReport(
  sweeps: readonly SweepResult[],
  selections: readonly SelectionResult[],
): SpineResponsivenessReport {
  return {
    sweeps,
    selections,
    responsive: sweeps.filter((s) => s.verdict === "SHAPE_OK").length,
    inert: sweeps.filter((s) => s.verdict === "INERT").length,
    declaredConstants: sweeps.filter((s) => s.verdict === "DECLARED_CONSTANT").length,
    violations: sweeps.filter((s) => s.verdict === "SHAPE_VIOLATION").length,
    discriminating: selections.filter((s) => s.discriminated).length,
  };
}

/** One line per sweep — the audit trail behind the headline numbers. */
export function formatSweepLines(results: readonly SweepResult[]): readonly string[] {
  return results.map((r) => {
    const turn = r.turningIndex === null ? "" : ` turn@${r.turningIndex}`;
    return (
      `  ${r.verdict.padEnd(15)} ${r.name.padEnd(34)} ` +
      `span=${r.span.toExponential(2)} norm=${r.normalizedSpan.toExponential(2)} ` +
      `plateau=${r.longestPlateau}${turn}`
    );
  });
}