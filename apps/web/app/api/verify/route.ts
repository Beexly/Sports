import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@sports/db";
import { hashLeaf } from "@sports/prediction-engine";

/**
 * Public Proof-of-Record verification — the skeptic's endpoint.
 *
 * Every pick mints a tamper-evident receipt BEFORE kickoff (payload +
 * SHA-256 content hash, frozen, never rewritten). This endpoint lets anyone
 * paste a receipt hash and confirm the commitment still matches: the stored
 * payload is re-hashed live and compared against the frozen hash, so a
 * back-dated edit cannot masquerade as the original claim.
 *
 * Disclosure policy (leak-safe by design):
 *   - PRE-KICKOFF, unsettled: the receipt verifies as SEALED — existence,
 *     integrity, freeze time, and model version only. The committed fields
 *     (selection, price, confidence, edge) stay closed so verification can
 *     never be used to free-ride the paid pick before the game.
 *   - POST-KICKOFF or settled: the full commitment opens. Post-game
 *     transparency is the entire point of the receipt.
 */

export const dynamic = "force-dynamic";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export async function GET(request: Request) {
  const hash = new URL(request.url).searchParams.get("hash")?.trim().toLowerCase() ?? "";
  if (!/^[0-9a-f]{64}$/.test(hash)) {
    return NextResponse.json(
      { found: false, error: "Provide a 64-character SHA-256 receipt hash (?hash=...)." },
      { status: 400 },
    );
  }

  const receipt = await db.pickProofReceipt
    .findFirst({
      where: { contentHash: hash },
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
    })
    .catch(() => null);

  if (!receipt) {
    return NextResponse.json({ found: false });
  }

  // The live tamper check: re-hash the stored payload and compare with the
  // frozen commitment. A mismatch means the stored record was altered after
  // minting — the exact thing the receipt exists to expose.
  const recomputed = hashLeaf(sha256Hex, { id: receipt.pickId, payload: receipt.payload });
  const verified = recomputed === receipt.contentHash;

  const game = receipt.pick?.game ?? null;
  const kickedOff = game ? game.commenceTime.getTime() <= Date.now() : false;
  const settled = (receipt.pick?.result ?? "PENDING") !== "PENDING";
  const open = kickedOff || settled;

  if (!open) {
    return NextResponse.json({
      found: true,
      verified,
      sealed: true,
      frozenAt: receipt.asOf.toISOString(),
      modelVersion: receipt.modelVersion,
      note:
        "Receipt verified and sealed. The committed fields open automatically at kickoff; the freeze time above proves the commitment predates the game.",
    });
  }

  return NextResponse.json({
    found: true,
    verified,
    sealed: false,
    frozenAt: receipt.asOf.toISOString(),
    modelVersion: receipt.modelVersion,
    result: receipt.pick?.result ?? "UNKNOWN",
    game: game
      ? {
          matchup: `${game.awayTeamName} @ ${game.homeTeamName}`,
          sport: game.sport.name,
          commenceTime: game.commenceTime.toISOString(),
        }
      : null,
    committed: {
      line: receipt.line,
      entryOdds: receipt.entryOdds,
      marketFairProb: receipt.marketFairProb,
      confidence: receipt.confidence,
      edgeScore: receipt.edgeScore,
      modelProb: receipt.modelProb,
    },
    payload: receipt.payload,
    contentHash: receipt.contentHash,
  });
}
