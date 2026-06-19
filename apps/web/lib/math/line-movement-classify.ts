/**
 * Line movement classifier — pure math, zero dependencies.
 *
 * Classifies a sequence of odds/line snapshots into movement types:
 * SHARP (professional/sharp money), STEAM (syndicate/coordinated move),
 * NOISE (random/public fluctuation), REVERSE (line moved against heavy public).
 *
 * Pattern derived from machina-sports/sports-skills (MIT, github.com/machina-sports/sports-skills).
 * Re-implemented TS-native with no npm dependencies.
 */

export type LineMovementType =
  | "SHARP"   // Significant move against public sentiment — sharp/professional money
  | "STEAM"   // Rapid multi-book move in same direction — syndicate trigger
  | "NOISE"   // Small fluctuation, no clear signal
  | "REVERSE" // Line moved opposite to public betting percentage
  | "STABLE"  // No meaningful movement
  | "UNKNOWN"; // Insufficient data

export interface LineSnapshot {
  /** Unix timestamp in milliseconds */
  readonly timestampMs: number;
  /** American odds or spread value */
  readonly value: number;
  /** Optional: 0–100 public betting percentage on this side (if available) */
  readonly publicPct?: number;
  /** Optional: number of books showing this line (for steam detection) */
  readonly bookCount?: number;
}

export interface LineMovementResult {
  readonly type: LineMovementType;
  /** Net movement from first to last snapshot (positive = line moved up) */
  readonly netMove: number;
  /** Absolute magnitude of the total move */
  readonly magnitude: number;
  /** Move speed: magnitude / hours elapsed */
  readonly speedPerHour: number;
  /** True when multiple books moved in the same direction rapidly */
  readonly isSteam: boolean;
  /** True when the line moved opposite to public pct direction */
  readonly isReverse: boolean;
  /** Confidence in the classification (0–1) */
  readonly confidence: number;
  /** Human-readable explanation */
  readonly reason: string;
}

/** Classify thresholds */
const SHARP_MIN_MOVE = 1.5;   // minimum spread/line move to be "sharp"
const STEAM_MIN_SPEED = 0.5;  // minimum points per hour
const STEAM_MIN_BOOKS = 3;    // minimum book count for steam
const NOISE_MAX_MOVE = 0.5;   // max move to be classified as noise

/**
 * Classify a sequence of line snapshots.
 *
 * Requires at least 2 snapshots. Returns UNKNOWN for insufficient data.
 * Never throws.
 */
