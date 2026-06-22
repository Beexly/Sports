/**
 * POST /api/dfs/projections/[id]/override
 *
 * Applies a manual override to a DfsPlayerProjection. Sets isManualOverride = true.
 *
 * Body (JSON):
 *   { meanProjection?, floorP10?, ceilingP90?, projectedOwnership?, notes? }
 */

import { NextResponse } from "next/server";
import { overrideProjection } from "@/lib/dfs/service";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const { id } = params;

    const body = (await req.json()) as {
      meanProjection?: number;
      floorP10?: number;
      ceilingP90?: number;
      projectedOwnership?: number;
      notes?: string;
    };

    const hasAnyOverride =
      body.meanProjection != null ||
      body.floorP10 != null ||
      body.ceilingP90 != null ||
      body.projectedOwnership != null ||
      body.notes != null;

    if (!hasAnyOverride) {
      return NextResponse.json(
        {
          error:
            "At least one override field is required: meanProjection, floorP10, " +
            "ceilingP90, projectedOwnership, or notes.",
        },
        { status: 400 }
      );
    }

    let projection;
    try {
      projection = await overrideProjection(id, {
        meanProjection: body.meanProjection,
        floorP10: body.floorP10,
        ceilingP90: body.ceilingP90,
        projectedOwnership: body.projectedOwnership,
        notes: body.notes,
      });
    } catch (err) {
      // Prisma throws when record not found
      if (
        err instanceof Error &&
        (err.message.includes("Record to update not found") ||
          err.message.includes("RecordNotFound"))
      ) {
        return NextResponse.json(
          { error: `Projection "${id}" not found.` },
          { status: 404 }
        );
      }
      throw err;
    }

    return NextResponse.json({ projection });
  } catch (err) {
    console.error("[POST /api/dfs/projections/[id]/override]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
