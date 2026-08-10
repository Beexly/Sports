// ============================================================
// Hawkes-process "steam move" detector (v1.0.0)
//
// Monitors a live stream of timestamped odds-movement events and reports
// a self-exciting intensity estimate for "sharp money" activity, plus
// whether a STEAM MOVE — a sudden burst of same-direction line movement
// consistent with coordinated sharp betting — is happening right now.
//
// THE MATH — univariate Hawkes self-exciting intensity:
//
//     intensity(t) = mu + alpha * sum_over_recent_events( exp(-beta * (t - event.timestamp) / 1000) )
//
// where:
//   mu    = baseline ("background") intensity — the ordinary rate of odds
//           movement absent any clustering, in events/second
//   alpha = self-excitation strength — how much each past event adds to
//           the current intensity, before decay
//   beta  = decay rate (1/second) — how fast a past event's contribution
//           fades; the model gives *every* prior event nonzero influence,
//           weighted by how recently it fired, which is exactly the
//           "recent activity begets more activity" dynamic a steam move
//           exhibits: a handful of sharp bets in quick succession push the
//           intensity estimate well above its baseline until the burst
//           passes and decay pulls it back down.
//
// A steam move is flagged when the live intensity clears a multiple of
// baseline (steamMultiplier, default 3x) — i.e. the market is moving
// meaningfully faster than its ordinary background rate. Direction (which
// side the money is on) is a separate, short-window read: it only asks
// "of the events in the last `directionWindowMs`, were more of them on
// home or away?" — ties (including zero events, which cannot happen
// while steamDetected is true but is handled defensively anyway) resolve
// to null rather than defaulting to either side.
//
// This is a MONITORING SIGNAL, not a pick or a recommendation. It informs
// how quickly the platform re-evaluates a line, not whether to bet it —
// consistent with this package's broader "structured data is source of
// truth, AI/heuristics assist" posture.
//
// References:
//   - Hawkes, A. G. (1971). "Spectra of some self-exciting and mutually
//     exciting point processes." Biometrika, 58(1), 83-90. The original
//     self-exciting point process this module implements directly.
//   - Bacry, E., Mastromatteo, I., & Muzy, J. F. (2015). "Hawkes
//     processes in finance." Market Microstructure and Liquidity, 1(01).
//     Establishes Hawkes intensity as the standard tool for detecting
//     self-exciting bursts of order-flow activity in financial markets —
//     the same "burst detection" role this module plays for line moves.
//   - "Steam move" / sharp-money burst detection via clustered,
//     same-direction line movement in a short window is standard
//     practice in the sports-betting market-monitoring literature and
//     among professional handicappers; a Hawkes intensity estimate is a
//     principled, well-studied way to quantify "is activity clustering
//     right now" rather than relying on a fixed event-count threshold.
//
// STABILITY NOTE: the default alpha/beta are chosen with branching ratio
// alpha/beta < 1 (0.12/0.15 = 0.8), which keeps the process sub-critical
// in the classical Hawkes sense — a burst of activity decays back toward
// baseline rather than being able to sustain itself indefinitely.
// ============================================================

/**
 * Baseline ("background") intensity mu, in events per second, when no
 * self-excitation is present. This is the long-run average rate of
 * ordinary (non-steam) odds-movement events for a typical market — an
 * illustrative default, not calibrated against any specific book's
 * historical event log. Callers with real settled steam-move history
 * should recalibrate via backtest, matching the calibration ethos used
 * elsewhere in this package (see the calibration/* modules).
 */
export const DEFAULT_MU = 0.1;

/**
 * Self-excitation strength alpha: how much each past event adds to the
 * current intensity, before decay. Kept below beta (branching ratio
 * alpha/beta = 0.8 < 1) so the process is sub-critical / stationary in
 * the classical Hawkes sense (Hawkes, 1971) — a burst decays back to
 * baseline instead of being able to sustain or explode without bound.
 * Also chosen so a SINGLE isolated event can never clear the default
 * steam threshold: mu + alpha (the max possible intensity contribution
 * from one event, at zero elapsed time) is 0.22, comfortably under
 * DEFAULT_MU * DEFAULT_STEAM_MULTIPLIER = 0.3.
 */
export const DEFAULT_ALPHA = 0.12;

/**
 * Exponential decay rate beta, in units of 1/second, applied to each past
 * event's contribution to intensity. 1/beta ~= 6.7s is the time constant;
 * an event's influence on current intensity roughly halves every
 * ln(2)/beta ~= 4.6 seconds. Tuned so a "burst" must be several events
 * within single-digit seconds of each other to register as steam, not a
 * slow drift over minutes.
 */
export const DEFAULT_BETA = 0.15;

/**
 * A steam move is flagged when intensity(t) exceeds mu * this multiplier.
 * Default 3x baseline. With the default mu/alpha above, one isolated
 * event tops out at mu + alpha = 0.22, still under mu * 3 = 0.3 — so a
 * single event can never produce a false positive.
 */
export const DEFAULT_STEAM_MULTIPLIER = 3;

