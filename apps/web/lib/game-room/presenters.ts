import type { GameRoomMemory, GameRoomTimelineItem } from "./types";

function asIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function timelineStatus(signal: {
  readonly expiresAt: Date | null;
  readonly isBootstrap: boolean;
}, now: Date): GameRoomTimelineItem["status"] {
  if (signal.isBootstrap) return "BOOTSTRAP";
  if (signal.expiresAt && signal.expiresAt.getTime() < now.getTime()) return "STALE";
  return "LIVE";
}

export function memoryForPick(pick: {
  readonly result: string;
  readonly settledAt: Date | null;
  readonly selection: string;
  readonly lossAutopsy: {
    readonly whatWeLearned: string;
    readonly status: string;
    readonly isPublic: boolean;
  } | null;
} | null): GameRoomMemory {
  if (!pick || pick.result === "PENDING") {
    return {
      status: "PREGAME",
      body: "This room will keep the settled outcome, post-mortem notes, and future Model Journal references after the game closes.",
      settledAt: null,
    };
  }

  if (pick.result === "LOSS") {
    const publishedLearning =
      pick.lossAutopsy?.isPublic && pick.lossAutopsy.status === "PUBLISHED"
        ? pick.lossAutopsy.whatWeLearned
        : null;
    return {
      status: "SETTLED_LOSS",
      body:
        publishedLearning ??
        `Loss recorded for ${pick.selection}. A full post-mortem has not been published yet.`,
      settledAt: asIso(pick.settledAt),
    };
  }

  if (pick.result === "WIN") {
    return {
      status: "SETTLED_WIN",
      body: `Win recorded for ${pick.selection}. The original signal snapshot remains attached to the ledger.`,
      settledAt: asIso(pick.settledAt),
    };
  }

  return {
    status: "SETTLED_PUSH",
    body: `Push recorded for ${pick.selection}. The room keeps the original signal snapshot for calibration history.`,
    settledAt: asIso(pick.settledAt),
  };
}
