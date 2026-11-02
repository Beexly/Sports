/**
 * Pick Package Catalog & Stripe Instant Checkout Builder
 *
 * Galaxy Picks (paid) storefront. One-time Stripe checkout, no subscription required.
 * Wired to live Stripe Products and one-time Prices on Galaxy Sports Network:
 * - tnf-all-in-pack ($19): prod_VX406TulqtZwJJ / price_1UVzsdQ2wPZMxx60lqO3TLbQ
 * - sgp-correlation-basket ($29): prod_VX40XMRjV4FiJl / price_1UVzseQ2wPZMxx60VqAfAyNe
 * - sunday-nfl-5pct-slate ($39): prod_VX400OaIktCGLb / price_1UVzsfQ2wPZMxx606fYPjKEJ
 * - redzone-dfs-pro-pack ($39.99): prod_VX400OaIktCGLb / price_1UWjT2Q2wPZMxx60OrkMpGvF
 * - week8-all-access ($49): prod_VX40T4RNpoNNIp / price_1UVzsfQ2wPZMxx60ozEJ1P3n
 *
 * DOCTRINE & GUARDRAILS:
 * - NEVER render confidence as a percent symbol (always XX/100).
 * - NEVER publish or package any pick where decision === 'PASS' or expectedClv < 0.
 * - Nov 1 Game-Day Pull List (2026-11-01-PULL-LIST.md) enforced: 0 pulled items packaged.
 */

export interface PickPackageOffering {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  windowSlot: 'TNF' | 'SUN_EARLY' | 'SUN_LATE' | 'SUN_MAIN' | 'SNF' | 'MNF' | 'WEEKEND_PASS' | 'WEEKLY_PASS';
  standardPriceCents: number;
  creditBackPriceCents: number | null;
  stripeProductId: string;
  stripePriceId: string;
  stripeLookupKey: string;
  gamesCount: number;
  highlights: string[];
  badge?: string;
  includesProps: boolean;
  includesSgp: boolean;
  includesDfs: boolean;
  forSale?: boolean;
  whopProductId?: string;
  telegramChannelId?: string;
}

export interface SpecialtyPackTier extends PickPackageOffering {
  category:
    | 'DEFENSE_IDP'
    | 'ANYTIME_TD'
    | 'PARLAY_SGP'
    | 'KICKING_1Q_1H'
    | 'DFS_EXPANDED_CORE'
    | 'ALL_ACCESS_PASS';
  slateWindowLabel: string;
  verifiedRecordBanner: string;
  pullListIntegrityNote: string;
  topConfidenceRatings: readonly string[];
  dfsCoreSummary?: string;
}

export const WEEK8_GAME_DAY_CATALOG_METADATA = {
  asOfCt: "2026-11-01T10:35:00-06:00",
  kickoffCountdownMinutes: 85,
  slateWindowLabel: "Sunday 12:00 PM CT – Monday 7:15 PM CT (13 Unplayed NFL Games through MNF CHI @ SEA)",
  verifiedRecordBanner: "47-16 · 74.6/100 Win Rate · +29.01u (16-5 +10.45u Entering W8 + TNF 31-11 +18.56u Full / 14-6-1 +7.19u Single-Stake)",
  pullListEnforced: "2026-11-01-PULL-LIST.md (6 contaminated items struck before kickoff; 0 exposure in packs)",
  expandedDfsCoreSpec: {
    optimalLineupsCount: 2,
    corePositions: { QB: 2, RB: 4, WR: 4, TE: 2, DST: 2 },
    totalCorePlayers: 14,
    activePoolAudited: 588,
    zeroedOutIrCount: 86,
  },
} as const;

