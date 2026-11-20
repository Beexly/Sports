/**
 * Pure read-only America/Chicago pregame cadence probe for operating-kernel.ts.
 * Zero DB writes, zero network calls, zero public-gate mutations.
 */

import type { PregameCadenceObservation } from "@/lib/autonomy/operating-kernel";

export interface ChicagoClockParts {
  readonly weekday: string;
  readonly hour: number;
  readonly minute: number;
}

export function getChicagoClockParts(now: Date = new Date()): ChicagoClockParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const byType = new Map(parts.map((p) => [p.type, p.value]));
  const hourRaw = Number.parseInt(byType.get("hour") ?? "0", 10);
  return {
    weekday: byType.get("weekday") ?? "Thu",
    hour: hourRaw === 24 ? 0 : hourRaw,
    minute: Number.parseInt(byType.get("minute") ?? "0", 10),
  };
}

export function probePregameCadenceObservation(params: {
  readonly now?: Date;
  readonly env?: Record<string, string | undefined>;
} = {}): PregameCadenceObservation {
  const now = params.now ?? new Date();
  const env = params.env ?? process.env;
  const clock = getChicagoClockParts(now);

  // Wednesday 12:00 CT TNF master cutoff window (11:30..13:30 CT)
  const wedNoonTnfLockDue =
    clock.weekday === "Wed" &&
    ((clock.hour === 11 && clock.minute >= 30) || clock.hour === 12 || (clock.hour === 13 && clock.minute <= 30));

  // Friday 12:00 CT Sunday master cutoff window (11:30..16:45 CT before Fri video/content)
  const friNoonSundayLockDue =
    clock.weekday === "Fri" &&
    ((clock.hour === 11 && clock.minute >= 30) || (clock.hour >= 12 && clock.hour < 17));

  // Sunday 12:00 CT MNF cutoff window
  const sunNoonMnfLockDue =
    clock.weekday === "Sun" &&
    clock.hour === 12 &&
    clock.minute <= 45;

  // T-90m inactives adjustment windows: Thu 17:45..19:15 CT, Sun 10:30..12:00 CT, Mon 17:45..19:15 CT
  const t90mInactivesAdjustmentDue =
    (clock.weekday === "Thu" && ((clock.hour === 17 && clock.minute >= 45) || clock.hour === 18)) ||
    (clock.weekday === "Sun" && ((clock.hour === 10 && clock.minute >= 30) || clock.hour === 11)) ||
    (clock.weekday === "Mon" && ((clock.hour === 17 && clock.minute >= 45) || clock.hour === 18));

  const activeSlot =
    clock.weekday === "Thu"
      ? "TNF"
      : clock.weekday === "Mon"
        ? "MNF"
        : clock.weekday === "Sun"
          ? "SUN_MAIN"
          : "WEEK11_SLATE";

  const leakFlag = env["GSE_ENGINE_INTEGRITY_LEAK_DETECTED"]?.trim().toLowerCase() === "true";

  return {
    wedNoonTnfLockDue,
    friNoonSundayLockDue,
    sunNoonMnfLockDue,
    t90mInactivesAdjustmentDue,
    lateSwapPacketsStale: false,
    engineIntegrityLeakDetected: leakFlag,
    integrityLeakDetail: leakFlag ? env["GSE_ENGINE_INTEGRITY_LEAK_DETAIL"] ?? null : null,
    activeSlot,
  };
}
