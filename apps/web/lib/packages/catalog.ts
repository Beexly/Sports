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
}

export const LIVE_PACKAGE_CATALOG: readonly PickPackageOffering[] = [
  {
    slug: "tnf-all-in-pack",
    title: "Week 8 Spotlight & MNF Game Pack (WAS @ KC & Sunday Slate)",
    subtitle: "Official Spread Pick, Over/Under Pick, Player Props & Showdown Lineup",
    description:
      "Everything you need for Week 8 Sunday Spotlight and Monday Night Football (WAS @ KC & CHI @ SEA). TNF official card is 14-6 with 1 split. The 31-11 banner is retracted.",
    windowSlot: "TNF",
    standardPriceCents: 1900,
    guaranteedPriceCents: null,
    stripeProductId: "prod_VX406TulqtZwJJ",
    stripePriceId: "price_1UVzsdQ2wPZMxx60lqO3TLbQ",
    stripeLookupKey: "gse-pack-tnf-all-in",
    gamesCount: 2,
    highlights: [
      "Official Week 8 Spotlight & Monday Night Football (WAS @ KC) Spread & Total Calls",
      "360-Degree Markets: 1Q–4Q, 1H/2H, Kicking B4 (23,247-Kick Model), IDP Sacks & TD Scorers",
      "7-Signal Pack & Walk-Forward tau_hat (+11.16pp on n=3,988 4th Downs) Trench Breakdown",
      "DraftKings / FanDuel Primetime Showdown Captain & Core Lineup Builds",
    ],
    badge: "WEEK 8 · SUNDAY & MNF",
    includesProps: true,
    includesSgp: true,
    includesDfs: true,
  },
  {
    slug: "sunday-nfl-5pct-slate",
    title: "Week 8 Sunday NFL Main Slate Pack (12 Games)",
    subtitle: "Every Sunday 1:00 PM & 4:25 PM ET Spread, Total & 360-Degree Market Call",
    description:
      "Our complete Week 8 Sunday Main Slate card across all 12 Sunday matchups — powered by the GSE 10-Layer Autonomous Engine (22,750,000 snap evaluations, 581 360-degree markets audited, 4,056 research corpus IDs, 112 Instagram + 100 X deep-math dossiers, and 50 doctoral papers).",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 3900,
    guaranteedPriceCents: null,
    stripeProductId: "prod_VX400OaIktCGLb",
    stripePriceId: "price_1UVzsfQ2wPZMxx606fYPjKEJ",
    stripeLookupKey: "gse-pack-sunday-nfl-5pct-slate",
    gamesCount: 12,
    highlights: [
      "All 12 Week 8 Sunday Main Slate (1:00 PM & 4:25 PM ET) NFL Matchups",
      "581 360-Degree Markets Audited (1Q–4Q, 1H/2H, Kicking B4, IDP Sacks, Skill & QB Props)",
      "Clear Bet or Pass Verdict with Romano CQR Honest Conformal Intervals",
    ],
    badge: "SUNDAY MAIN SLATE · 12 GAMES",
    includesProps: true,
    includesSgp: false,
    includesDfs: false,
  },
  {
    slug: "sgp-correlation-basket",
    title: "Week 8 Sunday Props & Same-Game Parlay Pack",
    subtitle: "360-Degree Player Props & Correlated Same-Game Parlays",
    description:
      "Built across all 12 Sunday Main Slate games and Monday Night Football (WAS @ KC) using OpenAI Math live Optimal Transport certificates and Romano CQR conformal intervals to pair legs that feed off the exact same game script.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 2900,
    guaranteedPriceCents: null,
    stripeProductId: "prod_VX40XMRjV4FiJl",
    stripePriceId: "price_1UVzseQ2wPZMxx60VqAfAyNe",
    stripeLookupKey: "gse-pack-sgp-correlation-basket",
    gamesCount: 12,
    highlights: [
      "Top Quarter/Half, QB, Skill, Kicking B4 & IDP Sack Props Across Week 8 Sunday",
      "Curated 2-Leg, 3-Leg & 4-Leg Same-Game Parlays Built on Game-Script Correlation",
      "7-Signal Pack Validation (PROE, Hidden Yards, Pressure Escape, Pace, WR/CB & Havoc)",
    ],
    badge: "WEEK 8 PROPS & PARLAYS",
    includesProps: true,
    includesSgp: true,
    includesDfs: false,
  },
  {
    slug: "week8-all-access",
    title: "Week 8 Full All-Access Pass (12 Sunday Games + MNF WAS @ KC + DFS)",
    subtitle: "Every Week 8 NFL Game on the Board + Complete DK & FD DFS Portfolio",
    description:
      "Unlock every single Week 8 NFL game pack across the 12-game Sunday Main Slate, Sunday Night Football, and Monday Night Football (WAS @ KC & CHI @ SEA) — plus our complete DraftKings ($50K) and FanDuel ($60K) Cash and GPP DFS Lineup Portfolio.",
    windowSlot: "WEEKLY_PASS",
    standardPriceCents: 4900,
    guaranteedPriceCents: null,
    stripeProductId: "prod_VX40T4RNpoNNIp",
    stripePriceId: "price_1UVzsfQ2wPZMxx60ozEJ1P3n",
    stripeLookupKey: "gse-pack-week8-all-access",
    gamesCount: 13,
    highlights: [
      "All 12 Sunday Main Slate Games + SNF + Monday Night Football (WAS @ KC & CHI @ SEA)",
      "Every Official Spread Call, Over/Under Call, 360-Degree Prop & Same-Game Parlay",
      "Full Week 8 DraftKings ($50K) & FanDuel ($60K) Cash Core & 3 GPP Stacks Included",
    ],
    badge: "WEEK 8 VIP · ALL GAMES + DFS",
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
