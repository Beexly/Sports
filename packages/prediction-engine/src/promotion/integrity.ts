/**
 * Walk-forward integrity guard (contract Leg 3 / §4).
 *
 * The evaluator must be structurally impossible to run on an improperly
 * registered, leaking, or corrupt evidence set: this module rejects (never
 * silently proceeds) when
 *   1. the window was registered on/after its own start (peek risk), or
 *   2. any row's lockedAt falls outside [window.start, window.end], or
 *   3. any row's settledAt is not strictly after its own lockedAt
 *      (a settlement that isn't after lock is a leak or a data bug, either
 *      way not a valid walk-forward observation), or
 *   4. any timestamp lacks an explicit timezone (Z or ±HH:MM) — a TZ-less
 *      ISO string parses relative to the local process timezone, so the same
 *      window could pass integrity in UTC but fail (or shift instants) under
 *      a different TZ, breaking the byte-for-byte replay guarantee, or
 *   5. any eventId (Brier) or pickId (CLV) appears more than once — a
 *      duplicated favorable row would count multiple times toward N_min /
 *      minClvN and the means without adding independent evidence, or
 *   6. any Brier probability is non-finite or outside [0, 1], or any outcome
 *      is not exactly 0 or 1 — rows come from persistence; a corrupt
 *      champion value squared can fabricate arbitrarily large "improvement", or
 *   7. any CLV value is non-finite, or any CLV row's model label is not
 *      exactly "champion" or "challenger" — an unknown label silently
 *      dropped from Leg 2 would let the gate pass on a filtered subset, or
 *   8. the registered event universe is empty, coverageFloor is outside
 *      (0, 1], or any Brier row's eventId is NOT in the registered universe
 *      — evaluation on events outside the pre-registered family is
 *      cherry-picking by construction. (Coverage BELOW the floor is an
 *      eligibility failure, not corruption — evaluate.ts fails Leg 1 with a
 *      coverage reason rather than throwing.)
 *
 * Every violation throws a typed PromotionIntegrityError. `evaluatePromotion`
 * calls this before touching any statistic, so a badly registered window
 * can never silently produce a decision.
 */

import type { ClvRow, PairedBrierRow, RegisteredWindow } from "./types.js";

export class PromotionIntegrityError extends Error {
  constructor(message: string) {
    super(`promotion-gate integrity violation: ${message}`);
    this.name = "PromotionIntegrityError";
  }
}

/** Explicit timezone designator: trailing Z, or ±HH:MM / ±HHMM offset. */
const EXPLICIT_TZ = /(?:Z|[+-]\d{2}:?\d{2})$/;

function parseIsoOrThrow(value: string, label: string): number {
  if (!EXPLICIT_TZ.test(value)) {
    throw new PromotionIntegrityError(
      `${label} ("${value}") lacks an explicit timezone (Z or ±HH:MM) — TZ-less timestamps parse ` +
        "relative to the local process timezone and break byte-for-byte replay",
    );
  }
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    throw new PromotionIntegrityError(`${label} is not a valid ISO timestamp (got "${value}")`);
  }
  return ms;
}

type TimedRow = { readonly lockedAt: string; readonly settledAt: string };

function validateRowTimes(row: TimedRow, start: number, end: number, kind: string, index: number): void {
  const locked = parseIsoOrThrow(row.lockedAt, `${kind}[${index}].lockedAt`);
  const settled = parseIsoOrThrow(row.settledAt, `${kind}[${index}].settledAt`);

  if (locked < start || locked > end) {
    throw new PromotionIntegrityError(
      `${kind}[${index}].lockedAt (${row.lockedAt}) is outside the registered window ` +
        `[${new Date(start).toISOString()}, ${new Date(end).toISOString()}]`,
    );
  }

  if (!(settled > locked)) {
    throw new PromotionIntegrityError(
      `${kind}[${index}].settledAt (${row.settledAt}) must be strictly after lockedAt (${row.lockedAt}) — ` +
        "a settlement at or before lock cannot be a leak-free walk-forward observation",
    );
  }
}

