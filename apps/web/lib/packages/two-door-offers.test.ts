// @vitest-environment node
/**
 * Two-door offers — pricing, Whop resolution, catalog backward compatibility,
 * and public-copy fence tests (logic-only).
 */
import { describe, it, expect } from "vitest";
import {
  TWO_DOOR_PACK_OFFERS,
  getSingleSlateOffer,
  isSingleSlateOfferSlug,
  MEMBERSHIP_PRICING,
  MEMBERSHIP_PLANS,
  FOUNDING_SEAT_LIMIT,
  FOUNDING_SEAT_COPY,
  SEASON_MEMBERSHIP_SLUG,
  selectMembershipMonthlyPrice,
  resolveWhopCheckoutUrl,
  singleSlateCheckoutAvailability,
  membershipCheckoutAvailability,
  CREDIT_BACK_TERMS,
} from "./two-door-offers";
import {
  LIVE_PACKAGE_CATALOG,
  getPackageBySlug,
  buildStripePackageCheckoutPayload,
} from "./catalog";
import { orderPacksForStorefront } from "@/components/packages/storefront-order";
import {
  scrubPackageCopy,
  scrubBadge,
  containsBannedRecordCopy,
  containsBannedWords,
} from "./copy-fence";

describe("founding price selection", () => {
  it("gives the founding rate to the first 100 members (index 0..99)", () => {
    expect(selectMembershipMonthlyPrice(0)).toEqual({ priceCents: 5999, rate: "founding" });
    expect(selectMembershipMonthlyPrice(42)).toEqual({ priceCents: 5999, rate: "founding" });
    expect(selectMembershipMonthlyPrice(99)).toEqual({ priceCents: 5999, rate: "founding" });
  });

  it("gives the standard rate from member 100 onward", () => {
    expect(selectMembershipMonthlyPrice(100)).toEqual({ priceCents: 7999, rate: "standard" });
    expect(selectMembershipMonthlyPrice(1000)).toEqual({ priceCents: 7999, rate: "standard" });
  });

  it("rejects invalid member indices", () => {
    for (const bad of [-1, 1.5, NaN, Infinity]) {
      expect(() => selectMembershipMonthlyPrice(bad)).toThrow();
    }
  });

  it("pins the published pricing constants", () => {
    expect(MEMBERSHIP_PRICING.foundingMonthlyCents).toBe(5999);
    expect(MEMBERSHIP_PRICING.standardMonthlyCents).toBe(7999);
    expect(MEMBERSHIP_PRICING.restOfSeasonCents).toBe(24900);
    expect(FOUNDING_SEAT_LIMIT).toBe(100);
    expect(FOUNDING_SEAT_COPY).toContain("first 100 members");
    expect(SEASON_MEMBERSHIP_SLUG).toBe("season-membership");
    expect(MEMBERSHIP_PLANS.map((p) => p.id)).toEqual([
      "founding-monthly",
      "standard-monthly",
      "rest-of-season",
    ]);
  });
});

