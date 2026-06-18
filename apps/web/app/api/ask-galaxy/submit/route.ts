import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@sports/db";

/**
 * POST /api/ask-galaxy/submit
 *
 * Creates an AskGalaxySubmission row.
 *
 * Classification is ALWAYS left at PENDING — SCOUT (a human) reviews every
 * submission manually. This route never auto-classifies and never produces
 * automated betting advice.
 *
 * Never-throw contract: on any DB error we return a 503 JSON error so the
 * client shows an honest retry state — never a fake success. { ok: true, id }
 * is returned ONLY when persistence succeeds.
 */

export const dynamic = "force-dynamic";

const SubmitSchema = z.object({
  email: z.string().email({ message: "A valid email address is required." }),
  matchup: z
    .string()
    .min(3, { message: "Matchup must be at least 3 characters." })
    .max(240),
  considering: z
    .string()
    .min(5, { message: "Please describe what you are considering." })
    .max(2000),
  name: z.string().max(120).optional(),
  sport: z.string().max(80).optional(),
  league: z.string().max(80).optional(),
  reasoning: z.string().max(2000).optional(),
  trustNeed: z.string().max(2000).optional(),
  contactConsent: z.boolean().optional().default(false),
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

  const parsed = SubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const {
    email,
    matchup,
    considering,
    name,
    sport,
    league,
    reasoning,
    trustNeed,
    contactConsent,
  } = parsed.data;

  try {
    const submission = await db.askGalaxySubmission.create({
      data: {
        email,
        matchup,
        considering,
        name: name ?? null,
        sport: sport ?? null,
        league: league ?? null,
        reasoning: reasoning ?? null,
        trustNeed: trustNeed ?? null,
        contactConsent: contactConsent ?? false,
        // classification stays PENDING — SCOUT reviews manually
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: submission.id }, { status: 201 });
  } catch (err) {
    // Log server-side; return honest client error — never a fake success.
    console.error("[api/ask-galaxy/submit] DB error:", err);
    return NextResponse.json(
      { ok: false, error: "Could not save right now. Please try again shortly." },
      { status: 503 }
    );
  }
}
