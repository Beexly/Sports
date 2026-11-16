/**
 * Canonical Three-Noon Master Lock & T-90m Adjustment cadence guard for
 * autonomous signal minting crons. Prevents off-cadence crons from minting
 * stray picks outside scheduled release windows in production.
 */

export interface MintWindowGateVerdict {
  readonly allowed: boolean;
  readonly reason: string;
}

export interface ChicagoClockParts {
  readonly weekday: string;
  readonly hour: number;
  readonly minute: number;
}

/**
 * Extracts weekday short name (`Mon`..`Sun`) and 24-hour clock in
 * `America/Chicago` deterministically across Node/ICU builds.
 */
export function chicagoWallClock(now: Date): ChicagoClockParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(now);
  let weekday = "";
  let rawHour = 0;
  let minute = 0;

  for (const part of parts) {
    if (part.type === "weekday") weekday = part.value;
    else if (part.type === "hour") rawHour = Number(part.value);
    else if (part.type === "minute") minute = Number(part.value);
  }

  const hour = rawHour === 24 ? 0 : rawHour;
  return { weekday, hour, minute };
}

const CANONICAL_WINDOWS_CT: Readonly<Record<string, readonly number[]>> = {
  Wed: [12 * 60], // 12:00 CT Noon Master Lock #1
  Thu: [17 * 60 + 45], // 17:45 CT TNF T-90m
  Fri: [12 * 60], // 12:00 CT Noon Master Lock #2
  Sun: [
    7 * 60, // 07:00 CT International T-90m
    10 * 60 + 30, // 10:30 CT Sunday Early T-90m
    12 * 60, // 12:00 CT Noon Master Lock #3
    13 * 60 + 55, // 13:55 CT Sunday Late T-90m
    17 * 60 + 50, // 17:50 CT SNF T-90m
  ],
  Mon: [17 * 60 + 45], // 17:45 CT MNF T-90m
};

const WINDOW_HALF_WIDTH_MINUTES = 30;

/**
 * Determines whether signal pick minting is permitted right now for the
 * incoming cron request. Seed and odds refresh continue regardless; only
 * signal minting is gated to canonical Noon Lock & T-90m windows in prod.
 */
export function canMintSignalPicksNow(
  request: Request,
  now: Date = new Date(),
  env: NodeJS.ProcessEnv = process.env,
): MintWindowGateVerdict {
  if (env["VITEST"] === "true" || env["NODE_ENV"] !== "production") {
    return { allowed: true, reason: "test_or_dev_env" };
  }

  if (env["GSE_ALLOW_OFF_CADENCE_MINT"] === "true") {
    return { allowed: true, reason: "env_override_off_cadence" };
  }

  try {
    const parsedUrl = new URL(request.url);
    if (
      parsedUrl.searchParams.get("lockWindow") === "1" ||
      parsedUrl.searchParams.get("forceLockWindow") === "true"
    ) {
      return { allowed: true, reason: "query_lock_window_override" };
    }
  } catch {
    // Ignore malformed relative URLs and fall back to wall-clock cadence check.
  }

  const clock = chicagoWallClock(now);
  const targets = CANONICAL_WINDOWS_CT[clock.weekday] ?? [];
  const currentMinutes = clock.hour * 60 + clock.minute;

  for (const target of targets) {
    if (Math.abs(currentMinutes - target) <= WINDOW_HALF_WIDTH_MINUTES) {
      return { allowed: true, reason: "within_canonical_lock_window" };
    }
  }

  return { allowed: false, reason: "outside_canonical_noon_or_t90_window" };
}
