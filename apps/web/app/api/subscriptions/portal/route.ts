import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPortalSession } from "@/lib/stripe";
import { db } from "@sports/db";

export async function POST(_req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
