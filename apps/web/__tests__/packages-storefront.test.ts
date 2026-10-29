import { describe, it, expect } from "vitest";
import {
  LIVE_PACKAGE_CATALOG,
  getPackageBySlug,
  buildStripePackageCheckoutPayload,
} from "@/lib/packages/catalog";
import { POST as checkoutRoute } from "@/app/api/packages/checkout/route";
import { GET as unlockRoute } from "@/app/api/packages/unlock/route";

describe("WagerTalk-Style Storefront Catalog & Checkout Builder", () => {
  it("contains all 5 required a-la-carte package offerings with exact pricing specs", () => {
    expect(LIVE_PACKAGE_CATALOG.length).toBeGreaterThanOrEqual(5);

    // 1. tnf-all-in-prime-pack
    const tnf = getPackageBySlug("tnf-all-in-prime-pack");
    expect(tnf).toBeDefined();
    expect(tnf?.windowSlot).toBe("TNF");
    expect(tnf?.standardPriceCents).toBe(2500);
    expect(tnf?.guaranteedPriceCents).toBe(3800);

    // 2. sunday-nfl-5pct-slate-card
    const sun5 = getPackageBySlug("sunday-nfl-5pct-slate-card");
    expect(sun5).toBeDefined();
    expect(sun5?.windowSlot).toBe("SUN_MAIN");
    expect(sun5?.standardPriceCents).toBe(3500);
    expect(sun5?.guaranteedPriceCents).toBe(5300);

    // 3. sunday-dfs-pro-20max-pack
    const dfs = getPackageBySlug("sunday-dfs-pro-20max-pack");
    expect(dfs).toBeDefined();
    expect(dfs?.windowSlot).toBe("SUN_MAIN");
    expect(dfs?.standardPriceCents).toBe(2900);
    expect(dfs?.guaranteedPriceCents).toBeNull();

    // 4. weekend-3day-all-access
    const wend = getPackageBySlug("weekend-3day-all-access");
    expect(wend).toBeDefined();
    expect(wend?.windowSlot).toBe("WEEKEND_PASS");
    expect(wend?.standardPriceCents).toBe(6900);
    expect(wend?.guaranteedPriceCents).toBeNull();

    // 5. weekly-7day-all-access
    const week = getPackageBySlug("weekly-7day-all-access");
    expect(week).toBeDefined();
    expect(week?.windowSlot).toBe("WEEKLY_PASS");
    expect(week?.standardPriceCents).toBe(9900);
    expect(week?.guaranteedPriceCents).toBeNull();
  });

  it("builds valid Stripe Checkout payload with mode 'payment' and inline price_data", () => {
    const tnf = getPackageBySlug("tnf-all-in-prime-pack")!;

    // Standard checkout
    const standardPayload = buildStripePackageCheckoutPayload(
      tnf,
      false,
      "buyer@example.com",
      "https://test.galaxysportsedge.com",
    );
    expect(standardPayload.mode).toBe("payment");
    expect(standardPayload.line_items[0]?.price_data.unit_amount).toBe(2500);
    expect(standardPayload.line_items[0]?.price_data.currency).toBe("usd");
    expect(standardPayload.metadata.packageSlug).toBe("tnf-all-in-prime-pack");
    expect(standardPayload.metadata.guaranteedCreditBack).toBe("false");
    expect(standardPayload.customer_email).toBe("buyer@example.com");
    expect(standardPayload.success_url).toContain("/packages/tnf-all-in-prime-pack?unlocked=1");

    // Guaranteed credit-back checkout
    const guaranteedPayload = buildStripePackageCheckoutPayload(
      tnf,
      true,
      "buyer@example.com",
      "https://test.galaxysportsedge.com",
    );
    expect(guaranteedPayload.line_items[0]?.price_data.unit_amount).toBe(3800);
    expect(guaranteedPayload.metadata.guaranteedCreditBack).toBe("true");

    // Throws if guaranteed tier is requested on a package with null guaranteedPriceCents
    const dfs = getPackageBySlug("sunday-dfs-pro-20max-pack")!;
    expect(() => buildStripePackageCheckoutPayload(dfs, true)).toThrow(
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
          packageSlug: "tnf-all-in-prime-pack",
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
      new Request("http://localhost/api/packages/unlock?package=tnf-all-in-prime-pack"),
    );
    expect(resLocked.status).toBe(401);
    const lockedData = await resLocked.json();
    expect(lockedData.unlocked).toBe(false);

    // Authorized with valid session_id
    const resUnlockedStripe = await unlockRoute(
      new Request("http://localhost/api/packages/unlock?package=tnf-all-in-prime-pack&session_id=cs_test_mock_12345"),
    );
    expect(resUnlockedStripe.status).toBe(200);
    const stripeData = await resUnlockedStripe.json();
    expect(stripeData.unlocked).toBe(true);
    expect(stripeData.package.slug).toBe("tnf-all-in-prime-pack");
    expect(stripeData.writeups.length).toBeGreaterThanOrEqual(1);
    expect(stripeData.writeups[0]?.windowSlot).toBe("TNF");

    // REJECTS unverified URL query ?unlocked=1 (strict payment gating)
    const resUnlockedBypassAttempt = await unlockRoute(
      new Request("http://localhost/api/packages/unlock?package=sunday-nfl-5pct-slate-card&unlocked=1"),
    );
    expect(resUnlockedBypassAttempt.status).toBe(401);
    const bypassData = await resUnlockedBypassAttempt.json();
    expect(bypassData.unlocked).toBe(false);
  });
});
