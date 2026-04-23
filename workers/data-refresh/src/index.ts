/**
 * Data Refresh Worker — v5
 *
 * Fetches live odds every 30 minutes, enriches with game context
 * (opening lines, rest days, schedule density, ATS form), then scores picks.
 *
 * Pick generation is delegated to processSport() from @sports/ingestion-pipeline,
 * which is the single source of truth shared with the admin trigger-refresh route.
 * Settlement is delegated to settleResults() from the same package.
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
import { processSport, settleResults } from "@sports/ingestion-pipeline";

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

async function runSettlementCycle(): Promise<void> {
  const apiKey = process.env["THE_ODDS_API_KEY"];
  if (!apiKey) return;
  const gates = getReadinessGates();
  await settleResults({
    sports: SUPPORTED_SPORTS,
    apiKey,
    gates,
    logPrefix: "[data-refresh][settlement]",
  });
}

async function main(): Promise<void> {
  const gates = getReadinessGates();
  console.log("[data-refresh] Worker v5 starting...");
  console.log(`[data-refresh] Bootstrap mode: ${gates.isBootstrapMode}`);
  console.log(`[data-refresh] Derived history enabled: ${gates.canUseDerivedHistory}`);
  console.log(`[data-refresh] Featured promotion enabled: ${gates.canPromoteFeaturedPicks}`);

  // Recursive setTimeout rather than setInterval so cycles NEVER overlap.
  // If a cycle takes longer than REFRESH_INTERVAL_MS (rare but possible under
  // API throttling), the next cycle waits for the current one to finish. This
  // avoids concurrent ingestionRun rows and double-settlement races.
  const runAndSchedule = async (): Promise<void> => {
    try {
      await runRefreshCycle();
      await runSettlementCycle();
    } catch (err) {
      console.error(
        "[data-refresh] Unhandled error:",
        err instanceof Error ? err.message : err
      );
    } finally {
      setTimeout(runAndSchedule, REFRESH_INTERVAL_MS);
    }
  };

  await runAndSchedule();
}

main().catch((err) => {
  console.error("[data-refresh] Fatal:", err);
  process.exit(1);
});
