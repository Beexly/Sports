import { NextResponse } from "next/server";
import { recordPurchaseLedgerEntry } from "@/lib/packages/purchase-ledger";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "Valid email is required" }, { status: 400 });
    }

    // Record free teaser unlock in ledger
    const freeUnlockSession = `teaser_email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await recordPurchaseLedgerEntry({
      sessionId: freeUnlockSession,
      packageSlug: "teaser-email-unlock",
      customerEmail: email,
      amountCents: 0,
      currency: "usd",
      metadata: { source: "inline-teaser-email-capture" },
    });

    const res = NextResponse.json({
      ok: true,
      message: "Free trench x-ray teasers unlocked.",
      email,
      sessionId: freeUnlockSession,
    });

    res.cookies.set("gse_teaser_unlocked", "1", {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax",
    });

    return res;
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
