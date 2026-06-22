/**
 * POST /api/dfs/lineup-sets/[id]/export
 *
 * Exports a lineup set in DraftKings CSV or JSON format.
 * Body: { format: "DK_CSV" | "JSON" }
 */

import { NextResponse } from "next/server";
import { db } from "@sports/db";

export const dynamic = "force-dynamic";

const DK_HEADER = "QB,RB,RB,WR,WR,WR,TE,FLEX,DST";

interface ExportBody {
  format: "DK_CSV" | "JSON";
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const { id } = params;
    const body: ExportBody = (await req.json()) as ExportBody;
    const { format } = body;

    if (format !== "DK_CSV" && format !== "JSON") {
      return NextResponse.json(
        { error: 'format must be "DK_CSV" or "JSON"' },
        { status: 400 }
      );
    }

    // Load lineup set with lineups and players
    const lineupSet = await db.dfsLineupSet.findUnique({
      where: { id },
      include: {
        lineups: {
          orderBy: { lineupNumber: "asc" },
          include: {
            players: {
              orderBy: { slotOrder: "asc" },
            },
          },
        },
      },
    });

    if (!lineupSet) {
      return NextResponse.json(
        { error: `Lineup set "${id}" not found` },
        { status: 404 }
      );
    }

    if (format === "JSON") {
      return NextResponse.json({
        lineupSetId: lineupSet.id,
        runId: lineupSet.runId,
        avgProjection: lineupSet.avgProjection,
        avgCeiling: lineupSet.avgCeiling,
        avgOwnership: lineupSet.avgOwnership,
        avgLeverage: lineupSet.avgLeverage,
        lineups: lineupSet.lineups.map((lineup) => ({
          lineupNumber: lineup.lineupNumber,
          salary: lineup.salary,
          projection: lineup.projection,
          floor: lineup.floor,
          ceiling: lineup.ceiling,
          totalOwnership: lineup.totalOwnership,
          leverageScore: lineup.leverageScore,
          primaryStack: lineup.primaryStack,
          players: lineup.players.map((p) => ({
            slotOrder: p.slotOrder,
            position: p.position,
            name: p.name,
            team: p.team,
            opponent: p.opponent,
            salary: p.salary,
            projection: p.projection,
            ownership: p.ownership,
          })),
        })),
      });
    }

    // DK_CSV format
    const rows: string[] = [DK_HEADER];

    for (const lineup of lineupSet.lineups) {
      // Players are already sorted by slotOrder
      const playerNames = lineup.players.map((p) => p.name);

      // Ensure exactly 9 players
      while (playerNames.length < 9) {
        playerNames.push("");
      }

      rows.push(playerNames.slice(0, 9).join(","));
    }

    const csv = rows.join("\n");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="lineups.csv"',
      },
    });
  } catch (err) {
    console.error("[POST /api/dfs/lineup-sets/[id]/export]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
