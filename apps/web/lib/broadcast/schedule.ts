/**
 * GSN Broadcast schedule, the deterministic drop cadence.
 *
 * The transmission drops twice a week, on the rhythm of the NFL week:
 *   - Tuesday night  → the Pre-Waiver Brief (set your claims before the run).
 *   - Sunday morning → the Inactives Brief (final actives before kickoff).
 *
 * Pure + deterministic: every function takes `now` so the "next transmission"
 * countdown is testable and never depends on a hidden clock. Weekday/hour are
 * evaluated in UTC for determinism; the human cadence label carries the intent.
 */

export type DropKind = "pre-waiver" | "inactives";

export interface Drop {
  readonly kind: DropKind;
  /** Display name of the drop. */
  readonly label: string;
  /** Human cadence (e.g. "Tuesday night"). */
  readonly cadence: string;
  /** What this drop is for. */
  readonly purpose: string;
  /** 0=Sun … 6=Sat (UTC). */
  readonly weekday: number;
  /** Hour of day (UTC) the drop lands. */
  readonly hourUtc: number;
}

export const DROPS: readonly Drop[] = [
  {
    kind: "pre-waiver",
    label: "Pre-Waiver Brief",
    cadence: "Tuesday night",
    purpose: "Set your waiver claims before the run.",
    weekday: 3, // early Wednesday UTC ≈ Tuesday night in the US
    hourUtc: 2,
  },
  {
    kind: "inactives",
    label: "Inactives Brief",
    cadence: "Sunday morning",
    purpose: "Final actives and last-look edges before kickoff.",
    weekday: 0, // Sunday
    hourUtc: 15, // late morning US, before the early window
  },
];

/** The next time a given weekday/hour (UTC) occurs at or after `now`. */
export function nextOccurrence(now: Date, weekday: number, hourUtc: number): Date {
  const result = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourUtc, 0, 0, 0),
  );
  let dayDelta = (weekday - result.getUTCDay() + 7) % 7;
  if (dayDelta === 0 && result.getTime() <= now.getTime()) {
    dayDelta = 7;
  }
  result.setUTCDate(result.getUTCDate() + dayDelta);
  return result;
}

export interface NextTransmission {
  readonly drop: Drop;
  readonly at: Date;
  /** Milliseconds from `now` until the drop. */
  readonly msUntil: number;
}

/** The soonest upcoming drop from `now`. */
export function nextTransmission(now: Date = new Date()): NextTransmission {
  let best: NextTransmission | null = null;
  for (const drop of DROPS) {
    const at = nextOccurrence(now, drop.weekday, drop.hourUtc);
    const msUntil = at.getTime() - now.getTime();
    if (!best || msUntil < best.msUntil) {
      best = { drop, at, msUntil };
    }
  }
  // DROPS is non-empty, so best is always set.
  return best as NextTransmission;
}

/** A compact "in 2d 4h" style label for a duration in milliseconds. */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "now";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
