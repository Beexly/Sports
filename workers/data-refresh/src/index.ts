/**
 * Data Refresh Worker — v5
 *
 * Fetches live odds every 30 minutes, enriches with game context
 * (opening lines, rest days, schedule density, ATS form), then scores picks.
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
  OddsApiClient,
  DataNormalizer,
  SUPPORTED_SPORTS,
  MARKETS,
  enrichGameContext,
  getAtsForm,
  getHeadToHeadForm,
  settleGameLogs,
} from "@sports/data-ingestion";
import {
  scoreGames,
  calculatePickResult,
  getReadinessGates,
  buildPickSignalSnapshot,
} from "@sports/prediction-engine";
import type { OddsInput, GameContextInput } from "@sports/types";

const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

async function runRefreshCycle(): Promise<void> {
  const apiKey = process.env["THE_ODDS_API_KEY"];
  if (!apiKey) throw new Error("THE_ODDS_API_KEY not set");

  // Read readiness gates fresh every cycle — env vars may change across deploys
  const gates = getReadinessGates();

  const client = new OddsApiClient(apiKey);
  const normalizer = new DataNormalizer();

  // Bootstrap flag derived once per cycle — gates pick creation, GameSignal writes,
  // TeamGameLog writes, and PickSignalSnapshot provenance.
  const isBootstrap = !gates.canPersistCanonicalHistory;

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
    const run = await db.ingestionRun.create({
      data: { sport: sport.key, status: "RUNNING" },
    });

    try {
      const { data: events, remainingRequests } = await client.getOdds(sport.key, [...MARKETS]);
      const fetchedAt = new Date();

      console.log(`[data-refresh] ${sport.key}: ${events.length} events, ${remainingRequests} requests remaining`);

      if (!normalizer.validateFreshness(fetchedAt)) {
        throw new Error("Freshness validation failed");
      }

      const normalizedGames = normalizer.normalizeGames(events);
      const normalizedOdds = normalizer.normalizeOdds(events, fetchedAt);

      const sportRecord = await db.sport.upsert({
        where: { key: sport.key },
        create: { key: sport.key, name: sport.name, displayName: sport.displayName },
        update: {},
      });

      // Upsert all games first
      const gameRecords: Record<string, { id: string; homeTeamName: string; awayTeamName: string; commenceTime: Date }> = {};
      for (const game of normalizedGames) {
        const record = await db.game.upsert({
          where: { externalId: game.externalId },
          create: {
            externalId: game.externalId,
            sportId: sportRecord.id,
            homeTeamName: game.homeTeam,
            awayTeamName: game.awayTeam,
            commenceTime: game.commenceTime,
          },
          update: {
            homeTeamName: game.homeTeam,
            awayTeamName: game.awayTeam,
            commenceTime: game.commenceTime,
          },
        });
        gameRecords[game.externalId] = record;
      }

      // Ingest odds
      let oddsInserted = 0;
      for (const odds of normalizedOdds) {
        const game = gameRecords[odds.gameExternalId];
        if (!game) continue;
        await db.odds.create({
          data: {
            gameId: game.id,
            ingestionRunId: run.id,
            bookmaker: odds.bookmaker,
            market: odds.market,
            homePrice: odds.homePrice,
            awayPrice: odds.awayPrice,
            drawPrice: odds.drawPrice,
            spread: odds.spread,
            homeSpreadPrice: odds.homeSpreadPrice,
            awaySpreadPrice: odds.awaySpreadPrice,
            total: odds.total,
            overPrice: odds.overPrice,
            underPrice: odds.underPrice,
            fetchedAt: odds.fetchedAt,
          },
        });
        oddsInserted++;
      }

      // Build OddsInputs with game context
      const oddsInputs: OddsInput[] = [];
      for (const game of normalizedGames) {
        const gameRecord = gameRecords[game.externalId];
        if (!gameRecord) continue;

        const gameOdds = normalizedOdds.filter((o) => o.gameExternalId === game.externalId);
        const bookmakerKeys = new Set(gameOdds.map((o) => o.bookmaker));
        const bookmakerCoverageMax = bookmakerKeys.size;

        // Compute avg spread and total for context
        const spreadOdds = gameOdds.filter((o) => o.market === "SPREADS" && o.spread !== undefined);
        const totalOdds = gameOdds.filter((o) => o.market === "TOTALS" && o.total !== undefined);
        const avgSpread =
          spreadOdds.length > 0
            ? spreadOdds.reduce((s, o) => s + (o.spread ?? 0), 0) / spreadOdds.length
            : null;
        const avgTotal =
          totalOdds.length > 0
            ? totalOdds.reduce((s, o) => s + (o.total ?? 0), 0) / totalOdds.length
            : null;
        const hasH2HMarket = gameOdds.some((o) => o.market === "H2H");

        // Run context enrichment (opening lines, rest days, schedule density, data quality)
        try {
          await enrichGameContext({
            gameId: gameRecord.id,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            sport: sport.key,
            commenceTime: game.commenceTime,
            avgSpread,
            avgTotal,
            bookmakerCoverageMax,
            fetchedAt,
            hasSpreadMarket: spreadOdds.length > 0,
            hasTotalMarket: totalOdds.length > 0,
            hasH2HMarket,
            isBootstrap, // propagate for GameSignal provenance tracking
          });
        } catch (enrichErr) {
          // Non-fatal — picks still generated without context
          console.warn(`[data-refresh] Enrichment failed for ${game.externalId}: ${enrichErr instanceof Error ? enrichErr.message : enrichErr}`);
        }

        // Reload game record to get updated context fields
        const enrichedGame = await db.game.findUnique({ where: { id: gameRecord.id } });

        // Derived history gate: only fetch ATS/H2H form when the flag is on.
        // When off, all historical factors are null → scoring treats them as 0 (neutral).
        // When on, use canonicalOnly=true so bootstrap-era logs never enter canonical scoring.
        const [
          homeAtsForm,
          awayAtsForm,
          homeAtsFormAtHome,
          awayAtsFormAway,
          homeH2HForm,
        ] = gates.canUseDerivedHistory
          ? await Promise.all([
              getAtsForm(game.homeTeam, sport.key, 15, undefined, true).catch(() => null),
              getAtsForm(game.awayTeam, sport.key, 15, undefined, true).catch(() => null),
              getAtsForm(game.homeTeam, sport.key, 15, "HOME", true).catch(() => null),
              getAtsForm(game.awayTeam, sport.key, 15, "AWAY", true).catch(() => null),
              getHeadToHeadForm(game.homeTeam, game.awayTeam, sport.key, 10, true).catch(() => null),
            ])
          : [null, null, null, null, null];

        const freshnessMinutes = (Date.now() - fetchedAt.getTime()) / 60_000;

        const context: GameContextInput = {
          openingSpread: enrichedGame?.openingSpread ?? avgSpread,
          currentSpread: avgSpread,
          openingTotal: enrichedGame?.openingTotal ?? avgTotal,
          currentTotal: avgTotal,
          restDaysHome: enrichedGame?.restDaysHome ?? null,
          restDaysAway: enrichedGame?.restDaysAway ?? null,
          isBackToBackHome: enrichedGame?.isBackToBackHome ?? false,
          isBackToBackAway: enrichedGame?.isBackToBackAway ?? false,
          // Schedule density (v5) — from enriched game, computed from all TeamGameLog
          // entries regardless of bootstrap state (physical schedule reality).
          scheduleDensityHome: enrichedGame?.scheduleDensityHome ?? null,
          scheduleDensityAway: enrichedGame?.scheduleDensityAway ?? null,
          // Historical signals — only wired in when derived history is enabled.
          // When null, computeGameContext returns 0 for these factors (neutral).
          homeAtsForm: homeAtsForm ?? null,
          awayAtsForm: awayAtsForm ?? null,
          // Venue-specific splits (v4)
          homeAtsFormAtHome: homeAtsFormAtHome ?? null,
          awayAtsFormAway: awayAtsFormAway ?? null,
          // H2H from home team's perspective — scoring engine reads picked-side form
          headToHeadForm: homeH2HForm ?? null,
          bookmakerCoverageMax,
          dataFreshnessMinutes: freshnessMinutes,
          hasSpreadMarket: spreadOdds.length > 0,
          hasTotalMarket: totalOdds.length > 0,
          hasH2HMarket,
        };

        oddsInputs.push({
          gameId: gameRecord.id,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          commenceTime: game.commenceTime,
          sport: sport.name,
          bookmakerOdds: gameOdds.map((o) => ({
            bookmaker: o.bookmaker,
            market: o.market,
            homePrice: o.homePrice,
            awayPrice: o.awayPrice,
            spread: o.spread,
            homeSpreadPrice: o.homeSpreadPrice,
            awaySpreadPrice: o.awaySpreadPrice,
            total: o.total,
            overPrice: o.overPrice,
            underPrice: o.underPrice,
          })),
          context,
        });
      }

      const scoredPicks = scoreGames(oddsInputs, fetchedAt);
      let picksGenerated = 0;

      for (const pick of scoredPicks) {
        // Fields refreshed on every cycle (confidence, odds, reasoning).
        // result and settledAt are intentionally absent — never overwritten by refresh.
        // ingestionRunId is intentionally absent from update — preserves creation run ID.
        // isFeatured is intentionally absent from update — promotion is set only on create
        //   and re-evaluated below; we don't downgrade featured status mid-life.
        const pickUpdateData = {
          selection: pick.selection,
          line: pick.line,
          confidence: pick.confidence,
          edgeScore: pick.edgeScore,
          consensusPct: pick.consensusPct,
          bookmakerCount: pick.bookmakerCount,
          tier: pick.tier,
          pickGrade: pick.pickGrade,
          riskLevel: pick.riskLevel,
          reasoning: pick.reasoning,
          reasoningShort: pick.reasoningShort,
          factorBreakdown: JSON.parse(JSON.stringify(pick.factorBreakdown)),
          modelVersion: pick.modelVersion,
          dataFreshnessAt: pick.dataFreshnessAt,
        };

        // Featured promotion gate: only auto-promote when explicitly enabled.
        // In bootstrap mode, no pick is featured — grades are uncalibrated.
        const isFeatured =
          gates.canPromoteFeaturedPicks &&
          (pick.pickGrade === "ELITE_PLAY" ||
            (pick.pickGrade === "STRONG_PLAY" && pick.confidence >= 80));

        // Upsert by the DB-enforced unique key [gameId, pickType].
        // Create sets origin fields (ingestionRunId, isBootstrap, isFeatured).
        // Update never changes isBootstrap — creation era is immutable.
        const upsertedPick = await db.pick.upsert({
          where: { gameId_pickType: { gameId: pick.gameId, pickType: pick.pickType } },
          create: {
            gameId: pick.gameId,
            pickType: pick.pickType,
            ingestionRunId: run.id,
            isBootstrap,
            isFeatured,
            ...pickUpdateData,
          },
          update: {
            ...pickUpdateData,
            // Re-evaluate featured status on each refresh when promotion is enabled.
            // If promotion is disabled, clear featured status on existing picks.
            isFeatured,
          },
        });
        picksGenerated++;

        // Capture PickSignalSnapshot — immutable record of signal state at prediction time.
        // Created ONCE (update: {} ensures existing snapshots are never overwritten).
        // This is the foundation for future outcome-anchored calibration:
        // "Given these signals at prediction time, what was the real win rate?"
        try {
          // Find the OddsInput context that was used for this pick
          const oddsInputForPick = oddsInputs.find((o) => o.gameId === pick.gameId);
          const snapshotData = buildPickSignalSnapshot(
            upsertedPick.id,
            pick,
            oddsInputForPick?.context,
            isBootstrap,
            // usedDerivedHistory = gate was on AND at least one ATS signal was non-null
            gates.canUseDerivedHistory && (
              oddsInputForPick?.context?.homeAtsForm != null ||
              oddsInputForPick?.context?.awayAtsForm != null ||
              oddsInputForPick?.context?.headToHeadForm != null
            ),
          );
          await db.pickSignalSnapshot.upsert({
            where: { pickId: upsertedPick.id },
            create: snapshotData,
            update: {}, // immutable — never overwrite an existing snapshot
          });
        } catch (snapErr) {
          // Non-fatal: snapshot capture failure must never kill a pick
          console.warn(
            `[data-refresh] Snapshot capture failed for pick ${upsertedPick.id}: ` +
            `${snapErr instanceof Error ? snapErr.message : snapErr}`
          );
        }
      }

      await db.ingestionRun.update({
        where: { id: run.id },
        data: { status: "SUCCESS", gamesUpserted: Object.keys(gameRecords).length, oddsInserted, completedAt: new Date() },
      });

      console.log(`[data-refresh] ${sport.key}: ${Object.keys(gameRecords).length} games, ${oddsInserted} odds, ${picksGenerated} picks (bootstrap=${isBootstrap})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[data-refresh] ${sport.key} failed: ${msg}`);
      await db.ingestionRun.update({
        where: { id: run.id },
        data: { status: "FAILED", errorMessage: msg, completedAt: new Date() },
      });
    }

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
            console.warn(`[settlement] GameLog failed for ${game.id}: ${settleErr instanceof Error ? settleErr.message : settleErr}`);
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
  console.log("[data-refresh] Worker v4 starting...");
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
