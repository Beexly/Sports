/**
 * Pure decision logic for the health-alert cron.
 * Alert on healthy→unhealthy transition, or every QUIET_MS while still unhealthy.
 */

export const HEALTH_ALERT_QUIET_MS = 4 * 60 * 60 * 1000; // 4 hours

export type HealthAlertSnapshot = {
  readonly unhealthy: boolean;
  readonly reason: string;
  readonly ingestionAgeMinutes: number | null;
  readonly settlementUnavailable: boolean;
};

export type HealthAlertState = {
  readonly lastAlertAt: string | null;
  readonly lastUnhealthy: boolean;
  readonly lastReason: string | null;
};

export type HealthAlertDecision = {
  readonly shouldAlert: boolean;
  readonly reason: string;
};

export function decideHealthAlert(
  snap: HealthAlertSnapshot,
  state: HealthAlertState,
  nowMs: number = Date.now(),
): HealthAlertDecision {
  if (!snap.unhealthy) {
    return { shouldAlert: false, reason: "healthy" };
  }

  // Transition: was healthy (or never alerted) → now unhealthy
  if (!state.lastUnhealthy) {
    return { shouldAlert: true, reason: `transition: ${snap.reason}` };
  }

  // Still unhealthy — re-alert only after quiet window
  if (!state.lastAlertAt) {
    return { shouldAlert: true, reason: `first-alert: ${snap.reason}` };
  }

  const last = Date.parse(state.lastAlertAt);
  if (!Number.isFinite(last) || nowMs - last >= HEALTH_ALERT_QUIET_MS) {
    return { shouldAlert: true, reason: `still-unhealthy: ${snap.reason}` };
  }

  return {
    shouldAlert: false,
    reason: `quiet-window (${Math.round((HEALTH_ALERT_QUIET_MS - (nowMs - last)) / 60000)}m remaining)`,
  };
}

