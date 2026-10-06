// Adapted from saahilmanekar/snapshift (MIT) — methodology re-implemented for GSE.
/**
 * W6 — Win-probability event replay.
 *
 * Streams `{ t, wp }` after each game event using a supplied WP model,
 * and stress-tests the model against a reference WP series.
 *
 * COMPOSES WITH: V4 deterministic-replay (event stream, seeded RNG).
 */

import { seededRng } from "./deterministic-replay.js";

export interface WpEvent {
  /** Timestamp (ms or seconds — monotonic within a game). */
  readonly t: number;
  readonly eventId: string;
  readonly type: string;
  /** Margins, score, down, etc. — model-specific. */
  readonly data: Record<string, number | string | boolean | null>;
}

export interface WpPoint {
  readonly t: number;
  readonly eventId: string;
  readonly wp: number;
  readonly homeScore: number;
  readonly awayScore: number;
}

/**
 * WP model: given the event and running state, return home win probability.
 * Must return a value in [0,1]. Fail-closed models should return null →
 * the replay records NaN and counts the point as invalid.
 */
export type WpModelFn = (
  event: WpEvent,
  state: WpGameState,
) => number | null;

export interface WpGameState {
  readonly homeScore: number;
  readonly awayScore: number;
  readonly secondsElapsed: number;
  readonly completedEvents: number;
}

export interface ReplayGameResult {
  readonly gameId: string;
  readonly points: readonly WpPoint[];
  readonly invalidPoints: number;
  readonly finalWp: number | null;
}

/**
 * Stream `{ t, wp }` after each event. Score state is tracked from event data
 * (`homeScore` / `awayScore` fields when present). WP is evaluated after the
 * event is applied.
 */
export function replayGame(
  gameId: string,
  events: readonly WpEvent[],
  wpModel: WpModelFn,
): ReplayGameResult {
  if (!Array.isArray(events)) {
    throw new Error("replayGame: events must be an array");
  }

  let state: WpGameState = {
    homeScore: 0,
    awayScore: 0,
    secondsElapsed: 0,
    completedEvents: 0,
  };

  const points: WpPoint[] = [];
  let invalidPoints = 0;

  for (const e of events) {
    const homeScore =
      typeof e.data.homeScore === "number" && Number.isFinite(e.data.homeScore)
        ? e.data.homeScore
        : state.homeScore;
    const awayScore =
      typeof e.data.awayScore === "number" && Number.isFinite(e.data.awayScore)
        ? e.data.awayScore
        : state.awayScore;
    const secondsElapsed =
      typeof e.data.secondsElapsed === "number" && Number.isFinite(e.data.secondsElapsed)
        ? e.data.secondsElapsed
        : state.secondsElapsed;

    state = {
      homeScore,
      awayScore,
      secondsElapsed,
      completedEvents: state.completedEvents + 1,
    };

    const wp = wpModel(e, state);
    if (wp === null || !Number.isFinite(wp) || wp < 0 || wp > 1) {
      invalidPoints += 1;
      points.push({
        t: e.t,
        eventId: e.eventId,
        wp: Number.NaN,
        homeScore: state.homeScore,
        awayScore: state.awayScore,
      });
      continue;
    }

    points.push({
      t: e.t,
      eventId: e.eventId,
      wp: Number(wp.toFixed(6)),
      homeScore: state.homeScore,
      awayScore: state.awayScore,
    });
  }

  const valid = points.filter((p) => Number.isFinite(p.wp));
  return {
    gameId,
    points,
    invalidPoints,
    finalWp: valid.length > 0 ? valid[valid.length - 1]!.wp : null,
  };
}

export interface WpReferencePoint {
  readonly t: number;
  readonly wp: number;
}

export interface StressTestGameResult {
  readonly gameId: string;
  readonly maxAbsError: number;
  readonly meanAbsError: number;
  readonly pointsCompared: number;
  readonly pointsSkipped: number;
  /** Max error exceeds threshold. */
  readonly failed: boolean;
}

export interface StressTestResult {
  readonly games: readonly StressTestGameResult[];
  readonly globalMaxAbsError: number;
  readonly globalMeanAbsError: number;
  readonly allPassed: boolean;
  readonly threshold: number;
}

/**
 * Stress-test a WP model against a reference WP series (e.g., nflverse
 * win_probability). Reports max and mean absolute WP error per game.
 */
export function stressTest(
  wpModel: WpModelFn,
  gameSet: readonly {
    readonly gameId: string;
    readonly events: readonly WpEvent[];
    readonly reference: readonly WpReferencePoint[];
  }[],
  threshold = 0.08,
): StressTestResult {
  if (!Number.isFinite(threshold) || threshold <= 0) {
    throw new Error("stressTest: threshold must be a positive finite number");
  }

  const games: StressTestGameResult[] = [];
  let globalMax = 0;
  let globalSum = 0;
  let globalN = 0;

  for (const g of gameSet) {
    const replay = replayGame(g.gameId, g.events, wpModel);
    const byT = new Map(replay.points.map((p) => [p.t, p.wp]));

    let maxErr = 0;
    let sumErr = 0;
    let compared = 0;
    let skipped = 0;

    for (const ref of g.reference) {
      const modelWp = byT.get(ref.t);
      if (modelWp === undefined || !Number.isFinite(modelWp)) {
        skipped += 1;
        continue;
      }
      const err = Math.abs(modelWp - ref.wp);
      if (err > maxErr) maxErr = err;
      sumErr += err;
      compared += 1;
    }

    const meanErr = compared > 0 ? sumErr / compared : 0;
    if (maxErr > globalMax) globalMax = maxErr;
    globalSum += sumErr;
    globalN += compared;

    games.push({
      gameId: g.gameId,
      maxAbsError: Number(maxErr.toFixed(6)),
      meanAbsError: Number(meanErr.toFixed(6)),
      pointsCompared: compared,
      pointsSkipped: skipped,
      failed: maxErr > threshold,
    });
  }

  return {
    games,
    globalMaxAbsError: Number(globalMax.toFixed(6)),
    globalMeanAbsError: globalN > 0 ? Number((globalSum / globalN).toFixed(6)) : 0,
    allPassed: games.every((g) => !g.failed),
    threshold,
  };
}

/**
 * Simple baseline WP model: logistic on score margin and time remaining.
 * Useful as a reference/default and as a stress-test fixture.
 */
export function baselineWpModel(
  event: WpEvent,
  state: WpGameState,
): number | null {
  void event;
  const margin = state.homeScore - state.awayScore;
  // Full game assumed 3600 seconds (NFL regulation)
  const timeLeft = Math.max(0, 3600 - state.secondsElapsed);
  const timeFactor = Math.max(0.15, timeLeft / 3600);
  // Scale margin by remaining time — early leads matter less
  const z = (margin / 4.5) / timeFactor;
  return 1 / (1 + Math.exp(-z));
}

/**
 * Deterministic WP replay wrapper — uses V4 seededRng for any stochastic
 * model components. Same seed → identical WP stream.
 */
export function replayGameSeeded(
  gameId: string,
  events: readonly WpEvent[],
  stochasticModel: (
    event: WpEvent,
    state: WpGameState,
    rng: () => number,
  ) => number | null,
  seed: number,
): ReplayGameResult {
  const rng = seededRng(seed);
  return replayGame(gameId, events, (e, s) => stochasticModel(e, s, rng));
}
