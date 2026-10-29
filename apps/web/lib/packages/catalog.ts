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
    title: "TNF All-In Galaxy Pick Pack (CAR @ GB)",
    subtitle: "Thursday night side, total, props, and correlated SGP",
    description: "Galaxy Picks for Carolina at Green Bay. Side, total, top props, and the correlated ticket. Instant checkout and Telegram delivery.",
    windowSlot: "TNF",
    standardPriceCents: 1900,
    guaranteedPriceCents: null,
    gamesCount: 1,
    highlights: [
      "TNF side and total, played only when the de-vigged edge clears",
      "Player props evaluated over and under, not forced overs",
      "Correlated SGP only when the joint beats the product of the legs",
      "DFS showdown captains and cash core",
    ],
    badge: "TONIGHT",
    includesProps: true,
    includesSgp: true,
    includesDfs: true,
  },
  {
    slug: "sunday-nfl-5pct-slate",
    title: "Sunday NFL 5% Galaxy Picks Slate Pack",
    subtitle: "Sunday sides and totals that clear the vig",
    description: "Galaxy Picks for the Sunday slate. A play is published only when the fair number sits outside the -110 band.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 2900,
    guaranteedPriceCents: null,
    gamesCount: 9,
    highlights: [
      "Sunday early and late windows",
      "PASS when the market is efficient",
      "Honest CLV, including negative",
    ],
    badge: "SUNDAY",
    includesProps: true,
    includesSgp: false,
    includesDfs: false,
  },
  {
    slug: "sgp-correlation-basket",
    title: "Correlated SGP Galaxy Pick Pack",
    subtitle: "Three-leg tickets with measured copula lift",
    description: "Galaxy Picks same-game tickets. Every leg must clear 0.54 and the joint must beat the product of the marginals.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 1900,
    guaranteedPriceCents: null,
    gamesCount: 9,
    highlights: [
      "Positive copula lift required",
      "No forced tickets",
    ],
    badge: "SGP",
    includesProps: true,
    includesSgp: true,
    includesDfs: false,
  },
  {
    slug: "week8-all-access",
    title: "Full Week 8 All-Access Galaxy Picks + DFS Pass",
    subtitle: "TNF through Monday, plus the DFS optimizer",
    description: "Galaxy Picks for the full Week 8 card and the DFS optimizer. One checkout, Telegram unlock.",
    windowSlot: "WEEKLY_PASS",
    standardPriceCents: 3900,
    guaranteedPriceCents: null,
    gamesCount: 14,
    highlights: [
      "All 14 Week 8 dossiers",
      "DFS optimizer and stacks",
      "VIP Telegram unlock",
    ],
    badge: "ALL ACCESS",
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
