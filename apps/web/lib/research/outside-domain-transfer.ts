/**
 * Outside-domain analytics transfer data contract for Galaxy Sports Edge.
 * Documents 15 domains whose methods GSE can adapt for sports decision intelligence.
 *
 * Pattern: domain mechanic → transfer mechanism → V1 GSE feature → V2 GSE feature.
 * Legal/data risks noted per domain.
 */

// ── Transfer types ───────────────────────────────────────────────────────────

export type TransferDomain =
  | "finance_quant"
  | "insurance_underwriting"
  | "fraud_detection"
  | "weather_forecasting"
  | "supply_chain"
  | "political_forecasting"
  | "epidemiology"
  | "chess_engines"
  | "poker_gto"
  | "f1_telemetry"
  | "aviation_checklists"
  | "nasa_mission_control"
  | "military_ooda"
  | "medical_triage"
  | "legal_case_analysis";

export type TransferStatus = "v1_ready" | "v2_roadmap" | "research" | "excluded";

export interface DomainTransfer {
  domain: TransferDomain;
  domainName: string;
  coreMechanic: string;
  transferBridge: string;
  v1Feature: string;
  v2Feature: string;
  dataRequirements: string;
  legalRisk: string;
  status: TransferStatus;
  gseComponent: string;
}

// ── Domain transfers ─────────────────────────────────────────────────────────