export const LIVE_PACKAGE_CATALOG: readonly PickPackageOffering[] = [
  {
    slug: "tnf-all-in-pack",
    title: "Week 8 Monday Night Football Game Pack (CHI @ SEA & Sunday Slate)",
    subtitle: "RedZone Sun 12:00 PM CT – Mon 7:15 PM CT DFS Core (2 Optimal Lineups + 2 QB / 4 RB / 4 WR / 2 TE / 2 DST) & Primetime Pack",
    description:
      "Built for the expanded Sunday 12:00 PM CT through Monday 7:15 PM CT (CHI @ SEA) slate alongside the 11-game Sunday Main Slate. Includes 2 Optimal Lineups (Cash High-Floor + Tournament Leverage), our 14-player Expanded Position Core (2 QBs, 4 RBs, 4 WRs, 2 TEs, 2 DSTs), 20-Max MME portfolio, and SNF/MNF Showdown Captain builds. Verified 47-16 (+29.01u) engine record with 0 pulled items.",
    windowSlot: "TNF",
    standardPriceCents: 1900,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX406TulqtZwJJ",
    stripePriceId: "price_1UVzsdQ2wPZMxx60lqO3TLbQ",
    stripeLookupKey: "gse-pack-tnf-all-in",
    gamesCount: 13,
    highlights: [
      "Sunday 12:00 PM CT – Monday 7:15 PM CT (CHI @ SEA) 13-Game Window + 11-Game Main Slate",
      "2 Optimal Lineups (Cash High-Floor & Tournament Leverage) + 20-Max MME Portfolio",
      "Expanded 14-Player Position Core: 2 QBs, 4 RBs, 4 WRs, 2 TEs & 2 DSTs (588 Active Audited, 86 OUT/IR Zeroed)",
      "SNF (PHI @ WAS) & MNF (CHI @ SEA) Primetime Showdown Captain & Core Builds",
    ],
    badge: "SUN 12PM–MON 7PM · DFS & PRIMETIME",
    includesProps: true,
    includesSgp: true,
    includesDfs: true,
    forSale: true,
  },
  {
    slug: "sunday-nfl-5pct-slate",
    title: "Sunday–Monday Best Bets & 1Q/1H / Kicking Derivatives Pack (13 Games)",
    subtitle: "Every Sun 12:00 PM CT – Mon 7:15 PM CT Spread, Moneyline, 1Q/1H Script & Kicking FGM Call",
    description:
      "Our complete Week 8 Sunday 12:00 PM CT through Monday Night Football (CHI @ SEA 7:15 PM CT) 13-game card. Includes all 7 locked Tier-1 Spread & Moneyline calls (top ratings 84/100, 80/100, 74/100), our locked Team Total Under derivative (68/100), 1st-Quarter & 1st-Half script calls (top ratings 70/100 & 69/100), and our Red-Zone Stall Kicking Field Goals Made Over 1.5 suite (top ratings 68/100 & 67/100). Verified 47-16 (+29.01u) record with 0 pulled plays.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 3900,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX400OaIktCGLb",
    stripePriceId: "price_1UVzsfQ2wPZMxx606fYPjKEJ",
    stripeLookupKey: "gse-pack-sunday-nfl-5pct-slate",
    gamesCount: 13,
    highlights: [
      "All 13 Sunday 12:00 PM CT – Monday 7:15 PM CT Matchups: 7 Locked Main Lines (Up to 84/100)",
      "1Q / 1H / 2Q Script Derivatives (Up to 70/100) + Locked Team Total Under (68/100)",
      "Kicking & Special Teams Suite: 6 Red-Zone Stall Field Goals Made Over 1.5 Reads (Up to 68/100)",
    ],
    badge: "SUN–MON · BEST BETS, 1Q/1H & KICKING",
    includesProps: true,
    includesSgp: false,
    includesDfs: false,
    forSale: true,
  },
  {
    slug: "sgp-correlation-basket",
    title: "Props, Anytime TD, Defense/IDP & Correlated Parlay/SGP Pack (Sun–Mon)",
    subtitle: "16 Skill/QB Props, Goal-Line Anytime TDs, LB Tackle/Sack IDP & Correlated Parlays",
    description:
      "Built across all 13 Sunday 12:00 PM CT through Monday Night Football (CHI @ SEA 7:15 PM CT) matchups. Unlocks all 16 Empirical-Bayes Skill & QB Props (led by 95/100, 92/100 & 90/100 reads), our 6 Inside-the-5 Goal-Line Anytime Touchdown plays (89/100, 84/100 & 80/100), our 8 Defense & IDP LB Tackle-Funnel & Sack plays (led by two 81/100 locks), and our 2-Leg & 3-Leg Correlated Parlay & Same-Game Parlay tickets.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 2900,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX40XMRjV4FiJl",
    stripePriceId: "price_1UVzseQ2wPZMxx60VqAfAyNe",
    stripeLookupKey: "gse-pack-sgp-correlation-basket",
    gamesCount: 13,
    highlights: [
      "16 Locked Skill & QB Player Props Across Sun 12:00 PM CT – Mon 7:15 PM CT (Rated 77/100 to 95/100)",
      "Anytime Touchdown Pack: 6 Inside-the-5 Goal-Line Bellcow TD Reads (Rated 69/100 to 89/100)",
      "Defense & IDP Pack: 8 LB Tackle-Funnel & Edge Sack Reads (Led by Two 81/100 Ratings)",
      "Correlated Parlay & SGP Pack: 2-Leg & 3-Leg Game-Script Tickets with Zero Conflicting Legs",
    ],
    badge: "PROPS · ANYTIME TD · DEFENSE · PARLAYS",
    includesProps: true,
    includesSgp: true,
    includesDfs: false,
    forSale: true,
  },
  {
    slug: "week8-all-access",
    title: "Sunday–Monday All-Access Bundle (All 13 Games + Every Specialty Pack + Full DFS)",
    subtitle: "Every Sun 12:00 PM CT – Mon 7:15 PM CT Pack + 2 Optimal DFS Lineups + 2 QB / 4 RB / 4 WR / 2 TE / 2 DST Core",
    description:
      "Unlock every single Week 8 game-day pack across the entire 13-game Sunday 12:00 PM CT through Monday Night Football (CHI @ SEA 7:15 PM CT) slate in one click: Main Game Lines, 16 Skill/QB Props, Defense & IDP Pack, Anytime Touchdown Pack, Correlated Parlay & SGP Pack, Kicking & 1Q/1H Derivative Pack, AND the complete RedZone DFS Portfolio (11-Game Main + 13-Game Sun–Mon 2 Optimal Lineups + Expanded 2 QB / 4 RB / 4 WR / 2 TE / 2 DST Core + 20-Max MME). Verified 47-16 (+29.01u) engine record with 0 pulled items.",
    windowSlot: "WEEKLY_PASS",
    standardPriceCents: 4900,
    guaranteedPriceCents: null,
    stripeProductId: "prod_VX40T4RNpoNNIp",
    stripePriceId: "price_1UVzsfQ2wPZMxx60ozEJ1P3n",
    stripeLookupKey: "gse-pack-week8-all-access",
    gamesCount: 13,
    highlights: [
      "All 13 Unplayed Week 8 Games: Sunday 12:00 PM CT Early/Late + SNF (PHI @ WAS) + MNF (CHI @ SEA)",
      "Every Pack Included: Main Lines, 16 Props, Defense/IDP, Anytime TD, Parlays/SGPs & Kicking/1Q/1H",
      "Full RedZone DFS Included: 2 Optimal Lineups + 2 QB / 4 RB / 4 WR / 2 TE / 2 DST Core + 20-Max MME",
    ],
    badge: "SUN–MON ALL-ACCESS VIP · 13 GAMES + DFS",
    includesProps: true,
    includesSgp: true,
    includesDfs: true,
    forSale: true,
  },
];

