import { NextResponse } from "next/server";
import {
  extractBearerSecret,
  authorizeCronSecret,
  type CronAuthMatched,
} from "@sports/util";

/**
 * Shared cron authorization (HTTP SoT).
 *
 * Accepts EITHER (mode "dual" — board-fill / odds / free-spine and other
 * read-only probes only):
 *   1) Authorization: Bearer <CRON_...OUS>
 *   2) Vercel Cron platform: x-vercel-cron: 1 when VERCEL=1
 *
 * Default mode (no options passed) is "bearer_only" (GSE-SEC-016):
 *   Only the Bearer secret authorizes. The spoofed x-vercel-cron header is
 *   NOT accepted unless a route explicitly opts into "dual" mode. This makes
 *   side-effecting crons safe by default and turns the platform header into an
 *   explicit, per-route decision rather than a default bypass.
 *
 * Mode "dual" is reserved for read-only health-probe crons that must run from
 * the Vercel cron runner with no injected Authorization header. Routes that
 * execute mutations MUST NOT use dual.
 *
 * Env CRON_REQUIRE_BEARER=true forces bearer_only globally (founder opt-in
 * when Vercel is confirmed to inject Authorization: Bearer ***).
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

/**
 * Resolve effective auth mode.
 *
 * Default is "bearer_only" so that any caller not explicitly opting into
 * "dual" mode is not spoofable by x-vercel-cron (GSE-SEC-016). CRON_REQUIRE_BEARER=true
 * forces bearer_only globally regardless of the requested mode.
 */
function resolveMode(mode?: CronAuthMode): CronAuthMode {
  if (globalRequireBearer()) return "bearer_only";
  return mode ?? "bearer_only";
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
