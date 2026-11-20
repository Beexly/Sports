/**
 * Pick Package Catalog & Instant Checkout Builder
 *
 * Galaxy Picks (paid) storefront. Backward-compatible Stripe one-time SKUs plus
 * the active Week 11 Whop value ladder ($9 TNF IND @ HOU impulse door, $14
 * Thanksgiving 5-Game SKU, $29 Sunday Full-Slate, $39/mo Pro, $79/mo Elite with
 * the 30-day Positive-CLV Pledge).
 *
 * DOCTRINE & GUARDRAILS:
 * - NEVER render confidence as a percent symbol (always XX/100).
 * - NEVER publish or package any pick where decision === 'PASS' or expectedClv < 0.
 * - Nov 1 Game-Day Pull List (2026-11-01-PULL-LIST.md) enforced: 0 pulled items packaged.
 * - Pure 7-bit ASCII across every exported string.
 */

import {
  TWO_DOOR_PACK_OFFERS,
  POSITIVE_CLV_PLEDGE,
  MEMBERSHIP_PLANS,
} from "./two-door-offers";
import { scrubPackageCopy } from "./copy-fence";
import { verifiedLedger, formatWlp, formatUnits } from "@/lib/ledger/verified-ledger-view";

// Two-door storefront offers (Membership + Single-Slate Packs) are additive
// exports; LIVE_PACKAGE_CATALOG below keeps its exact legacy Stripe shape.
export * from "./two-door-offers";

export interface PickPackageOffering {
  id?: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  // "PRIMETIME" and "SUNDAY_FULL" serve the two-door single-slate packs;
  // legacy values are unchanged for existing consumers.
  windowSlot:
    | "TNF"
    | "SUN_EARLY"
    | "SUN_LATE"
    | "SUN_MAIN"
    | "SNF"
    | "MNF"
    | "WEEKEND_PASS"
    | "WEEKLY_PASS"
    | "PRIMETIME"
    | "SUNDAY_FULL";
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
    | "DEFENSE_IDP"
    | "ANYTIME_TD"
    | "PARLAY_SGP"
    | "KICKING_1Q_1H"
    | "DFS_EXPANDED_CORE"
    | "ALL_ACCESS_PASS";
  slateWindowLabel: string;
  verifiedRecordBanner: string;
  pullListIntegrityNote: string;
  topConfidenceRatings: readonly string[];
  dfsCoreSummary?: string;
}

const WEEK11_SLATE_WINDOW_LABEL =
  "Week 11 - TNF IND @ HOU (Thu) - Sunday Main Slate (Miami at Buffalo, NO @ CHI, TEN @ DAL, TB @ DET, ARI @ KC, PIT @ PHI, BAL @ CAR) - Late (NYJ @ LAC, LV @ DEN, JAX @ NYG) - SNF MIN @ SF - MNF CIN @ WSH";

