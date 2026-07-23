/**
 * POST /api/receipts/verify — verify a SignedGovernedReceipt against the
 * live keyring. Looks the signature's `kid` up in `listVerifiable()` (which
 * excludes revoked keys) and only then checks the cryptographic signature —
 * see `verifyReceiptAgainstKeyring` in @sports/governed for why that
 * ordering matters (a revoked key must fail verification even though its
 * signature remains cryptographically valid).
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyReceiptAgainstKeyring, type SignedGovernedReceipt } from "@sports/governed";
import { getGovernedKeyring } from "@/lib/governed/keyring-singleton";

export const dynamic = "force-dynamic";

function looksLikeSignedReceipt(x: unknown): x is SignedGovernedReceipt {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.receiptId === "string" &&
    typeof r.at === "string" &&
    typeof r.decision === "string" &&
    typeof r.signature === "object" &&
    r.signature !== null &&
    typeof (r.signature as Record<string, unknown>).kid === "string"
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }
  if (!looksLikeSignedReceipt(body)) {
    return NextResponse.json({ ok: false, reason: "malformed_receipt" }, { status: 400 });
  }

  const store = await getGovernedKeyring();
  const result = await verifyReceiptAgainstKeyring(store, body);
  return NextResponse.json(result, { status: result.ok ? 200 : 200 });
}
