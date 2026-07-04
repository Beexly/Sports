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
