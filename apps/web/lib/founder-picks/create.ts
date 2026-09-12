/**
 * Create or override a founder pick. Admin-only caller.
 *
 * Writes a real Pick row with modelVersion = founder-v1, isBootstrap = false
 * so it counts toward the public record, and the same settlement path grades
 * it. Never fabricates a game, a line, or a result.
 */

import { db } from "@sports/db";
import {
  FOUNDER_MODEL_VERSION,
  founderFactorBreakdown,
  validateFounderPick,
  type FounderPickInput,
} from "./types";

export type CreateFounderPickResult =
  | { ok: true; pickId: string; action: "created" | "overridden" }
  | { ok: false; error: string };

export async function createFounderPick(
  input: FounderPickInput,
): Promise<CreateFounderPickResult> {
  const game = await db.game
    .findUnique({
      where: { id: input.gameId },
      select: {
        id: true,
        commenceTime: true,
        homeTeamName: true,
        awayTeamName: true,
        status: true,
      },
    })
    .catch(() => null);

  if (!game) {
    return { ok: false, error: "Game not found." };
  }

  const verdict = validateFounderPick(input, { kickoff: game.commenceTime });
  if (!verdict.ok) {
    return { ok: false, error: verdict.error };
  }

  // Already-settled rows are frozen (same rule as the refresh cycle).
  const existing = await db.pick
    .findUnique({
      where: { gameId_pickType: { gameId: input.gameId, pickType: input.pickType } },
      select: { id: true, result: true, modelVersion: true },
    })
    .catch(() => null);

  if (existing && existing.result !== "PENDING") {
    return {
      ok: false,
      error: `Existing pick on this game is already ${existing.result}. Settled rows are frozen.`,
    };
  }

  const data = {
    gameId: input.gameId,
    pickType: input.pickType,
    selection: input.selection.trim(),
    line: input.line,
    confidence: input.confidence,
    edgeScore: 0,
    consensusPct: 0,
    bookmakerCount: 0,
    tier: "PREMIUM" as const,
    pickGrade:
      input.confidence >= 80
        ? ("ELITE_PLAY" as const)
        : input.confidence >= 70
          ? ("STRONG_PLAY" as const)
          : input.confidence >= 60
            ? ("SOLID_PLAY" as const)
            : ("LEAN" as const),
    riskLevel: "MODERATE" as const,
    reasoning: input.reasoning.trim(),
    reasoningShort: input.reasoning.trim().slice(0, 160),
    factorBreakdown: JSON.parse(JSON.stringify(founderFactorBreakdown(input))),
    modelVersion: FOUNDER_MODEL_VERSION,
    isBootstrap: false,
    isPublished: true,
    isFeatured: true,
    // Lock the published terms write-once with the CLV lock, same as engine picks.
    clvLockLine: input.pickType === "MONEYLINE" ? null : input.line,
    clvLockPrice: input.pickType === "MONEYLINE" ? Math.round(input.line) : null,
  };

  if (existing) {
    await db.pick.update({
      where: { id: existing.id },
      data,
    });
    return { ok: true, pickId: existing.id, action: "overridden" };
  }

  const created = await db.pick.create({ data });
  return { ok: true, pickId: created.id, action: "created" };
}
