/**
 * Two-door storefront offers and Week 11 Whop value ladder (2026-11-18).
 *
 * Door 1 -- Pro & Elite Memberships: $39/mo Pro (founding rate for the first
 *           100 members), $79/mo Elite (150-lineup DFS portfolio + full card),
 *           or $149 one-time rest-of-season pass, backed by the 30-day
 *           Positive-CLV Pledge.
 * Door 2 -- Single-Slate Packs: Week 11 TNF IND @ HOU ($9 impulse door with
 *           72-hour $9 Pro upgrade credit), Week 12 Thanksgiving 5-Game Slate
 *           ($14 SKU), and Week 11 Sunday Full-Slate ($29), each paired with
 *           honest pass discipline and the 30-day Positive-CLV Pledge.
 *
 * These offers are ADDITIVE exports. LIVE_PACKAGE_CATALOG keeps its exact
 * legacy shape (5 entries, creditBackPriceCents: null) for the homepage and
 * existing Stripe tests; `getPackageBySlug` in catalog.ts resolves both.
 *
 * Payment provider for these doors is Whop (checkout links are env-driven and
 * fail closed when absent). Copy fence: zero win rates, zero units strings,
 * zero banned hype terms, and pure 7-bit ASCII.
 */

import type { PickPackageOffering } from "./catalog";

// ---------------------------------------------------------------------------
// Door 2 -- Single-Slate Packs & 30-Day Positive-CLV Pledge
// ---------------------------------------------------------------------------

export type SingleSlateKey =
  | "primetime-showdown"
  | "thanksgiving-slate"
  | "sunday-full-slate";

/** Store-credit and upgrade terms carried on legacy single-slate fields. */
export interface CreditBackTerms {
  /** Net-unit threshold at which protection triggers (at or below). */
  readonly triggerNetUnits: 0;
  /** Full pack price portion credited. */
  readonly refundPercentOfPrice: 100;
  /** Legacy upgrade credit ceiling in cents. */
  readonly upgradeCreditCents: 3500;
}

export const CREDIT_BACK_TERMS: CreditBackTerms = {
  triggerNetUnits: 0,
  refundPercentOfPrice: 100,
  upgradeCreditCents: 3500,
};

/** 30-Day Positive-CLV Pledge replacing brittle single-game refunds. */
export interface PositiveClvPledgeTerms {
  readonly pledgeName: string;
  readonly windowDays: 30;
  readonly upgradeCreditWindowHours: 72;
  readonly tnfImpulseCreditCents: 900;
  readonly summary: string;
}

export const POSITIVE_CLV_PLEDGE: PositiveClvPledgeTerms = {
  pledgeName: "30-Day Positive-CLV Pledge",
  windowDays: 30,
  upgradeCreditWindowHours: 72,
  tnfImpulseCreditCents: 900,
  summary:
    "Backed by the 30-Day Positive-CLV Pledge: if official member releases fail to outpace closing market numbers over your 30-day evaluation window, your next billing cycle is credited automatically. TNF $9 buyers also receive a 72-hour full $9 credit toward $39/mo Pro.",
};

