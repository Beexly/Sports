/**
 * Cron schedule manifest + expected-gap parser (pure).
 *
 * Why this exists (2026-08-10 incident):
 * `vercel.json` declares 20 crons at 15m–24h cadence, but the platform is the
 * ONLY scheduler right now (external-cron.yml has no runner minutes). When the
 * platform silently stops firing — plan cron caps, disabled crons, billing —
 * every downstream surface reports a *symptom* (ingestion stale, calibration
 * frozen, settlement overdue) and nothing names the *cause*. Operators then
 * burn an hour proving the difference between "quiet board" and "dead cron".
 *
 * This module converts a declared cron expression into the longest legitimate
 * gap between firings, so `scheduler-liveness.ts` can say "free-spine-health
 * expected every 120m, last ran 800m ago" instead of guessing.
 *
 * Parser scope: the standard 5-field expression (minute hour dom month dow)
 * with `*`, step (star-slash-N), ranges (`a-b`, `a-b/N`) and comma lists —
 * every form used in vercel.json. Anything outside that returns null
 * (unknown, never a guess).
 */

/** A cron declared in vercel.json, mirrored for liveness assessment. */
export type CronManifestEntry = {
  /** Route path exactly as declared in vercel.json. */
  readonly path: string;
  /** 5-field cron expression exactly as declared in vercel.json. */
  readonly schedule: string;
  /**
   * Longest legitimate wait between firings, in minutes. Derived from
   * `schedule` at module load and asserted against vercel.json in tests.
   */
  readonly expectedMaxGapMinutes: number | null;
};

const MINUTES_PER_DAY = 24 * 60;

/**
 * Expand one cron field into the set of matching values.
 * Returns null when the field uses syntax this parser does not model.
 */
function expandField(field: string, min: number, max: number): ReadonlySet<number> | null {
  const out = new Set<number>();
  for (const part of field.split(",")) {
    const token = part.trim();
    if (token === "") return null;

    const [rangePart, stepPart] = token.split("/", 2) as [string, string | undefined];
    let step = 1;
    if (stepPart !== undefined) {
      const parsedStep = Number(stepPart);
      if (!Number.isInteger(parsedStep) || parsedStep < 1) return null;
      step = parsedStep;
    }

    let start: number;
    let end: number;
    if (rangePart === "*") {
      start = min;
      end = max;
    } else if (rangePart.includes("-")) {
      const [a, b] = rangePart.split("-", 2) as [string, string | undefined];
      if (b === undefined) return null;
      start = Number(a);
      end = Number(b);
    } else {
      start = Number(rangePart);
      // A bare value with a step (`5/10`) means "from 5 to max, every step".
      end = stepPart === undefined ? start : max;
    }

    if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
    if (start < min || end > max || start > end) return null;

    for (let v = start; v <= end; v += step) out.add(v);
  }
  return out.size > 0 ? out : null;
}

/**
 * Longest gap (minutes) between consecutive firings of a 5-field cron.
 *
 * Enumerates the 1440 minutes of a generic day, which handles lists, steps and
 * ranges uniformly — including wrap-around from the last firing of one day to
 * the first of the next. Returns null when the expression restricts
 * day-of-month / month / day-of-week (not daily-periodic, so a single "expected
 * gap" would be a lie) or uses unmodelled syntax.
 */
export function expectedMaxGapMinutes(expression: string): number | null {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) return null;

  const [minuteField, hourField, domField, monthField, dowField] = fields as [
    string,
    string,
    string,
    string,
    string,
  ];

  // Only daily-periodic schedules have a meaningful fixed gap.
  if (domField !== "*" || monthField !== "*" || dowField !== "*") return null;

  const minutes = expandField(minuteField, 0, 59);
  const hours = expandField(hourField, 0, 23);
  if (!minutes || !hours) return null;

  const firings: number[] = [];
  for (let h = 0; h < 24; h += 1) {
    if (!hours.has(h)) continue;
    for (let m = 0; m < 60; m += 1) {
      if (minutes.has(m)) firings.push(h * 60 + m);
    }
  }
  if (firings.length === 0) return null;
  firings.sort((a, b) => a - b);

  const first = firings[0];
  const last = firings[firings.length - 1];
  if (first === undefined || last === undefined) return null;

  // Wrap-around gap: last firing of the day → first firing of the next.
  let maxGap = MINUTES_PER_DAY - last + first;
  for (let i = 1; i < firings.length; i += 1) {
    const prev = firings[i - 1];
    const cur = firings[i];
    if (prev === undefined || cur === undefined) continue;
    maxGap = Math.max(maxGap, cur - prev);
  }
  return maxGap;
}

/** Build a manifest entry, deriving the expected gap from the expression. */
export function cronEntry(path: string, schedule: string): CronManifestEntry {
  return { path, schedule, expectedMaxGapMinutes: expectedMaxGapMinutes(schedule) };
}

/**
 * Crons declared in `vercel.json`, in declaration order.
 *
 * MUST stay in sync with vercel.json — `cron-schedule-manifest.test.ts` reads
 * the real file and fails when they drift, so a new cron cannot be added to the
 * platform without becoming visible to liveness assessment.
 */
export const CRON_MANIFEST: readonly CronManifestEntry[] = [
  cronEntry("/api/cron/refresh-odds", "*/15 * * * *"),
  cronEntry("/api/cron/board-fill", "2,17,32,47 * * * *"),
  cronEntry("/api/cron/settle-picks", "20 * * * *"),
  cronEntry("/api/cron/deliver-settlement-alerts", "15 */3 * * *"),
  cronEntry("/api/cron/generate-signal-slate", "5,20,35,50 * * * *"),
  cronEntry("/api/cron/generate-drafts", "0 11 * * *"),
  cronEntry("/api/cron/reconcile-entitlements", "0 8 * * *"),
  cronEntry("/api/cron/ingest-player-stats", "0 9 * * *"),
  cronEntry("/api/cron/hydrate-cold-plane", "30 9 * * *"),
  cronEntry("/api/cron/drain-ai-telemetry-recovery", "30 * * * *"),
  cronEntry("/api/cron/prune-rate-limits", "30 6 * * *"),
  cronEntry("/api/cron/repair-checkout-attempts", "30 8 * * *"),
  cronEntry("/api/cron/run-formal-receipt", "45 9 * * *"),
  cronEntry("/api/cron/jarvis-snapshot", "15 * * * *"),
  cronEntry("/api/cron/free-spine-health", "0 */2 * * *"),
  cronEntry("/api/cron/health-alert", "*/15 * * * *"),
  cronEntry("/api/cron/autonomy-cycle", "7,22,37,52 * * * *"),
  cronEntry("/api/cron/calibration-metrics", "40 */6 * * *"),
  cronEntry("/api/cron/backfill-independent-trueprob", "10 */4 * * *"),
  cronEntry("/api/cron/refresh-player-stats", "0,30 * * * *"),
  cronEntry("/api/cron/backfill-team-efficiency", "15 7 * * *"),
];

/** Manifest entry for a path, or null when the path is not a declared cron. */
export function findCronEntry(path: string): CronManifestEntry | null {
  return CRON_MANIFEST.find((c) => c.path === path) ?? null;
}
