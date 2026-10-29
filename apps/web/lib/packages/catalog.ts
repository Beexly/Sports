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
    title: "Tonight's Thursday Night Football Pack (Panthers @ Packers)",
    subtitle: "Best Spread Bet, Total Bet, Player Props & Showdown Lineups",
    description:
      "Everything you need to bet tonight's Carolina at Green Bay game. See our exact Spread pick, Over/Under pick, top Player Props, and plain-English breakdown of why this matchup favors our side.",
    windowSlot: "TNF",
    standardPriceCents: 1900,
    guaranteedPriceCents: null,
    gamesCount: 1,
    highlights: [
      "Exact Packers vs. Panthers Spread & Over/Under Bet",
      "Top Player Receiving & Rushing Prop Bets (Over & Under)",
      "Plain-English Breakdown of Why This Line Is Off",
      "DraftKings / FanDuel Showdown Captain & Core Picks",
    ],
    badge: "TONIGHT · TNF",
    includesProps: true,
    includesSgp: true,
    includesDfs: true,
  },
  {
    slug: "sunday-nfl-5pct-slate",
    title: "Sunday NFL Best Bets Pack (11 Games)",
    subtitle: "Every Sunday 1:00 PM & 4:25 PM ET Spread & Over/Under Pick",
    description:
      "Our complete Sunday NFL betting card. Every Sunday game broken down play-by-play to show you which Spreads and Totals have a real edge — and which trap games to skip.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 2900,
    guaranteedPriceCents: null,
    gamesCount: 9,
    highlights: [
      "All Sunday Early (1:00 PM) & Late (4:25 PM) NFL Games",
      "Clear Bet or Pass Verdict on Every Single Game",
      "Plain-English Reasons Why You Want to Bet Each Side",
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
      "Want player props and parlays that actually make sense together? Get our highest-confidence Receiver and Running Back yardage props plus correlated 3-leg Same-Game Parlays.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 1900,
    guaranteedPriceCents: null,
    gamesCount: 9,
    highlights: [
      "Best Receiver & Running Back Yardage Props Across Sunday",
      "3-Leg Same-Game Parlays Built Around How the Game Plays Out",
      "No Forced Longshots — Only Plays That Fit the Same Game Script",
    ],
    badge: "PROPS & PARLAYS",
    includesProps: true,
    includesSgp: true,
    includesDfs: false,
  },
  {
    slug: "week8-all-access",
    title: "Full Week 8 All-Access Pass (All 14 Games + DFS)",
    subtitle: "Thursday through Monday Night Football + Full DFS Lineup Builder",
    description:
      "Unlock every single NFL game pack from Thursday Night through Monday Night Football, plus our complete Daily Fantasy (DFS) cash and tournament stacks in one click.",
    windowSlot: "WEEKLY_PASS",
    standardPriceCents: 3900,
    guaranteedPriceCents: null,
    gamesCount: 14,
    highlights: [
      "All 14 Week 8 NFL Games (TNF, Sunday, SNF & MNF)",
      "Every Spread Bet, Over/Under Bet, Player Prop & Parlay",
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
