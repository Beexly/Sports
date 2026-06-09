/**
 * Competitor war-room — founder-only competitive intelligence registry. (COMP-009.)
 *
 * Curated from the R&D competitive-expansion packet (docs/research/gse-competitor-*,
 * gse-nfl-optimizer-competitor-inventory, gse-media-betting-intelligence-competitor-map).
 * Each row pairs WHAT a competitor does well with GSE's deliberate counter — the
 * `gse_use` / `gse_response` / `gse_opportunity` field from the source CSVs, not invented.
 *
 * THESIS (from the addendum): competitors converge on the same commodity primitives
 * (projections, salaries, ownership, stacks, sims, locks/excludes, CSV export,
 * Discord, premium subs). GSE does NOT chase them feature-for-feature; it builds a
 * source-provenanced football world model and exposes optimizer / scenario /
 * retention products from that shared evidence layer.
 *
 * Pure data module (no deps). Rendered by the founder-gated /cockpit/competitors page.
 */

export const WATCHLIST_THESIS =
  "Competitors converge on the same commodity primitives — projections, salaries, ownership, stacks, sims, locks/excludes, CSV export, Discord, premium subs. GSE does not chase them feature-for-feature; it builds a source-provenanced football world model and exposes optimizer, scenario, and retention products from that shared evidence layer.";

/** Which competitive lane a rival occupies. */
export type CompetitorTier = "platform" | "optimizer" | "media";

export interface Competitor {
  readonly name: string;
  readonly url: string;
  readonly tier: CompetitorTier;
  /** Short category label. */
  readonly category: string;
  /** What they do well / why users pay them. */
  readonly theirEdge: string;
  /** GSE's deliberate counter-position (sourced from the packet, not invented). */
  readonly gseCounter: string;
  /**
   * True when engaging this rival's DATA path (DFS salary/projection ingestion,
   * odds/props, private-league import, real-money/pick'em) needs founder/legal
   * approval before any build goes live. Surfaced as a gate badge.
   */
  readonly approvalGated: boolean;
  /** The hard line — what we will NOT do (scrape, copy, claim). */
  readonly legalNote: string;
}

