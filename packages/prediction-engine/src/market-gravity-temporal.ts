/**
 * Market Gravity Temporal — the TEMPORAL read of market gravity over a
 * chronological series of odds snapshots (Workstream-K "K2").
 *
 * WHAT THIS IS
 * The existing `marketGravityIndex` (market-read.ts) is POINT-IN-TIME: it reads
 * the current consensus and reports how strongly the market pulls toward one side
 * RIGHT NOW. This module is the TEMPORAL companion: it takes an ordered series of
 * snapshots — each carrying a de-vigged fair P(home), cross-book dispersion, and
 * book count — and describes HOW the market moved from open to close: was it a
 * straight steam? Choppy indecision? A drift? Efficient or meandering?
 *
 * WHY IT IS INERT (WEIGHT 0)
 * This is a shadow decision-support module: weight 0, inert, READ-ONLY over stored
 * odds history. It does NOT score, gate, tier, or price anything, and it is NOT
 * imported by scoring.ts or any live path. Its trajectory labels are HYPOTHESES
 * about the pattern of line movement, never certainties or published claims. The
 * module exists so the temporal analysis logic is written, tested, and ready the
 * day the No-Bet Ledger, the autopsy pipeline, and the CLV validator all confirm
 * a real signal (the K3 data gate).
 *
 * THE HONESTY INVARIANT
 * Measuring market movement answers "did the market move and how?" — it does NOT
 * answer "was the market right?" A "steaming" label is an observation about the
 * pattern, not a recommendation. Strong line movement against our read is a reason
 * to investigate, never a mechanical override. With fewer than two snapshots the
 * module self-suppresses honestly rather than returning a misleading read.
 *
 * Pure functions, no I/O, no clock. All timestamps must be passed in (epoch ms).
 * All probabilities in [0, 1].
 */

export interface GravitySnapshot {
  /** Epoch milliseconds — passed in, never read from Date.now() or the system clock. */
  readonly timestampMs: number;
  /** De-vigged consensus fair P(home) for this snapshot, in [0, 1]. */
  readonly fairHomeProb: number;
  /**
   * Cross-book mean absolute deviation of de-vigged P(home) values, in [0, 1].
   * Captures book disagreement at this point in time.
   */
  readonly homeProbDispersion: number;
  /** Number of books quoted in this snapshot (used to contextualise dispersion). */
  readonly bookCount: number;
}

/** Direction label for the dispersion trend across the series. */
export type DispersionTrend = "converging" | "diverging" | "flat";

/**
 * The trajectory label: a summary of the shape of line movement over time.
 *
 *   steaming  — large, directional, efficient move (sharp action or public flood).
 *   chopping  — high reversals or low efficiency; the market is uncertain / undecided.
 *   drifting  — slow directional lean; a modest, sustained tilt.
 *   stable    — very little movement; the market has not moved meaningfully.
 *   mixed     — some movement, moderate efficiency; no dominant pattern.
 *
 * These are OBSERVATIONAL labels about the movement's SHAPE, not forecasts of
 * which side wins or whether the movement reflects superior information.
 */
export type MarketTrajectoryLabel = "steaming" | "chopping" | "drifting" | "stable" | "mixed";

/** Which side the net movement favoured. "none" when movement is within the deadband. */
export type MarketSide = "home" | "away" | "none";

export interface MarketGravityTrajectory {
  /**
   * Weight is always 0. This module is the shadow temporal companion to
   * marketGravityIndex — decision-support only, never priced into live confidence.
   */
  readonly weight: 0;

  /** Number of snapshots supplied (including any after sorting). */
  readonly snapshotCount: number;

  /**
   * Net signed change in fairHomeProb from the first to the last snapshot.
   * Positive = movement toward home; negative = movement toward away.
   * 0 when fewer than 2 snapshots.
   */
  readonly netMove: number;

  /**
   * Total path length: sum of absolute step-to-step changes in fairHomeProb.
   * Captures how much total ground the market covered, regardless of direction.
   * 0 when fewer than 2 snapshots.
   */
  readonly pathLength: number;

