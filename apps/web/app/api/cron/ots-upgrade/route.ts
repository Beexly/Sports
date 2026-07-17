import { NextResponse } from "next/server";
import { db } from "@sports/db";
import { deserializeDetached, serializeDetached, upgradeDetached } from "@sports/crypto";
import { defaultCalendarTransport } from "@sports/ingestion-pipeline";

/**
 * GET /api/cron/ots-upgrade — nightly OTS upgrade poll (W-OTS slice 3).
 *
 * For every slate commitment that carries an .ots proof but no Bitcoin
 * attestation yet, re-poll the public calendars and persist the upgraded proof
 * + block height once the attestation lands. Conservative end to end: a
 * calendar failure or still-pending reply changes nothing (retry next night);
 * bytes are only rewritten on REAL progress (a Bitcoin attestation grafted);
 * otsBitcoinHeight is set only from an actual attestation — the public
 * "anchored to Bitcoin (block N)" claim can never front-run reality.
 *
 * Gating mirrors the backtest harness doctrine exactly:
 *   - OTS_ANCHOR_ENABLED !== "true" → documented no-op (200, ran:false).
 *   - Bearer CRON_SECRET auth once enabled.
 *   - Documented-not-registered: the founder adds the scheduler entry (Vercel
 *     cron or GH Action) when flipping the flag — nothing fires by itself.
 */

export const dynamic = "force-dynamic";

const BATCH_LIMIT = 50; // commitments per run — bounded work per cron tick

export async function GET(request: Request): Promise<NextResponse> {
  if (process.env["OTS_ANCHOR_ENABLED"] !== "true") {
    return NextResponse.json({
      ran: false,
      reason: "OTS anchoring is gated off (OTS_ANCHOR_ENABLED unset). This endpoint is a documented no-op until the founder flips it.",
    });
  }

  const secret = process.env["CRON_SECRET"];
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let rows: Array<{ slateKey: string; otsProof: Uint8Array | null; otsBitcoinHeight: number | null }>;
  try {
    rows = (await db.slateCommitment.findMany({
      where: { otsProof: { not: null }, otsBitcoinHeight: null },
      select: { slateKey: true, otsProof: true, otsBitcoinHeight: true },
      orderBy: { committedAt: "asc" },
      take: BATCH_LIMIT,
    })) as Array<{ slateKey: string; otsProof: Uint8Array | null; otsBitcoinHeight: number | null }>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/otsProof|column .* does not exist|P2022/i.test(message)) {
      return NextResponse.json({ ran: false, reason: "OTS columns not migrated yet (founder applies the migration)." });
    }
    return NextResponse.json({ error: "store unavailable — retry next tick" }, { status: 503 });
  }

  const transport = defaultCalendarTransport();
  const results: Array<{ slateKey: string; outcome: string; bitcoinHeight?: number }> = [];

  for (const row of rows) {
    if (!row.otsProof || row.otsProof.length === 0) continue;
    try {
      const detached = deserializeDetached(new Uint8Array(row.otsProof));
      const upgrade = await upgradeDetached(detached, transport);
      if (!upgrade.upgraded) {
        results.push({ slateKey: row.slateKey, outcome: "still-pending" });
        continue;
      }
      const height = upgrade.bitcoinHeights[0];
      await db.slateCommitment.update({
        where: { slateKey: row.slateKey },
        data: {
          otsProof: Buffer.from(serializeDetached(upgrade.detached)),
          ...(height !== undefined ? { otsBitcoinHeight: height } : {}),
        },
      });
      results.push({ slateKey: row.slateKey, outcome: "upgraded", ...(height !== undefined ? { bitcoinHeight: height } : {}) });
    } catch (error) {
      // One bad row never blocks the batch; it stays eligible for the next run.
      results.push({
        slateKey: row.slateKey,
        outcome: `error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  return NextResponse.json({
    ran: true,
    scanned: rows.length,
    upgraded: results.filter((r) => r.outcome === "upgraded").length,
    results,
  });
}
