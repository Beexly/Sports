/**
 * processSport — Single source of truth for per-sport pick generation.
 *
 * This function is the canonical implementation of the pick ingestion pipeline.
 * Both the scheduled data-refresh worker and the admin trigger-refresh API route
 * call this function, ensuring identical behavior across all ingestion paths:
 *
 *   1. Fetch live odds from The Odds API
 *   2. Normalize and upsert game/odds records
 *   3. Enrich game context (opening lines, rest days, schedule density)
 *      — isBootstrap propagated correctly for GameSignal provenance
 *   4. Build GameContextInput with all signals (including schedule density)
 *   5. Fetch ATS/H2H form (gated by canUseDerivedHistory)
 *   6. Score picks via the prediction engine
 *   7. Upsert picks with correct isBootstrap + isFeatured flags
 *   8. Capture immutable PickSignalSnapshot for each pick
 *
 * Rules:
 *   - isBootstrap is derived from gates inside this function — never defaults
 *   - PickSignalSnapshot uses update:{} — immutable, never overwritten
 *   - Snapshot failures are non-fatal (warn and continue)
 *   - All errors are caught; status:"failed" is returned, not thrown
 */

import { db } from "@sports/db";
import {
  OddsApiClient,
  DataNormalizer,
  MARKETS,
  enrichGameContext,
  getAtsForm,
  getHeadToHeadForm,
} from "@sports/data-ingestion";
import type { SupportedSportKey } from "@sports/data-ingestion";
import { createHash } from "node:crypto";
import {
  scoreGames,
  buildPickSignalSnapshot,
  buildPickProofReceipt,
} from "@sports/prediction-engine";
import type { ReadinessGates } from "@sports/prediction-engine";

/** Production SHA-256 HashFn for the proof spine — a weak hash would void the guarantee. */
function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}
import type { OddsInput, GameContextInput, EvidenceRecord, SignalCategory } from "@sports/types";
import { recordSourceSnapshot } from "./source-snapshot.js";

export interface SportConfig {
  key: SupportedSportKey;
  name: string;
  displayName: string;
}

export interface ProcessSportResult {
  sport: string;
  status: "success" | "failed";
  games: number;
  picks: number;
  error?: string;
}

const SHADOW_CONTEXT_CATEGORIES: SignalCategory[] = [
  "PLAYER_AVAILABILITY",
  "OFFICIALS",
  "VENUE_ENVIRONMENT",
  "PACE",
  "TEAM_RATES",
  "STANDINGS",
  "DIVISION_CONTEXT",
  "MILESTONES",
];

function buildMissingContextEvidence(fetchedAt: Date): EvidenceRecord[] {
  return SHADOW_CONTEXT_CATEGORIES.map((category) => ({
    sourceCategory: category,
    sourceName: "not-configured",
    signalKey: category.toLowerCase(),
    fetchedAt,
    trustLevel: 0,
    isBootstrap: true,
    activationStatus: "BLOCKED_MISSING_SOURCE",
    freshnessStatus: "MISSING",
    sampleSize: null,
    whyUsedOrBlocked:
      `${category.replace(/_/g, " ").toLowerCase()} is tracked in shadow mode only; ` +
      "no licensed context provider is configured, so it cannot affect confidence.",
  }));
}

/**
 * Runs the full pick generation pipeline for one sport.
 *
 * @param sport      - Sport configuration (key, name, displayName)
 * @param apiKey     - The Odds API key
 * @param gates      - Readiness gates (read once per cycle by the caller)
 * @param logPrefix  - Log prefix for distinguishing caller context, e.g. "[data-refresh]"
 */
