/**
 * GET /api/dfs/players/[name]/signals
 * Load DfsNarrativeSignal[] for a player name, with impact classification.
 */

import { NextResponse } from "next/server";
import { db } from "@sports/db";
import { classifyNarrativeImpact } from "@/lib/dfs/narrative/signals";
import type { DfsNarrativeSignalType } from "@sports/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { name: string } }
): Promise<Response> {
  try {
    const name = decodeURIComponent(params.name);

    const signals = await db.dfsNarrativeSignal.findMany({
      where: { playerName: name },
      orderBy: { createdAt: "desc" },
    });

    const signalsWithImpact = signals.map((signal) => {
      const impactResult = classifyNarrativeImpact({
        playerName: signal.playerName,
        team: signal.team ?? "",
        slateId: signal.slateId ?? undefined,
        signalType: signal.signalType as DfsNarrativeSignalType,
        claim: signal.claim,
        evidence: signal.evidence,
        counterEvidence: signal.counterEvidence ?? undefined,
        falsifiers: signal.falsifiers,
        confidence: signal.confidence ?? undefined,
      });

      return { ...signal, impactResult };
    });

    return NextResponse.json({ signals: signalsWithImpact });
  } catch (err) {
    console.error("[GET /api/dfs/players/[name]/signals]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