export const WEEK8_GAME_DAY_CATALOG_METADATA = {
  asOfCt: "2026-11-19T16:15:00-06:00",
  kickoffCountdownMinutes: 180,
  slateWindowLabel: WEEK11_SLATE_WINDOW_LABEL,
  verifiedRecordBanner: `${formatWlp(verifiedLedger.official.wlp)} - ${formatUnits(verifiedLedger.official.units.total)} - recomputed from the settlement database (see /record)`,
  seasonLedgerOfRecord: {
    // ONE ledger, one truth: derived from the same artifact /record renders.
    verifiedRecord: formatWlp(verifiedLedger.official.wlp),
    verifiedUnits: formatUnits(verifiedLedger.official.units.total),
    verifiedWinPct: verifiedLedger.official.gate.unlocked
      ? "unlocked (see /record)"
      : `sealed until ${verifiedLedger.official.gate.target} CLV-backed settled bets`,
    verifiedDisplayBanner: `${formatWlp(verifiedLedger.official.wlp)} - ${formatUnits(verifiedLedger.official.units.total)} - verified record recomputed at /record`,
    calibrationProgress: `${verifiedLedger.official.gate.clvBackedSettled}/${verifiedLedger.official.gate.target}`,
    withGatedPropsRecord: "47-19-1",
    withGatedPropsUnits: "+24.92u",
    supersededPriorSnapshotNote:
      "47-19-1 (+24.92u) was the audited snapshot published 2026-11-02, superseded by the recomputed ledger at /record after the Nov 13 settlement drain. Historical anchor only.",
    voidedBatchNote:
      "Nov 5 historical Week 8 batch voided after Nov 5 engine failure - never a standing record",
  },
  standingRosterRuling: {
    genoSmithTeam: "NYJ",
    mikeEvansTeam: "SF",
    samDarnoldTeam: "SEA",
    aaronRodgersTeam: "PIT",
    dkMetcalfTeam: "PIT",
    davanteAdamsTeam: "LAR",
    stefonDiggsTeam: "WAS",
    oct30Section23IdentityPassVoided: true,
    pullOrderDecision: "PULLED_AND_STRICKEN_NOV1_0801CT",
    pulledContaminatedItems: [
      "NYJ ML -122 (pulled Nov 1 for Oct 30 freeze identity contamination)",
      "NYJ -1.5 (pulled Nov 1 for Oct 30 freeze identity contamination)",
      "Chris Godwin OVER 3.5 Receptions (pulled Nov 1 for Oct 30 freeze identity contamination)",
      "Jets DST in flagship cash lineups (pulled Nov 1 for Oct 30 freeze identity contamination)",
      "Michael Mayer OVER 2.5 Receptions (pulled Nov 1 09:10 CT)",
      "Omar Cooper Jr. Jets-WR exposure in 3 DFS lineups (pulled Nov 1 09:10 CT)",
    ],
  },
  pullListEnforced:
    "All active Week 11 injury designations and IR statuses applied alongside Tank Dell active return and standing roster rulings (Daniel Jones IND QB1, C.J. Stroud HOU QB1)",
  expandedDfsCoreSpec: {
    optimalLineupsCount: 2,
    corePositions: { QB: 2, RB: 4, WR: 4, TE: 2, DST: 2 },
    totalCorePlayers: 14,
    activePoolAudited: 570,
    zeroedOutIrCount: 110,
  },
} as const;

export interface WhopLadderSku {
  readonly slug: string;
  readonly name: string;
  readonly priceLabel: string;
  readonly cadence: "free" | "one-time" | "monthly";
  readonly badge: string;
  readonly summary: string;
}

export const WEEK11_WHOP_SKU_LADDER: readonly WhopLadderSku[] = [
  {
    slug: "open-field-pass",
    name: "Open Field Environment Pass",
    priceLabel: "$0",
    cadence: "free",
    badge: "Free Environment Layer",
    summary:
      "Public game-environment analytics, transparent pass reasoning, and live calculator tools. Zero paid picks leaked.",
  },
  {
    slug: "primetime-showdown-pack",
    name: "Week 11 TNF IND @ HOU + Primetime Impulse Door",
    priceLabel: "$9",
    cadence: "one-time",
    badge: "72h $9 Pro Credit",
    summary:
      "Week 11 TNF IND @ HOU full board plus SNF MIN @ SF and MNF CIN @ WSH, including a 72-hour $9 upgrade credit toward $39/mo Pro.",
  },
  {
    slug: "thanksgiving-5game-pack",
    name: "Week 12 Thanksgiving 5-Game Holiday Pack",
    priceLabel: "$14",
    cadence: "one-time",
    badge: "5-Game Holiday Slate",
    summary:
      "GB @ LAR, CHI @ DET, PHI @ DAL, KC @ BUF, and DEN @ PIT sides, totals, player props, SGPs, and Thanksgiving DFS cores.",
  },
  {
    slug: "sunday-full-slate-pack",
    name: "Week 11 Sunday Full-Slate Pack",
    priceLabel: "$29",
    cadence: "one-time",
    badge: "11 Sunday Games",
    summary:
      "Full 11-game Week 11 Sunday card covering game lines, 360-degree props, correlated parlays, and DraftKings/FanDuel DFS cores.",
  },
  {
    slug: "pro-monthly",
    name: "GSE Pro Membership (Founding Rate)",
    priceLabel: "$39/mo",
    cadence: "monthly",
    badge: "30-Day Positive-CLV Pledge",
    summary:
      "All NFL weekly slates, player props, correlated SGPs, and Classic DFS lineups backed by the 30-Day Positive-CLV Pledge.",
  },
  {
    slug: "elite-monthly",
    name: "GSE Elite Membership (150-Lineup MME + Full Desk)",
    priceLabel: "$79/mo",
    cadence: "monthly",
    badge: "30-Day Positive-CLV Pledge",
    summary:
      "Full 150-lineup MME DFS portfolio, private member channel access, every derivative board, and the 30-Day Positive-CLV Pledge.",
  },
] as const;

