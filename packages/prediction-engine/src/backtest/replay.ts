/**
 * Backtest replay — pure functions that turn historical games into
 * synthetic settlement records.
 *
 * The replay does NOT call out to the network and does NOT touch the DB.
 * It feeds the live scoring function (`scoreGame`) so that any future
 * change to the model is automatically reflected in backtest output —
 * the harness is honest by construction.
 */

import { scoreGame } from "../scoring.js";
import { calculatePickResult } from "../settlement.js";
import type { BacktestGame, BacktestPickRecord } from "./types.js";

/**
 * Replay a list of historical games through the live scoring algorithm
 * and emit synthetic pick records with settlement results attached.
 *
 * Picks that fall below the publish threshold (i.e. are gated) are
 * NOT included in the output — only the picks the model would have
 * published.
 */
export function replayGames(
  games: ReadonlyArray<BacktestGame>,
  fetchedAt?: Date,
): ReadonlyArray<BacktestPickRecord> {
  const records: BacktestPickRecord[] = [];

  for (const game of games) {
    const picks = scoreGame(game.odds, fetchedAt);
    for (const pick of picks) {
      const result = calculatePickResult(
        pick.pickType,
        pick.selection,
        pick.line,
        game.odds.homeTeam,
        game.homeScore,
        game.awayScore,
        game.sportKey,
      );

      records.push({
        gameId: pick.gameId,
        modelVersion: pick.modelVersion,
        pickType: pick.pickType,
        selection: pick.selection,
        line: pick.line,
        confidence: pick.confidence,
        edgeScore: pick.edgeScore,
        bookmakerCount: pick.bookmakerCount,
        dataQualityScore: pick.dataQualityScore,
        tier: pick.tier,
        result,
      });
    }
  }

  return records;
}