export function classifyHealthAlertSnapshot(input: {
  checks: Record<string, { status: string; ageMinutes?: number; detail?: string }>;
  capabilities: ReadonlyArray<{ capabilityId: string; status: string; reason?: string }>;
}): HealthAlertSnapshot {
  const checkErrors = Object.entries(input.checks)
    .filter(([, c]) => c.status !== "ok")
    .map(([k, c]) => `${k}:${c.detail ?? c.status}`);

  const ingestionAge =
    typeof input.checks["ingestion"]?.ageMinutes === "number"
      ? input.checks["ingestion"].ageMinutes!
      : null;

  const settlement = input.capabilities.find((c) => c.capabilityId === "settlement");
  const settlementUnavailable =
    settlement?.status === "unavailable" ||
    (settlement?.reason?.toLowerCase().includes("critically behind") ?? false);

  // Unhealthy if any check fails, ingestion > 90m, or settlement critically behind
  const ingestionStale = ingestionAge !== null && ingestionAge > 90;
  const unhealthy =
    checkErrors.length > 0 || ingestionStale || settlementUnavailable;

  const parts: string[] = [];
  if (checkErrors.length) parts.push(`checks=[${checkErrors.join("; ")}]`);
  if (ingestionStale) parts.push(`ingestionAge=${ingestionAge}m`);
  if (settlementUnavailable) parts.push(`settlement=${settlement?.reason ?? "unavailable"}`);

  return {
    unhealthy,
    reason: parts.join(" | ") || "ok",
    ingestionAgeMinutes: ingestionAge,
    settlementUnavailable,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * STATELESS ESCALATION LADDER
 *
 * WHY THIS EXISTS. `decideHealthAlert` above needs a `HealthAlertState` that
 * survives between runs. The health-alert cron is a *serverless* function: the
 * route held that state in a module-level `let`, which lives only as long as one
 * isolate. Vercel creates and discards isolates freely, so a cold start restores
 * `lastUnhealthy: false` and the very next line of `decideHealthAlert` returns
 * `transition: …` — a fresh page. During a sustained outage the cron fires 96
 * times a day and each cold isolate believes it is watching the outage begin.
 * The 4h quiet window was never enforced in production; it only ever worked in
 * the unit tests, which pass state in by hand.
 *
 * The honest fix without persistence is to stop trying to remember when we last
 * alerted and instead derive it from something already observable. Two ladders:
 *
 *   AGE LADDER — for staleness, `ingestionAgeMinutes` *is* the outage duration.
 *   Rungs at 90m (the unhealthy threshold itself), 6h, 24h, then daily. A tick
 *   alerts when it observes a higher rung than a tick one interval earlier would
 *   have, so each rung fires exactly once per outage. No memory required.
 *
 *   CLOCK LADDER — a failed `database` check or an unavailable settlement probe
 *   carries no duration, so there is nothing to ladder against. Fall back to
 *   quantised wall-clock: the first tick of each 4h UTC block. Bounded at 6/day.
 *
 * BOUND: a permanently-broken deployment pages at most ~9 times a day (3 age
 * rungs + 6 clock blocks) instead of 96, and a 24h ingestion stall pages exactly
 * 3 times. Alerting is bounded by construction rather than by remembered state.
 *
 * KNOWN LIMITATION, stated rather than hidden: a transition detected only by the
 * clock ladder waits up to 4h for the next block. In practice the failure modes
 * that matter also stall ingestion, so the age ladder fires within one tick of
 * the 90m threshold. Closing that gap properly needs durable state — the right
 * home is a `source: "health_alert"` row in `ControlEventLedger`, whose comment
 * already anticipates new sources and which carries both needed indexes. That is
 * a production-data write and therefore an owner-gated decision, not one to make
 * inside a bug fix.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Cron interval for `/api/cron/health-alert` — `*​/15 * * * *` in vercel.json. */
export const HEALTH_ALERT_TICK_MINUTES = 15;

/** Wall-clock block for the no-duration fallback ladder. */
export const HEALTH_ALERT_CLOCK_BLOCK_MINUTES = 4 * 60;

/**
 * Rung index for an ingestion age. Monotonic non-decreasing in `ageMinutes`:
 * 0 below the 90m unhealthy threshold, then 90m / 6h / 24h, then one per day.
 */
export function healthAlertAgeRung(ageMinutes: number): number {
  if (!Number.isFinite(ageMinutes) || ageMinutes < 90) return 0;
  if (ageMinutes < 360) return 1;
  if (ageMinutes < 1440) return 2;
  return 2 + Math.floor(ageMinutes / 1440);
}

/** Which 4h UTC block a moment falls in. */
export function healthAlertClockRung(nowMs: number): number {
  return Math.floor(nowMs / 60_000 / HEALTH_ALERT_CLOCK_BLOCK_MINUTES);
}

/**
 * Stateless replacement for `decideHealthAlert`. Same shape, no `state` argument.
 *
 * Healthy snapshots never alert. An unhealthy snapshot alerts when this tick
 * crosses an age rung, or opens a new wall-clock block.
 */
export function decideHealthAlertStateless(
  snap: HealthAlertSnapshot,
  nowMs: number = Date.now(),
): HealthAlertDecision {
  if (!snap.unhealthy) {
    return { shouldAlert: false, reason: "healthy" };
  }

  const tickMs = HEALTH_ALERT_TICK_MINUTES * 60_000;
  const age = snap.ingestionAgeMinutes;

  if (age !== null) {
    const rung = healthAlertAgeRung(age);
    const prev = healthAlertAgeRung(age - HEALTH_ALERT_TICK_MINUTES);
    if (rung > prev) {
      return { shouldAlert: true, reason: `age-rung ${prev}→${rung} (${age}m): ${snap.reason}` };
    }
  }

  const block = healthAlertClockRung(nowMs);
  if (block > healthAlertClockRung(nowMs - tickMs)) {
    return { shouldAlert: true, reason: `clock-block ${block}: ${snap.reason}` };
  }

  return { shouldAlert: false, reason: `laddered-quiet: ${snap.reason}` };
}
