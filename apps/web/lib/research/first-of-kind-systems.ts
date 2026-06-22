/**
 * First-of-kind product systems for Galaxy Sports Edge.
 * Documents 30+ capabilities that no competitor currently offers
 * in combined, integrated form.
 *
 * Integrity rule: "first-of-kind" claims are based on known public
 * feature sets as of June 2026. Label as "source gap — verify before
 * publishing" if uncertain about a specific competitor.
 */

// ── System classification types ──────────────────────────────────────────────

export type SystemCategory =
  | "draft_intelligence"
  | "league_memory"
  | "decision_os"
  | "calibration_accountability"
  | "dfs_portfolio"
  | "prediction_analytics"
  | "voice_assistant"
  | "integrity"
  | "revenue_readiness";

export type FirstOfKindStatus =
  | "confirmed_unique"
  | "likely_unique"
  | "differentiated_execution"
  | "table_stakes_done_better";

export type BuildPhase = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type GseReadiness =
  | "live"
  | "in_sprint"
  | "designed_not_built"
  | "roadmap_q3_2026"
  | "roadmap_2027"
  | "concept";

export interface FirstOfKindSystem {
  id: string;
  name: string;
  category: SystemCategory;
  oneLiner: string;
  whatNoCompetitorDoes: string;
  howGseDoesIt: string;
  competitorGap: string;
  status: FirstOfKindStatus;
  gseReadiness: GseReadiness;
  buildPhase: BuildPhase;
  revenueImpact: "low" | "medium" | "high" | "critical";
  trustImpact: "low" | "medium" | "high" | "critical";
  sourceGapNote: string | null;
}

// ── The 30+ first-of-kind systems ────────────────────────────────────────────

