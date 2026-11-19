import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db, isStubMode } from "@sports/db";
import { clientIp, consumeRateLimit } from "@/lib/api/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = clientIp(req as NextRequest);
    const ipLimit = consumeRateLimit("email-capture-ip", ip, 10, 60 * 60 * 1000);
    if (!ipLimit.ok) {
      return NextResponse.json(
        { ok: false, error: "Too many requests. Please wait and try again." },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSec) } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "Valid email is required" }, { status: 400 });
    }

    const emailLimit = consumeRateLimit("email-capture-addr", email, 5, 60 * 60 * 1000);
    if (!emailLimit.ok) {
      return NextResponse.json(
        { ok: false, error: "Too many requests for this email. Please wait and try again." },
        { status: 429, headers: { "Retry-After": String(emailLimit.retryAfterSec) } },
      );
    }

    // Lead capture ONLY -- never write to `kind: "one_time_pack"` or grant paid tiers.
    const leadId = `teaser_email_${randomUUID()}`;
    if (!isStubMode() && typeof db?.revenueEvent?.create === "function") {
      try {
        await db.revenueEvent.create({
          data: {
            kind: "email_capture",
            amountCents: 0,
            currency: "usd",
            userId: null,
            meta: {
              source: "inline-teaser-email-capture",
              leadId,
              email,
            },
          },
        });
      } catch (err) {
        console.warn(
          "[email-capture] Failed to persist email_capture lead:",
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    const res = NextResponse.json({
      ok: true,
      message: "Free trench x-ray teasers unlocked.",
      email,
      leadId,
    });

    res.cookies.set("gse_teaser_unlocked", "1", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });

    return res;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
