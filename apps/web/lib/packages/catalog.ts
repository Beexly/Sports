/**
 * Pick Package Catalog & Stripe Instant Checkout Builder
 *
 * Galaxy Picks (paid) storefront. One-time Stripe checkout, no subscription required.
 * Wired to live Stripe Products and one-time Prices on Galaxy Sports Network:
 * - tnf-all-in-pack ($19): prod_VX406TulqtZwJJ / price_1UVzsdQ2wPZMxx60lqO3TLbQ
 * - sgp-correlation-basket ($29): prod_VX40XMRjV4FiJl / price_1UVzseQ2wPZMxx60VqAfAyNe
 * - sunday-nfl-5pct-slate ($39): prod_VX400OaIktCGLb / price_1UVzsfQ2wPZMxx606fYPjKEJ
 * - week8-all-access ($49): prod_VX40T4RNpoNNIp / price_1UVzsfQ2wPZMxx60ozEJ1P3n
 *
 * DOCTRINE & GUARDRAILS:
 * - NEVER render confidence as a % (always XX/100).
 * - NEVER publish or package any pick where decision === 'PASS' or expectedClv < 0.
 */

export interface PickPackageOffering {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  windowSlot: 'TNF' | 'SUN_EARLY' | 'SUN_LATE' | 'SUN_MAIN' | 'SNF' | 'MNF' | 'WEEKEND_PASS' | 'WEEKLY_PASS';
  standardPriceCents: number;
  guaranteedPriceCents: number | null;
  stripeProductId: string;
  stripePriceId: string;
  stripeLookupKey: string;
  gamesCount: number;
  highlights: string[];
  badge?: string;
  includesProps: boolean;
  includesSgp: boolean;
  includesDfs: boolean;
  whopProductId?: string;
  telegramChannelId?: string;
  forSale?: boolean;
}

export const LIVE_PACKAGE_CATALOG: readonly PickPackageOffering[] = [
  {
    slug: "tnf-all-in-pack",
    title: "Carolina at Green Bay is final. Not for sale.",
    subtitle: "Green Bay 27, Carolina 19. ESPN event 401873023.",
    description:
      "This game is over. Kickoff was 2026-10-30T00:15Z. Final score Green Bay 27, Carolina 19. Do not buy a side, total, or prop on a finished game.",
    windowSlot: "TNF",
    standardPriceCents: 1900,
    guaranteedPriceCents: null,
    stripeProductId: "prod_VX406TulqtZwJJ",
    stripePriceId: "price_1UVzsdQ2wPZMxx60lqO3TLbQ",
    stripeLookupKey: "gse-pack-tnf-all-in",
    gamesCount: 1,
    highlights: [
      "Final: Green Bay 27, Carolina 19",
      "Not a live pick",
    ],
    badge: "FINAL · NOT FOR SALE",
    includesProps: false,
    includesSgp: false,
    includesDfs: false,
    forSale: false,
  },
  {
    slug: "sunday-nfl-5pct-slate",
    title: "Sunday NFL Best Bets Pack (Main Slate)",
    subtitle: "Every Sunday 1:00 PM & 4:25 PM ET Spread & Over/Under Pick",
    description:
      "Our complete Sunday NFL day card. Every Sunday afternoon game broken down in plain English to show you which spreads and totals have a real edge — and which trap games to skip.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 3900,
    guaranteedPriceCents: null,
    stripeProductId: "prod_VX400OaIktCGLb",
    stripePriceId: "price_1UVzsfQ2wPZMxx606fYPjKEJ",
    stripeLookupKey: "gse-pack-sunday-nfl-5pct-slate",
    gamesCount: 11,
    highlights: [
      "All Sunday Early (1:00 PM) & Late (4:25 PM) NFL Games",
      "Clear Bet or Pass Verdict on Every Single Game",
      "Plain-English Reasons Behind Every Official Call",
    ],
    badge: "SUNDAY DAY CARD",
    includesProps: true,
    includesSgp: false,
    includesDfs: false,
  },
  {
    slug: "sgp-correlation-basket",
    title: "Sunday Player Props & Same-Game Parlay Pack",
    subtitle: "Best Player Yardage Props & Smart Same-Game Parlays",
    description:
      "Want player props and parlays that actually fit the same game story? Unlock our top receiver and running back yardage props plus 3-leg Same-Game Parlays built around how each matchup plays out.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 2900,
    guaranteedPriceCents: null,
    stripeProductId: "prod_VX40XMRjV4FiJl",
    stripePriceId: "price_1UVzseQ2wPZMxx60VqAfAyNe",
    stripeLookupKey: "gse-pack-sgp-correlation-basket",
    gamesCount: 11,
    highlights: [
      "Best Receiver & Running Back Yardage Props Across Sunday",
      "3-Leg Same-Game Parlays Built Around How the Game Plays Out",
      "No Forced Longshots — Only Plays That Fit Together on the Field",
    ],
    badge: "PROPS & PARLAYS",
    includesProps: true,
    includesSgp: true,
    includesDfs: false,
  },
  {
    slug: "week8-all-access",
    title: "Full Weekly All-Access Pass (All 14 Games + DFS)",
    subtitle: "Every NFL Game on the Board + Full DFS Lineup Builder",
    description:
      "Unlock every single NFL game pack across the entire slate — Sunday Early, Sunday Afternoon, Sunday Night, and Monday Night Football — plus our complete Daily Fantasy (DFS) cash and tournament stacks in one click.",
    windowSlot: "WEEKLY_PASS",
    standardPriceCents: 4900,
    guaranteedPriceCents: null,
    stripeProductId: "prod_VX40T4RNpoNNIp",
    stripePriceId: "price_1UVzsfQ2wPZMxx60ozEJ1P3n",
    stripeLookupKey: "gse-pack-week8-all-access",
    gamesCount: 14,
    highlights: [
      "All 14 NFL Games Across the Full Weekly Slate (Sunday, SNF & MNF)",
      "Every Official Spread Call, Over/Under Call, Player Prop & Parlay",
      "Full Daily Fantasy (DFS) Core Plays & Tournament Stacks",
    ],
    badge: "WEEKEND BUNDLE · ALL 14 GAMES",
    includesProps: true,
    includesSgp: true,
    includesDfs: true,
  },
];