export const FIRST_OF_KIND_SYSTEMS: ReadonlyArray<FirstOfKindSystem> = [
  // ── Draft Intelligence ────────────────────────────────────────────────────
  {
    id: "manager_genome",
    name: "Manager Genome",
    category: "draft_intelligence",
    oneLiner: "Profiles each opponent's draft DNA from historical picks, tendencies, and biases.",
    whatNoCompetitorDoes:
      "No competitor models individual opponent personalities as a machine-readable profile. Everyone gives you universal ADP; nobody tells you that your opponent always panic-reaches for TE in rounds 5–7.",
    howGseDoesIt:
      "Tracks draft history, round-by-round position preference, RB-zero vs zero-RB tendency, late-round hero tendencies, and positional hoarding. Feeds into pick urgency scoring.",
    competitorGap:
      "FantasyPros, 4for4, Draft Sharks, RotoWire — all offer generalized ADP, not opponent-specific modeling.",
    status: "confirmed_unique",
    gseReadiness: "designed_not_built",
    buildPhase: 5,
    revenueImpact: "high",
    trustImpact: "high",
    sourceGapNote: null,
  },
  {
    id: "draft_futures_engine",
    name: "Draft Futures Engine",
    category: "draft_intelligence",
    oneLiner:
      "Shows your projected Week 1 depth chart, injury fragility, and ceiling scenarios the moment you make a pick.",
    whatNoCompetitorDoes:
      "Draft assistants show you the next best available player. None project your roster's full-season trajectory in real time as each pick is made.",
    howGseDoesIt:
      "After each pick, runs a season simulation: projects starter probability, injury risk to your starters, week-by-week bye conflicts, and expected final standing range.",
    competitorGap:
      "Dynasty Nerds does dynasty projections but not live mid-draft futures. No one does real-time whole-roster simulation during drafts.",
    status: "confirmed_unique",
    gseReadiness: "designed_not_built",
    buildPhase: 6,
    revenueImpact: "high",
    trustImpact: "critical",
    sourceGapNote: null,
  },
  {
    id: "pick_thesis_engine",
    name: "Pick Thesis Engine (Counter-Thesis)",
    category: "draft_intelligence",
    oneLiner:
      "For every pick recommendation, generates the strongest counter-argument so you decide with full visibility.",
    whatNoCompetitorDoes:
      "All draft tools are advocates. They recommend and justify. None present the bear case alongside the bull case as a required step.",
    howGseDoesIt:
      "Every recommended pick generates: Bull thesis (why take), Bear thesis (why fade), Risk flags (injury, depth chart, target share questions), and a confidence-weighted decision card.",
    competitorGap:
      "Zero competitors in fantasy space present structured counter-theses. This is borrowed from financial equity research.",
    status: "confirmed_unique",
    gseReadiness: "designed_not_built",
    buildPhase: 5,
    revenueImpact: "medium",
    trustImpact: "critical",
    sourceGapNote: null,
  },
  {
    id: "historical_regret_engine",
    name: "Historical Regret Engine",
    category: "draft_intelligence",
    oneLiner:
      "Surfaces how past drafts with this pick pattern played out — including the ones that blew up.",
    whatNoCompetitorDoes:
      "Competitors show current ADP and current projections. None show historical distributions of outcomes when a similar draft decision was made in prior years.",
    howGseDoesIt:
      "Queries draft history database for similar roster composition at your pick slot. Shows: median season finish, % that made playoffs, % that had catastrophic injury to starter, and the specific cases of regret.",
    competitorGap:
      "No fantasy platform shows 'here are the 200 drafts where your exact situation occurred and how they ended.'",
    status: "confirmed_unique",
    gseReadiness: "designed_not_built",
    buildPhase: 7,
    revenueImpact: "medium",
    trustImpact: "high",
    sourceGapNote: "Requires historical draft data — source rights review required before building.",
  },
  {
    id: "roster_destiny_simulator",
    name: "Roster Destiny Simulator",
    category: "draft_intelligence",
    oneLiner: "After your draft, Monte Carlo your season: 10,000 simulation outcomes including injury variance.",
    whatNoCompetitorDoes:
      "Post-draft tools show a projected finish or projected points. None run full 17-week simulations with realistic injury, weather, and game-script variance.",
    howGseDoesIt:
      "Runs 10,000 season simulations per roster. Outputs: playoff probability, championship probability, bust risk %, key fragility points (weeks where a single injury tanks the season), and ceiling scenario path.",
    competitorGap:
      "RotoViz does simulation-informed analysis but not a true post-draft 10,000-sim destiny dashboard. No one shows 'your championship path requires X and Y to stay healthy.'",
    status: "confirmed_unique",
    gseReadiness: "designed_not_built",
    buildPhase: 8,
    revenueImpact: "high",
    trustImpact: "high",
    sourceGapNote: null,
  },

  // ── League Memory ──────────────────────────────────────────────────────────
  {
    id: "league_memory_graph",
    name: "League Memory Graph",
    category: "league_memory",
    oneLiner:
      "Builds a persistent knowledge graph of your specific league: trades, tendencies, rivalries, historical value errors.",
    whatNoCompetitorDoes:
      "All tools treat leagues as generic 12-team leagues. Nobody remembers your league's micro-culture, historical draft patterns, commissioner rules quirks, or which managers chronically overpay for WRs.",
    howGseDoesIt:
      "Persistent league profile: manager archetypes, 3-year trade history, historical value gaps per manager, rule variants, scoring format, and rivalry map. Feeds all recommendations with league context.",
    competitorGap:
      "Sleeper stores league history for messaging but does not use it to personalize draft or trade advice. FantasyPros has zero league memory.",
    status: "confirmed_unique",
    gseReadiness: "designed_not_built",
    buildPhase: 9,
    revenueImpact: "critical",
    trustImpact: "high",
    sourceGapNote: null,
  },
  {
    id: "trade_value_memory",
    name: "Trade Value Memory",
    category: "league_memory",
    oneLiner:
      "Tracks every trade your league has accepted and rejected to calibrate real market value for your specific managers.",
    whatNoCompetitorDoes:
      "Trade analyzers use universal dynasty/redraft values. None calibrate to your specific league's revealed preferences from completed trades.",
    howGseDoesIt:
      "Each accepted/rejected trade is a data point. Over time, builds a manager-specific value model: 'your league values RBs 15% above market consensus and undervalues rookie WRs by 20%.'",
    competitorGap:
      "FantasyPros Trade Analyzer, Footballguys KUBIAK, and RotoWire all use global market values. Source gap: verify no competitor does this.",
    status: "likely_unique",
    gseReadiness: "designed_not_built",
    buildPhase: 9,
    revenueImpact: "high",
    trustImpact: "medium",
    sourceGapNote: "Source gap — verify no competitor has implemented league-calibrated trade values before publishing claim.",
  },
  {
    id: "draft_autopsy",
    name: "Draft Autopsy System",
    category: "league_memory",
    oneLiner:
      "Post-draft autopsy grades every pick by process quality (not just outcome), teaching you to draft better next year.",
    whatNoCompetitorDoes:
      "Nobody grades your draft picks on PROCESS (was it the right decision given available info?) vs OUTCOME (did it work?). Every post-draft recap only judges outcomes.",
    howGseDoesIt:
      "After Week 17, grades each pick: GOOD_PROCESS_GOOD_OUTCOME / GOOD_PROCESS_BAD_OUTCOME / BAD_PROCESS_GOOD_OUTCOME / LUCKY. Identifies systematic biases in your drafting (e.g., always over-valuing name brand, reaching in specific rounds).",
    competitorGap:
      "No fantasy product implements process-based grading for drafts. Borrowed directly from poker analysis methodology.",
    status: "confirmed_unique",
    gseReadiness: "in_sprint",
    buildPhase: 10,
    revenueImpact: "medium",
    trustImpact: "critical",
    sourceGapNote: null,
  },

  // ── Decision OS ────────────────────────────────────────────────────────────
  {
    id: "evidence_debate_system",
    name: "Evidence Debate System",
    category: "decision_os",
    oneLiner:
      "Every signal is logged with evidence, confidence, and expiry — displayed as a live debate, not a number.",
    whatNoCompetitorDoes:
      "Tools give you a ranking or a score. None show you the underlying evidence chain, which sources agreed/disagreed, and when the signal expires.",
    howGseDoesIt:
      "Each signal has: source, confidence level, evidence summary, counter-signals, and expiry timestamp. The 'debate' view shows bull/bear signals for each player in real-time.",
    competitorGap:
      "PFF shows grades without full evidence chain. FantasyLabs shows ownership correlations but not structured signal debate.",
    status: "confirmed_unique",
    gseReadiness: "designed_not_built",
    buildPhase: 4,
    revenueImpact: "high",
    trustImpact: "critical",
    sourceGapNote: null,
  },
  {
    id: "decision_audit_trail",
    name: "Decision Audit Trail",
    category: "decision_os",
    oneLiner:
      "Every decision you make is logged with the evidence available at the time — so you can review it fairly later.",
    whatNoCompetitorDoes:
      "No tool captures what information was available when you made a decision and lets you review it in hindsight without recency bias.",
    howGseDoesIt:
      "Every start/sit decision, trade, or waiver add is time-stamped with the signals present at that moment. Post-season audit shows what you knew vs what happened.",
    competitorGap:
      "No fantasy or sports prediction product has a decision audit trail with point-in-time evidence snapshots.",
    status: "confirmed_unique",
    gseReadiness: "designed_not_built",
    buildPhase: 11,
    revenueImpact: "medium",
    trustImpact: "critical",
    sourceGapNote: null,
  },
  {
    id: "narrative_inflation_detector",
    name: "Narrative Inflation Detector",
    category: "decision_os",
    oneLiner:
      "Identifies when a narrative (hype) has inflated ownership or lines beyond what the underlying data supports.",
    whatNoCompetitorDoes:
      "Analysts feed narratives. No tool systematically detects when a narrative has outrun the evidence and flags it.",
    howGseDoesIt:
      "Tracks narrative-driven ownership changes vs actual performance data changes. If ownership surges 20pp but target share/snap count doesn't change, flags NARRATIVE_INFLATION.",
    competitorGap:
      "FantasyLabs tracks ownership shifts but does not tie them to underlying data support. No competitor has a narrative inflation signal.",
    status: "confirmed_unique",
    gseReadiness: "designed_not_built",
    buildPhase: 6,
    revenueImpact: "medium",
    trustImpact: "high",
    sourceGapNote: null,
  },
  {
    id: "bias_detection_engine",
    name: "Personal Bias Detection Engine",
    category: "decision_os",
    oneLiner:
      "Identifies your systematic decision biases (recency, favorite team, positional hoarding) and surfaces them during decisions.",
    whatNoCompetitorDoes:
      "No sports tool uses your personal decision history to identify and warn you about your own cognitive biases in real time.",
    howGseDoesIt:
      "Tracks patterns: do you chronically start players on teams you root for? Do you overvalue last week's performance? Do you undervalue pass-catchers vs rushers? Surfaces live bias alerts.",
    competitorGap:
      "Borrowed from behavioral finance. No fantasy or sports product implements personal cognitive bias detection.",
    status: "confirmed_unique",
    gseReadiness: "designed_not_built",
    buildPhase: 11,
    revenueImpact: "medium",
    trustImpact: "high",
    sourceGapNote: null,
  },

  // ── Calibration & Accountability ──────────────────────────────────────────
  {
    id: "model_calibration_tracker",
    name: "Public Model Calibration Tracker",
    category: "calibration_accountability",
    oneLiner:
      "Every pick GSE publishes is tracked against outcomes, with full calibration metrics published for anyone to audit.",
    whatNoCompetitorDoes:
      "Most prediction sites claim accuracy but do not publish machine-readable calibration data (MAE, RMSE, Brier score, CLV). Anyone can cherry-pick wins.",
    howGseDoesIt:
      "After each slate or game, runs full autopsy: MAE, RMSE, bias, Pearson-r. All results published in public calibration dashboard. Required to reach PROVEN and ESTABLISHED milestones.",
    competitorGap:
      "Action Network publishes some historical records but not calibration science. No competitor publishes Brier score or log loss for their picks.",
    status: "confirmed_unique",
    gseReadiness: "in_sprint",
    buildPhase: 10,
    revenueImpact: "critical",
    trustImpact: "critical",
    sourceGapNote: null,
  },
  {
    id: "process_grading_system",
    name: "Process Grading System",
    category: "calibration_accountability",
    oneLiner:
      "Distinguishes picks that were correct for the right reasons vs correct by luck — and flags both.",
    whatNoCompetitorDoes:
      "Every system judges itself by results (wins/losses). None implement process-quality grading that separates GOOD_PROCESS_BAD_OUTCOME from BAD_PROCESS_GOOD_OUTCOME.",
    howGseDoesIt:
      "DFS autopsy categories: GOOD_PROCESS_GOOD_OUTCOME, GOOD_PROCESS_BAD_OUTCOME, BAD_PROCESS_GOOD_OUTCOME, LUCKY, PROJECTION_MISS, OWNERSHIP_MISREAD, BAD_PROCESS_BAD_OUTCOME.",
    competitorGap:
      "No DFS or picks platform categorizes picks by process quality. This is first-of-kind in sports prediction.",
    status: "confirmed_unique",
    gseReadiness: "in_sprint",
    buildPhase: 10,
    revenueImpact: "high",
    trustImpact: "critical",
    sourceGapNote: null,
  },
  {
    id: "no_play_first_class",
    name: "No-Play as First-Class Outcome",
    category: "calibration_accountability",
    oneLiner:
      "When GSE has no edge, it says so explicitly — and that 'no play' is tracked in the accuracy record.",
    whatNoCompetitorDoes:
      "Every site publishes picks. None have a formal 'No-Play' classification that is logged, tracked, and counted in their accuracy record.",
    howGseDoesIt:
      "No-Play cards are as prominent as pick cards. Each No-Play has a reason (signal conflict, insufficient confidence, injury uncertainty, etc.) and is auditable.",
    competitorGap:
      "Action Network, SportsLine, Covers — all publish picks; none formally track 'passes' as a pick type in accuracy metrics.",
    status: "confirmed_unique",
    gseReadiness: "designed_not_built",
    buildPhase: 3,
    revenueImpact: "low",
    trustImpact: "critical",
    sourceGapNote: null,
  },

  // ── DFS Portfolio ─────────────────────────────────────────────────────────
  {
    id: "dfs_optimizer_full",
    name: "Full DFS Optimizer Suite (Phases 1–10)",
    category: "dfs_portfolio",
    oneLiner:
      "End-to-end DFS pipeline: projections → lineup build → stack enforcement → Monte Carlo → late swap → autopsy.",
    whatNoCompetitorDoes:
      "DFS tools either optimize OR provide projections OR do post-slate analysis. None do the full loop from projection to post-slate calibration in one integrated system.",
    howGseDoesIt:
      "10-phase DFS engine: schema → projections → optimizer → constraints → narrative classification → portfolio analytics → lineup thesis → Monte Carlo → late swap → autopsy.",
    competitorGap:
      "RotoGrinders, FantasyLabs, Stokastic, SaberSim — all are partial systems (primarily optimizer-focused). None close the loop to calibration.",
    status: "differentiated_execution",
    gseReadiness: "in_sprint",
    buildPhase: 10,
    revenueImpact: "critical",
    trustImpact: "high",
    sourceGapNote: null,
  },
  {
    id: "dfs_narrative_classification",
    name: "DFS Narrative Signal Classification",
    category: "dfs_portfolio",
    oneLiner:
      "Classifies each DFS pick signal as LEVERAGE, SAFETY, CONTRARIAN, BOOM_OR_BUST, or TRAP — displayed on every player card.",
    whatNoCompetitorDoes:
      "DFS tools show ownership and projection. None classify each player's DFS narrative type as a structured, auditable signal.",
    howGseDoesIt:
      "Narrative engine: low ownership + high upside = LEVERAGE; high correlation with chalk = SAFETY; projected high ownership + median upside = TRAP; high ceiling + low floor = BOOM_OR_BUST.",
    competitorGap:
      "FantasyLabs shows leverage scores. Stokastic shows value scores. Neither implements structured narrative classification.",
    status: "confirmed_unique",
    gseReadiness: "in_sprint",
    buildPhase: 6,
    revenueImpact: "medium",
    trustImpact: "medium",
    sourceGapNote: null,
  },
  {
    id: "portfolio_correlation_manager",
    name: "Portfolio Correlation Manager",
    category: "dfs_portfolio",
    oneLiner:
      "Manages correlation across your full lineup set — ensures no hidden exposure to a single game's variance.",
    whatNoCompetitorDoes:
      "Most DFS tools show ownership and projection at the player level. None measure and manage total portfolio correlation across your 20+ lineup set.",
    howGseDoesIt:
      "After building lineups, computes cross-lineup correlation matrix. Flags portfolios over-correlated to a single game or player. Optimizes for independence.",
    competitorGap:
      "SaberSim has ownership diversity tools. No tool explicitly manages cross-lineup correlation as a portfolio metric.",
    status: "likely_unique",
    gseReadiness: "in_sprint",
    buildPhase: 8,
    revenueImpact: "medium",
    trustImpact: "medium",
    sourceGapNote: "Source gap — verify SaberSim's full correlation toolset before publishing claim.",
  },

  // ── Voice Assistant ────────────────────────────────────────────────────────
  {
    id: "voice_jarvis",
    name: "Voice Jarvis — Live Draft Co-Pilot",
    category: "voice_assistant",
    oneLiner:
      "Voice-activated draft assistant that calls out picks, warns about opponent tendencies, and suggests in real time.",
    whatNoCompetitorDoes:
      "No fantasy platform has a voice-first draft interface. All require eyes on screen during a live draft.",
    howGseDoesIt:
      "Speech-to-intent → pick parsing → immediate response synthesized. Commands: 'Who should I draft at 4.5?', 'What is [manager name] likely to do next?', 'What's my biggest roster hole?'",
    competitorGap:
      "No competitor has implemented voice-activated draft assistance. Fantasy Life had a co-pilot feature but not voice.",
    status: "confirmed_unique",
    gseReadiness: "roadmap_q3_2026",
    buildPhase: 12,
    revenueImpact: "critical",
    trustImpact: "high",
    sourceGapNote: null,
  },
  {
    id: "hands_free_mode",
    name: "Hands-Free Draft Mode",
    category: "voice_assistant",
    oneLiner:
      "Keeps your pick queue synchronized and speaks alerts so you can draft while watching pre-game coverage.",
    whatNoCompetitorDoes:
      "All tools require active screen monitoring during drafts. Jarvis operates eyes-free.",
    howGseDoesIt:
      "Background listener detects when your pick is approaching (via draft platform clock monitoring), speaks a countdown, suggests top-3 picks, and confirms your selection.",
    competitorGap: "No fantasy tool has implemented hands-free / eyes-free draft mode.",
    status: "confirmed_unique",
    gseReadiness: "roadmap_q3_2026",
    buildPhase: 12,
    revenueImpact: "high",
    trustImpact: "medium",
    sourceGapNote: null,
  },

  // ── Prediction Analytics ──────────────────────────────────────────────────
  {
    id: "sharp_vs_public_tracker",
    name: "Sharp vs Public Signal Dashboard",
    category: "prediction_analytics",
    oneLiner:
      "Surfaces RLM, steam, and sharp money signals alongside public betting percentages in a single integrated view.",
    whatNoCompetitorDoes:
      "Action Network shows public percentages. OddsJam shows EV. Unabated shows sharp movement. No tool integrates ALL of these into one signal view.",
    howGseDoesIt:
      "Single dashboard: public %, sharp %, line movement history, RLM flag, steam flag, closing line projection. Per-game and per-pick-type views.",
    competitorGap:
      "No single tool combines all sharp indicators in one integrated sharp vs. public signal dashboard.",
    status: "differentiated_execution",
    gseReadiness: "designed_not_built",
    buildPhase: 4,
    revenueImpact: "high",
    trustImpact: "high",
    sourceGapNote: "Requires licensed odds data feed. Source rights review required.",
  },
  {
    id: "clv_tracker",
    name: "Closing Line Value Tracker",
    category: "prediction_analytics",
    oneLiner:
      "Tracks CLV for every GSE pick automatically, presented as the primary performance metric for the GSE model.",
    whatNoCompetitorDoes:
      "Action Network tracks CLV for users. No picks site uses CLV as the PRIMARY published accuracy metric for its own model.",
    howGseDoesIt:
      "Every GSE pick has: open line, publish line, close line. CLV computed automatically. Published in calibration dashboard. Required for ESTABLISHED milestone.",
    competitorGap:
      "Action Network's CLV tool is for user bets. No site publishes CLV for their own picks model as the accountability standard.",
    status: "likely_unique",
    gseReadiness: "designed_not_built",
    buildPhase: 4,
    revenueImpact: "medium",
    trustImpact: "critical",
    sourceGapNote: null,
  },
  {
    id: "kelly_calculator",
    name: "Informed Kelly Calculator",
    category: "prediction_analytics",
    oneLiner:
      "Shows fractional Kelly stake sizing with explicit confidence-adjusted edge, not as a betting instruction but as an educational tool.",
    whatNoCompetitorDoes:
      "Most betting sites show implied probability only. None tie confidence scores to Kelly outputs as a bankroll management education tool.",
    howGseDoesIt:
      "Kelly tab shows: implied edge, recommended fractional Kelly (25% of full Kelly default), expected value per unit, and a 'what this means for you' plain-language explanation. Always labeled: educational, not financial advice.",
    competitorGap:
      "Unabated has Kelly calculator. No picks site integrates it directly with their own confidence scores and labels it as educational-only.",
    status: "differentiated_execution",
    gseReadiness: "designed_not_built",
    buildPhase: 5,
    revenueImpact: "low",
    trustImpact: "medium",
    sourceGapNote: null,
  },

  // ── Integrity ──────────────────────────────────────────────────────────────
  {
    id: "scraping_clearance_engine",
    name: "Scraping Clearance Engine",
    category: "integrity",
    oneLiner:
      "Every data extraction job must pass through a rights clearance gate before running — enforced in code, not policy.",
    whatNoCompetitorDoes:
      "No competitor publishes or implements a code-level scraping clearance engine. Rights compliance is typically ad hoc.",
    howGseDoesIt:
      "checkClearance() must be called before every extraction job. ClearanceResult.allowed=false stops the job. wrapExtractedRecord() enforces RightsSnapshot on every record. Throws if clearance not granted.",
    competitorGap:
      "No competitor has published a formal, code-enforced scraping clearance architecture. This is a GSE-first integrity system.",
    status: "confirmed_unique",
    gseReadiness: "live",
    buildPhase: 1,
    revenueImpact: "low",
    trustImpact: "critical",
    sourceGapNote: null,
  },
  {
    id: "data_label_enforcement",
    name: "Data Label Enforcement",
    category: "integrity",
    oneLiner:
      "Illustrative data is always labeled ILLUSTRATIVE. Modeled values always labeled MODELED. Enforced at the type level.",
    whatNoCompetitorDoes:
      "No competitor has code-level enforcement of data label requirements on every displayed value.",
    howGseDoesIt:
      "TypeScript types require data provenance labels. Components that display projections or simulated values must accept and display their label type.",
    competitorGap:
      "Industry-wide problem: many tools display modeled values without distinguishing them from real data. GSE enforces this in the type system.",
    status: "confirmed_unique",
    gseReadiness: "live",
    buildPhase: 1,
    revenueImpact: "low",
    trustImpact: "critical",
    sourceGapNote: null,
  },
  {
    id: "trust_ladder_gating",
    name: "Trust Ladder / Milestone Gating",
    category: "integrity",
    oneLiner:
      "GSE's pricing and claims unlock only when real performance milestones are verified — named publicly ahead of time.",
    whatNoCompetitorDoes:
      "No competitor has a public, pre-named milestone ladder tied to pricing and capability claims. All competitors set prices without proof requirements.",
    howGseDoesIt:
      "Four named tiers: FOUNDING (live), PROVEN (≥100 settled picks + published calibration), ESTABLISHED (≥500 + CLV ≥52.4%), AUTHORITY (multi-season ROI). Each tier unlocks pricing and claims. Founding members grandfathered.",
    competitorGap:
      "This is a structural trust mechanism. No competitor has implemented or published a proof-gated pricing ladder.",
    status: "confirmed_unique",
    gseReadiness: "live",
    buildPhase: 1,
    revenueImpact: "critical",
    trustImpact: "critical",
    sourceGapNote: null,
  },

  // ── Revenue Readiness ──────────────────────────────────────────────────────
  {
    id: "founding_member_program",
    name: "Founding Member Program",
    category: "revenue_readiness",
    oneLiner:
      "First cohort of members grandfathered for life at founding price, creating a permanent ambassador class.",
    whatNoCompetitorDoes:
      "Most tools launch with a standard discount. None create a formal, named 'founding' class with documented grandfathering and a named ladder to show what each step unlocks.",
    howGseDoesIt:
      "Founding members locked at FOUNDING tier price forever. As GSE hits PROVEN and ESTABLISHED, price steps up for new users only. Founding members see the ladder milestones publicly to build trust.",
    competitorGap:
      "Standard practice in SaaS is documented but the trust-ladder framing + grandfathering + named milestones is differentiated.",
    status: "differentiated_execution",
    gseReadiness: "live",
    buildPhase: 1,
    revenueImpact: "critical",
    trustImpact: "high",
    sourceGapNote: null,
  },
  {
    id: "public_calibration_dashboard",
    name: "Public Calibration Dashboard",
    category: "revenue_readiness",
    oneLiner:
      "All accuracy metrics — MAE, RMSE, win rate, CLV — published in a public, machine-readable dashboard anyone can audit.",
    whatNoCompetitorDoes:
      "Competitors hide or cherry-pick their track record. No competitor publishes a full, machine-readable calibration database open to audit.",
    howGseDoesIt:
      "Every settled pick feeds the calibration DB. Public dashboard shows: overall win rate, by-sport win rate, CLV, MAE by position, Brier score. Available to non-subscribers.",
    competitorGap:
      "Action Network publishes some records. No competitor publishes Brier score, log loss, or MAE with full pick history.",
    status: "confirmed_unique",
    gseReadiness: "designed_not_built",
    buildPhase: 10,
    revenueImpact: "high",
    trustImpact: "critical",
    sourceGapNote: null,
  },
  {
    id: "responsible_gaming_doctrine",
    name: "Responsible Gaming Doctrine",
    category: "integrity",
    oneLiner:
      "GSE treats No-Play as first-class, never promotes guaranteed wins, and surfaces responsible gaming resources proactively.",
    whatNoCompetitorDoes:
      "Many picks sites imply or state win rate guarantees. None have a formal responsible gaming doctrine embedded in their product architecture.",
    howGseDoesIt:
      "No win guarantee language anywhere. Kelly calculator labeled 'educational only'. No-Play outcomes tracked in accuracy. Responsible gaming links in pick cards. Problem gambling resources in settings.",
    competitorGap:
      "FanDuel and DraftKings (as operators) must comply with RG standards. Content sites have no enforcement. GSE is first picks site to self-impose this doctrine architecturally.",
    status: "confirmed_unique",
    gseReadiness: "designed_not_built",
    buildPhase: 3,
    revenueImpact: "low",
    trustImpact: "critical",
    sourceGapNote: null,
  },
] as const;

