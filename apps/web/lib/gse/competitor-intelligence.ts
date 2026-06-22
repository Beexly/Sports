/**
 * GSE Competitor Intelligence — a structured, scorable competitor + feature-gap
 * matrix, distilled from web-grounded research (June 2026).
 *
 * Design choice: this contract stores competitor SEGMENT, monetization MODEL, the
 * standout mechanic, and the key weakness — but NOT dollar prices, which go stale
 * fast and live (with "verify" labels) in docs/research/GSE_2026_COMPETITOR_DEEP_DIVE.md.
 * The structured part is the feature-gap scoring, which turns "what to copy" into
 * a ranked, trust-gated build list.
 *
 * The strategic finding the gaps encode: across DFS optimizers, betting-analytics
 * tools, fantasy platforms, and pick/model sites, almost none ship an auditable,
 * calibrated, per-pick track record — the one thing GSE already builds toward via
 * the Trust Ledger + calibration. That is the white space.
 *
 * Companion doc: docs/research/GSE_2026_COMPETITOR_DEEP_DIVE.md
 */

import { type GseScore, makeScore } from "./gse-scoring-systems";

export type CompetitorSegment =
  | "dfs_optimizer"
  | "betting_analytics"
  | "pick_model_site"
  | "fantasy_platform"
  | "data_provider"
  | "ai_assistant";

export type MonetizationModel =
  | "subscription"
  | "freemium"
  | "affiliate"
  | "entry_fees"
  | "data_licensing"
  | "ads"
  | "prediction_market";

export type ThreatLevel = "low" | "medium" | "high";

export interface CompetitorProfile {
  readonly id: string;
  readonly name: string;
  readonly segment: CompetitorSegment;
  readonly url: string;
  readonly monetization: readonly MonetizationModel[];
  /** The single mechanic most worth studying. */
  readonly standoutFeature: string;
  /** The blind spot a trust/calibration-first product can attack. */
  readonly weakness: string;
  readonly threat: ThreatLevel;
}

