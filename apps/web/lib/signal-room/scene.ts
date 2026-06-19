/**
 * The Signal Room — pure scene model.
 *
 * Turns the homepage's REAL pipeline telemetry (configured intake lanes, live
 * scoring rows, published rows, rows held at the no-bet gate, and the public
 * calibration sample) into a deterministic, serializable description of a live
 * instrument: stations along the intelligence path
 *
 *     source mesh → evidence → decision core → no-bet gate → board
 *                       (market gravity above · calibration below the core)
 *
 * the conduits between them, how many signals are in flight on each conduit,
 * the state of the no-bet gate, and the calibration ring fill.
 *
 * HONEST BY CONSTRUCTION. The scene is a pure function of real counts. Signals
 * only move when there are real live rows — when the board is empty the room is
 * "quiet": stations glow faintly (they exist) but nothing is in flight and the
 * gate sits at rest. That is the brand promise (restraint as a first-class
 * output) made literal, not fabricated bustle. Nothing here invents activity the
 * loaders did not report.
 *
 * Pure, deterministic, no `any` — the whole model unit-tests with no DOM. The
 * thin canvas renderer (`components/home/signal-room.tsx`) consumes this scene;
 * it owns motion/colour, this owns truth/structure.
 */

/** Public-facing calibration display floor. Mirrors `calibration-curve.tsx` (`{sample}/30`). */
export const PUBLIC_CALIBRATION_FLOOR = 30;

/** Cap on simultaneously-rendered in-flight signals per conduit (legibility, not data). */
export const MAX_FLOW = 12;

/** Faint base glow so an at-rest station reads as present, never dead. */
const BASE_INTENSITY = 0.14;

export interface SignalRoomInput {
  /** Configured/active intake lanes (existence, not live throughput). */
  readonly sources: number;
  /** Rows actively being scored right now. */
  readonly scoring: number;
  /** Public rows that cleared the gate today. */
  readonly published: number;
  /** Rows held behind the no-bet gate today. */
  readonly gated: number;
  /** Settled canonical picks in the public calibration sample. */
  readonly calibrationSample: number;
  /** Public display floor for the calibration ring (e.g. 30). */
  readonly calibrationFloor: number;
}

export type StationId =
  | "source-mesh"
  | "evidence"
  | "decision-core"
  | "market-gravity"
  | "calibration"
  | "no-bet-gate"
  | "board";

/** Colour intent for a conduit — mapped to brand tokens by the renderer. */
export type ConduitTone = "intake" | "signal" | "gravity" | "verify" | "contradiction";

export interface SceneStation {
  readonly id: StationId;
  readonly label: string;
  /** Normalised layout coordinates in [0,1]; renderer maps to canvas px. */
  readonly x: number;
  readonly y: number;
  /** Glow strength in [0,1]. */
  readonly intensity: number;
  /** Real count this station represents, or -1 when it has no count. */
  readonly count: number;
}

export interface SceneConduit {
  readonly from: StationId;
  readonly to: StationId;
  readonly tone: ConduitTone;
  /** Visible in-flight signal count, 0..MAX_FLOW. Zero in quiet mode. */
  readonly flow: number;
  /** Real count driving this conduit (used for labels). */
  readonly load: number;
}

export interface CalibrationRing {
  readonly sample: number;
  readonly floor: number;
  /** Fill fraction in [0,1]. */
  readonly fraction: number;
  /** True once the public sample reaches its display floor. */
  readonly ready: boolean;
}

export interface GateState {
  readonly holding: boolean;
  readonly holdCount: number;
  readonly clearedCount: number;
}

