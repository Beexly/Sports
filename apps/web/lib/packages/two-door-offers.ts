/**
 * Two-door storefront offers (owner directive 2026-11-13).
 *
 * Door 1 — Season Membership: founding monthly rate for the first 100 members,
 *          standard monthly rate after, or a one-time rest-of-season price.
 * Door 2 — Single-Slate Packs: Prime-Time Showdown and Sunday Full-Slate, each
 *          with a standard tier and a credit-back (store-credit-protected) tier.
 *
 * These offers are ADDITIVE exports. LIVE_PACKAGE_CATALOG keeps its exact
 * legacy shape (5 entries, creditBackPriceCents: null) for the homepage and
 * existing tests; `getPackageBySlug` in catalog.ts resolves both worlds.
 *
 * Payment provider for the new offers is Whop (founder directive). Checkout
 * links are env-driven; when absent, checkout is disabled with an honest note.
 * No fake success is ever returned. New offers carry empty Stripe ids and must
 * never be sent down the Stripe path.
 *
 * Copy fence: no win rates, no records, no banned hype words in customer copy.
 * The verified record is linked at /record, never quoted.
 */

import type { PickPackageOffering } from "./catalog";

// ---------------------------------------------------------------------------
// Door 2 — Single-Slate Packs
// ---------------------------------------------------------------------------

export type SingleSlateKey = "primetime-showdown" | "sunday-full-slate";

/** Plain-language store-credit protection terms for the credit-back tier. */
export interface CreditBackTerms {
  /** Net-unit threshold at which protection triggers (at or below). */
  readonly triggerNetUnits: 0;
  /** The full pack price back as store credit. */
  readonly refundPercentOfPrice: 100;
  /** Flat alternative: $35 upgrade credit toward Door 1 (3500 cents). */
  readonly upgradeCreditCents: 3500;
}

export const CREDIT_BACK_TERMS: CreditBackTerms = {
  triggerNetUnits: 0,
  refundPercentOfPrice: 100,
  upgradeCreditCents: 3500,
};

export interface SingleSlatePackOffer extends PickPackageOffering {
  readonly door: "single-slate";
  readonly slateKey: SingleSlateKey;
  /** Credit-back tier price — never null on the new offers. */
  readonly creditBackPriceCents: number;
  readonly creditBackTerms: CreditBackTerms;
  /** Env var names holding the Whop checkout links for each tier. */
  readonly whopCheckoutEnv: {
    readonly standard: string;
    readonly creditBack: string;
  };
  /** Plain-language explanation shown on the card. */
  readonly protectionCopy: string;
}

const PROTECTION_COPY =
  "Buy the credit-back tier and if this pack's official plays finish at or below 0.00 units net, you get the full pack price back as store credit; or choose a flat $35 upgrade credit toward a Season Membership instead. The choice is yours, recorded once, and never expires.";

/**
 * Verified remaining Week 10 slate (ESPN live scoreboard + Neon public.games,
 * cross-checked 2026-11-13). 13 games; NO Berlin game this week. Kickoff times
 * are ET. This is the canonical slate the packs below must cover: the Sunday
 * pack covers all 10 Sunday games (Munich through the late window), the
 * Prime-Time pack covers SNF PIT @ CIN and MNF LAC @ BAL.
 */
export const WEEK10_VERIFIED_SLATE = [
  { matchup: "NE @ DET", window: "Munich", kickoffEt: "Sun 9:30 AM" },
  { matchup: "KC @ ATL", window: "Sunday early", kickoffEt: "Sun 1:00 PM" },
  { matchup: "HOU @ CLE", window: "Sunday early", kickoffEt: "Sun 1:00 PM" },
  { matchup: "MIN @ GB", window: "Sunday early", kickoffEt: "Sun 1:00 PM" },
  { matchup: "MIA @ IND", window: "Sunday early", kickoffEt: "Sun 1:00 PM" },
  { matchup: "CAR @ NO", window: "Sunday early", kickoffEt: "Sun 1:00 PM" },
  { matchup: "JAX @ TEN", window: "Sunday early", kickoffEt: "Sun 1:00 PM" },
  { matchup: "BUF @ NYJ", window: "Sunday early", kickoffEt: "Sun 1:00 PM" },
  { matchup: "SEA @ LV", window: "Late window", kickoffEt: "Sun 4:05 PM" },
  { matchup: "LAR @ ARI", window: "Late window", kickoffEt: "Sun 4:05 PM" },
  { matchup: "SF @ DAL", window: "Late window", kickoffEt: "Sun 4:25 PM" },
  { matchup: "PIT @ CIN", window: "SNF", kickoffEt: "Sun 8:20 PM" },
  { matchup: "LAC @ BAL", window: "MNF", kickoffEt: "Mon 8:15 PM" },
] as const;

