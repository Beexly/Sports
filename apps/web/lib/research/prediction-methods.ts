/**
 * Prediction methodology data contract for Galaxy Sports Edge.
 * Documents Vegas mechanics, calibration science, statistical methods,
 * and the GSE No-Play doctrine.
 *
 * Sources: public academic literature, industry standard definitions.
 * Do not fabricate performance claims or user outcomes.
 */

// ── Core methodology types ───────────────────────────────────────────────────

export type CalibrationMetricId =
  | "mae"
  | "rmse"
  | "brier_score"
  | "log_loss"
  | "pearson_r"
  | "clv"
  | "roi"
  | "win_rate"
  | "ev_per_bet"
  | "closing_line_value"
  | "overround";

export type StatMethodId =
  | "linear_regression"
  | "logistic_regression"
  | "gradient_boosting"
  | "random_forest"
  | "neural_network"
  | "poisson_regression"
  | "bayesian_updating"
  | "monte_carlo"
  | "kelly_criterion"
  | "elo_rating"
  | "ensemble";

export type SignalType =
  | "opening_line"
  | "closing_line"
  | "reverse_line_movement"
  | "steam_move"
  | "public_money_percentage"
  | "sharp_money_percentage"
  | "weather"
  | "injury"
  | "line_freeze"
  | "off_market_price";

export type NoPlayReason =
  | "signal_conflict"
  | "low_confidence"
  | "line_moved_against"
  | "injury_uncertainty"
  | "weather_extreme"
  | "correlated_exposure"
  | "market_efficient"
  | "insufficient_data";

export interface CalibrationMetric {
  id: CalibrationMetricId;
  name: string;
  formula: string;
  interpretation: string;
  goodRange: string;
  gseUsage: string;
}

export interface StatMethod {
  id: StatMethodId;
  name: string;
  useCase: string;
  strengths: string[];
  weaknesses: string[];
  gseApplication: string;
}

export interface VegasMechanic {
  id: string;
  name: string;
  explanation: string;
  formulaOrExample: string;
  gseSignalValue: string;
}

export interface SignalDefinition {
  type: SignalType;
  name: string;
  description: string;
  sharpIndicator: boolean;
  gseWeight: "primary" | "secondary" | "contextual";
  latency: string;
}

export interface NoPlayDoctrine {
  reason: NoPlayReason;
  label: string;
  triggerConditions: string[];
  displayText: string;
  suppressionBehavior: "hide_pick" | "show_watchlist" | "show_no_play_card";
}

// ── Calibration metrics ───────────────────────────────────────────────────────