export const COMPETITORS: readonly Competitor[] = [
  // ── High-stakes / contest platforms ──────────────────────────────────────
  {
    name: "FFPC", url: "https://myffpc.com/", tier: "platform",
    category: "High-stakes season-long & best ball",
    theirEdge: "Optimized best-ball scoring, blind bidding/free agency, keeper/dynasty state, roster protection.",
    gseCounter: "Model high-stakes roster-construction behavior + best-ball optimal scoring; sell the read, hide the recipe.",
    approvalGated: false,
    legalNote: "Public rules only — never scrape private drafts or paid league rooms.",
  },
  {
    name: "NFFC / NFC", url: "https://nfc.shgn.com/", tier: "platform",
    category: "High-stakes fantasy championship",
    theirEdge: "Prize ladder psychology, max-entry rules, championship framing, contest-size metadata.",
    gseCounter: "Track format variants + prize-ladder psychology as engagement design, not a contest clone.",
    approvalGated: false,
    legalNote: "NFPC (user term) unverified; NFFC/NFC is the real target. Public rules only.",
  },
  {
    name: "RTSports", url: "https://www.rtsports.com/", tier: "platform",
    category: "DFS + season-long commissioner",
    theirEdge: "Salary-cap & draft DFS, commissioner rules, free/paid split, account verification.",
    gseCounter: "Study contest distribution + free/paid split + commissioner dispute mechanics.",
    approvalGated: false,
    legalNote: "No private league scraping; public rules or user exports only.",
  },
  {
    name: "DraftKings", url: "https://www.draftkings.com/", tier: "platform",
    category: "DFS major + pick'em (DK Pick6)",
    theirEdge: "Massive slate liquidity, salary structure, milly-maker contests, mobile UX, Pick6 props.",
    gseCounter: "Read DK salary STRUCTURE behavior for the optimizer; never become a sportsbook.",
    approvalGated: true,
    legalNote: "Direct DK/DK Pick6 salary or pick'em ingestion is founder/legal-gated. User-CSV export only (dk-import.ts exists).",
  },
  {
    name: "Rebet", url: "https://www.rebet.app/", tier: "platform",
    category: "Social betting / peer contests",
    theirEdge: "Social/peer wagering mechanics, community engagement, gamified contests.",
    gseCounter: "Borrow social-engagement loops via the FREE skill 'Beat the Model' — no real-money/chance.",
    approvalGated: true,
    legalNote: "No social casino / sweepstakes / real-money mechanics without legal sign-off.",
  },
  {
    name: "Drafters", url: "https://www.drafters.com/", tier: "platform",
    category: "DFS draft-style contests",
    theirEdge: "Snake-draft DFS, lower-variance formats, contest variety.",
    gseCounter: "Model draft-style contest construction for the optimizer's contest-aware objective.",
    approvalGated: true,
    legalNote: "Real-money DFS entry/ingestion is founder-gated; public format framing only.",
  },

  // ── Optimizers / sim tools ────────────────────────────────────────────────
  {
    name: "RotoGrinders LineupHQ", url: "https://rotogrinders.com/lineuphq", tier: "optimizer",
    category: "DFS optimizer + research",
    theirEdge: "Projection optimizer with stacks, groups, ownership, weather, implied totals, custom upload.",
    gseCounter: "Pair the lineup builder with SOURCE PROVENANCE + scenario explanations they don't show.",
    approvalGated: false,
    legalNote: "No copying projections/ownership. Public product framing only.",
  },
  {
    name: "SaberSim", url: "https://www.sabersim.com/", tier: "optimizer",
    category: "Simulation-first DFS optimizer",
    theirEdge: "Builds lineups from simulated game outcomes, not just mean projections; game scripts.",
    gseCounter: "Own simulation EXPLAINABILITY — transparent world-state sims + why-this-lineup.",
    approvalGated: false,
    legalNote: "No reuse of sim outputs/projections. Public marketing pages only.",
  },
  {
    name: "FantasyCruncher", url: "https://www.fantasycruncher.com/", tier: "optimizer",
    category: "Classic DFS optimizer",
    theirEdge: "Editable projections, locks, excludes, sliders, late-update workflow, FC Pro.",
    gseCounter: "Match custom-projection upload, uniqueness controls, and export basics — then out-explain.",
    approvalGated: false,
    legalNote: "Public help/FAQ framing only.",
  },
  {
    name: "FantasyLabs", url: "https://www.fantasylabs.com/", tier: "optimizer",
    category: "Research + optimizer suite",
    theirEdge: "Trends, models, optimizer, groups, exposures, ownership — research-plus-optimizer workflow.",
    gseCounter: "Compete on CONNECTED research (one evidence layer), not just optimizer output.",
    approvalGated: false,
    legalNote: "No copying premium data/trends.",
  },
  {
    name: "Run The Sims", url: "https://www.runthesims.com/", tier: "optimizer",
    category: "Sims / optimizer",
    theirEdge: "Range-of-outcomes simulation, SimRunner, proprietary sim approach.",
    gseCounter: "Own simulation explainability + contest-specific strategy framing.",
    approvalGated: false,
    legalNote: "Public strategy content only.",
  },
  {
    name: "Stokastic", url: "https://www.stokastic.com/", tier: "optimizer",
    category: "DFS sims + boom/bust tools",
    theirEdge: "Sim-based optimizer, boom/bust, leverage, ownership projections.",
    gseCounter: "Leverage = ceiling / priced-ownership, shown with the WHY; transparent over black-box.",
    approvalGated: false,
    legalNote: "No copying sim/ownership outputs.",
  },

  // ── Media / betting-intelligence / fantasy tools ──────────────────────────
  {
    name: "FTN Fantasy", url: "https://ftnfantasy.com/tools", tier: "media",
    category: "Fantasy/DFS/betting suite + community",
    theirEdge: "One paid ecosystem: optimizer, advanced projections, ownership, betting tools, Discord, expert brands.",
    gseCounter: "Match the suite mindset but differentiate with source provenance, world-state deltas, clean Free/Pro/Elite.",
    approvalGated: false,
    legalNote: "No copying projections/premium stats/ownership.",
  },
  {
    name: "FantasyPros", url: "https://www.fantasypros.com/", tier: "media",
    category: "Consensus rankings + draft assistant",
    theirEdge: "Expert-consensus rankings, Draft Wizard, ADP, mock drafts, league sync, DFS features.",
    gseCounter: "Show WHY the model moved, not only what consensus says.",
    approvalGated: false,
    legalNote: "No copying ECR/projections/premium notes.",
  },
  {
    name: "Draft Sharks", url: "https://www.draftsharks.com/", tier: "media",
    category: "Season-long tools + league sync",
    theirEdge: "Draft War Room, league sync, custom rankings, personalized roster advice.",
    gseCounter: "Personalization + import as core — but every private/league path needs explicit user authorization.",
    approvalGated: true,
    legalNote: "Private-league sync requires user authorization; never scrape league-sync output.",
  },
  {
    name: "Footballguys", url: "https://www.footballguys.com/", tier: "media",
    category: "Premium content + DFS optimizer",
    theirEdge: "Deep tools, DFS optimizer, projections, newsletters, practical season-long advice.",
    gseCounter: "Study cadence + bundling + UX; differentiate with world-state evidence.",
    approvalGated: false,
    legalNote: "No copying projections/tools/subscriber content.",
  },
  {
    name: "Underdog Network", url: "https://underdognetwork.com/", tier: "media",
    category: "Creator-led rankings → contest funnel",
    theirEdge: "High-trust free content (Winks/Norris) funneling into an owned best-ball ecosystem.",
    gseCounter: "Make users return for CHANGED CONTEXT (world-state deltas), not just pre-draft rankings.",
    approvalGated: false,
    legalNote: "No reuse of rankings/blurbs/contest data.",
  },
  {
    name: "The Fantasy Footballers (UDK)", url: "https://www.thefantasyfootballers.com/", tier: "media",
    category: "Podcast brand + Ultimate Draft Kit",
    theirEdge: "Entertainment + trust + polished draft-season product (UDK / UDK Plus).",
    gseCounter: "Borrow the seasonal content rhythm; keep GSE's voice sharper, less entertainment-dependent.",
    approvalGated: false,
    legalNote: "No copying rankings/brand voice/paid kit contents.",
  },
  {
    name: "Action Network", url: "https://www.actionnetwork.com/", tier: "media",
    category: "Bet tracking + betting intelligence",
    theirEdge: "Bet tracking, line movement, public betting %, premium picks/systems, alerts.",
    gseCounter: "Tracking + delta-explanation matters more than tout picks; keep betting features compliance-limited.",
    approvalGated: true,
    legalNote: "High betting/data-rights risk. No odds/tool ingestion without approved providers.",
  },
  {
    name: "OddsJam", url: "https://oddsjam.com/", tier: "media",
    category: "Odds comparison + EV/arb tools",
    theirEdge: "Positive-EV, arbitrage, middles, line shopping across many books, alerts.",
    gseCounter: "If GSE shows odds: licensed feeds + market CONTEXT (Kalshi CLV), never guaranteed-EV claims.",
    approvalGated: true,
    legalNote: "Very high data-rights + betting-compliance risk.",
  },
  {
    name: "Outlier", url: "https://outlier.bet/", tier: "media",
    category: "Player-prop research tools",
    theirEdge: "Prop Finder, hit rates, matchup context, line comparison, mobile alerts.",
    gseCounter: "Keep prop intelligence separate from fantasy/optimizer; make source + freshness explicit.",
    approvalGated: true,
    legalNote: "Player-prop line ingestion needs approved provider + legal review.",
  },
  {
    name: "Dimers", url: "https://www.dimers.com/", tier: "media",
    category: "Predictions + odds media",
    theirEdge: "Model-driven predictions, best-bet framing, odds comparison, free SEO content.",
    gseCounter: "Compete on PROVEN calibration + the read, not certainty-theater 'best bets'.",
    approvalGated: true,
    legalNote: "Betting/odds + prediction claims are compliance-sensitive; evidence-led only.",
  },
  {
    name: "I Sell Winners", url: "https://isellwinners.com/", tier: "media",
    category: "Paid handicapping / tout (NEGATIVE benchmark)",
    theirEdge: "Direct-sales packages, testimonials, bankroll-management promises.",
    gseCounter: "Edge-case benchmark: GSE AVOIDS guaranteed-profit copy and sells transparent decision support.",
    approvalGated: true,
    legalNote: "High claims/compliance/reputation risk. Never copy tout language or imply guaranteed wins.",
  },
];

/** Competitors grouped by lane, in display order. */
export function competitorsByTier(): ReadonlyArray<{ tier: CompetitorTier; label: string; rows: readonly Competitor[] }> {
  const labels: Record<CompetitorTier, string> = {
    platform: "High-stakes & contest platforms",
    optimizer: "Optimizers & sim tools",
    media: "Media, betting-intelligence & fantasy tools",
  };
  const order: readonly CompetitorTier[] = ["platform", "optimizer", "media"];
  return order.map((tier) => ({
    tier,
    label: labels[tier],
    rows: COMPETITORS.filter((c) => c.tier === tier),
  }));
}

/** Count of rivals whose data path needs founder/legal approval (the gate badge total). */
export function approvalGatedCount(): number {
  return COMPETITORS.filter((c) => c.approvalGated).length;
}