export const TWO_DOOR_PACK_OFFERS: readonly SingleSlatePackOffer[] = [
  {
    door: "single-slate",
    slateKey: "primetime-showdown",
    slug: "primetime-showdown-pack",
    windowSlot: "PRIMETIME",
    title: "Prime-Time Showdown",
    subtitle: "SNF PIT @ CIN + MNF LAC @ BAL · the standalone windows",
    badge: "Primetime · SNF + MNF",
    description:
      "Our full five-stage read on the week's standalone primetime windows: Sunday Night Football PIT @ CIN (Sun 8:20 ET) and Monday Night Football LAC @ BAL (Mon 8:15 ET). The side and total we would actually bet, player props, a correlated same-game parlay, and a DraftKings showdown lineup core for each. If nothing clears the five-stage check, we publish the pass reasoning for free and sell nothing.",
    highlights: [
      "SNF PIT @ CIN (Sun 8:20 ET) official side & total call",
      "MNF LAC @ BAL (Mon 8:15 ET) official side & total call",
      "Player prop reads with plain-English reasoning",
      "Correlated same-game parlay tickets",
      "DraftKings showdown lineup cores",
      "Free transparent reasoning when we pass",
    ],
    standardPriceCents: 1900,
    creditBackPriceCents: 2900,
    creditBackTerms: CREDIT_BACK_TERMS,
    protectionCopy: PROTECTION_COPY,
    whopCheckoutEnv: {
      standard: "WHOP_CHECKOUT_PRIMETIME_STANDARD",
      creditBack: "WHOP_CHECKOUT_PRIMETIME_CREDIT_BACK",
    },
    gamesCount: 2,
    includesProps: true,
    includesSgp: true,
    includesDfs: true,
    forSale: true,
    stripeProductId: "",
    stripePriceId: "",
    stripeLookupKey: "",
  },
  {
    door: "single-slate",
    slateKey: "sunday-full-slate",
    slug: "sunday-full-slate-pack",
    windowSlot: "SUNDAY_FULL",
    title: "Sunday Full-Slate",
    subtitle: "All 10 Sunday games · Munich to the late window",
    badge: "Sunday · Full Slate",
    description:
      "The complete Sunday board, all ten games: NE @ DET (Munich, 9:30 ET), KC @ ATL, HOU @ CLE, MIN @ GB, MIA @ IND, CAR @ NO, JAX @ TEN, BUF @ NYJ (1:00 ET), plus the late window SEA @ LV, LAR @ ARI (4:05 ET) and SF @ DAL (4:25 ET). Every game that clears our five-stage check ships official sides and totals, player props, correlated parlays, and DraftKings/FanDuel lineup builds. Games that do not clear are published as free passes with the reasoning attached; you see exactly why we sat them out.",
    highlights: [
      "All 10 Sunday games, Munich through the late window",
      "LAR @ ARI and SF @ DAL late-window reads included",
      "Official sides & totals with plain-English reasoning",
      "Player prop reads across the slate",
      "Correlated parlay tickets",
      "DraftKings & FanDuel lineup cores",
      "Free pass reasoning for every game we sit out",
    ],
    standardPriceCents: 2900,
    creditBackPriceCents: 3900,
    creditBackTerms: CREDIT_BACK_TERMS,
    protectionCopy: PROTECTION_COPY,
    whopCheckoutEnv: {
      standard: "WHOP_CHECKOUT_SUNDAY_STANDARD",
      creditBack: "WHOP_CHECKOUT_SUNDAY_CREDIT_BACK",
    },
    gamesCount: 10,
    includesProps: true,
    includesSgp: true,
    includesDfs: true,
    forSale: true,
    stripeProductId: "",
    stripePriceId: "",
    stripeLookupKey: "",
  },
];

export function getSingleSlateOffer(slug: string): SingleSlatePackOffer | undefined {
  return TWO_DOOR_PACK_OFFERS.find((o) => o.slug === slug);
}

export function isSingleSlateOfferSlug(slug: string): boolean {
  return TWO_DOOR_PACK_OFFERS.some((o) => o.slug === slug);
}

// ---------------------------------------------------------------------------
// Door 1 — Season Membership
// ---------------------------------------------------------------------------

export const FOUNDING_SEAT_LIMIT = 100;

/** Checkout slug for Door 1 (not a catalog pack; handled by the checkout route). */
export const SEASON_MEMBERSHIP_SLUG = "season-membership";

export const MEMBERSHIP_PRICING = {
  /** $59.99/mo — founding rate for the first 100 members. */
  foundingMonthlyCents: 5999,
  /** $79.99/mo — standard rate after founding seats are gone. */
  standardMonthlyCents: 7999,
  /** $249 one-time — rest of season + playoffs. */
  restOfSeasonCents: 24900,
} as const;

