import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import { createPortalSession } from "@/lib/stripe";
import { db, DurableWriteStoreUnavailableError } from "@sports/db";
import { requireAppUrl } from "@/lib/config/app-url";
import { MissingProductionEnvError } from "@/lib/config/require-env";

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

  // Same fail-closed guard as checkout: the portal's `return_url` is where Stripe
  // sends a customer after they cancel or update a subscription. A localhost
  // fallback in production strands them on connection-refused with no error
  // anywhere on our side. Fail loudly, naming the variable, before calling Stripe.
  let appUrl: string;
  try {
    appUrl = requireAppUrl();
  } catch (err) {
    if (err instanceof MissingProductionEnvError) {
      console.error(`Billing portal config error: ${err.message}`);
      return NextResponse.json(
        {
          error: "Billing portal is not configured (NEXT_PUBLIC_APP_URL is missing or blank)",
          code: "app_url_not_configured",
        },
        { status: 503 },
      );
    }
    throw err;
  }

  try {
    const portalSession = await createPortalSession(
      subscription.stripeCustomerId,
      `${appUrl}/dashboard`
    );
    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    // Durable-write guard threw (GSE-SEC-033): the local store can't persist,
    // so fail closed with a typed 503 — NO Stripe side effect leaked out.
    if (err instanceof DurableWriteStoreUnavailableError) {
      return NextResponse.json(
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
    return NextResponse.json({ error: "Billing portal could not be opened." }, { status: 500 });
  }
}
