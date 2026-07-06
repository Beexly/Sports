import type { MetricLifecycleStatus } from "./validation.js";

export type GseMetricFamily =
  | "source"
  | "market"
  | "team"
  | "passing"
  | "receiving"
  | "rushing"
  | "role"
  | "environment"
  | "narrative"
  | "calibration"
  | "decision";

export type GseFormulaClass =
  | "linear"
  | "logistic"
  | "poisson"
  | "tweedie"
  | "hurdle"
  | "hierarchical_bayes"
  | "kalman"
  | "hidden_markov"
  | "gam_spline"
  | "ensemble"
  | "conformal"
  | "composite_score";

export type MetricValidationMethod =
  | "mae"
  | "rmse"
  | "brier"
  | "log_loss"
  | "ece"
  | "reliability_curve"
  | "spearman"
  | "kendall"
  | "clv"
  | "bucket_lift"
  | "walk_forward"
  | "drift_test"
  | "conformal_coverage";

export type MetricPublicExposure = "hidden" | "driver_only" | "grade_only" | "score_band" | "full_score" | "api_limited" | "api_full";

export interface GseMetricBirthCertificate {
  readonly metricId: string;
  readonly publicName: string;
  readonly internalName: string;
  readonly family: GseMetricFamily;
  readonly targetQuestion: string;
  readonly targetVariable: string;
  readonly historicalPrecedent: readonly {
    readonly name: string;
    readonly reason: string;
    readonly citationKey?: string;
  }[];
  readonly allowedInputs: readonly string[];
  readonly forbiddenInputs: readonly string[];
  readonly formulaClass: GseFormulaClass;
  readonly formulaSummary: string;
  readonly protectedComponents: readonly string[];
  readonly validationMethods: readonly MetricValidationMethod[];
  readonly failureModes: readonly string[];
  readonly publicExposure: MetricPublicExposure;
  readonly sourceRightsRequired: readonly string[];
  readonly status: MetricLifecycleStatus;
}