export const WEEK11_STOREFRONT_LADDER_CONTEXT = {
  pledge: POSITIVE_CLV_PLEDGE,
  membershipPlans: MEMBERSHIP_PLANS,
  twoDoorOffers: TWO_DOOR_PACK_OFFERS,
  whopSkuLadder: WEEK11_WHOP_SKU_LADDER,
} as const;

export const LIVE_PACKAGE_CATALOG: readonly PickPackageOffering[] = [
  {
    id: "tnf-all-in-pack",
    slug: "tnf-all-in-pack",
    title: "Week 11 TNF Game Pack (Colts @ Texans + 77-Market Board & Showdown DFS)",
    subtitle:
      "Thursday Night Football IND @ HOU (7:15 PM CT): Full 77-Market Price Limits, 5:45 PM CT Inactive Pivot & Showdown Lineups",
    description:
      "Complete Week 11 Thursday Night Football packet for Indianapolis Colts at Houston Texans inside Reliant Stadium. Unlocks full game-script projections, honest Stage 5 pass discipline on main lines, exact play-to odds limits across all 77 DraftKings market families (1Q/1H, QB, RB/WR/TE, Kicking, IDP sacks and tackles, Longest Plays, TD scorers), our 5:45 PM CT Sauce Gardner active/inactive contingency split, and DraftKings Showdown Cash and GPP rosters. Verified record lives at /record.",
    windowSlot: "TNF",
    standardPriceCents: 1900,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX406TulqtZwJJ",
    stripePriceId: "price_1UVzsdQ2wPZMxx60lqO3TLbQ",
    stripeLookupKey: "gse-pack-tnf-all-in",
    gamesCount: 1,
    highlights: [
      "Week 11 TNF IND @ HOU (7:15 PM CT): Complete 77-Market Board with Exact Play-To American Odds Ceilings",
      "5:45 PM CT Sauce Gardner Active/Inactive Game-Script Pivot + Full Injury Impact Read",
      "1Q/1H Derivatives, QB & Skill Props, Kicking, IDP Sacks/Tackles, Longest Plays & Anytime TD Probabilities",
      "DraftKings Showdown Cash & GPP Optimal Lineups with Zero Excluded/Injured Players",
    ],
    badge: "LIVE TONIGHT - TNF IND @ HOU ($19)",
    includesProps: true,
    includesSgp: true,
    includesDfs: true,
    forSale: true,
  },
  {
    id: "sunday-nfl-5pct-slate",
    slug: "sunday-nfl-5pct-slate",
    title:
      "Week 11 Sunday Main Slate (Miami at Buffalo, TEN @ DAL, TB @ DET, PIT @ PHI) & MNF (CIN @ WSH) Best Bets Pack",
    subtitle:
      "Week 11 Sunday Main Slate & Monday Night Football (CIN @ WSH) Spread, Moneyline, 1Q/1H Script & Kicking FGM Calls",
    description:
      "Our complete Week 11 Sunday slate (Miami at Buffalo, NO @ CHI, TEN @ DAL, TB @ DET, ARI @ KC, PIT @ PHI, BAL @ CAR, plus the late window NYJ @ LAC, LV @ DEN, JAX @ NYG), SNF MIN @ SF, and MNF CIN @ WSH game-line and derivative card. Also integrates Week 12 Thanksgiving 5-Game prep and the 30-Day Positive-CLV Pledge. The verified record is recomputed from the settlement database and lives at /record.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 3900,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX400OaIktCGLb",
    stripePriceId: "price_1UVzsfQ2wPZMxx606fYPjKEJ",
    stripeLookupKey: "gse-pack-sunday-nfl-5pct-slate",
    gamesCount: 13,
    highlights: [
      "Week 11 Sunday Main Slate & MNF (CIN @ WSH): Sealed Spread, Moneyline & Total Calls (Up to 85/100)",
      "1Q / 1H / 2Q Opening Script Derivatives + Team Total Over/Under Calls",
      "Kicking & Special Teams Suite: Red-Zone Stall Field Goals Made Over 1.5 Reads",
    ],
    badge: "WEEK 11 SUN-MON - BEST BETS, 1Q/1H & KICKING",
    includesProps: true,
    includesSgp: false,
    includesDfs: false,
    forSale: true,
  },
  {
    id: "sgp-correlation-basket",
    slug: "sgp-correlation-basket",
    title:
      "Week 11 Sunday & MNF Player Props, Anytime TD, Defense/IDP & Correlated Parlay/SGP Pack",
    subtitle:
      "Week 11 Sunday Main Slate (Miami at Buffalo, TEN @ DAL, TB @ DET, PIT @ PHI) & MNF (CIN @ WSH) Skill/QB Props, Anytime TDs, IDP & SGPs",
    description:
      "Built across the Week 11 Sunday Main Slate (Miami at Buffalo, NO @ CHI, TEN @ DAL, TB @ DET, ARI @ KC, PIT @ PHI, BAL @ CAR) & MNF CIN @ WSH. Unlocks our top-rated Skill and Quarterback Player Props (up to 86/100), Inside-the-5 Goal-Line Anytime Touchdown plays, Linebacker Tackle-Funnel and Edge Sack props, and correlated Same-Game Parlay tickets built around real offensive and defensive scripts.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 2900,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX40XMRjV4FiJl",
    stripePriceId: "price_1UVzseQ2wPZMxx60VqAfAyNe",
    stripeLookupKey: "gse-pack-sgp-correlation-basket",
    gamesCount: 13,
    highlights: [
      "Sealed Skill & QB Player Props Across Week 11 Sunday Main Slate & MNF (CIN @ WSH)",
      "Anytime Touchdown Pack: Inside-the-5 Goal-Line Bellcow TD Reads",
      "Defense & IDP Pack: Linebacker Tackle-Funnel & Edge Rush Sack Props",
      "Correlated Parlay & SGP Pack: 2-Leg & 3-Leg Game-Script Tickets with Zero Conflicting Legs",
    ],
    badge: "PROPS - ANYTIME TD - DEFENSE - PARLAYS",
    includesProps: true,
    includesSgp: true,
    includesDfs: false,
    forSale: true,
  },
  {
    id: "redzone-dfs-pro-pack",
    slug: "redzone-dfs-pro-pack",
    title: "RedZone Standalone Week 11 Sunday & MNF DFS Pro Pack (Optimal Lineups & Core Pool)",
    subtitle:
      "Week 11 Sunday Main Slate (IND @ HOU follow-on, TEN @ DAL, TB @ DET) & MNF (CIN @ WSH): 2 Optimal Lineups (Cash & GPP) + 14-Player Core Pool",
    description:
      "Our complete standalone Week 11 Daily Fantasy (DFS) package on the unified RedZone site for the Week 11 Sunday Main Slate & MNF (CIN @ WSH). Includes Optimal Lineup #1 (High-Floor Cash/Double-Up), Optimal Lineup #2 (GPP Tournament Leverage Stack), our 14-Player Position Core (2 QB, 4 RB, 4 WR, 2 TE, 2 DST with full coaching and matchup writeups), and our injury-adjusted active player pool.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 3999,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX400OaIktCGLb",
    stripePriceId: "price_1UWjT2Q2wPZMxx60OrkMpGvF",
    stripeLookupKey: "gse-pack-redzone-dfs-pro-pack",
    gamesCount: 13,
    highlights: [
      "2 Week 11 Sunday Main Slate Optimal Lineups (Cash High-Floor + GPP Correlated Stack) + SNF/MNF Primetime Builds",
      "14-Player Position Core Pool (2 QBs, 4 RBs, 4 WRs, 2 TEs, 2 DSTs + Coaching Writeups)",
      "Complete Active-Player Pool with Injury Replacements & Role Shifts Audited",
    ],
    badge: "REDZONE STANDALONE DFS - $39.99",
    includesProps: false,
    includesSgp: false,
    includesDfs: true,
    forSale: true,
  },
  {
    id: "week8-all-access",
    slug: "week8-all-access",
    title:
      "Week 11 All-Access Bundle (Sunday Main Slate TEN @ DAL, TB @ DET, PIT @ PHI + MNF CIN @ WSH + Full DFS)",
    subtitle:
      "Every Week 11 Sunday & MNF Pack Included + 30-Day Positive-CLV Pledge Alignment",
    description:
      "Unlock every single Week 11 pack across the Week 11 Sunday Main Slate & Monday Night Football (CIN @ WSH) in one click: Sunday/MNF Main Game Lines, Skill/QB Props, Defense & IDP Pack, Anytime Touchdown Pack, Correlated Parlay & SGP Pack, Kicking & 1Q/1H Derivative Pack, AND the complete RedZone DFS Portfolio (plus upcoming Pro and Elite membership tiers on Whop). The verified record is recomputed from the settlement database and lives at /record.",
    windowSlot: "WEEKLY_PASS",
    standardPriceCents: 4900,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX40T4RNpoNNIp",
    stripePriceId: "price_1UVzsfQ2wPZMxx60ozEJ1P3n",
    stripeLookupKey: "gse-pack-week8-all-access",
    gamesCount: 13,
    highlights: [
      "All Week 11 Games Included: TNF (IND @ HOU) + Sunday Main Slate + Late Window (NYJ @ LAC, LV @ DEN, JAX @ NYG) + SNF (MIN @ SF) + MNF (CIN @ WSH)",
      "Every Pack Included: Main Lines, Skill/QB Props, Defense/IDP, Anytime TD, SGPs & Kicking/1Q/1H Derivatives",
      "Full RedZone DFS Included: 2 Sunday Optimal Lineups + 14-Player Core + SNF/MNF Primetime Builds",
    ],
    badge: "WEEK 11 ALL-ACCESS VIP - SUN-MON + DFS",
    includesProps: true,
    includesSgp: true,
    includesDfs: true,
    forSale: true,
  },
];

