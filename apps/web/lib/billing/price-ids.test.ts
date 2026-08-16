import { describe, expect, it } from "vitest";
import {
  splitPriceIds,
  currentPriceId,
  tierForPriceId,
  checkoutPriceId,
  stripeLookupKeyFor,
  STRIPE_LOOKUP_KEYS,
  tierForLookupKey,
  tierFromPriceRef,
  advertisedPhaseUnitAmountCents,
  stripePriceAmountMatchesAd,
} from "./price-ids";

describe("splitPriceIds", () => {
  it("splits comma lists, trims, drops empties; handles undefined", () => {
    expect(splitPriceIds("price_a, price_b ,, price_c")).toEqual(["price_a", "price_b", "price_c"]);
    expect(splitPriceIds("price_solo")).toEqual(["price_solo"]);
    expect(splitPriceIds(undefined)).toEqual([]);
    expect(splitPriceIds("")).toEqual([]);
  });
});

describe("currentPriceId", () => {
  it("returns the FIRST id of the first non-empty var (current price for checkout)", () => {
    expect(currentPriceId("price_new,price_old")).toBe("price_new");
    expect(currentPriceId(undefined, "price_legacy")).toBe("price_legacy");
    expect(currentPriceId("", "  ", "price_z")).toBe("price_z");
    expect(currentPriceId(undefined, undefined)).toBe("");
  });
});

describe("tierForPriceId — grandfathering safety", () => {
  const env = {
    STRIPE_PRO_MONTHLY_PRICE_ID: "price_pro_proven,price_pro_founding", // current, historical
    STRIPE_PRO_ANNUAL_PRICE_ID: "price_pro_annual",
    STRIPE_ELITE_MONTHLY_PRICE_ID: "price_elite_new",
    STRIPE_ELITE_PRICE_ID: "price_elite_legacy",
    STRIPE_FANTASY_MONTHLY_PRICE_ID: "price_fantasy",
  };

  it("recognizes the CURRENT price id", () => {
    expect(tierForPriceId("price_pro_proven", env)).toBe("PRO");
    expect(tierForPriceId("price_elite_new", env)).toBe("ELITE");
  });

  it("recognizes HISTORICAL (grandfathered) price ids so a member is never downgraded on a phase advance", () => {
    expect(tierForPriceId("price_pro_founding", env)).toBe("PRO"); // the whole point of H1
    expect(tierForPriceId("price_elite_legacy", env)).toBe("ELITE");
  });

  it("maps annual + fantasy correctly", () => {
    expect(tierForPriceId("price_pro_annual", env)).toBe("PRO");
    expect(tierForPriceId("price_fantasy", env)).toBe("FANTASY");
  });

  it("returns FREE for empty or genuinely unknown ids", () => {
    expect(tierForPriceId(undefined, env)).toBe("FREE");
    expect(tierForPriceId("price_never_configured", env)).toBe("FREE");
  });

  it("ELITE wins if an id is mis-listed under two tiers (highest entitlement, fail-safe)", () => {
    expect(tierForPriceId("dupe", { STRIPE_ELITE_PRICE_ID: "dupe", STRIPE_PRO_PRICE_ID: "dupe" })).toBe("ELITE");
  });
});

describe("checkoutPriceId — charges the CURRENT price only", () => {
  const env = {
    STRIPE_PRO_MONTHLY_PRICE_ID: "price_pro_current,price_pro_old",
    STRIPE_ELITE_PRICE_ID: "price_elite_legacy_monthly",
    STRIPE_ELITE_ANNUAL_PRICE_ID: "price_elite_annual",
  };
  it("returns the first (current) id and falls back to the legacy monthly var", () => {
    expect(checkoutPriceId("PRO", "month", env)).toBe("price_pro_current");
    expect(checkoutPriceId("ELITE", "month", env)).toBe("price_elite_legacy_monthly");
    expect(checkoutPriceId("ELITE", "year", env)).toBe("price_elite_annual");
    expect(checkoutPriceId("PRO", "year", env)).toBe(""); // not configured
  });
});

describe("stripeLookupKeyFor", () => {
  it("returns stable gse-* keys for every paid tier × interval", () => {
    expect(stripeLookupKeyFor("FANTASY", "month")).toBe("gse-fantasy-monthly");
    expect(stripeLookupKeyFor("FANTASY", "year")).toBe("gse-fantasy-annual");
    expect(stripeLookupKeyFor("PRO", "month")).toBe("gse-pro-monthly");
    expect(stripeLookupKeyFor("PRO", "year")).toBe("gse-pro-annual");
    expect(stripeLookupKeyFor("ELITE", "month")).toBe("gse-elite-monthly");
    expect(stripeLookupKeyFor("ELITE", "year")).toBe("gse-elite-annual");
  });

  it("matches STRIPE_LOOKUP_KEYS table", () => {
    for (const tier of ["FANTASY", "PRO", "ELITE"] as const) {
      for (const interval of ["month", "year"] as const) {
        expect(stripeLookupKeyFor(tier, interval)).toBe(STRIPE_LOOKUP_KEYS[tier][interval]);
      }
    }
  });
});

