import { NextResponse } from "next/server";
import { db } from "@sports/db";
import { verifyReceiptIntegrity } from "@/lib/proof/receipt-proof";
import { SITE_URL } from "@/lib/seo/site-url";

/**
 * GET /api/proof/receipts — the enumerable, machine-verifiable record.
 *
 * The completion of the Proof surface: an agent reads /llms.txt, follows the
 * ledger summary at /api/proof/ledger, and lands here to enumerate every
 * SETTLED pick receipt and verify each one independently. Each row carries
 * the leaf preimage recipe (`sha256("leaf:" + pickId + ":" + payload)`), so a
 * skeptic recomputes the hash and compares it to `contentHash` themselves.
 *
 * LEAK-SAFETY (the load-bearing invariant): the query filters to picks that
 * are BOTH settled (`result != PENDING`) AND kicked off (`commenceTime <=
 * now`). Under /api/verify's disclosure policy a receipt's committed fields
 * open at kickoff/settlement, so this settled+kicked-off population is a
 * strict subset of "open" — a pre-kickoff, unsettled committed field can
 * never appear here, and this endpoint therefore cannot be used to free-ride
 * a paid pick before its game. Per-row committed fields are additionally
 * withheld unless the receipt's live tamper check passes.
 *
 * Honest-empty today: no settled receipts exist yet, so this returns an empty
 * list — not an error. A DB outage is a 503 (not a false "no receipts").
 */

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get("limit"));
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), MAX_LIMIT)
      : DEFAULT_LIMIT;
  const cursor = url.searchParams.get("cursor")?.trim() || null;
  const now = new Date();

  let rows: Array<{
    id: string;
    pickId: string;
    payload: string;
    contentHash: string;
    line: number;
    entryOdds: number;
    marketFairProb: number;
    confidence: number;
    edgeScore: number;
    modelProb: number | null;
    modelVersion: string;
    asOf: Date;
    slateKey: string | null;
    pick: {
      result: string;
      game: {
        homeTeamName: string;
        awayTeamName: string;
        commenceTime: Date;
        sport: { name: string };
      } | null;
    } | null;
  }>;
  try {
    rows = await db.pickProofReceipt.findMany({
      // LEAK GATE — settled AND kicked off (strict subset of "open").
      where: {
        pick: {
          result: { not: "PENDING" },
          game: { commenceTime: { lte: now } },
        },
      },
      include: {
        pick: {
          select: {
            result: true,
            game: {
              select: {
                homeTeamName: true,
                awayTeamName: true,
                commenceTime: true,
                sport: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: [{ frozenAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
  } catch {
    return NextResponse.json(
      { error: "The proof ledger is temporarily unavailable. This is not a verdict; try again shortly." },
      { status: 503 },
    );
  }

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const receipts = page.map((r) => {
    const v = verifyReceiptIntegrity({
      pickId: r.pickId,
      payload: r.payload,
      contentHash: r.contentHash,
      line: r.line,
      entryOdds: r.entryOdds,
      marketFairProb: r.marketFairProb,
      confidence: r.confidence,
      edgeScore: r.edgeScore,
      modelProb: r.modelProb,
      modelVersion: r.modelVersion,
      asOf: r.asOf,
    });
    const game = r.pick?.game ?? null;
    return {
      pickId: r.pickId,
      contentHash: r.contentHash,
      slateKey: r.slateKey ?? null,
      result: r.pick?.result ?? "UNKNOWN",
      frozenAt: v.frozenAt,
      modelVersion: v.modelVersion,
      verified: v.verified,
      game: game
        ? {
            matchup: `${game.awayTeamName} @ ${game.homeTeamName}`,
            sport: game.sport.name,
            commenceTime: game.commenceTime.toISOString(),
          }
        : null,
      committed: v.committed,
      // The leaf preimage — recompute sha256("leaf:"+pickId+":"+payload).
      payload: r.payload,
    };
  });

  const base = SITE_URL.replace(/\/+$/, "");
  return NextResponse.json(
    {
      doctrine:
        'Settled picks only. Each row opens per the same policy as /api/verify. Recompute sha256("leaf:" + pickId + ":" + payload) and compare to contentHash to verify any row yourself.',
      count: receipts.length,
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
      receipts,
      verify: {
        humanVerifyUrl: `${base}/verify`,
        receiptVerifyUrl: `${base}/api/verify?hash=<64-hex-sha256>`,
        summaryUrl: `${base}/api/proof/ledger`,
      },
    },
    { status: 200, headers: { "cache-control": "public, max-age=120, s-maxage=120" } },
  );
}