export const CALIBRATION_METRICS: ReadonlyArray<CalibrationMetric> = [
  {
    id: "mae",
    name: "Mean Absolute Error",
    formula: "MAE = mean(|actual − predicted|)",
    interpretation:
      "Average magnitude of error. Lower is better. Treats all errors equally regardless of direction.",
    goodRange: "Fantasy points: < 4 pts. Ownership: < 5pp.",
    gseUsage: "Primary autopsy metric; tracked per slate, per model version.",
  },
  {
    id: "rmse",
    name: "Root Mean Square Error",
    formula: "RMSE = sqrt(mean((actual − predicted)²))",
    interpretation:
      "Penalizes large errors more than MAE. Use alongside MAE; large RMSE vs MAE gap signals outlier misses.",
    goodRange: "Fantasy points: < 6 pts.",
    gseUsage: "Secondary autopsy metric. RMSE/MAE ratio used to detect tail-risk issues.",
  },
  {
    id: "brier_score",
    name: "Brier Score",
    formula: "BS = mean((probability − outcome)²)",
    interpretation:
      "0 = perfect, 1 = perfectly wrong. Standard for probability calibration. Lower is better.",
    goodRange: "< 0.20 for game outcomes; random = 0.25.",
    gseUsage:
      "Used for binary outcomes (cover spread, win/loss). Enables calibration curve plotting.",
  },
  {
    id: "log_loss",
    name: "Log Loss (Cross-Entropy)",
    formula: "LogLoss = −mean(y·log(p) + (1−y)·log(1−p))",
    interpretation:
      "Heavily penalizes confident wrong predictions. Complement to Brier score; more sensitive to probability quality.",
    goodRange: "< 0.50 for spread outcomes.",
    gseUsage: "Secondary probability quality metric; used in ensemble model selection.",
  },
  {
    id: "pearson_r",
    name: "Pearson Correlation",
    formula: "r = cov(X,Y) / (σX · σY)",
    interpretation:
      "−1 to +1. Measures linear association between projected and actual values. r > 0.5 is meaningful for projections.",
    goodRange: "> 0.55 for fantasy point projections.",
    gseUsage: "Post-slate autopsy correlation between projected vs actual points/ownership.",
  },
  {
    id: "clv",
    name: "Closing Line Value",
    formula: "CLV = (closing_line_implied_prob − opening_line_implied_prob)",
    interpretation:
      "Positive CLV means you beat the closing line (efficient market consensus). The gold standard for long-run edge validation.",
    goodRange: "+1% to +3% sustained CLV is considered meaningful sharp performance.",
    gseUsage:
      "GSE tracks CLV for all published picks. Required to reach ESTABLISHED milestone (≥52.4% win rate equivalent).",
  },
  {
    id: "roi",
    name: "Return on Investment",
    formula: "ROI = (net_profit / total_wagered) × 100",
    interpretation:
      "Percentage profit per dollar risked. Sustainable long-run ROI of +3–8% is very strong in sports betting.",
    goodRange: "3–8% sustained over 500+ bets is sharply significant.",
    gseUsage: "AUTHORITY milestone gate. Cannot claim ROI without full verified sample.",
  },
  {
    id: "win_rate",
    name: "Win Rate (vs Spread)",
    formula: "Win Rate = wins / (wins + losses), excluding pushes",
    interpretation:
      "Break-even against standard −110 vig = 52.38%. Meaningful performance requires sustained win rate above this threshold.",
    goodRange: "53–56% over 500+ bets is statistically significant.",
    gseUsage:
      "Public-facing metric for trust ladder. PROVEN milestone: 100 settled picks published with win rate.",
  },
  {
    id: "overround",
    name: "Overround (Vig/Hold)",
    formula: "Overround = sum(implied_probs for all outcomes) − 1.0",
    interpretation:
      "The sportsbook's built-in margin. Standard −110/−110 line = 4.5% overround. Lower overround = better value.",
    goodRange: "Seek markets with < 4% overround when possible.",
    gseUsage: "Line quality signal; GSE surfaces overround per game to help users identify soft markets.",
  },
] as const;

// ── Statistical methods ───────────────────────────────────────────────────────

