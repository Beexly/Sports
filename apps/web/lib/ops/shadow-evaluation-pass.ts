/**
 * One shadow-engine cycle over real games: absorb newly-settled results, then
 * evaluate upcoming games, then persist. Called from the refresh-odds cron.
 *
 * WHY refresh-odds AND NOT board-fill. `board-fill` runs `generateSignalSlate`,
 * which is deliberately market-free — it sets `marketFairProb: null` with the
 * comment "No book line on pure signal slate — omit market, never invent 0.5".
 * The shadow engine needs a REAL de-vigged market probability: it is both the
 * `m` in the forecast-skill E-process and the market baseline in the
 * shadow-vs-live report, and a fabricated 0.5 would make the engine look
 * skilled precisely where the market was actually informative. `processSport`
 * (the refresh-odds path) is the pipeline that carries genuine `marketFairProb`
 * on its picks, so that is where this hooks in.
 *
 * ORDER MATTERS: settle first, then evaluate. Evaluating first would score
 * upcoming games against a filter that had not yet absorbed results already
 * known, understating what the engine knows. `predictStates()` is called ONCE
 * per cycle, not per game — it adds process noise to every team each call, so
 * per-game invocation would over-diffuse the whole league in proportion to
 * slate size.
 *
 * HOME-REFERENCED THROUGHOUT. `Pick.confidence` and `Pick.marketFairProb`
 * describe the SELECTED side, which is often the away team. Every number this
 * module writes to `ShadowSignal` is converted to the HOME side first. Skipping
 * that conversion would silently compare an away-side probability against a
 * home-win outcome for roughly half the slate — the comparison would look
 * well-formed and be meaningless.
 *
 * SHADOW ONLY: writes `ShadowSignal` + `FilterStateSnapshot` rows and nothing
 * else. It never creates, mutates, publishes, or gates a `Pick`. Every failure
 * path degrades to "fewer shadow rows", never to a broken ingestion run.
 */

import { db } from "@sports/db";
import {
  LiveOrchestrator,
  selectionIsHomeSide,
  assignTeamIndex,
  americanToDecimalOdds,
  DEFAULT_TEAM_CAPACITY,
  type TeamIndexRegistry,
} from "@sports/prediction-engine";
import { loadFilter, saveFilter, recordShadowSignal, settleShadowSignal } from "./shadow-signal-store";

/** Particle count — the serverless operating point, matching the filter's own default. */
const SHADOW_PARTICLES = 1000;
/** Deterministic seed: an unseeded stochastic model output is not auditable. */
const SHADOW_SEED = 20260810;
/** Cap per cycle so a huge slate cannot blow the cron's time budget. */
const MAX_GAMES_PER_CYCLE = 120;

export interface ShadowPassResult {
  readonly scope: string;
  readonly restored: boolean;
  readonly settledAbsorbed: number;
  readonly evaluated: number;
  readonly skipped: number;
  readonly saved: boolean;
  readonly observations: number;
  readonly notes: readonly string[];
}

function clampProb(p: number): number | null {
  if (!Number.isFinite(p) || p <= 0 || p >= 1) return null;
  return p;
}

/**
 * Fair (de-vigged) decimal odds derived from a home-side probability, NOT the
 * quoted American price for whichever side was actually picked. A real quoted
 * price only exists for the SELECTED side (`PickProofReceipt.entryOdds`); it
 * cannot be validly flipped to the other side without the vig, which is not
 * stored as a two-sided pair here. Deriving from the fair probability is the
 * honest option and is labelled as a proxy, never presented as a market price.
 */
function fairDecimalOddsFromProb(p: number): number | null {
  if (!Number.isFinite(p) || p <= 0 || p >= 1) return null;
  const american = p >= 0.5 ? -Math.round((p / (1 - p)) * 100) : Math.round(((1 - p) / p) * 100);
  const decimal = americanToDecimalOdds(american);
  return decimal > 1 ? decimal : null;
}

/**
 * Run one cycle for `scope` (a sport key). Never throws: the caller is an
 * ingestion cron whose primary job must not be endangered by shadow work.
 */
