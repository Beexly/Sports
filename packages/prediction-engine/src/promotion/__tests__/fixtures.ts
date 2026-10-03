/**
 * Shared test fixtures for the promotion module's test suite. Not itself a
 * test file (vitest.config.ts only picks up src/**\/*.test.ts), just
 * reusable builders so each invariant test doesn't hand-roll window/row
 * plumbing.
 */

import type { ClvRow, PairedBrierRow, RegisteredWindow } from "../types.js";

export const WINDOW_START = Date.parse("2026-02-01T00:00:00.000Z");
export const WINDOW_END = Date.parse("2026-04-01T00:00:00.000Z");
export const WINDOW_REGISTERED_AT = "2026-01-15T00:00:00.000Z";

/** The pre-registered event universe evt-0..evt-(n-1), matching makeBrierRows ids. */
export function eventUniverse(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `evt-${i}`);
}

export function baseWindow(overrides: Partial<RegisteredWindow> = {}): RegisteredWindow {
  return {
    windowId: "w-test",
    marketFamily: "nfl-spreads",
    registeredAt: WINDOW_REGISTERED_AT,
    start: new Date(WINDOW_START).toISOString(),
    end: new Date(WINDOW_END).toISOString(),
    nMin: 500,
    deltaPrac: 0.002,
    epsilonClv: 0.0005,
    minClvN: 100,
    concurrentChallengers: 1,
    alpha: 0.05,
    // Matches the suite's standard makeBrierRows(600, ...) fixtures: full
    // coverage of a 600-event registered universe.
    registeredEventIds: eventUniverse(600),
    coverageFloor: 0.95,
    ...overrides,
  };
}

/** Spreads n timestamps evenly across [WINDOW_START, WINDOW_END], each with
 * a settlement one day (in ms) after lock. */
function timesFor(index: number, n: number): { lockedAt: string; settledAt: string } {
  const span = WINDOW_END - WINDOW_START - 2 * 86_400_000;
  const lockedMs = WINDOW_START + 86_400_000 + Math.floor((span * index) / Math.max(n, 1));
  const settledMs = lockedMs + 3_600_000; // settle 1h after lock
  return { lockedAt: new Date(lockedMs).toISOString(), settledAt: new Date(settledMs).toISOString() };
}

/**
 * Deterministic paired Brier rows for `n` events. `championProb(i)` and
 * `challengerProb(i)` control each side's pre-lock probability; `outcome(i)`
 * controls the realized binary result.
 */
export function makeBrierRows(
  n: number,
  championProb: (i: number) => number,
  challengerProb: (i: number) => number,
  outcome: (i: number) => 0 | 1,
): PairedBrierRow[] {
  return Array.from({ length: n }, (_, i) => {
    const { lockedAt, settledAt } = timesFor(i, n);
    return {
      eventId: `evt-${i}`,
      championProb: championProb(i),
      challengerProb: challengerProb(i),
      outcome: outcome(i),
      lockedAt,
      settledAt,
    };
  });
}

/** Deterministic graded CLV rows, `n` per side, with fixed means. */
export function makeClvRows(
  n: number,
  championClv: (i: number) => number,
  challengerClv: (i: number) => number,
): ClvRow[] {
  const champion: ClvRow[] = Array.from({ length: n }, (_, i) => {
    const { lockedAt, settledAt } = timesFor(i, n);
    return { pickId: `c-${i}`, model: "champion" as const, clv: championClv(i), lockedAt, settledAt };
  });
  const challenger: ClvRow[] = Array.from({ length: n }, (_, i) => {
    const { lockedAt, settledAt } = timesFor(i, n);
    return { pickId: `k-${i}`, model: "challenger" as const, clv: challengerClv(i), lockedAt, settledAt };
  });
  return [...champion, ...challenger];
}

/** A simple deterministic pseudo-Bernoulli outcome generator (NOT a seeded
 * RNG — used only to spread realistic 0/1 outcomes across identity/oracle
 * fixtures where the true-probability model is fixed by construction). */
export function deterministicOutcome(trueProb: (i: number) => number): (i: number) => 0 | 1 {
  return (i: number) => {
    // A low-discrepancy driver (golden-ratio fractional sequence) rather
    // than Math.random(), so fixtures are reproducible without needing a
    // seeded RNG for cases that don't require one (see mulberry32 usage in
    // placebo.test.ts for the property-test invariant that does).
    const u = (i * 0.6180339887498949) % 1;
    return u < trueProb(i) ? 1 : 0;
  };
}
