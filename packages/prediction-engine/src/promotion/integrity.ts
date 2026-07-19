/**
 * Walk-forward integrity guard (contract Leg 3 / §4).
 *
 * The evaluator must be structurally impossible to run on an improperly
 * registered or leaking window: this module rejects (never silently
 * proceeds) when
 *   1. the window was registered on/after its own start (peek risk), or
 *   2. any row's lockedAt falls outside [window.start, window.end], or
 *   3. any row's settledAt is not strictly after its own lockedAt
 *      (a settlement that isn't after lock is a leak or a data bug, either
 *      way not a valid walk-forward observation).
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

function parseIsoOrThrow(value: string, label: string): number {
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

  brierRows.forEach((row, i) => validateRowTimes(row, start, end, "brierRows", i));
  clvRows.forEach((row, i) => validateRowTimes(row, start, end, "clvRows", i));
}