describe("single-slate offers", () => {
  it("exposes exactly the two Door-2 packs at the directed prices", () => {
    expect(TWO_DOOR_PACK_OFFERS).toHaveLength(2);
    const primetime = getSingleSlateOffer("primetime-showdown-pack")!;
    const sunday = getSingleSlateOffer("sunday-full-slate-pack")!;
    expect(primetime.standardPriceCents).toBe(1900);
    expect(primetime.creditBackPriceCents).toBe(2900);
    expect(sunday.standardPriceCents).toBe(2900);
    expect(sunday.creditBackPriceCents).toBe(3900);
    expect(primetime.slateKey).toBe("primetime-showdown");
    expect(sunday.slateKey).toBe("sunday-full-slate");
  });

  it("carries the exact credit-back terms (0.00u trigger, 100% back, flat $35 upgrade)", () => {
    expect(CREDIT_BACK_TERMS.triggerNetUnits).toBe(0);
    expect(CREDIT_BACK_TERMS.refundPercentOfPrice).toBe(100);
    expect(CREDIT_BACK_TERMS.upgradeCreditCents).toBe(3500);
    for (const offer of TWO_DOOR_PACK_OFFERS) {
      expect(offer.creditBackTerms).toEqual(CREDIT_BACK_TERMS);
      expect(offer.protectionCopy).toContain("0.00 units");
      expect(offer.protectionCopy).toContain("$35");
    }
  });

  it("is Whop-only: empty Stripe ids, for sale, resolvable by slug", () => {
    for (const offer of TWO_DOOR_PACK_OFFERS) {
      expect(offer.stripePriceId).toBe("");
      expect(offer.stripeProductId).toBe("");
      expect(offer.forSale).toBe(true);
      expect(isSingleSlateOfferSlug(offer.slug)).toBe(true);
      expect(getPackageBySlug(offer.slug)?.slug).toBe(offer.slug);
    }
    expect(isSingleSlateOfferSlug("tnf-all-in-pack")).toBe(false);
    expect(getSingleSlateOffer("nope")).toBeUndefined();
  });

  it("never enters the Stripe payload path", () => {
    for (const offer of TWO_DOOR_PACK_OFFERS) {
      expect(() => buildStripePackageCheckoutPayload(offer, false)).toThrow(/Whop-checkout offer/);
    }
  });
});

describe("Whop checkout-link resolution (env-driven, fail-closed)", () => {
  it("accepts only https URLs and trims whitespace", () => {
    const env = { WHOP_CHECKOUT_PRIMETIME_STANDARD: "  https://whop.com/checkout/abc  " };
    expect(resolveWhopCheckoutUrl("WHOP_CHECKOUT_PRIMETIME_STANDARD", env)).toBe(
      "https://whop.com/checkout/abc",
    );
  });

  it("falls back to the generic link, per-offer key wins", () => {
    const env = {
      WHOP_CHECKOUT_LINK: "https://whop.com/checkout/generic",
      WHOP_CHECKOUT_PRIMETIME_STANDARD: "https://whop.com/checkout/specific",
    };
    expect(resolveWhopCheckoutUrl("WHOP_CHECKOUT_PRIMETIME_STANDARD", env)).toBe(
      "https://whop.com/checkout/specific",
    );
    expect(resolveWhopCheckoutUrl("WHOP_CHECKOUT_SUNDAY_STANDARD", env)).toBe(
      "https://whop.com/checkout/generic",
    );
  });

  it("returns null for absent, placeholder, or non-https values (never a fake URL)", () => {
    expect(resolveWhopCheckoutUrl("WHOP_CHECKOUT_PRIMETIME_STANDARD", {})).toBeNull();
    expect(
      resolveWhopCheckoutUrl("WHOP_CHECKOUT_PRIMETIME_STANDARD", {
        WHOP_CHECKOUT_PRIMETIME_STANDARD: "plan_12345",
      }),
    ).toBeNull();
    expect(
      resolveWhopCheckoutUrl("WHOP_CHECKOUT_PRIMETIME_STANDARD", {
        WHOP_CHECKOUT_PRIMETIME_STANDARD: "http://whop.com/checkout/abc",
      }),
    ).toBeNull();
  });

  it("reports per-offer and per-plan availability as booleans", () => {
    const empty = singleSlateCheckoutAvailability({});
    expect(empty).toHaveLength(2);
    expect(empty.every((a) => !a.standardConfigured && !a.creditBackConfigured)).toBe(true);

    const env = { WHOP_CHECKOUT_SUNDAY_CREDIT_BACK: "https://whop.com/checkout/sunday-cb" };
    const configured = singleSlateCheckoutAvailability(env);
    const sunday = configured.find((a) => a.offerSlug === "sunday-full-slate-pack")!;
    expect(sunday.creditBackConfigured).toBe(true);
    expect(sunday.standardConfigured).toBe(false);

    const membership = membershipCheckoutAvailability({
      WHOP_CHECKOUT_MEMBERSHIP_FOUNDING: "https://whop.com/checkout/founding",
    });
    expect(membership["founding-monthly"]).toBe(true);
    expect(membership["standard-monthly"]).toBe(false);
    expect(membership["rest-of-season"]).toBe(false);
  });
});

