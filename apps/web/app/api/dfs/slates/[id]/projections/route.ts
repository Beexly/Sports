/**
 * GET /api/dfs/slates/[id]/projections
 *
 * Returns projection sets and projections for a slate.
 * - ?setId=<id>  — return projections for a specific projection set.
 * - (no param)   — return projections from the default set.
 *
 * Always returns the full list of projection sets regardless of ?setId.
 */

import { NextResponse } from "next/server";
import {
  getSlate,
  getProjectionSets,
  getProjections,
  getSlateProjections,
} from "@/lib/dfs/service";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const setId = searchParams.get("setId");

    const slate = await getSlate(id);
    if (!slate) {
      return NextResponse.json({ error: `Slate "${id}" not found.` }, { status: 404 });
    }

    const projectionSets = await getProjectionSets(id);

    const projections = setId
      ? await getProjections(setId)
      : await getSlateProjections(id);

    return NextResponse.json({ slateId: id, projectionSets, projections });
  } catch (err) {
    console.error("[GET /api/dfs/slates/[id]/projections]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
