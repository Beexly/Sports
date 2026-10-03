/**
 * Jarvis Alerts
 *
 * Pure helper that takes a JarvisDiff and emits an array of typed
 * operator alerts. Pair with `diffJarvis()` and a scheduled job that
 * pages on-call when `severity === "page"`.
 *
 * This module is intentionally side-effect free: it does NOT send
 * Slack/email/SMS. It only produces the alert payload. Callers wire
 * the delivery mechanism.
 *
 * Design notes:
 *   - We surface NOT_READY_DATA / NOT_READY_SAFETY transitions as
 *     `page` severity — those are the conditions that should wake an
 *     operator.
 *   - Cleared safety warnings produce a `info` alert so on-call sees
 *     the recovery.
 *   - Ingestion or settlement turning RED is a `page`.
 *   - Sectional drift from GREEN → AMBER is `warning`.
 *   - Everything else is `info`.
 */

import type { JarvisDiff } from "@/lib/cockpit/jarvis-diff";

export type JarvisAlertSeverity = "info" | "warning" | "page";

export interface JarvisAlert {
  readonly severity: JarvisAlertSeverity;
  readonly title: string;
  readonly detail: string;
  /** Stable key for dedupe in downstream sinks. */
  readonly key: string;
}

const PAGE_LAUNCH_STATUSES = new Set(["NOT_READY_DATA", "NOT_READY_SAFETY"]);

// Converts a JarvisDiff into transport-neutral operator alerts.
export function alertsFromDiff(diff: JarvisDiff): JarvisAlert[] {
  const alerts: JarvisAlert[] = [];

  if (diff.launchStatusChanged) {
    // We get the current status from the sectional changes (or from the
    // synthesized assessment — but diff doesn't carry the raw launchStatus
    // by design). The summarize* helper consumes the same shape; we let
    // callers also feed the new status when paging matters.
    alerts.push({
      severity: "warning",
      title: "Launch status changed",
      detail: "See the cockpit for the new launchStatus and its sectional readouts.",
      key: "jarvis.launchStatus.changed",
    });
  }

  for (const change of diff.sectionalChanges) {
    const prev = String(change.previous);
    const curr = String(change.current);
    if (curr === "RED" && prev !== "RED") {
      alerts.push({
        severity: change.key === "ingestionStatus" || change.key === "settlementStatus" ? "page" : "warning",
        title: `${change.key} → RED`,
        detail: `${change.key} changed from ${prev} to RED.`,
        key: `jarvis.section.${change.key}.red`,
      });
    } else if (prev === "RED" && curr !== "RED") {
      alerts.push({
        severity: "info",
        title: `${change.key} recovered`,
        detail: `${change.key} changed from RED to ${curr}.`,
        key: `jarvis.section.${change.key}.recovered`,
      });
    } else if (curr === "AMBER" && prev === "GREEN") {
      alerts.push({
        severity: "warning",
        title: `${change.key} → AMBER`,
        detail: `${change.key} changed from GREEN to AMBER.`,
        key: `jarvis.section.${change.key}.amber`,
      });
    }
  }

  for (const w of diff.newSafetyWarnings) {
    alerts.push({
      severity: "page",
      title: "New safety",
      detail: w,
      key: `jarvis.safety.new:${w.slice(0, 40)}`,
    });
  }
  for (const w of diff.clearedSafetyWarnings) {
    alerts.push({
      severity: "info",
      title: "Safety warning cleared",
      detail: w,
      key: `jarvis.safety.cleared:${w.slice(0, 40)}`,
    });
  }
  for (const k of diff.newExternalConfig) {
    alerts.push({
      severity: "warning",
      title: `External config missing: ${k}`,
      detail: `${k} is not set or is using a sentinel value.`,
      key: `jarvis.config.missing:${k}`,
    });
  }
  for (const k of diff.clearedExternalConfig) {
    alerts.push({
      severity: "info",
      title: `External config resolved: ${k}`,
      detail: `${k} is now configured.`,
      key: `jarvis.config.resolved:${k}`,
    });
  }

  return alerts;
}

/**
 * Convenience: filter to only the alerts that should page on-call.
 */
export function pagingAlerts(alerts: readonly JarvisAlert[]): readonly JarvisAlert[] {
  return alerts.filter((a) => a.severity === "page");
}

/**
 * Helper for launch-status escalation. Pass the current launchStatus
 * separately because the diff's launchStatusChanged is a boolean — to
 * decide whether to page we need to know what it changed *to*.
 */
export function launchStatusAlert(
  currentLaunchStatus: string
): JarvisAlert | null {
  if (PAGE_LAUNCH_STATUSES.has(currentLaunchStatus)) {
    return {
      severity: "page",
      title: `Launch status: ${currentLaunchStatus}`,
      detail: "The launch observatory reports a hard NOT-READY condition.",
      key: `jarvis.launchStatus.${currentLaunchStatus}`,
    };
  }
  return null;
}
