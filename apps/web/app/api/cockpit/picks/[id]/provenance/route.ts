import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildPickProvenance } from "@/lib/cockpit/pick-provenance";

export const dynamic = "force-dynamic";

function jsonNoStore(body: unknown, status: number): NextResponse {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return jsonNoStore(
      { error: "Admin role required for cockpit endpoints" },
      403
    );
  }

  const userId = session.user.email ?? session.user.id ?? "anon-admin";
  const limit = await checkRateLimit(userId, {
    route: "cockpit-pick-provenance",
    windowMs: 60_000,
    maxRequests: 10,
    failureMode: "fail-closed",
  });
  if (!limit.allowed) {
    return jsonNoStore(
      {
        error: "Rate limit exceeded",
        retryAfter: limit.resetAt ? Math.ceil((limit.resetAt - Date.now()) / 1000) : 60,
      },
      429
    );
  }

  const id = params.id;
  if (!id || typeof id !== "string") {
    return jsonNoStore({ error: "Pick ID required" }, 400);
  }

  const pick = await db.pick.findUnique({
    where: { id },
    include: {
      game: {
        include: {
          odds: {
            select: { ingestionRunId: true },
            orderBy: { fetchedAt: "desc" },
            take: 50,
          },
        },
      },
    },
  });
  if (!pick) {
    return jsonNoStore({ error: `Pick ${id} not found` }, 404);
  }

  const runIds = Array.from(
    new Set(
      [pick.ingestionRunId, ...(pick.game.odds ?? []).map((o) => o.ingestionRunId)].filter(
        (x): x is string => typeof x === "string" && x.length > 0
      )
    )
  );

  const sourceRows = runIds.length
    ? await db.sourceSnapshot.findMany({
        where: { ingestionRunId: { in: runIds } },
        orderBy: { fetchedAt: "desc" },
        take: 50,
        select: {
          id: true,
          provider: true,
          sourceKind: true,
          fetchedAt: true,
          payloadHash: true,
          payloadBytes: true,
          ingestionRunId: true,
        },
      })
    : [];

  const provenance = buildPickProvenance(
    {
      id: pick.id,
      pickType: pick.pickType,
      selection: pick.selection,
      line: pick.line,
      confidence: pick.confidence,
      edgeScore: pick.edgeScore,
      consensusPct: pick.consensusPct,
      bookmakerCount: pick.bookmakerCount,
      tier: pick.tier,
      pickGrade: pick.pickGrade,
      riskLevel: pick.riskLevel,
      reasoning: pick.reasoning,
      reasoningShort: pick.reasoningShort,
      modelVersion: pick.modelVersion,
      generatedAt: pick.generatedAt,
      dataFreshnessAt: pick.dataFreshnessAt,
      factorBreakdown: pick.factorBreakdown,
    },
    sourceRows.map((row) => ({
      id: row.id,
      provider: row.provider,
      sourceKind: String(row.sourceKind),
      fetchedAt: row.fetchedAt,
      payloadHash: row.payloadHash,
      payloadBytes: row.payloadBytes,
      ingestionRunId: row.ingestionRunId,
    }))
  );

  return jsonNoStore(provenance, 200);
}