export function classifyLineMovement(snapshots: readonly LineSnapshot[]): LineMovementResult {
  if (snapshots.length < 2) {
    return {
      type: "UNKNOWN",
      netMove: 0,
      magnitude: 0,
      speedPerHour: 0,
      isSteam: false,
      isReverse: false,
      confidence: 0.3,
      reason: "Insufficient data: at least 2 snapshots required.",
    };
  }

  // Length checked above (>= 2), so these are always defined.
  // Explicit assertion needed for TypeScript strict noUncheckedIndexedAccess.
  const first = snapshots[0] as LineSnapshot;
  const last = snapshots[snapshots.length - 1] as LineSnapshot;

  const netMove = last.value - first.value;
  const magnitude = Math.abs(netMove);
  const elapsedMs = last.timestampMs - first.timestampMs;
  const elapsedHours = elapsedMs > 0 ? elapsedMs / (1000 * 60 * 60) : 0;
  const speedPerHour = elapsedHours > 0 ? magnitude / elapsedHours : 0;

  // STABLE: no meaningful movement
  if (magnitude < 0.25) {
    return {
      type: "STABLE",
      netMove,
      magnitude,
      speedPerHour,
      isSteam: false,
      isReverse: false,
      confidence: 0.3,
      reason: `Magnitude ${magnitude.toFixed(3)} is below the stable threshold (0.25). No meaningful movement.`,
    };
  }

  // Determine directional consistency: what fraction of inter-snapshot moves are
  // in the same direction as the net move?
  const moves: number[] = [];
  for (let i = 1; i < snapshots.length; i++) {
    const cur = snapshots[i] as LineSnapshot;
    const prev = snapshots[i - 1] as LineSnapshot;
    moves.push(cur.value - prev.value);
  }
  const netDirection = netMove >= 0 ? 1 : -1;
  const sameDirectionCount = moves.filter((m) => m !== 0 && (m > 0 ? 1 : -1) === netDirection).length;
  const nonZeroMoves = moves.filter((m) => m !== 0).length;
  const consistencyRatio = nonZeroMoves > 0 ? sameDirectionCount / nonZeroMoves : 0;

  // Steam detection: fast and/or multi-book coordinated move
  const elapsedMinutes = elapsedMs > 0 ? elapsedMs / (1000 * 60) : 0;
  const maxBookCount = snapshots.reduce<number>((max, s) => {
    return s.bookCount !== undefined && s.bookCount > max ? s.bookCount : max;
  }, 0);
  const isSteam =
    magnitude >= NOISE_MAX_MOVE &&
    (speedPerHour >= STEAM_MIN_SPEED || elapsedMinutes < 30) &&
    (maxBookCount >= STEAM_MIN_BOOKS || elapsedMinutes < 30);

  // Reverse line movement: line moved against the dominant public side.
  // Requires publicPct data. If public > 60% on this side and line went up
  // (i.e., makes that side less attractive to bet), that is not reverse.
  // REVERSE means: public > 60% BETTING on a side but the line moved AGAINST them
  // (books moved the number to make the public side more expensive / less attractive).
  // We detect this by checking if public is on the side that should push the line
  // in one direction, but the line went the opposite way.
  // Convention: publicPct > 60 means most public money is ON this side.
  // If line went UP (spread went up, making this side cost more), that is sharp
  // counter-movement (reverse). If publicPct < 40 but line went DOWN, also reverse.
  const lastPublicPct: number | undefined = last.publicPct ?? first.publicPct;
  let isReverse = false;
  if (lastPublicPct !== undefined) {
    // Public is heavily on this side (>60%) but line moved up (books shading against public)
    const publicHeavy = lastPublicPct > 60;
    const lineMovedAgainstPublic = publicHeavy && netMove > 0;
    // Public is avoiding this side (<40%) but line moved down (books shading toward the avoided side)
    const publicLight = lastPublicPct < 40;
    const lineMovedTowardLight = publicLight && netMove < 0;
    isReverse = lineMovedAgainstPublic || lineMovedTowardLight;
  }

  // STEAM takes priority: rapid coordinated multi-book move
  if (isSteam) {
    const bookNote = maxBookCount >= STEAM_MIN_BOOKS ? ` across ${maxBookCount} books` : "";
    const speedNote = elapsedMinutes < 30 ? ` within ${elapsedMinutes.toFixed(0)} min` : ` at ${speedPerHour.toFixed(2)} pts/hr`;
    return {
      type: "STEAM",
      netMove,
      magnitude,
      speedPerHour,
      isSteam: true,
      isReverse,
      confidence: 0.9,
      reason: `Steam move: ${magnitude.toFixed(2)} pts${bookNote}${speedNote}. Coordinated syndicate signal.`,
    };
  }

  // NOISE: small move, no steam signal
  if (magnitude < NOISE_MAX_MOVE) {
    return {
      type: "NOISE",
      netMove,
      magnitude,
      speedPerHour,
      isSteam: false,
      isReverse,
      confidence: 0.5,
      reason: `Magnitude ${magnitude.toFixed(3)} is below noise threshold (${NOISE_MAX_MOVE}). No clear signal.`,
    };
  }

  // REVERSE: public heavily on one side, line went against them
  if (isReverse) {
    return {
      type: "REVERSE",
      netMove,
      magnitude,
      speedPerHour,
      isSteam: false,
      isReverse: true,
      confidence: 0.7,
      reason: `Reverse line movement: public at ${lastPublicPct?.toFixed(0) ?? "?"}% but line moved ${netMove > 0 ? "up" : "down"} by ${magnitude.toFixed(2)} pts against public side.`,
    };
  }

  // SHARP: significant move in a consistent direction
  if (magnitude >= SHARP_MIN_MOVE && consistencyRatio >= 0.8) {
    return {
      type: "SHARP",
      netMove,
      magnitude,
      speedPerHour,
      isSteam: false,
      isReverse: false,
      confidence: 0.8,
      reason: `Sharp move: ${magnitude.toFixed(2)} pts with ${(consistencyRatio * 100).toFixed(0)}% directional consistency. Professional money signal.`,
    };
  }

  // Fallback: meaningful move but not definitively classifiable — treat as NOISE
  return {
    type: "NOISE",
    netMove,
    magnitude,
    speedPerHour,
    isSteam: false,
    isReverse,
    confidence: 0.5,
    reason: `Move of ${magnitude.toFixed(2)} pts (consistency: ${(consistencyRatio * 100).toFixed(0)}%) does not meet SHARP/STEAM/REVERSE criteria.`,
  };
}

/**
 * Quick helper: given just an open and current value, classify the basic movement.
 */
export function classifySimpleMove(open: number, current: number, hoursElapsed: number): LineMovementResult {
  const snapshots: LineSnapshot[] = [
    { timestampMs: 0, value: open },
    { timestampMs: hoursElapsed * 60 * 60 * 1000, value: current },
  ];
  return classifyLineMovement(snapshots);
}
