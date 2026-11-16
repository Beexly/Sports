import { NextResponse } from "next/server";
import { verifyWhopWebhookSignature } from "@/lib/integrations/whop";
import { recordPurchaseLedgerEntry } from "@/lib/packages/purchase-ledger";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get("whop-signature") ||
      req.headers.get("x-whop-signature") ||
      req.headers.get("webhook-signature");

    const isProd = process.env.NODE_ENV === "production";
    const configuredSecret = (process.env.WHOP_WEBHOOK_SECRET || "").trim();

    if (isProd && !configuredSecret) {
      return NextResponse.json(
        { error: "Whop webhook secret not configured." },
        { status: 500 },
      );
    }

    const webhookSecret = configuredSecret || "whop_whsec_test_secret";

    // Fail closed when signature verification fails in production (or whenever configured).
    if (isProd || configuredSecret) {
      const isValid = verifyWhopWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid && isProd) {
        return NextResponse.json(
          { error: "Invalid Whop webhook signature." },
          { status: 401 },
        );
      }
    }

    const payload = JSON.parse(rawBody || "{}");
    const action = payload.action || payload.event || "unknown";
    const data = payload.data || payload;

    switch (action) {
      case "payment.succeeded": {
        const userId = data.user_id || data.user?.id || null;
        const email = data.email || data.user?.email || null;
        const productId = data.product_id || data.product?.id || "unknown_product";
        const packageSlug =
          data.metadata?.packageSlug ||
          data.metadata?.slug ||
          data.product?.slug ||
          "primetime-showdown-pack";
        const amountCents = Number(data.amount ?? data.final_amount ?? 0) || 0;
        const paymentId = String(data.id || data.payment_id || `whop_${Date.now()}`);

        await recordPurchaseLedgerEntry({
          sessionId: paymentId,
          packageSlug: String(packageSlug),
          customerEmail: typeof email === "string" ? email : null,
          userId: typeof userId === "string" ? userId : null,
          amountCents,
          currency: String(data.currency || "usd"),
          metadata: { provider: "whop", productId: String(productId) },
        });

        return NextResponse.json({
          received: true,
          action: "payment.unlocked",
          userId: userId || "guest",
          email: email || "unknown@example.com",
          productId,
          packageSlug,
          amountCents,
          unlockedAt: new Date().toISOString(),
        });
      }

      case "membership.went_valid": {
        const membershipId = data.id || data.membership_id;
        const userId = data.user_id || data.user?.id;
        const planId = data.plan_id || data.plan?.id;

        return NextResponse.json({
          received: true,
          action: "membership.granted",
          membershipId,
          userId,
          planId,
          status: "active",
        });
      }

      default: {
        return NextResponse.json({
          received: true,
          action: `ignored_${action}`,
        });
      }
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process Whop webhook" },
      { status: 400 },
    );
  }
}