export const WEEK8_SPECIALTY_PACK_TIERS: readonly SpecialtyPackTier[] = [
  {
    id: "week8-defense-idp-pack",
    slug: "week8-defense-idp-pack",
    category: "DEFENSE_IDP",
    title: "Week 11 Defense & IDP Tackle/Sack Pack (Sunday Main Slate & MNF)",
    subtitle:
      "8 LB Tackle-Funnel & Edge Sack Plays + 2 Core Week 11 DST Units Across TNF IND @ HOU, Sunday Main & MNF CIN @ WSH",
    description:
      "Dedicated Defense, Special Teams & Individual Defensive Player (IDP) pack across the Week 11 Sunday Main Slate & Monday Night Football (CIN @ WSH). Built from opponent play-volume tackle funnels, offensive line pass-protection splits, and our 2 sealed Week 11 DFS DST units.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 1900,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX406TulqtZwJJ",
    stripePriceId: "price_1UVzsdQ2wPZMxx60lqO3TLbQ",
    stripeLookupKey: "gse-pack-week8-defense-idp",
    gamesCount: 13,
    highlights: [
      "8 LB Tackle-Funnel & Edge Sack Props Across Week 11 Sunday Main Slate & MNF (CIN @ WSH)",
      "Headlined by High-Conviction Linebacker Tackle & Pass-Rush Sack Reads (Up to 86/100)",
      "Includes Our 2 Core Week 11 Defense/ST Units + Trench Protection Mismatch Notes",
    ],
    badge: "DEFENSE & IDP PACK - $19",
    includesProps: true,
    includesSgp: false,
    includesDfs: true,
    forSale: true,
    slateWindowLabel: WEEK11_SLATE_WINDOW_LABEL,
    verifiedRecordBanner: WEEK8_GAME_DAY_CATALOG_METADATA.verifiedRecordBanner,
    pullListIntegrityNote: "All active defensive & offensive line injury designations verified",
    topConfidenceRatings: ["86/100", "84/100", "81/100", "78/100", "75/100", "72/100"],
  },
  {
    id: "week8-anytime-td-pack",
    slug: "week8-anytime-td-pack",
    category: "ANYTIME_TD",
    title: "Week 11 Anytime Touchdown & Goal-Line Pack (Sunday Main Slate & MNF)",
    subtitle:
      "Inside-the-5 Bellcow & Red-Zone Target Anytime TD Plays Across Week 11 Sunday Main & MNF CIN @ WSH",
    description:
      "Dedicated Anytime Touchdown Scorer pack across the Week 11 Sunday Main Slate & Monday Night Football (CIN @ WSH). Isolates red-zone and inside-the-5 carry and target roles where goal-line volume is concentrated.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 2400,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX40XMRjV4FiJl",
    stripePriceId: "price_1UVzseQ2wPZMxx60VqAfAyNe",
    stripeLookupKey: "gse-pack-week8-anytime-td",
    gamesCount: 13,
    highlights: [
      "Inside-the-5 Goal-Line & Red-Zone Anytime TD Plays Across Week 11 Sunday Main Slate & MNF",
      "Top Anytime TD Confidence Ratings: 86/100, 85/100, 82/100, 79/100 & 76/100",
      "Includes Fair Price vs Sportsbook Price Thresholds & Red-Zone Play-Calling Splits",
    ],
    badge: "ANYTIME TD PACK - $24",
    includesProps: true,
    includesSgp: false,
    includesDfs: false,
    forSale: true,
    slateWindowLabel: WEEK11_SLATE_WINDOW_LABEL,
    verifiedRecordBanner: WEEK8_GAME_DAY_CATALOG_METADATA.verifiedRecordBanner,
    pullListIntegrityNote: "All Week 11 RB/TE injury replacements and goal-line roles applied",
    topConfidenceRatings: ["86/100", "85/100", "82/100", "79/100", "76/100", "74/100"],
  },
  {
    id: "week8-parlay-sgp-pack",
    slug: "week8-parlay-sgp-pack",
    category: "PARLAY_SGP",
    title: "Week 11 Correlated Parlay & Same-Game Parlay Pack (Sunday Main Slate & MNF)",
    subtitle:
      "Week 11 Sunday Main Slate & MNF (CIN @ WSH) 2-Leg & 3-Leg Correlated Game-Script Parlays",
    description:
      "Built for correlated multi-leg tickets where every leg fits the exact same game script. Pairs Sides, Totals, Skill/QB Props, Anytime TDs, and 1Q/1H derivatives across the Week 11 Sunday Main Slate & Monday Night Football (CIN @ WSH).",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 2900,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX40XMRjV4FiJl",
    stripePriceId: "price_1UVzseQ2wPZMxx60VqAfAyNe",
    stripeLookupKey: "gse-pack-week8-parlay-sgp",
    gamesCount: 13,
    highlights: [
      "Includes Full Week 11 Sunday Main Slate & MNF (CIN @ WSH) Correlated SGP Card",
      "Cross-Game High-Conviction Anchor Parlay Baskets (Pairing 86/100 & 85/100 Reads)",
      "Zero Conflicting Legs - Every Ticket Built Around Matching Offensive & Defensive Game Scripts",
    ],
    badge: "PARLAY & SGP PACK - $29",
    includesProps: true,
    includesSgp: true,
    includesDfs: false,
    forSale: true,
    slateWindowLabel: WEEK11_SLATE_WINDOW_LABEL,
    verifiedRecordBanner: WEEK8_GAME_DAY_CATALOG_METADATA.verifiedRecordBanner,
    pullListIntegrityNote: "Zero conflicting legs; active QB/RB injury replacements verified",
    topConfidenceRatings: ["86/100", "85/100", "84/100", "81/100", "79/100"],
  },
  {
    id: "week8-kicking-1q-1h-pack",
    slug: "week8-kicking-1q-1h-pack",
    category: "KICKING_1Q_1H",
    title: "Week 11 Kicking, Special Teams & 1Q / 1H Derivative Pack (Sunday Main Slate & MNF)",
    subtitle:
      "1st-Quarter Totals, 1H/2Q Script Calls, Team Totals & Red-Zone Stall Kicker FGM Over 1.5",
    description:
      "Attack early-script scoring and red-zone stalls across the Week 11 Sunday Main Slate & Monday Night Football (CIN @ WSH). Combines 1st-Quarter and 1st-Half scripted drive calls, Team Total derivatives, and Kicker Field Goals Made Over 1.5 reads.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 2400,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX400OaIktCGLb",
    stripePriceId: "price_1UVzsfQ2wPZMxx606fYPjKEJ",
    stripeLookupKey: "gse-pack-week8-kicking-1q-1h",
    gamesCount: 13,
    highlights: [
      "Week 11 Sunday Main Slate & MNF (CIN @ WSH) 1Q / 1H Scripted Drive Calls + Team Total Derivatives",
      "Kicker Field Goals Made Over 1.5 Reads Powered by Red-Zone Stall & 4th-Down Field Goal Tendencies",
      "Includes Fair Line Thresholds & Stadium Wind/Weather Notes for Every Outdoor Venue",
    ],
    badge: "KICKING & 1Q/1H PACK - $24",
    includesProps: true,
    includesSgp: false,
    includesDfs: false,
    forSale: true,
    slateWindowLabel: WEEK11_SLATE_WINDOW_LABEL,
    verifiedRecordBanner: WEEK8_GAME_DAY_CATALOG_METADATA.verifiedRecordBanner,
    pullListIntegrityNote: "All Week 11 outdoor stadiums cross-checked against wind & weather reports",
    topConfidenceRatings: ["85/100", "84/100", "80/100", "77/100", "75/100", "73/100"],
  },
  {
    id: "week8-sun-mon-dfs-expanded-pack",
    slug: "week8-sun-mon-dfs-expanded-pack",
    category: "DFS_EXPANDED_CORE",
    title: "RedZone Expanded Week 11 DFS Pack (2 Sunday Optimal Lineups + 14-Player Core + SNF/MNF)",
    subtitle:
      "Week 11 Sunday Main Slate & MNF (CIN @ WSH): 2 Optimal Lineups, 14-Player Core & 150-Max MME",
    description:
      "Built for the Week 11 Sunday Main Slate & Monday Night Football (CIN @ WSH) DFS slate. Delivers 2 Complete Sunday Optimal Lineups (Lineup #1 Cash High-Floor + Lineup #2 Tournament Ceiling), SNF/MNF Primetime builds, our Expanded 14-Player Position Core (2 QBs, 4 RBs, 4 WRs, 2 TEs, 2 DSTs), and full active player pool with OUT/IR players zeroed.",
    windowSlot: "SUN_MAIN",
    standardPriceCents: 3999,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX400OaIktCGLb",
    stripePriceId: "price_1UWjT2Q2wPZMxx60OrkMpGvF",
    stripeLookupKey: "gse-pack-redzone-dfs-pro-pack",
    gamesCount: 13,
    highlights: [
      "2 Complete Week 11 Sunday Optimal Lineups (Cash High-Floor + Tournament Stack) + SNF/MNF Primetime Builds",
      "Expanded 14-Player Core Pool: 2 QBs, 4 RBs, 4 WRs, 2 TEs & 2 DSTs with Matchup Writeups",
      "Includes 150-Max Elite MME Portfolio + Active Pool (Injury Replacements & Role Shifts Audited)",
    ],
    badge: "WEEK 11 EXPANDED DFS - $39.99",
    includesProps: false,
    includesSgp: false,
    includesDfs: true,
    forSale: true,
    slateWindowLabel: WEEK11_SLATE_WINDOW_LABEL,
    verifiedRecordBanner: WEEK8_GAME_DAY_CATALOG_METADATA.verifiedRecordBanner,
    pullListIntegrityNote: "All Week 11 OUT/IR players zeroed across every lineup and player pool",
    topConfidenceRatings: ["86/100", "85/100", "84/100", "83/100"],
    dfsCoreSummary:
      "2 Sunday Optimal Lineups + SNF/MNF Primetime Builds + 2 QB / 4 RB / 4 WR / 2 TE / 2 DST Core",
  },
  {
    id: "week8-all-access-gameday-pass",
    slug: "week8-all-access-gameday-pass",
    category: "ALL_ACCESS_PASS",
    title: "Week 11 All-Access Game-Day Pass (Sunday Main Slate & MNF - All Packs Included)",
    subtitle:
      "Sunday & MNF Main Lines + Props + Defense/IDP + Anytime TD + Parlays/SGPs + Kicking/1Q/1H + Full DFS",
    description:
      "Complete one-click access to every single Week 11 pack across the Sunday Main Slate, the late window (NYJ @ LAC, LV @ DEN, JAX @ NYG), Sunday Night Football (MIN @ SF), and Monday Night Football (CIN @ WSH), including all specialty packs and the Expanded Sunday & MNF DFS portfolio.",
    windowSlot: "WEEKLY_PASS",
    standardPriceCents: 4900,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX40T4RNpoNNIp",
    stripePriceId: "price_1UVzsfQ2wPZMxx60ozEJ1P3n",
    stripeLookupKey: "gse-pack-week8-all-access",
    gamesCount: 13,
    highlights: [
      "Unlocks All Week 11 Packs: Sunday Main Slate + Late Window (NYJ @ LAC, LV @ DEN, JAX @ NYG) + SNF (MIN @ SF) + MNF (CIN @ WSH)",
      "Main Lines + Skill/QB Props + Defense/IDP + Anytime TDs + Correlated SGPs + Kicking/1Q/1H Derivatives",
      "Full RedZone DFS Included: 2 Sunday Optimal Lineups + 14-Player Core + SNF/MNF Primetime Builds",
    ],
    badge: "ALL-ACCESS GAME-DAY PASS - $49",
    includesProps: true,
    includesSgp: true,
    includesDfs: true,
    forSale: true,
    slateWindowLabel: WEEK11_SLATE_WINDOW_LABEL,
    verifiedRecordBanner: WEEK8_GAME_DAY_CATALOG_METADATA.verifiedRecordBanner,
    pullListIntegrityNote:
      "Record recomputed from the settlement database at /record; all active Week 11 injury reports applied",
    topConfidenceRatings: ["86/100", "85/100", "84/100", "83/100", "82/100", "81/100"],
    dfsCoreSummary:
      "2 Sunday Optimal Lineups + SNF/MNF Primetime Builds + 2 QB / 4 RB / 4 WR / 2 TE / 2 DST Core",
  },
];

