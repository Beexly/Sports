import { NextResponse } from "next/server";
import {
  extractBearerSecret,
  authorizeCronSecret,
  type CronAuthMatched,
} from "@sports/util";

/**
 * Shared cron authorization (HTTP SoT).
 *
 * Accepts EITHER (mode "dual", default — board-fill / odds / free-spine):
 *   1) Authorization: Bearer <CRON_SECRET|CRON_SECRET_PREVIOUS>
 *   2) Vercel Cron platform: x-vercel-cron: 1 when VERCEL=1
 *
 * Mode "bearer_only" (autonomy execute path and other sensitive crons):
 *   Bearer required. Platform header alone is rejected so spoofed
 *   x-vercel-cron cannot force AUTONOMY_EXECUTE cycles.
 *
 * Env CRON_REQUIRE_BEARER=true forces bearer_only globally (founder opt-in
 * when Vercel is confirmed to inject Authorization: Bearer $CRON_SECRET).
 *
 * Spoof note: x-vercel-cron is NOT a cryptographic proof of Vercel origin.
 * Prefer Bearer for anything that executes side effects beyond data refresh.
 */

export type CronAuthMode = "dual" | "bearer_only";

export function isVercelPlatformCron(request: Request): boolean {
  if (process.env["VERCEL"] !== "1") return false;
  const h = request.headers.get("x-vercel-cron");
  return h === "1" || h === "true";
}

function globalRequireBearer(): boolean {
  return process.env["CRON_REQUIRE_BEARER"]?.trim().toLowerCase() === "true";
}

function resolveMode(mode?: CronAuthMode): CronAuthMode {
  if (globalRequireBearer()) return "bearer_only";
  return mode ?? "dual";
}

/**
 * Returns null when authorized; else 401/500 NextResponse.
 */
export function cronAuthError(
  request: Request,
  options?: { readonly mode?: CronAuthMode },
): NextResponse | null {
  const mode = resolveMode(options?.mode);

  // Platform cron only in dual mode (and never when CRON_REQUIRE_BEARER=true).
  if (mode === "dual" && isVercelPlatformCron(request)) {
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

/** Bearer-only helper for autonomy / owner-adjacent crons. */
export function cronAuthErrorBearerOnly(request: Request): NextResponse | null {
  return cronAuthError(request, { mode: "bearer_only" });
}

/**
 * Same check as cronAuthError, but returns which secret matched (for telemetry).
 */
export function authorizeCronRequest(
  request: Request,
  options?: { readonly mode?: CronAuthMode },
): {
  ok: boolean;
  status: 200 | 401 | 500;
  matched: CronAuthMatched | "vercel_cron" | null;
  error?: string;
} {
  const mode = resolveMode(options?.mode);

  if (mode === "dual" && isVercelPlatformCron(request)) {
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