export async function runShadowEvaluationPass(scope: string): Promise<ShadowPassResult> {
  const notes: string[] = [];
  let settledAbsorbed = 0;
  let evaluated = 0;
  let skipped = 0;

  const { filter, registry, restored } = await loadFilter(scope, {
    nTeams: DEFAULT_TEAM_CAPACITY,
    seed: SHADOW_SEED,
    nParticles: SHADOW_PARTICLES,
  });
  let workingRegistry: TeamIndexRegistry = registry;

  // Constructed around the RESTORED filter instance — the entire point of the
  // persistence layer is that this is the same cloud the last cycle saved, not
  // a fresh one drawn from the prior.
  const orchestrator = new LiveOrchestrator({ filter });

  /** Resolve both teams to stable indices, or null when either cannot be assigned. */
  const resolvePair = (home: string, away: string): { home: number; away: number } | null => {
    const h = assignTeamIndex(workingRegistry, home);
    if (!h.ok) {
      notes.push(`registry ${h.reason} for home "${home}"`);
      return null;
    }
    workingRegistry = h.registry;
    const a = assignTeamIndex(workingRegistry, away);
    if (!a.ok) {
      notes.push(`registry ${a.reason} for away "${away}"`);
      return null;
    }
    workingRegistry = a.registry;
    if (h.index === a.index) return null; // same team both sides — corrupt row
    return { home: h.index, away: a.index };
  };

  // ── 1) Absorb newly-settled games ────────────────────────────────────────
  // Only rows this engine actually predicted (a ShadowSignal exists) and that
  // have not been settled yet. Scoring a game the filter never forecast would
  // teach it from an outcome it never staked a prediction on.
  try {
    const pending = await db.shadowSignal.findMany({
      where: { outcome: null },
      select: { gameId: true },
      take: MAX_GAMES_PER_CYCLE,
    });
    const pendingIds = pending.map((r) => r.gameId);

    if (pendingIds.length > 0) {
      const finals = await db.game.findMany({
        where: {
          id: { in: pendingIds },
          status: "FINAL",
          homeScore: { not: null },
          awayScore: { not: null },
        },
        select: { id: true, homeTeamName: true, awayTeamName: true, homeScore: true, awayScore: true },
      });

      for (const game of finals) {
        const homeScore = game.homeScore;
        const awayScore = game.awayScore;
        if (homeScore === null || awayScore === null) continue;
        if (homeScore === awayScore) {
          // A draw is not a home-win/away-win observation. The filter's
          // likelihood is binary; encoding a tie as either side would teach it
          // something that did not happen.
          notes.push(`draw skipped: ${game.id}`);
          continue;
        }
        const pair = resolvePair(game.homeTeamName, game.awayTeamName);
        if (pair === null) continue;

        const outcome: 0 | 1 = homeScore > awayScore ? 1 : 0;
        orchestrator.settleGame(game.id, pair.home, pair.away, outcome);
        await settleShadowSignal(game.id, outcome);
        settledAbsorbed += 1;
      }
    }
  } catch (err) {
    notes.push(`settlement sweep failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── 2) Advance the dynamics ONCE for this cycle ──────────────────────────
  orchestrator.advanceTimeStep();

  // ── 3) Evaluate upcoming games that carry a REAL market probability ──────
  try {
    const now = new Date();
    const picks = await db.pick.findMany({
      where: {
        pickType: "MONEYLINE",
        result: "PENDING",
        game: { commenceTime: { gt: now }, sport: { key: scope } },
      },
      select: {
        selection: true,
        confidence: true,
        modelVersion: true,
        // Immutable, frozen once at publish, and minted ONLY when a genuine
        // real market fair prob existed (process-sport.ts's proof-receipt
        // mint guard) — its mere presence is the "was this real" signal.
        proofReceipt: { select: { marketFairProb: true } },
        game: {
          select: { id: true, homeTeamName: true, awayTeamName: true },
        },
      },
      orderBy: { generatedAt: "desc" },
      take: MAX_GAMES_PER_CYCLE,
    });

    for (const pick of picks) {
      const game = pick.game;
      // A pick without a real de-vigged market price is exactly the case this
      // module refuses to fabricate a 0.5 for.
      const selectedMarketProb = clampProb(pick.proofReceipt?.marketFairProb ?? Number.NaN);
      if (selectedMarketProb === null) {
        skipped += 1;
        continue;
      }

      const pickedHome = selectionIsHomeSide(pick.selection, game.homeTeamName, game.awayTeamName);
      // Convert BOTH the market probability and the live engine's confidence to
      // the home side — see the module header.
      const marketHomeProb = pickedHome ? selectedMarketProb : 1 - selectedMarketProb;
      const liveHomeProb = pickedHome ? pick.confidence / 100 : 1 - pick.confidence / 100;

      const decimalOddsHome = fairDecimalOddsFromProb(marketHomeProb);
      if (decimalOddsHome === null) {
        skipped += 1;
        continue;
      }

      const pair = resolvePair(game.homeTeamName, game.awayTeamName);
      if (pair === null) {
        skipped += 1;
        continue;
      }

      const observation = await orchestrator.evaluateGame({
        gameId: game.id,
        homeTeamIdx: pair.home,
        awayTeamIdx: pair.away,
        marketHomeProb,
        decimalOddsHome,
      });

      await recordShadowSignal({
        gameId: game.id,
        modelVersion: pick.modelVersion,
        shadowProb: observation.blendedProb,
        marketProb: marketHomeProb,
        liveConfidence: Math.round(liveHomeProb * 100),
      });
      evaluated += 1;
    }
  } catch (err) {
    notes.push(`evaluation sweep failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── 4) Persist filter + registry together ────────────────────────────────
  const saved = await saveFilter(scope, orchestrator.exportFilter(), workingRegistry);
  if (!saved) notes.push("filter save FAILED — this cycle's learning was not durable");

  return {
    scope,
    restored,
    settledAbsorbed,
    evaluated,
    skipped,
    saved,
    observations: orchestrator.diagnostics().observations,
    notes,
  };
}
