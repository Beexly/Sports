/**
 * GET /api/proof/export — tamper-evident pick ledger as CSV.
 *
 * Returns the full settled canonical pick ledger (up to 500 rows) as a CSV
 * download. Every row includes the leaf hash so the recipient can re-derive
 * the SHA-256 themselves:
 *
 *   hash = SHA256(id + "|" + pickType + "|" + selection + "|" + line + "|" +
 *                 confidence + "|" + modelVersion + "|" + generatedAt)
 *
 * A single-click way to independently verify the Merkle commitment.
 *
 * No auth required — this is public accountability data.
 * Rate-limited by the edge runtime: one response per page load is fine,
 * abuse mitigation is at the CDN/edge layer.
 */

import { NextResponse } from "next/server";
import { db } from "@sports/db";
import {
  canonicalPickPayload,
  hashLeaf,
  merkleRoot,
} from "@sports/prediction-engine";
import type { HashFn, PickRecord } from "@sports/prediction-engine";
import { createHash } from "node:crypto";

export const dynamic = "force-dynamic";

const sha256: HashFn = (input: string) =>
  createHash("sha256").update(input, "utf8").digest("hex");

function csvRow(cells: (string | number | null)[]): string {
  return cells
    .map((c) => {
      const str = c === null || c === undefined ? "" : String(c);
      return `"${str.replace(/"/g, '""')}"`;
    })
    .join(",");
}

const HEADERS = [
  "leaf_index",
  "id",
  "sport",
  "home_team",
  "away_team",
  "commence_time",
  "pick_type",
  "selection",
  "line",
  "confidence",
  "model_version",
  "generated_at",
  "settled_at",
  "result",
  "clv_verdict",
  "clv_value",
  "leaf_hash",
];

export async function GET() {
  try {
    const picks = await db.pick.findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        result: { in: ["WIN", "LOSS", "PUSH", "VOID"] },
        NOT: { modelVersion: "v5.0.0-seed" },
        signalSnapshot: { is: { eligibleForLearning: true } },
      },
      include: {
        game: {
          include: { sport: { select: { name: true } } },
        },
      },
      orderBy: [{ settledAt: "desc" }, { id: "asc" }],
      take: 500,
    });

    const records = picks.map((pick: typeof picks[number]) => {
      const payload = canonicalPickPayload({
        id: pick.id,
        pickType: pick.pickType,
        selection: pick.selection,
        line: pick.line,
        confidence: pick.confidence,
        modelVersion: pick.modelVersion,
        generatedAt: pick.generatedAt.toISOString(),
      });
      const record: PickRecord = { id: pick.id, payload };
      return { pick, record, leaf: hashLeaf(sha256, record) };
    });

    const root = merkleRoot(records.map((r: typeof records[number]) => r.record), sha256);

    const rows = [
      csvRow(HEADERS),
      ...records.map(({ pick, leaf }: { pick: typeof picks[number]; record: PickRecord; leaf: string }, idx: number) =>
        csvRow([
          idx,
          pick.id,
          pick.game.sport.name,
          pick.game.homeTeam,
          pick.game.awayTeam,
          pick.game.commenceTime.toISOString(),
          pick.pickType,
          pick.selection,
          pick.line,
          pick.confidence,
          pick.modelVersion,
          pick.generatedAt.toISOString(),
          pick.settledAt?.toISOString() ?? null,
          pick.result,
          pick.clvVerdict ?? null,
          pick.clvValue ?? null,
          leaf,
        ])
      ),
    ];

    const now = new Date().toISOString().slice(0, 10);
    const filename = `gse-proof-of-record-${now}.csv`;

    return new NextResponse(rows.join("\r\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Merkle-Root": root,
        "X-Record-Count": String(picks.length),
        "X-Generated-At": new Date().toISOString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
