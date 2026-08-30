import type { MetricLifecycleStatus } from "./metric-core.js";

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

export type MetricPublicExposure =
  | "hidden"
  | "driver_only"
  | "grade_only"
  | "score_band"
  | "full_score"
  | "api_limited"
  | "api_full";

export interface GseMetricBirthCertificate {
  readonly metricId: string;
  readonly publicName: string;
  readonly internalName: string;
  readonly family: GseMetricFamily;
  readonly purpose: string;
  readonly historicalPrecedent: readonly {
    readonly name: string;
    readonly explanation: string;
    readonly citationKey?: string;
  }[];
  readonly target: string;
  readonly allowedInputs: readonly string[];
  readonly forbiddenInputs: readonly string[];
  readonly formulaSummary: string;
  readonly protectedComponents: readonly string[];
  readonly validationMethods: readonly string[];
  readonly failureModes: readonly string[];
  readonly publicExposure: MetricPublicExposure;
  readonly sourceRightsRequired: readonly string[];
  readonly status: MetricLifecycleStatus;
}

export const GSE_NFL_METRIC_BIRTH_CERTIFICATES: readonly GseMetricBirthCertificate[] = [
  {
    allowedInputs: ["public play-by-play", "game context", "weather proxy", "QB/receiver priors"],
    failureModes: ["pressure and separation are proxies without licensed tracking", "garbage-time behavior can distort catch probability"],
    family: "passing",
    forbiddenInputs: ["unlicensed tracking data", "private Next Gen Stats model outputs"],
    formulaSummary: "Logistic completion probability from pass depth, yards to go, field context, pressure/weather proxies, and shrunk player priors.",
    historicalPrecedent: [
      { explanation: "Completion probability and CPOE establish event-level passing probability as a football analytics pattern.", name: "xCOMP/CPOE" },
      { explanation: "Public play-by-play has supported expected-points and win-probability football models.", name: "nflWAR" },
    ],
    internalName: "gse_expected_completion_shadow",
    metricId: "gse-xcomp",
    protectedComponents: ["coefficient values", "proxy transforms", "player-prior shrinkage constants"],
    publicExposure: "score_band",
    publicName: "GSE xCOMP",
    purpose: "Estimate whether a pass should be completed from cleared football context.",
    sourceRightsRequired: ["modeling allowed", "derived metric attribution retained"],
    status: "SHADOW",
    target: "pass attempt completion probability",
    validationMethods: ["Brier score", "log loss", "calibration by air-yard bucket", "out-of-sample season split"],
  },
  {
    allowedInputs: ["GSE xCOMP", "air yards", "sideline proxy", "separation/cushion when cleared"],
    failureModes: ["separation proxies can be missing", "deep sideline targets may be under-specified"],
    family: "receiving",
    forbiddenInputs: ["unlicensed route tracking", "private defender coordinates"],
    formulaSummary: "Difficulty score from low completion expectation, target depth, sideline/contest proxies, and receiver-space proxies.",
    historicalPrecedent: [
      { explanation: "Target difficulty is the inverse of event-level catch probability plus receiver context.", name: "Receiver difficulty models" },
    ],
    internalName: "gse_receiver_difficulty_shadow",
    metricId: "gse-receiver-difficulty",
    protectedComponents: ["difficulty blend", "space proxy transform"],
    publicExposure: "grade_only",
    publicName: "GSE Receiver Difficulty",
    purpose: "Separate easy targets from difficult targets before crediting receiver or quarterback outcomes.",
    sourceRightsRequired: ["modeling allowed", "tracking-derived inputs withheld unless licensed"],
    status: "SHADOW",
    target: "target difficulty index",
    validationMethods: ["rank correlation", "bucket lift", "out-of-sample receiver stability"],
  },
  {
    allowedInputs: ["public play-by-play", "receiver YAC prior", "field position", "space proxies"],
    failureModes: ["space proxy is weaker than tracking", "screen plays can dominate small samples"],
    family: "receiving",
    forbiddenInputs: ["private expected-YAC model outputs", "unlicensed tracking coordinates"],
    formulaSummary: "Expected YAC from target depth, receiver YAC prior, separation/cushion proxies, defender leverage, and field compression.",
    historicalPrecedent: [
      { explanation: "Expected YAC and YAC above expectation are established advanced receiving questions.", name: "Expected YAC" },
    ],
    internalName: "gse_expected_yac_shadow",
    metricId: "gse-xyac",
    protectedComponents: ["YAC prior shrinkage", "space transform"],
    publicExposure: "score_band",
    publicName: "GSE xYAC",
    purpose: "Estimate yards after catch expected from cleared context.",
    sourceRightsRequired: ["modeling allowed", "derived metric attribution retained"],
    status: "SHADOW",
    target: "expected yards after catch",
    validationMethods: ["MAE", "RMSE", "bucket calibration", "out-of-sample season split"],
  },
  {
    allowedInputs: ["public play-by-play", "team rushing context", "weather proxy", "game script"],
    failureModes: ["box count may be unavailable", "offensive-line proxy can be noisy"],
    family: "rushing",
    forbiddenInputs: ["unlicensed box count tracking", "private player-location data"],
    formulaSummary: "Weighted rushing environment score from line proxy, front strength, box lightness, down/distance, game script, weather, and red-zone space.",
    historicalPrecedent: [
      { explanation: "Adjusted line yards separates rushing environment from raw rushing yards.", name: "Adjusted Line Yards" },
    ],
    internalName: "gse_rush_environment_shadow",
    metricId: "gse-rush-environment",
    protectedComponents: ["environment blend", "front-strength transform"],
    publicExposure: "score_band",
    publicName: "GSE Rush Environment",
    purpose: "Estimate whether a rushing attempt or player rushing slate had favorable context.",
    sourceRightsRequired: ["modeling allowed", "derived metric attribution retained"],
    status: "SHADOW",
    target: "rush environment quality",
    validationMethods: ["MAE vs yards", "lift by bucket", "drift report"],
  },
  {
    allowedInputs: ["GSE xCOMP", "pressure proxy", "receiver separation deficit", "down and distance", "pass-rate context"],
    failureModes: ["pressure proxy can understate true rush", "receiver separation can be unavailable"],
    family: "passing",
    forbiddenInputs: ["unlicensed pressure tracking", "private route separation data"],
    formulaSummary: "Quarterback burden index from completion difficulty, pressure, receiver separation deficit, pass-rate pressure, yards to go, and sack-avoidance load.",
    historicalPrecedent: [
      { explanation: "Adjusted plus-minus and context-adjusted football models control for environment before crediting the player.", name: "Context-adjusted player value" },
    ],
    internalName: "gse_qb_burden_shadow",
    metricId: "gse-qb-burden",
    protectedComponents: ["burden blend", "pressure transform"],
    publicExposure: "grade_only",
    publicName: "GSE QB Burden",
    purpose: "Measure how difficult the quarterback's assignment was before evaluating outcome.",
    sourceRightsRequired: ["modeling allowed", "proxy limitations disclosed"],
    status: "SHADOW",
    target: "quarterback assignment difficulty",
    validationMethods: ["rank correlation", "bucket lift", "out-of-sample stability"],
  },
  {
    allowedInputs: ["snap share", "route share", "target share", "injury reports", "depth-chart changes"],
    failureModes: ["coach usage can change without public signals", "injury labels can be stale"],
    family: "role",
    forbiddenInputs: ["private team medical data", "unlicensed practice participation details"],
    formulaSummary: "Volatility score from usage deltas, injury/depth-chart shocks, teammate role changes, and sample-size penalty.",
    historicalPrecedent: [
      { explanation: "Usage volatility and uncertainty are required before acting on player projection shifts.", name: "Role uncertainty modeling" },
    ],
    internalName: "gse_role_volatility_shadow",
    metricId: "gse-role-volatility",
    protectedComponents: ["shock blend", "sample-size penalty"],
    publicExposure: "driver_only",
    publicName: "GSE Role Volatility",
    purpose: "Quantify whether a player's role is stable enough to support an action.",
    sourceRightsRequired: ["modeling allowed", "injury/source freshness retained"],
    status: "SHADOW",
    target: "role instability pressure",
    validationMethods: ["calibration by usage-shift bucket", "drift report", "out-of-sample role-change recall"],
  },
] as const;

export function metricBirthCertificate(metricId: string): GseMetricBirthCertificate | null {
  return GSE_NFL_METRIC_BIRTH_CERTIFICATES.find((certificate) => certificate.metricId === metricId) ?? null;
}
