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

import { execFile } from "node:child_process";
import * as path from "node:path";
import { promisify } from "node:util";
import { db } from "@sports/db";
import {
  SUPPORTED_SPORTS,
  MARKETS,
  OddsApiClient,
  DataNormalizer,
  settleGameLogs,
  captureClosingLine,
  pickClosingValues,
  marketForPickType,
  DEFAULT_CLOSING_REF,
} from "@sports/data-ingestion";
import type { OddsApiEvent } from "@sports/types";
import {
  getReadinessGates,
  calculatePickResult,
  homePerspectiveLine,
  computeClv,
  clvBetSideFor,
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

      // CLV closing-line capture (additive, fail-closed): one odds pull per
      // sport, used as the best-available near-kickoff "close" reference for
      // the games settling this cycle. A failure here must NEVER block
      // settlement, so it is fully isolated and degrades to an empty map
      // (CLV simply not computed → pick clv* columns stay NULL).
      const closingEventsByExternalId = new Map<string, OddsApiEvent>();
      try {
        const { data: closingEvents } = await client.getOdds(sport.key, [...MARKETS]);
        for (const ev of closingEvents) closingEventsByExternalId.set(ev.id, ev);
      } catch (oddsErr) {
        console.warn(
          `[clv] closing-odds pull skipped for ${sport.key}: ` +
            `${oddsErr instanceof Error ? oddsErr.message : oddsErr}`
        );
      }

      for (const score of normalized) {
        if (!score.completed) continue;
        const game = await db.game.findUnique({
          where: { externalId: score.externalId },
          include: {
            picks: {
              where: { result: "PENDING" },
              // signalSnapshot carries the immutable bet-time line lock
              // (lineAtPrediction/selectionAtPrediction) used by CLV (R-04).
              include: { signalSnapshot: true },
            },
          },
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
            const pickType = pick.pickType as "SPREAD" | "MONEYLINE" | "TOTAL";
            // R-01 boundary contract (D-010): Pick.line is persisted from the
            // CHOSEN side's perspective; calculatePickResult expects the HOME
            // perspective. Convert at this boundary — feeding a chosen-side
            // away line directly inverts every away SPREAD grade.
            const result = calculatePickResult(
              pickType,
              pick.selection,
              homePerspectiveLine(pickType, pick.selection, pick.line, game.homeTeamName),
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

          // CLV capture + per-pick compute (additive shadow, fail-closed).
          // Snapshot the best-available pre-kickoff close for this game, then
          // compute Closing-Line Value for each pick settled this cycle and
          // write it to the NULLABLE pick.clv* columns. Nothing here changes
          // the published confidence/tier/grade/result or MODEL_VERSION.
          // The entire block is non-fatal: any failure leaves clv* NULL.
          try {
            const closingEvent = closingEventsByExternalId.get(score.externalId);
            if (closingEvent) {
              await captureClosingLine({
                gameId: game.id,
                event: closingEvent,
                fetchedAt: settledAt,
              });

              for (const pick of game.picks) {
                const pickType = pick.pickType as "SPREAD" | "MONEYLINE" | "TOTAL";

                // R-04 bet-time line lock: CLV compares the close to the
                // line/selection as PUBLISHED (immutable snapshot), never the
                // drifted last-refresh pick.line. No locked line → no CLV
                // (degrade-to-null, never a fabricated honesty metric).
                const lockedLine = pick.signalSnapshot?.lineAtPrediction ?? null;
                const lockedSelection =
                  pick.signalSnapshot?.selectionAtPrediction ?? pick.selection;
                if (lockedLine === null) continue;

                const side = clvBetSideFor(pickType, lockedSelection, game.homeTeamName);
                const market = marketForPickType(pickType);

                const closingRow = await db.closingLine.findUnique({
                  where: {
                    gameId_market_closingRef: {
                      gameId: game.id,
                      market,
                      closingRef: DEFAULT_CLOSING_REF,
                    },
                  },
                });

                const { closingLine, closingPrice, isStale } = pickClosingValues(
                  closingRow,
                  pickType,
                  side
                );

                // R-01 boundary contract (D-010): the locked line keeps
                // chosen-side semantics; computeClv expects HOME perspective
                // (the closing consensus spread is home-perspective). Convert
                // here — the SAME convention as settlement above.
                // For SPREAD/TOTAL the locked line is the bet line; price is
                // vig-assumed (not stored), so price CLV is left to moneyline.
                // For MONEYLINE the locked line IS the American price.
                const clv = computeClv({
                  betSide: side,
                  betLine:
                    pickType === "MONEYLINE"
                      ? null
                      : homePerspectiveLine(pickType, lockedSelection, lockedLine, game.homeTeamName),
                  closingLine,
                  betPrice: pickType === "MONEYLINE" ? lockedLine : null,
                  closingPrice,
                  isStale,
                });

                // Only write when at least one axis produced a value — a fully
                // null result leaves the columns untouched (degrade-to-null).
                if (clv.clvPoints !== null || clv.clvCents !== null) {
                  await db.pick.update({
                    where: { id: pick.id },
                    data: {
                      closingLine,
                      closingPrice,
                      clvPoints: clv.clvPoints,
                      clvCents: clv.clvCents,
                      clvPositive: clv.clvPositive,
                      clvComputedAt: settledAt,
                    },
                  });
                }
              }
            }
          } catch (clvErr) {
            console.warn(
              `[clv] capture/compute failed for ${game.id}: ` +
              `${clvErr instanceof Error ? clvErr.message : clvErr}`
            );
          }
        }
      }
    } catch (err) {
      console.error(`[settlement] ${sport.key}: ${err instanceof Error ? err.message : err}`);
    }
  }
}

const execFileAsync = promisify(execFile);

// Resolved relative to this file so it works from both src (ts-node) and the
// compiled dist output — both sit three levels below the repo root.
const CALIBRATION_REPORT_SCRIPT = path.resolve(
  __dirname,
  "../../../scripts/generate-calibration-report.mjs"
);

/**
 * Regenerate _launch/CALIBRATION_REPORT.md after settlement (B-04).
 *
 * Same guarded pattern as the CLV/gate-decision writes: strictly additive,
 * fully non-fatal. The generator runs as an isolated child process so even a
 * crash inside it cannot touch worker state or block settlement. The script
 * itself is stub-safe (no DATABASE_URL → honest empty report) and read-only
 * against the DB.
 */
async function regenerateCalibrationReport(): Promise<void> {
  try {
    await execFileAsync(process.execPath, [CALIBRATION_REPORT_SCRIPT], {
      timeout: 120_000,
      windowsHide: true,
    });
    console.log("[calibration-report] regenerated after settlement.");
  } catch (err) {
    console.warn(
      "[calibration-report] regeneration failed (non-fatal): " +
        `${err instanceof Error ? err.message : err}`
    );
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
  await regenerateCalibrationReport();
  setInterval(async () => {
    try {
      await runRefreshCycle();
      await settleResults();
      await regenerateCalibrationReport();
    } catch (err) {
      console.error("[data-refresh] Unhandled error:", err instanceof Error ? err.message : err);
    }
  }, REFRESH_INTERVAL_MS);
}

main().catch((err) => {
  console.error("[data-refresh] Fatal:", err);
  process.exit(1);
});
