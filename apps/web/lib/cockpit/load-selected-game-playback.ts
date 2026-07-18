/**
 * Loads owner-only selected-game playback from the governed Game Room envelope.
 */
import { z } from "zod";
import { loadGameRoom } from "@/lib/game-room/load";
import {
  buildPlaybackConsumerBundle,
  type PlaybackConsumerBundle,
} from "@/lib/intelligence-playback";
import type { GameRoomViewer } from "@/lib/game-room/types";

const gameIdSchema = z.string().trim().min(1).max(191).brand("GameId");

const OPERATOR_VIEWER = {
  canSeePremiumPicks: true,
  canSeeConfidence: true,
  canSeeFactorBreakdown: true,
  canSeeLineMovement: true,
} as const satisfies GameRoomViewer;

export type SelectedGamePlaybackUnavailableReason =
  | "INVALID_GAME_ID"
  | "GAME_NOT_FOUND"
  | "PLAYBACK_NOT_CAPTURED"
  | "PLAYBACK_WITHHELD";

export type SelectedGamePlaybackResult =
  | {
      readonly status: "AVAILABLE";
      readonly gameId: string;
      readonly matchup: string;
      readonly bundle: PlaybackConsumerBundle;
    }
  | {
      readonly status: "UNAVAILABLE";
      readonly gameId: string;
      readonly matchup: string | null;
      readonly reason: SelectedGamePlaybackUnavailableReason;
      readonly reasonCodes: readonly string[];
      readonly message: string;
    };

/** Loads a governed playback bundle for one persisted Cockpit game route. */
export async function loadSelectedGamePlayback(
  routeGameId: string,
): Promise<SelectedGamePlaybackResult> {
  const parsedGameId = gameIdSchema.safeParse(routeGameId);
  if (!parsedGameId.success) {
    return {
      status: "UNAVAILABLE",
      gameId: "invalid",
      matchup: null,
      reason: "INVALID_GAME_ID",
      reasonCodes: [],
      message: "The selected game ID is invalid, so no database query was executed.",
    };
  }

  const gameId = parsedGameId.data;
  const room = await loadGameRoom(gameId, OPERATOR_VIEWER);
  if (!room) {
    return {
      status: "UNAVAILABLE",
      gameId,
      matchup: null,
      reason: "GAME_NOT_FOUND",
      reasonCodes: [],
      message: "No persisted game matched this ID.",
    };
  }

  if (!room.playback) {
    return {
      status: "UNAVAILABLE",
      gameId,
      matchup: room.node.matchup,
      reason: "PLAYBACK_NOT_CAPTURED",
      reasonCodes: [],
      message: "This game has no persisted, rights-cleared decision envelope to replay.",
    };
  }

  if (room.playback.publication.status === "WITHHELD") {
    return {
      status: "UNAVAILABLE",
      gameId,
      matchup: room.node.matchup,
      reason: "PLAYBACK_WITHHELD",
      reasonCodes: room.playback.publication.reasonCodes,
      message: "Playback is withheld because its evidence contract did not clear publication gates.",
    };
  }

  return {
    status: "AVAILABLE",
    gameId,
    matchup: room.node.matchup,
    bundle: buildPlaybackConsumerBundle({
      gameId,
      envelopeDigest: room.playback.digest,
      publication: room.playback.publication,
      events: room.playback.events,
    }),
  };
}
