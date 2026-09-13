/**
 * B2B experimental probabilities — research grade while RED.
 * rankingP when present (independent-priced sort key); never verified ROI.
 */

import { NextResponse } from "next/server";
import {
  extractB2bApiKey,
  resolveB2bKeyScope,
  rateLimitB2b,
} from "@/lib/b2b/api-key-auth";
import { db, isStubMode } from "@sports/db";
import { rankingSortKey } from "@/lib/ranking/sort-key";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  // Scope decides whether this key may see PREMIUM rows. A bare key is FREE-only.
  const scope = resolveB2bKeyScope(req);
  if (scope === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const key = extractB2bApiKey(req) ?? "";
  const rl = await rateLimitB2b(key, 30);
  if (!rl.ok) {
    return NextResponse.json(
      { error: rl.status === 429 ? "Rate limit exceeded" : "Rate limit service unavailable" },
      { status: rl.status },
    );
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
        // Tier gate: only a :premium-scoped key sees PREMIUM rows. Without this the
        // route emitted Pro-gated confidence + factorBreakdown for the whole board.
        ...(scope === "premium" ? {} : { tier: "FREE" as const }),
      },
      orderBy: { generatedAt: "desc" },
      take: 80,
      select: {
        id: true,
        confidence: true,
        pickType: true,
        modelVersion: true,
        factorBreakdown: true,
        game: { select: { sport: { select: { key: true } } } },
      },
    })
    .catch(() => []);

  const data = picks
    .map((p) => {
      const fb = p.factorBreakdown as Record<string, unknown> | null;
      let rankingP: number | null = null;
      let rankingSource: string | null = null;
      let marketFairProb: number | null = null;
      if (fb && typeof fb === "object") {
        const rp = fb["rankingP"];
        if (typeof rp === "number" && Number.isFinite(rp)) {
          rankingP = Math.min(1, Math.max(0, rp));
        }
        const rs = fb["rankingSource"];
        if (typeof rs === "string" && rs.trim()) rankingSource = rs.trim();
        const mfp = fb["marketFairProb"];
        if (typeof mfp === "number" && Number.isFinite(mfp)) {
          marketFairProb = Math.min(1, Math.max(0, mfp));
        }
      }
      const conf = typeof p.confidence === "number" ? p.confidence : 0;
      return {
        id: p.id,
        sport: p.game?.sport?.key ?? null,
        market: p.pickType,
        // RETIRED (v5.2.8 Phase 2, CAL-06). This used to carry confidence/100
        // and call it a model probability. It is not one: measured on 2,385
        // settled picks, confidence 80+ claims 0.8663 and realizes 0.5191
        // (z = -10.7), and the curve is not even monotone — realized win rate
        // peaks at confidence 75-79 and falls below the lowest band by 90-94.
        // The key is kept and pinned to null so an integrator reading it gets
        // nothing rather than a wrong number; the score itself is published
        // below under a name that says what it is.
        pModel: null,
        /** The 0-100 selection score, as a score. Never divide this by 100. */
        confidenceScore: typeof p.confidence === "number" ? p.confidence : null,
        rankingP,
        rankingSource,
        marketFairProb,
        /** De-vig method behind marketFairProb. Proportional on every path today. */
        marketFairMethod: marketFairProb == null ? null : "proportional",
        modelVersion: p.modelVersion,
        _sort: rankingSortKey({ confidence: conf, factorBreakdown: p.factorBreakdown }),
      };
    })
    .sort((a, b) => b._sort - a._sort)
    .map(({ _sort, ...row }) => row);

  return NextResponse.json({
    schemaVersion: "v1",
    surface: "probabilities",
    claimPosture: "experimental_research_grade_not_verified_roi",
    data,
    disclaimer:
      "Experimental probabilities for research/integration. rankingP is a model ranking key when present — not a verified edge product. Eligibility may be RED. " +
      "pModel is RETIRED and always null: it used to be the 0-100 selection score divided by 100, which is not a win probability at any scale. " +
      "confidenceScore is that selection score, on its own 0-100 scale — do not divide it by 100 and do not read it as a probability; it is measurably anti-predictive at its top end. " +
      "marketFairProb is the only probability here: the de-vigged consensus of quoted book prices for the picked side, with marketFairMethod naming the de-vig used. " +
      "rankingP is the model's ranking key. The calibration floors are computed on market-anchored probabilities only.",
  });
}
