import { NextResponse } from "next/server";
import { db } from "@sports/db";
import { deserializeDetached, isBitcoinAttested, otsStatus } from "@sports/crypto";

/**
 * GET /api/proof/ots/[slateKey] — the OpenTimestamps proof for a published
 * slate Merkle root (W-OTS slice 2).
 *
 * Default: the raw detached .ots bytes (application/octet-stream) — feed them
 * to any OpenTimestamps client (`ots verify`) together with the slate root
 * from /api/verify/slate. `?format=json` returns the parsed status instead:
 * bitcoin block heights, pending calendars, and the anchored flag.
 *
 * Honesty rules: 404 with an explicit reason when the slate exists but carries
 * no anchor (pre-migration, flag off, or anchored later); "anchored to
 * Bitcoin" is reported ONLY when the proof actually carries a Bitcoin
 * attestation. DB outage → 503, never a false "no proof exists".
 */

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slateKey: string }> },
): Promise<NextResponse | Response> {
  const { slateKey } = await params;
  const key = decodeURIComponent(slateKey ?? "").trim();
  if (!key) {
    return NextResponse.json({ found: false, error: "slateKey required" }, { status: 400 });
  }

  let row: { slateKey: string; root: string; otsProof: Uint8Array | null } | null;
  try {
    row = (await db.slateCommitment.findUnique({
      where: { slateKey: key },
      select: { slateKey: true, root: true, otsProof: true },
    })) as { slateKey: string; root: string; otsProof: Uint8Array | null } | null;
  } catch (error) {
    // Missing column (migration not applied) reads as "no anchor yet", not 500.
    const message = error instanceof Error ? error.message : String(error);
    if (/otsProof|column .* does not exist|P2022/i.test(message)) {
      return NextResponse.json(
        { found: false, reason: "OTS anchoring is not activated yet." },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "The proof store is temporarily unavailable. This is not a verdict; try again shortly." },
      { status: 503 },
    );
  }

  if (!row) {
    return NextResponse.json({ found: false, reason: "No commitment for that slateKey." }, { status: 404 });
  }
  if (!row.otsProof || row.otsProof.length === 0) {
    return NextResponse.json(
      { found: false, reason: "Commitment exists but carries no OTS anchor (pre-activation or anchored later)." },
      { status: 404 },
    );
  }

  const bytes = new Uint8Array(row.otsProof);
  const url = new URL(request.url);
  if (url.searchParams.get("format") === "json") {
    try {
      const parsed = deserializeDetached(bytes);
      const status = otsStatus(parsed);
      return NextResponse.json({
        found: true,
        slateKey: row.slateKey,
        root: row.root,
        digest: parsed.digestHex,
        anchoredToBitcoin: isBitcoinAttested(parsed),
        bitcoinBlockHeights: status.bitcoin,
        pendingCalendars: status.pendingCalendars,
        otsUrl: `/api/proof/ots/${encodeURIComponent(row.slateKey)}`,
      });
    } catch {
      // A stored proof that no longer parses is a real integrity signal — say so.
      return NextResponse.json(
        { found: true, slateKey: row.slateKey, error: "Stored .ots bytes failed to parse — integrity attention required." },
        { status: 500 },
      );
    }
  }

  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      "content-type": "application/octet-stream",
      "content-disposition": `attachment; filename="${row.slateKey.replace(/[^A-Za-z0-9:_-]/g, "_")}.ots"`,
      "cache-control": "public, max-age=300",
    },
  });
}