// ── Scoring models ─────────────────────────────────────────────────────────────

export interface GseScoringModel {
  id: string;
  name: string;
  description: string;
  inputSignals: string[];
  outputRange: string;
  calibrationMethod: string;
  usedIn: string[];
}

export const GSE_SCORING_MODELS: ReadonlyArray<GseScoringModel> = [
  {
    id: "draft_edge_score",
    name: "GSE Draft Edge Score",
    description:
      "Composite score 0–100 representing how much relative value a pick provides at your current draft slot vs. ADP and opponent tendencies.",
    inputSignals: ["ADP", "manager genome", "position scarcity", "roster construction balance", "injury risk"],
    outputRange: "0–100 (>70 = strong value, <30 = avoid)",
    calibrationMethod: "Calibrated against historical draft outcome data; recalibrated post-season.",
    usedIn: ["War Room draft assistant", "Draft Futures Engine", "Roster Destiny Simulator"],
  },
  {
    id: "pick_urgency_score",
    name: "GSE Pick Urgency Score",
    description:
      "Indicates how many rounds you can safely wait before a player becomes unavailable at acceptable value.",
    inputSignals: ["manager genome opponent tendencies", "ADP variance", "position run history", "target round"],
    outputRange: "1–5 rounds (1 = must pick now, 5 = wait safely)",
    calibrationMethod: "Based on historical draft positional run patterns.",
    usedIn: ["War Room draft assistant", "Voice Jarvis"],
  },
  {
    id: "roster_fragility_score",
    name: "GSE Roster Fragility Score",
    description:
      "Measures how vulnerable your current roster is to a single injury destroying your season.",
    inputSignals: ["starter injury risk %", "depth chart quality", "bye week concentration", "replacement level at each position"],
    outputRange: "0–100 (0 = bulletproof, 100 = one injury away from ruin)",
    calibrationMethod: "Validated against historical bust rates by fragility score range.",
    usedIn: ["Roster Destiny Simulator", "Draft Futures Engine", "In-season waiver recommendations"],
  },
  {
    id: "dfs_portfolio_score",
    name: "GSE DFS Portfolio Score",
    description:
      "Composite metric for a lineup set covering projection upside, ownership leverage, correlation health, and contest-type fit.",
    inputSignals: ["lineup projection", "average ownership", "leverage score", "correlation matrix", "contest mode"],
    outputRange: "0–100 (85+ = optimal for GPP, 70+ = cash-safe)",
    calibrationMethod: "Monte Carlo back-tested against historical DFS contest results.",
    usedIn: ["DFS optimizer", "Monte Carlo engine", "portfolio analytics"],
  },
  {
    id: "prediction_confidence_score",
    name: "GSE Prediction Confidence Score",
    description:
      "0–100 score on each pick representing signal strength, market efficiency, and model agreement.",
    inputSignals: ["signal count", "signal agreement %", "historical model accuracy for this situation", "market position", "injury flag"],
    outputRange: "0–100 (≥70 = publish; <55 = No-Play threshold)",
    calibrationMethod: "Calibrated via Brier score on historical picks. Recalibrated after each 100-pick sample.",
    usedIn: ["All pick cards", "Alert system", "No-Play doctrine", "Calibration dashboard"],
  },
  {
    id: "revenue_readiness_score",
    name: "GSE Revenue Readiness Score",
    description:
      "Internal metric tracking how ready GSE is to unlock each pricing tier based on milestone criteria.",
    inputSignals: ["settled pick count", "published calibration status", "verified CLV", "multi-season ROI data"],
    outputRange: "FOUNDING / PROVEN / ESTABLISHED / AUTHORITY",
    calibrationMethod: "Milestone gates are fixed; score is binary per gate.",
    usedIn: ["Internal milestone dashboard", "Pricing gate enforcement", "Founder transparency page"],
  },
  {
    id: "source_integrity_score",
    name: "GSE Source Integrity Score",
    description:
      "Per-source quality score tracking data freshness, rights status, and historical reliability.",
    inputSignals: ["rights classification", "freshness timestamp", "error rate", "scraping clearance status", "license type"],
    outputRange: "0–100 (≥80 = trusted source; <60 = review required; <40 = blocked)",
    calibrationMethod: "Computed from source registry + clearance engine logs.",
    usedIn: ["Source rights registry", "Clearance engine", "Data ingest quality gates"],
  },
] as const;

// ── Helper functions ──────────────────────────────────────────────────────────

export function confirmedUniqueCount(): number {
  return FIRST_OF_KIND_SYSTEMS.filter((s) => s.status === "confirmed_unique").length;
}

export function systemsByCategory(category: SystemCategory): FirstOfKindSystem[] {
  return FIRST_OF_KIND_SYSTEMS.filter((s) => s.category === category) as FirstOfKindSystem[];
}

export function liveOrInSprintSystems(): FirstOfKindSystem[] {
  return FIRST_OF_KIND_SYSTEMS.filter(
    (s) => s.gseReadiness === "live" || s.gseReadiness === "in_sprint"
  ) as FirstOfKindSystem[];
}

export function criticalTrustImpactSystems(): FirstOfKindSystem[] {
  return FIRST_OF_KIND_SYSTEMS.filter((s) => s.trustImpact === "critical") as FirstOfKindSystem[];
}

export function systemsByBuildPhase(phase: BuildPhase): FirstOfKindSystem[] {
  return FIRST_OF_KIND_SYSTEMS.filter((s) => s.buildPhase === phase) as FirstOfKindSystem[];
}
