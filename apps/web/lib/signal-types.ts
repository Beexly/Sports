// signal-types.ts — signal, risk, confidence, and grade type definitions

export type SignalGrade = "A" | "B" | "C" | "D" | "F";
export type RiskGrade = "low" | "moderate" | "elevated" | "high";
export type VolatilityGrade = "stable" | "moderate" | "volatile" | "extreme";
export type ProcessGrade =
  | "disciplined"
  | "acceptable"
  | "questionable"
  | "impulsive";
export type BetQuality =
  | "good-bet-good-result"
  | "good-bet-bad-result"
  | "bad-bet-good-result"
  | "bad-bet-bad-result";

// ---------------------------------------------------------------------------
// Confidence bands
// ---------------------------------------------------------------------------

export type ConfidenceBand = {
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly color: string; // tailwind text color
  readonly bgColor: string; // tailwind bg color for badges
  readonly borderColor: string; // tailwind border color
  readonly description: string;
  readonly publishable: boolean; // whether picks at this band are surfaced to users
};

export const CONFIDENCE_BANDS: ReadonlyArray<ConfidenceBand> = [
  {
    label: "Elite",
    min: 80,
    max: 100,
    color: "text-green-400",
    bgColor: "bg-green-400/10",
    borderColor: "border-green-400/30",
    description:
      "High-conviction signal across most factors. Still not certain.",
    publishable: true,
  },
  {
    label: "High",
    min: 65,
    max: 79,
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/10",
    borderColor: "border-cyan-400/30",
    description: "Strong signal with minor factor uncertainty.",
    publishable: true,
  },
  {
    label: "Moderate",
    min: 50,
    max: 64,
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
    borderColor: "border-yellow-400/30",
    description: "Sufficient signal to publish. Meaningful variance expected.",
    publishable: true,
  },
  {
    label: "Exploratory",
    min: 40,
    max: 49,
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
    borderColor: "border-orange-400/30",
    description: "Below publish threshold. Research only.",
    publishable: false,
  },
  {
    label: "Insufficient",
    min: 0,
    max: 39,
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/30",
    description: "Does not meet publish requirements.",
    publishable: false,
  },
];

export function getConfidenceBand(score: number): ConfidenceBand {
  return (
    CONFIDENCE_BANDS.find((b) => score >= b.min && score <= b.max) ??
    CONFIDENCE_BANDS[CONFIDENCE_BANDS.length - 1]!
  );
}

// ---------------------------------------------------------------------------
// Signal grade metadata
// ---------------------------------------------------------------------------

export type SignalGradeMeta = {
  readonly grade: SignalGrade;
  readonly label: string;
  readonly color: string;
  readonly description: string;
  readonly edgeIndexRange: readonly [number, number];
};

export const SIGNAL_GRADE_META: ReadonlyArray<SignalGradeMeta> = [
  {
    grade: "A",
    label: "Strong",
    color: "text-green-400",
    description:
      "Multiple independent signals align. Model has high conviction and low factor disagreement.",
    edgeIndexRange: [80, 100],
  },
  {
    grade: "B",
    label: "Solid",
    color: "text-cyan-400",
    description:
      "Clear signal with at least one meaningful uncertainty. Worth publishing with noted caveat.",
    edgeIndexRange: [65, 79],
  },
  {
    grade: "C",
    label: "Marginal",
    color: "text-yellow-400",
    description:
      "Signal present but narrow. Publishable at minimum threshold. Treat as a lean, not a certainty.",
    edgeIndexRange: [50, 64],
  },
  {
    grade: "D",
    label: "Weak",
    color: "text-orange-400",
    description:
      "Insufficient signal for a published pick. Flagged in the Pass List with explanation.",
    edgeIndexRange: [40, 49],
  },
  {
    grade: "F",
    label: "No signal",
    color: "text-gray-500",
    description:
      "No meaningful edge detected. Game does not appear in published output.",
    edgeIndexRange: [0, 39],
  },
];

