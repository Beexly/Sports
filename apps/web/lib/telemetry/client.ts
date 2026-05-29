/**
 * Browser-side telemetry helper.
 *
 * Thin wrapper over POST /api/telemetry. Never throws — errors are
 * swallowed silently so instrumentation never disrupts the user experience.
 *
 * Keep imports minimal: this file is imported from "use client" components.
 */

import type { TelemetryEventName } from "./events";
import type { TelemetrySurfaceId } from "./surfaces";

export async function trackEvent(
  event: TelemetryEventName,
  surfaceId: TelemetrySurfaceId,
  properties?: Record<string, unknown>,
): Promise<void> {
  try {
    await fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, surfaceId, actor: "anonymous", properties }),
    });
  } catch {
    // telemetry failures must never surface to users
  }
}
