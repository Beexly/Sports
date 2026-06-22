/**
 * POST /api/dfs/lineup-sets/[id]/late-swap
 *
 * Processes late-swap recommendations for a DFS lineup set.
 * Finds scratched players, recommends replacements, and persists swap events.
 *
 * Body: {
 *   scratchedPlayers: string[];
 *   updatedProjections?: Array<{ name: string; projection: number }>;
 * }
 */

import { NextResponse } from "next/server";
import { db } from "@sports/db";
import { lateSwap } from "@/lib/dfs/late-swap/engine";
import type { SolverPlayer, SolverSettings } from "@/lib/dfs/optimizer/solver";

export const dynamic = "force-dynamic";

interface LateSwapBody {
  scratchedPlayers: string[];
  updatedProjections?: Array<{ name: string; projection: number }>;
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const { id } = params;

    const body = (await req.json()) as LateSwapBody;
    const { scratchedPlayers, updatedProjections } = body;

    if (!Array.isArray(scratchedPlayers)) {
      return NextResponse.json(
        { error: "scratchedPlayers must be an array" },
        { status: 400 }
      );
    }

    // Load lineup set with all lineups and players
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
        run: {
          include: {
            projectionSet: {
              include: {
                projections: true,
              },
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

    // Build projection lookup map for available player data
    const projectionMap = new Map<string, SolverPlayer>();

    if (lineupSet.run.projectionSet) {
      for (const proj of lineupSet.run.projectionSet.projections) {
        const key = `${proj.name.toLowerCase()}|${proj.team.toLowerCase()}`;
        // Apply any updated projections from the request body
        let projection = proj.meanProjection;
        if (updatedProjections) {
          const override = updatedProjections.find(
            (u) => u.name.toLowerCase() === proj.name.toLowerCase()
          );
          if (override !== undefined) {
            projection = override.projection;
          }
        }

        projectionMap.set(key, {
          id: proj.id,
          name: proj.name,
          position: proj.position,
          team: proj.team,
          opponent: proj.opponent ?? "",
          salary: proj.salary ?? 0,
          projection,
          floor: proj.floorP10 ?? proj.floorP25 ?? projection,
          ceiling: proj.ceilingP90 ?? proj.ceilingP75 ?? projection,
          ownership: proj.projectedOwnership ?? 0.1,
          isLocked: false,
          isExcluded: false,
        });
      }
    }

    // Build SolverPlayer from DfsLineupPlayer — used for existing lineup players
    function lineupPlayerToSolver(
      lp: NonNullable<typeof lineupSet>["lineups"][0]["players"][0]
    ): SolverPlayer {
      const key = `${lp.name.toLowerCase()}|${(lp.team ?? "").toLowerCase()}`;
      const fromProjection = projectionMap.get(key);

      // Apply updated projections if provided
      let projection = fromProjection?.projection ?? lp.projection ?? 0;
      if (updatedProjections) {
        const override = updatedProjections.find(
          (u) => u.name.toLowerCase() === lp.name.toLowerCase()
        );
        if (override !== undefined) {
          projection = override.projection;
        }
      }

      return {
        id: fromProjection?.id ?? lp.id,
        name: lp.name,
        position: lp.position,
        team: lp.team ?? fromProjection?.team ?? "",
        opponent: lp.opponent ?? fromProjection?.opponent ?? "",
        salary: lp.salary ?? fromProjection?.salary ?? 0,
        projection,
        floor: lp.floor ?? fromProjection?.floor ?? projection,
        ceiling: lp.ceiling ?? fromProjection?.ceiling ?? projection,
        ownership: lp.ownership ?? fromProjection?.ownership ?? 0.1,
        isLocked: lp.isLocked ?? false,
        isExcluded: false,
      };
    }

    // Convert existing lineups to solver format
    const existingLineups = lineupSet.lineups.map((lineup) => ({
      lineupId: lineup.id,
      players: lineup.players.map(lineupPlayerToSolver),
    }));

    // All projection players are available as replacements
    const availablePlayers = Array.from(projectionMap.values());

    // Build settings from the optimizer run
    const settings: SolverSettings = {
      salaryCap: 50000,
    };

    // Run late swap engine
    const result = lateSwap({
      existingLineups,
      availablePlayers,
      scratchedPlayers,
      settings,
    });

    // Persist swap events for each actual swap (where a replacement was made)
    const swapEvents = result.swaps.filter(
      (s) => s.replacementPlayer !== null && scratchedPlayers.some(
        (sp) => sp.toLowerCase() === s.originalPlayer.toLowerCase()
      )
    );

    if (swapEvents.length > 0) {
      await db.dfsLateSwapEvent.createMany({
        data: swapEvents.map((swap) => ({
          lineupSetId: id,
          originalPlayer: swap.originalPlayer,
          replacementPlayer: swap.replacementPlayer,
          projectionChange: swap.projectionChange,
          ownershipChange: swap.ownershipChange,
          salaryChange: swap.salaryChange,
          swapType: "SCRATCH",
          isRecommended: true,
          whySwap: swap.whySwap || null,
          whyHold: swap.whyHold || null,
          appliedAt: new Date(),
        })),
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/dfs/lineup-sets/[id]/late-swap]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
