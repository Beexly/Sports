import { NextResponse } from "next/server";
import { db, DurableWriteStoreUnavailableError, requireDurableWriteStore } from "@sports/db";
import { verifyWhopWebhookSignature } from "@/lib/integrations/whop";
import {
  WHOP_SLUG_ALLOWLIST,
  mapWhopEventToGseEntitlement,
  markWhopWebhookProcessed,
  verifyWhopStandardWebhook,
  type GseWhopEntitlementGrant,
} from "@/lib/integrations/whop-v1-entitlements";
import {
  recordPurchaseLedgerEntry,
  revokePurchaseLedgerEntries,
} from "@/lib/packages/purchase-ledger";

async function syncWhopSubscriptionRecord(params: {
  buyerEmail: string | null;
  whopUserId: string | null;
  tier: "PRO" | "ELITE" | "FANTASY";
  status: "ACTIVE" | "CANCELED";
}): Promise<void> {
  const email = params.buyerEmail?.trim().toLowerCase() || null;
  if (!email && !params.whopUserId) return;

  let userId: string | null = null;
  if (email && typeof db?.user?.findFirst === "function") {
    const existingUser = await db.user.findFirst({
      where: { email },
      select: { id: true },
    });
    userId = existingUser?.id ?? null;
  }

  if (userId && typeof db?.subscription?.upsert === "function") {
    await db.subscription.upsert({
      where: { userId },
      update: {
        ...(params.status === "ACTIVE" ? { tier: params.tier } : { tier: "FREE" }),
        status: params.status,
        pastDueSince: null,
        canceledAt: params.status === "CANCELED" ? new Date() : null,
      },
      create: {
        userId,
        stripeCustomerId: `whop:${params.whopUserId || userId}`,
        tier: params.status === "ACTIVE" ? params.tier : "FREE",
        status: params.status,
        canceledAt: params.status === "CANCELED" ? new Date() : null,
      },
    });
  } else if (
    params.status === "CANCELED" &&
    params.whopUserId &&
    typeof db?.subscription?.updateMany === "function"
  ) {
    await db.subscription.updateMany({
      where: { stripeCustomerId: `whop:${params.whopUserId}` },
      data: { tier: "FREE", status: "CANCELED", canceledAt: new Date() },
    });
  }
}

async function persistV1Grant(
  decision: GseWhopEntitlementGrant,
  rawAmt: number,
  throwOnDbError: boolean,
): Promise<void> {
  if (
    decision.action === "GRANT" &&
    decision.gsePackSlug &&
    decision.gsePackSlug !== "free-proof-room" &&
    decision.gsePackSlug !== "open-field-pass"
  ) {
    const amountCents =
      rawAmt > 0
        ? rawAmt
        : decision.entitlementType === "MONTHLY_SUBSCRIPTION"
          ? decision.planTier === "PRO"
            ? 3900
            : 7900
          : 4900;

    await recordPurchaseLedgerEntry(
      {
        sessionId: String(decision.whopPaymentOrMembershipId || decision.webhookId),
        packageSlug: decision.gsePackSlug,
        customerEmail: decision.buyerEmail,
        userId: decision.whopUserId,
        amountCents,
        currency: "usd",
        metadata: {
          provider: "whop_v1",
          whopEventId: decision.webhookId,
          entitlementType: decision.entitlementType,
          planTier: decision.planTier,
          receiptSha256: decision.receiptSha256,
        },
      },
      { throwOnDbError },
    );

    if (decision.entitlementType === "MONTHLY_SUBSCRIPTION") {
      await syncWhopSubscriptionRecord({
        buyerEmail: decision.buyerEmail,
        whopUserId: decision.whopUserId,
        tier: decision.planTier ?? "ELITE",
        status: "ACTIVE",
      });
    }
  } else if (decision.action === "REVOKE") {
    await revokePurchaseLedgerEntries(
      {
        sessionId: decision.whopPaymentOrMembershipId,
        customerEmail: decision.buyerEmail,
        packageSlug: decision.gsePackSlug,
        reason: `whop_v1_${decision.eventType}`,
      },
      { throwOnDbError },
    );

    if (
      decision.entitlementType === "MONTHLY_SUBSCRIPTION" ||
      decision.eventType.startsWith("membership.")
    ) {
      await syncWhopSubscriptionRecord({
        buyerEmail: decision.buyerEmail,
        whopUserId: decision.whopUserId,
        tier: "PRO",
        status: "CANCELED",
      });
    }
  }
}

