/**
 * GET /api/dfs/lineups/[id]/thesis
 * Generate and return the narrative thesis for a single DFS lineup.
 */

import { NextResponse } from "next/server";
import { db } from "@sports/db";
import { generateLineupThesis } from "@/lib/dfs/thesis/lineup-thesis";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const lineup = await db.dfsLineup.findUnique({
      where: { id: params.id },
      include: {
        players: true,
        lineupSet: {
          include: {
            run: true,
          },
        },
      },
    });

    if (!lineup) {
      return NextResponse.json({ error: "Lineup not found" }, { status: 404 });
    }

    const input = {
      lineupId: lineup.id,
      players: lineup.players.map((p) => ({
        name: p.name,
        position: p.position,
        team: p.team ?? "",
        projection: p.projection ?? 0,
        ceiling: p.ceiling ?? 0,
        ownership: p.ownership ?? 0,
        salary: p.salary ?? 0,
        isStack: p.isStack,
      })),
      salary: lineup.salary,
      projection: lineup.projection,
      ceiling: lineup.ceiling ?? 0,
      totalOwnership: lineup.totalOwnership ?? 0,
      stackTeam: lineup.primaryStack ?? null,
      contestMode: lineup.lineupSet.run.contestMode,
    };

    const thesis = generateLineupThesis(input);

    return NextResponse.json({ thesis });
  } catch (err) {
    console.error("[GET /api/dfs/lineups/[id]/thesis]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
