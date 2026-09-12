/**
 * Founder pick public record. Decided-only win rate — same house idiom as
 * public-performance-policy. Never invents a rate when nothing is decided.
 */

import { db } from "@sports/db";
import { FOUNDER_MODEL_VERSION, type FounderPickRecord } from "./types";

export async function loadFounderPickRecord(
  limit = 50,
): Promise<FounderPickRecord> {
  const rows = await db.pick
    .findMany({
      where: { modelVersion: FOUNDER_MODEL_VERSION, isBootstrap: false },
      include: {
        game: {
          select: {
            commenceTime: true,
            homeTeamName: true,
            awayTeamName: true,
            sport: { select: { name: true } },
          },
        },
      },
      orderBy: { generatedAt: "desc" },
      take: limit,
    })
    .catch(() => []);

  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let pending = 0;

  const picks = rows.map((row) => {
    if (row.result === "WIN") wins += 1;
    else if (row.result === "LOSS") losses += 1;
    else if (row.result === "PUSH") pushes += 1;
    else pending += 1;

    const matchup = `${row.game.awayTeamName} @ ${row.game.homeTeamName}`;
    return {
      id: row.id,
      gameId: row.gameId,
      sport: row.game.sport.name,
      matchup,
      pickType: row.pickType as FounderPickRecord["picks"][number]["pickType"],
      selection: row.selection,
      line: row.line,
      confidence: row.confidence,
      result: row.result as FounderPickRecord["picks"][number]["result"],
      generatedAt: row.generatedAt.toISOString(),
      settledAt: row.settledAt ? row.settledAt.toISOString() : null,
      reasoning: row.reasoning,
      clvVerdict: row.clvVerdict,
    };
  });

  const decided = wins + losses;
  return {
    wins,
    losses,
    pushes,
    pending,
    decided,
    // Decided-only. Pushes are population, not rate.
    winRatePct: decided > 0 ? Math.round((wins / decided) * 1000) / 10 : null,
    picks,
  };
}