export type MembershipPlanId = "founding-monthly" | "standard-monthly" | "rest-of-season";

export interface MembershipPlan {
  readonly id: MembershipPlanId;
  readonly label: string;
  readonly priceCents: number;
  readonly cadence: "monthly" | "one-time";
  readonly whopCheckoutEnv: string;
}

export const MEMBERSHIP_PLANS: readonly MembershipPlan[] = [
  {
    id: "founding-monthly",
    label: "Founding member · monthly",
    priceCents: MEMBERSHIP_PRICING.foundingMonthlyCents,
    cadence: "monthly",
    whopCheckoutEnv: "WHOP_CHECKOUT_MEMBERSHIP_FOUNDING",
  },
  {
    id: "standard-monthly",
    label: "Season membership · monthly",
    priceCents: MEMBERSHIP_PRICING.standardMonthlyCents,
    cadence: "monthly",
    whopCheckoutEnv: "WHOP_CHECKOUT_MEMBERSHIP_STANDARD",
  },
  {
    id: "rest-of-season",
    label: "Rest of season + playoffs · one-time",
    priceCents: MEMBERSHIP_PRICING.restOfSeasonCents,
    cadence: "one-time",
    whopCheckoutEnv: "WHOP_CHECKOUT_MEMBERSHIP_REST_OF_SEASON",
  },
];

/**
 * Founding price selection. `memberIndex` is the buyer's zero-based position
 * among members: indices 0..99 (the first 100 members) get the founding rate;
 * everyone after gets the standard rate. Pure and injectable — the caller
 * supplies the index from a real membership source when one exists.
 */
export function selectMembershipMonthlyPrice(memberIndex: number): {
  priceCents: number;
  rate: "founding" | "standard";
} {
  if (!Number.isInteger(memberIndex) || memberIndex < 0) {
    throw new Error(`memberIndex must be a non-negative integer, got ${memberIndex}`);
  }
  return memberIndex < FOUNDING_SEAT_LIMIT
    ? { priceCents: MEMBERSHIP_PRICING.foundingMonthlyCents, rate: "founding" }
    : { priceCents: MEMBERSHIP_PRICING.standardMonthlyCents, rate: "standard" };
}

/**
 * Honest founding-seat copy. There is no durable founding-seat counter in the
 * current schema (subscriptions tracks Stripe tiers, not founding seats), so
 * the storefront states the policy statically instead of inventing a live
 * "N seats left" number. When a real counter exists, swap this for it.
 */
export const FOUNDING_SEAT_COPY = `Founding pricing · first ${FOUNDING_SEAT_LIMIT} members`;

// ---------------------------------------------------------------------------
// Whop checkout-link resolution (env-driven, fail-closed)
// ---------------------------------------------------------------------------

/** Generic fallback link when a per-offer key is not set. */
export const WHOP_GENERIC_CHECKOUT_ENV = "WHOP_CHECKOUT_LINK";

/**
 * Resolve a Whop checkout URL from the environment. Only https URLs are
 * accepted; anything else (plan ids, placeholders, empty) resolves to null so
 * checkout stays disabled with an honest note. Never returns a fake URL.
 */
export function resolveWhopCheckoutUrl(
  envKey: string,
  env: Record<string, string | undefined> = process.env,
): string | null {
  const raw = (env[envKey] ?? "").trim();
  if (raw && /^https:\/\//i.test(raw)) return raw;
  const generic = (env[WHOP_GENERIC_CHECKOUT_ENV] ?? "").trim();
  if (generic && /^https:\/\//i.test(generic)) return generic;
  return null;
}

export interface OfferCheckoutAvailability {
  readonly offerSlug: string;
  readonly standardConfigured: boolean;
  readonly creditBackConfigured: boolean;
}

/** Per-offer Whop availability for the storefront (booleans only, no URLs). */
export function singleSlateCheckoutAvailability(
  env: Record<string, string | undefined> = process.env,
): readonly OfferCheckoutAvailability[] {
  return TWO_DOOR_PACK_OFFERS.map((offer) => ({
    offerSlug: offer.slug,
    standardConfigured: resolveWhopCheckoutUrl(offer.whopCheckoutEnv.standard, env) !== null,
    creditBackConfigured: resolveWhopCheckoutUrl(offer.whopCheckoutEnv.creditBack, env) !== null,
  }));
}

export function membershipCheckoutAvailability(
  env: Record<string, string | undefined> = process.env,
): Readonly<Record<MembershipPlanId, boolean>> {
  const availability = {} as Record<MembershipPlanId, boolean>;
  for (const plan of MEMBERSHIP_PLANS) {
    availability[plan.id] = resolveWhopCheckoutUrl(plan.whopCheckoutEnv, env) !== null;
  }
  return availability;
}