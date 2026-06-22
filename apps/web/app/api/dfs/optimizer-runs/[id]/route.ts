/**
 * GET /api/dfs/optimizer-runs/[id]
 *
 * Returns a single DfsOptimizerRun with its lineup sets and lineups.
 */

import { NextResponse } from "next/server";
import { db } from "@sports/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const { id } = params;

    const run = await db.dfsOptimizerRun.findUnique({
      where: { id },
      include: {
        lineupSets: {
          orderBy: { createdAt: "asc" },
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
        },
      },
    });

    if (!run) {
      return NextResponse.json(
        { error: `Optimizer run "${id}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ run });
  } catch (err) {
    console.error("[GET /api/dfs/optimizer-runs/[id]]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
