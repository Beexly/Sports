import { describe, it, expect } from "vitest";
import {
  LIVE_PACKAGE_CATALOG,
  getPackageBySlug,
  buildStripePackageCheckoutPayload,
} from "@/lib/packages/catalog";
import { POST as checkoutRoute } from "@/app/api/packages/checkout/route";
import { GET as unlockRoute } from "@/app/api/packages/unlock/route";

describe("Galaxy Picks Storefront & Instant Checkout Suite", () => {
  it("validates the 4 Week 8 packages with guaranteedPriceCents: null and zero third-party brand names", () => {
    expect(LIVE_PACKAGE_CATALOG.length).toBe(4);

    const expectedPackages = [
      { slug: "tnf-all-in-pack", price: 1900, windowSlot: "TNF", includesDfs: true },
      { slug: "sunday-nfl-5pct-slate", price: 2900, windowSlot: "SUN_MAIN", includesDfs: false },
      { slug: "sgp-correlation-basket", price: 1900, windowSlot: "SUN_MAIN", includesDfs: false },
      { slug: "week8-all-access", price: 3900, windowSlot: "WEEKLY_PASS", includesDfs: true },
    ];

    const forbiddenBrands = /\b(WagerTalk|OnlyFans|FTN|Circa|Pinnacle)\b/i;

    for (const expected of expectedPackages) {
      const pkg = getPackageBySlug(expected.slug);
      expect(pkg).toBeDefined();
      expect(pkg?.standardPriceCents).toBe(expected.price);
      expect(pkg?.guaranteedPriceCents).toBeNull();
      expect(pkg?.windowSlot).toBe(expected.windowSlot);
      expect(pkg?.includesDfs).toBe(expected.includesDfs);
      expect(JSON.stringify(pkg)).not.toMatch(forbiddenBrands);
    }
  });

  it("builds Stripe Checkout payload with inline price_data and rejects guaranteed tier when null", () => {
    for (const pkg of LIVE_PACKAGE_CATALOG) {
      const payload = buildStripePackageCheckoutPayload(
        pkg,
        false,
        "member@galaxysportsedge.com",
        "https://www.galaxysportsedge.com",
      );

      expect(payload.mode).toBe("payment");
      expect(payload.line_items[0]?.price_data.currency).toBe("usd");
      expect(payload.line_items[0]?.price_data.unit_amount).toBe(pkg.standardPriceCents);
      expect(payload.line_items[0]?.price_data.product_data.name).toBe(pkg.title);
      expect(payload.metadata.packageSlug).toBe(pkg.slug);
      expect(payload.metadata.guaranteedCreditBack).toBe("false");
      expect(payload.customer_email).toBe("member@galaxysportsedge.com");
      expect(payload.success_url).toBe(
        `https://www.galaxysportsedge.com/packages/${pkg.slug}?unlocked=1&session_id={CHECKOUT_SESSION_ID}`,
      );

      expect(() => buildStripePackageCheckoutPayload(pkg, true)).toThrow(
        /does not offer a guaranteed credit-back tier/,
      );
    }
  });

  it("POST /api/packages/checkout and GET /api/packages/unlock enforce payment gating and return honest Week 8 writeups", async () => {
    const checkoutRes = await checkoutRoute(
      new Request("http://localhost/api/packages/checkout", {
        method: "POST",
        body: JSON.stringify({
          packageSlug: "week8-all-access",
          guaranteed: false,
          email: "vip@galaxysportsedge.com",
        }),
      }),
    );
    expect(checkoutRes.status).toBe(200);
    const checkoutJson = await checkoutRes.json();
    expect(checkoutJson.sessionId).toBeDefined();
    expect(checkoutJson.url).toBeDefined();

    const lockedRes = await unlockRoute(
      new Request("http://localhost/api/packages/unlock?package=week8-all-access&unlocked=1"),
    );
    expect(lockedRes.status).toBe(401);

    const unlockedRes = await unlockRoute(
      new Request(
        "http://localhost/api/packages/unlock?package=week8-all-access&session_id=cs_test_mock_99999",
      ),
    );
    expect(unlockedRes.status).toBe(200);
    const unlockedJson = await unlockedRes.json();
    expect(unlockedJson.unlocked).toBe(true);
    expect(unlockedJson.writeups.length).toBe(14);

    // Check honest PASS decisions and XX/100 confidence in unlocked writeups
    const hasPassDecision = unlockedJson.writeups.some(
      (w: {
        sideTotalCall: { sideDecision: string; totalDecision: string };
        topProps: Array<{ decision: string }>;
      }) =>
        w.sideTotalCall.sideDecision === "PASS" ||
        w.sideTotalCall.totalDecision === "PASS" ||
        w.topProps.some((p) => p.decision === "PASS"),
    );
    expect(hasPassDecision).toBe(true);
  });
});
