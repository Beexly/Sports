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

import { db } from "@sports/db";
import {
  SUPPORTED_SPORTS,
  OddsApiClient,
  DataNormalizer,
  settleGameLogs,
} from "@sports/data-ingestion";
import {
  getReadinessGates,
  calculatePickResult,
} from "@sports/prediction-engine";
import { processSport } from "@sports/ingestion-pipeline";

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

async function settleResults(): Promise<void> {
  const apiKey = process.env["THE_ODDS_API_KEY"];
  if (!apiKey) return;

  const gates = getReadinessGates();
  const isBootstrap = !gates.canPersistCanonicalHistory;

  const client = new OddsApiClient(apiKey);
  const normalizer = new DataNormalizer();

  for (const sport of SUPPORTED_SPORTS) {
    try {
      const { data: scores } = await client.getScores(sport.key, 2);
      const normalized = normalizer.normalizeScores(scores);

      for (const score of normalized) {
        if (!score.completed) continue;
        const game = await db.game.findUnique({
          where: { externalId: score.externalId },
          include: { picks: { where: { result: "PENDING" } } },
        });
        if (!game) continue;

        await db.game.update({
          where: { id: game.id },
          data: { homeScore: score.homeScore, awayScore: score.awayScore, status: "FINAL" },
        });

        if (score.homeScore !== null && score.awayScore !== null) {
          // Settle pick results — always runs, regardless of bootstrap mode.
          // Real game outcomes are source truth and must be recorded.
          const settledAt = new Date();
          for (const pick of game.picks) {
            const result = calculatePickResult(
              pick.pickType as "SPREAD" | "MONEYLINE" | "TOTAL",
              pick.selection,
              pick.line,
              game.homeTeamName,
              score.homeScore,
              score.awayScore,
              sport.key
            );
            await db.pick.update({
              where: { id: pick.id },
              data: { result, settledAt },
            });

            // Record settlement outcome in the PickSignalSnapshot.
            // This is the outcome-anchored learning data: real result tied to the
            // signal conditions that were present at prediction time.
            // eligibleForLearning is set ONLY when:
            //   (1) canLearnFromOutcomes=true
            //   (2) pick was canonical (isBootstrap=false)
            //   (3) result is a decisive outcome (WIN/LOSS/PUSH — not VOID)
            const isDecisiveResult = result === "WIN" || result === "LOSS" || result === "PUSH";
            const isEligibleForLearning =
              gates.canLearnFromOutcomes &&
              !pick.isBootstrap &&
              isDecisiveResult;

            try {
              await db.pickSignalSnapshot.updateMany({
                where: { pickId: pick.id, settlementResult: null },
                data: {
                  settlementResult: result,
                  settledAt,
                  eligibleForLearning: isEligibleForLearning,
                  ...(isEligibleForLearning ? { learningEligibleAt: settledAt } : {}),
                },
              });
            } catch (snapErr) {
              // Non-fatal: snapshot update failure must never kill settlement
              console.warn(
                `[settlement] Snapshot outcome update failed for pick ${pick.id}: ` +
                `${snapErr instanceof Error ? snapErr.message : snapErr}`
              );
            }
          }

          // Write TeamGameLog entries for ATS form tracking.
          // isBootstrap propagated from current mode — marks creation era.
          // Data quality gate prevents corrupt ATS data from thin-coverage games.
          const openingSpreadOdds = await db.openingLine.findUnique({
            where: { gameId_market: { gameId: game.id, market: "SPREADS" } },
          });

          try {
            await settleGameLogs({
              gameId: game.id,
              homeTeam: game.homeTeamName,
              awayTeam: game.awayTeamName,
              sport: sport.key,
              gameDate: game.commenceTime,
              homeScore: score.homeScore,
              awayScore: score.awayScore,
              spread: openingSpreadOdds?.spread ?? null,
              isBootstrap,
              gameDataQualityScore: game.dataQualityScore,
              minDataQualityThreshold: gates.minDataQualityForGameLog,
            });
          } catch (settleErr) {
            console.warn(
              `[settlement] GameLog failed for ${game.id}: ` +
              `${settleErr instanceof Error ? settleErr.message : settleErr}`
            );
          }
        }
      }
    } catch (err) {
      console.error(`[settlement] ${sport.key}: ${err instanceof Error ? err.message : err}`);
    }
  }
}

async function main(): Promise<void> {
  const gates = getReadinessGates();
  console.log("[data-refresh] Worker v5 starting...");
  console.log(`[data-refresh] Bootstrap mode: ${gates.isBootstrapMode}`);
  console.log(`[data-refresh] Derived history enabled: ${gates.canUseDerivedHistory}`);
  console.log(`[data-refresh] Featured promotion enabled: ${gates.canPromoteFeaturedPicks}`);

  await runRefreshCycle();
  await settleResults();
  setInterval(async () => {
    try {
      await runRefreshCycle();
      await settleResults();
    } catch (err) {
      console.error("[data-refresh] Unhandled error:", err instanceof Error ? err.message : err);
    }
  }, REFRESH_INTERVAL_MS);
}

main().catch((err) => {
  console.error("[data-refresh] Fatal:", err);
  process.exit(1);
});