export const ACTIVE_FOR_SALE_PACKAGE_CATALOG: readonly PickPackageOffering[] =
  LIVE_PACKAGE_CATALOG.filter((pkg) => pkg.forSale !== false);

export const ACTIVE_FOR_SALE_SPECIALTY_PACK_TIERS: readonly SpecialtyPackTier[] =
  WEEK8_SPECIALTY_PACK_TIERS.filter((pkg) => pkg.forSale !== false);

export function getActiveForSalePackages(): PickPackageOffering[] {
  return LIVE_PACKAGE_CATALOG.filter((pkg) => pkg.forSale !== false);
}

export function getActiveForSaleSpecialtyPacks(): SpecialtyPackTier[] {
  return WEEK8_SPECIALTY_PACK_TIERS.filter((pkg) => pkg.forSale !== false);
}

const PACKAGE_SLUG_ALIASES: Record<string, string> = {
  "sunday-afternoon-slate-pack": "sunday-nfl-5pct-slate",
  "week-8-all-access-bundle": "week8-all-access",
  "redzone-dfs-pro-pack": "week8-sun-mon-dfs-expanded-pack",
  "defense-pack": "week8-defense-idp-pack",
  "anytime-td-pack": "week8-anytime-td-pack",
  "parlay-pack": "week8-parlay-sgp-pack",
  "kicking-1q-1h-pack": "week8-kicking-1q-1h-pack",
};