export interface SingleSlatePackOffer extends PickPackageOffering {
  readonly door: "single-slate";
  readonly slateKey: SingleSlateKey;
  /** Pledge-protected / bonus tier price in cents. */
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
  "Backed by the 30-Day Positive-CLV Pledge plus a 72-hour $9 upgrade credit toward Pro ($39/mo) or Elite ($79/mo) membership. Every passed market ships with free transparent reasoning.";

/**
 * Verified Week 11 NFL schedule (13 games: Thursday IND @ HOU through Monday
 * CIN @ WSH) plus Week 12 Thanksgiving 5-game slate reference.
 */
export const WEEK11_VERIFIED_SLATE = {
  season: 2026,
  week: 11,
  tnfMatchup: "IND @ HOU",
  totalGames: 13,
  games: [
    { matchup: "IND @ HOU", window: "TNF", kickoffEt: "Thu 8:15 PM" },
    { matchup: "Miami at Buffalo", window: "Sunday early", kickoffEt: "Sun 1:00 PM" },
    { matchup: "NO @ CHI", window: "Sunday early", kickoffEt: "Sun 1:00 PM" },
    { matchup: "TEN @ DAL", window: "Sunday early", kickoffEt: "Sun 1:00 PM" },
    { matchup: "TB @ DET", window: "Sunday early", kickoffEt: "Sun 1:00 PM" },
    { matchup: "ARI @ KC", window: "Sunday early", kickoffEt: "Sun 1:00 PM" },
    { matchup: "PIT @ PHI", window: "Sunday early", kickoffEt: "Sun 1:00 PM" },
    { matchup: "BAL @ CAR", window: "Sunday early", kickoffEt: "Sun 1:00 PM" },
    { matchup: "NYJ @ LAC", window: "Late window", kickoffEt: "Sun 4:05 PM" },
    { matchup: "LV @ DEN", window: "Late window", kickoffEt: "Sun 4:25 PM" },
    { matchup: "JAX @ NYG", window: "Late window", kickoffEt: "Sun 4:25 PM" },
    { matchup: "MIN @ SF", window: "SNF", kickoffEt: "Sun 8:20 PM" },
    { matchup: "CIN @ WSH", window: "MNF", kickoffEt: "Mon 8:15 PM" },
  ],
  thanksgivingWeek12Games: [
    { matchup: "GB @ LAR", window: "Thanksgiving Week 12", kickoffEt: "Thu Nov 26" },
    { matchup: "CHI @ DET", window: "Thanksgiving Week 12", kickoffEt: "Thu Nov 26" },
    { matchup: "PHI @ DAL", window: "Thanksgiving Week 12", kickoffEt: "Thu Nov 26" },
    { matchup: "KC @ BUF", window: "Thanksgiving Week 12", kickoffEt: "Thu Nov 26" },
    { matchup: "DEN @ PIT", window: "Thanksgiving Week 12", kickoffEt: "Thu Nov 26" },
  ],
} as const;

/** Backward-compatible slate list export for existing callers. */
export const WEEK10_VERIFIED_SLATE = WEEK11_VERIFIED_SLATE.games;

export const TWO_DOOR_PACK_OFFERS: readonly SingleSlatePackOffer[] = [
  {
    door: "single-slate",
    slateKey: "primetime-showdown",
    slug: "primetime-showdown-pack",
    windowSlot: "PRIMETIME",
    title: "Week 11 TNF IND @ HOU + Primetime Impulse Pack",
    subtitle: "TNF IND @ HOU ($9 Impulse Door) + SNF MIN @ SF + MNF CIN @ WSH",
    badge: "Week 11 TNF - $9 Door",
    description:
      "Full five-stage read on Week 11 Thursday Night Football IND @ HOU (Thu 8:15 ET) plus primetime coverage for SNF MIN @ SF and MNF CIN @ WSH. Includes player props, 1Q/kicking/IDP/TD boards, correlated showdown plays, and a 72-hour $9 credit toward $39/mo Pro under the 30-Day Positive-CLV Pledge.",
    highlights: [
      "Week 11 TNF IND @ HOU full card ($9 impulse entry + 72h Pro upgrade credit)",
      "SNF MIN @ SF and MNF CIN @ WSH primetime reads included",
      "360-degree props (1Q, kicking, IDP sacks, and Anytime TD reads)",
      "Backed by the 30-Day Positive-CLV Pledge and transparent pass notes",
    ],
    standardPriceCents: 900,
    creditBackPriceCents: 1900,
    creditBackTerms: CREDIT_BACK_TERMS,
    protectionCopy: PROTECTION_COPY,
    whopCheckoutEnv: {
      standard: "WHOP_CHECKOUT_PRIMETIME_STANDARD",
      creditBack: "WHOP_CHECKOUT_PRIMETIME_CREDIT_BACK",
    },
    gamesCount: 3,
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
    slateKey: "thanksgiving-slate",
    slug: "thanksgiving-5game-pack",
    windowSlot: "PRIMETIME",
    title: "Week 12 Thanksgiving 5-Game Slate Pack",
    subtitle: "GB @ LAR, CHI @ DET, PHI @ DAL, KC @ BUF & DEN @ PIT - $14 Early Access",
    badge: "Thanksgiving 5-Game - $14",
    description:
      "Reserve the 5-game Week 12 Thanksgiving holiday slate (GB @ LAR, CHI @ DET, PHI @ DAL, KC @ BUF, and DEN @ PIT). Unlocks game lines, holiday player props, anytime touchdown reads, correlated parlays, and DraftKings/FanDuel Thanksgiving DFS cores, backed by the 30-Day Positive-CLV Pledge.",
    highlights: [
      "All 5 Week 12 Thanksgiving matchups from noon kickoff to nightcap",
      "Full player props, kicking, IDP sacks, and goal-line TD reads",
      "Thanksgiving Classic & Showdown DraftKings/FanDuel DFS cores",
      "Backed by the 30-Day Positive-CLV Pledge and transparent pass notes",
    ],
    standardPriceCents: 1400,
    creditBackPriceCents: 2400,
    creditBackTerms: CREDIT_BACK_TERMS,
    protectionCopy: PROTECTION_COPY,
    whopCheckoutEnv: {
      standard: "WHOP_CHECKOUT_THANKSGIVING_STANDARD",
      creditBack: "WHOP_CHECKOUT_THANKSGIVING_CREDIT_BACK",
    },
    gamesCount: 5,
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
    title: "Week 11 Sunday Full-Slate Pack",
    subtitle: "All 11 Week 11 Sunday games - early kickoff through Sunday night",
    badge: "Week 11 Sunday - Full Slate",
    description:
      "Complete Week 11 Sunday coverage across all eleven games: Miami at Buffalo, NO @ CHI, TEN @ DAL, TB @ DET, ARI @ KC, PIT @ PHI, BAL @ CAR (1:00 ET), NYJ @ LAC, LV @ DEN, JAX @ NYG (4:05/4:25 ET), and MIN @ SF (SNF). Ships cleared sides, totals, player props, correlated SGPs, and DFS cores while publishing honest pass reasoning.",
    highlights: [
      "All 11 Week 11 Sunday games from 1:00 PM ET through SNF MIN @ SF",
      "Official sides, totals, 1Q/1H derivatives, and kicking reads",
      "360-degree player props, IDP sacks, Anytime TDs, and SGP correlations",
      "DraftKings & FanDuel Sunday Main Classic cash and GPP DFS cores",
    ],
    standardPriceCents: 2900,
    creditBackPriceCents: 3900,
    creditBackTerms: CREDIT_BACK_TERMS,
    protectionCopy: PROTECTION_COPY,
    whopCheckoutEnv: {
      standard: "WHOP_CHECKOUT_SUNDAY_STANDARD",
      creditBack: "WHOP_CHECKOUT_SUNDAY_CREDIT_BACK",
    },
    gamesCount: 11,
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
// Door 1 -- Pro ($39/mo), Elite ($79/mo) & Seasonal ($149) Memberships
// ---------------------------------------------------------------------------

export const FOUNDING_SEAT_LIMIT = 100;

/** Checkout slug for Door 1 (handled by the Whop membership route). */
export const SEASON_MEMBERSHIP_SLUG = "season-membership";

export const MEMBERSHIP_PRICING = {
  /** $39.00/mo -- Pro tier founding monthly rate (first 100 members). */
  foundingMonthlyCents: 3900,
  /** $79.00/mo -- Elite tier monthly rate (150-lineup MME + full board). */
  standardMonthlyCents: 7900,
  /** $149 one-time -- rest of season + playoffs pass. */
  restOfSeasonCents: 14900,
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
    label: "Pro founding tier - $39/mo (30-Day Positive-CLV Pledge)",
    priceCents: MEMBERSHIP_PRICING.foundingMonthlyCents,
    cadence: "monthly",
    whopCheckoutEnv: "WHOP_CHECKOUT_MEMBERSHIP_FOUNDING",
  },
  {
    id: "standard-monthly",
    label: "Elite full card + 150-lineup MME DFS - $79/mo",
    priceCents: MEMBERSHIP_PRICING.standardMonthlyCents,
    cadence: "monthly",
    whopCheckoutEnv: "WHOP_CHECKOUT_MEMBERSHIP_STANDARD",
  },
  {
    id: "rest-of-season",
    label: "Rest of season + playoffs pass - $149 one-time",
    priceCents: MEMBERSHIP_PRICING.restOfSeasonCents,
    cadence: "one-time",
    whopCheckoutEnv: "WHOP_CHECKOUT_MEMBERSHIP_REST_OF_SEASON",
  },
];

/**
 * Tiered monthly selector: first 100 founding seats qualify for Pro $39/mo;
 * Elite full-suite membership carries $79/mo with full MME DFS portfolio.
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

/** Static founding-seat disclosure (no invented live seat counters). */
export const FOUNDING_SEAT_COPY = `Founding pricing - first ${FOUNDING_SEAT_LIMIT} members`;

// ---------------------------------------------------------------------------
// Whop checkout-link resolution (env-driven, fail-closed)
// ---------------------------------------------------------------------------

/** Generic fallback link when a per-offer key is not set. */
export const WHOP_GENERIC_CHECKOUT_ENV = "WHOP_CHECKOUT_LINK";

/**
 * Resolve a Whop checkout URL from the environment. Only https URLs are
 * accepted; anything else resolves to null so checkout fails closed.
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
