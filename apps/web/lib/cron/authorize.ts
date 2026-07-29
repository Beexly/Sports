import { NextResponse } from "next/server";
import {
  extractBearerSecret,
  authorizeCronSecret,
  type CronAuthMatched,
} from "@sports/util";

/**
 * Shared cron Bearer-secret authorization (HTTP SoT).
 *
 * Dual-secret rotation:
 *   - CRON_SECRET          — primary
 *   - CRON_SECRET_PREVIOUS — optional rotation twin
 *
 * Pure twin: `@sports/util` → `authorizeCronSecret` / `safeEqualBearerDual`.
 * Do NOT reintroduce `authHeader === \`Bearer ${secret}\``.
 *
 * Returns `null` when authorized; otherwise:
 *   - 500 `CRON_SECRET not configured` when neither primary nor previous is set
 *   - 401 `Unauthorized` when the Authorization header is missing or wrong
 *
 * Usage:
 *   const denied = cronAuthError(request);
 *   if (denied) return denied;
 */
export function cronAuthError(request: Request): NextResponse | null {
  const primary = process.env["CRON_SECRET"];
  const previous = process.env["CRON_SECRET_PREVIOUS"];
  const provided = extractBearerSecret(request.headers.get("authorization"));

  const result = authorizeCronSecret({
    providedSecret: provided,
    expectedSecret: primary,
    previousSecret: previous,
  });

  if (result.code === "cron_secret_unset") {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (!result.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * Same check as cronAuthError, but returns which secret matched (for telemetry).
 * Prefer cronAuthError at route boundaries; use this when callers need matched.
 */
export function authorizeCronRequest(request: Request): {
  ok: boolean;
  status: 200 | 401 | 500;
  matched: CronAuthMatched;
  error?: string;
} {
  const primary = process.env["CRON_SECRET"];
  const previous = process.env["CRON_SECRET_PREVIOUS"];
  const provided = extractBearerSecret(request.headers.get("authorization"));
  const result = authorizeCronSecret({
    providedSecret: provided,
    expectedSecret: primary,
    previousSecret: previous,
  });
  if (result.code === "cron_secret_unset") {
    return { ok: false, status: 500, matched: null, error: "CRON_SECRET not configured" };
  }
  if (!result.ok) {
    return { ok: false, status: 401, matched: null, error: "Unauthorized" };
  }
  return { ok: true, status: 200, matched: result.matched };
}