/** Resolves legacy catalog + specialty packs AND the two-door Whop offers. */
export function getPackageBySlug(slug: string): PickPackageOffering | undefined {
  const canonical = PACKAGE_SLUG_ALIASES[slug] ?? slug;
  return (
    LIVE_PACKAGE_CATALOG.find((p) => p.slug === canonical) ??
    WEEK8_SPECIALTY_PACK_TIERS.find((p) => p.slug === canonical) ??
    TWO_DOOR_PACK_OFFERS.find((p) => p.slug === canonical)
  );
}

export interface StripeCheckoutPayload {
  mode: "payment";
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
 * Always embeds live `price_data` from the active Week 11 catalog so Stripe
 * Checkout never displays stale prior-week product titles or mangled punctuation.
 */
export function buildStripePackageCheckoutPayload(
  pkg: PickPackageOffering,
  creditBack: boolean,
  buyerEmail?: string,
  origin?: string,
  returnToStorefront?: boolean,
): StripeCheckoutPayload {
  // Whop offers carry empty Stripe ids and must never enter the Stripe path.
  if (!pkg.stripePriceId) {
    throw new Error(
      `Package '${pkg.slug}' has no Stripe price - it is a Whop-checkout offer.`,
    );
  }

  let unitAmount = pkg.standardPriceCents;
  let productName = sanitizeStripeCheckoutText(pkg.title);
  // Public-copy fence: Stripe Checkout is customer-facing, so legacy record
  // banners / win rates are scrubbed and replaced with a /record pointer.
  const productDescription = sanitizeStripeCheckoutText(scrubPackageCopy(pkg.description));

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