export async function processSport(
  sport: SportConfig,
  apiKey: string,
  gates: ReadinessGates,
  logPrefix: string = "[ingestion]",
): Promise<ProcessSportResult> {
  // Derive once per call — immutable within this invocation.
  // This is the single gating point for bootstrap provenance.
  const isBootstrap = !gates.canPersistCanonicalHistory;

  const run = await db.ingestionRun.create({
    data: { sport: sport.key, status: "RUNNING" },
  });

  try {
    const client = new OddsApiClient(apiKey);
    const normalizer = new DataNormalizer();

    const { data: events, remainingRequests } = await client.getOdds(sport.key, [...MARKETS]);
    const fetchedAt = new Date();

    try {
      await recordSourceSnapshot({
        provider: "the-odds-api",
        sourceKind: "ODDS_EVENTS",
        sport: sport.key,
        ingestionRunId: run.id,
        fetchedAt,
        payload: events,
      });
    } catch (snapshotErr) {
      console.warn(
        `${logPrefix} Source snapshot failed for ${sport.key}: ` +
        `${snapshotErr instanceof Error ? snapshotErr.message : snapshotErr}`
      );
    }

    console.log(
      `${logPrefix} ${sport.key}: ${events.length} events, ${remainingRequests} requests remaining`
    );

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

    // Upsert all games first so we have DB IDs for the rest of the pipeline
    const gameRecords: Record<string, { id: string }> = {};
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

    // Ingest all odds records
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

    // Build OddsInputs with full context enrichment
    const oddsInputs: OddsInput[] = [];

    for (const game of normalizedGames) {
      const gameRecord = gameRecords[game.externalId];
      if (!gameRecord) continue;

      const gameOdds = normalizedOdds.filter((o) => o.gameExternalId === game.externalId);
      const bookmakerCoverageMax = new Set(gameOdds.map((o) => o.bookmaker)).size;

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

      // Enrich: opening line tracking, rest days, schedule density, data quality.
      // isBootstrap is passed explicitly so GameSignal records have correct provenance
      // regardless of which ingestion path triggered the enrichment.
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
          isBootstrap, // propagate for correct GameSignal.isBootstrap provenance
        });
      } catch (enrichErr) {
        // Non-fatal: picks still generated without enrichment context
        console.warn(
          `${logPrefix} Enrichment failed for ${game.externalId}: ` +
          `${enrichErr instanceof Error ? enrichErr.message : enrichErr}`
        );
      }

      // Reload game to pick up all enriched fields written by enrichGameContext:
      // openingSpread, restDaysHome/Away, isBackToBack*, scheduleDensityHome/Away
      const enrichedGame = await db.game.findUnique({ where: { id: gameRecord.id } });

      // ATS/H2H form — gated by derived history flag.
      // When off: all null → engine treats as 0 (neutral, no historical bias).
      // When on: canonicalOnly=true ensures bootstrap-era logs never enter scoring.
      const [homeAtsForm, awayAtsForm, homeAtsFormAtHome, awayAtsFormAway, homeH2HForm] =
        gates.canUseDerivedHistory
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
        // Schedule density (v5): physical game load, read from enriched game.
        // Uses all TeamGameLog entries regardless of bootstrap — schedule dates
        // are physical reality, not ATS trend data.
        scheduleDensityHome: enrichedGame?.scheduleDensityHome ?? null,
        scheduleDensityAway: enrichedGame?.scheduleDensityAway ?? null,
        // Historical signals — null when derived history is disabled (neutral scoring).
        homeAtsForm: homeAtsForm ?? null,
        awayAtsForm: awayAtsForm ?? null,
        homeAtsFormAtHome: homeAtsFormAtHome ?? null,
        awayAtsFormAway: awayAtsFormAway ?? null,
        headToHeadForm: homeH2HForm ?? null,
        bookmakerCoverageMax,
        dataFreshnessMinutes: freshnessMinutes,
        hasSpreadMarket: spreadOdds.length > 0,
        hasTotalMarket: totalOdds.length > 0,
        hasH2HMarket,
        shadowEvidence: buildMissingContextEvidence(fetchedAt),
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
      // result, settledAt: intentionally absent — never overwritten by refresh.
      // ingestionRunId: intentionally absent from update — preserves creation run ID.
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

      // Upsert by DB-enforced unique key [gameId, pickType].
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
          // CLV lock snapshot — the line/price we ACTUALLY published at, captured
          // once at creation. Absent from `update` below, so the refresh cycle can
          // never overwrite it (Pick.line itself IS mutated each cycle). Moneyline
          // `pick.line` holds the American price; spread/total `pick.line` holds the
          // points line. Graded against the closing line at settlement.
          clvLockLine: pick.pickType === "MONEYLINE" ? null : pick.line,
          clvLockPrice: pick.pickType === "MONEYLINE" ? Math.round(pick.line) : null,
          ...pickUpdateData,
        },
        update: {
          ...pickUpdateData,
          // Re-evaluate featured status on each refresh when promotion is enabled.
          isFeatured,
        },
      });
      picksGenerated++;

      // Capture PickSignalSnapshot — immutable record of signal state at prediction time.
      // Created ONCE (update:{} ensures existing snapshots are never overwritten).
      // This is the foundation for future outcome-anchored calibration:
      // "Given these signals at prediction time, what was the real win rate?"
      try {
        const oddsInputForPick = oddsInputs.find((o) => o.gameId === pick.gameId);
        const snapshotData = buildPickSignalSnapshot(
          upsertedPick.id,
          pick,
          oddsInputForPick?.context,
          isBootstrap,
          // usedDerivedHistory = gate was on AND at least one canonical ATS signal was non-null
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
        // Non-fatal: snapshot failure must never kill a pick
        console.warn(
          `${logPrefix} Snapshot capture failed for pick ${upsertedPick.id}: ` +
          `${snapErr instanceof Error ? snapErr.message : snapErr}`
        );
      }

      // Freeze a tamper-evident proof receipt — the pre-result, pre-kickoff commitment
      // to exactly what we claimed. Created ONCE (update:{}), never overwritten. Mints
      // only with HONEST inputs: a real devigged market fair prob + the labeled
      // confidence heuristic; modelProb stays null until a calibrated one exists (never
      // confidence/100). Non-fatal — a receipt failure must never block a pick.
      try {
        const entryOdds = pick.entryPrice ?? (pick.pickType === "MONEYLINE" ? Math.round(pick.line) : null);
        if (
          typeof pick.marketFairProb === "number" &&
          pick.marketFairProb > 0 &&
          pick.marketFairProb < 1 &&
          typeof entryOdds === "number" &&
          entryOdds !== 0
        ) {
          const receipt = buildPickProofReceipt(
            {
              pickId: upsertedPick.id,
              gameId: pick.gameId,
              selection: pick.selection,
              pickType: pick.pickType,
              line: pick.line,
              entryOdds,
              marketFairProb: pick.marketFairProb,
              confidence: pick.confidence,
              edgeScore: pick.edgeScore,
              modelProb: null,
              modelVersion: pick.modelVersion,
              asOf: pick.dataFreshnessAt.toISOString(),
            },
            sha256Hex,
          );
          await db.pickProofReceipt.upsert({
            where: { pickId: upsertedPick.id },
            create: {
              pickId: receipt.pickId,
              payload: receipt.payload,
              contentHash: receipt.contentHash,
              marketFairProb: receipt.fields.marketFairProb,
              confidence: receipt.fields.confidence,
              edgeScore: receipt.fields.edgeScore,
              modelProb: receipt.fields.modelProb ?? null,
              entryOdds: receipt.fields.entryOdds,
              line: receipt.fields.line,
              modelVersion: receipt.fields.modelVersion,
              asOf: new Date(receipt.fields.asOf),
            },
            update: {}, // immutable — a frozen receipt is never rewritten
          });
        }
      } catch (receiptErr) {
        // Non-fatal: proof-receipt failure must never kill a pick
        console.warn(
          `${logPrefix} Proof receipt mint failed for pick ${upsertedPick.id}: ` +
          `${receiptErr instanceof Error ? receiptErr.message : receiptErr}`
        );
      }
    }

    await db.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCESS",
        gamesUpserted: Object.keys(gameRecords).length,
        oddsInserted,
        completedAt: new Date(),
      },
    });

    console.log(
      `${logPrefix} ${sport.key}: ${Object.keys(gameRecords).length} games, ` +
      `${oddsInserted} odds, ${picksGenerated} picks (bootstrap=${isBootstrap})`
    );

    return {
      sport: sport.key,
      status: "success",
      games: Object.keys(gameRecords).length,
      picks: picksGenerated,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${logPrefix} ${sport.key} failed: ${message}`);
    await db.ingestionRun.update({
      where: { id: run.id },
      data: { status: "FAILED", errorMessage: message, completedAt: new Date() },
    });
    return { sport: sport.key, status: "failed", games: 0, picks: 0, error: message };
  }
}
