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
  asOfCt: "2026-11-05T16:00:00-06:00",
  kickoffCountdownMinutes: 195,
  slateWindowLabel: "Week 9 Thursday Night Football (JAX @ BAL) through Sunday & Monday Night Football (TB @ KC)",
  verifiedRecordBanner: "62-23-1 · +26.50u Verified Season Record",
  pullListEnforced: "All active Week 9 injury reports and offensive/defensive line protection splits verified",
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
    title: "Week 9 Thursday Night Football Game Pack (JAX @ BAL + Showdown DFS)",
    subtitle: "Spread Pass Discipline Read + 10 Top-Confidence TNF Player Matchups (88/100) + 3-Leg SGP + Showdown Lineups",
    description:
      "Built for Week 9 Thursday Night Football (Jacksonville Jaguars at Baltimore Ravens). With the spread steamed from -3.5 past the key -7 number to -7.5, we pass the side and attack 10 top-confidence TNF player matchups and derivatives (rated 88/100), led by Mark Andrews Over 2.5 Receptions against Jacksonville's blitz. Includes our 3-leg correlated JAX @ BAL Same-Game Parlay and DraftKings/FanDuel Showdown Captain lineups. Verified 62-23-1 (+26.50u) season record.",
    windowSlot: "TNF",
    standardPriceCents: 1900,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX406TulqtZwJJ",
    stripePriceId: "price_1UVzsdQ2wPZMxx60lqO3TLbQ",
    stripeLookupKey: "gse-pack-tnf-all-in",
    gamesCount: 1,
    highlights: [
      "Week 9 TNF (JAX @ BAL): Disciplined Spread Pass at -7.5 + 10 Top-Confidence Player Matchups (88/100)",
      "Full-Game & 1st-Half Props: Mark Andrews, Derrick Henry, Zay Flowers, Brenton Strange & Chris Rodriguez Jr.",
      "3-Leg Correlated JAX @ BAL Same-Game Parlay Ticket Built Around Blitz & Trench Tendencies",
      "DraftKings & FanDuel TNF Showdown Captain Lineups (Cash Core + Tournament Leverage Builds)",
    ],
    badge: "WEEK 9 TNF · JAX @ BAL + SHOWDOWN DFS",
    includesProps: true,
    includesSgp: true,
    includesDfs: true,
    forSale: true,
  },
  {
    slug: "sunday-nfl-5pct-slate",
    title: "Week 9 Sunday & MNF Best Bets, 1Q/1H & Kicking Derivatives Pack",
    subtitle: "Every Week 9 Sunday & Monday Night (TB @ KC) Spread, Moneyline, 1Q/1H Script & Kicking FGM Call",
    description:
      "Our complete Week 9 Sunday Main Slate, Sunday Night Football (IND @ MIN), and Monday Night Football (TB @ KC) game-line and derivative card. Includes our highest-conviction Spread, Moneyline, and Total calls (led by DET @ GB, MIA @ BUF, and IND @ MIN), 1st-Quarter and 1st-Half script plays, and our Red-Zone Stall Kicker Field Goals Made Over 1.5 suite. Verified 62-23-1 (+26.50u) season record.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 3900,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX400OaIktCGLb",
    stripePriceId: "price_1UVzsfQ2wPZMxx606fYPjKEJ",
    stripeLookupKey: "gse-pack-sunday-nfl-5pct-slate",
    gamesCount: 13,
    highlights: [
      "Week 9 Sunday & Monday Night Matchups: Locked Main-Line Spread, Moneyline & Total Calls (Up to 85/100)",
      "1Q / 1H / 2Q Opening Script Derivatives + Team Total Over/Under Calls",
      "Kicking & Special Teams Suite: Red-Zone Stall Field Goals Made Over 1.5 Reads",
    ],
    badge: "WEEK 9 SUN–MON · BEST BETS, 1Q/1H & KICKING",
    includesProps: true,
    includesSgp: false,
    includesDfs: false,
    forSale: true,
  },
  {
    slug: "sgp-correlation-basket",
    title: "Week 9 Player Props, Anytime TD, Defense/IDP & Correlated Parlay/SGP Pack",
    subtitle: "TNF (JAX @ BAL) + Week 9 Sunday/MNF Skill/QB Props, Goal-Line Anytime TDs, IDP Tackles/Sacks & SGPs",
    description:
      "Built across Week 9 Thursday Night Football (JAX @ BAL) through Sunday and Monday Night Football (TB @ KC). Unlocks our top-rated Skill and Quarterback Player Props (up to 88/100), Inside-the-5 Goal-Line Anytime Touchdown plays, Linebacker Tackle-Funnel and Edge Sack props, and 2-Leg & 3-Leg Correlated Same-Game Parlay tickets built around real offensive and defensive game scripts.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 2900,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX40XMRjV4FiJl",
    stripePriceId: "price_1UVzseQ2wPZMxx60VqAfAyNe",
    stripeLookupKey: "gse-pack-sgp-correlation-basket",
    gamesCount: 14,
    highlights: [
      "Locked Skill & QB Player Props Across Week 9 TNF, Sunday & MNF (Rated Up to 88/100)",
      "Anytime Touchdown Pack: Inside-the-5 Goal-Line Bellcow TD Reads",
      "Defense & IDP Pack: Linebacker Tackle-Funnel & Edge Rush Sack Props",
      "Correlated Parlay & SGP Pack: 2-Leg & 3-Leg Game-Script Tickets with Zero Conflicting Legs",
    ],
    badge: "PROPS · ANYTIME TD · DEFENSE · PARLAYS",
    includesProps: true,
    includesSgp: true,
    includesDfs: false,
    forSale: true,
  },
  {
    slug: "redzone-dfs-pro-pack",
    title: "RedZone Standalone Week 9 DFS Pro Pack (TNF Showdown + Sunday Lineups & Pool)",
    subtitle: "JAX @ BAL Showdown Captain Builds + 2 Sunday Optimal Lineups (Cash & GPP) + 14-Player Core Pool",
    description:
      "Our complete standalone Week 9 Daily Fantasy (DFS) package on the unified RedZone site. Includes DraftKings and FanDuel Showdown Captain lineups for JAX @ BAL, Optimal Lineup #1 (High-Floor Cash/Double-Up), Optimal Lineup #2 (GPP Tournament Leverage Stack), our 14-Player Position Core (2 QB, 4 RB, 4 WR, 2 TE, 2 DST with full coaching and matchup writeups), and our injury-adjusted active player pool.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 3999,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX400OaIktCGLb",
    stripePriceId: "price_1UWjT2Q2wPZMxx60OrkMpGvF",
    stripeLookupKey: "gse-pack-redzone-dfs-pro-pack",
    gamesCount: 14,
    highlights: [
      "JAX @ BAL Showdown Captain Lineups + 2 Sunday Optimal Lineups (Cash High-Floor + GPP Correlated Stack)",
      "14-Player Position Core Pool (2 QBs, 4 RBs, 4 WRs, 2 TEs, 2 DSTs + Coaching Writeups)",
      "Complete 588-Active-Player Pool with Injury Replacements & Role Shifts Audited",
    ],
    badge: "REDZONE STANDALONE DFS · $39.99",
    includesProps: false,
    includesSgp: false,
    includesDfs: true,
    forSale: true,
  },
  {
    slug: "week8-all-access",
    title: "Week 9 All-Access Bundle (TNF JAX @ BAL + All Sunday/MNF Packs + Full DFS)",
    subtitle: "Every Week 9 Pack Included: TNF JAX @ BAL, Sunday & MNF Main Lines, Props, SGPs, Specialty Packs & Full DFS",
    description:
      "Unlock every single Week 9 pack across Thursday Night Football (JAX @ BAL), the Sunday Main Slate, Sunday Night Football (IND @ MIN), and Monday Night Football (TB @ KC) in one click: 10 Top-Confidence TNF Player Matchups (88/100), 3-Leg TNF SGP, Showdown Captain Lineups, Sunday/MNF Main Game Lines, Skill/QB Props, Defense & IDP Pack, Anytime Touchdown Pack, Kicking & 1Q/1H Derivative Pack, AND the complete RedZone DFS Portfolio. Verified 62-23-1 (+26.50u) season record.",
    windowSlot: "WEEKLY_PASS",
    standardPriceCents: 4900,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX40T4RNpoNNIp",
    stripePriceId: "price_1UVzsfQ2wPZMxx60ozEJ1P3n",
    stripeLookupKey: "gse-pack-week8-all-access",
    gamesCount: 14,
    highlights: [
      "All Week 9 Games Included: TNF (JAX @ BAL) + Sunday Early/Late + SNF (IND @ MIN) + MNF (TB @ KC)",
      "Every Pack Included: Main Lines, TNF 10-Play Card (88/100), Props, Defense/IDP, Anytime TD, SGPs & Kicking/1Q/1H",
      "Full RedZone DFS Included: TNF Showdown Captain Lineups + 2 Sunday Optimal Lineups + 14-Player Core",
    ],
    badge: "WEEK 9 ALL-ACCESS VIP · TNF + SUN–MON + DFS",
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
    title: "Week 9 Defense & IDP Tackle/Sack Pack (TNF + Sun–Mon)",
    subtitle: "8 LB Tackle-Funnel & Edge Sack Plays + 2 Core Week 9 DST Units",
    description:
      "Dedicated Defense, Special Teams & Individual Defensive Player (IDP) pack across Week 9 Thursday Night Football (JAX @ BAL) and the Sunday–Monday slate. Built from opponent play-volume tackle funnels, offensive line pass-protection splits, and our 2 locked Week 9 DFS DST units.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 1900,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX406TulqtZwJJ",
    stripePriceId: "price_1UVzsdQ2wPZMxx60lqO3TLbQ",
    stripeLookupKey: "gse-pack-week8-defense-idp",
    gamesCount: 14,
    highlights: [
      "8 LB Tackle-Funnel & Edge Sack Props Across Week 9 TNF (JAX @ BAL) & Sun–Mon",
      "Headlined by High-Conviction Linebacker Tackle & Pass-Rush Sack Reads (Up to 88/100)",
      "Includes Our 2 Core Week 9 Defense/ST Units + Trench Protection Mismatch Notes",
    ],
    badge: "DEFENSE & IDP PACK · $19",
    includesProps: true,
    includesSgp: false,
    includesDfs: true,
    forSale: true,
    slateWindowLabel: "Week 9 TNF (JAX @ BAL) + Sun–Mon Slate",
    verifiedRecordBanner: "62-23-1 · +26.50u Verified Season Record",
    pullListIntegrityNote: "All active defensive & offensive line injury designations verified",
    topConfidenceRatings: ["88/100", "84/100", "81/100", "78/100", "75/100", "72/100"],
  },
  {
    slug: "week8-anytime-td-pack",
    category: "ANYTIME_TD",
    title: "Week 9 Anytime Touchdown & Goal-Line Pack (TNF + Sun–Mon)",
    subtitle: "Inside-the-5 Bellcow & Red-Zone Target Anytime TD Plays Across Week 9",
    description:
      "Dedicated Anytime Touchdown Scorer pack across Week 9 Thursday Night Football (JAX @ BAL) and the Sunday–Monday slate. Isolates red-zone and inside-the-5 carry and target roles where goal-line volume is concentrated.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 2400,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX40XMRjV4FiJl",
    stripePriceId: "price_1UVzseQ2wPZMxx60VqAfAyNe",
    stripeLookupKey: "gse-pack-week8-anytime-td",
    gamesCount: 14,
    highlights: [
      "Inside-the-5 Goal-Line & Red-Zone Anytime TD Plays Across Week 9 TNF & Sun–Mon",
      "Top Anytime TD Confidence Ratings: 88/100, 85/100, 82/100, 79/100 & 76/100",
      "Includes Fair Price vs Sportsbook Price Thresholds & Red-Zone Play-Calling Splits",
    ],
    badge: "ANYTIME TD PACK · $24",
    includesProps: true,
    includesSgp: false,
    includesDfs: false,
    forSale: true,
    slateWindowLabel: "Week 9 TNF (JAX @ BAL) + Sun–Mon Slate",
    verifiedRecordBanner: "62-23-1 · +26.50u Verified Season Record",
    pullListIntegrityNote: "All Week 9 RB/TE injury replacements and goal-line roles applied",
    topConfidenceRatings: ["88/100", "85/100", "82/100", "79/100", "76/100", "74/100"],
  },
  {
    slug: "week8-parlay-sgp-pack",
    category: "PARLAY_SGP",
    title: "Week 9 Correlated Parlay & Same-Game Parlay Pack (TNF + Sun–Mon)",
    subtitle: "JAX @ BAL 3-Leg SGP + Week 9 Sunday/MNF 2-Leg & 3-Leg Correlated Game-Script Parlays",
    description:
      "Built for correlated multi-leg tickets where every leg fits the exact same game script. Pairs Sides, Totals, Skill/QB Props, Anytime TDs, and 1Q/1H derivatives across Week 9 Thursday Night Football (JAX @ BAL) and the Sunday–Monday slate.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 2900,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX40XMRjV4FiJl",
    stripePriceId: "price_1UVzseQ2wPZMxx60VqAfAyNe",
    stripeLookupKey: "gse-pack-week8-parlay-sgp",
    gamesCount: 14,
    highlights: [
      "Includes Locked 3-Leg JAX @ BAL TNF Same-Game Parlay + Full Week 9 Sun–Mon SGP Card",
      "Cross-Game High-Conviction Anchor Parlay Baskets (Pairing 88/100 & 85/100 Reads)",
      "Zero Conflicting Legs — Every Ticket Built Around Matching Offensive & Defensive Game Scripts",
    ],
    badge: "PARLAY & SGP PACK · $29",
    includesProps: true,
    includesSgp: true,
    includesDfs: false,
    forSale: true,
    slateWindowLabel: "Week 9 TNF (JAX @ BAL) + Sun–Mon Slate",
    verifiedRecordBanner: "62-23-1 · +26.50u Verified Season Record",
    pullListIntegrityNote: "Zero conflicting legs; active QB/RB injury replacements verified",
    topConfidenceRatings: ["88/100", "86/100", "84/100", "81/100", "79/100"],
  },
  {
    slug: "week8-kicking-1q-1h-pack",
    category: "KICKING_1Q_1H",
    title: "Week 9 Kicking, Special Teams & 1Q / 1H Derivative Pack (TNF + Sun–Mon)",
    subtitle: "1st-Quarter Totals, 1H/2Q Script Calls, Team Totals & Red-Zone Stall Kicker FGM Over 1.5",
    description:
      "Attack early-script scoring and red-zone stalls across Week 9 Thursday Night Football (JAX @ BAL) and the Sunday–Monday window. Combines 1st-Quarter and 1st-Half scripted drive calls, Team Total derivatives, and Kicker Field Goals Made Over 1.5 reads.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 2400,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX400OaIktCGLb",
    stripePriceId: "price_1UVzsfQ2wPZMxx606fYPjKEJ",
    stripeLookupKey: "gse-pack-week8-kicking-1q-1h",
    gamesCount: 14,
    highlights: [
      "Week 9 TNF (JAX @ BAL) & Sunday 1Q / 1H Scripted Drive Calls + Team Total Derivatives (Up to 88/100)",
      "Kicker Field Goals Made Over 1.5 Reads Powered by Red-Zone Stall & 4th-Down Field Goal Tendencies",
      "Includes Fair Line Thresholds & Stadium Wind/Weather Notes for Every Outdoor Venue",
    ],
    badge: "KICKING & 1Q/1H PACK · $24",
    includesProps: true,
    includesSgp: false,
    includesDfs: false,
    forSale: true,
    slateWindowLabel: "Week 9 TNF (JAX @ BAL) + Sun–Mon Slate",
    verifiedRecordBanner: "62-23-1 · +26.50u Verified Season Record",
    pullListIntegrityNote: "All Week 9 outdoor stadiums cross-checked against wind & weather reports",
    topConfidenceRatings: ["88/100", "84/100", "80/100", "77/100", "75/100", "73/100"],
  },
  {
    slug: "week8-sun-mon-dfs-expanded-pack",
    category: "DFS_EXPANDED_CORE",
    title: "RedZone Expanded Week 9 DFS Pack (TNF Showdown + 2 Sunday Optimal Lineups + 14-Player Core)",
    subtitle: "JAX @ BAL Showdown Captain Builds + Sunday Main Slate: 2 Optimal Lineups, 14-Player Core & 20-Max MME",
    description:
      "Built for Week 9 Thursday Night Football Showdown (JAX @ BAL) and the full Sunday–Monday DFS slate. Delivers DraftKings and FanDuel Showdown Captain lineups, 2 Complete Sunday Optimal Lineups (Lineup #1 Cash High-Floor + Lineup #2 Tournament Ceiling), our Expanded 14-Player Position Core (2 QBs, 4 RBs, 4 WRs, 2 TEs, 2 DSTs), and full 588-active-player pool with OUT/IR players zeroed.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 3999,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX400OaIktCGLb",
    stripePriceId: "price_1UWjT2Q2wPZMxx60OrkMpGvF",
    stripeLookupKey: "gse-pack-redzone-dfs-pro-pack",
    gamesCount: 14,
    highlights: [
      "JAX @ BAL Showdown Captain Builds + 2 Complete Sunday Optimal Lineups (Cash High-Floor + Tournament Stack)",
      "Expanded 14-Player Core Pool: 2 QBs, 4 RBs, 4 WRs, 2 TEs & 2 DSTs with Matchup Writeups",
      "Includes 20-Max MME Portfolio + 588-Player Active Pool (Injury Replacements & Role Shifts Audited)",
    ],
    badge: "WEEK 9 EXPANDED DFS · $39.99",
    includesProps: false,
    includesSgp: false,
    includesDfs: true,
    forSale: true,
    slateWindowLabel: "Week 9 TNF Showdown (JAX @ BAL) + Sunday Main Slate",
    verifiedRecordBanner: "62-23-1 · +26.50u Verified Season Record",
    pullListIntegrityNote: "All Week 9 OUT/IR players zeroed across every lineup and player pool",
    topConfidenceRatings: ["88/100", "86/100", "85/100", "84/100"],
    dfsCoreSummary: "TNF Showdown Captains + 2 Sunday Optimal Lineups + 2 QB / 4 RB / 4 WR / 2 TE / 2 DST Core",
  },
  {
    slug: "week8-all-access-gameday-pass",
    category: "ALL_ACCESS_PASS",
    title: "Week 9 All-Access Game-Day Pass (TNF JAX @ BAL + All 6 Packs Included)",
    subtitle: "TNF 10-Play Card + Main Lines + Props + Defense/IDP + Anytime TD + Parlays/SGPs + Kicking/1Q/1H + Full DFS",
    description:
      "Complete one-click access to every single Week 9 pack across Thursday Night Football (JAX @ BAL), Sunday Early/Late, Sunday Night Football (IND @ MIN), and Monday Night Football (TB @ KC), including all specialty packs and the Expanded TNF Showdown + Sunday DFS portfolio.",
    windowSlot: "WEEKLY_PASS",
    standardPriceCents: 4900,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX40T4RNpoNNIp",
    stripePriceId: "price_1UVzsfQ2wPZMxx60ozEJ1P3n",
    stripeLookupKey: "gse-pack-week8-all-access",
    gamesCount: 14,
    highlights: [
      "Unlocks All Week 9 Packs: TNF (JAX @ BAL) + Sunday Main Slate + SNF (IND @ MIN) + MNF (TB @ KC)",
      "10 Top-Confidence TNF Plays (88/100) + Main Lines + Skill/QB Props + Defense/IDP + Anytime TDs + SGPs",
      "Full RedZone DFS Included: JAX @ BAL Showdown Captain Builds + 2 Sunday Optimal Lineups + 14-Player Core",
    ],
    badge: "ALL-ACCESS GAME-DAY PASS · $49",
    includesProps: true,
    includesSgp: true,
    includesDfs: true,
    forSale: true,
    slateWindowLabel: "Week 9 TNF (JAX @ BAL) through Monday Night Football",
    verifiedRecordBanner: "62-23-1 · +26.50u Verified Season Record",
    pullListIntegrityNote: "Verified 62-23-1 (+26.50u) record; all active Week 9 injury reports applied",
    topConfidenceRatings: ["88/100", "88/100", "86/100", "85/100", "84/100", "82/100"],
    dfsCoreSummary: "TNF Showdown Captains + 2 Sunday Optimal Lineups + 2 QB / 4 RB / 4 WR / 2 TE / 2 DST Core",
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

function sanitizeStripeCheckoutText(text: string): string {
  return text
    .replace(/\u2014/g, " - ")
    .replace(/\u2013/g, "-")
    .replace(/\u00b7/g, "|")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Builds the Stripe Checkout Session payload for instant one-time payment.
 * Always embeds live `price_data` from the active Week 9 catalog so Stripe
 * Checkout never displays stale prior-week product titles or mangled punctuation.
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
  let productName = sanitizeStripeCheckoutText(pkg.title);
  const productDescription = sanitizeStripeCheckoutText(pkg.description);

  if (creditBack) {
    if (pkg.creditBackPriceCents === null) {
      throw new Error(`Package '${pkg.slug}' does not offer a credit-back tier.`);
    }
    unitAmount = pkg.creditBackPriceCents;
    productName = `${productName} (Credit-Back)`;
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
            description: productDescription,
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