export const STAT_METHODS: ReadonlyArray<StatMethod> = [
  {
    id: "linear_regression",
    name: "Linear Regression",
    useCase: "Fantasy point projection from volume/efficiency inputs",
    strengths: ["Interpretable coefficients", "Fast to train", "Works well with small datasets"],
    weaknesses: ["Assumes linear relationships", "Sensitive to outliers"],
    gseApplication: "Baseline projection model; used as benchmark for ensemble comparison.",
  },
  {
    id: "logistic_regression",
    name: "Logistic Regression",
    useCase: "Binary outcome probability (cover/not cover, over/under)",
    strengths: ["Outputs calibrated probabilities", "Interpretable"],
    weaknesses: ["Cannot capture non-linear signal interactions"],
    gseApplication: "Game outcome probability for spread/total picks.",
  },
  {
    id: "gradient_boosting",
    name: "Gradient Boosting (XGBoost/LightGBM)",
    useCase: "Complex feature interactions in projection models",
    strengths: ["High accuracy", "Handles non-linearity", "Feature importance available"],
    weaknesses: ["Overfit risk without regularization", "Slower training than linear models"],
    gseApplication:
      "Primary projection model candidate; used in ensemble. Requires historical training data.",
  },
  {
    id: "random_forest",
    name: "Random Forest",
    useCase: "Robust baseline for ownership modeling",
    strengths: ["Low variance via bagging", "Handles missing features well"],
    weaknesses: ["Less accurate than boosting for tabular data"],
    gseApplication: "Ownership model baseline; used in DFS autopsy calibration.",
  },
  {
    id: "bayesian_updating",
    name: "Bayesian Updating",
    useCase: "Iterative probability revision as new information arrives",
    strengths: [
      "Principled uncertainty quantification",
      "Updates cleanly as injury/line data changes",
    ],
    weaknesses: ["Prior selection is subjective", "Computationally expensive at scale"],
    gseApplication:
      "Confidence score adjustment as line moves or injury reports land. Late-swap injury update engine.",
  },
  {
    id: "monte_carlo",
    name: "Monte Carlo Simulation",
    useCase: "DFS lineup portfolio scoring, distribution estimation",
    strengths: ["Models full score distributions not just means", "Handles correlated outcomes"],
    weaknesses: ["Requires good distributional assumptions", "Computationally expensive"],
    gseApplication:
      "DFS Monte Carlo engine (Phase 8): 10,000 simulations per lineup set for floor/ceiling/ownership-leverage scoring.",
  },
  {
    id: "kelly_criterion",
    name: "Kelly Criterion",
    useCase: "Optimal bet sizing given edge and bankroll",
    strengths: ["Maximizes long-run geometric growth", "Never risks ruin"],
    weaknesses: ["Full Kelly is extremely volatile; fractional Kelly (25–50%) is standard"],
    gseApplication:
      "Surfaced as educational tool only. GSE does NOT auto-size bets. Shown as: 'If you believe this edge, Kelly suggests X% of bankroll.'",
  },
  {
    id: "elo_rating",
    name: "Elo Rating System",
    useCase: "Team/player strength estimation over time",
    strengths: ["Self-correcting", "Intuitive", "Works across any head-to-head competition"],
    weaknesses: ["Slow to respond to regime changes", "Ignores context (home/away, rest, etc.)"],
    gseApplication:
      "Team strength baseline input for game projection models. Extended Elo with home/rest/weather adjustments.",
  },
  {
    id: "ensemble",
    name: "Ensemble Methods",
    useCase: "Combining multiple models for robustness",
    strengths: [
      "Reduces variance from any single model",
      "Catches what individual models miss",
    ],
    weaknesses: ["Less interpretable", "More complex to maintain"],
    gseApplication:
      "Final GSE projection = weighted ensemble of multiple signal sources. Weights calibrated via historical MAE.",
  },
] as const;

// ── Vegas signal definitions ──────────────────────────────────────────────────

export const SIGNAL_DEFINITIONS: ReadonlyArray<SignalDefinition> = [
  {
    type: "opening_line",
    name: "Opening Line",
    description:
      "The initial market price posted when wagering opens. Reflects the book's initial power rating + vig.",
    sharpIndicator: false,
    gseWeight: "primary",
    latency: "Available immediately at open",
  },
  {
    type: "closing_line",
    name: "Closing Line",
    description:
      "The final market price at kickoff. The most informationally efficient price; used as ground truth for CLV.",
    sharpIndicator: true,
    gseWeight: "primary",
    latency: "Available at game time",
  },
  {
    type: "reverse_line_movement",
    name: "Reverse Line Movement (RLM)",
    description:
      "When the line moves opposite to public betting percentage. Indicates sharp money on the contrarian side.",
    sharpIndicator: true,
    gseWeight: "primary",
    latency: "Real-time monitoring required",
  },
  {
    type: "steam_move",
    name: "Steam Move",
    description:
      "A rapid, coordinated line move triggered by sharp syndicates betting multiple books simultaneously.",
    sharpIndicator: true,
    gseWeight: "primary",
    latency: "Minutes; requires real-time line feed",
  },
  {
    type: "public_money_percentage",
    name: "Public Money %",
    description:
      "Percentage of bet count or handle on each side. High public % can indicate fade opportunities if combined with RLM.",
    sharpIndicator: false,
    gseWeight: "contextual",
    latency: "Updated periodically by tracking services",
  },
  {
    type: "sharp_money_percentage",
    name: "Sharp Money %",
    description:
      "Estimated percentage of handle from sharp accounts. Directly derived from line movement vs public splits.",
    sharpIndicator: true,
    gseWeight: "secondary",
    latency: "Derived metric; computed from splits + line movement",
  },
  {
    type: "line_freeze",
    name: "Line Freeze",
    description:
      "When a line does not move despite heavy public one-sided action. Strong signal of sharp resistance on the other side.",
    sharpIndicator: true,
    gseWeight: "secondary",
    latency: "Observable via real-time monitoring",
  },
  {
    type: "off_market_price",
    name: "Off-Market Price",
    description:
      "A line that is significantly different from the consensus across all books. May indicate an error or soft book opportunity.",
    sharpIndicator: false,
    gseWeight: "contextual",
    latency: "Real-time cross-book comparison required",
  },
] as const;

