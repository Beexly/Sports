/**
 * Discipline cadence — honest counters of process behavior over rolling
 * windows. No gamification. No streaks lost. No guilt loops.
 *
 * Counted activities:
 *   - no-bet credits: passes the user respected
 *   - autopsies graded: settled picks the user processed
 *   - modules completed: academy concepts marked fluent
 *
 * Constitution: never use a break or a missed day to trigger an
 * upsell, a notification, or a 'come back' nudge. The counters are
 * available; the user chooses to look at them.
 */

export interface CadenceWindow {
  readonly label: "7-day" | "30-day" | "90-day";
  readonly days: number;
  readonly noBetCredits: number;
  readonly autopsiesGraded: number;
  readonly modulesCompleted: number;
}

export interface CadenceInput {
  readonly noBetEventTimestamps: ReadonlyArray<string>; // ISO timestamps
  readonly autopsyGradedTimestamps: ReadonlyArray<string>;
  readonly moduleCompletedTimestamps: ReadonlyArray<string>;
  readonly now: Date;
}

export interface CadenceReport {
  readonly windows: ReadonlyArray<CadenceWindow>;
  readonly composedAt: string;
}

const WINDOWS = [
  { label: "7-day" as const, days: 7 },
  { label: "30-day" as const, days: 30 },
  { label: "90-day" as const, days: 90 },
];

function countWithinDays(timestamps: ReadonlyArray<string>, days: number, now: Date): number {
  const cutoff = now.getTime() - days * 24 * 60 * 60_000;
  let count = 0;
  for (const ts of timestamps) {
    const t = new Date(ts).getTime();
    if (Number.isNaN(t)) continue;
    if (t >= cutoff) count++;
  }
  return count;
}

export function computeCadence(input: CadenceInput): CadenceReport {
  const windows: CadenceWindow[] = WINDOWS.map((w) => ({
    label: w.label,
    days: w.days,
    noBetCredits: countWithinDays(input.noBetEventTimestamps, w.days, input.now),
    autopsiesGraded: countWithinDays(input.autopsyGradedTimestamps, w.days, input.now),
    modulesCompleted: countWithinDays(input.moduleCompletedTimestamps, w.days, input.now),
  }));

  return {
    windows,
    composedAt: input.now.toISOString(),
  };
}
