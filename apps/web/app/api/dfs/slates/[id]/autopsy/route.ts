/**
 * POST /api/dfs/slates/[id]/autopsy
 *
 * Runs post-slate autopsy: compares projected vs actual results, computes
 * calibration metrics, and persists DfsAutopsy + DfsCalibrationResult rows.
 *
 * Body: {
 *   modelVersion: string;
 *   sport?: string;
 *   playerResults: Array<{
 *     name: string;
 *     team: string;
 *     position: string;
 *     projectedPoints: number;
 *     actualPoints: number;
 *     projectedOwnership: number;
 *     actualOwnership: number;
 *   }>;
 * }
 */

import { NextResponse } from "next/server";
import { db } from "@sports/db";
import { runAutopsy } from "@/lib/dfs/calibration/autopsy";
import type { AutopsyInput, SlatePlayerResult } from "@/lib/dfs/calibration/autopsy";

export const dynamic = "force-dynamic";

interface AutopsyBody {
  modelVersion: string;
  sport?: string;
  playerResults: SlatePlayerResult[];
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const { id } = params;

    // Verify slate exists
    const slate = await db.dfsSlate.findUnique({ where: { id } });
    if (!slate) {
      return NextResponse.json(
        { error: `Slate "${id}" not found` },
        { status: 404 }
      );
    }

    const body = (await req.json()) as AutopsyBody;
    const { modelVersion, sport, playerResults } = body;

    if (!modelVersion || typeof modelVersion !== "string") {
      return NextResponse.json(
        { error: "modelVersion is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(playerResults) || playerResults.length === 0) {
      return NextResponse.json(
        { error: "playerResults must be a non-empty array" },
        { status: 400 }
      );
    }

    // Validate each result row
    for (const r of playerResults) {
      if (
        typeof r.name !== "string" ||
        typeof r.team !== "string" ||
        typeof r.position !== "string" ||
        typeof r.projectedPoints !== "number" ||
        typeof r.actualPoints !== "number" ||
        typeof r.projectedOwnership !== "number" ||
        typeof r.actualOwnership !== "number"
      ) {
        return NextResponse.json(
          {
            error:
              "Each playerResult must have name, team, position, projectedPoints, actualPoints, projectedOwnership, actualOwnership",
          },
          { status: 400 }
        );
      }
    }

    const input: AutopsyInput = {
      slateId: id,
      modelVersion,
      sport,
      playerResults,
    };

    const output = await runAutopsy(input);

    return NextResponse.json({
      slateId: output.slateId,
      modelVersion: output.modelVersion,
      calibration: output.calibration,
      playerCount: output.playerRecords.length,
      playerRecords: output.playerRecords,
    });
  } catch (err) {
    console.error("[POST /api/dfs/slates/[id]/autopsy]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const { id } = params;

    const [autopsies, calibrations] = await Promise.all([
      db.dfsAutopsy.findMany({
        where: { slateId: id },
        orderBy: [{ autopsyCategory: "asc" }, { playerName: "asc" }],
      }),
      db.dfsCalibrationResult.findMany({
        where: { slateId: id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({ autopsies, calibrations });
  } catch (err) {
    console.error("[GET /api/dfs/slates/[id]/autopsy]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
