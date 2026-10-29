/**
 * Pick Package Catalog & Stripe Instant Checkout Builder
 *
 * Galaxy Picks (paid) storefront. One-time Stripe checkout, no subscription required.
 * Four Week 8 offerings. Guaranteed credit-back is not offered on these packs.
 * - Specific window cards (TNF, Sunday Main, Weekend Pass, Weekly Pass)
 * - Standard vs. Guaranteed Credit-Back pricing
 * - Stripe one-time payment payload generation (mode: "payment") using inline price_data
 * - Zero pre-created Stripe Price IDs required
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
  gamesCount: number;
  highlights: string[];
  badge?: string;
  includesProps: boolean;
  includesSgp: boolean;
  includesDfs: boolean;
  whopProductId?: string;
  telegramChannelId?: string;
}

export const LIVE_PACKAGE_CATALOG: readonly PickPackageOffering[] = [
  {
    slug: "tnf-all-in-pack",
    title: "Sunday Spotlight Game Pack (Panthers @ Packers)",
    subtitle: "Official Spread Pick, Over/Under Pick, Player Props & Showdown Lineup",
    description:
      "Everything you need for Sunday's Week 9 Carolina at Green Bay matchup at Lambeau Field. Unlock our official spread call, over/under call, player prop card, 3-leg same-game parlay, and Showdown lineup.",
    windowSlot: "TNF",
    standardPriceCents: 1900,
    guaranteedPriceCents: null,
    gamesCount: 1,
    highlights: [
      "Official Packers vs. Panthers Spread & Over/Under Calls",
      "Top Player Receiving & Rushing Yardage Prop Bets",
      "Plain-English Trench & Matchup Breakdown",
      "DraftKings / FanDuel Showdown Captain & Core Picks",
    ],
    badge: "SUNDAY · WEEK 9",
    includesProps: true,
    includesSgp: true,
    includesDfs: true,
  },
  {
    slug: "sunday-nfl-5pct-slate",
    title: "Sunday NFL Best Bets Pack (Main Slate)",
    subtitle: "Every Sunday 1:00 PM & 4:25 PM ET Spread & Over/Under Pick",
    description:
      "Our complete Sunday NFL betting card. Every Sunday afternoon game broken down in plain English to show you which spreads and totals have a real edge — and which trap games to skip.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 2900,
    guaranteedPriceCents: null,
    gamesCount: 11,
    highlights: [
      "All Sunday Early (1:00 PM) & Late (4:25 PM) NFL Games",
      "Clear Bet or Pass Verdict on Every Single Game",
      "Plain-English Reasons Behind Every Official Call",
    ],
    badge: "SUNDAY MAIN SLATE",
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
    standardPriceCents: 1900,
    guaranteedPriceCents: null,
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
    standardPriceCents: 3900,
    guaranteedPriceCents: null,
    gamesCount: 14,
    highlights: [
      "All 14 NFL Games Across the Full Weekly Slate (Sunday, SNF & MNF)",
      "Every Official Spread Call, Over/Under Call, Player Prop & Parlay",
      "Full Daily Fantasy (DFS) Core Plays & Tournament Stacks",
    ],
    badge: "BEST VALUE · ALL 14 GAMES",
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
    guaranteedCreditBack: string;
    windowSlot: string;
  };
  success_url: string;
  cancel_url: string;
  customer_email?: string;
}

/**
 * Builds the Stripe Checkout Session payload for instant one-time payment.
 * Uses inline price_data so no pre-created Stripe Price IDs are required.
 */
export function buildStripePackageCheckoutPayload(
  pkg: PickPackageOffering,
  guaranteed: boolean,
  buyerEmail?: string,
  origin?: string,
): StripeCheckoutPayload {
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

  return {
    mode: "payment",
    line_items: [
      {
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
      guaranteedCreditBack: String(guaranteed),
      windowSlot: pkg.windowSlot,
    },
    success_url: `${baseOrigin}/packages/${pkg.slug}?unlocked=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseOrigin}/packages`,
    customer_email: buyerEmail && buyerEmail.trim().length > 0 ? buyerEmail.trim() : undefined,
  };
}
