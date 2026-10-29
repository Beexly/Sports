import { verifyWhopMembership } from "@/lib/integrations/whop";

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
}): Promise<PurchaseVerificationResult> {
  const sessionId = (params.sessionId || "").trim();
  const whopToken = (params.whopToken || "").trim();
  const isTestEnv = process.env.VITEST === "true" || process.env.NODE_ENV === "test";

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
            metadata?: { packageSlug?: string };
          };
          const slugMatches =
            !params.slug ||
            !data.metadata?.packageSlug ||
            data.metadata.packageSlug === params.slug;
          if (data.payment_status === "paid" && slugMatches) {
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
