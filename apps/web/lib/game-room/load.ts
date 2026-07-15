import { db } from "@sports/db";
import {
  buildGameIntelligenceNode,
  buildSlateWeather,
  projectForLens,
  type GameIntelligenceNode,
  type MonetizationSurface,
  type UserLens,
} from "@/lib/intelligence-graph";
import { buildPickPremortemNote, type PickPremortemNote } from "@/lib/premortem/build";

export interface GameRoomTimelineItem {
  readonly id: string;
  readonly label: string;
  readonly source: string;
  readonly fetchedAt: string;
  readonly status: "LIVE" | "STALE" | "BOOTSTRAP";
}

export interface GameRoomMemory {
  readonly status: "PREGAME" | "SETTLED_WIN" | "SETTLED_LOSS" | "SETTLED_PUSH";
  readonly body: string;
  readonly settledAt: string | null;
}

export interface GameRoomData {
  readonly node: GameIntelligenceNode;
  readonly slateWeather: {
    readonly sport: string;
    readonly gameCount: number;
    readonly averageEvidenceScore: number;
    readonly bootstrapGameCount: number;
  };
  readonly timeline: readonly GameRoomTimelineItem[];
  readonly premortem: PickPremortemNote | null;
  readonly lenses: readonly MonetizationSurface[];
  readonly memory: GameRoomMemory;
}

/**
 * Viewer entitlements the room loader needs to gate premium fields server-side.
 *
 * The Game Room is a PUBLIC read-only surface, but its shared node can carry
 * premium picks and paid metrics — the same values the board (`/api/picks`) and
 * audit route (#103) gate for FREE:
 *
 *  - the pre-mortem note embeds the paid factor trail (confidence at prediction,
 *    line-movement delta, rest/schedule/ATS/H2H sample sizes, data-quality score,
 *    book depth — see `buildPickPremortemNote`), and
 *  - Market Pulse line movement is the Pro-tier market read (`canSeeLineMovement`).
 *
 * Premium picks are filtered at query and projection boundaries. Confidence,
 * factor trails, and line movement are built only past their matching gate.
 * Defaults fail closed so a caller that omits entitlements cannot leak paid data.
 */
export interface GameRoomViewer {
  readonly canSeePremiumPicks: boolean;
  readonly canSeeConfidence: boolean;
  /** PRO/ELITE — unlocks the pre-mortem factor trail (mirrors the audit route). */
  readonly canSeeFactorBreakdown: boolean;
  /** PRO/ELITE — unlocks Market Pulse line movement (mirrors the board). */
  readonly canSeeLineMovement: boolean;
}

const FAIL_CLOSED_VIEWER: GameRoomViewer = {
  canSeePremiumPicks: false,
  canSeeConfidence: false,
  canSeeFactorBreakdown: false,
  canSeeLineMovement: false,
};

const LENSES: readonly UserLens[] = ["FAN", "BETTOR", "CREATOR", "ANALYST"];

function asIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function timelineStatus(signal: {
  readonly expiresAt: Date | null;
  readonly isBootstrap: boolean;
}, now: Date): GameRoomTimelineItem["status"] {
  if (signal.isBootstrap) return "BOOTSTRAP";
  if (signal.expiresAt && signal.expiresAt.getTime() < now.getTime()) return "STALE";
  return "LIVE";
}

function memoryForPick(pick: {
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

export async function loadGameRoom(
  gameId: string,
  viewer: GameRoomViewer = FAIL_CLOSED_VIEWER,
  now = new Date(),
): Promise<GameRoomData | null> {
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: {
      sport: { select: { name: true } },
      picks: {
        where: {
          isPublished: true,
          isBootstrap: false,
          NOT: { modelVersion: "v5.0.0-seed" },
          ...(viewer.canSeePremiumPicks ? {} : { tier: "FREE" as const }),
        },
        include: {
          signalSnapshot: true,
          lossAutopsy: true,
        },
        orderBy: [{ generatedAt: "desc" }],
        take: 5,
      },
      gameSignals: {
        orderBy: { fetchedAt: "desc" },
        take: 25,
      },
    },
  });

  if (!game) return null;

  const visibleGamePicks = viewer.canSeePremiumPicks
    ? game.picks
    : game.picks.filter((pick) => pick.tier === "FREE");
  const picks = visibleGamePicks.map((pick) => ({
    id: pick.id,
    selection: pick.selection,
    market: pick.pickType,
    confidence: viewer.canSeeConfidence ? pick.confidence : null,
    edgeScore: pick.edgeScore,
    isPublished: pick.isPublished,
    isBootstrap: pick.isBootstrap,
    result: pick.result,
    generatedAt: pick.generatedAt,
  }));
  const signals = game.gameSignals.map((signal) => ({
    sourceCategory: signal.sourceCategory,
    sourceName: signal.sourceName,
    signalKey: signal.signalKey,
    fetchedAt: signal.fetchedAt,
    expiresAt: signal.expiresAt,
    trustLevel: signal.trustLevel,
    isBootstrap: signal.isBootstrap,
  }));

  const node = buildGameIntelligenceNode({
    game: {
      id: game.id,
      homeTeamName: game.homeTeamName,
      awayTeamName: game.awayTeamName,
      sport: game.sport.name,
      commenceTime: game.commenceTime,
      status: game.status,
      currentEdgeIndex: game.currentEdgeIndex,
      bookmakerCoverageMax: game.bookmakerCoverageMax,
      dataQualityScore: game.dataQualityScore,
      // Line movement is the Pro-tier market read (`canSeeLineMovement` on the
      // board). Serve it ONLY past the gate; un-entitled viewers (anonymous →
      // FREE) get null so the public room never leaks the paid metric — the raw
      // value never even enters the node/HTML (CLAUDE.md rule #3).
      lineMovementSpread: viewer.canSeeLineMovement ? game.lineMovementSpread : null,
      lineMovementTotal: viewer.canSeeLineMovement ? game.lineMovementTotal : null,
      isBootstrap: false,
    },
    picks,
    signals,
    now,
  });
  const slateWeather = buildSlateWeather([node])[0] ?? {
    sport: node.sport,
    gameCount: 1,
    averageEvidenceScore: node.evidenceHealth.score,
    bootstrapGameCount: node.marketPulse.gatedByBootstrap ? 1 : 0,
  };
  const primaryPick = visibleGamePicks[0] ?? null;
  // The pre-mortem note embeds the paid factor trail — confidence at prediction,
  // line-movement delta, rest/schedule/ATS/H2H sample sizes, data-quality score,
  // and book depth (see `buildPickPremortemNote`). These are exactly the fields
  // the audit route (#103) gates behind PRO/ELITE. Build it ONLY past the
  // factor-breakdown gate; un-entitled viewers (anonymous → FREE) get null.
  const premortem =
    viewer.canSeeFactorBreakdown && primaryPick
      ? buildPickPremortemNote(primaryPick, primaryPick.signalSnapshot)
      : null;

  return {
    node,
    slateWeather,
    timeline: game.gameSignals.map((signal) => ({
      id: signal.id,
      label: signal.signalKey.replace(/_/g, " "),
      source: `${signal.sourceCategory}:${signal.sourceName}`,
      fetchedAt: signal.fetchedAt.toISOString(),
      status: timelineStatus(signal, now),
    })),
    premortem,
    lenses: LENSES.map((lens) =>
      projectForLens(node, lens, {
        canSeeConfidence: viewer.canSeeConfidence,
        canSeeFactorBreakdown: viewer.canSeeFactorBreakdown,
      }),
    ),
    memory: memoryForPick(primaryPick),
  };
}