export async function POST(req: Request) {
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

  if (isProd) {
    try {
      requireDurableWriteStore("whop-webhook-entitlement");
    } catch (err) {
      if (err instanceof DurableWriteStoreUnavailableError) {
        return NextResponse.json(
          { error: "Durable write store unavailable; retry webhook delivery." },
          { status: 503 },
        );
      }
      throw err;
    }
  }

  const webhookSecret = configuredSecret || "whop_whsec_test_secret";

  if (isStandardWebhookV1 && (isProd || configuredSecret)) {
    let verified: ReturnType<typeof verifyWhopStandardWebhook>;
    try {
      verified = verifyWhopStandardWebhook({
        rawBody,
        headers: {
          "webhook-id": webhookId ?? undefined,
          "webhook-timestamp": webhookTs ?? undefined,
          "webhook-signature": webhookSig ?? undefined,
        },
        secret: webhookSecret,
      });
    } catch (sigErr) {
      return NextResponse.json(
        { error: sigErr instanceof Error ? sigErr.message : "Invalid Whop v1 signature." },
        { status: 401 },
      );
    }

    if (verified.duplicate) {
      return NextResponse.json({
        received: true,
        status: "duplicate_ignored",
        id: verified.envelope.id,
      });
    }

    const decision = mapWhopEventToGseEntitlement(verified.envelope);
    const dataObj = (verified.envelope.data ?? {}) as Record<string, unknown>;
    const rawAmt = Number(dataObj.amount ?? dataObj.final_amount ?? 0);

    try {
      await persistV1Grant(decision, rawAmt, isProd);
      markWhopWebhookProcessed(verified.envelope.id);
    } catch {
      return NextResponse.json(
        { error: "Temporary persistence error; please retry webhook." },
        { status: 503 },
      );
    }

    return NextResponse.json({
      received: true,
      status: "accepted",
      action: decision.action,
      gsePackSlug: decision.gsePackSlug,
      receiptSha256: decision.receiptSha256,
    });
  }

  // Fail closed when signature verification fails in production OR whenever a secret is configured.
  if (isProd || configuredSecret) {
    const isValid = verifyWhopWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid Whop webhook signature." },
        { status: 401 },
      );
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody || "{}") as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const action = String(payload.action || payload.type || payload.event || "unknown");
  const data = (payload.data || payload) as Record<string, unknown>;
  const dataMeta = (data.metadata ?? {}) as Record<string, unknown>;
  const dataUser = (data.user ?? {}) as Record<string, unknown>;
  const dataProduct = (data.product ?? {}) as Record<string, unknown>;
  const dataPlan = (data.plan ?? {}) as Record<string, unknown>;

  try {
    switch (action) {
      case "payment.succeeded": {
        const userId =
          typeof data.user_id === "string"
            ? data.user_id
            : typeof dataUser.id === "string"
              ? dataUser.id
              : null;
        const email =
          typeof data.email === "string"
            ? data.email
            : typeof dataUser.email === "string"
              ? dataUser.email
              : null;
        const productId =
          typeof data.product_id === "string"
            ? data.product_id
            : typeof dataProduct.id === "string"
              ? dataProduct.id
              : "unknown_product";
        const candidateSlug = String(
          dataMeta.gse_pack_slug ||
            dataMeta.packageSlug ||
            dataMeta.slug ||
            dataProduct.slug ||
            "primetime-showdown-pack",
        );
        const packageSlug = WHOP_SLUG_ALLOWLIST.has(candidateSlug)
          ? candidateSlug
          : "unmapped-pack";
        const amountCents = Number(data.amount ?? data.final_amount ?? 0) || 0;
        const paymentId = String(data.id || data.payment_id || `whop_${Date.now()}`);

        if (packageSlug !== "unmapped-pack" && packageSlug !== "free-proof-room") {
          await recordPurchaseLedgerEntry(
            {
              sessionId: paymentId,
              packageSlug,
              customerEmail: email,
              userId,
              amountCents,
              currency: String(data.currency || "usd"),
              metadata: { provider: "whop", productId },
            },
            { throwOnDbError: isProd },
          );
        }

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
        const userId =
          typeof data.user_id === "string"
            ? data.user_id
            : typeof dataUser.id === "string"
              ? dataUser.id
              : undefined;
        const planId = data.plan_id || dataPlan.id;
        const email =
          typeof data.email === "string"
            ? data.email
            : typeof dataUser.email === "string"
              ? dataUser.email
              : null;
        const rawAmt = Number(data.amount ?? dataPlan.initial_price ?? 0) || 0;
        const rawSlug = String(
          dataMeta.gse_pack_slug || dataMeta.packageSlug || "season-membership",
        );
        const packageSlug = WHOP_SLUG_ALLOWLIST.has(rawSlug) ? rawSlug : "season-membership";
        const tier: "PRO" | "ELITE" =
          packageSlug === "pro-monthly" || (rawAmt > 0 && rawAmt <= 4500) ? "PRO" : "ELITE";

        if (membershipId || userId || email) {
          await recordPurchaseLedgerEntry(
            {
              sessionId: String(membershipId || `whop_mem_${userId || Date.now()}`),
              packageSlug,
              customerEmail: email,
              userId: userId ?? null,
              amountCents: rawAmt > 0 ? rawAmt : tier === "PRO" ? 3900 : 7900,
              currency: String(data.currency || "usd"),
              metadata: { provider: "whop_legacy_membership", planId: planId ?? null },
            },
            { throwOnDbError: isProd },
          );
          await syncWhopSubscriptionRecord({
            buyerEmail: email,
            whopUserId: userId ?? null,
            tier,
            status: "ACTIVE",
          });
        }

        return NextResponse.json({
          received: true,
          action: "membership.granted",
          membershipId,
          userId,
          planId,
          status: "active",
        });
      }

      case "membership.went_invalid":
      case "membership.deactivated":
      case "membership.canceled":
      case "refund.created": {
        const entityId =
          typeof data.id === "string"
            ? data.id
            : typeof data.membership_id === "string"
              ? data.membership_id
              : typeof data.payment_id === "string"
                ? data.payment_id
                : null;
        const userId =
          typeof data.user_id === "string"
            ? data.user_id
            : typeof dataUser.id === "string"
              ? dataUser.id
              : null;
        const email =
          typeof data.email === "string"
            ? data.email
            : typeof dataUser.email === "string"
              ? dataUser.email
              : null;

        await revokePurchaseLedgerEntries(
          {
            sessionId: entityId,
            customerEmail: email,
            reason: `whop_legacy_${action}`,
          },
          { throwOnDbError: isProd },
        );
        if (action.startsWith("membership.")) {
          await syncWhopSubscriptionRecord({
            buyerEmail: email,
            whopUserId: userId,
            tier: "PRO",
            status: "CANCELED",
          });
        }

        return NextResponse.json({
          received: true,
          action: "entitlement.revoked",
          entityId,
        });
      }

      default: {
        return NextResponse.json({
          received: true,
          action: `ignored_${action}`,
        });
      }
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to persist Whop webhook event; retry delivery." },
      { status: 503 },
    );
  }
}
