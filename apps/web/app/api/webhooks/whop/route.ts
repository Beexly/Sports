import { NextResponse } from "next/server";
import { verifyWhopWebhookSignature } from "@/lib/integrations/whop";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get("whop-signature") ||
      req.headers.get("x-whop-signature") ||
      req.headers.get("webhook-signature");

    const webhookSecret = process.env.WHOP_WEBHOOK_SECRET || "whop_whsec_test_secret";

    // Verify signature if secret is configured and not in permissive test mode
    if (webhookSecret && !webhookSecret.includes("disabled")) {
      const isValid = verifyWhopWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid && process.env.NODE_ENV === "production") {
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
        const userId = data.user_id || data.user?.id || "guest";
        const email = data.email || data.user?.email || "unknown@example.com";
        const productId = data.product_id || data.product?.id || "unknown_product";
        const amountCents = data.amount || data.final_amount || 0;

        return NextResponse.json({
          received: true,
          action: "payment.unlocked",
          userId,
          email,
          productId,
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
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to process Whop webhook" },
      { status: 400 },
    );
  }
}
