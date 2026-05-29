/**
 * POST /api/telemetry
 *
 * Validates and ingests a single telemetry event.
 * Analytics events are no-oped until the launch mode enables analytics.
 * PII and methodology fields are rejected at this boundary.
 *
 * Never logs user identifiers, bet amounts, or methodology internals.
 */

import { NextResponse } from "next/server";
import { isKnownEventName } from "@/lib/telemetry/events";
import { isKnownSurface } from "@/lib/telemetry/surfaces";
import { checkForbiddenFields } from "@/lib/telemetry/privacy";
import { getActiveCapabilities } from "@/lib/galaxy/kernel/launch-modes";

export interface TelemetryIngestBody {
  event: string;
  surfaceId: string;
  actor: "anonymous" | "free" | "pro" | "elite";
  properties?: Record<string, unknown>;
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ ok: false, error: "Body must be an object" }, { status: 400 });
  }

  const { event, surfaceId, properties } = body as Partial<TelemetryIngestBody>;

  if (typeof event !== "string" || !isKnownEventName(event)) {
    return NextResponse.json({ ok: false, error: "Unknown event name" }, { status: 400 });
  }

  if (typeof surfaceId !== "string" || !isKnownSurface(surfaceId)) {
    return NextResponse.json({ ok: false, error: "Unknown surfaceId" }, { status: 400 });
  }

  if (properties !== undefined) {
    if (typeof properties !== "object" || properties === null || Array.isArray(properties)) {
      return NextResponse.json({ ok: false, error: "properties must be a plain object" }, { status: 400 });
    }
    const violation = checkForbiddenFields(properties as Record<string, unknown>);
    if (violation) {
      return NextResponse.json({ ok: false, error: `Forbidden field: ${violation}` }, { status: 400 });
    }
  }

  const capabilities = getActiveCapabilities();
  if (!capabilities.analytics) {
    return NextResponse.json({ ok: true, noop: true });
  }

  // analytics enabled — accept and log in dev, queue in production
  if (process.env.NODE_ENV === "development") {
    console.info("[telemetry]", event, surfaceId, properties ?? {});
  }

  return NextResponse.json({ ok: true });
}