export function getSignalGradeMeta(grade: SignalGrade): SignalGradeMeta {
  return (
    SIGNAL_GRADE_META.find((m) => m.grade === grade) ?? SIGNAL_GRADE_META[4]!
  );
}

// ---------------------------------------------------------------------------
// Risk grade metadata
// ---------------------------------------------------------------------------

export type RiskGradeMeta = {
  readonly grade: RiskGrade;
  readonly label: string;
  readonly color: string;
  readonly description: string;
  readonly maxRecommendedUnitSize: number; // as % of bankroll
};

export const RISK_GRADE_META: ReadonlyArray<RiskGradeMeta> = [
  {
    grade: "low",
    label: "Low risk",
    color: "text-green-400",
    description:
      "Stable odds, high data quality, no adverse line movement. Model and market agree.",
    maxRecommendedUnitSize: 3,
  },
  {
    grade: "moderate",
    label: "Moderate risk",
    color: "text-yellow-400",
    description:
      "Minor uncertainty in one or more factors — odds stability, injury report, or line movement. Proceed with standard unit.",
    maxRecommendedUnitSize: 2,
  },
  {
    grade: "elevated",
    label: "Elevated risk",
    color: "text-orange-400",
    description:
      "Meaningful uncertainty in data, timing, or market direction. Consider half-unit or pass.",
    maxRecommendedUnitSize: 1,
  },
  {
    grade: "high",
    label: "High risk",
    color: "text-red-400",
    description:
      "Multiple risk flags active. The model has published this pick but recommends reduced or no exposure.",
    maxRecommendedUnitSize: 0,
  },
];

export function getRiskGradeMeta(grade: RiskGrade): RiskGradeMeta {
  return (
    RISK_GRADE_META.find((m) => m.grade === grade) ?? RISK_GRADE_META[3]!
  );
}

// ---------------------------------------------------------------------------
// Volatility grade metadata
// ---------------------------------------------------------------------------

export type VolatilityGradeMeta = {
  readonly grade: VolatilityGrade;
  readonly label: string;
  readonly color: string;
  readonly description: string;
};

export const VOLATILITY_GRADE_META: ReadonlyArray<VolatilityGradeMeta> = [
  {
    grade: "stable",
    label: "Stable",
    color: "text-green-400",
    description:
      "Outcome distribution is narrow. Line has held with minimal movement since open.",
  },
  {
    grade: "moderate",
    label: "Moderate",
    color: "text-yellow-400",
    description:
      "Normal variance expected. Some line movement observed but within expected range.",
  },
  {
    grade: "volatile",
    label: "Volatile",
    color: "text-orange-400",
    description:
      "Wide outcome distribution or significant line movement. Model confidence is reduced.",
  },
  {
    grade: "extreme",
    label: "Extreme",
    color: "text-red-400",
    description:
      "Outcome distribution is too wide to model reliably. Game is flagged as No-Bet for most users.",
  },
];

export function getVolatilityGradeMeta(
  grade: VolatilityGrade
): VolatilityGradeMeta {
  return (
    VOLATILITY_GRADE_META.find((m) => m.grade === grade) ??
    VOLATILITY_GRADE_META[3]!
  );
}

// ---------------------------------------------------------------------------
// Process grade metadata
// ---------------------------------------------------------------------------

export type ProcessGradeMeta = {
  readonly grade: ProcessGrade;
  readonly label: string;
  readonly color: string;
  readonly description: string;
  readonly actionRequired: string;
};

