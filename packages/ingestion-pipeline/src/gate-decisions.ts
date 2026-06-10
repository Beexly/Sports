/**
 * recordGateDecisions — additive "dark trust" writes for the public board.
 *
 * The board already READS two fields that production has historically left
 * empty, so it silently degrades to on-the-fly derivation:
 *
 *   - GateDecision rows (PUBLISHED | GATED per evaluated game) — drive the
 *     Gate Cam lanes (board/state.ts) and the public Pass List (board/passes.ts).
 *   - Game.currentEdgeIndex — the public 0–100 edge readout consumed by the
 *     board, game-room, intelligence-graph, and studio readers.
 *
 * This module is the WRITE side. It is intentionally:
 *
 *   - ADDITIVE: it never touches the published pick value/tier/grade,
 *     MODEL_VERSION, isFeatured, or any gate threshold. It only writes data
 *     the board already expects.
 *   - FAIL-CLOSED + STUB-SAFE: every DB call is awaited inside a try/catch that
 *     only console.warns. The @sports/db stub proxy already turns
 *     gateDecision.createMany → { count: 0 } and game.update → { id: "stub" }
 *     no-ops when DATABASE_URL is unset/"stub", so demo/no-DB mode needs no
 *     special-casing. A write failure can never break ingestion, scoring, or
 *     the board (which has its own degraded fallback as a second safety net).
 *
 * A game in the evaluated set that produced ≥1 published pick is PUBLISHED;
 * a game that produced zero picks is GATED. The reason taxonomy mirrors the
 * read-side fallbacks (board/passes.ts) so persisted and derived rows agree.
 */

import { db } from "@sports/db";
import type { ScoredPick } from "@sports/types";
import type { GateDecisionStatus, Prisma } from "@sports/db";

/** Publish-vs-gate signal for a single evaluated game. */
export interface EvaluatedGame {
  /** DB game id (Game.id). */
  gameId: string;
  /** Highest bookmaker count seen for this game (drives the market-depth reason). */
  bookmakerCoverageMax: number;
  /** 0–100 composite data-quality score (drives the evidence-health reason). */
  dataQualityScore: number;
}

export interface RecordGateDecisionsInput {
  /** All games evaluated this cycle (one entry per game in the slate). */
  evaluatedGames: EvaluatedGame[];
  /** Published picks produced this cycle (zero-pick games are gated). */
  scoredPicks: ScoredPick[];
  /** Upserted pick id for the top published pick of each game, keyed by gameId. */
  pickIdByGameId: Map<string, string>;
  /** Bootstrap provenance — mirrors the same flag used for picks this cycle. */
  isBootstrap: boolean;
  /** Model version of this scoring cycle. */
  modelVersion: string;
  /** Log prefix for non-fatal warnings (matches the caller's convention). */
  logPrefix?: string;
}

/**
 * Reason taxonomy for GATED games — mirrors board/passes.ts:passReason so the
 * persisted row and the read-side derived fallback produce identical copy.
 * reasonCode is the stable machine key; reason is the public sentence.
 */
function gatedReason(
  bookmakerCoverageMax: number,
  dataQualityScore: number,
): { reasonCode: string; reason: string } {
  if (bookmakerCoverageMax < 3) {
    return {
      reasonCode: "MARKET_DEPTH_BELOW_THRESHOLD",
      reason: "Market depth below publish threshold.",
    };
  }
  if (dataQualityScore < 70) {
    return {
      reasonCode: "EVIDENCE_HEALTH_BELOW_THRESHOLD",
      reason: "Evidence health below publish threshold.",
    };
  }
  return {
    reasonCode: "NO_PICK_CLEARED_THRESHOLD",
    reason: "No pick cleared the publish threshold.",
  };
}

/**
 * Writes one GateDecision row per evaluated game and lights up
 * Game.currentEdgeIndex for published games.
 *
 * Never throws — all failures are caught and warned. Safe to call
 * unconditionally at the end of a successful ingestion cycle.
 */
export async function recordGateDecisions(
  input: RecordGateDecisionsInput,
): Promise<void> {
  const {
    evaluatedGames,
    scoredPicks,
    pickIdByGameId,
    isBootstrap,
    modelVersion,
    logPrefix = "[ingestion]",
  } = input;

  if (evaluatedGames.length === 0) return;

  try {
    // Group published picks by game, keeping the highest-confidence pick first.
    // scoreGames already returns picks sorted by confidence desc, but we sort
    // defensively so the "top pick" is deterministic regardless of input order.
    const picksByGameId = new Map<string, ScoredPick[]>();
    for (const pick of scoredPicks) {
      const list = picksByGameId.get(pick.gameId);
      if (list) list.push(pick);
      else picksByGameId.set(pick.gameId, [pick]);
    }
    for (const list of picksByGameId.values()) {
      list.sort((a, b) => b.confidence - a.confidence);
    }

    const rows: Prisma.GateDecisionCreateManyInput[] = [];
    // Games to light up with a public edge index (published games only).
    const edgeUpdates: Array<{ gameId: string; currentEdgeIndex: number }> = [];

    for (const game of evaluatedGames) {
      const picks = picksByGameId.get(game.gameId) ?? [];
      const topPick = picks[0];
      const status: GateDecisionStatus = topPick ? "PUBLISHED" : "GATED";

      if (topPick) {
        // edgeScore is already clamped 0–100 by the scoring engine, so it maps
        // directly onto the public 0–100 edge index — no rescaling.
        const edgeIndex = topPick.edgeScore;
        rows.push({
          gameId: game.gameId,
          pickId: pickIdByGameId.get(game.gameId) ?? null,
          status,
          reasonCode: "CLEARED_PUBLISH_THRESHOLD",
          reason: "Cleared publish threshold.",
          edgeIndex,
          confidence: topPick.confidence,
          modelVersion,
          isBootstrap,
        });
        edgeUpdates.push({ gameId: game.gameId, currentEdgeIndex: edgeIndex });
      } else {
        const { reasonCode, reason } = gatedReason(
          game.bookmakerCoverageMax,
          game.dataQualityScore,
        );
        rows.push({
          gameId: game.gameId,
          pickId: null,
          status,
          reasonCode,
          reason,
          edgeIndex: null,
          confidence: null,
          modelVersion,
          isBootstrap,
        });
      }
    }

    // A fresh createMany per run is naturally idempotent for the board, which
    // filters evaluatedAt within "today" and orders desc — the latest run wins.
    await db.gateDecision.createMany({ data: rows });

    // Light up the public edge index for published games. Done as narrow
    // per-game updates so a single failure is contained and warned.
    for (const update of edgeUpdates) {
      try {
        await db.game.update({
          where: { id: update.gameId },
          data: { currentEdgeIndex: update.currentEdgeIndex },
        });
      } catch (edgeErr) {
        console.warn(
          `${logPrefix} currentEdgeIndex write failed for game ${update.gameId}: ` +
            `${edgeErr instanceof Error ? edgeErr.message : edgeErr}`,
        );
      }
    }
  } catch (err) {
    // Non-fatal: gate-decision persistence must never break ingestion or the
    // board. The board degrades to on-the-fly derivation when rows are absent.
    console.warn(
      `${logPrefix} Gate decision persistence failed: ` +
        `${err instanceof Error ? err.message : err}`,
    );
  }
}