/**
 * How long an event stays in the detector's internal buffer before it is
 * pruned, in ms. Default 1 hour (3_600_000ms). Bounds memory in a
 * long-running process; events older than this no longer contribute to
 * intensity or direction, regardless of what the decay math alone would
 * say (exp(-beta*t) never hits exactly zero, so pruning is what actually
 * keeps the buffer — and the computation over it — bounded).
 */
export const DEFAULT_WINDOW_MS = 3_600_000;

/**
 * Window (ms) used ONLY for the home-vs-away tie-break that decides
 * `direction` once steam has already been detected. Default 60 seconds —
 * short enough to reflect the CURRENT burst rather than the full
 * hour-long event buffer.
 */
export const DEFAULT_DIRECTION_WINDOW_MS = 60_000;

/**
 * A single timestamped odds-movement observation fed into the detector.
 */
export interface OddsEvent {
  /** Event time, in ms since epoch (i.e. `Date.now()` units). */
  timestamp: number;
  /** Which side of the market this movement was on. */
  side: "home" | "away";
  /**
   * Signed implied-probability change caused by this event (e.g. +0.02
   * means the side's implied win probability rose 2 points). The sign
   * itself is not used for direction — `side` is — but callers may use
   * it downstream for magnitude-weighted analysis.
   */
  impliedProbDelta: number;
}

/**
 * The detector's current read on the market, as of the most recent call.
 */
export interface SteamSignal {
  /** Current self-exciting intensity estimate, intensity(t) from the Hawkes formula above. */
  intensity: number;
  /** True when intensity has cleared mu * steamMultiplier — a burst is in progress. */
  steamDetected: boolean;
  /**
   * Which side the burst favors, computed only when steamDetected is
   * true by comparing home vs. away event counts within
   * directionWindowMs. null when steam is not detected, when the
   * home/away split is tied, or when there are no events in the
   * direction window (ties never silently resolve to 'home').
   */
  direction: "home" | "away" | null;
}

/**
 * Constructor options for {@link HawkesSteamDetector}. Every field is
 * optional; anything omitted, non-finite, or out of its valid range
 * silently falls back to its documented default rather than throwing —
 * this module never throws on bad input.
 */
export interface HawkesSteamDetectorOptions {
  /** Baseline intensity. Must be finite and >= 0, else falls back to {@link DEFAULT_MU}. */
  mu?: number;
  /** Self-excitation strength. Must be finite and >= 0, else falls back to {@link DEFAULT_ALPHA}. */
  alpha?: number;
  /** Decay rate (1/second). Must be finite and > 0 (a non-positive decay rate is undefined), else falls back to {@link DEFAULT_BETA}. */
  beta?: number;
  /** Steam threshold multiplier on mu. Must be finite and > 0, else falls back to {@link DEFAULT_STEAM_MULTIPLIER}. */
  steamMultiplier?: number;
  /** Event buffer retention window, ms. Must be finite and > 0, else falls back to {@link DEFAULT_WINDOW_MS}. */
  windowMs?: number;
  /** Direction tie-break window, ms. Must be finite and > 0, else falls back to {@link DEFAULT_DIRECTION_WINDOW_MS}. */
  directionWindowMs?: number;
}

// ============================================================
// Internal guards. Fail-closed patterns throughout: `!(x > 0)` /
// `!(x >= 0)` rather than `x <= 0` so a NaN option can never sneak past
// as "valid" (NaN <= 0 is false, which would fail OPEN; !(NaN > 0) is
// true, which fails CLOSED to the safe default).
// ============================================================

function sanitizeNonNegativeOption(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value) || !(value >= 0)) return fallback;
  return value;
}

function sanitizePositiveOption(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value) || !(value > 0)) return fallback;
  return value;
}

/** Runtime validity check — guards against JS callers bypassing the OddsEvent type at compile time. */
function isValidOddsEvent(event: unknown): event is OddsEvent {
  if (typeof event !== "object" || event === null) return false;
  const candidate = event as Partial<OddsEvent>;
  return (
    Number.isFinite(candidate.timestamp) &&
    Number.isFinite(candidate.impliedProbDelta) &&
    (candidate.side === "home" || candidate.side === "away")
  );
}

// ============================================================
// Pure math helpers — exported individually so they can be tested and
// reused without going through the class.
// ============================================================

/**
 * The Hawkes self-exciting intensity at time `now`, given a set of past
 * events (see the module banner for the formula). Elapsed time for any
 * event is clamped to >= 0 before decay is applied, so a bogus
 * future-dated event (timestamp > now) can never blow up the exponential
 * term with a negative exponent — it simply contributes its maximum,
 * exp(0) = 1, same as an event at exactly `now`.
 *
 * Pure and total: never throws, never returns NaN/Infinity for finite
 * mu/alpha/beta and a finite `now` (each term is a bounded exponential in
 * (0, 1] scaled by finite alpha, summed over a finite array).
 */