export const PROCESS_GRADE_META: ReadonlyArray<ProcessGradeMeta> = [
  {
    grade: "disciplined",
    label: "Disciplined",
    color: "text-green-400",
    description:
      "Bet placed within model parameters: correct unit size, pre-close timing, pick aligned with published signal, and no tilt indicators.",
    actionRequired: "None. Continue current approach.",
  },
  {
    grade: "acceptable",
    label: "Acceptable",
    color: "text-cyan-400",
    description:
      "Minor deviation from optimal process — slightly late timing, marginally oversized unit, or pick slightly below signal threshold.",
    actionRequired:
      "Note the deviation in your Tracker. No mandatory intervention.",
  },
  {
    grade: "questionable",
    label: "Questionable",
    color: "text-yellow-400",
    description:
      "Meaningful process failure: wrong unit size, bet placed after significant line move, or pick not aligned with published signal.",
    actionRequired:
      "Review the bet in Tracker before placing the next one. Read the relevant Academy module.",
  },
  {
    grade: "impulsive",
    label: "Impulsive",
    color: "text-red-400",
    description:
      "Severe process failure: tilt-pattern bet, stake spike, game not published by model, or bet placed after mandatory pause trigger.",
    actionRequired:
      "Mandatory 24-hour pause before next bet. Complete Academy Tilt Recognition module. Review last 10 bets for pattern.",
  },
];

export function getProcessGradeMeta(grade: ProcessGrade): ProcessGradeMeta {
  return (
    PROCESS_GRADE_META.find((m) => m.grade === grade) ??
    PROCESS_GRADE_META[3]!
  );
}

// ---------------------------------------------------------------------------
// Bet quality framework
// ---------------------------------------------------------------------------

export type BetQualityMeta = {
  readonly quality: BetQuality;
  readonly label: string;
  readonly color: string;
  readonly shortLabel: string;
  readonly lesson: string;
};

export const BET_QUALITY_META: ReadonlyArray<BetQualityMeta> = [
  {
    quality: "good-bet-good-result",
    label: "Good bet, good result",
    shortLabel: "Good / Won",
    color: "text-green-400",
    lesson:
      "Ideal outcome. Process and result aligned. This is the sustainable pattern.",
  },
  {
    quality: "good-bet-bad-result",
    label: "Good bet, bad result",
    shortLabel: "Good / Lost",
    color: "text-cyan-400",
    lesson:
      "Variance beat good process. This is a learning success — the bet was correct even though it lost. Track CLV.",
  },
  {
    quality: "bad-bet-good-result",
    label: "Bad bet, good result",
    shortLabel: "Bad / Won",
    color: "text-orange-400",
    lesson:
      "Do not repeat this bet type. Winning on bad process reinforces dangerous habits. The result was luck.",
  },
  {
    quality: "bad-bet-bad-result",
    label: "Bad bet, bad result",
    shortLabel: "Bad / Lost",
    color: "text-red-400",
    lesson:
      "Worst outcome. Bad process and bad result. Requires mandatory Academy review and process audit.",
  },
];

export function getBetQualityMeta(quality: BetQuality): BetQualityMeta {
  return (
    BET_QUALITY_META.find((m) => m.quality === quality) ??
    BET_QUALITY_META[3]!
  );
}

// ---------------------------------------------------------------------------
// No-bet reasons
// ---------------------------------------------------------------------------

export type NoBetReason = {
  readonly code: string;
  readonly label: string;
  readonly description: string;
  readonly category: "data" | "market" | "risk" | "timing" | "model";
  readonly severity: "soft" | "hard"; // soft = consider passing; hard = model won't publish
};

