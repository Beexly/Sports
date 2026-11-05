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
 * Next Tuesday 04:00 CT (America/Chicago), correct under any process TZ.
 * The earlier version called setHours()/setDate() on the local clock, so it
 * only returned 04:00 Chicago when the process TZ was already
 * America/Chicago. This version computes the Chicago wall clock with Intl and
 * converts the candidate 04:00 back to a UTC instant, so DST is handled by the
 * platform on any host (including CI, which runs UTC).
 * Cron wiring comment: `0 4 * * 2` America/Chicago — call this at deploy time.
 */
export function nextTuesday04CT(from: Date = new Date()): Date {
  const TZ = "America/Chicago";
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short", hour: "numeric", minute: "numeric", hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  const partsOf = (t: number) =>
    Object.fromEntries(fmt.formatToParts(new Date(t)).map((q) => [q.type, q.value]));
  // UTC instant whose Chicago wall time is the given date at 04:00.
  // Estimate in UTC first, then correct by the Chicago offset of that estimate
  // (iterate twice to settle across DST boundaries).
  const utcOfChicago0400 = (year: number, month: number, day: number): number => {
    let t = Date.UTC(year, month - 1, day, 4, 0, 0, 0);
    for (let k = 0; k < 2; k++) {
      const p = partsOf(t);
      const wallAsUtc = Date.UTC(
        Number(p.year), Number(p.month) - 1, Number(p.day),
        Number(p.hour) % 24, Number(p.minute), 0, 0,
      );
      t += Date.UTC(year, month - 1, day, 4, 0, 0, 0) - wallAsUtc;
    }
    return t;
  };
  const start = partsOf(from.getTime());
  let y = Number(start.year), mo = Number(start.month), d = Number(start.day);
  for (let i = 0; i < 8; i++) {
    const t = utcOfChicago0400(y, mo, d);
    const p = partsOf(t);
    if (p.weekday === "Tue" && t > from.getTime()) return new Date(t);
    if (p.weekday === "Tue" && t === from.getTime()) return new Date(t);
    const next = new Date(Date.UTC(y, mo - 1, d));
    next.setUTCDate(next.getUTCDate() + 1);
    y = next.getUTCFullYear(); mo = next.getUTCMonth() + 1; d = next.getUTCDate();
  }
  return new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
}
