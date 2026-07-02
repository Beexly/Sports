import { NextResponse } from "next/server";
import { db } from "@sports/db";

/**
 * Public slate-commitment verification — the anti-cherry-pick endpoint.
 *
 * A per-pick receipt (/api/verify) defeats "you edited the pick after the
 * result." This endpoint answers the skeptic's SECOND attack: "you only
 * published the winners." Before the first kickoff of a sport's game-day, we
 * publish ONE immutable Merkle root over the whole slate of frozen receipts —
 * the exact population and its size. You cannot later add a winner or drop a
 * loser without changing this root.
 *
 * Disclosure policy (sealed pre-kickoff, same spirit as /api/verify):
 *   - The commitment itself (root, count, committedAt) and each covered
 *     receipt's pickId + contentHash are public IMMEDIATELY — they reveal the
 *     population and its fingerprints, nothing more.
 *   - Receipt PAYLOADS (selection, price, confidence, edge) are NEVER returned
 *     here. Pre-kickoff they are sealed so verification cannot be used to
 *     free-ride the paid pick; post-kickoff each receipt opens individually
 *     via /api/verify?hash=<contentHash>.
 */

export const dynamic = "force-dynamic";

/** e.g. "AMERICANFOOTBALL_NFL:2026-09-14" — uppercase sport key + UTC day. */
const SLATE_KEY_SHAPE = /^[A-Z][A-Z0-9_]*:\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const slateKey =
    new URL(request.url).searchParams.get("slateKey")?.trim().toUpperCase() ?? "";
  if (!SLATE_KEY_SHAPE.test(slateKey)) {
    return NextResponse.json(
      {
        found: false,
        error:
          "Provide a slate key of the form SPORT:YYYY-MM-DD (?slateKey=AMERICANFOOTBALL_NFL:2026-09-14).",
      },
      { status: 400 },
    );
  }

  // Separate "not found" from "database unreachable": an outage must NOT read
  // as "no slate was ever committed" on an honesty surface. Outage -> 503,
  // absence -> found:false.
  let slate;
  try {
    slate = await db.slateCommitment.findUnique({
      where: { slateKey },
      select: {
        slateKey: true,
        root: true,
        count: true,
        committedAt: true,
        receipts: {
          // pickId + contentHash ONLY — never the sealed payload fields.
          select: { pickId: true, contentHash: true },
          orderBy: { pickId: "asc" },
        },
      },
    });
  } catch {
    return NextResponse.json(
      { error: "The verifier is temporarily unavailable. This is not a verdict; try again shortly." },
      { status: 503 },
    );
  }

  if (!slate) {
    return NextResponse.json({ found: false }, { status: 404 });
  }

  return NextResponse.json({
    found: true,
    slateKey: slate.slateKey,
    root: slate.root,
    count: slate.count,
    committedAt: slate.committedAt.toISOString(),
    receipts: slate.receipts.map((r) => ({
      pickId: r.pickId,
      contentHash: r.contentHash,
    })),
  });
}
