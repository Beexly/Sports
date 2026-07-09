import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import { createPortalSession } from "@/lib/stripe";
import { db } from "@sports/db";

export async function POST(_req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Defense-in-depth on Stripe portal-session creation (mirrors checkout): 10 per
  // 5 minutes per user — far above legitimate use, stops a looping client.
  const limit = consumeRateLimit("subscriptions-portal", session.user.id, 10, 5 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const subscription = await db.subscription.findUnique({
    where: { userId: session.user.id },
    select: { stripeCustomerId: true },
  });

  if (!subscription?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account found" },
      { status: 404 }
    );
  }

  const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

  try {
    const portalSession = await createPortalSession(
      subscription.stripeCustomerId,
      `${appUrl}/dashboard`
    );
    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    // Log detail server-side; return a generic message to the client.
    const message = err instanceof Error ? err.message : "Portal error";
    console.error(`Portal session error: ${message}`);
    return NextResponse.json({ error: "Billing portal could not be opened." }, { status: 500 });
  }
}