export const WEEK8_SPECIALTY_PACK_TIERS: readonly SpecialtyPackTier[] = [
  {
    slug: "week8-defense-idp-pack",
    category: "DEFENSE_IDP",
    title: "Week 8 Defense & IDP Tackle/Sack Pack (Sun 12pm – Mon 7pm)",
    subtitle: "8 LB Tackle-Funnel & Edge Sack Plays + 2 Elite Sun–Mon DST Leverage Units",
    description:
      "Dedicated Defense, Special Teams & Individual Defensive Player (IDP) pack across the 13-game Sunday 12:00 PM CT – Monday 7:15 PM CT slate. Powered by opponent play-volume tackle funnels, trench pressure-to-sack survival curves, and our 2 locked Sun–Mon DFS DST units (588 active players audited; contaminated NYJ DST pulled).",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 1900,
    guaranteedPriceCents: null,
    stripeProductId: "prod_VX406TulqtZwJJ",
    stripePriceId: "price_1UVzsdQ2wPZMxx60lqO3TLbQ",
    stripeLookupKey: "gse-pack-week8-defense-idp",
    gamesCount: 13,
    highlights: [
      "8 LB Tackle-Funnel & Edge Sack Projections Across Sun 12:00 PM CT – Mon 7:15 PM CT",
      "Headlined by Two 81/100 LB Tackle Under Locks (KC @ DEN & LAC @ LA) + 75/100 & 72/100 Reads",
      "Includes Our 2 Core Sun–Mon Defense/ST Units + Trench Pressure Mismatch Dossier",
    ],
    badge: "DEFENSE & IDP PACK · $19",
    includesProps: true,
    includesSgp: false,
    includesDfs: true,
    forSale: true,
    slateWindowLabel: "Sun 12:00 PM CT – Mon 7:15 PM CT (13 Games)",
    verifiedRecordBanner: "47-16 · +29.01u Official New Engine Record",
    pullListIntegrityNote: "PULL-04 (NYJ DST) removed; 0 contaminated defensive exposures",
    topConfidenceRatings: ["81/100", "81/100", "75/100", "72/100", "71/100", "68/100"],
  },
  {
    slug: "week8-anytime-td-pack",
    category: "ANYTIME_TD",
    title: "Week 8 Anytime Touchdown & Goal-Line Vulture Pack (Sun 12pm – Mon 7pm)",
    subtitle: "6 Inside-the-5 Low-QB-Vulture Bellcow Anytime TD Plays Across 13 Games",
    description:
      "Dedicated Anytime Touchdown Scorer pack across the 13-game Sunday 12:00 PM CT – Monday 7:15 PM CT slate. Isolates red-zone and inside-the-5 carry/target concentration where quarterback rushing vulture rates are suppressed below 15 of 100 snaps.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 2400,
    guaranteedPriceCents: null,
    stripeProductId: "prod_VX40XMRjV4FiJl",
    stripePriceId: "price_1UVzseQ2wPZMxx60VqAfAyNe",
    stripeLookupKey: "gse-pack-week8-anytime-td",
    gamesCount: 13,
    highlights: [
      "6 Inside-the-5 Goal-Line Anytime TD Plays Across Sun 12:00 PM CT – Mon 7:15 PM CT",
      "Top Anytime TD Confidence Ratings: 89/100, 84/100, 80/100, 77/100 & 72/100",
      "Includes Exact Model Fair Odds vs Book Trigger Thresholds & Red-Zone Play-Calling Splits",
    ],
    badge: "ANYTIME TD PACK · $24",
    includesProps: true,
    includesSgp: false,
    includesDfs: false,
    forSale: true,
    slateWindowLabel: "Sun 12:00 PM CT – Mon 7:15 PM CT (13 Games)",
    verifiedRecordBanner: "47-16 · +29.01u Official New Engine Record",
    pullListIntegrityNote: "All Sunday morning RB/TE inactive reallocations applied",
    topConfidenceRatings: ["89/100", "84/100", "80/100", "77/100", "72/100", "69/100"],
  },
  {
    slug: "week8-parlay-sgp-pack",
    category: "PARLAY_SGP",
    title: "Week 8 Correlated Parlay & Same-Game Parlay Pack (Sun 12pm – Mon 7pm)",
    subtitle: "2-Leg & 3-Leg Game-Script Correlated Parlays, SGPs & Cross-Slate Baskets",
    description:
      "Built for the biggest structural pricing hole on the board. Pairs Sides, Totals, 16 Empirical-Bayes Skill Props, Anytime TDs, and 1Q/1H derivatives that cash together under the exact same Sunday 12:00 PM CT – Monday 7:15 PM CT game script.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 2900,
    guaranteedPriceCents: null,
    stripeProductId: "prod_VX40XMRjV4FiJl",
    stripePriceId: "price_1UVzseQ2wPZMxx60VqAfAyNe",
    stripeLookupKey: "gse-pack-week8-parlay-sgp",
    gamesCount: 13,
    highlights: [
      "Curated 2-Leg & 3-Leg Correlated Same-Game Parlays Across All 13 Sun–Mon Matchups",
      "Cross-Game High-Probability Anchor Parlay Baskets (Pairing 84/100, 80/100 & 74/100 Locks)",
      "Zero Conflicting Legs — Every Ticket Verified Against Joint Game-Script Trajectories",
    ],
    badge: "PARLAY & SGP PACK · $29",
    includesProps: true,
    includesSgp: true,
    includesDfs: false,
    forSale: true,
    slateWindowLabel: "Sun 12:00 PM CT – Mon 7:15 PM CT (13 Games)",
    verifiedRecordBanner: "47-16 · +29.01u Official New Engine Record",
    pullListIntegrityNote: "Zero pulled LV@NYJ or TB prop legs included in any parlay basket",
    topConfidenceRatings: ["95/100", "92/100", "84/100", "80/100", "74/100"],
  },
  {
    slug: "week8-kicking-1q-1h-pack",
    category: "KICKING_1Q_1H",
    title: "Week 8 Kicking, Special Teams & 1Q / 1H Derivative Pack (Sun 12pm – Mon 7pm)",
    subtitle: "1st-Quarter Totals, 1H/2Q Winners, Team Totals & Red-Zone Stall Kicker FGM Over 1.5",
    description:
      "Attack early-script scoring and red-zone stalls across the 13-game Sunday 12:00 PM CT – Monday 7:15 PM CT window. Combines our locked Team Total Under (68/100), 1st-Quarter Total Stop-Kernel calls (up to 70/100), 1H/2Q Winner script calls, and 6 Kicker Field Goals Made Over 1.5 reads (up to 68/100).",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 2400,
    guaranteedPriceCents: null,
    stripeProductId: "prod_VX400OaIktCGLb",
    stripePriceId: "price_1UVzsfQ2wPZMxx606fYPjKEJ",
    stripeLookupKey: "gse-pack-week8-kicking-1q-1h",
    gamesCount: 13,
    highlights: [
      "Locked Team Total Derivative (68/100) + 10 1Q Total / 1H Winner / 2Q Winner Script Calls (Up to 70/100)",
      "6 Kicker Field Goals Made Over 1.5 Projections Powered by Red-Zone Stall & 4th-Down FG Rates (Up to 68/100)",
      "Includes Exact Two-Way De-Vigged Fair Odds & Book Entry Trigger Numbers for Every Game",
    ],
    badge: "KICKING & 1Q/1H PACK · $24",
    includesProps: true,
    includesSgp: false,
    includesDfs: false,
    forSale: true,
    slateWindowLabel: "Sun 12:00 PM CT – Mon 7:15 PM CT (13 Games)",
    verifiedRecordBanner: "47-16 · +29.01u Official New Engine Record",
    pullListIntegrityNote: "All 13 games cross-checked against Sunday morning weather & wind feeds",
    topConfidenceRatings: ["70/100", "70/100", "69/100", "68/100", "68/100", "67/100"],
  },
  {
    slug: "week8-sun-mon-dfs-expanded-pack",
    category: "DFS_EXPANDED_CORE",
    title: "RedZone Expanded Sun 12pm – Mon 7pm DFS Pack (2 Optimal Lineups + 2 QB / 4 RB / 4 WR / 2 TE / 2 DST)",
    subtitle: "13-Game Sunday–Monday Slate + 11-Game Main Slate: 2 Optimal Lineups, 14-Player Core & 20-Max MME",
    description:
      "Built specifically for the bigger Sunday 12:00 PM CT – Monday 7:15 PM CT (13-game, including SNF PHI @ WAS and MNF CHI @ SEA) slate in addition to the 11-game Sunday Main Slate. Delivers 2 Complete Optimal Lineups (Lineup #1 Cash High-Floor + Lineup #2 Tournament Ceiling), our Expanded 14-Player Position Core (2 QBs, 4 RBs, 4 WRs, 2 TEs, 2 DSTs), 20-Max MME portfolio, and full 588-active-player pool with 86 OUT/IR players zeroed.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 3999,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX400OaIktCGLb",
    stripePriceId: "price_1UWjT2Q2wPZMxx60OrkMpGvF",
    stripeLookupKey: "gse-pack-redzone-dfs-pro-pack",
    gamesCount: 13,
    highlights: [
      "2 Complete Optimal Lineups: Lineup #1 High-Floor Cash + Lineup #2 Correlated Tournament Ceiling",
      "Expanded 14-Player Core Pool Across Sun 12pm – Mon 7pm: 2 QBs, 4 RBs, 4 WRs, 2 TEs & 2 DSTs",
      "Includes 11-Game Sunday Main Slate + 13-Game Sun–Mon 20-Max MME + 588-Player Pool (86 OUT/IR Zeroed)",
    ],
    badge: "SUN–MON EXPANDED DFS · $39.99",
    includesProps: false,
    includesSgp: false,
    includesDfs: true,
    forSale: true,
    slateWindowLabel: "Sun 12:00 PM CT – Mon 7:15 PM CT (13 Games + 11-Game Main)",
    verifiedRecordBanner: "47-16 · +29.01u Official New Engine Record",
    pullListIntegrityNote: "PULL-04 (NYJ DST) & PULL-06 (Omar Cooper Jr.) zeroed across all lineups",
    topConfidenceRatings: ["95/100", "92/100", "90/100", "85/100"],
    dfsCoreSummary: "2 Optimal Lineups + 2 QB / 4 RB / 4 WR / 2 TE / 2 DST (14-Player Sun–Mon Core)",
  },
  {
    slug: "week8-all-access-gameday-pass",
    category: "ALL_ACCESS_PASS",
    title: "Week 8 Sunday–Monday All-Access Game-Day Pass (All 6 Packs Included)",
    subtitle: "Main Lines + Props + Defense/IDP + Anytime TD + Parlays/SGPs + Kicking/1Q/1H + Expanded Sun–Mon DFS",
    description:
      "Complete one-click access to every single Week 8 pack across all 13 unplayed games from Sunday 12:00 PM CT through Monday Night Football (CHI @ SEA 7:15 PM CT), including all specialty packs and the Expanded Sun–Mon DFS portfolio (2 Optimal Lineups + 2 QB / 4 RB / 4 WR / 2 TE / 2 DST Core).",
    windowSlot: "WEEKLY_PASS",
    standardPriceCents: 4900,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX40T4RNpoNNIp",
    stripePriceId: "price_1UVzsfQ2wPZMxx60ozEJ1P3n",
    stripeLookupKey: "gse-pack-week8-all-access",
    gamesCount: 13,
    highlights: [
      "Unlocks All 6 Week 8 Packs Across Sun 12:00 PM CT – Mon 7:15 PM CT (13 Games)",
      "7 Main Lines + 16 Skill/QB Props + 8 Defense/IDP + 6 Anytime TDs + Kicking/1Q/1H + Parlays",
      "Full RedZone DFS Included: 2 Optimal Lineups + 2 QB / 4 RB / 4 WR / 2 TE / 2 DST Expanded Core",
    ],
    badge: "ALL-ACCESS GAME-DAY PASS · $49",
    includesProps: true,
    includesSgp: true,
    includesDfs: true,
    forSale: true,
    slateWindowLabel: "Sun 12:00 PM CT – Mon 7:15 PM CT (All 13 Games)",
    verifiedRecordBanner: "47-16 · +29.01u Official New Engine Record",
    pullListIntegrityNote: "All 6 Nov 1 Pull-List items removed; 24 locked betting survivors + verified triggers",
    topConfidenceRatings: ["95/100", "92/100", "90/100", "89/100", "84/100", "81/100"],
    dfsCoreSummary: "2 Optimal Lineups + 2 QB / 4 RB / 4 WR / 2 TE / 2 DST (14-Player Sun–Mon Core)",
  },
];

