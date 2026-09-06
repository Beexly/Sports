/**
 * Shared admin "Trigger Data Refresh" fan-out (SEC-01).
 *
 * WHY THIS EXISTS: the admin dashboard's server action used to fetch its own
 * POST /api/admin/trigger-refresh without a session cookie — a dead call that
 * always 403'd, and an unauthenticated "use server" RPC besides. Both surfaces
 * now call this one function directly under their own auth + rate limit:
 *   - the API route (request context: session check + per-admin limiter), and
 *   - the server action (requireAdminActor + the same per-admin limiter).
 *
 * Bill sensitivity: this fans out to The Odds API for EVERY in-season sport.
 * That bills per call — callers MUST apply the shared 10/min per-admin limiter
 * (key "admin-trigger-refresh") before invoking.
 */

import { getInSeasonSports } from "@sports/data-ingestion";
import { getReadinessGates } from "@sports/prediction-engine";
import { processSport, type ProcessSportResult } from "@sports/ingestion-pipeline";

export const ADMIN_TRIGGER_REFRESH_RATE_KEY = "admin-trigger-refresh";
export const ADMIN_TRIGGER_REFRESH_LIMIT = 10;
export const ADMIN_TRIGGER_REFRESH_WINDOW_MS = 60_000;

export type AdminRefreshOutcome =
  | { ok: false; status: 503; error: string }
  | { ok: true; results: ProcessSportResult[] };

export async function executeAdminRefresh(tag = "[trigger-refresh]"): Promise<AdminRefreshOutcome> {
  const apiKey = process.env["THE_ODDS_API_KEY"];
  if (!apiKey) {
    return { ok: false, status: 503, error: "THE_ODDS_API_KEY not configured" };
  }

  // Read gates once — identical to how the scheduled worker reads them.
  // processSport() derives isBootstrap from these gates internally, ensuring
  // provenance (isBootstrap, GameSignal.isBootstrap) is correct regardless of
  // which ingestion path triggers the refresh.
  const gates = getReadinessGates();

  // GSE-SEC-040: season-gate the bulk refresh so out-of-season sports are not
  // billed against the paid Odds API quota. Mirrors the scheduled worker in
  // refresh-odds.ts which calls getInSeasonSports(). The ODDS_REFRESH_ALL_SPORTS
  // env override still forces all sports for backfills (read inside
  // getInSeasonSports), so no admin workflow is lost.
  const sports = getInSeasonSports();
  const results: ProcessSportResult[] = [];
  for (const sport of sports) {
    results.push(await processSport(sport, apiKey, gates, tag));
  }

  return { ok: true, results };
}
