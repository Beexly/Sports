/**
 * GET /api/dfs/lineup-sets/[id]/analytics
 * Load a DfsLineupSet with all lineups and players, compute portfolio analytics.
 */

import { NextResponse } from "next/server";
import { db } from "@sports/db";
import { analyzePortfolio } from "@/lib/dfs/portfolio/analytics";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const lineupSet = await db.dfsLineupSet.findUnique({
      where: { id: params.id },
      include: {
        lineups: {
          include: {
            players: true,
          },
        },
      },
    });

    if (!lineupSet) {
      return NextResponse.json(
        { error: `Lineup set "${params.id}" not found` },
        { status: 404 }
      );
    }

    const lineupInput = lineupSet.lineups.map((lineup) => ({
      primaryStack: lineup.primaryStack ?? null,
      players: lineup.players.map((player) => ({
        name: player.name,
        position: player.position,
        team: player.team ?? "",
        projection: player.projection ?? 0,
        ceiling: player.ceiling ?? 0,
        ownership: player.ownership ?? 0,
        salary: player.salary ?? 0,
      })),
    }));

    const analytics = analyzePortfolio(lineupInput);

    return NextResponse.json({ lineupSet: { id: lineupSet.id, name: lineupSet.name }, analytics });
  } catch (err) {
    console.error("[GET /api/dfs/lineup-sets/[id]/analytics]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
