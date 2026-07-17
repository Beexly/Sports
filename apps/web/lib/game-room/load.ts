import { createHash } from "node:crypto";
import { db } from "@sports/db";
import {
  buildGameIntelligenceNode,
  buildSlateWeather,
  projectForLens,
  type UserLens,
} from "@/lib/intelligence-graph";
import { buildPickPremortemNote } from "@/lib/premortem/build";
import {
  buildDecisionChangeCertificate,
  buildEpistemicDeltaLedger,
  buildRoomEvidenceEnvelope,
  projectIntelligenceEvents,
  projectPickEvidenceEnvelope,
} from "@/lib/intelligence-playback";
import { gameRoomEvidenceRecord } from "./evidence-record";
import { memoryForPick, timelineStatus } from "./presenters";
import type { GameRoomData, GameRoomViewer } from "./types";

export type { GameRoomData, GameRoomViewer } from "./types";

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
const FAIL_CLOSED_VIEWER: GameRoomViewer = {
  canSeePremiumPicks: false,
  canSeeConfidence: false,
  canSeeFactorBreakdown: false,
  canSeeLineMovement: false,
};

const LENSES: readonly UserLens[] = ["FAN", "BETTOR", "CREATOR", "ANALYST"];

function sha256(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}

export async function loadGameRoom(
  gameId: string,
  viewer: GameRoomViewer = FAIL_CLOSED_VIEWER,
  now = new Date(),
): Promise<GameRoomData | null> {
  const game = await db.game
    .findUnique({
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
            proofReceipt: true,
          },
          orderBy: [{ generatedAt: "desc" }],
          take: 5,
        },
        gameSignals: {
          orderBy: { fetchedAt: "desc" },
          take: 25,
        },
        gateDecisions: {
          where: { isBootstrap: false },
          orderBy: { evaluatedAt: "desc" },
          take: 10,
        },
        odds: {
          select: {
            id: true,
            ingestionRunId: true,
            bookmaker: true,
            market: true,
            fetchedAt: true,
            spread: true,
            total: true,
            homePrice: true,
            awayPrice: true,
            ingestionRun: {
              select: {
                status: true,
                sourceSnapshots: {
                  select: {
                    id: true,
                    ingestionRunId: true,
                    provider: true,
                    sourceKind: true,
                    fetchedAt: true,
                    payloadHash: true,
                  },
                  orderBy: { fetchedAt: "desc" },
                  take: 10,
                },
              },
            },
          },
          orderBy: { fetchedAt: "desc" },
          take: 120,
        },
      },
    })
    .catch(() => null);

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
  const evidenceEnvelope = buildRoomEvidenceEnvelope(
    gameRoomEvidenceRecord(game, primaryPick),
    sha256,
  );
  const playbackAudience = viewer.canSeeLineMovement ? "PAID" : "PUBLIC";
  const playbackProjection = evidenceEnvelope
    ? projectPickEvidenceEnvelope(evidenceEnvelope, playbackAudience)
    : null;
  const playbackEvents = evidenceEnvelope
    ? projectIntelligenceEvents(evidenceEnvelope, playbackAudience)
    : [];
  const playback = evidenceEnvelope && playbackProjection
    ? {
        digest: evidenceEnvelope.digest,
        publication: viewer.canSeeFactorBreakdown
          ? playbackProjection.publication
          : { ...playbackProjection.publication, unboundFactors: [] },
        events: playbackEvents,
        deltas: buildEpistemicDeltaLedger(playbackEvents),
        changeCertificate: buildDecisionChangeCertificate(evidenceEnvelope.digest, playbackEvents),
      }
    : null;
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
    playback,
  };
}