export function getPackageBySlug(slug: string): PickPackageOffering | undefined {
  return LIVE_PACKAGE_CATALOG.find((p) => p.slug === slug);
}

export interface StripeCheckoutPayload {
  mode: 'payment';
  line_items: Array<{
    price?: string;
    price_data: {
      currency: string;
      unit_amount: number;
      product_data: {
        name: string;
        description: string;
      };
    };
    quantity: number;
  }>;
  metadata: {
    packageSlug: string;
    stripeProductId: string;
    stripePriceId: string;
    guaranteedCreditBack: string;
    windowSlot: string;
  };
  success_url: string;
  cancel_url: string;
  customer_email?: string;
}

/**
 * Builds the Stripe Checkout Session payload for instant one-time payment.
 * References the live Stripe Product & Price IDs created on Galaxy Sports Network.
 */
export function buildStripePackageCheckoutPayload(
  pkg: PickPackageOffering,
  guaranteed: boolean,
  buyerEmail?: string,
  origin?: string,
  returnToStorefront?: boolean,
): StripeCheckoutPayload {
  if (pkg.forSale === false) {
    throw new Error(`Package '${pkg.slug}' is not for sale.`);
  }
  let unitAmount = pkg.standardPriceCents;
  let productName = pkg.title;

  if (guaranteed) {
    if (pkg.guaranteedPriceCents === null) {
      throw new Error(`Package '${pkg.slug}' does not offer a guaranteed credit-back tier.`);
    }
    unitAmount = pkg.guaranteedPriceCents;
    productName = `${pkg.title} (Guaranteed Credit-Back)`;
  }

  const baseOrigin = origin ? origin.replace(/\/+$/, "") : "https://www.galaxysportsedge.com";
  const successUrl = returnToStorefront
    ? `${baseOrigin}/packages?unlocked=1&package=${pkg.slug}&session_id={CHECKOUT_SESSION_ID}#${pkg.slug}`
    : `${baseOrigin}/packages/${pkg.slug}?unlocked=1&session_id={CHECKOUT_SESSION_ID}`;

  return {
    mode: "payment",
    line_items: [
      {
        price: pkg.stripePriceId,
        price_data: {
          currency: "usd",
          unit_amount: unitAmount,
          product_data: {
            name: productName,
            description: pkg.description,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      packageSlug: pkg.slug,
      stripeProductId: pkg.stripeProductId,
      stripePriceId: pkg.stripePriceId,
      guaranteedCreditBack: String(guaranteed),
      windowSlot: pkg.windowSlot,
    },
    success_url: successUrl,
    cancel_url: `${baseOrigin}/packages`,
    customer_email: buyerEmail && buyerEmail.trim().length > 0 ? buyerEmail.trim() : undefined,
  };
}