describe("tierForLookupKey / tierFromPriceRef", () => {
  it("maps every gse-* lookup key to the right paid tier", () => {
    expect(tierForLookupKey("gse-fantasy-monthly")).toBe("FANTASY");
    expect(tierForLookupKey("gse-pro-annual")).toBe("PRO");
    expect(tierForLookupKey("gse-elite-monthly")).toBe("ELITE");
    expect(tierForLookupKey("unknown")).toBe("FREE");
    expect(tierForLookupKey(undefined)).toBe("FREE");
  });

  it("prefers env historical price ids, then falls back to lookup_key", () => {
    const env = { STRIPE_PRO_MONTHLY_PRICE_ID: "price_env_pro" };
    expect(tierFromPriceRef("price_env_pro", "gse-fantasy-monthly", env)).toBe("PRO");
    // empty env, only lookup_key
    expect(tierFromPriceRef("price_only_from_lookup", "gse-fantasy-monthly", {})).toBe("FANTASY");
    // neither
    expect(tierFromPriceRef("price_mystery", null, {})).toBe("FREE");
  });
});

/**
 * GSE-SEC-024: advertised phase price vs Stripe unit_amount disclosure risk.
 *
 * These tests verify that the helper which computes the advertised phase price
 * in Stripe cents (and validates a Stripe price's unit_amount against it) is
 * correct for every tier × interval combination under the default (FOUNDING)
 * phase — which is what `getCurrentPricingPhase()` returns when PRICING_PHASE
 * is unset (the default env in unit tests).
 */
describe("GSE-SEC-024 — advertisedPhaseUnitAmountCents", () => {
  it("returns cents (not dollars) for every paid tier × interval", () => {
    // FOUNDING phase (default): pro monthly $14.99 → 1499, annual $99 → 9900
    expect(advertisedPhaseUnitAmountCents("PRO", "month")).toBe(1499);
    expect(advertisedPhaseUnitAmountCents("PRO", "year")).toBe(9900);
    // elite monthly $24.99 → 2499, annual $179 → 17900
    expect(advertisedPhaseUnitAmountCents("ELITE", "month")).toBe(2499);
    expect(advertisedPhaseUnitAmountCents("ELITE", "year")).toBe(17900);
    // fantasy monthly $4.99 → 499, annual $49 → 4900
    expect(advertisedPhaseUnitAmountCents("FANTASY", "month")).toBe(499);
    expect(advertisedPhaseUnitAmountCents("FANTASY", "year")).toBe(4900);
  });

  it("rounds to the nearest cent to avoid float drift", () => {
    // 14.99 * 100 = 1499 (not 1498.9999...)
    expect(advertisedPhaseUnitAmountCents("PRO", "month")).toBe(
      Math.round(14.99 * 100),
    );
    expect(advertisedPhaseUnitAmountCents("ELITE", "month")).toBe(
      Math.round(24.99 * 100),
    );
  });
});

describe("GSE-SEC-024 — stripePriceAmountMatchesAd", () => {
  it("returns true when unit_amount matches the advertised phase price", () => {
    expect(
      stripePriceAmountMatchesAd({ unit_amount: 1499 }, "PRO", "month"),
    ).toBe(true);
    expect(
      stripePriceAmountMatchesAd({ unit_amount: 9900 }, "PRO", "year"),
    ).toBe(true);
    expect(
      stripePriceAmountMatchesAd({ unit_amount: 2499 }, "ELITE", "month"),
    ).toBe(true);
    expect(
      stripePriceAmountMatchesAd({ unit_amount: 4900 }, "FANTASY", "year"),
    ).toBe(true);
  });

  it("returns FALSE when unit_amount does NOT match (prevents overcharge)", () => {
    // Stripe price says $19.99 (1999) but phase advertises $14.99 (1499)
    expect(
      stripePriceAmountMatchesAd({ unit_amount: 1999 }, "PRO", "month"),
    ).toBe(false);
    // Stripe price says $9.99 (999) but phase advertises $14.99 (1499)
    expect(
      stripePriceAmountMatchesAd({ unit_amount: 999 }, "PRO", "month"),
    ).toBe(false);
    // Annual mismatch: Stripe says 9900 but tier is ELITE
    expect(
      stripePriceAmountMatchesAd({ unit_amount: 9900 }, "ELITE", "year"),
    ).toBe(false);
  });

  it("returns FALSE when unit_amount is null (fail-closed)", () => {
    expect(
      stripePriceAmountMatchesAd({ unit_amount: null }, "PRO", "month"),
    ).toBe(false);
    expect(
      stripePriceAmountMatchesAd({ unit_amount: null }, "ELITE", "year"),
    ).toBe(false);
  });
});