function assertProbability(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new PromotionIntegrityError(
      `${label} must be a finite probability in [0, 1] (got ${value}) — an out-of-range persisted ` +
        "value squared can fabricate arbitrarily large Brier improvement",
    );
  }
}

/**
 * Validates walk-forward integrity for a registered window and its row-level
 * evidence. Throws PromotionIntegrityError on any violation; returns void on
 * success (never returns a "soft" false — the point is to make it impossible
 * to proceed on bad data, not to report it and continue).
 */
export function validateWalkForwardIntegrity(
  window: RegisteredWindow,
  brierRows: readonly PairedBrierRow[],
  clvRows: readonly ClvRow[],
): void {
  const registeredAt = parseIsoOrThrow(window.registeredAt, "window.registeredAt");
  const start = parseIsoOrThrow(window.start, "window.start");
  const end = parseIsoOrThrow(window.end, "window.end");

  if (!(start < end)) {
    throw new PromotionIntegrityError(
      `window.start (${window.start}) must be strictly before window.end (${window.end})`,
    );
  }

  if (!(registeredAt < start)) {
    throw new PromotionIntegrityError(
      `window.registeredAt (${window.registeredAt}) must be strictly before window.start (${window.start}) — ` +
        "a window registered at or after its own start could have been shaped by peeking at in-window results",
    );
  }

  if (window.registeredEventIds.length === 0) {
    throw new PromotionIntegrityError(
      "window.registeredEventIds is empty — a window with no pre-registered event universe cannot " +
        "bound coverage and invites overlap cherry-picking",
    );
  }
  if (!(window.coverageFloor > 0 && window.coverageFloor <= 1)) {
    throw new PromotionIntegrityError(
      `window.coverageFloor must be in (0, 1] (got ${window.coverageFloor})`,
    );
  }
  const universe = new Set(window.registeredEventIds);
  if (universe.size !== window.registeredEventIds.length) {
    throw new PromotionIntegrityError(
      "window.registeredEventIds contains duplicates — the registered universe must be a set",
    );
  }

  const seenEventIds = new Set<string>();
  brierRows.forEach((row, i) => {
    validateRowTimes(row, start, end, "brierRows", i);
    if (seenEventIds.has(row.eventId)) {
      throw new PromotionIntegrityError(
        `brierRows[${i}].eventId ("${row.eventId}") is a duplicate — a repeated event would count ` +
          "multiple times toward N_min and the mean without adding independent evidence",
      );
    }
    seenEventIds.add(row.eventId);
    if (!universe.has(row.eventId)) {
      throw new PromotionIntegrityError(
        `brierRows[${i}].eventId ("${row.eventId}") is not in the pre-registered event universe — ` +
          "evaluation outside the registered family is cherry-picking by construction",
      );
    }
    assertProbability(row.championProb, `brierRows[${i}].championProb`);
    assertProbability(row.challengerProb, `brierRows[${i}].challengerProb`);
    if (row.outcome !== 0 && row.outcome !== 1) {
      throw new PromotionIntegrityError(
        `brierRows[${i}].outcome must be exactly 0 or 1 (got ${String(row.outcome)})`,
      );
    }
  });

  const seenPickIds = new Set<string>();
  clvRows.forEach((row, i) => {
    validateRowTimes(row, start, end, "clvRows", i);
    if (seenPickIds.has(row.pickId)) {
      throw new PromotionIntegrityError(
        `clvRows[${i}].pickId ("${row.pickId}") is a duplicate — a repeated pick would count ` +
          "multiple times toward minClvN and the mean without adding independent evidence",
      );
    }
    seenPickIds.add(row.pickId);
    if (row.model !== "champion" && row.model !== "challenger") {
      throw new PromotionIntegrityError(
        `clvRows[${i}].model must be exactly "champion" or "challenger" (got "${String(row.model)}") — ` +
          "an unknown label silently dropped from Leg 2 would let the gate pass on a filtered subset",
      );
    }
    if (!Number.isFinite(row.clv)) {
      throw new PromotionIntegrityError(`clvRows[${i}].clv must be finite (got ${row.clv})`);
    }
  });
}
