/**
 * Continuous reconciliation — recompute the lock when its inputs change.
 *
 * HONEST SCOPE (per the Phase 2 brief, item 9):
 * - A deterministic input hash decides when a recompute is due. That is ALL the
 *   scheduling intelligence here.
 * - The Tuesday 04:00 CT cadence is a cron comment plus a callable next-run
 *   function. No scheduler is installed by this file.
 * - NO Neon write, NO 288-bit XOR engine, NO 5-second bound, and NO
 *   AuthorizedPublishReceipt type exist — none is claimed.
 */
import { createHash } from "crypto";

export interface ReconciliationState {
  readonly lastHash: string | null;
  readonly lastRunAt: string | null;
}

export interface ReconciliationOutcome<T> {
  readonly recomputed: boolean;
  readonly hash: string;
  readonly reason: "inputs-changed" | "first-run" | "unchanged";
  readonly result?: T;
  readonly ranAt: string;
}

/** Deterministic hash over the stable JSON of the inputs. Key order matters:
 * callers pass already-normalized objects; the hash of equal objects is equal. */
export function computeInputHash(inputs: unknown): string {
  const stable = JSON.stringify(inputs, (_k, v) =>
    v instanceof Date ? v.toISOString() : v,
  );
  return createHash("sha256").update(stable).digest("hex").slice(0, 32);
}

/**
 * Run `recompute` only when the input hash differs from the recorded one.
 * First run (null hash) always computes. Unchanged inputs never recompute.
 */
export function maybeRecompute<T>(
  state: ReconciliationState,
  inputs: unknown,
  recompute: () => T,
): ReconciliationOutcome<T> {
  const hash = computeInputHash(inputs);
  const ranAt = new Date().toISOString();
  if (state.lastHash === null) {
    return { recomputed: true, hash, reason: "first-run", result: recompute(), ranAt };
  }
  if (hash !== state.lastHash) {
    return { recomputed: true, hash, reason: "inputs-changed", result: recompute(), ranAt };
  }
  return { recomputed: false, hash, reason: "unchanged", ranAt };
}

/**
 * Next Tuesday 04:00 CT (America/Chicago), computed with the IANA timezone so
 * DST is handled by the platform, not by arithmetic on offsets.
 * Cron wiring comment: `0 4 * * 2` America/Chicago — call this at deploy time.
 */
export function nextTuesday04CT(from: Date = new Date()): Date {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short", hour: "numeric", minute: "numeric", hour12: false,
  });
  const cursor = new Date(from.getTime());
  for (let i = 0; i < 8; i++) {
    const parts = fmt.formatToParts(cursor);
    const weekday = parts.find((p) => p.type === "weekday")?.value;
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    if (weekday === "Tue" && hour * 60 + minute >= 4 * 60) {
      // Walk back to 04:00 local of this day.
      const at4 = new Date(cursor.getTime());
      at4.setHours(4, 0, 0, 0);
      return at4;
    }
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(4, 0, 0, 0);
  }
  return cursor;
}