const PACKAGE_SLUG_ALIASES: Record<string, string> = {
  "sunday-afternoon-slate-pack": "sunday-nfl-5pct-slate",
  "week-8-all-access-bundle": "week8-all-access",
  "redzone-dfs-pro-pack": "week8-sun-mon-dfs-expanded-pack",
  "defense-pack": "week8-defense-idp-pack",
  "anytime-td-pack": "week8-anytime-td-pack",
  "parlay-pack": "week8-parlay-sgp-pack",
  "kicking-1q-1h-pack": "week8-kicking-1q-1h-pack",
};

export function getPackageBySlug(slug: string): PickPackageOffering | undefined {
  const canonical = PACKAGE_SLUG_ALIASES[slug] ?? slug;
  return (
    LIVE_PACKAGE_CATALOG.find((p) => p.slug === canonical) ??
    WEEK8_SPECIALTY_PACK_TIERS.find((p) => p.slug === canonical)
  );
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
    creditBack: string;
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
  creditBack: boolean,
  buyerEmail?: string,
  origin?: string,
  returnToStorefront?: boolean,
): StripeCheckoutPayload {
  if (pkg.forSale === false) {
    throw new Error(`Package '${pkg.slug}' is not for sale.`);
  }
  let unitAmount = pkg.standardPriceCents;
  let productName = pkg.title;

  if (creditBack) {
    if (pkg.creditBackPriceCents === null) {
      throw new Error(`Package '${pkg.slug}' does not offer a credit-back tier.`);
    }
    unitAmount = pkg.creditBackPriceCents;
    productName = `${pkg.title} (Credit-Back)`;
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
      creditBack: String(creditBack),
      windowSlot: pkg.windowSlot,
    },
    success_url: successUrl,
    cancel_url: `${baseOrigin}/packages`,
    customer_email: buyerEmail && buyerEmail.trim().length > 0 ? buyerEmail.trim() : undefined,
  };
}