export const GSE_METRIC_BIRTH_CERTIFICATES: readonly GseMetricBirthCertificate[] = [
  {
    allowedInputs: ["source age", "source count", "expected source count", "provider trust", "rights status", "contradictions", "required-field coverage"],
    failureModes: ["fresh data can still be wrong", "single-source data can be display-ready but not decision-ready"],
    family: "source",
    forbiddenInputs: ["unlicensed private feeds", "unattributed scraped data"],
    formulaClass: "composite_score",
    formulaSummary: "Freshness, coverage, provider trust, and rights cleanliness minus contradiction and missing-field penalties.",
    historicalPrecedent: [{ name: "Data quality scoring", reason: "Sports model reliability starts with freshness, coverage, rights, and contradiction controls." }],
    internalName: "data_reliability_index_shadow",
    metricId: "data-reliability-index",
    protectedComponents: ["freshness thresholds", "rights penalty mapping", "provider trust calibration"],
    publicExposure: "grade_only",
    publicName: "Data Reliability Index",
    sourceRightsRequired: ["modeling allowed", "source policy retained"],
    status: "SHADOW",
    targetQuestion: "Is this data reliable enough to influence a decision?",
    targetVariable: "data decision readiness",
    validationMethods: ["bucket_lift", "drift_test", "walk_forward"],
  },
  {
    allowedInputs: ["opening line", "current line", "book lines", "time to start", "source age", "injury explainability", "key-number crossing"],
    failureModes: ["book-specific movement can be noise", "stale movement can masquerade as signal", "low liquidity can fake steam"],
    family: "market",
    forbiddenInputs: ["private book order flow", "uncleared paid steam feeds"],
    formulaClass: "logistic",
    formulaSummary: "Market pull from line movement, consensus, timing, explainability, and key-number effects minus staleness and dispersion.",
    historicalPrecedent: [{ name: "Market microstructure", reason: "Line movement quality depends on consensus, timing, liquidity, and freshness, not movement alone." }],
    internalName: "market_gravity_index_shadow",
    metricId: "market-gravity-index",
    protectedComponents: ["market-specific normalization", "key-number table", "timing decay"],
    publicExposure: "score_band",
    publicName: "Market Gravity Index",
    sourceRightsRequired: ["odds source modeling allowed", "book attribution retained"],
    status: "SHADOW",
    targetQuestion: "Is the market meaningfully pulling toward a side, total, or prop?",
    targetVariable: "market pull quality",
    validationMethods: ["clv", "bucket_lift", "walk_forward", "drift_test"],
  },
  {
    allowedInputs: ["public play-by-play", "air yards", "yards to go", "red zone", "pressure proxy", "weather proxy", "shrunk player priors"],
    failureModes: ["pressure proxy may be weak without tracking", "receiver separation is imperfect without tracking", "garbage time can distort completion behavior"],
    family: "passing",
    forbiddenInputs: ["private Next Gen Stats completion model output", "unlicensed tracking coordinates"],
    formulaClass: "gam_spline",
    formulaSummary: "Logistic completion expectation from protected air-yard/yards-to-go basis terms, context proxies, and shrunk priors.",
    historicalPrecedent: [{ name: "xCOMP and CPOE", reason: "Event-level completion probability is an established football analytics pattern." }],
    internalName: "expected_completion_gse_shadow",
    metricId: "expected-completion-gse",
    protectedComponents: ["basis transforms", "proxy coefficients", "player-prior shrinkage constants"],
    publicExposure: "score_band",
    publicName: "GSE xCOMP",
    sourceRightsRequired: ["public play-by-play modeling allowed", "derived attribution retained"],
    status: "SHADOW",
    targetQuestion: "How likely should this pass have been completed?",
    targetVariable: "completion probability",
    validationMethods: ["brier", "log_loss", "ece", "bucket_lift", "walk_forward"],
  },
  {
    allowedInputs: ["expected completion probability", "air yards", "separation proxy", "cushion proxy", "contested catch proxy", "sideline proxy", "shrunk receiver priors"],
    failureModes: ["separation proxy can be stale or unavailable", "difficulty can be inflated by quarterback error", "tracking-derived proxies require explicit source-rights review"],
    family: "receiving",
    forbiddenInputs: ["raw private tracking coordinates", "private Next Gen Stats route model output", "uncleared separation feeds"],
    formulaClass: "composite_score",
    formulaSummary: "Target difficulty from completion difficulty, depth, separation/cushion proxies, contested-catch pressure, and sideline pressure.",
    historicalPrecedent: [{ name: "Receiver target difficulty and catch probability", reason: "Receiver evaluation requires separating usage volume from catch difficulty." }],
    internalName: "receiver_difficulty_index_shadow",
    metricId: "receiver-difficulty-index",
    protectedComponents: ["proxy transforms", "difficulty component weights", "receiver prior shrinkage constants"],
    publicExposure: "score_band",
    publicName: "Receiver Difficulty Index",
    sourceRightsRequired: ["public play-by-play modeling allowed", "derived receiving proxies only", "no raw tracking exposure"],
    status: "SHADOW",
    targetQuestion: "How difficult was the receiver's target context?",
    targetVariable: "target difficulty",
    validationMethods: ["bucket_lift", "walk_forward", "spearman", "drift_test"],
  },
  {
    allowedInputs: ["air yards", "separation proxy", "cushion proxy", "receiver YAC prior", "space proxy", "defender leverage proxy", "red-zone flag"],
    failureModes: ["space and leverage proxies are weaker without tracking", "screen passes and broken tackles can create regime shifts", "red-zone compression can be misestimated"],
    family: "receiving",
    forbiddenInputs: ["raw private tracking coordinates", "private Next Gen Stats expected YAC output", "uncleared YAC model coefficients"],
    formulaClass: "gam_spline",
    formulaSummary: "Expected yards after catch from protected space/leverage/depth transforms plus shrunk receiver YAC prior.",
    historicalPrecedent: [{ name: "Expected YAC and yards-after-catch models", reason: "Separating catch point context from post-catch creation is an established receiver-evaluation pattern." }],
    internalName: "expected_yac_gse_shadow",
    metricId: "expected-yac-gse",
    protectedComponents: ["space/leverage transforms", "depth decay", "receiver prior shrinkage constants"],
    publicExposure: "score_band",
    publicName: "GSE Expected YAC",
    sourceRightsRequired: ["public play-by-play modeling allowed", "derived receiving proxies only", "no raw tracking exposure"],
    status: "SHADOW",
    targetQuestion: "How many yards after catch should this reception context create?",
    targetVariable: "expected yards after catch",
    validationMethods: ["mae", "rmse", "bucket_lift", "walk_forward", "drift_test"],
  },
  {
    allowedInputs: ["actual yards after catch", "expected YAC from expected-yac-gse", "receiver YAC over expected prior", "broken tackle proxy", "contact balance proxy"],
    failureModes: ["single-play YAC can be dominated by defensive busts", "broken-tackle proxies can be inconsistent by source", "residuals can reward scheme rather than individual creation"],
    family: "receiving",
    forbiddenInputs: ["private Next Gen Stats expected YAC output", "raw private tracking coordinates", "uncleared tackle/contact feeds"],
    formulaClass: "composite_score",
    formulaSummary: "YAC creation residual from actual YAC versus GSE expected YAC, stabilized by shrunk receiver prior and public after-catch context proxies.",
    historicalPrecedent: [{ name: "YAC over expected", reason: "Separating expected after-catch context from actual YAC isolates post-catch creation more cleanly than raw YAC." }],
    internalName: "yac_creation_gse_shadow",
    metricId: "yac-creation-gse",
    protectedComponents: ["residual stabilization", "proxy interaction terms", "receiver residual shrinkage constants"],
    publicExposure: "score_band",
    publicName: "GSE YAC Creation",
    sourceRightsRequired: ["public play-by-play modeling allowed", "derived expected YAC only", "no raw tracking exposure"],
    status: "SHADOW",
    targetQuestion: "How much after-catch production did the receiver create beyond context expectation?",
    targetVariable: "yards after catch over expectation",
    validationMethods: ["mae", "rmse", "spearman", "bucket_lift", "walk_forward", "drift_test"],
  },
  {
    allowedInputs: ["down", "yards to go", "box pressure proxy", "offensive line continuity proxy", "run-direction leverage proxy", "game-script run friendliness", "front pressure proxy", "weather penalty"],
    failureModes: ["box/front proxies are weaker without tracking", "scheme effects can be misread as runner environment", "short-yardage and red-zone contexts can invert yardage expectations"],
    family: "rushing",
    forbiddenInputs: ["private tracking coordinates", "uncleared Next Gen Stats rushing model outputs", "proprietary offensive-line grades"],
    formulaClass: "composite_score",
    formulaSummary: "Rushing context score from down-distance, box/front pressure, line continuity, run-direction leverage, game script, and weather constraints.",
    historicalPrecedent: [{ name: "Rushing context and expected rush models", reason: "Rushing evaluation requires separating runner outcome from blocking, box count, down-distance, and game-state context." }],
    internalName: "rush_environment_index_shadow",
    metricId: "rush-environment-index",
    protectedComponents: ["down-distance transform", "box/front interaction terms", "run-environment weights"],
    publicExposure: "score_band",
    publicName: "Rush Environment Index",
    sourceRightsRequired: ["public play-by-play modeling allowed", "derived rushing proxies only", "no raw tracking exposure"],
    status: "SHADOW",
    targetQuestion: "How favorable was the rushing context before crediting or blaming the ball carrier?",
    targetVariable: "rushing environment quality",
    validationMethods: ["mae", "rmse", "spearman", "bucket_lift", "walk_forward", "drift_test"],
  },
  {
    allowedInputs: ["edge quality", "signal integrity", "market gravity", "player signal", "calibration integrity", "portfolio fit", "no-bet pressure", "drift pressure"],
    failureModes: ["uncalibrated component scores can inflate action quality", "high no-bet pressure should veto apparent edge"],
    family: "decision",
    forbiddenInputs: ["raw protected weights in public output", "ungated probability claims"],
    formulaClass: "composite_score",
    formulaSummary: "Protected nonlinear decision-quality score using component scores and interaction penalties.",
    historicalPrecedent: [{ name: "Decision-quality composites", reason: "Action quality must combine edge, trust, market state, calibration, and refusal pressure." }],
    internalName: "gse_signal_score_shadow",
    metricId: "gse-signal-score",
    protectedComponents: ["interaction weights", "regime switches", "normalizers"],
    publicExposure: "score_band",
    publicName: "GSE Signal Score",
    sourceRightsRequired: ["all component metrics source-clean", "probability claims separately gated"],
    status: "SHADOW",
    targetQuestion: "Is this signal high-quality enough to act on?",
    targetVariable: "decision quality",
    validationMethods: ["clv", "bucket_lift", "walk_forward", "drift_test"],
  },
] as const;

export function metricBirthCertificate(metricId: string): GseMetricBirthCertificate | null {
  return GSE_METRIC_BIRTH_CERTIFICATES.find((certificate) => certificate.metricId === metricId) ?? null;
}

export function requireMetricBirthCertificate(metricId: string): GseMetricBirthCertificate {
  const certificate = metricBirthCertificate(metricId);
  if (certificate === null) throw new Error(`Missing metric birth certificate: ${metricId}`);
  return certificate;
}