export interface SignalRoomScene {
  readonly mode: "quiet" | "active";
  readonly stations: readonly SceneStation[];
  readonly conduits: readonly SceneConduit[];
  readonly calibration: CalibrationRing;
  readonly gate: GateState;
  /** Honest screen-reader / caption summary of the live state. */
  readonly summary: string;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/** Non-negative integer count from any input (NaN/negatives → 0). */
function safeCount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

/** Map a real count to a visible particle count, capped for legibility. */
function flowFor(count: number, active: boolean): number {
  if (!active) return 0;
  const n = safeCount(count);
  if (n === 0) return 0;
  return Math.min(MAX_FLOW, n);
}

/** Station glow from its count: a faint floor + a saturating ramp. */
function intensityFor(count: number, scale: number): number {
  const n = safeCount(count);
  if (n === 0) return BASE_INTENSITY;
  return clamp01(BASE_INTENSITY + (1 - BASE_INTENSITY) * Math.min(1, n / scale));
}

/**
 * Build the deterministic Signal Room scene from real pipeline telemetry.
 * Same input always yields the same scene; no randomness, no time, no I/O.
 */
export function buildSignalRoomScene(input: SignalRoomInput): SignalRoomScene {
  const sources = safeCount(input.sources);
  const scoring = safeCount(input.scoring);
  const published = safeCount(input.published);
  const gated = safeCount(input.gated);
  const sample = safeCount(input.calibrationSample);
  const floor = Math.max(1, safeCount(input.calibrationFloor) || PUBLIC_CALIBRATION_FLOOR);

  // The room is "active" only when there are real live rows to move. Otherwise
  // it is honestly quiet — present, glowing faintly, but not in motion.
  const active = scoring + published + gated > 0;

  const stations: readonly SceneStation[] = [
    { id: "source-mesh", label: "Source mesh", x: 0.06, y: 0.5, intensity: intensityFor(sources, 8), count: sources },
    { id: "evidence", label: "Evidence", x: 0.27, y: 0.5, intensity: intensityFor(scoring, 6), count: scoring },
    { id: "decision-core", label: "Decision core", x: 0.5, y: 0.5, intensity: intensityFor(scoring, 5), count: scoring },
    { id: "market-gravity", label: "Market gravity", x: 0.5, y: 0.16, intensity: intensityFor(scoring, 6), count: -1 },
    { id: "calibration", label: "Calibration", x: 0.5, y: 0.84, intensity: clamp01(BASE_INTENSITY + (1 - BASE_INTENSITY) * clamp01(sample / floor)), count: sample },
    { id: "no-bet-gate", label: "No-bet gate", x: 0.74, y: 0.5, intensity: gated > 0 ? 0.85 : intensityFor(scoring, 5), count: gated },
    { id: "board", label: "Board", x: 0.94, y: 0.5, intensity: intensityFor(published, 4), count: published },
  ];

  const conduits: readonly SceneConduit[] = [
    { from: "source-mesh", to: "evidence", tone: "intake", flow: flowFor(sources, active), load: sources },
    { from: "evidence", to: "decision-core", tone: "signal", flow: flowFor(scoring, active), load: scoring },
    { from: "market-gravity", to: "decision-core", tone: "gravity", flow: flowFor(scoring, active), load: scoring },
    { from: "decision-core", to: "calibration", tone: "verify", flow: flowFor(scoring, active), load: scoring },
    { from: "decision-core", to: "no-bet-gate", tone: "signal", flow: flowFor(scoring, active), load: scoring },
    { from: "no-bet-gate", to: "board", tone: "verify", flow: flowFor(published, active), load: published },
  ];

  const calibration: CalibrationRing = {
    sample,
    floor,
    fraction: clamp01(sample / floor),
    ready: sample >= floor,
  };

  const gate: GateState = {
    holding: gated > 0,
    holdCount: gated,
    clearedCount: published,
  };

  const summary = active
    ? `Signal Room live: ${scoring} scoring, ${published} cleared to the board, ${gated} held at the no-bet gate. ` +
      `${sources} intake lanes online; calibration sample ${sample} of ${floor}.`
    : `Signal Room on standby. ${sources} intake lanes online; no live scoring, no public rows, and nothing held ` +
      `at the no-bet gate. Calibration sample ${sample} of ${floor}.`;

  return {
    mode: active ? "active" : "quiet",
    stations,
    conduits,
    calibration,
    gate,
    summary,
  };
}
