import { verifyWhopMembership } from "@/lib/integrations/whop";
import { checkPurchaseLedgerAccess, recordPurchaseLedgerEntry } from "./purchase-ledger";

export interface PurchaseVerificationResult {
  authorized: boolean;
  authSource: "stripe" | "whop" | "none";
}

/**
 * Strictly verifies that a package unlock request carries a real, paid Stripe
 * Checkout Session ID or a valid Whop Membership token.
 *
 * SECURITY INVARIANT:
 * - Never trusts `?unlocked=1` query parameters.
 * - Never trusts arbitrary `cs_...` strings in production; verifies `payment_status === "paid"`
 *   against the Stripe API when `STRIPE_SECRET_KEY` is configured.
 * - Only accepts `cs_test_mock_*` in automated unit test runs (`VITEST=true` or `NODE_ENV=test`).
 */
export async function verifyPackagePurchase(params: {
  sessionId?: string | null;
  whopToken?: string | null;
  slug?: string | null;
  email?: string | null;
  userId?: string | null;
}): Promise<PurchaseVerificationResult> {
  const sessionId = (params.sessionId || "").trim();
  const whopToken = (params.whopToken || "").trim();
  const email = (params.email || "").trim();
  const isTestEnv = process.env.VITEST === "true" || process.env.NODE_ENV === "test";

  // 0. Check durable purchase ledger (DB & memory cache)
  const ledgerCheck = await checkPurchaseLedgerAccess({
    slug: params.slug,
    sessionId: sessionId || null,
    email: email || null,
    userId: params.userId || null,
  });
  if (ledgerCheck.unlocked) {
    return { authorized: true, authSource: "stripe" };
  }

  // 1. Verify Stripe Checkout Session
  if (sessionId && sessionId.startsWith("cs_")) {
    const stripeKey = (process.env.STRIPE_SECRET_KEY || "").trim();
    if (isTestEnv && sessionId.startsWith("cs_test_mock_")) {
      return { authorized: true, authSource: "stripe" };
    }
    if (stripeKey && !stripeKey.includes("placeholder")) {
      try {
        const resp = await fetch(
          `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${stripeKey}`,
            },
            cache: "no-store",
          },
        );
        if (resp.ok) {
          const data = (await resp.json()) as {
            payment_status?: string;
            status?: string;
            amount_total?: number;
            currency?: string;
            customer_details?: { email?: string };
            customer_email?: string;
            metadata?: { packageSlug?: string; userId?: string };
          };
          const purchasedSlug = data.metadata?.packageSlug;
          const slugMatches =
            !params.slug ||
            !purchasedSlug ||
            purchasedSlug === params.slug ||
            purchasedSlug === "week8-all-access" ||
            purchasedSlug === "vip-season-pass";
          if (data.payment_status === "paid" && slugMatches) {
            // Persist to durable ledger so tab reloads and future visits remain unlocked
            void recordPurchaseLedgerEntry({
              sessionId,
              packageSlug: purchasedSlug || params.slug || "week8-all-access",
              customerEmail: data.customer_details?.email || data.customer_email,
              userId: data.metadata?.userId || params.userId,
              amountCents: data.amount_total ?? 0,
              currency: data.currency || "usd",
              metadata: data.metadata,
            });
            return { authorized: true, authSource: "stripe" };
          }
        }
      } catch {
        // Fall through to unauthorized
      }
    }
  }

  // 2. Verify Whop Membership Token
  if (whopToken) {
    const whopCheck = await verifyWhopMembership(whopToken);
    if (whopCheck.valid) {
      return { authorized: true, authSource: "whop" };
    }
  }

  return { authorized: false, authSource: "none" };
}
