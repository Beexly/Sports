/**
 * Pick Package Catalog & Stripe Instant Checkout Builder
 *
 * Implements a WagerTalk-style a-la-carte storefront for daily/weekly sports pick packages:
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
    slug: "tnf-all-in-prime-pack",
    title: "TNF All-In Prime Pack",
    subtitle: "Thursday Night Football Deep Dive, Props & SGP",
    description: "Complete single-game breakdown featuring Flores vs McVay tactical schemes, Justin Jefferson N_eff volume props, correlated SGP, and Showdown DFS Captain stacks.",
    windowSlot: "TNF",
    standardPriceCents: 2500, // $25.00
    guaranteedPriceCents: 3800, // $38.00 credit-back guarantee
    gamesCount: 1,
    highlights: [
      "Top Side & Total Calls with calibrated XX/100 confidence",
      "Player Prop Targets with N_eff volume notes",
      "Correlated +375 Same Game Parlay ticket",
      "DFS Single-Game Captain & Cash core recommendations",
      "Instant Telegram VIP delivery & sealed tamper-evident hash",
    ],
    badge: "PRIME TIME",
    includesProps: true,
    includesSgp: true,
    includesDfs: true,
    whopProductId: "prod_whop_tnf_prime",
    telegramChannelId: "-1002938475910",
  },
  {
    slug: "sunday-nfl-5pct-slate-card",
    title: "Sunday NFL 5% Slate Card",
    subtitle: "Highest-Conviction Spreads, Totals & Outlier Props",
    description: "Our premier Sunday slate package containing only high-conviction plays with measured positive CLV. Covers both early 1:00 PM and late 4:25 PM ET windows.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 3500, // $35.00
    guaranteedPriceCents: 5300, // $53.00 credit-back guarantee
    gamesCount: 10,
    highlights: [
      "All cleared Sunday sides & totals with strictly positive CLV",
      "Bengals/Eagles & Ravens/Browns scheme matchup breakdowns",
      "Top 5 Player Props with statistical N_eff usage edges",
      "Sunday cross-game correlated parlay builders",
      "Telegram instant push notifications for line movements",
    ],
    badge: "MAX CONVICTION",
    includesProps: true,
    includesSgp: true,
    includesDfs: false,
    whopProductId: "prod_whop_sun_5pct",
    telegramChannelId: "-1002938475911",
  },
  {
    slug: "sunday-dfs-pro-20max-pack",
    title: "Sunday DFS Pro 20-Max Pack",
    subtitle: "Captain/Cash Cores, Leverage Stacks & Bring-Backs",
    description: "Complete Sunday Main Slate DFS tactical package. Includes optimal primary stacks, bring-back correlation pairs, cash safe baselines, and low-ownership GPP leverage pivots.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 2900, // $29.00
    guaranteedPriceCents: null,
    gamesCount: 10,
    highlights: [
      "Cash Game Core: 4 high-floor anchors for DraftKings & FanDuel",
      "Tournament Stacks: 3 elite primary stacks with correlated bring-backs",
      "Value Filler Pool: Sub-$4.5K salary plays with positive opportunity volume",
      "Projected ownership tiers and game-script variance models",
    ],
    badge: "DFS SHARP",
    includesProps: true,
    includesSgp: true,
    includesDfs: true,
    whopProductId: "prod_whop_dfs_pro",
    telegramChannelId: "-1002938475912",
  },
  {
    slug: "weekend-3day-all-access",
    title: "Weekend 3-Day All-Access",
    subtitle: "TNF, CFB Saturday, and Full Sunday Slate",
    description: "Unrestricted 72-hour pass covering Thursday Night Football, Saturday College Football top board edges, and the complete Sunday NFL card.",
    windowSlot: "WEEKEND_PASS",
    standardPriceCents: 6900, // $69.00
    guaranteedPriceCents: null,
    gamesCount: 25,
    highlights: [
      "Access to all slate writeups, side/total signals, and props",
      "CFB Saturday Top 25 situational edge card",
      "Sunday NFL 10-game master tactical dossier",
      "Direct VIP Telegram bot commands and instant broadcast feed",
    ],
    badge: "BEST VALUE",
    includesProps: true,
    includesSgp: true,
    includesDfs: true,
    whopProductId: "prod_whop_weekend_pass",
    telegramChannelId: "-1002938475913",
  },
  {
    slug: "weekly-7day-all-access",
    title: "Weekly 7-Day All-Access",
    subtitle: "Every NFL & College Game, Prop, SGP, and DFS Blueprint",
    description: "The complete 7-day master card. Full access to TNF, Friday CFB, Saturday College, Sunday NFL Early/Late/SNF, and Monday Night Football.",
    windowSlot: "WEEKLY_PASS",
    standardPriceCents: 9900, // $99.00
    guaranteedPriceCents: null,
    gamesCount: 40,
    highlights: [
      "Every single slate writeup and coach breakdown across all 7 days",
      "Full access to DFS optimizer projections, props lab, and SGP tools",
      "Telegram Bot `/unlock` VIP access for instantaneous mobile notifications",
      "Permanent archived access to tamper-evident cryptographic receipts",
    ],
    badge: "COMPLETE PASS",
    includesProps: true,
    includesSgp: true,
    includesDfs: true,
    whopProductId: "prod_whop_weekly_pass",
    telegramChannelId: "-1002938475914",
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
