import { db } from "@sports/db";
import {
  buildStudioDraftsForNode,
  buildStudioNode,
  type StudioDashboardData,
  type StudioGameOption,
} from "@/lib/studio/build-assets";

function gameOptionFromNode(node: ReturnType<typeof buildStudioNode>): StudioGameOption {
  return {
    id: node.id,
    matchup: node.matchup,
    sport: node.sport,
    commenceTime: node.commenceTime,
    edgeIndex: node.marketPulse.edgeIndex,
    evidenceStatus: node.evidenceHealth.status,
  };
}

export async function loadStudioDashboard(
  selectedGameId?: string | null,
  now = new Date()
): Promise<StudioDashboardData> {
  const rows = await db.game
    .findMany({
      include: {
        sport: { select: { name: true } },
        picks: {
          where: {
            isPublished: true,
            isBootstrap: false,
            NOT: { modelVersion: "v5.0.0-seed" },
          },
          orderBy: [{ generatedAt: "desc" }],
          take: 3,
        },
        gameSignals: {
          orderBy: { fetchedAt: "desc" },
          take: 12,
        },
      },
      orderBy: [{ commenceTime: "asc" }],
      take: 12,
    })
    .catch(() => []);

  const nodes = rows.map((game) =>
    buildStudioNode({
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
        lineMovementSpread: game.lineMovementSpread,
        lineMovementTotal: game.lineMovementTotal,
        isBootstrap: false,
      },
      picks: game.picks.map((pick) => ({
        id: pick.id,
        selection: pick.selection,
        market: pick.pickType,
        confidence: pick.confidence,
        edgeScore: pick.edgeScore,
        isPublished: pick.isPublished,
        isBootstrap: pick.isBootstrap,
        result: pick.result,
        generatedAt: pick.generatedAt,
      })),
      signals: game.gameSignals.map((signal) => ({
        sourceCategory: signal.sourceCategory,
        sourceName: signal.sourceName,
        signalKey: signal.signalKey,
        fetchedAt: signal.fetchedAt,
        expiresAt: signal.expiresAt,
        trustLevel: signal.trustLevel,
        isBootstrap: signal.isBootstrap,
      })),
      now,
    })
  );

  const selectedNode =
    nodes.find((node) => node.id === selectedGameId) ?? nodes[0] ?? null;
  const games = nodes.map(gameOptionFromNode);

  return {
    games,
    selectedGame: selectedNode ? gameOptionFromNode(selectedNode) : null,
    selectedNode,
    drafts: selectedNode
      ? buildStudioDraftsForNode(selectedNode, {
          gameId: selectedNode.id,
          modelVersion: selectedNode.picks[0]?.id ? "current" : "current",
          brandConfig: {
            publicUrl: "https://galaxysportsedge.com",
            voiceReferences: ["docs/positioning.md", "docs/product/galaxy-studio-spec.md"],
          },
        })
      : [],
  };
}
