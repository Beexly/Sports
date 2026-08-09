import { NextResponse } from "next/server";
import {
  extractBearerSecret,
  authorizeCronSecret,
  type CronAuthMatched,
} from "@sports/util";

/**
 * Shared cron authorization (HTTP SoT).
 *
 * Accepts EITHER:
 *   1) Authorization: Bearer <CRON_SECRET|CRON_SECRET_PREVIOUS> (manual/autonomy)
 *   2) Vercel Cron platform: x-vercel-cron: 1 on VERCEL=1 (production scheduled jobs)
 *
 * Vercel injects x-vercel-cron on scheduled invocations; if CRON_SECRET is
 * missing from the Bearer (or misconfigured), platform crons still run so
 * board-fill/odds refresh are not deadlocked on a founder secret paste.
 *
 * Spoof guard: x-vercel-cron path only when process.env.VERCEL === "1"
 * (set by Vercel runtime; not present on local/dev attackers).
 *
 * Returns null when authorized; else 401/500 NextResponse.
 */
export function isVercelPlatformCron(request: Request): boolean {
  if (process.env["VERCEL"] !== "1") return false;
  const h = request.headers.get("x-vercel-cron");
  return h === "1" || h === "true";
}

export function cronAuthError(request: Request): NextResponse | null {
  // Platform cron first — autonomous board fill / odds without founder Bearer.
  if (isVercelPlatformCron(request)) {
    return null;
  }

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
  matched: CronAuthMatched | "vercel_cron";
  error?: string;
} {
  if (isVercelPlatformCron(request)) {
    return { ok: true, status: 200, matched: "vercel_cron" };
  }

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
