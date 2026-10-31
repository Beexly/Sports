import { describe, it, expect } from "vitest";
import {
  LIVE_PACKAGE_CATALOG,
  getPackageBySlug,
  buildStripePackageCheckoutPayload,
} from "@/lib/packages/catalog";
import { POST as checkoutRoute } from "@/app/api/packages/checkout/route";
import { GET as unlockRoute } from "@/app/api/packages/unlock/route";

describe("Galaxy Picks storefront catalog", () => {
  it("contains the Week 8 packs at the published prices including the $39.99 standalone DFS pack", () => {
    expect(LIVE_PACKAGE_CATALOG.length).toBe(5);

    const tnf = getPackageBySlug("tnf-all-in-pack");
    expect(tnf?.standardPriceCents).toBe(1900);
    expect(tnf?.guaranteedPriceCents).toBeNull();
    expect(tnf?.stripeProductId).toBe("prod_VX406TulqtZwJJ");
    expect(tnf?.stripePriceId).toBe("price_1UVzsdQ2wPZMxx60lqO3TLbQ");

    const sun = getPackageBySlug("sunday-nfl-5pct-slate");
    expect(sun?.standardPriceCents).toBe(3900);
    expect(sun?.stripeProductId).toBe("prod_VX400OaIktCGLb");
    expect(sun?.stripePriceId).toBe("price_1UVzsfQ2wPZMxx606fYPjKEJ");

    const sgp = getPackageBySlug("sgp-correlation-basket");
    expect(sgp?.standardPriceCents).toBe(2900);
    expect(sgp?.stripeProductId).toBe("prod_VX40XMRjV4FiJl");
    expect(sgp?.stripePriceId).toBe("price_1UVzseQ2wPZMxx60VqAfAyNe");

    const dfs = getPackageBySlug("redzone-dfs-pro-pack");
    expect(dfs?.standardPriceCents).toBe(3999);
    expect(dfs?.includesDfs).toBe(true);

    const all = getPackageBySlug("week8-all-access");
    expect(all?.standardPriceCents).toBe(4900);
    expect(all?.stripeProductId).toBe("prod_VX40T4RNpoNNIp");
    expect(all?.stripePriceId).toBe("price_1UVzsfQ2wPZMxx60ozEJ1P3n");
    expect(all?.includesDfs).toBe(true);
  });

  it("builds valid Stripe Checkout payload with mode 'payment' and inline price_data", () => {
    const tnf = getPackageBySlug("tnf-all-in-pack")!;

    const standardPayload = buildStripePackageCheckoutPayload(
      tnf,
      false,
      "buyer@example.com",
      "https://test.galaxysportsedge.com",
    );
    expect(standardPayload.mode).toBe("payment");
    expect(standardPayload.line_items[0]?.price_data.unit_amount).toBe(1900);
    expect(standardPayload.line_items[0]?.price_data.currency).toBe("usd");
    expect(standardPayload.metadata.packageSlug).toBe("tnf-all-in-pack");
    expect(standardPayload.metadata.guaranteedCreditBack).toBe("false");
    expect(standardPayload.customer_email).toBe("buyer@example.com");
    expect(standardPayload.success_url).toContain("/packages/tnf-all-in-pack?unlocked=1");

    expect(() => buildStripePackageCheckoutPayload(tnf, true)).toThrow(
      /does not offer a guaranteed credit-back tier/,
    );
  });

  it("POST /api/packages/checkout generates checkout session and handles validation", async () => {
    // Missing packageSlug
    const resBad = await checkoutRoute(
      new Request("http://localhost/api/packages/checkout", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    expect(resBad.status).toBe(400);

    // Non-existent packageSlug
    const resNotFound = await checkoutRoute(
      new Request("http://localhost/api/packages/checkout", {
        method: "POST",
        body: JSON.stringify({ packageSlug: "non-existent-pack" }),
      }),
    );
    expect(resNotFound.status).toBe(404);

    // Valid packageSlug
    const resOk = await checkoutRoute(
      new Request("http://localhost/api/packages/checkout", {
        method: "POST",
        body: JSON.stringify({
          packageSlug: "tnf-all-in-pack",
          guaranteed: false,
          email: "guest@example.com",
        }),
      }),
    );
    expect(resOk.status).toBe(200);
    const data = await resOk.json();
    expect(data.sessionId).toBeDefined();
    expect(data.url).toBeDefined();
  });

  it("GET /api/packages/unlock enforces access authorization and returns matching writeups", async () => {
    // Unauthorized without session_id or whop_token
    const resLocked = await unlockRoute(
      new Request("http://localhost/api/packages/unlock?package=tnf-all-in-pack"),
    );
    expect(resLocked.status).toBe(401);
    const lockedData = await resLocked.json();
    expect(lockedData.unlocked).toBe(false);

    // Authorized with valid session_id
    const resUnlockedStripe = await unlockRoute(
      new Request("http://localhost/api/packages/unlock?package=tnf-all-in-pack&session_id=cs_test_mock_12345"),
    );
    expect(resUnlockedStripe.status).toBe(200);
    const stripeData = await resUnlockedStripe.json();
    expect(stripeData.unlocked).toBe(true);
    expect(stripeData.package.slug).toBe("tnf-all-in-pack");
    expect(stripeData.writeups.length).toBeGreaterThanOrEqual(1);
    expect(stripeData.writeups[0]?.windowSlot).toBe("TNF");

    // REJECTS unverified URL query ?unlocked=1 (strict payment gating)
    const resUnlockedBypassAttempt = await unlockRoute(
      new Request("http://localhost/api/packages/unlock?package=sunday-nfl-5pct-slate&unlocked=1"),
    );
    expect(resUnlockedBypassAttempt.status).toBe(401);
    const bypassData = await resUnlockedBypassAttempt.json();
    expect(bypassData.unlocked).toBe(false);
  });
});