describe("catalog backward compatibility (homepage + legacy consumers)", () => {
  it("keeps LIVE_PACKAGE_CATALOG at exactly the 5 legacy entries with null credit-back", () => {
    expect(LIVE_PACKAGE_CATALOG).toHaveLength(5);
    expect(LIVE_PACKAGE_CATALOG.map((p) => p.slug)).toEqual([
      "tnf-all-in-pack",
      "sunday-nfl-5pct-slate",
      "sgp-correlation-basket",
      "redzone-dfs-pro-pack",
      "week8-all-access",
    ]);
    for (const pkg of LIVE_PACKAGE_CATALOG) {
      expect(pkg.creditBackPriceCents).toBeNull();
    }
  });

  it("orderPacksForStorefront still works off PickPackageOffering[]", () => {
    const ordered = orderPacksForStorefront(LIVE_PACKAGE_CATALOG);
    // forSale:false TNF pack drops out; full-slate pass leads.
    expect(ordered).toHaveLength(4);
    expect(ordered[0].slug).toBe("week8-all-access");
    expect(ordered.some((p) => p.slug === "tnf-all-in-pack")).toBe(false);
  });

  it("getPackageBySlug still resolves legacy slugs and aliases", () => {
    expect(getPackageBySlug("tnf-all-in-pack")?.standardPriceCents).toBe(1900);
    expect(getPackageBySlug("week8-all-access")?.standardPriceCents).toBe(4900);
    expect(getPackageBySlug("definitely-not-a-pack")).toBeUndefined();
  });

  it("legacy Stripe payload keeps working and scrubs record banners from checkout copy", () => {
    const tnf = getPackageBySlug("tnf-all-in-pack")!;
    const payload = buildStripePackageCheckoutPayload(tnf, false, "buyer@example.com", "https://x.test");
    expect(payload.mode).toBe("payment");
    expect(payload.line_items[0].price_data.unit_amount).toBe(1900);
    const description = payload.line_items[0].price_data.product_data.description;
    expect(description).toContain("Jacksonville");
    expect(containsBannedRecordCopy(description)).toBe(false);
  });
});

describe("public-copy fence", () => {
  it("detects record banners, win rates and unit gains", () => {
    expect(containsBannedRecordCopy("Verified 36-13-1 (73.5%) · +20.14u")).toBe(true);
    expect(containsBannedRecordCopy("47-19-1 (+24.92u)")).toBe(true);
    expect(containsBannedRecordCopy("71.2% win rate")).toBe(true);
    expect(containsBannedRecordCopy("Plain football reasoning.")).toBe(false);
  });

  it("scrubs record sentences but keeps the product description", () => {
    const scrubbed = scrubPackageCopy(
      "This standalone primetime window (Jacksonville @ Baltimore) is closed and archived. Verified 36-13-1 (73.5% · +20.14u; all-in secondary 47-19-1 (+24.92u)) season record.",
    );
    expect(scrubbed).toContain("Jacksonville");
    expect(scrubbed).not.toContain("36-13-1");
    expect(scrubbed).not.toContain("73.5");
    expect(scrubbed).toContain("verified record");
  });

  it("scrubs banned hype words out of badges", () => {
    expect(scrubBadge("Lock of the Week")).not.toMatch(/lock/i);
    expect(scrubBadge("Locked In")).not.toMatch(/lock/i);
    expect(scrubBadge(undefined)).toBeUndefined();
  });

  it("new offer copy is fence-clean", () => {
    for (const offer of TWO_DOOR_PACK_OFFERS) {
      const serialized = JSON.stringify(offer);
      expect(containsBannedRecordCopy(serialized)).toBe(false);
      expect(containsBannedWords(serialized)).toBe(false);
    }
    expect(containsBannedWords(FOUNDING_SEAT_COPY)).toBe(false);
  });
});