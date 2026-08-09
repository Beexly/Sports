/**
 * B2B experimental probabilities — research grade while RED.
 */

import { NextResponse } from "next/server";
import {
  authorizeB2bApiKey,
  extractB2bApiKey,
  rateLimitB2b,
} from "@/lib/b2b/api-key-auth";
import { db, isStubMode } from "@sports/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  if (!authorizeB2bApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const key = extractB2bApiKey(req) ?? "";
  const rl = rateLimitB2b(key, 30);
  if (!rl.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  if (isStubMode()) {
    return NextResponse.json({
      schemaVersion: "v1",
      surface: "probabilities",
      claimPosture: "experimental_research_grade_not_verified_roi",
      data: [],
    });
  }

  const picks = await db.pick
    .findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        NOT: { modelVersion: "v5.0.0-seed" },
      },
      orderBy: { generatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        confidence: true,
        pickType: true,
        modelVersion: true,
        game: { select: { sport: { select: { key: true } } } },
      },
    })
    .catch(() => []);

  return NextResponse.json({
    schemaVersion: "v1",
    surface: "probabilities",
    claimPosture: "experimental_research_grade_not_verified_roi",
    data: picks.map((p) => ({
      id: p.id,
      sport: p.game?.sport?.key ?? null,
      market: p.pickType,
      pModel:
        typeof p.confidence === "number"
          ? Math.min(1, Math.max(0, p.confidence / 100))
          : null,
      modelVersion: p.modelVersion,
    })),
    disclaimer:
      "Experimental probabilities for research/integration. Not a verified edge product.",
  });
}
