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
 * records the quota reading and one marker per additional paid request; once
 * a response reports fewer than ODDS_API_LOW_QUOTA_THRESHOLD credits the rest
 * of the cycle is skipped, the same cutoff `refreshOdds()` applies.
 */

import { getInSeasonSports } from "@sports/data-ingestion";
import { getReadinessGates } from "@sports/prediction-engine";
import {
  processSport,
  governedDecision,
  isLowQuota,
  recordPaidRunAccounting,
  resolvePaidOddsGovernor,
  type ProcessSportResult,
} from "@sports/ingestion-pipeline";

const LOG_PREFIX = "[data-refresh]";

/** Pause between sports so the vendor never sees a burst. */
const INTER_SPORT_PAUSE_MS = 1000;

export interface CycleSummary {
  /** Sports whose paid processSport call ran this cycle (a call that threw included). */
  readonly total: number;
  /** Of those, sports that returned status "failed" or whose call threw. */
  readonly failed: number;
  /** Sports the credit governor held this cycle (no paid request made). */
  readonly held: number;
  /**
   * Sports not started because an earlier response in this cycle reported
   * fewer than ODDS_API_LOW_QUOTA_THRESHOLD credits remaining (no paid
   * request made for them).
   */
  readonly skipped: number;
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
  // processSport catches provider/normalization failures (status:"failed"), but
  // its ingestion-run insert runs before that handler and can reject; a
  // rejection counts that sport as failed and the cycle goes on, so one sport
  // can never leave the rest unprocessed or the cycle without a summary.
  const sports = getInSeasonSports();
  let total = 0;
  let failed = 0;
  let held = 0;
  let skipped = 0;
  for (let i = 0; i < sports.length; i++) {
    const sport = sports[i]!;
    // A governor that answered allow has reserved the slot and marked the
    // first request; one that was unavailable (fail-open) has not, and the
    // accounting below then marks every request of the run.
    let slotReserved = true;
    if (governor) {
      const decision = await governedDecision(governor, sport.key);
      if (!decision.allow) {
        console.info(
          `${LOG_PREFIX} ${sport.key}: paid odds fetch skipped, credit governor: ${decision.reason}`,
        );
        held += 1;
        continue;
      }
      slotReserved = decision.reserved;
    }
    total += 1;
    let result: ProcessSportResult;
    try {
      result = await processSport(sport, apiKey, gates, LOG_PREFIX);
    } catch (err) {
      failed += 1;
      console.error(
        `${LOG_PREFIX} ${sport.key}: processSport threw — ` +
          `${err instanceof Error ? err.message : String(err)}`,
      );
      await new Promise((r) => setTimeout(r, INTER_SPORT_PAUSE_MS));
      continue;
    }
    if (result.status === "failed") failed += 1;
    if (governor) {
      await recordPaidRunAccounting(governor, sport.key, result, { reserved: slotReserved });
    }
    // Same proactive cutoff as refreshOdds: once the vendor reports a
    // near-exhausted budget, stop starting new sports this cycle. Skipped,
    // not silently dropped, so the summary says what did not run and why.
    if (isLowQuota(result)) {
      skipped = sports.length - i - 1;
      console.warn(
        `${LOG_PREFIX} ${sport.key}: only ${result.oddsApiRemainingRequests} Odds API credits left — ` +
          `skipping the remaining ${skipped} in-season sport(s) this cycle`,
      );
      break;
    }
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
      `(${total - failed}/${total} sports ok, ${held} held by the credit governor, ` +
      `${skipped} skipped on low quota)`,
  );
  return { total, failed, held, skipped };
}