export const NO_BET_REASONS: ReadonlyArray<NoBetReason> = [
  {
    code: "DATA_STALE",
    label: "Stale data",
    description:
      "Odds or line data exceeded the 30-minute freshness window. The model cannot confirm the price is still accurate.",
    category: "data",
    severity: "hard",
  },
  {
    code: "DATA_QUALITY",
    label: "Low data quality",
    description:
      "Game data quality score below minimum threshold. One or more key inputs are missing or unreliable.",
    category: "data",
    severity: "hard",
  },
  {
    code: "MARKET_EFFICIENT",
    label: "Market already efficient",
    description:
      "No meaningful book disagreement or line movement detected. The market is correctly priced at current odds.",
    category: "market",
    severity: "hard",
  },
  {
    code: "LINE_MOVEMENT_ADVERSE",
    label: "Line moved against thesis",
    description:
      "Line moved significantly against the model's scoring direction since the pick was generated. Edge has eroded.",
    category: "market",
    severity: "hard",
  },
  {
    code: "VOLATILITY_TOO_HIGH",
    label: "Too volatile",
    description:
      "Outcome distribution is too wide to produce a reliable thesis. The edge is real but so is the variance.",
    category: "risk",
    severity: "hard",
  },
  {
    code: "CONFIDENCE_INSUFFICIENT",
    label: "Confidence below gate",
    description:
      "Edge Index did not clear the minimum publish threshold of 50. Pick is logged in Pass List.",
    category: "model",
    severity: "hard",
  },
  {
    code: "BOOK_DISAGREEMENT_NOISE",
    label: "Noise, not signal",
    description:
      "Book disagreement is present but inconsistent with known sharp pattern. Likely promotional or recreational pricing.",
    category: "market",
    severity: "soft",
  },
  {
    code: "TIMING_RISK",
    label: "Timing risk",
    description:
      "Injury report, lineup confirmation, or weather data is expected before game time. Hold until resolved.",
    category: "timing",
    severity: "soft",
  },
  {
    code: "OVER_SATURATED_MARKET",
    label: "Over-saturated",
    description:
      "Public lean is extreme. The market has likely already adjusted for this opinion. Check opening line.",
    category: "market",
    severity: "soft",
  },
  {
    code: "MODEL_VERSION_MISMATCH",
    label: "Model version mismatch",
    description:
      "Pick was scored on a prior model version. Re-scoring is in progress. Do not act on this pick yet.",
    category: "model",
    severity: "hard",
  },
  {
    code: "CORRELATED_LEGS",
    label: "Correlated parlay legs",
    description:
      "Two or more legs in this parlay are statistically correlated. Combined EV is lower than individual leg sum.",
    category: "risk",
    severity: "soft",
  },
  {
    code: "SHARP_REVERSAL",
    label: "Sharp money reversal",
    description:
      "Sharp money has moved against the model's original scoring direction. Thesis may be compromised.",
    category: "market",
    severity: "soft",
  },
];

export function getNoBetReason(code: string): NoBetReason | undefined {
  return NO_BET_REASONS.find((r) => r.code === code);
}

export function getNoBetReasonsByCategory(
  category: NoBetReason["category"]
): NoBetReason[] {
  return NO_BET_REASONS.filter((r) => r.category === category);
}

// ---------------------------------------------------------------------------
// Market mirage reasons
// ---------------------------------------------------------------------------

export type MarketMirageReason = {
  readonly code: string;
  readonly label: string;
  readonly description: string;
  readonly detection: string; // how the model detects this pattern
  readonly counterSignal: string; // what signal can override or confirm the mirage
};

