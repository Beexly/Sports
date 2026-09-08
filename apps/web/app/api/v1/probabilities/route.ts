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
import { jsonNoStore } from "@/lib/api/no-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  // Scope decides whether this key may see PREMIUM rows. A bare key is FREE-only.
  const scope = resolveB2bKeyScope(req);
  if (scope === null) {
    return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  }
  const key = extractB2bApiKey(req) ?? "";
  const rl = await rateLimitB2b(key, 30);
  if (!rl.ok) {
    return jsonNoStore(
      { error: rl.status === 429 ? "Rate limit exceeded" : "Rate limit service unavailable" },
      { status: rl.status },
    );
  }

  if (isStubMode()) {
    return jsonNoStore({
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
      let marketFairSource: string | null = null;
      let marketBookCount: number | null = null;
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
        // C-257 (Devin). A signal-slate pick keeps the top-level field null and
        // carries its de-vigged anchor inside independentEdge (C-253), so this
        // route served null for a price we hold. The board path fills the
        // top-level field, so it stays preferred and this is a fallback, never
        // an override.
        //
        // The provenance travels with the number. A bare probability here would
        // let a caller read a SINGLE stored book as the two-book floor a
        // board-priced pick requires, which is the same mislabelling this
        // branch has spent the day removing. Both fields are present only when
        // the nested anchor supplied the value, and null when the board did.
        const ie = fb["independentEdge"];
        if (marketFairProb == null && ie !== null && typeof ie === "object") {
          const nested = ie as Record<string, unknown>;
          const nestedP = nested["marketFairProb"];
          if (typeof nestedP === "number" && Number.isFinite(nestedP)) {
            marketFairProb = Math.min(1, Math.max(0, nestedP));
            const src = nested["marketFairSource"];
            if (typeof src === "string" && src.trim()) marketFairSource = src.trim();
            const books = nested["marketBookCount"];
            if (typeof books === "number" && Number.isFinite(books)) {
              marketBookCount = books;
            }
          }
        }
      }
      const conf = typeof p.confidence === "number" ? p.confidence : 0;
      return {
        id: p.id,
        sport: p.game?.sport?.key ?? null,
        market: p.pickType,
        pModel:
          typeof p.confidence === "number"
            ? Math.min(1, Math.max(0, p.confidence / 100))
            : null,
        rankingP,
        rankingSource,
        marketFairProb,
        marketFairSource,
        marketBookCount,
        modelVersion: p.modelVersion,
        _sort: rankingSortKey({ confidence: conf, factorBreakdown: p.factorBreakdown }),
      };
    })
    .sort((a, b) => b._sort - a._sort)
    .map(({ _sort, ...row }) => row);

  return jsonNoStore({
    schemaVersion: "v1",
    surface: "probabilities",
    claimPosture: "experimental_research_grade_not_verified_roi",
    data,
    disclaimer:
      "Experimental probabilities for research/integration. rankingP is a model ranking key when present — not a verified edge product. Eligibility may be RED. " +
      "pModel is the 0-100 Edge Index divided by 100. It is a CONFIDENCE SCORE, not a calibrated win probability, and this service never scores it as one: " +
      "the calibration floors are computed on market-anchored probabilities only. Use marketFairProb for a market probability and rankingP for the model's ranking key. " +
      "marketFairSource and marketBookCount are present when marketFairProb came from the stored odds table rather than a live board read. " +
      "market_p_single_book means ONE bookmaker quoted both sides, which is below the two-book floor a board-priced pick requires: do not read it as one. " +
      "Whether pModel should carry a real probability instead of the confidence score is an open product decision (ledger C-88); until it is taken, this note is the contract.",
  });
}
