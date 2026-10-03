import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { jsonNoStore } from "@/lib/api/no-store";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import { createPortalSession } from "@/lib/stripe";
import { db, DurableWriteStoreUnavailableError } from "@sports/db";

/**
 * NO-STORE on every response (C-91 / .claude/rules/nextjs-caching.md rule 2).
 * The 200 body carries a SINGLE-USE, PER-CUSTOMER Stripe URL: a shared cache
 * entry that served one member's billing-portal link to another would hand over
 * their billing session, and the rule is explicit that the gate and error
 * bodies are no less dangerous than the happy path (a cached 429 keeps
 * refusing a caller whose window has reset; a cached 503 keeps the money path
 * dark after the store recovers). These are POST routes, so no ordinary cache
 * would store them today — this says it rather than relying on that.
 */
export async function POST(_req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  }

  // Defense-in-depth on Stripe portal-session creation (mirrors checkout): 10 per
  // 5 minutes per user — far above legitimate use, stops a looping client.
  const limit = consumeRateLimit("subscriptions-portal", session.user.id, 10, 5 * 60 * 1000);
  if (!limit.ok) {
    return jsonNoStore(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const subscription = await db.subscription.findUnique({
    where: { userId: session.user.id },
    select: { stripeCustomerId: true },
  });

  if (!subscription?.stripeCustomerId) {
    return jsonNoStore(
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
    return jsonNoStore({ url: portalSession.url });
  } catch (err) {
    // Durable-write guard threw (GSE-SEC-033): the local store can't persist,
    // so fail closed with a typed 503 — NO Stripe side effect leaked out.
    if (err instanceof DurableWriteStoreUnavailableError) {
      return jsonNoStore(
        {
          error: "Billing portal is temporarily unavailable.",
          code: "durable_write_store_unavailable",
        },
        { status: 503 },
      );
    }
    // Log detail server-side; return a generic message to the client.
    const message = err instanceof Error ? err.message : "Portal error";
    console.error(`Portal session error: ${message}`);
    return jsonNoStore({ error: "Billing portal could not be opened." }, { status: 500 });
  }
}
