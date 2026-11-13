/**
 * Store-credit settlement endpoint (WP-5).
 *
 * The seam the settlement flow calls AFTER a pack's official plays are
 * graded: pack net <= 0.00u on the credit-back tier mints 100% of the pack
 * price as store credit, or a flat $35 upgrade credit toward Door 1 (the
 * buyer's election, recorded once). Idempotent per (purchaseId, slateKey).
 *
 * Auth: Bearer CRON_SECRET (same pattern as the cron routes; this is an
 * internal settlement hook, never a public mint button).
 *
 * Clean gates:
 *  - CRON_SECRET unset               -> 503 store_credit_auth_unconfigured
 *  - mints table not migrated yet    -> 503 store_credit_store_unavailable
 * Nothing is ever faked: no mint is reported unless it is persisted.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { settlePack } from "@/lib/billing/store-credit-ledger";
import {
  PrismaStoreCreditStore,
  isStoreCreditStoreAvailable,
} from "@/lib/billing/store-credit-store";

export const dynamic = "force-dynamic";

const playSchema = z.object({
  pickId: z.string().min(1),
  result: z.enum(["WIN", "LOSS", "PUSH", "VOID"]),
  americanPrice: z.number().int().refine((n) => n !== 0, "americanPrice cannot be 0"),
});

const settleSchema = z.object({
  purchaseId: z.string().min(1),
  slateKey: z.string().min(1),
  packPriceCents: z.number().int().min(0),
  tier: z.enum(["standard", "credit-back"]),
  plays: z.array(playSchema).min(1),
  choice: z.enum(["store-credit", "upgrade-credit"]).optional(),
});

function authorized(req: Request): boolean {
  const secret = process.env["CRON_SECRET"]?.trim() ?? "";
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

function unconfigured(): NextResponse {
  return NextResponse.json(
    { ok: false, reason: "store_credit_auth_unconfigured" },
    { status: 503 },
  );
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!process.env["CRON_SECRET"]?.trim()) return unconfigured();
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }
  const parsed = settleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: "invalid_payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  if (!(await isStoreCreditStoreAvailable())) {
    return NextResponse.json(
      {
        ok: false,
        reason: "store_credit_store_unavailable",
        detail:
          "Apply apps/web/lib/billing/store-credit-mints.sql to the ledger database first.",
      },
      { status: 503 },
    );
  }

  try {
    const result = await settlePack(parsed.data, new PrismaStoreCreditStore());
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, reason: "settlement_failed", detail: String(error) },
      { status: 500 },
    );
  }
}

export async function GET(req: Request): Promise<NextResponse> {
  if (!process.env["CRON_SECRET"]?.trim()) return unconfigured();
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const purchaseId = searchParams.get("purchaseId") ?? "";
  const slateKey = searchParams.get("slateKey") ?? "";
  if (!purchaseId || !slateKey) {
    return NextResponse.json(
      { ok: false, reason: "purchaseId and slateKey are required" },
      { status: 400 },
    );
  }
  if (!(await isStoreCreditStoreAvailable())) {
    return NextResponse.json(
      { ok: false, reason: "store_credit_store_unavailable" },
      { status: 503 },
    );
  }
  const record = await new PrismaStoreCreditStore().getMint(purchaseId, slateKey);
  return NextResponse.json({ ok: true, record });
}