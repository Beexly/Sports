import { NextResponse } from "next/server";
import { db } from "@sports/db";
import { verifyWhopWebhookSignature } from "@/lib/integrations/whop";
import {
  mapWhopEventToGseEntitlement,
  verifyWhopStandardWebhook,
} from "@/lib/integrations/whop-v1-entitlements";
import { recordPurchaseLedgerEntry } from "@/lib/packages/purchase-ledger";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const webhookId = req.headers.get("webhook-id");
    const webhookTs = req.headers.get("webhook-timestamp");
    const webhookSig = req.headers.get("webhook-signature");
    const isStandardWebhookV1 = Boolean(webhookId && webhookTs && webhookSig);

    const signature =
      req.headers.get("whop-signature") ||
      req.headers.get("x-whop-signature") ||
      webhookSig;

    const isProd = process.env.NODE_ENV === "production";
    const configuredSecret = (process.env.WHOP_WEBHOOK_SECRET || "").trim();

    if (isProd && !configuredSecret) {
      return NextResponse.json(
        { error: "Whop webhook secret not configured." },
        { status: 500 },
      );
    }

    const webhookSecret = configuredSecret || "whop_whsec_test_secret";

    if (isStandardWebhookV1 && (isProd || configuredSecret)) {
      try {
        const { duplicate, envelope } = verifyWhopStandardWebhook({
          rawBody,
          headers: {
            "webhook-id": webhookId ?? undefined,
            "webhook-timestamp": webhookTs ?? undefined,
            "webhook-signature": webhookSig ?? undefined,
          },
          secret: webhookSecret,
        });
        if (duplicate) {
          return NextResponse.json({ received: true, status: "duplicate_ignored", id: envelope.id });
        }
        const decision = mapWhopEventToGseEntitlement(envelope);
        if (decision.action === "GRANT" && decision.gsePackSlug && decision.gsePackSlug !== "free-proof-room") {
          const dataObj = (envelope.data ?? {}) as Record<string, unknown>;
          const rawAmt = Number(dataObj.amount ?? dataObj.final_amount ?? 0);
          const amountCents =
            rawAmt > 0
              ? rawAmt
              : decision.entitlementType === "MONTHLY_SUBSCRIPTION"
                ? 14900
                : 4900;
          await recordPurchaseLedgerEntry({
            sessionId: String(decision.whopPaymentOrMembershipId || envelope.id),
            packageSlug: decision.gsePackSlug,
            customerEmail: decision.buyerEmail,
            userId: decision.whopUserId,
            amountCents,
            currency: "usd",
            metadata: {
              provider: "whop_v1",
              whopEventId: envelope.id,
              entitlementType: decision.entitlementType,
              receiptSha256: decision.receiptSha256,
            },
          });
          if (decision.entitlementType === "MONTHLY_SUBSCRIPTION" && decision.buyerEmail) {
            try {
              const existingUser = await db.user.findFirst({
                where: { email: decision.buyerEmail.trim().toLowerCase() },
                select: { id: true },
              });
              if (existingUser?.id) {
                await db.subscription.upsert({
                  where: { userId: existingUser.id },
                  update: { tier: "ELITE", status: "ACTIVE", pastDueSince: null },
                  create: {
                    userId: existingUser.id,
                    stripeCustomerId: `whop:${decision.whopUserId || existingUser.id}`,
                    tier: "ELITE",
                    status: "ACTIVE",
                  },
                });
              }
            } catch {
              // Purchase ledger entry above already grants ELITE via resolvePackEntitlementTier.
            }
          }
        }
        return NextResponse.json({
          received: true,
          status: "accepted",
          action: decision.action,
          gsePackSlug: decision.gsePackSlug,
          receiptSha256: decision.receiptSha256,
        });
      } catch (sigErr) {
        return NextResponse.json(
          { error: sigErr instanceof Error ? sigErr.message : "Invalid Whop v1 signature." },
          { status: 401 },
        );
      }
    }

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
    const action = payload.action || payload.type || payload.event || "unknown";
    const data = payload.data || payload;

    switch (action) {
      case "payment.succeeded": {
        const userId = data.user_id || data.user?.id || null;
        const email = data.email || data.user?.email || null;
        const productId = data.product_id || data.product?.id || "unknown_product";
        const packageSlug =
          data.metadata?.gse_pack_slug ||
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