export const MARKET_MIRAGE_REASONS: ReadonlyArray<MarketMirageReason> = [
  {
    code: "RECENCY_BIAS",
    label: "Recency bias",
    description:
      "Public is overweighting last game result vs. season-level signal. One-game outliers are being priced as a trend.",
    detection:
      "Model compares last-3-game vs. last-30-game performance differential against line movement direction.",
    counterSignal:
      "Check 30-game rolling trend vs. last 3. If they diverge, the recency price is suspect.",
  },
  {
    code: "NARRATIVE_OVERCORRECT",
    label: "Narrative overcorrection",
    description:
      "Media narrative is driving line movement, not underlying data. The story is bigger than the statistical reality.",
    detection:
      "Model flags when line movement magnitude exceeds what historical data inputs would warrant.",
    counterSignal:
      "Compare pre-narrative opening line to current. The gap is the narrative premium — decide if you believe it.",
  },
  {
    code: "NAME_VALUE_PREMIUM",
    label: "Name-value premium",
    description:
      "A star player's presence is priced into the line at a level not supported by matchup-adjusted projections.",
    detection:
      "Model compares player's matchup-adjusted projection against their implied contribution in the line.",
    counterSignal:
      "Check Prop Lab for the player's matchup grade. If it's C or below, the premium is narrative-driven.",
  },
  {
    code: "HOME_FIELD_OVERVALUE",
    label: "Home field overvalued",
    description:
      "Home advantage is priced beyond its historical significance for this specific venue and team combination.",
    detection:
      "Model tracks home advantage value by stadium, travel distance, and team-specific home vs. away splits.",
    counterSignal:
      "Check team's home vs. away ATS record in this venue context. Outlier venues can be priced as average.",
  },
  {
    code: "REVENGE_GAME_MYTH",
    label: "Revenge game myth",
    description:
      "A revenge game narrative is being priced into the line despite no statistically significant basis in this matchup context.",
    detection:
      "Model tests whether revenge game scenarios produce measurable ATS outperformance in this sport and context.",
    counterSignal:
      "Galaxy revenge game database shows no edge in this context. Narrative price is pure sentiment.",
  },
  {
    code: "PUBLIC_STEAM",
    label: "Public steam",
    description:
      "High public betting percentage with no corresponding sharp money movement. The crowd is loud, not right.",
    detection:
      "Model monitors bet count vs. money % discrepancy. Public steam without sharp alignment is a flag.",
    counterSignal:
      "Check Market Gravity for sharp money direction. If sharp money is opposing public steam, book edge may exist.",
  },
  {
    code: "PRIMETIME_INFLATION",
    label: "Primetime inflation",
    description:
      "Games scheduled in primetime TV slots draw inflated public action that shifts lines beyond what data supports.",
    detection:
      "Model adjusts for primetime schedule in line-movement expectations. Lines that move >1pt purely on time-slot are flagged.",
    counterSignal:
      "Compare game's model score to a same-week non-primetime equivalent. If score is the same but price is higher, it's inflation.",
  },
  {
    code: "WEATHER_OVERCORRECT",
    label: "Weather overcorrection",
    description:
      "Weather forecast is driving exaggerated line movement beyond what historical wind/rain data supports for scoring impact.",
    detection:
      "Model uses historical scoring impact by weather conditions and flags when market movement exceeds historical norms.",
    counterSignal:
      "Rumor Radar weather impact score shows this condition historically reduces scoring by X — compare to line move size.",
  },
];

export function getMarketMirageReason(
  code: string
): MarketMirageReason | undefined {
  return MARKET_MIRAGE_REASONS.find((r) => r.code === code);
}

// ---------------------------------------------------------------------------
// Pick tier access definitions
// ---------------------------------------------------------------------------

export type PickTierAccess = {
  readonly tier: "free" | "pro" | "elite";
  readonly label: string;
  readonly picksPerDay: number | "unlimited";
  readonly showsConfidenceScore: boolean;
  readonly showsLineMovement: boolean;
  readonly showsModelRationale: boolean;
  readonly showsRiskGrade: boolean;
  readonly showsNoBetList: boolean;
  readonly earlyAccess: boolean;
  readonly description: string;
};

export const PICK_TIER_ACCESS: ReadonlyArray<PickTierAccess> = [
  {
    tier: "free",
    label: "Free",
    picksPerDay: 1,
    showsConfidenceScore: false,
    showsLineMovement: false,
    showsModelRationale: false,
    showsRiskGrade: false,
    showsNoBetList: false,
    earlyAccess: false,
    description:
      "One top pick per day. No confidence score or model rationale. Entry point for new users.",
  },
  {
    tier: "pro",
    label: "Pro",
    picksPerDay: "unlimited",
    showsConfidenceScore: true,
    showsLineMovement: true,
    showsModelRationale: true,
    showsRiskGrade: true,
    showsNoBetList: true,
    earlyAccess: false,
    description:
      "Full pick feed with confidence scores, line movement data, model rationale, and the No-Bet Pass List.",
  },
  {
    tier: "elite",
    label: "Elite",
    picksPerDay: "unlimited",
    showsConfidenceScore: true,
    showsLineMovement: true,
    showsModelRationale: true,
    showsRiskGrade: true,
    showsNoBetList: true,
    earlyAccess: true,
    description:
      "Everything in Pro plus early pick access, factor-level Brain explainability, and advanced analytics.",
  },
];

