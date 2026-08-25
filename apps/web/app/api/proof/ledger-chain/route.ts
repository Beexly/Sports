import { NextRequest, NextResponse } from "next/server";
import { db } from "@sports/db";
import { loadLedgerChain } from "@sports/ingestion-pipeline";
import { consumeRateLimit, clientIp } from "@/lib/api/rate-limit";

/**
 * GET /api/proof/ledger-chain — public read-only export of the Glass Ledger
 * hash chain (B-6b). Shape is exactly what scripts/edge-lab/recompute.ts
 * consumes: `{ entries: LedgerEntry[] }`.
 *
 * Honesty:
 *   - empty chain → 200 `{ entries: [], note }`, never 404
 *   - table not yet applied → 200 empty + note, never 500
 *   - DB outage → 503
 *   - no performance numbers, no PUBLISH_LEDGER coupling
 *   - LEDGER_CHAIN_ENABLED gates WRITES, not this read
 */

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;
const EMPTY_NOTE =
  "No chain entries yet. Persistence is founder-gated (LEDGER_CHAIN_ENABLED, default off) and the table is founder-applied. This endpoint stays honest-empty until real appends land.";
const TABLE_NOTE =
  "Chain table is not applied on this database yet. Export is empty, not missing.";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const rl = consumeRateLimit("public-proof-ledger-chain", clientIp(req), 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please wait and try again.", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const url = new URL(req.url);
  const rawLimit = Number(url.searchParams.get("limit"));
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), MAX_LIMIT)
      : DEFAULT_LIMIT;
  const rawAfter = url.searchParams.get("afterSeq");
  const afterSeq =
    rawAfter !== null && rawAfter !== "" && Number.isFinite(Number(rawAfter))
      ? Math.floor(Number(rawAfter))
      : undefined;

  const loaded = await loadLedgerChain(db, {
    ignoreWriteFlag: true,
    take: limit + 1,
    afterSeq,
  });

  if (!loaded.ok) {
    if (loaded.reason === "table_missing" || loaded.reason === "delegate_missing") {
      return NextResponse.json(
        { entries: [], count: 0, nextSeq: null, note: TABLE_NOTE },
        { status: 200, headers: { "cache-control": "no-store" } },
      );
    }
    if (loaded.reason === "flag_off") {
      return NextResponse.json(
        { entries: [], count: 0, nextSeq: null, note: EMPTY_NOTE },
        { status: 200, headers: { "cache-control": "no-store" } },
      );
    }
    return NextResponse.json(
      { success: false, error: "Proof ledger chain temporarily unavailable.", code: "unavailable" },
      { status: 503 },
    );
  }

  const hasMore = loaded.entries.length > limit;
  const page = hasMore ? loaded.entries.slice(0, limit) : loaded.entries;
  const last = page[page.length - 1];
  const note =
    page.length === 0
      ? EMPTY_NOTE
      : "Pass this JSON to `npx tsx scripts/edge-lab/recompute.ts` to independently verify linkage, pre-kickoff, and posted CLV.";

  return NextResponse.json(
    {
      entries: page,
      count: page.length,
      nextSeq: hasMore && last && typeof last.seq === "number" ? last.seq : null,
      note,
    },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
