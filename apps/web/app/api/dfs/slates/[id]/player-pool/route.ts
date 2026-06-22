/**
 * GET /api/dfs/slates/[id]/player-pool
 * Returns all DfsSalaryRow records for a slate.
 */

import { NextResponse } from "next/server";
import { getSlate, getPlayerPool } from "@/lib/dfs/service";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const { id } = params;

    const slate = await getSlate(id);
    if (!slate) {
      return NextResponse.json({ error: `Slate "${id}" not found.` }, { status: 404 });
    }

    const playerPool = await getPlayerPool(id);
    return NextResponse.json({ slateId: id, playerPool });
  } catch (err) {
    console.error("[GET /api/dfs/slates/[id]/player-pool]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