export function getPickTierAccess(
  tier: PickTierAccess["tier"]
): PickTierAccess {
  return PICK_TIER_ACCESS.find((t) => t.tier === tier) ?? PICK_TIER_ACCESS[0]!;
}

// ---------------------------------------------------------------------------
// Sport type registry
// ---------------------------------------------------------------------------

export type SportId =
  | "nfl"
  | "nba"
  | "mlb"
  | "nhl"
  | "ncaaf"
  | "ncaab"
  | "soccer"
  | "tennis"
  | "mma"
  | "golf";

export type SportMeta = {
  readonly id: SportId;
  readonly label: string;
  readonly shortLabel: string;
  readonly season: string; // descriptive season window
  readonly primaryBetTypes: readonly string[];
  readonly propAvailable: boolean;
  readonly modelMaturity: "production" | "beta" | "research";
};

export const SPORT_META: ReadonlyArray<SportMeta> = [
  {
    id: "nfl",
    label: "NFL",
    shortLabel: "NFL",
    season: "September – February",
    primaryBetTypes: ["spread", "moneyline", "total"],
    propAvailable: true,
    modelMaturity: "production",
  },
  {
    id: "nba",
    label: "NBA",
    shortLabel: "NBA",
    season: "October – June",
    primaryBetTypes: ["spread", "moneyline", "total"],
    propAvailable: true,
    modelMaturity: "production",
  },
  {
    id: "mlb",
    label: "MLB",
    shortLabel: "MLB",
    season: "March – October",
    primaryBetTypes: ["moneyline", "runline", "total"],
    propAvailable: true,
    modelMaturity: "production",
  },
  {
    id: "nhl",
    label: "NHL",
    shortLabel: "NHL",
    season: "October – June",
    primaryBetTypes: ["moneyline", "puckline", "total"],
    propAvailable: true,
    modelMaturity: "production",
  },
  {
    id: "ncaaf",
    label: "College Football",
    shortLabel: "NCAAF",
    season: "September – January",
    primaryBetTypes: ["spread", "moneyline", "total"],
    propAvailable: false,
    modelMaturity: "beta",
  },
  {
    id: "ncaab",
    label: "College Basketball",
    shortLabel: "NCAAB",
    season: "November – April",
    primaryBetTypes: ["spread", "moneyline", "total"],
    propAvailable: false,
    modelMaturity: "beta",
  },
  {
    id: "soccer",
    label: "Soccer",
    shortLabel: "Soccer",
    season: "Year-round (MLS, EPL, Champions League)",
    primaryBetTypes: ["moneyline", "draw", "total"],
    propAvailable: false,
    modelMaturity: "research",
  },
  {
    id: "tennis",
    label: "Tennis",
    shortLabel: "Tennis",
    season: "Year-round (ATP, WTA, Grand Slams)",
    primaryBetTypes: ["moneyline", "set-spread"],
    propAvailable: false,
    modelMaturity: "research",
  },
  {
    id: "mma",
    label: "MMA / UFC",
    shortLabel: "MMA",
    season: "Year-round",
    primaryBetTypes: ["moneyline", "method-of-victory", "round-betting"],
    propAvailable: false,
    modelMaturity: "research",
  },
  {
    id: "golf",
    label: "Golf",
    shortLabel: "Golf",
    season: "Year-round (PGA Tour)",
    primaryBetTypes: ["outright", "top-10", "matchup"],
    propAvailable: false,
    modelMaturity: "research",
  },
];

export function getSportMeta(id: SportId): SportMeta | undefined {
  return SPORT_META.find((s) => s.id === id);
}
