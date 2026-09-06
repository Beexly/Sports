/**
 * One data-refresh cycle: every in-season sport through `processSport()` with
 * the paid The Odds API key, paced by the C-109 credit governor exactly like
 * the `refreshOdds()` loop behind the cron routes.
 *
 * Lives apart from index.ts (which starts the worker loop at load) so the
 * cycle can be unit-tested without a running worker. The governor is the
 * pipeline's default ledger-backed one, built once per cycle and failing open
 * on construction failure; a held sport is skipped and logged with the
 * governor's reason; after each paid call the pipeline's own accounting
 * records the quota reading and one marker per additional paid request.
 */

import { getInSeasonSports } from "@sports/data-ingestion";
import { getReadinessGates } from "@sports/prediction-engine";
import {
  processSport,
  governedDecision,
  recordPaidRunAccounting,
  resolvePaidOddsGovernor,
} from "@sports/ingestion-pipeline";

const LOG_PREFIX = "[data-refresh]";

/** Pause between sports so the vendor never sees a burst. */
const INTER_SPORT_PAUSE_MS = 1000;

export interface CycleSummary {
  /** Sports whose paid processSport call ran this cycle. */
  readonly total: number;
  /** Of those, sports that returned status "failed". */
  readonly failed: number;
  /** Sports the credit governor held this cycle (no paid request made). */
  readonly held: number;
}

export async function runRefreshCycle(): Promise<CycleSummary> {
  const apiKey = process.env["THE_ODDS_API_KEY"];
  if (!apiKey) throw new Error("THE_ODDS_API_KEY not set");

  // Read readiness gates fresh every cycle — env vars may change across deploys
  const gates = getReadinessGates();

  const bootstrapLabel = gates.isBootstrapMode ? " [BOOTSTRAP MODE]" : "";
  console.log(`${LOG_PREFIX} Cycle start ${new Date().toISOString()}${bootstrapLabel}`);

  if (gates.isBootstrapMode) {
    console.log(
      `${LOG_PREFIX} Bootstrap mode active: picks marked isBootstrap=true, ` +
        "derived history (ATS/H2H/venue) excluded from scoring. " +
        "Set CANONICAL_HISTORY_ENABLED=true to begin accumulating canonical history.",
    );
  }

  // C-109: this worker's processSport calls spend paid credits exactly like the
  // refresh-odds cron's, so they answer to the same default ledger-backed
  // governor. Built once per cycle; a governor that cannot be constructed
  // fails open (logged) rather than blanking the board.
  const governor = resolvePaidOddsGovernor(undefined, LOG_PREFIX);

  // In-season sports only (cost control). Override: ODDS_REFRESH_ALL_SPORTS=true.
  // processSport never throws (it returns status:"failed"), so failures are
  // aggregated here — a fully-failed cycle must be loud, not "Cycle complete".
  let total = 0;
  let failed = 0;
  let held = 0;
  for (const sport of getInSeasonSports()) {
    if (governor) {
      const decision = await governedDecision(governor, sport.key);
      if (!decision.allow) {
        console.info(
          `${LOG_PREFIX} ${sport.key}: paid odds fetch skipped, credit governor: ${decision.reason}`,
        );
        held += 1;
        continue;
      }
    }
    const result = await processSport(sport, apiKey, gates, LOG_PREFIX);
    total += 1;
    if (result.status === "failed") failed += 1;
    if (governor) await recordPaidRunAccounting(governor, sport.key, result);
    // Brief pause between sports to avoid saturating the API
    await new Promise((r) => setTimeout(r, INTER_SPORT_PAUSE_MS));
  }

  if (failed > 0) {
    console.error(
      `${LOG_PREFIX} ${failed}/${total} in-season sports FAILED this cycle — ` +
        "check THE_ODDS_API_KEY validity, API quota, and upstream status.",
    );
  }
  console.log(
    `${LOG_PREFIX} Cycle complete ${new Date().toISOString()} ` +
      `(${total - failed}/${total} sports ok, ${held} held by the credit governor)`,
  );
  return { total, failed, held };
}
