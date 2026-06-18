import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@sports/db";

/**
 * POST /api/newsletter/subscribe
 *
 * Upserts a NewsletterSubscriber row by email.
 *
 * Never-throw contract: on any DB error we return a 503 JSON error so the
 * client shows an honest "retry" state — never a fake success. { ok: true }
 * is returned ONLY when persistence succeeds.
 */

export const dynamic = "force-dynamic";

const SubscribeSchema = z.object({
  email: z.string().email({ message: "A valid email address is required." }),
  source: z.string().max(120).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const parsed = SubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const { email, source } = parsed.data;

  try {
    await db.newsletterSubscriber.upsert({
      where: { email },
      create: {
        email,
        source: source ?? "newsletter-page",
        status: "active",
      },
      update: {
        status: "active",
        ...(source ? { source } : {}),
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    // Log server-side; return honest client error — never a fake success.
    console.error("[api/newsletter/subscribe] DB error:", err);
    return NextResponse.json(
      { ok: false, error: "Could not save right now. Please try again shortly." },
      { status: 503 }
    );
  }
}
