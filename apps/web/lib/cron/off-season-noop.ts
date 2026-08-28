/**
 * Off-season no-op short-circuit for FORWARD-LOOKING, billed cron routes.
 *
 * Why: the data-refresh worker already limits paid refresh work to
 * `getInSeasonSports()` (workers/data-refresh/src/index.ts:61). But the Vercel
 * cron *routes* still perform route-level work even when that list is empty —
 * auth, readiness-gate fetch, autonomous signal slate, shadow evaluation passes
 * over every supported sport, and healthcheck pings. During the off-season
 * (no in-season sport) that is wasted billed/compute work. The H-M cron no-op
 * audit (AGENT_LEDGER.md H-M) estimated ~60 such invocations/day saved.
 *
 * Safety contract (do NOT violate):
 *   - This applies ONLY to forward-looking, billed crons (refresh-odds,
 *     board-fill, generate-signal-slate, generate-drafts, ingest/refresh
 *     player-stats). Settlement is BACKWARD-LOOKING and must never season-gate
 *     — see apps/web/app/api/cron/settle-picks/route.ts:112-119 (an MLB World
 *     Series game played in November would otherwise never settle). Settlement
 *     routes must NOT import or call this helper.
 *   - An explicitly requested sport (?sport=...) always proceeds — the operator
 *     may be doing a manual backfill of an off-window sport.
 *
 * Pure + testable: `getInSeasonSports` is injected so callers can unit-test the
 * decision without importing the data-ingestion package's live env.
 */

import { getInSeasonSports } from "@sports/data-ingestion";

export interface OffSeasonNoopInput {
  /** Explicitly requested sport from the cron query string, if any. */
  readonly requestedSport: string | null;
  /** Injectable; defaults to the live data-ingestion function. */
  readonly getInSeason?: () => readonly { readonly key: string }[];
}

/**
 * True when the route should short-circuit as an off-season no-op:
 * no sport explicitly requested AND zero sports currently in season.
 */
export function isOffSeasonNoop(input: OffSeasonNoopInput): boolean {
  if (input.requestedSport) return false;
  const inSeason = (input.getInSeason ?? getInSeasonSports)();
  return inSeason.length === 0;
}

/** A consistent, machine-readable response body for an off-season no-op. */
export function offSeasonNoopResponse(requestedSport: string | null) {
  return {
    ok: true,
    skipped: "off-season-noop",
    refreshed: false,
    requestedSport: requestedSport ?? null,
    reason:
      "No sport explicitly requested and zero sports currently in season — " +
      "forward-looking refresh short-circuited (settlement is unaffected).",
  };
}
