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
