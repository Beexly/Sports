/**
 * Data Refresh Worker — v5
 *
 * Fetches live odds every 30 minutes, enriches with game context
 * (opening lines, rest days, schedule density, ATS form), then scores picks.
 *
 * Pick generation is delegated to processSport() from @sports/ingestion-pipeline,
 * which is the single source of truth shared with the admin trigger-refresh route.
 *
 * Bootstrap safety: reads PlatformConfig on every cycle. Behavior gates:
 *   - DERIVED_MODEL_HISTORY_ENABLED: controls whether ATS/H2H/venue form
 *     influence scoring. When false, only canonical market signals are used.
 *   - CANONICAL_HISTORY_ENABLED: controls isBootstrap flag on new picks and
 *     TeamGameLog entries. When false, all writes are marked bootstrap.
 *   - FEATURED_PICK_PROMOTION_ENABLED: when false, isFeatured=false for all picks.
 *   - OUTCOME_LEARNING_ENABLED: when true, settled canonical snapshots become
 *     eligibleForLearning=true, enabling future outcome-anchored calibration.
 *
 * Intelligence architecture (v5):
 *   Layer 1 — External truth: sportsbook odds, lines, market depth
 *   Layer 2 — Derived signals: schedule density, line movement, rest/B2B
 *   Layer 3 — Guarded history: canonical ATS/H2H form (gated by flags)
 *   Learning: PickSignalSnapshot captures prediction-time signal state;
 *             future calibration reads snapshots joined to settled outcomes.
 */

import { SUPPORTED_SPORTS } from "@sports/data-ingestion";
import { getReadinessGates } from "@sports/prediction-engine";
import { settleSport } from "@sports/ingestion-pipeline";
// The per-cycle paid refresh (governed by the C-109 credit governor) lives in
// its own module so it can be unit-tested without starting this loop.
import { runRefreshCycle } from "./refresh-cycle.js";

const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

async function settleResults(): Promise<void> {
  const apiKey = process.env["THE_ODDS_API_KEY"];
  if (!apiKey) return;

  // Settlement is delegated to settleSport() from @sports/ingestion-pipeline —
  // the same grader the Vercel settle-picks cron uses, so the two paths cannot
  // drift. C-109: the paid scores fetch now needs an explicit per-sport
  // justification from the free pass (overdue NO_FINAL picks). This worker has
  // no free pass of its own, so it passes none and settleSport returns the
  // "spend_guard" note for every sport; the cron (the primary scheduler)
  // supplies the justification and spends the credits.
  const gates = getReadinessGates();
  let failed = 0;
  for (const sport of SUPPORTED_SPORTS) {
    const result = await settleSport(sport, apiKey, gates, "[settlement]", {
      paidScoresJustifiedSports: new Set<string>(),
    });
    if (result.status === "failed") failed += 1;
    // Brief pause between sports to avoid saturating the scores endpoint.
    await new Promise((r) => setTimeout(r, 750));
  }
  if (failed > 0) {
    console.error(`[settlement] ${failed}/${SUPPORTED_SPORTS.length} sports FAILED settlement this cycle.`);
  }
}

// Graceful shutdown: `docker stop` sends SIGTERM (10s grace, then SIGKILL). An
// idle worker exits immediately; a mid-cycle worker finishes the cycle and exits
// from the loop's `finally`, so IngestionRun rows aren't abandoned in RUNNING.
let shuttingDown = false;
let pendingTimer: NodeJS.Timeout | null = null;
let cycleInFlight = false;

function requestShutdown(signal: string): void {
  console.log(`[data-refresh] ${signal} received — ${cycleInFlight ? "finishing current cycle, then exiting" : "exiting"}.`);
  shuttingDown = true;
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  if (!cycleInFlight) process.exit(0);
}
process.on("SIGTERM", () => requestShutdown("SIGTERM"));
process.on("SIGINT", () => requestShutdown("SIGINT"));

async function main(): Promise<void> {
  const gates = getReadinessGates();
  console.log("[data-refresh] Worker v5 starting...");
  console.log(`[data-refresh] Bootstrap mode: ${gates.isBootstrapMode}`);
  console.log(`[data-refresh] Derived history enabled: ${gates.canUseDerivedHistory}`);
  console.log(`[data-refresh] Featured promotion enabled: ${gates.canPromoteFeaturedPicks}`);

  // Startup readiness check. processSport catches its own errors (returning
  // status:"failed"), so a bad API key doesn't throw — it fails every sport. If
  // the ENTIRE first cycle fails, exit non-zero so the deploy is visibly broken
  // instead of logging "Cycle complete" with zero picks forever.
  const first = await runRefreshCycle();
  if (first.total > 0 && first.failed === first.total) {
    throw new Error(
      `startup readiness check failed: all ${first.total} in-season sports failed the first cycle ` +
      "(likely an invalid THE_ODDS_API_KEY, exhausted quota, or an upstream/DB outage)"
    );
  }
  await settleResults();

  // Recurring cycles are self-scheduling: the next cycle is armed only AFTER the
  // previous one has fully settled. setInterval fires on a fixed clock regardless
  // of whether the prior async callback resolved, so under degraded upstream
  // conditions (retries/backoff across ~7 sports) a slow cycle would overlap the
  // next — doubling Odds API request volume and racing concurrent creates on the
  // immutable PickSignalSnapshot rows. Re-arming after await makes overlap impossible.
  const scheduleNextCycle = (): void => {
    if (shuttingDown) return;
    pendingTimer = setTimeout(async () => {
      cycleInFlight = true;
      try {
        await runRefreshCycle();
        await settleResults();
      } catch (err) {
        console.error("[data-refresh] Unhandled error:", err instanceof Error ? err.message : err);
      } finally {
        cycleInFlight = false;
        if (shuttingDown) {
          console.log("[data-refresh] Cycle finished during shutdown — exiting.");
          process.exit(0);
        }
        scheduleNextCycle();
      }
    }, REFRESH_INTERVAL_MS);
  };

  scheduleNextCycle();
}

main().catch((err) => {
  console.error("[data-refresh] Fatal:", err);
  process.exit(1);
});
