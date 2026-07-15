import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@sports/db";
import { hashLeaf, parseCanonicalPayload } from "@sports/prediction-engine";
import { normalizeAmericanOdds } from "@sports/types";
import { projectPublicMarket } from "@/lib/market/project-public-market";

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

  // Separate "not found" from "database unreachable": a DB outage must NOT be
  // reported as "no receipt matches that hash" on an honesty surface — that
  // would be a false claim of non-existence. Outage -> 503, absence -> found:false.
  let receipt;
  try {
    receipt = await db.pickProofReceipt.findFirst({
      where: { contentHash: hash },
      include: {
        pick: {
          select: {
            result: true,
            game: {
              select: {
                id: true,
                homeTeamName: true,
                awayTeamName: true,
                commenceTime: true,
                sport: { select: { name: true, key: true } },
              },
            },
          },
        },
      },
    });
  } catch {
    return NextResponse.json(
      { error: "The verifier is temporarily unavailable. This is not a verdict; try again shortly." },
      { status: 503 },
    );
  }

  if (!receipt) {
    return NextResponse.json({ found: false });
  }

  // The live tamper check: re-hash the stored payload and compare with the
  // frozen commitment. A mismatch means the stored record was altered after
  // minting — the exact thing the receipt exists to expose.
  const recomputed = hashLeaf(sha256Hex, { id: receipt.pickId, payload: receipt.payload });
  const hashIntact = recomputed === receipt.contentHash;

  // Display MUST come from the hashed payload, not the sibling DB columns, or
  // the tamper check would not cover what the user sees. We parse the payload
  // and additionally cross-check the columns against it: any drift beyond
  // rounding tolerance is itself tampering and flips the verdict to failed.
  const p = parseCanonicalPayload(receipt.payload);
  const num = (s: string | undefined): number | null =>
    s == null || s === "none" ? null : Number.isFinite(Number(s)) ? Number(s) : null;
  const columnsMatchPayload =
    approxEq(receipt.line, num(p["line"]), 1e-4) &&
    approxEq(receipt.entryOdds, num(p["entryOdds"]), 0.5) &&
    approxEq(receipt.marketFairProb, num(p["marketFairProb"]), 1e-6) &&
    approxEq(receipt.confidence, num(p["confidence"]), 0.5) &&
    approxEq(receipt.edgeScore, num(p["edgeScore"]), 1e-4) &&
    approxEq(receipt.modelProb, num(p["modelProb"]), 1e-6) &&
    receipt.modelVersion === (p["modelVersion"] ?? receipt.modelVersion);
  const game = receipt.pick?.game ?? null;
  const payloadSport = p["sport"];
  const relationMatchesPayload =
    game !== null &&
    p["pickId"] === receipt.pickId &&
    p["gameId"] === game.id &&
    (payloadSport === undefined ||
      sameToken(payloadSport, game.sport.name) ||
      sameToken(payloadSport, game.sport.key));
  const verified = hashIntact && columnsMatchPayload && relationMatchesPayload;

  // Everything below is sourced from the parsed payload (hash-covered).
  const frozenAt = p["asOf"] ?? receipt.asOf.toISOString();
  const modelVersion = p["modelVersion"] ?? receipt.modelVersion;

  if (!verified) {
    return NextResponse.json({
      found: true,
      verified: false,
      sealed: true,
      frozenAt,
      modelVersion,
      contentHash: receipt.contentHash,
      note:
        "Receipt integrity or record binding failed. The committed payload remains sealed.",
    });
  }

  const kickedOff = game ? game.commenceTime.getTime() <= Date.now() : false;
  const settled = (receipt.pick?.result ?? "PENDING") !== "PENDING";
  const open = kickedOff || settled;

  if (!open) {
    return NextResponse.json({
      found: true,
      verified,
      sealed: true,
      frozenAt,
      modelVersion,
      note:
        "Receipt verified and sealed. The committed fields open automatically at kickoff; the freeze time above proves the commitment predates the game.",
    });
  }

  const committedLine = num(p["line"]);
  const committedEntryOdds = normalizeAmericanOdds(num(p["entryOdds"]));
  const publicMarket =
    game && p["pickType"] && p["selection"] && committedLine !== null
      ? projectPublicMarket({
          pickType: p["pickType"],
          selection: p["selection"],
          line: committedLine,
          sport: game.sport.name,
          homeTeam: game.homeTeamName,
          awayTeam: game.awayTeamName,
        })
      : null;

  return NextResponse.json({
    found: true,
    verified,
    sealed: false,
    frozenAt,
    modelVersion,
    result: receipt.pick?.result ?? "UNKNOWN",
    game: game
      ? {
          matchup: `${game.awayTeamName} @ ${game.homeTeamName}`,
          sport: game.sport.name,
          commenceTime: game.commenceTime.toISOString(),
        }
      : null,
    // The committed financial fields are presented as FACT only when the
    // integrity check passed AND the hash-covered market fields project into
    // a supported canonical market. On a failed check the values are
    // tamper-suspect; on an unsupported legacy market they are ambiguous. In
    // either case we withhold display while preserving the cryptographic
    // verdict and raw payload/hash for independent recomputation.
    committed: verified && publicMarket && committedEntryOdds
      ? {
          selection: publicMarket.selection,
          entryOdds: committedEntryOdds.normalized,
          marketFairProb: num(p["marketFairProb"]),
          confidence: num(p["confidence"]),
          edgeScore: num(p["edgeScore"]),
          modelProb: num(p["modelProb"]),
        }
      : null,
    payload: receipt.payload,
    contentHash: receipt.contentHash,
    // The leaf preimage id — the recompute recipe is
    // sha256("leaf:" + pickId + ":" + payload), NOT sha256(payload). Exposing
    // pickId lets the UI show the exact string to hash so a skeptic's digest
    // matches the stored receipt hash. (hashLeaf, proof-of-record.ts.)
    pickId: receipt.pickId,
  });
}

/** True if both are null, or both finite and within tolerance. */
function approxEq(a: number | null, b: number | null, tol: number): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(a - b) <= tol;
}

function sameToken(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