export const DOMAIN_TRANSFERS: ReadonlyArray<DomainTransfer> = [
  {
    domain: "finance_quant",
    domainName: "Finance / Quantitative Trading",
    coreMechanic:
      "Expected value, Kelly criterion, Sharpe ratio, alpha generation, market efficiency, ensemble factor models, regime detection.",
    transferBridge:
      "Sports lines are markets; picks are trades; track records are alpha. Every finance concept for measuring edge, sizing, and compounding applies directly.",
    v1Feature:
      "Kelly-adjusted confidence scores on every pick. EV shown as 'expected return per $100 risked' with explicit variance warning. Sharpe-equivalent metric for long-run pick quality.",
    v2Feature:
      "Ensemble factor model for picks (momentum, value, quality factors mapped to sports signals). Regime detection: identify when model is in 'drawdown mode' and reduce pick frequency.",
    dataRequirements: "Historical lines data (publicly available). Pick history.",
    legalRisk: "Low — educational framing, not financial advice.",
    status: "v1_ready",
    gseComponent: "Pick confidence scoring, prediction analytics dashboard",
  },
  {
    domain: "insurance_underwriting",
    domainName: "Insurance Underwriting",
    coreMechanic:
      "Actuarial risk pooling, expected loss modeling, risk stratification, tail risk pricing.",
    transferBridge:
      "Player injury risk = actuarial loss probability. Roster fragility = portfolio tail risk. Underwriting frameworks translate directly to roster construction.",
    v1Feature:
      "Injury risk actuarial score per player: expected games missed, variance, tail risk (career-ending). Displayed as 'expected healthy starts' in 17-game season.",
    v2Feature:
      "Roster insurance recommendation: 'Your portfolio has 34% chance of a catastrophic injury to a starter. Recommend adding depth at RB2.'",
    dataRequirements: "Player injury history (public). Position-based actuarial tables.",
    legalRisk: "Low — no insurance product offered.",
    status: "v1_ready",
    gseComponent: "Roster Fragility Score, Draft Futures Engine",
  },
  {
    domain: "fraud_detection",
    domainName: "Fraud Detection / Anomaly Detection",
    coreMechanic:
      "Behavioral pattern recognition, anomaly scoring, entity relationship graphs, real-time alert thresholds.",
    transferBridge:
      "Unusual stat lines, suspicious injury timing, sudden line moves, or ownership anomalies are detectable as outliers from baseline patterns.",
    v1Feature:
      "Line anomaly detector: flags games where the line moved >3 pts from open without injury news. Flags outlier ownership spikes not explained by news.",
    v2Feature:
      "Multi-book anomaly graph: detects coordinated sharp positioning across books. Flags games with unusual pre-game line freezes combined with high public exposure.",
    dataRequirements: "Odds feed (licensed). Ownership data (licensed).",
    legalRisk: "Low — pattern detection, not fraud accusation.",
    status: "v2_roadmap",
    gseComponent: "Sharp vs Public Signal Dashboard, Narrative Inflation Detector",
  },
  {
    domain: "weather_forecasting",
    domainName: "Weather Forecasting / Ensemble Models",
    coreMechanic:
      "Probabilistic ensemble forecasting, uncertainty quantification, spaghetti models, cone of uncertainty.",
    transferBridge:
      "Player projection = probabilistic forecast with a cone of uncertainty. Like weather models, sports projections should show the distribution, not just the single number.",
    v1Feature:
      "Every player projection shows floor (P10), median, ceiling (P90) — displayed as a bar with min/max range. Not just one number.",
    v2Feature:
      "Ensemble projection model: combine 5 independent projection sources, show agreement and disagreement zones like weather spaghetti models. Highlight where models diverge.",
    dataRequirements: "Multiple projection sources. Public model outputs.",
    legalRisk: "Low.",
    status: "v1_ready",
    gseComponent: "DFS projections, Monte Carlo engine, pick confidence scoring",
  },
  {
    domain: "supply_chain",
    domainName: "Supply Chain / Inventory Optimization",
    coreMechanic:
      "JIT (just-in-time) restocking, demand forecasting, safety stock, bottleneck identification.",
    transferBridge:
      "Waiver wire = inventory. Roster depth = safety stock. Trade deadline = procurement event. Bottleneck = single-point-of-failure starter with no backup.",
    v1Feature:
      "Roster depth audit: identifies your 'out of stock' positions (no viable backup) and your 'overstock' positions. Suggests waiver adds to fill gaps before a shortage (injury).",
    v2Feature:
      "Dynamic waiver queue optimization: prioritizes adds by your specific roster fragility — not generic add rankings. Adds the player your roster needs most, not the highest rostered player.",
    dataRequirements: "Waiver wire availability (league sync required). Depth chart data.",
    legalRisk: "Medium — league platform API access may require ToS review.",
    status: "v1_ready",
    gseComponent: "Roster Fragility Score, In-season waiver recommendations",
  },
  {
    domain: "political_forecasting",
    domainName: "Political Forecasting (Prediction Markets)",
    coreMechanic:
      "Aggregated probability markets, wisdom of crowds, calibration tracking, superforecasting methodology.",
    transferBridge:
      "Kalshi/Polymarket prediction mechanics = sports pick probability aggregation. Superforecasting calibration techniques apply directly to sports model calibration.",
    v1Feature:
      "Crowd-sourced confidence: show how GSE model confidence aligns vs market-implied probability. When they diverge, surface it as an edge signal.",
    v2Feature:
      "Internal prediction tournament: allow users to set their own confidence on each GSE pick. Track their calibration over time. Leaderboard for best-calibrated users.",
    dataRequirements: "Sports prediction market data (public on Kalshi/Polymarket for licensed sports markets).",
    legalRisk: "Medium — prediction market data licensing varies by market.",
    status: "v2_roadmap",
    gseComponent: "Calibration dashboard, pick confidence scoring",
  },
  {
    domain: "epidemiology",
    domainName: "Epidemiology / Contagion Modeling",
    coreMechanic:
      "SIR models, R0 reproduction number, exponential spread patterns, herd immunity thresholds.",
    transferBridge:
      "Injury contagion: team-level injury surges that cascade (OL injury → QB pressure → WR underperformance). Information contagion: narrative spreads across media, inflating ownership beyond evidence.",
    v1Feature:
      "Narrative contagion detector: tracks how fast a narrative spreads across social/media sources and models the 'half-life' of narrative influence on ownership.",
    v2Feature:
      "Injury cascade model: given OL health metrics, predict downstream impact on QB play style, rushing volume, and WR target distribution.",
    dataRequirements: "Media mention frequency data. Injury report data (public).",
    legalRisk: "Low.",
    status: "v2_roadmap",
    gseComponent: "Narrative Inflation Detector, injury signal classification",
  },
  {
    domain: "chess_engines",
    domainName: "Chess Engines (Minimax / Monte Carlo Tree Search)",
    coreMechanic:
      "Lookahead search, evaluation functions, position advantage scores, principal variation, sacrifice detection.",
    transferBridge:
      "Draft pick sequencing = chess move planning. Evaluate not just the current pick but the tree of future picks it enables or blocks.",
    v1Feature:
      "Draft lookahead: given your current pick, show the top-3 subsequent picks you can reasonably expect to get. Evaluation function: expected roster strength after 5 picks from each branch.",
    v2Feature:
      "Sacrifice detection: identify 'sacrifice picks' — reaching for a player 2 rounds early is correct if it blocks opponents from a dominant stack and enables your own superior position.",
    dataRequirements: "ADP data. Positional scarcity curves.",
    legalRisk: "Low.",
    status: "v1_ready",
    gseComponent: "Draft Futures Engine, Pick Urgency Score",
  },
  {
    domain: "poker_gto",
    domainName: "Poker / Game Theory Optimal (GTO)",
    coreMechanic:
      "GTO mixed strategies, exploitative deviation, range construction, equity realization, expected value.",
    transferBridge:
      "DFS ownership = poker frequencies. GTO DFS means building ownership distributions that can't be exploited. Exploit deviation when opponents are predictably non-GTO.",
    v1Feature:
      "GTO ownership recommendation: for any DFS slate, show what ownership % is 'GTO' for a given projected ownership. Flag players where GTO = contrarian (popular player is overpriced).",
    v2Feature:
      "Exploitative deviation detection: identify leagues/contests where the field is systematically non-GTO (e.g., always overstacking Patriots), and recommend deviating against it.",
    dataRequirements: "Field ownership data (licensed). Historical contest results.",
    legalRisk: "Low — analytical framing.",
    status: "v1_ready",
    gseComponent: "DFS portfolio analytics, lineup thesis engine",
  },
  {
    domain: "f1_telemetry",
    domainName: "Formula 1 Telemetry Analysis",
    coreMechanic:
      "Real-time sensor data fusion, microsecond-level event detection, tire degradation modeling, pit strategy optimization.",
    transferBridge:
      "Real-time NFL/NBA tracking data = telemetry. Routing efficiency, separation at target, snap count trends, rush lane assignment = sensor signals that predict future performance.",
    v1Feature:
      "Trend velocity: flag players whose underlying metrics (target share, snap %, rush rate) are trending up or down faster than their projection or ownership reflects.",
    v2Feature:
      "Real-time in-game signal board: live snap count, air yards, route rate, target share updated each drive for DFS late-swap decisions.",
    dataRequirements: "Player tracking data (NextGen Stats — requires NFL data license).",
    legalRisk: "High — NFL player tracking data is licensed and access-controlled. Rights review required.",
    status: "v2_roadmap",
    gseComponent: "Late-swap engine, in-season signal dashboard",
  },
  {
    domain: "aviation_checklists",
    domainName: "Aviation / Pre-Flight Checklists",
    coreMechanic:
      "Mandatory pre-flight verification, go/no-go decision framework, standardized action sequences, error prevention via procedure.",
    transferBridge:
      "Before publishing any pick, GSE should require a checklist: is data fresh? Is injury status resolved? Is the line still available? This prevents 'cognitive shortcut' publishing errors.",
    v1Feature:
      "Pick publication checklist: before any pick goes live, automated check: data freshness < 4 hrs, injury status = resolved, line still within X% of target, confidence ≥ threshold. Fails any check = holds for review.",
    v2Feature:
      "User-facing decision checklist: before acting on a pick, surfaces 5 questions the user should confirm ('Have you checked for last-minute injury news?', 'Is the line still at this price?').",
    dataRequirements: "Internal data pipeline timestamps. Injury feed freshness.",
    legalRisk: "Low.",
    status: "v1_ready",
    gseComponent: "Pick publication pipeline, No-Play doctrine",
  },
  {
    domain: "nasa_mission_control",
    domainName: "NASA Mission Control Operations",
    coreMechanic:
      "Flight director model, go/no-go from each system, abort criteria, contingency planning, communication protocols.",
    transferBridge:
      "Draft day = mission critical ops. Multiple data systems (injury, line, ADP, opponent genome) must each give a go/no-go before a recommendation publishes. Abort criteria = No-Play.",
    v1Feature:
      "Decision confidence aggregation: each signal subsystem (injury, line, projection, ownership) provides a go/no-go for each pick. If any system flags red, escalates to No-Play review.",
    v2Feature:
      "Contingency planning: for each high-confidence pick, pre-generates a contingency play for 'what if [player] is scratched at game time.'",
    dataRequirements: "Multi-signal data pipeline. Late-swap engine.",
    legalRisk: "Low.",
    status: "v1_ready",
    gseComponent: "Decision OS, No-Play doctrine, late-swap engine",
  },
  {
    domain: "military_ooda",
    domainName: "Military Strategy / OODA Loop",
    coreMechanic:
      "Observe-Orient-Decide-Act loop, information advantage, decision speed vs. decision quality trade-off, intel-based vs. reactive decision making.",
    transferBridge:
      "Sports draft and DFS decisions are OODA loops operating under time pressure. GSE gives users better Observe (signals) and Orient (context) so their Decide-Act is faster and more accurate.",
    v1Feature:
      "Time-to-decision optimization: for each draft pick, GSE surfaces the top-3 recommendations with confidence scores in < 3 seconds so the user can decide under clock pressure.",
    v2Feature:
      "Situation awareness dashboard: single-screen 'battlefield view' of current game slate — which games have steam, which players are injured, which lines are off-market — all in one orientation layer.",
    dataRequirements: "Real-time feeds. Line data.",
    legalRisk: "Low.",
    status: "v1_ready",
    gseComponent: "War Room, Voice Jarvis, Sharp vs Public Signal Dashboard",
  },
  {
    domain: "medical_triage",
    domainName: "Medical Triage / Emergency Medicine",
    coreMechanic:
      "Triage severity scoring, immediate-urgent-delayed classification, resource allocation under scarcity, deterioration detection.",
    transferBridge:
      "Injury triage: classify injuries by expected timeline and impact severity. Waiver priority = resource allocation under scarcity. Roster depth gaps = urgent vs delayed needs.",
    v1Feature:
      "Injury severity triage: for each injured player on your roster, classify: Red (miss 4+ weeks), Yellow (1–3 weeks), Green (cleared). Prioritize waiver response accordingly.",
    v2Feature:
      "Roster deterioration detector: monitors your roster health over the season and flags when your situation is 'deteriorating' (e.g., backup is also now injured) before you lose the week.",
    dataRequirements: "Injury report data (public).",
    legalRisk: "Low — no medical advice, all sports context.",
    status: "v1_ready",
    gseComponent: "Roster Fragility Score, in-season injury tracking",
  },
  {
    domain: "legal_case_analysis",
    domainName: "Legal Case Analysis / Structured Argumentation",
    coreMechanic:
      "Issue spotting, rule application, structured analysis (IRAC), precedent weighting, adversarial brief writing.",
    transferBridge:
      "Pick thesis construction = legal brief. Bull case vs bear case = plaintiff vs defendant. Precedent = historical comparables. 'Holding' = recommendation.",
    v1Feature:
      "Pick Thesis Engine: for each GSE pick, generates structured IRAC-style card — Issue (the game situation), Rule (the signal logic), Analysis (bull vs bear argument), Conclusion (pick with confidence).",
    v2Feature:
      "Historical precedent engine: 'This situation is analogous to the 2019 Chiefs WR injury game. Here's what happened and why our take differs from that precedent.'",
    dataRequirements: "Historical game data. Historical pick data.",
    legalRisk: "Low — analytical framing, not legal advice.",
    status: "v1_ready",
    gseComponent: "Pick Thesis Engine, Evidence Debate System",
  },
] as const;

// ── Helper functions ──────────────────────────────────────────────────────────

export function v1ReadyTransfers(): DomainTransfer[] {
  return DOMAIN_TRANSFERS.filter((t) => t.status === "v1_ready") as DomainTransfer[];
}

export function v2RoadmapTransfers(): DomainTransfer[] {
  return DOMAIN_TRANSFERS.filter((t) => t.status === "v2_roadmap") as DomainTransfer[];
}

export function highRiskTransfers(): DomainTransfer[] {
  return DOMAIN_TRANSFERS.filter(
    (t) => t.legalRisk.toLowerCase().startsWith("high")
  ) as DomainTransfer[];
}

export function transfersByGseComponent(component: string): DomainTransfer[] {
  return DOMAIN_TRANSFERS.filter((t) =>
    t.gseComponent.toLowerCase().includes(component.toLowerCase())
  ) as DomainTransfer[];
}