export const COMPETITORS: readonly CompetitorProfile[] = [
  // ── betting analytics / odds tools ────────────────────────────────────────
  { id: "oddsjam", name: "OddsJam", segment: "betting_analytics", url: "https://oddsjam.com", monetization: ["subscription"], standoutFeature: "Real-time +EV + arbitrage across 100+ books.", weakness: "Premium price; no calibration ledger.", threat: "high" },
  { id: "outlier", name: "Outlier.bet", segment: "betting_analytics", url: "https://outlier.bet", monetization: ["subscription", "freemium"], standoutFeature: "Tiered EV gating (badge → filterable feed → arb + stake calc); devig vs Pinnacle.", weakness: "No bet tracking and no CLV at all — open flank.", threat: "high" },
  { id: "sharp_app", name: "Sharp App", segment: "betting_analytics", url: "https://sharp.app", monetization: ["subscription"], standoutFeature: "Proptimizer — prop-level devig vs consensus.", weakness: "No surfaced CLV/calibration; expensive.", threat: "medium" },
  { id: "betstamp", name: "Betstamp", segment: "betting_analytics", url: "https://betstamp.com", monetization: ["freemium", "data_licensing", "affiliate"], standoutFeature: "Dual-CLV grading (vs your book's close AND market best) on immutable timestamped bets.", weakness: "Price-discovery focus, not calibrated outcome prediction.", threat: "medium" },
  { id: "unabated", name: "Unabated", segment: "betting_analytics", url: "https://unabated.com", monetization: ["subscription"], standoutFeature: "Sharp fair-value lines + prop simulators for 'investors'.", weakness: "Narrow sharp audience; steep learning curve.", threat: "medium" },
  { id: "action_network", name: "Action Network", segment: "betting_analytics", url: "https://actionnetwork.com", monetization: ["subscription", "affiliate"], standoutFeature: "Letter-graded edges + bet-sync auto-tracking + Sharp Report; high-end LABS tier.", weakness: "No per-pick calibration receipts; affiliate conflict.", threat: "high" },
  { id: "betql", name: "BetQL", segment: "betting_analytics", url: "https://betql.co", monetization: ["subscription"], standoutFeature: "1–5 star model edges (10k sims) + sharp-vs-public overlay; per-sport access ladder.", weakness: "Black-box model, no calibration transparency.", threat: "medium" },
  { id: "props_cash", name: "Props.cash", segment: "betting_analytics", url: "https://props.cash", monetization: ["subscription"], standoutFeature: "Contextual hit-rate charts + last-N filters; line-shading alerts.", weakness: "No devig/EV/CLV; odds not real-time.", threat: "medium" },
  { id: "pinnacle", name: "Pinnacle (reference)", segment: "betting_analytics", url: "https://pinnacle.com", monetization: ["entry_fees"], standoutFeature: "Low-margin 'Winners Welcome' market-maker → the fair-odds benchmark.", weakness: "A book, not analytics; no US access; an input, not a rival.", threat: "low" },

  // ── DFS optimizers / projections / draft ──────────────────────────────────
  { id: "stokastic", name: "Stokastic", segment: "dfs_optimizer", url: "https://stokastic.com", monetization: ["subscription"], standoutFeature: "Sim-based DFS optimizer + boom/bust + ownership leverage.", weakness: "DFS-only; opaque projection accuracy.", threat: "medium" },
  { id: "sabersim", name: "SaberSim", segment: "dfs_optimizer", url: "https://sabersim.com", monetization: ["subscription"], standoutFeature: "Monte Carlo lineup sims with correlation-aware EV.", weakness: "Power-user complexity; DFS-only.", threat: "medium" },
  { id: "etr", name: "Establish The Run", segment: "dfs_optimizer", url: "https://establishtherun.com", monetization: ["subscription"], standoutFeature: "Trusted projections + strategy content; in-season editorial.", weakness: "Content-led; thin live tooling.", threat: "medium" },
  { id: "draft_sharks", name: "Draft Sharks", segment: "dfs_optimizer", url: "https://draftsharks.com", monetization: ["subscription"], standoutFeature: "Live War Room with named '3D Value' factors + injury miss-time probability model.", weakness: "NFL/draft-season weighted; no public calibration ledger.", threat: "high" },
  { id: "fantasypros", name: "FantasyPros", segment: "dfs_optimizer", url: "https://fantasypros.com", monetization: ["freemium", "subscription"], standoutFeature: "Cross-platform Live Draft Sync overlay + Expert Consensus Rankings + 'Coach' AI.", weakness: "Consensus-of-experts, not a calibrated probabilistic engine.", threat: "high" },
  { id: "rotowire", name: "RotoWire", segment: "dfs_optimizer", url: "https://rotowire.com", monetization: ["subscription"], standoutFeature: "Broad multi-sport news + projections + optimizer.", weakness: "Breadth over depth; legacy UX.", threat: "low" },

  // ── pick / model sites ────────────────────────────────────────────────────
  { id: "dimers", name: "Dimers", segment: "pick_model_site", url: "https://dimers.com", monetization: ["freemium"], standoutFeature: "Model probability vs market price + Dimebot AI assistant; daily best bets.", weakness: "Calibration/record not foregrounded; single flat tier.", threat: "high" },
  { id: "teamrankings", name: "TeamRankings", segment: "pick_model_site", url: "https://teamrankings.com", monetization: ["subscription"], standoutFeature: "Published methodology + NFL Survivor/pool optimizers (defensible niche).", weakness: "Dated UX; betting ROI transparency not front-and-center.", threat: "medium" },
  { id: "dratings", name: "DRatings", segment: "pick_model_site", url: "https://dratings.com", monetization: ["ads", "freemium"], standoutFeature: "Transparent Bradley-Terry methodology + published log-loss vs the market; anti-tout framing.", weakness: "Spartan UX, weak distribution/monetization of its trust edge.", threat: "medium" },
  { id: "covers", name: "Covers", segment: "pick_model_site", url: "https://covers.com", monetization: ["affiliate", "ads"], standoutFeature: "Line-aware consensus (picks at each line value) from contest volume.", weakness: "Contest picks ≠ real handle; no per-pick records.", threat: "medium" },
  { id: "pickswise", name: "Pickswise", segment: "pick_model_site", url: "https://pickswise.com", monetization: ["affiliate"], standoutFeature: "Free picks funnel + star confidence; strong SEO/app.", weakness: "No visible records; affiliate-first incentive conflict.", threat: "medium" },
  { id: "bettingpros", name: "BettingPros", segment: "pick_model_site", url: "https://bettingpros.com", monetization: ["freemium", "subscription"], standoutFeature: "Expert-consensus ranked BY tracked expert accuracy + EV/cover-prob.", weakness: "Aggregation, not first-principles calibration.", threat: "medium" },

  // ── fantasy / pick'em platforms (action layer) ────────────────────────────
  { id: "sleeper", name: "Sleeper", segment: "fantasy_platform", url: "https://sleeper.com", monetization: ["entry_fees", "prediction_market"], standoutFeature: "All-in-one league + pick'em + prediction-market same-login funnel.", weakness: "No decision-intelligence/calibration layer; opaque lines.", threat: "medium" },
  { id: "underdog", name: "Underdog Fantasy", segment: "fantasy_platform", url: "https://underdogsports.com", monetization: ["entry_fees", "prediction_market"], standoutFeature: "Pick'em + Best Ball + FCM event contracts; Ladders/Streaks UX.", weakness: "Sells risk, not edge; no transparency layer.", threat: "medium" },
  { id: "prizepicks", name: "PrizePicks", segment: "fantasy_platform", url: "https://prizepicks.com", monetization: ["entry_fees", "prediction_market"], standoutFeature: "Demons/Goblins difficulty slider; P2P Arena + Kalshi/Polymarket deals.", weakness: "Sets its own lines with no published methodology.", threat: "medium" },
  { id: "yahoo_fantasy", name: "Yahoo Fantasy+", segment: "fantasy_platform", url: "https://fantasysports.yahoo.com", monetization: ["freemium", "ads"], standoutFeature: "Research Assistant + Assistant GM auto-optimizer + Trade Hub partner matching.", weakness: "Conveniences on a league host, not a calibrated edge engine.", threat: "medium" },
  { id: "espn_fantasy", name: "ESPN Fantasy", segment: "fantasy_platform", url: "https://fantasy.espn.com", monetization: ["ads"], standoutFeature: "Massive free reach + live-media (FantasyCast) integration.", weakness: "Thin proprietary decision engine.", threat: "low" },

  // ── data / stats providers ────────────────────────────────────────────────
  { id: "pff", name: "Pro Football Focus", segment: "data_provider", url: "https://pff.com", monetization: ["subscription", "data_licensing"], standoutFeature: "Per-play 0–100 grades from an expectation baseline + context adjustment; WAR.", weakness: "Grades are subjective opinion — an auditability attack surface.", threat: "high" },
  { id: "sis", name: "Sports Info Solutions", segment: "data_provider", url: "https://sportsinfosolutions.com", monetization: ["data_licensing", "subscription"], standoutFeature: "Total Points — credit-allocation from an EPA baseline; independent charting.", weakness: "Weaker consumer brand; narrow sport set.", threat: "medium" },
  { id: "stathead", name: "Stathead / Sports Reference", segment: "data_provider", url: "https://stathead.com", monetization: ["subscription", "ads"], standoutFeature: "Finder query-builder (Season/Game/Streak/Span) over full historical DB — the query-UX gold standard.", weakness: "Reference-grade, not predictive; lost FBref's advanced soccer feed (Jan 2026).", threat: "medium" },
  { id: "opta", name: "Opta / Stats Perform", segment: "data_provider", url: "https://statsperform.com", monetization: ["data_licensing"], standoutFeature: "Granular licensing by competition/country/data level; canonical advanced soccer feed.", weakness: "Expensive, opaque; supplier power (cut FBref's feed).", threat: "low" },

  // ── AI assistants (fastest-moving cohort) ─────────────────────────────────
  { id: "rotobot", name: "RotoBot AI", segment: "ai_assistant", url: "https://rotobot.ai", monetization: ["subscription"], standoutFeature: "Conversational props/parlay/start-sit with matchup + usage splits.", weakness: "No published calibration; answers without an audit trail.", threat: "medium" },
  { id: "rithmm", name: "Rithmm", segment: "ai_assistant", url: "https://rithmm.com", monetization: ["subscription", "freemium"], standoutFeature: "No-code Model Builder + backtest report; 'Bolt' confidence flags; bet tracking.", weakness: "No EV/arb/devig/CLV; heavy 'AI picks' marketing, no calibration.", threat: "medium" },
] as const;

