/**
 * POST /api/dfs/lineup-sets/[id]/simulate
 * Run Monte Carlo simulation over all lineups in a lineup set.
 * Persists DfsSimulationRun + DfsSimulationResult records.
 */

import { NextResponse } from "next/server";
import { db } from "@sports/db";
import { simulate } from "@/lib/dfs/simulation/engine";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const body = (await req.json().catch(() => ({}))) as { iterations?: unknown };

    // Parse and clamp iterations
    const rawIterations = typeof body.iterations === "number" ? body.iterations : 5000;
    const iterations = Math.min(10_000, Math.max(1_000, Math.round(rawIterations)));

    // Load lineup set with all lineups and players
    const lineupSet = await db.dfsLineupSet.findUnique({
      where: { id: params.id },
      include: {
        run: true,
        lineups: {
          include: {
            players: true,
          },
        },
      },
    });

    if (!lineupSet) {
      return NextResponse.json({ error: "Lineup set not found" }, { status: 404 });
    }

    // Collect unique players across all lineups for simulation
    const playerMap = new Map<
      string,
      {
        id: string;
        name: string;
        projection: number;
        floor: number;
        ceiling: number;
        ownership: number;
      }
    >();

    for (const lineup of lineupSet.lineups) {
      for (const p of lineup.players) {
        if (!playerMap.has(p.id)) {
          playerMap.set(p.id, {
            id: p.id,
            name: p.name,
            projection: p.projection ?? 0,
            floor: p.floor ?? 0,
            ceiling: p.ceiling ?? 0,
            ownership: p.ownership ?? 0,
          });
        }
      }
    }

    const simInput = {
      players: Array.from(playerMap.values()),
      lineups: lineupSet.lineups.map((l) => ({
        players: l.players.map((p) => p.id),
      })),
      iterations,
    };

    // Run the simulation
    const result = simulate(simInput);

    // Persist simulation run
    const simRun = await db.dfsSimulationRun.create({
      data: {
        optimizerRunId: lineupSet.runId,
        iterations,
        status: "COMPLETE",
        useCorrelations: false,
        completedAt: new Date(),
      },
    });

    // Persist per-lineup results
    const lineupResultData = lineupSet.lineups.map((lineup, li) => {
      const lr = result.lineupResults[li];
      return {
        simRunId: simRun.id,
        lineupId: lineup.id,
        p50: lr?.p50 ?? null,
        p75: lr?.p75 ?? null,
        p90: lr?.p90 ?? null,
        p95: lr?.p95 ?? null,
        p99: lr?.p99 ?? null,
        cashRateEstimate: lr?.cashRateEstimate ?? null,
        top10PctEstimate: lr?.top10PctEstimate ?? null,
        top1PctEstimate: lr?.top1PctEstimate ?? null,
        bustProbability: lr?.bustProbability ?? null,
      };
    });

    await db.dfsSimulationResult.createMany({ data: lineupResultData });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/dfs/lineup-sets/[id]/simulate]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