export function hawkesIntensity(
  events: readonly OddsEvent[],
  now: number,
  mu: number,
  alpha: number,
  beta: number
): number {
  if (!Number.isFinite(now)) return mu;
  let excitation = 0;
  for (const event of events) {
    const elapsedMs = now - event.timestamp;
    const elapsedSec = Math.max(0, elapsedMs) / 1000;
    excitation += Math.exp(-beta * elapsedSec);
  }
  return mu + alpha * excitation;
}

/**
 * Resolves which side a burst favors by comparing home vs. away event
 * counts within `directionWindowMs` of `now`. Returns null — never a
 * defaulted side — when the split is tied (0-0 included) so a caller can
 * never mistake "no clear direction" for "home".
 */
export function resolveSteamDirection(
  events: readonly OddsEvent[],
  now: number,
  directionWindowMs: number
): "home" | "away" | null {
  let homeCount = 0;
  let awayCount = 0;
  for (const event of events) {
    const age = now - event.timestamp;
    if (age < 0 || age > directionWindowMs) continue;
    if (event.side === "home") homeCount++;
    else awayCount++;
  }
  if (homeCount === awayCount) return null;
  return homeCount > awayCount ? "home" : "away";
}

// ============================================================
// The detector itself.
//
// Holds a bounded, time-pruned buffer of valid events and recomputes the
// Hawkes intensity fresh on every call — there is no incremental/online
// approximation here, deliberately: with the buffer pruned to windowMs
// and no more than a live game's worth of odds movements in play, a full
// recompute is cheap and keeps the implementation auditable (no drifting
// running-sum state to get subtly wrong over a long-lived process).
// ============================================================
export class HawkesSteamDetector {
  private readonly mu: number;
  private readonly alpha: number;
  private readonly beta: number;
  private readonly steamMultiplier: number;
  private readonly windowMs: number;
  private readonly directionWindowMs: number;

  private events: OddsEvent[] = [];

  constructor(options?: HawkesSteamDetectorOptions | null) {
    const opts = options ?? {};
    this.mu = sanitizeNonNegativeOption(opts.mu, DEFAULT_MU);
    this.alpha = sanitizeNonNegativeOption(opts.alpha, DEFAULT_ALPHA);
    this.beta = sanitizePositiveOption(opts.beta, DEFAULT_BETA);
    this.steamMultiplier = sanitizePositiveOption(opts.steamMultiplier, DEFAULT_STEAM_MULTIPLIER);
    this.windowMs = sanitizePositiveOption(opts.windowMs, DEFAULT_WINDOW_MS);
    this.directionWindowMs = sanitizePositiveOption(opts.directionWindowMs, DEFAULT_DIRECTION_WINDOW_MS);
  }

  /**
   * Ingest one odds event and return the updated steam signal.
   *
   * `now` is an optional override of the "current time" used for decay
   * and pruning math, defaulting to `Date.now()` only when omitted — pass
   * it explicitly in tests for deterministic, non-flaky assertions.
   *
   * GUARD: an event with a non-finite timestamp/impliedProbDelta or an
   * invalid `side` is dropped — it is never pushed into internal state.
   * The signal returned in that case is recomputed from the existing
   * (unchanged) valid-event buffer at `now`, so one garbage event can
   * never corrupt the detector or spike its intensity.
   */
  processEvent(event: OddsEvent, now: number = Date.now()): SteamSignal {
    const safeNow = Number.isFinite(now) ? now : Date.now();

    if (isValidOddsEvent(event)) {
      this.events.push({
        timestamp: event.timestamp,
        side: event.side,
        impliedProbDelta: event.impliedProbDelta,
      });
    }
    // Malformed event: silently dropped, nothing pushed. Fall through to
    // recompute the signal from whatever valid events already exist.

    this.prune(safeNow);
    return this.computeSignal(safeNow);
  }

  /**
   * Read the current signal WITHOUT ingesting a new event — e.g. to poll
   * for decay as time passes, or to inspect the detector's state on an
   * empty stream. Still prunes the buffer against `now` first, so this
   * doubles as the "housekeeping tick" for a long-running process that
   * has gone quiet (no new events arriving to trigger pruning otherwise).
   * Not part of the minimal required interface, but a natural, harmless
   * addition — it mutates nothing but the (already-transient) pruned
   * buffer contents.
   */
  getSignal(now: number = Date.now()): SteamSignal {
    const safeNow = Number.isFinite(now) ? now : Date.now();
    this.prune(safeNow);
    return this.computeSignal(safeNow);
  }

  /** Number of valid events currently retained in the buffer (post-pruning as of the last call). */
  get bufferedEventCount(): number {
    return this.events.length;
  }

  private prune(now: number): void {
    if (this.events.length === 0) return;
    this.events = this.events.filter((e) => now - e.timestamp <= this.windowMs);
  }

  private computeSignal(now: number): SteamSignal {
    const intensity = hawkesIntensity(this.events, now, this.mu, this.alpha, this.beta);
    const threshold = this.mu * this.steamMultiplier;
    const steamDetected = intensity > threshold;
    const direction = steamDetected ? resolveSteamDirection(this.events, now, this.directionWindowMs) : null;
    return { intensity, steamDetected, direction };
  }
}
