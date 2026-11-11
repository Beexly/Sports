/**
 * Pick Package Catalog & Instant Checkout Builder (Week 10 Active Roll + Glass Ledger Reconciled)
 *
 * DOCTRINE & GUARDRAILS:
 * - NEVER render confidence as a percent symbol (always XX/100).
 * - NEVER publish or package any pick where decision === 'PASS' or expectedClv < 0.
 * - NEVER sell a finished game or expired week: every pack carries `kickoffUtc` and auto-closes once `now >= kickoffUtc`.
 * - NEVER leak internal repo paths (`data/dfs/...`) or unbacked win-rate percentage headlines on public surfaces.
 */

import { isWindowOpenBeforeKickoff } from "@/lib/live-board/current-slate-loader";

export interface PickPackageOffering {
  id?: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  windowSlot: 'TNF' | 'SUN_EARLY' | 'SUN_LATE' | 'SUN_MAIN' | 'SNF' | 'MNF' | 'WEEKEND_PASS' | 'WEEKLY_PASS';
  kickoffUtc?: string;
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
  whopCheckoutUrl?: string;
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

export interface B2BGlassLedgerOffering {
  slug: string;
  title: string;
  priceDisplay: string;
  billingTerm: string;
  description: string;
  deliverables: readonly string[];
}

export const B2B_GLASS_LEDGER_TIERS: readonly B2BGlassLedgerOffering[] = [
  {
    slug: "b2b-creator-glass-ledger-pilot",
    title: "Verified by Glass Ledger — Creator & Syndicate Pilot",
    priceDisplay: "$99",
    billingTerm: "one-time 30-day pilot (clean B2B SaaS)",
    description:
      "Pre-kickoff SHA-256 Merkle timestamping via POST /api/gse/v1/truth/commit, automated post-game settlement grading, and an embeddable public verification scorecard.",
    deliverables: [
      "Pre-kickoff SHA-256 Merkle commitment receipts (HTTP 409 post-kickoff cutoff)",
      "Automated box-score settlement & public recompute script verification",
      "Embeddable Glass Ledger badge showing wins, losses, pushes, and sample size n",
    ],
  },
  {
    slug: "b2b-enterprise-sheaf-integrity-audit",
    title: "72-Hour Multi-System Entity & Ledger Integrity Audit",
    priceDisplay: "$2,500",
    billingTerm: "fixed-scope enterprise diagnostic",
    description:
      "Runs our Cellular Repair Calculus (CRC) and sheaf-cohomology consistency engine across your exported CSV/Parquet tables (CRM, payments, warehouse, risk SoT) to isolate entities that agree across operational systems while diverging from your source-of-truth ledger.",
    deliverables: [
      "Ranked fraud/drift candidate table (self_consistent_wrong_vs_ledger vs noise)",
      "Exact minimal edge-cut repair plan & per-system contradiction breakdown",
      "Reproducible Python verification receipt on your schema extract",
    ],
  },
] as const;

export const WEEK10_TNF_KICKOFF_UTC = "2026-11-13T01:15:00Z";
export const WEEK10_SUN_MAIN_KICKOFF_UTC = "2026-11-15T18:00:00Z";
export const WEEK10_MNF_KICKOFF_UTC = "2026-11-17T01:15:00Z";

export const WEEK8_GAME_DAY_CATALOG_METADATA = {
  asOfCt: "2026-11-11T00:00:00-06:00",
  activeWeek: 10,
  kickoffCountdownMinutes: 2880,
  slateWindowLabel:
    "Week 10 Thursday Night Football (WSH @ NYG), Sunday Main Slate (NE @ DET, BUF @ IND, DEN @ KC, SF @ TB, PHI @ DAL) & Primetime (DET @ HOU, LAC @ BAL)",
  verifiedRecordBanner:
    "Weeks 8-9 Staked 43-17-1 (+22.20u, n=61) · Week 8 Staked 36-13-1 (+20.14u, n=50) · Week 8 All-In 47-19-1 (+24.92u, n=67)",
  seasonLedgerOfRecord: {
    verifiedRecord: "47-19-1",
    verifiedUnits: "+24.92u",
    verifiedWinPct: "n=67 graded",
    verifiedDisplayBanner:
      "Week 8 Staked 36-13-1 (+20.14u, n=50) · Week 8 Base 38-13-1 (+22.85u, n=52) · Week 8 All-In 47-19-1 (+24.92u, n=67) · Weeks 8-9 Staked 43-17-1 (+22.20u, n=61)",
    stakedMainRecord: "36-13-1",
    stakedMainUnits: "+20.14u",
    weeks8To9StakedRecord: "43-17-1",
    weeks8To9StakedUnits: "+22.20u",
    weeks8To9AllInRecord: "54-23-1",
    weeks8To9AllInUnits: "+26.98u",
    baseRecord: "38-13-1",
    baseUnits: "+22.85u",
    withGatedPropsRecord: "47-19-1",
    withGatedPropsUnits: "+24.92u",
    voidedBatchNote:
      "Nov 5 historical Week 8 batch voided after Nov 5 engine failure — never a standing record",
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
    "All active Week 10 injury reports, offensive/defensive line protection splits, and standing roster rulings (Geno Smith NYJ, Mike Evans SF, Sam Darnold SEA, Aaron Rodgers PIT, DK Metcalf PIT, Davante Adams LAR, Stefon Diggs WAS) verified",
  expandedDfsCoreSpec: {
    optimalLineupsCount: 2,
    corePositions: { QB: 2, RB: 4, WR: 4, TE: 2, DST: 2 },
    totalCorePlayers: 14,
    activePoolAudited: 570,
    zeroedOutIrCount: 86,
  },
} as const;

export const LIVE_PACKAGE_CATALOG: readonly PickPackageOffering[] = [
  {
    id: "tnf-all-in-pack",
    slug: "tnf-all-in-pack",
    title: "Week 10 Thursday Night Football Standalone Pack (Washington @ NY Giants)",
    subtitle:
      "Complete WSH @ NYG (Event 401873052) Side, Total, 1Q/1H Script, Player Props, Correlated SGP & Showdown DFS",
    description:
      "Our complete Week 10 Thursday Night Football standalone game pack for Washington Commanders at New York Giants (MetLife Stadium). Includes our pre-kickoff SHA-256 Merkle-sealed side and total evaluation, 1st-Quarter and 1st-Half scripted drive calls, Jayden Daniels and J.J. McCarthy passing/rushing props, correlated Same-Game Parlay ticket, and Showdown Captain DFS lineup core. Every pick is tracked on our public Glass Ledger (Weeks 8-9 staked 43-17-1 +22.20u, Week 8 all-in 47-19-1 +24.92u). One-time purchase; closes automatically at kickoff.",
    windowSlot: "TNF",
    kickoffUtc: WEEK10_TNF_KICKOFF_UTC,
    standardPriceCents: 1900,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX406TulqtZwJJ",
    stripePriceId: "price_1UVzsdQ2wPZMxx60lqO3TLbQ",
    stripeLookupKey: "gse-pack-tnf-all-in",
    gamesCount: 1,
    highlights: [
      "Week 10 Thursday Night Football (Washington @ NY Giants): Pre-Kickoff Sealed Side, Total & 1Q/1H Script",
      "Full WSH @ NYG Player Props Suite (QB Passing/Rushing, WR/TE Target Share & Anytime TD Reads)",
      "Correlated WSH @ NYG Same-Game Parlay + DraftKings Showdown Captain & Cash Core",
    ],
    badge: "WEEK 10 TNF · WSH @ NYG · $19",
    includesProps: true,
    includesSgp: true,
    includesDfs: true,
    forSale: isWindowOpenBeforeKickoff(WEEK10_TNF_KICKOFF_UTC),
    whopProductId: "whop_gse_week10_tnf_wsh_nyg",
  },
  {
    id: "sunday-nfl-5pct-slate",
    slug: "sunday-nfl-5pct-slate",
    title: "Week 10 Sunday Main Slate (NE @ DET, BUF @ IND, DEN @ KC, SF @ TB, PHI @ DAL) & MNF Best Bets Pack",
    subtitle: "Every Week 10 Sunday & Monday Spread, Moneyline, 1Q/1H Script & Kicking FGM Call",
    description:
      "Our complete Week 10 Sunday Main Slate and Primetime (DET @ HOU SNF, LAC @ BAL MNF) game-line and derivative card across all 14 NFL Week 10 matchups. Includes our highest-conviction Spread, Moneyline, and Total calls, 1st-Quarter and 1st-Half script plays, and our Red-Zone Stall Kicker Field Goals Made Over 1.5 suite. Every pick is recorded on our public Glass Ledger (Weeks 8-9 staked 43-17-1 +22.20u, Week 8 all-in 47-19-1 +24.92u). One-time purchase; no recurring billing.",
    windowSlot: "SUN_MAIN",
    kickoffUtc: WEEK10_SUN_MAIN_KICKOFF_UTC,
    standardPriceCents: 3900,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX400OaIktCGLb",
    stripePriceId: "price_1UVzsfQ2wPZMxx606fYPjKEJ",
    stripeLookupKey: "gse-pack-sunday-nfl-5pct-slate",
    gamesCount: 14,
    highlights: [
      "Week 10 Sunday & MNF Slate (NE @ DET, BUF @ IND, DEN @ KC, SF @ TB, PHI @ DAL): Spread, ML & Total Calls",
      "1Q / 1H / 2Q Opening Script Derivatives + Team Total Over/Under Calls",
      "Kicking & Special Teams Suite: Red-Zone Stall Field Goals Made Over 1.5 Reads",
    ],
    badge: "WEEK 10 SUN–MON · BEST BETS, 1Q/1H & KICKING",
    includesProps: true,
    includesSgp: false,
    includesDfs: false,
    forSale: isWindowOpenBeforeKickoff(WEEK10_SUN_MAIN_KICKOFF_UTC),
    whopProductId: "whop_gse_week10_sunday_main_slate",
  },
  {
    id: "sgp-correlation-basket",
    slug: "sgp-correlation-basket",
    title: "Week 10 Player Props, Anytime TD, Defense/IDP & Correlated Parlay/SGP Pack",
    subtitle: "Week 10 TNF (WSH @ NYG), Sunday Main Slate & MNF Skill/QB Props, Anytime TDs, IDP & SGPs",
    description:
      "Built across all 14 Week 10 NFL matchups starting with Washington @ NY Giants TNF through Sunday Main Slate (NE @ DET, BUF @ IND, DEN @ KC, SF @ TB, PHI @ DAL) and Monday Night Football. Unlocks our top-rated Skill and Quarterback Player Props, Inside-the-5 Goal-Line Anytime Touchdown plays, Linebacker Tackle-Funnel and Edge Sack props, and 2-Leg & 3-Leg Correlated Same-Game Parlay tickets built around conserved offensive and defensive game scripts.",
    windowSlot: "SUN_MAIN",
    kickoffUtc: WEEK10_MNF_KICKOFF_UTC,
    standardPriceCents: 2900,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX40XMRjV4FiJl",
    stripePriceId: "price_1UVzseQ2wPZMxx60VqAfAyNe",
    stripeLookupKey: "gse-pack-sgp-correlation-basket",
    gamesCount: 14,
    highlights: [
      "Skill & QB Player Props Across Week 10 TNF (WSH @ NYG), Sunday Main Slate & MNF",
      "Anytime Touchdown Pack: Inside-the-5 Goal-Line Bellcow TD Reads",
      "Defense & IDP Pack: Linebacker Tackle-Funnel & Edge Rush Sack Props",
      "Correlated Parlay & SGP Pack: 2-Leg & 3-Leg Game-Script Tickets with Zero Conflicting Legs",
    ],
    badge: "WEEK 10 PROPS · ANYTIME TD · DEFENSE · PARLAYS",
    includesProps: true,
    includesSgp: true,
    includesDfs: false,
    forSale: isWindowOpenBeforeKickoff(WEEK10_MNF_KICKOFF_UTC),
    whopProductId: "whop_gse_week10_props_sgp_basket",
  },
  {
    id: "redzone-dfs-pro-pack",
    slug: "redzone-dfs-pro-pack",
    title: "RedZone Standalone Week 10 DFS Pro Pack (Optimal Lineups & 14-Player Core Pool)",
    subtitle: "Week 10 TNF Showdown (WSH @ NYG), Sunday Main Slate & Primetime: 2 Optimal Lineups + 14-Player Core",
    description:
      "Our complete standalone Week 10 Daily Fantasy (DFS) package for DraftKings and FanDuel across Thursday Night Football (WSH @ NYG), the Week 10 Sunday Main Slate, and Primetime. Includes Optimal Lineup #1 (High-Floor Cash/Double-Up), Optimal Lineup #2 (GPP Tournament Leverage Stack), our 14-Player Position Core (2 QB, 4 RB, 4 WR, 2 TE, 2 DST with full coaching and matchup writeups), and our injury-adjusted active player pool with browser-ready CSV lineup exports.",
    windowSlot: "SUN_MAIN",
    kickoffUtc: WEEK10_MNF_KICKOFF_UTC,
    standardPriceCents: 3999,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX400OaIktCGLb",
    stripePriceId: "price_1UWjT2Q2wPZMxx60OrkMpGvF",
    stripeLookupKey: "gse-pack-redzone-dfs-pro-pack",
    gamesCount: 14,
    highlights: [
      "2 Week 10 Sunday Main Slate Optimal Lineups (Cash High-Floor + GPP Correlated Stack) + TNF/SNF/MNF Primetime Builds",
      "14-Player Position Core Pool (2 QBs, 4 RBs, 4 WRs, 2 TEs, 2 DSTs + Coaching Writeups)",
      "Complete 570-Active-Player Pool with Injury Replacements & Role Shifts Audited",
    ],
    badge: "WEEK 10 REDZONE STANDALONE DFS · $39.99",
    includesProps: false,
    includesSgp: false,
    includesDfs: true,
    forSale: isWindowOpenBeforeKickoff(WEEK10_MNF_KICKOFF_UTC),
    whopProductId: "whop_gse_week10_redzone_dfs_pro",
  },
  {
    id: "week8-all-access",
    slug: "week8-all-access",
    title: "Week 10 All-Access Bundle (TNF WSH @ NYG + Sunday Main Slate + SNF/MNF + Full RedZone DFS)",
    subtitle: "Every Week 10 Pack Included: TNF, Sunday/MNF Main Lines, Props, SGPs, Specialty Packs & Full DFS",
    description:
      "Unlock every single Week 10 pack across all 14 NFL matchups (starting with Thursday Night Football WSH @ NYG through Sunday Main Slate and Monday Night Football) in one click: Main Game Lines, Skill/QB Props, Defense & IDP Pack, Anytime Touchdown Pack, Correlated Parlay & SGP Pack, Kicking & 1Q/1H Derivative Pack, AND the complete RedZone DFS Portfolio. Tracked on our public Glass Ledger (Weeks 8-9 staked 43-17-1 +22.20u, Week 8 all-in 47-19-1 +24.92u). One-time purchase; zero recurring charges.",
    windowSlot: "WEEKLY_PASS",
    kickoffUtc: WEEK10_MNF_KICKOFF_UTC,
    standardPriceCents: 4900,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX40T4RNpoNNIp",
    stripePriceId: "price_1UVzsfQ2wPZMxx60ozEJ1P3n",
    stripeLookupKey: "gse-pack-week8-all-access",
    gamesCount: 14,
    highlights: [
      "All 14 Week 10 Games Included: TNF (WSH @ NYG) + Sunday Main Slate (NE @ DET, DEN @ KC, PHI @ DAL) + SNF/MNF",
      "Every Pack Included: Main Lines, Skill/QB Props, Defense/IDP, Anytime TD, SGPs & Kicking/1Q/1H Derivatives",
      "Full RedZone DFS Included: 2 Sunday Optimal Lineups + 14-Player Core + TNF/SNF/MNF Primetime Builds",
    ],
    badge: "WEEK 10 ALL-ACCESS VIP · ALL 14 GAMES + DFS",
    includesProps: true,
    includesSgp: true,
    includesDfs: true,
    forSale: isWindowOpenBeforeKickoff(WEEK10_MNF_KICKOFF_UTC),
    whopProductId: "whop_gse_week10_all_access_vip",
  },
];

export const WEEK8_SPECIALTY_PACK_TIERS: readonly SpecialtyPackTier[] = [
  {
    id: "week8-defense-idp-pack",
    slug: "week8-defense-idp-pack",
    category: "DEFENSE_IDP",
    title: "Week 10 Defense & IDP Tackle/Sack Pack (TNF, Sunday Main Slate & MNF)",
    subtitle: "8 LB Tackle-Funnel & Edge Sack Plays + 2 Core Week 10 DST Units Across All 14 Games",
    description:
      "Dedicated Defense, Special Teams & Individual Defensive Player (IDP) pack across all 14 Week 10 NFL matchups. Built from opponent play-volume tackle funnels, offensive line pass-protection splits, and our 2 core Week 10 DFS DST units.",
    windowSlot: "SUN_MAIN",
    kickoffUtc: WEEK10_MNF_KICKOFF_UTC,
    standardPriceCents: 1900,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX406TulqtZwJJ",
    stripePriceId: "price_1UVzsdQ2wPZMxx60lqO3TLbQ",
    stripeLookupKey: "gse-pack-week8-defense-idp",
    gamesCount: 14,
    highlights: [
      "8 LB Tackle-Funnel & Edge Sack Props Across Week 10 TNF (WSH @ NYG), Sunday Main Slate & MNF",
      "High-Conviction Linebacker Tackle & Pass-Rush Sack Reads (Up to 86/100)",
      "Includes Our 2 Core Week 10 Defense/ST Units + Trench Protection Mismatch Notes",
    ],
    badge: "DEFENSE & IDP PACK · $19",
    includesProps: true,
    includesSgp: false,
    includesDfs: true,
    forSale: isWindowOpenBeforeKickoff(WEEK10_MNF_KICKOFF_UTC),
    slateWindowLabel: "Week 10 TNF (WSH @ NYG), Sunday Main Slate & Monday Night Football",
    verifiedRecordBanner: "Weeks 8-9 Staked 43-17-1 (+22.20u) · Week 8 All-In 47-19-1 (+24.92u)",
    pullListIntegrityNote: "All active defensive & offensive line injury designations verified",
    topConfidenceRatings: ["86/100", "84/100", "81/100", "78/100", "75/100", "72/100"],
  },
  {
    id: "week8-anytime-td-pack",
    slug: "week8-anytime-td-pack",
    category: "ANYTIME_TD",
    title: "Week 10 Anytime Touchdown & Goal-Line Pack (TNF, Sunday Main Slate & MNF)",
    subtitle: "Inside-the-5 Bellcow & Red-Zone Target Anytime TD Plays Across All 14 Week 10 Games",
    description:
      "Dedicated Anytime Touchdown Scorer pack across Week 10 TNF (WSH @ NYG), the Sunday Main Slate, and Monday Night Football. Isolates red-zone and inside-the-5 carry and target roles where goal-line volume is concentrated.",
    windowSlot: "SUN_MAIN",
    kickoffUtc: WEEK10_MNF_KICKOFF_UTC,
    standardPriceCents: 2400,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX40XMRjV4FiJl",
    stripePriceId: "price_1UVzseQ2wPZMxx60VqAfAyNe",
    stripeLookupKey: "gse-pack-week8-anytime-td",
    gamesCount: 14,
    highlights: [
      "Inside-the-5 Goal-Line & Red-Zone Anytime TD Plays Across Week 10 TNF, Sunday & MNF",
      "Top Anytime TD Confidence Ratings: 86/100, 85/100, 82/100, 79/100 & 76/100",
      "Includes Fair Price vs Sportsbook Price Thresholds & Red-Zone Play-Calling Splits",
    ],
    badge: "ANYTIME TD PACK · $24",
    includesProps: true,
    includesSgp: false,
    includesDfs: false,
    forSale: isWindowOpenBeforeKickoff(WEEK10_MNF_KICKOFF_UTC),
    slateWindowLabel: "Week 10 TNF (WSH @ NYG), Sunday Main Slate & Monday Night Football",
    verifiedRecordBanner: "Weeks 8-9 Staked 43-17-1 (+22.20u) · Week 8 All-In 47-19-1 (+24.92u)",
    pullListIntegrityNote: "All Week 10 RB/TE injury replacements and goal-line roles applied",
    topConfidenceRatings: ["86/100", "85/100", "82/100", "79/100", "76/100", "74/100"],
  },
  {
    id: "week8-parlay-sgp-pack",
    slug: "week8-parlay-sgp-pack",
    category: "PARLAY_SGP",
    title: "Week 10 Correlated Parlay & Same-Game Parlay Pack (TNF, Sunday Main Slate & MNF)",
    subtitle: "Week 10 2-Leg & 3-Leg Correlated Game-Script Parlays Across All 14 Matchups",
    description:
      "Built for correlated multi-leg tickets where every leg fits the exact same game script. Pairs Sides, Totals, Skill/QB Props, Anytime TDs, and 1Q/1H derivatives across Week 10 TNF (WSH @ NYG), Sunday Main Slate, and Monday Night Football.",
    windowSlot: "SUN_MAIN",
    kickoffUtc: WEEK10_MNF_KICKOFF_UTC,
    standardPriceCents: 2900,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX40XMRjV4FiJl",
    stripePriceId: "price_1UVzseQ2wPZMxx60VqAfAyNe",
    stripeLookupKey: "gse-pack-week8-parlay-sgp",
    gamesCount: 14,
    highlights: [
      "Includes Full Week 10 TNF (WSH @ NYG), Sunday Main Slate & MNF Correlated SGP Card",
      "Cross-Game High-Conviction Anchor Parlay Baskets (Pairing 86/100 & 85/100 Reads)",
      "Zero Conflicting Legs — Every Ticket Built Around Matching Offensive & Defensive Game Scripts",
    ],
    badge: "PARLAY & SGP PACK · $29",
    includesProps: true,
    includesSgp: true,
    includesDfs: false,
    forSale: isWindowOpenBeforeKickoff(WEEK10_MNF_KICKOFF_UTC),
    slateWindowLabel: "Week 10 TNF (WSH @ NYG), Sunday Main Slate & Monday Night Football",
    verifiedRecordBanner: "Weeks 8-9 Staked 43-17-1 (+22.20u) · Week 8 All-In 47-19-1 (+24.92u)",
    pullListIntegrityNote: "Zero conflicting legs; active QB/RB injury replacements verified",
    topConfidenceRatings: ["86/100", "85/100", "84/100", "81/100", "79/100"],
  },
  {
    id: "week8-kicking-1q-1h-pack",
    slug: "week8-kicking-1q-1h-pack",
    category: "KICKING_1Q_1H",
    title: "Week 10 Kicking, Special Teams & 1Q / 1H Derivative Pack (TNF, Sunday & MNF)",
    subtitle: "1st-Quarter Totals, 1H/2Q Script Calls, Team Totals & Red-Zone Stall Kicker FGM Over 1.5",
    description:
      "Attack early-script scoring and red-zone stalls across Week 10 TNF (WSH @ NYG), Sunday Main Slate, and Monday Night Football. Combines 1st-Quarter and 1st-Half scripted drive calls, Team Total derivatives, and Kicker Field Goals Made Over 1.5 reads.",
    windowSlot: "SUN_MAIN",
    kickoffUtc: WEEK10_MNF_KICKOFF_UTC,
    standardPriceCents: 2400,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX400OaIktCGLb",
    stripePriceId: "price_1UVzsfQ2wPZMxx606fYPjKEJ",
    stripeLookupKey: "gse-pack-week8-kicking-1q-1h",
    gamesCount: 14,
    highlights: [
      "Week 10 TNF (WSH @ NYG), Sunday & MNF 1Q / 1H Scripted Drive Calls + Team Total Derivatives",
      "Kicker Field Goals Made Over 1.5 Reads Powered by Red-Zone Stall & 4th-Down Field Goal Tendencies",
      "Includes Fair Line Thresholds & Stadium Wind/Weather Notes for Every Outdoor Venue",
    ],
    badge: "KICKING & 1Q/1H PACK · $24",
    includesProps: true,
    includesSgp: false,
    includesDfs: false,
    forSale: isWindowOpenBeforeKickoff(WEEK10_MNF_KICKOFF_UTC),
    slateWindowLabel: "Week 10 TNF (WSH @ NYG), Sunday Main Slate & Monday Night Football",
    verifiedRecordBanner: "Weeks 8-9 Staked 43-17-1 (+22.20u) · Week 8 All-In 47-19-1 (+24.92u)",
    pullListIntegrityNote: "All Week 10 outdoor stadiums cross-checked against wind & weather reports",
    topConfidenceRatings: ["85/100", "84/100", "80/100", "77/100", "75/100", "73/100"],
  },
  {
    id: "week8-sun-mon-dfs-expanded-pack",
    slug: "week8-sun-mon-dfs-expanded-pack",
    category: "DFS_EXPANDED_CORE",
    title: "RedZone Expanded Week 10 DFS Pack (2 Sunday Optimal Lineups + 14-Player Core + TNF/SNF/MNF)",
    subtitle: "Week 10 TNF (WSH @ NYG), Sunday Main Slate & MNF: 2 Optimal Lineups, 14-Player Core & 20-Max MME",
    description:
      "Built for the Week 10 TNF Showdown (WSH @ NYG), Sunday Main Slate, and Monday Night Football DFS slates. Delivers 2 Complete Sunday Optimal Lineups (Lineup #1 Cash High-Floor + Lineup #2 Tournament Ceiling), TNF/SNF/MNF Primetime builds, our Expanded 14-Player Position Core (2 QBs, 4 RBs, 4 WRs, 2 TEs, 2 DSTs), and full 570-active-player pool with OUT/IR players zeroed and browser-ready Top-20 lineup exports.",
    windowSlot: "SUN_MAIN",
    kickoffUtc: WEEK10_MNF_KICKOFF_UTC,
    standardPriceCents: 3999,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX400OaIktCGLb",
    stripePriceId: "price_1UWjT2Q2wPZMxx60OrkMpGvF",
    stripeLookupKey: "gse-pack-redzone-dfs-pro-pack",
    gamesCount: 14,
    highlights: [
      "2 Complete Week 10 Sunday Optimal Lineups (Cash High-Floor + Tournament Stack) + TNF/SNF/MNF Primetime Builds",
      "Expanded 14-Player Core Pool: 2 QBs, 4 RBs, 4 WRs, 2 TEs & 2 DSTs with Matchup Writeups",
      "Includes 20-Max MME Portfolio + 570-Player Active Pool (Injury Replacements & Role Shifts Audited)",
    ],
    badge: "WEEK 10 EXPANDED DFS · $39.99",
    includesProps: false,
    includesSgp: false,
    includesDfs: true,
    forSale: isWindowOpenBeforeKickoff(WEEK10_MNF_KICKOFF_UTC),
    slateWindowLabel: "Week 10 TNF (WSH @ NYG), Sunday Main Slate & Monday Night Football",
    verifiedRecordBanner: "Weeks 8-9 Staked 43-17-1 (+22.20u) · Week 8 All-In 47-19-1 (+24.92u)",
    pullListIntegrityNote: "All Week 10 OUT/IR players zeroed across every lineup and player pool",
    topConfidenceRatings: ["86/100", "85/100", "84/100", "83/100"],
    dfsCoreSummary: "2 Sunday Optimal Lineups + TNF/SNF/MNF Primetime Builds + 2 QB / 4 RB / 4 WR / 2 TE / 2 DST Core",
  },
  {
    id: "week8-all-access-gameday-pass",
    slug: "week8-all-access-gameday-pass",
    category: "ALL_ACCESS_PASS",
    title: "Week 10 All-Access Game-Day Pass (TNF WSH @ NYG, Sunday Main Slate & MNF · All Packs Included)",
    subtitle: "TNF + Sunday/MNF Main Lines + Props + Defense/IDP + Anytime TD + Parlays/SGPs + Kicking/1Q/1H + Full DFS",
    description:
      "Complete one-click access to every single Week 10 pack across Thursday Night Football (WSH @ NYG), the Sunday Main Slate, Sunday Night Football, and Monday Night Football, including all specialty packs and the Expanded Week 10 DFS portfolio.",
    windowSlot: "WEEKLY_PASS",
    kickoffUtc: WEEK10_MNF_KICKOFF_UTC,
    standardPriceCents: 4900,
    creditBackPriceCents: null,
    stripeProductId: "prod_VX40T4RNpoNNIp",
    stripePriceId: "price_1UVzsfQ2wPZMxx60ozEJ1P3n",
    stripeLookupKey: "gse-pack-week8-all-access",
    gamesCount: 14,
    highlights: [
      "Unlocks All Week 10 Packs: TNF (WSH @ NYG) + Sunday Main Slate + SNF + MNF",
      "Main Lines + Skill/QB Props + Defense/IDP + Anytime TDs + Correlated SGPs + Kicking/1Q/1H Derivatives",
      "Full RedZone DFS Included: 2 Sunday Optimal Lineups + 14-Player Core + TNF/SNF/MNF Primetime Builds",
    ],
    badge: "ALL-ACCESS GAME-DAY PASS · $49",
    includesProps: true,
    includesSgp: true,
    includesDfs: true,
    forSale: isWindowOpenBeforeKickoff(WEEK10_MNF_KICKOFF_UTC),
    slateWindowLabel: "Week 10 TNF (WSH @ NYG), Sunday Main Slate & Monday Night Football",
    verifiedRecordBanner: "Weeks 8-9 Staked 43-17-1 (+22.20u) · Week 8 All-In 47-19-1 (+24.92u)",
    pullListIntegrityNote: "Public Glass Ledger 43-17-1 staked / 47-19-1 Week 8 all-in; all active Week 10 injury reports applied",
    topConfidenceRatings: ["86/100", "85/100", "84/100", "83/100", "82/100", "81/100"],
    dfsCoreSummary: "2 Sunday Optimal Lineups + TNF/SNF/MNF Primetime Builds + 2 QB / 4 RB / 4 WR / 2 TE / 2 DST Core",
  },
];

export const ACTIVE_FOR_SALE_PACKAGE_CATALOG: readonly PickPackageOffering[] =
  LIVE_PACKAGE_CATALOG.filter((pkg) => pkg.forSale !== false);

export const ACTIVE_FOR_SALE_SPECIALTY_PACK_TIERS: readonly SpecialtyPackTier[] =
  WEEK8_SPECIALTY_PACK_TIERS.filter((pkg) => pkg.forSale !== false);

export function getActiveForSalePackages(nowIso?: string): PickPackageOffering[] {
  return LIVE_PACKAGE_CATALOG.filter(
    (pkg) => pkg.forSale !== false && (!pkg.kickoffUtc || isWindowOpenBeforeKickoff(pkg.kickoffUtc, nowIso)),
  );
}

export function getActiveForSaleSpecialtyPacks(nowIso?: string): SpecialtyPackTier[] {
  return WEEK8_SPECIALTY_PACK_TIERS.filter(
    (pkg) => pkg.forSale !== false && (!pkg.kickoffUtc || isWindowOpenBeforeKickoff(pkg.kickoffUtc, nowIso)),
  );
}

const PACKAGE_SLUG_ALIASES: Record<string, string> = {
  "sunday-afternoon-slate-pack": "sunday-nfl-5pct-slate",
  "week-8-all-access-bundle": "week8-all-access",
  "week-10-all-access-bundle": "week8-all-access",
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

export function buildStripePackageCheckoutPayload(
  pkg: PickPackageOffering,
  creditBack: boolean,
  buyerEmail?: string,
  origin?: string,
  returnToStorefront?: boolean,
): StripeCheckoutPayload {
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