/** Look up a competitor by id. */
export function getCompetitor(id: string): CompetitorProfile | undefined {
  return COMPETITORS.find((c) => c.id === id);
}

/** All competitors in a segment. */
export function competitorsBySegment(segment: CompetitorSegment): readonly CompetitorProfile[] {
  return COMPETITORS.filter((c) => c.segment === segment);
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature gaps — the ranked "what to copy / build better" list
// ─────────────────────────────────────────────────────────────────────────────

export type GseStatus = "have" | "partial" | "gap";

export interface FeatureGap {
  readonly id: string;
  readonly feature: string;
  /** Competitor ids that ship this well. */
  readonly competitorsWithIt: readonly string[];
  readonly gseStatus: GseStatus;
  /** 0..1, higher = easier for GSE to copy/build. */
  readonly copyability: number;
  /** 0..1, value to GSE users if built. */
  readonly valueToGse: number;
  /** -1..1, effect on trust (negative = erodes trust — a hard gate). */
  readonly trustImpact: number;
  readonly buildSketch: string;
}

export const FEATURE_GAPS: readonly FeatureGap[] = [
  { id: "calibration_receipts", feature: "Auditable per-pick calibration / track-record receipts", competitorsWithIt: ["dratings"], gseStatus: "have", copyability: 0.6, valueToGse: 1.0, trustImpact: 1.0, buildSketch: "Already core (Trust Ledger + calibration). Make it the headline; it is the white space the whole field leaves open." },
  { id: "devig_clv_loop", feature: "devig → bet-log → CLV → calibration full loop", competitorsWithIt: ["betstamp", "outlier", "action_network"], gseStatus: "partial", copyability: 0.6, valueToGse: 0.95, trustImpact: 0.8, buildSketch: "Close the loop: log a pick, grade CLV vs close AND market-best, feed calibration. Outlier lacks tracking; Betstamp lacks outcome calibration — own both." },
  { id: "query_builder", feature: "Stathead-style Finder/query-builder over historical data", competitorsWithIt: ["stathead"], gseStatus: "partial", copyability: 0.4, valueToGse: 0.85, trustImpact: 0.6, buildSketch: "Composable filter stacks over our entity graph (player/game/situation) → 'every game where X'. Pairs with evidence engine." },
  { id: "no_code_model_builder", feature: "No-code model builder + backtest report", competitorsWithIt: ["rithmm", "draft_sharks"], gseStatus: "gap", copyability: 0.4, valueToGse: 0.8, trustImpact: 0.5, buildSketch: "Let users reweight named factors and backtest against history; show calibration of THEIR model, not just a win count." },
  { id: "cross_platform_sync", feature: "Cross-platform league/draft sync overlay", competitorsWithIt: ["fantasypros", "draft_sharks", "yahoo_fantasy"], gseStatus: "gap", copyability: 0.45, valueToGse: 0.85, trustImpact: 0.4, buildSketch: "Sync to Yahoo/ESPN/Sleeper drafts + rosters; deliver Roster Coach / Draft OS advice on top of the user's real league." },
  { id: "hit_rate_charts", feature: "Contextual hit-rate charts + last-N filters", competitorsWithIt: ["props_cash"], gseStatus: "partial", copyability: 0.7, valueToGse: 0.75, trustImpact: 0.5, buildSketch: "Over/under frequency vs line, sliced by home/road/rest/matchup; flag small-sample with confidence bands (don't imply certainty)." },
  { id: "sharp_public_overlay", feature: "Sharp-vs-public divergence overlay", competitorsWithIt: ["betql", "covers", "action_network", "sportsinsights"], gseStatus: "partial", copyability: 0.6, valueToGse: 0.7, trustImpact: 0.3, buildSketch: "Show bets% vs money% and our model read on the same card; teach what divergence means, not 'fade the public'." },
  { id: "prop_level_devig", feature: "Prop-level devig vs consensus", competitorsWithIt: ["sharp_app", "outlier"], gseStatus: "partial", copyability: 0.55, valueToGse: 0.8, trustImpact: 0.5, buildSketch: "Extend Shin de-vig to player props vs a multi-book consensus; surface fair line + edge with freshness." },
  { id: "injury_probability", feature: "Injury miss-time probability model", competitorsWithIt: ["draft_sharks"], gseStatus: "partial", copyability: 0.4, valueToGse: 0.75, trustImpact: 0.4, buildSketch: "Model P(miss time) from injury type/history + position base rates + workload; feed projection variance + falsifiers." },
  { id: "pool_survivor_optimizer", feature: "Survivor / pool pick optimizer", competitorsWithIt: ["teamrankings"], gseStatus: "partial", copyability: 0.5, valueToGse: 0.65, trustImpact: 0.3, buildSketch: "EV-optimal survivor path with future-week equity (save strong teams); a sticky seasonal product with low direct competition." },
  { id: "ai_assistant", feature: "Conversational AI decision assistant", competitorsWithIt: ["dimers", "rotobot", "rithmm"], gseStatus: "have", copyability: 0.6, valueToGse: 0.85, trustImpact: 0.6, buildSketch: "Jarvis already does this; differentiate by citing evidence + showing the counter-case + never sounding more certain than the data." },
  { id: "legible_confidence_ux", feature: "Legible confidence UX (stars/letters/grades)", competitorsWithIt: ["betql", "pff", "action_network", "covers"], gseStatus: "partial", copyability: 0.8, valueToGse: 0.7, trustImpact: 0.2, buildSketch: "Make calibrated confidence legible (band + what would change it) WITHOUT implying certainty; tie the badge to the calibration ledger." },
  { id: "prediction_market_read", feature: "Prediction-market price as a probability input", competitorsWithIt: ["sleeper", "prizepicks", "dimers"], gseStatus: "gap", copyability: 0.45, valueToGse: 0.6, trustImpact: 0.3, buildSketch: "Blend Kalshi/Polymarket implied probabilities into the market read (rights-checked); compare to model + sportsbook." },
  { id: "credit_allocation_value", feature: "Player value from a shared expected-value baseline", competitorsWithIt: ["pff", "sis"], gseStatus: "partial", copyability: 0.4, valueToGse: 0.7, trustImpact: 0.5, buildSketch: "Allocate EPA/Total-Points-style credit to players from a transparent baseline; expose the rubric (beat PFF on auditability)." },
] as const;

/**
 * Score a feature gap as a build opportunity (0..100, higher = build sooner).
 * A gap GSE lacks, that is valuable and easy to copy, scores highest; features
 * GSE already has are down-weighted. Negative trust impact hard-caps — we do not
 * copy a competitor mechanic that would erode trust (e.g. fake confidence UX).
 */
export function scoreFeatureGap(gap: FeatureGap): GseScore {
  const statusMultiplier = gap.gseStatus === "gap" ? 1.0 : gap.gseStatus === "partial" ? 0.55 : 0.15;
  const flags: string[] = [];
  let score = Math.max(0, Math.min(1, gap.valueToGse)) * Math.max(0, Math.min(1, gap.copyability)) * statusMultiplier * 100;

  if (gap.trustImpact < 0) {
    score = Math.min(score, 20);
    flags.push("trust gate: copying this would erode trust — do not build as-is");
  }
  if (gap.gseStatus === "have") flags.push("already have it — opportunity is to make it the headline, not to build");
  if (gap.copyability < 0.45) flags.push("hard to copy — scope carefully");

  return makeScore("feature_gap", score, {
    confidence: "supported",
    rationale: [
      `value ${(gap.valueToGse * 100).toFixed(0)}%`,
      `copyability ${(gap.copyability * 100).toFixed(0)}%`,
      `status ${gap.gseStatus}`,
      `present in ${gap.competitorsWithIt.length} competitor(s)`,
    ],
    flags,
  });
}

export interface ScoredGap {
  readonly gap: FeatureGap;
  readonly opportunity: GseScore;
}

/** Rank feature gaps by build opportunity (highest first). */
export function prioritizeGaps(): readonly ScoredGap[] {
  return FEATURE_GAPS.map((gap) => ({ gap, opportunity: scoreFeatureGap(gap) })).sort(
    (a, b) => b.opportunity.score - a.opportunity.score,
  );
}
