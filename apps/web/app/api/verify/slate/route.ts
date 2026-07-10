import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@sports/db";
import { merkleRootFromLeafHashes } from "@sports/prediction-engine";

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

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

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
        // Public sealed aggregate ONLY — pedersenAggregateValue and
        // pedersenBlindingSum are the OPENER (server-side secrets until a
        // deliberate post-slate open) and must never be selected here.
        pedersenAggregateHex: true,
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

  // COMPLETENESS DISCLOSURE (hostile-review fix): the committed root + count
  // are the authoritative pre-registration; the receipt index is a DB relation
  // that can lag or drift (e.g. a receipt re-attributed after a postponement).
  // An unexplained count-vs-list mismatch on an honesty surface reads exactly
  // like tampering, so when they disagree we say so, explicitly and first.
  const receiptIndexComplete = slate.receipts.length === slate.count;

  // MEMBERSHIP PROOF, not trust: a receipt's contentHash IS its Merkle leaf
  // (hashLeaf/buildPickProofReceipt share one canonical leaf definition), and
  // the relation is returned in the same pickId-ascending order the slate was
  // frozen in — so the server RE-FOLDS the root from the displayed list, live,
  // and says whether the list PROVES against the commitment. This converts the
  // endpoint from "displays DB state" to "proves DB state" (the whole reason
  // it exists), and it is exactly the verifiable-index idea salvaged from an
  // external draft's invented receiptHashes column — done without a schema
  // change because the leaves are already public fingerprints.
  const recomputedRoot = merkleRootFromLeafHashes(
    slate.receipts.map((r) => r.contentHash),
    sha256Hex,
  );
  const membershipVerified = receiptIndexComplete && recomputedRoot === slate.root;

  return NextResponse.json({
    found: true,
    slateKey: slate.slateKey,
    root: slate.root,
    count: slate.count,
    committedAt: slate.committedAt.toISOString(),
    // Sealed Pedersen aggregate over the slate's published edge scores (a
    // commitment, opened after the slate settles). Null on pre-Phase-0.5 slates.
    pedersenAggregateHex: slate.pedersenAggregateHex ?? null,
    receiptIndexComplete,
    /** True when the displayed receipt list re-folds EXACTLY to the committed root. */
    membershipVerified,
    ...(membershipVerified
      ? {}
      : {
          receiptIndexNote:
            "The committed root and count above are authoritative and immutable. The linked receipt index below does not " +
            "currently re-fold to the root (an indexing artifact, e.g. a rescheduled game or partial backfill); any covered " +
            "receipt can still prove membership individually against the root.",
        }),
    receipts: slate.receipts.map((r) => ({
      pickId: r.pickId,
      contentHash: r.contentHash,
    })),
  });
}