  /**
   * Efficiency of the move: |netMove| / pathLength in [0, 1].
   * 1.0 = perfectly straight steam (no retracing); near 0 = very choppy.
   * null when pathLength is 0 (no movement → efficiency is undefined).
   */
  readonly efficiency: number | null;

  /**
   * Count of sign changes in consecutive step deltas (ignoring zero-delta steps).
   * A high reversal count is the defining signature of a "chopping" market.
   * 0 when fewer than 2 snapshots.
   */
  readonly reversals: number;

  /**
   * Rate of net movement per elapsed hour (signed, same sign as netMove).
   * null when fewer than 2 snapshots or when elapsed time is 0.
   */
  readonly velocityPerHour: number | null;

  /**
   * Whether cross-book dispersion broadly converged, diverged, or stayed flat
   * across the series. "converging" = books agreed more by the end (sharps aligned);
   * "diverging" = books disagreed more (market uncertainty grew).
   * Based on (lastDispersion − firstDispersion) with a 0.005 deadband.
   */
  readonly dispersionTrend: DispersionTrend;

  /** The summary trajectory label for the shape of movement. See type docs above. */
  readonly trajectory: MarketTrajectoryLabel;

  /**
   * Which side the net movement favoured (home / away / none).
   * "none" when |netMove| is within the NET_MOVE_SIDE_DEADBAND (0.005).
   */
  readonly side: MarketSide;

  /**
   * Honest caveats about what this module measures and what it cannot tell us.
   * Always non-empty; always present regardless of the trajectory label.
   */
  readonly notes: readonly string[];
}

// ── Named thresholds (documented so they are tunable and auditable) ──

/** Minimum |netMove| for a "steaming" trajectory (probability points). */
export const STEAM_MIN_NET_MOVE = 0.04;
/** Minimum efficiency (|net|/path) for a "steaming" trajectory. */
export const STEAM_MIN_EFFICIENCY = 0.7;
/** Minimum path length before "chopping" diagnosis is considered. */
export const CHOP_MIN_PATH_LENGTH = 0.04;
/** Maximum efficiency (with sufficient path) for a "chopping" diagnosis. */
export const CHOP_MAX_EFFICIENCY = 0.4;
/** Minimum reversal count for a "chopping" diagnosis (regardless of efficiency). */
export const CHOP_MIN_REVERSALS = 3;
/** Lower bound of |netMove| for a "drifting" trajectory. */
export const DRIFT_NET_MOVE_MIN = 0.01;
/** Upper bound (exclusive) of |netMove| for a "drifting" trajectory. */
export const DRIFT_NET_MOVE_MAX = 0.04;
/** Maximum path length for a "stable" trajectory (very little movement). */
export const STABLE_MAX_PATH_LENGTH = 0.01;
/**
 * Deadband on (lastDispersion − firstDispersion) before reading a dispersion trend.
 * Prevents noisy ±0 changes from being labelled "converging" or "diverging".
 */
export const DISPERSION_TREND_DEADBAND = 0.005;
/** Deadband on netMove before assigning a side. Below this → "none". */
export const NET_MOVE_SIDE_DEADBAND = 0.005;

const STANDARD_NOTES: readonly string[] = [
  "Measures market movement pattern, not whether the market is right.",
  "A steaming or drifting label is an observation about the shape of movement; it does not confirm sharps are on the correct side.",
  "Trajectory labels are hypotheses derived from aggregated book prices — they require downstream validation against settled outcomes and CLV.",
  "Dispersion trends describe book agreement patterns only; convergence does not imply the consensus is accurate.",
];

const INSUFFICIENT_NOTES: readonly string[] = [
  "Fewer than 2 snapshots supplied — temporal analysis is not possible; all movement fields are zero/null.",
  ...STANDARD_NOTES,
];

/**
 * Compute the temporal trajectory of market gravity over an ordered series of
 * odds snapshots. Snapshots are sorted by timestampMs ascending (defensive sort).
 *
 * With fewer than 2 snapshots the function self-suppresses honestly: trajectory is
 * "stable", side is "none", all movement metrics are 0/null, and a note explains
 * the suppression. This is a HYPOTHESIS about movement patterns — never a certainty.
 */