// ── No-Play doctrine ──────────────────────────────────────────────────────────

export const NO_PLAY_DOCTRINE: ReadonlyArray<NoPlayDoctrine> = [
  {
    reason: "signal_conflict",
    label: "Signal Conflict",
    triggerConditions: [
      "Projection model says one direction, line movement says the other",
      "Two primary signals contradict without resolution",
    ],
    displayText: "Conflicting signals — no actionable edge identified. Watchlisted.",
    suppressionBehavior: "show_watchlist",
  },
  {
    reason: "low_confidence",
    label: "Insufficient Confidence",
    triggerConditions: [
      "Model confidence score < configured threshold (default 55)",
      "High historical variance for this situation type",
    ],
    displayText: "Confidence below threshold — not recommended this week.",
    suppressionBehavior: "show_no_play_card",
  },
  {
    reason: "line_moved_against",
    label: "Line Moved Against",
    triggerConditions: [
      "Target line was available at open; closed significantly worse",
      "CLV is now negative",
    ],
    displayText: "This line moved against us since analysis. Edge may be gone.",
    suppressionBehavior: "show_watchlist",
  },
  {
    reason: "injury_uncertainty",
    label: "Injury Uncertainty",
    triggerConditions: [
      "Key player listed as Questionable or Doubtful with no resolution",
      "Game plan likely to change significantly based on player status",
    ],
    displayText: "Wait for injury resolution before acting. Check back closer to game time.",
    suppressionBehavior: "show_watchlist",
  },
  {
    reason: "weather_extreme",
    label: "Extreme Weather",
    triggerConditions: [
      "Wind > 20 mph outdoors for passing-dependent teams",
      "Precipitation affecting field conditions significantly",
    ],
    displayText: "Weather introduces significant variance. Model confidence reduced.",
    suppressionBehavior: "show_no_play_card",
  },
  {
    reason: "market_efficient",
    label: "Market Efficient",
    triggerConditions: [
      "Opening line = closing line at multiple sharp books",
      "No steam, no RLM, no sharp signals detected",
    ],
    displayText: "Market appears efficiently priced. No identified edge.",
    suppressionBehavior: "show_no_play_card",
  },
  {
    reason: "insufficient_data",
    label: "Insufficient Data",
    triggerConditions: [
      "Sample size < 5 games for this team/matchup situation",
      "New coordinator/scheme with no track record",
    ],
    displayText: "Insufficient historical data to project with confidence.",
    suppressionBehavior: "show_no_play_card",
  },
] as const;

// ── Helper functions ─────────────────────────────────────────────────────────

export function primarySignals(): SignalDefinition[] {
  return SIGNAL_DEFINITIONS.filter((s) => s.gseWeight === "primary") as SignalDefinition[];
}

export function sharpSignals(): SignalDefinition[] {
  return SIGNAL_DEFINITIONS.filter((s) => s.sharpIndicator) as SignalDefinition[];
}

export function calibrationMetricById(id: CalibrationMetricId): CalibrationMetric | undefined {
  return CALIBRATION_METRICS.find((m) => m.id === id);
}

export function noPlayCardCount(): number {
  return NO_PLAY_DOCTRINE.filter((d) => d.suppressionBehavior === "show_no_play_card").length;
}

export const BREAKEVEN_WIN_RATE = 0.5238 as const;
export const PROVEN_MILESTONE_MIN_PICKS = 100 as const;
export const ESTABLISHED_MIN_PICKS = 500 as const;
