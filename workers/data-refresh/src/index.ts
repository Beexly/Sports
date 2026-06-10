/**
 * Data Refresh Worker — v5
 *
 * Fetches live odds every 30 minutes, enriches with game context
 * (opening lines, rest days, schedule density, ATS form), then scores picks.
 *
 * Pick generation is delegated to processSport() from @sports/ingestion-pipeline,
 * which is the single source of truth shared with the admin trigger-refresh route.
 *
 * Settlement is delegated to settleOnce() from the same package (D-011): one
 * extracted core covering the scores pull, R-01 boundary grading, snapshot
 * mirrors, CLV writes (R-04 bet-time lock), the R-05 VOID sweep, and the
 * B-04 calibration-report regen trigger. The worker owns only its
 * loop/timing/env handling — the Vercel settle-picks cron calls the exact
 * same function, so the two execution paths can never drift.
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
import { processSport, settleOnce } from "@sports/ingestion-pipeline";

const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

async function runRefreshCycle(): Promise<void> {
  const apiKey = process.env["THE_ODDS_API_KEY"];
  if (!apiKey) throw new Error("THE_ODDS_API_KEY not set");

  // Read readiness gates fresh every cycle — env vars may change across deploys
  const gates = getReadinessGates();

  const bootstrapLabel = gates.isBootstrapMode ? " [BOOTSTRAP MODE]" : "";
  console.log(`[data-refresh] Cycle start ${new Date().toISOString()}${bootstrapLabel}`);

  if (gates.isBootstrapMode) {
    console.log(
      "[data-refresh] Bootstrap mode active: picks marked isBootstrap=true, " +
      "derived history (ATS/H2H/venue) excluded from scoring. " +
      "Set CANONICAL_HISTORY_ENABLED=true to begin accumulating canonical history."
    );
  }

  for (const sport of SUPPORTED_SPORTS) {
    await processSport(sport, apiKey, gates, "[data-refresh]");
    // Brief pause between sports to avoid saturating the API
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`[data-refresh] Cycle complete ${new Date().toISOString()}`);
}

/**
 * Settlement pass — delegated to the extracted settleOnce() core (D-011).
 * settleOnce never throws (fail-closed, stub-safe); the worker just logs the
 * structured result. Mirrors the previous in-worker settleResults() behavior:
 * skip silently when no API key is configured.
 */
async function runSettlementPass(): Promise<void> {
  const apiKey = process.env["THE_ODDS_API_KEY"];
  if (!apiKey) return;

  const result = await settleOnce({ apiKey, logPrefix: "[data-refresh]" });
  console.log(
    `[data-refresh] Settlement pass: ${result.settled} pick(s) settled, ` +
    `${result.voided} voided, ${result.failed}/${result.totalSports} sport(s) failed` +
    (result.providerStatus ? ` (${result.providerStatus})` : "")
  );
}

async function main(): Promise<void> {
  const gates = getReadinessGates();
  console.log("[data-refresh] Worker v5 starting...");
  console.log(`[data-refresh] Bootstrap mode: ${gates.isBootstrapMode}`);
  console.log(`[data-refresh] Derived history enabled: ${gates.canUseDerivedHistory}`);
  console.log(`[data-refresh] Featured promotion enabled: ${gates.canPromoteFeaturedPicks}`);

  await runRefreshCycle();
  await runSettlementPass();
  setInterval(async () => {
    try {
      await runRefreshCycle();
      await runSettlementPass();
    } catch (err) {
      console.error("[data-refresh] Unhandled error:", err instanceof Error ? err.message : err);
    }
  }, REFRESH_INTERVAL_MS);
}

main().catch((err) => {
  console.error("[data-refresh] Fatal:", err);
  process.exit(1);
});
