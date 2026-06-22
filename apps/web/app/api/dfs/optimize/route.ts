/**
 * POST /api/dfs/optimize
 *
 * Runs the DFS lineup optimizer for a given slate and returns
 * the solved lineups. Persists an DfsOptimizerRun + DfsLineupSet +
 * DfsLineup + DfsLineupPlayer records in a transaction.
 */

import { NextResponse } from "next/server";
import { db } from "@sports/db";
import { solve } from "@/lib/dfs/optimizer/solver";
import type {
  SolverPlayer,
  ContestMode,
  SolverSettings,
} from "@/lib/dfs/optimizer/solver";
import type { DfsContestMode } from "@sports/db";

export const dynamic = "force-dynamic";

interface OptimizeBody {
  slateId: string;
  projectionSetId?: string;
  contestMode: string;
  lineupCount: number;
  settings?: SolverSettings;
  lockedPlayers?: string[];
  excludedPlayers?: string[];
}

const VALID_MODES: ContestMode[] = [
  "CASH",
  "BALANCED",
  "SINGLE_ENTRY",
  "SMALL_FIELD_GPP",
  "LARGE_FIELD_GPP",
  "CONTRARIAN",
  "LEVERAGE",
];

export async function POST(req: Request): Promise<Response> {
  try {
    const body: OptimizeBody = (await req.json()) as OptimizeBody;

    const {
      slateId,
      projectionSetId,
      contestMode,
      lineupCount,
      settings,
      lockedPlayers = [],
      excludedPlayers = [],
    } = body;

    // Validate lineupCount
    if (
      typeof lineupCount !== "number" ||
      lineupCount < 1 ||
      lineupCount > 150
    ) {
      return NextResponse.json(
        { error: "lineupCount must be between 1 and 150" },
        { status: 400 }
      );
    }

    // Validate contestMode
    if (!VALID_MODES.includes(contestMode as ContestMode)) {
      return NextResponse.json(
        {
          error: `Invalid contestMode "${contestMode}". Valid: ${VALID_MODES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Load slate
    const slate = await db.dfsSlate.findUnique({ where: { id: slateId } });
    if (!slate) {
      return NextResponse.json(
        { error: `Slate "${slateId}" not found` },
        { status: 404 }
      );
    }

    // Load salary rows
    const salaryRows = await db.dfsSalaryRow.findMany({
      where: { slateId },
    });

    if (salaryRows.length === 0) {
      return NextResponse.json(
        { error: "No salary rows found for this slate" },
        { status: 400 }
      );
    }

    // Load projections
    let projections: Awaited<ReturnType<typeof db.dfsPlayerProjection.findMany>> = [];

    if (projectionSetId) {
      projections = await db.dfsPlayerProjection.findMany({
        where: { projectionSetId },
      });
    } else {
      const defaultSet = await db.dfsProjectionSet.findFirst({
        where: { slateId, isDefault: true },
        orderBy: { generatedAt: "desc" },
      });
      if (defaultSet) {
        projections = await db.dfsPlayerProjection.findMany({
          where: { projectionSetId: defaultSet.id },
        });
      }
    }

    // Build a projection lookup: `${name}|${team}|${position}` → projection
    const projMap = new Map<
      string,
      {
        meanProjection: number;
        floorP10: number | null;
        ceilingP90: number | null;
        projectedOwnership: number | null;
      }
    >();

    for (const proj of projections) {
      const key = `${proj.name}|${proj.team}|${proj.position}`;
      projMap.set(key, {
        meanProjection: proj.meanProjection,
        floorP10: proj.floorP10 ?? null,
        ceilingP90: proj.ceilingP90 ?? null,
        projectedOwnership: proj.projectedOwnership ?? null,
      });
    }

    // Build SolverPlayer array
    const players: SolverPlayer[] = salaryRows.map((row) => {
      const key = `${row.name}|${row.team}|${row.position}`;
      const proj = projMap.get(key);

      // Determine projection values, falling back to avgPoints
      const base = proj?.meanProjection ?? (row.avgPoints ?? 0) * 1.0;
      const floor =
        proj?.floorP10 ?? (row.avgPoints != null ? row.avgPoints * 0.6 : base * 0.6);
      const ceiling =
        proj?.ceilingP90 ?? (row.avgPoints != null ? row.avgPoints * 1.4 : base * 1.4);
      const ownership = proj?.projectedOwnership ?? 0.1; // default 10% ownership

      const isLocked = lockedPlayers.some(
        (name) => name.toLowerCase() === row.name.toLowerCase()
      );
      const isExcluded = excludedPlayers.some(
        (name) => name.toLowerCase() === row.name.toLowerCase()
      );

      return {
        id: row.id,
        name: row.name,
        position: row.position,
        team: row.team,
        opponent: row.opponent ?? "",
        salary: row.salary,
        projection: base,
        floor,
        ceiling,
        ownership,
        isLocked,
        isExcluded,
      };
    });

    // Run solver
    const result = solve(
      players,
      contestMode as ContestMode,
      lineupCount,
      settings
    );

    // Persist in a transaction
    const { run, lineupSet } = await db.$transaction(async (tx) => {
      // Create optimizer run
      const run = await tx.dfsOptimizerRun.create({
        data: {
          slateId,
          projectionSetId: projectionSetId ?? null,
          site: "DRAFTKINGS",
          contestMode: contestMode as DfsContestMode,
          lineupCount,
          maxExposure: settings?.maxExposure ?? 0.6,
          lockedPlayers,
          excludedPlayers,
          status: "COMPLETE",
          completedAt: new Date(),
          engineVersion: "3.0.0",
          warningMessages: result.warnings,
        },
      });

      const { portfolioMetrics } = result;

      // Create lineup set
      const lineupSet = await tx.dfsLineupSet.create({
        data: {
          runId: run.id,
          avgProjection: portfolioMetrics.avgProjection,
          avgCeiling: portfolioMetrics.avgCeiling,
          avgOwnership: portfolioMetrics.avgOwnership,
          avgLeverage: portfolioMetrics.avgLeverage,
        },
      });

      // Create lineups + players
      for (let i = 0; i < result.lineups.length; i++) {
        const lineup = result.lineups[i];
        if (!lineup) continue;

        const dbLineup = await tx.dfsLineup.create({
          data: {
            lineupSetId: lineupSet.id,
            lineupNumber: i + 1,
            salary: lineup.salary,
            projection: lineup.projection,
            floor: lineup.floor,
            ceiling: lineup.ceiling,
            totalOwnership: lineup.totalOwnership,
            leverageScore: lineup.leverageScore,
            primaryStack: lineup.stackTeam ?? null,
          },
        });

        const slots = [
          "QB",
          "RB",
          "RB",
          "WR",
          "WR",
          "WR",
          "TE",
          "FLEX",
          "DST",
        ];

        for (let slotIdx = 0; slotIdx < lineup.players.length; slotIdx++) {
          const player = lineup.players[slotIdx];
          if (!player) continue;
          const slot = slots[slotIdx] ?? player.position;

          const isStack =
            lineup.stackTeam != null && player.team === lineup.stackTeam;

          await tx.dfsLineupPlayer.create({
            data: {
              lineupId: dbLineup.id,
              name: player.name,
              position: slot, // slot label (FLEX for flex slot)
              team: player.team,
              opponent: player.opponent || null,
              salary: player.salary,
              projection: player.projection,
              floor: player.floor,
              ceiling: player.ceiling,
              ownership: player.ownership,
              leverage:
                player.ceiling / Math.max(player.ownership * 100, 1),
              slotOrder: slotIdx,
              isStack,
              isBringBack: false,
              isLocked: player.isLocked,
            },
          });
        }
      }

      return { run, lineupSet };
    });

    return NextResponse.json({
      runId: run.id,
      lineupSetId: lineupSet.id,
      lineupCount: result.lineups.length,
      warnings: result.warnings,
      durationMs: result.durationMs,
      portfolioMetrics: result.portfolioMetrics,
      exposure: result.exposure,
      lineups: result.lineups.map((l, i) => ({
        lineupNumber: i + 1,
        salary: l.salary,
        projection: l.projection,
        floor: l.floor,
        ceiling: l.ceiling,
        totalOwnership: l.totalOwnership,
        leverageScore: l.leverageScore,
        stackTeam: l.stackTeam,
        stackCount: l.stackCount,
        objectiveScore: l.objectiveScore,
        players: l.players.map((p) => ({
          id: p.id,
          name: p.name,
          position: p.position,
          team: p.team,
          salary: p.salary,
          projection: p.projection,
          ownership: p.ownership,
        })),
      })),
    });
  } catch (err) {
    console.error("[POST /api/dfs/optimize]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