export function marketGravityTrajectory(
  snapshots: readonly GravitySnapshot[],
): MarketGravityTrajectory {
  // ── Self-suppress honestly when there is no usable series ──
  if (snapshots.length < 2) {
    return {
      weight: 0,
      snapshotCount: snapshots.length,
      netMove: 0,
      pathLength: 0,
      efficiency: null,
      reversals: 0,
      velocityPerHour: null,
      dispersionTrend: "flat",
      trajectory: "stable",
      side: "none",
      notes: INSUFFICIENT_NOTES,
    };
  }

  // Defensive sort: caller should supply chronological order but we enforce it.
  const sorted = [...snapshots].sort((a, b) => a.timestampMs - b.timestampMs);

  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;

  // ── Net move (signed: positive = toward home) ──
  const netMove = last.fairHomeProb - first.fairHomeProb;

  // ── Path length (total distance traveled) ──
  let pathLength = 0;
  const deltas: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const delta = sorted[i]!.fairHomeProb - sorted[i - 1]!.fairHomeProb;
    deltas.push(delta);
    pathLength += Math.abs(delta);
  }

  // ── Efficiency ──
  const efficiency = pathLength > 0 ? Math.abs(netMove) / pathLength : null;

  // ── Reversals: sign changes in consecutive non-zero deltas ──
  let reversals = 0;
  const nonZeroDeltas = deltas.filter((d) => d !== 0);
  for (let i = 1; i < nonZeroDeltas.length; i++) {
    const prev = nonZeroDeltas[i - 1]!;
    const curr = nonZeroDeltas[i]!;
    if ((prev > 0 && curr < 0) || (prev < 0 && curr > 0)) {
      reversals++;
    }
  }

  // ── Velocity per hour ──
  const elapsedMs = last.timestampMs - first.timestampMs;
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const velocityPerHour = elapsedHours > 0 ? netMove / elapsedHours : null;

  // ── Dispersion trend (sign of lastDispersion − firstDispersion, with deadband) ──
  const dispersionDelta = last.homeProbDispersion - first.homeProbDispersion;
  const dispersionTrend: DispersionTrend =
    dispersionDelta < -DISPERSION_TREND_DEADBAND
      ? "converging"
      : dispersionDelta > DISPERSION_TREND_DEADBAND
        ? "diverging"
        : "flat";

  // ── Trajectory label (priority order, most specific first) ──
  const absNetMove = Math.abs(netMove);
  let trajectory: MarketTrajectoryLabel;

  if (absNetMove >= STEAM_MIN_NET_MOVE && (efficiency ?? 0) >= STEAM_MIN_EFFICIENCY) {
    // Large, directional, efficient move — consistent with steam.
    trajectory = "steaming";
  } else if (
    reversals >= CHOP_MIN_REVERSALS ||
    ((efficiency ?? 1) < CHOP_MAX_EFFICIENCY && pathLength >= CHOP_MIN_PATH_LENGTH)
  ) {
    // High reversals OR low-efficiency meaningful movement — consistent with chop.
    trajectory = "chopping";
  } else if (absNetMove >= DRIFT_NET_MOVE_MIN && absNetMove < DRIFT_NET_MOVE_MAX) {
    // Slow directional lean — a sustained but modest tilt.
    trajectory = "drifting";
  } else if (pathLength < STABLE_MAX_PATH_LENGTH) {
    // Very little movement of any kind.
    trajectory = "stable";
  } else {
    // Some movement, no dominant pattern.
    trajectory = "mixed";
  }

  // ── Side ──
  const side: MarketSide =
    Math.abs(netMove) < NET_MOVE_SIDE_DEADBAND ? "none" : netMove > 0 ? "home" : "away";

  return {
    weight: 0,
    snapshotCount: sorted.length,
    netMove,
    pathLength,
    efficiency,
    reversals,
    velocityPerHour,
    dispersionTrend,
    trajectory,
    side,
    notes: STANDARD_NOTES,
  };
}
