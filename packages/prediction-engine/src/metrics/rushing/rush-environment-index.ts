import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { clamp, clamp01, normalizeClamped, round, weightedMean } from "../core/math.js";
import { uncertaintyFromEvidence, type MetricLifecycleStatus, type MetricSourcePolicy, type MetricUncertaintyBand } from "../core/validation.js";

/**
 * Structural inputs describing the rushing environment for a play population.
 *
 * All proxy fields are dimensionless 0-1 scores (values outside [0,1] are
 * clamped). When a proxy is omitted it defaults to 0.5 (a deliberately neutral
 * midpoint), except `weatherPenalty`, which defaults to 0 (no penalty). Omitted
 * proxies still count as "unknown" for the evidence/uncertainty gate: only the
 * proxies actually supplied raise the proxy count that feeds
 * `uncertaintyFromEvidence`.
 */
export interface RushEnvironmentInput {
  /** Current down. Clamped to [1,4]; higher down = more rushing stress. */
  readonly down: number;
  /** Yards to the first-down marker. Clamped to [1,20] and normalized over [2,14]. */
  readonly yardsToGo: number;
  /** Box-pressure proxy, 0-1. Higher = heavier box = worse environment. Default 0.5. */
  readonly boxPressureProxy?: number;
  /** Offensive-line continuity proxy, 0-1. Higher = better continuity = better environment. Default 0.5. */
  readonly offensiveLineContinuityProxy?: number;
  /** Run-direction leverage proxy, 0-1. Higher = better directional matchup. Default 0.5. */
  readonly runDirectionLeverageProxy?: number;
  /** Game-script run-friendliness proxy, 0-1. Higher = script favors running. Default 0.5. */
  readonly gameScriptRunFriendliness?: number;
  /** Defensive-front pressure proxy, 0-1. Higher = more front pressure = worse environment. Default 0.5. */
  readonly defensiveFrontPressureProxy?: number;
  /** Weather penalty, 0-1. Higher = worse rushing weather. Default 0 (no penalty). */
  readonly weatherPenalty?: number;
  /** Number of plays backing the proxies; feeds the evidence/confidence gate only. */
  readonly sampleSize?: number;
  /** Source rights/modeling policies. Empty or disallowed fails the metric closed to HIGH uncertainty. */
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface RushEnvironmentIndex {
  readonly metricId: "rush-environment-index";
  readonly environmentIndex: number;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "EVIDENCE_QUALITY_NOT_RUSH_SUCCESS_PROBABILITY";
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

/**
 * Composite index of how favorable the structural rushing environment is for a
 * play population — a pre-outcome "how good are the conditions to run into"
 * signal, not a prediction of yards or rush success.
 *
 * Output (`environmentIndex`): 0-100, higher = more favorable to the rush.
 * It is a weighted mean of seven 0-1 relief/quality factors, rescaled to 0-100.
 * Weights sum to exactly 1.0:
 *   - box-pressure relief          0.24
 *   - offensive-line continuity    0.20
 *   - defensive-front relief       0.16
 *   - run-direction leverage       0.14
 *   - down-distance environment    0.12
 *   - game-script run-friendliness 0.10
 *   - weather relief               0.04
 *
 * Confidence (`confidenceScore`, 0-100) measures EVIDENCE QUALITY — how much we
 * trust the inputs — and is explicitly NOT a rush-success probability (see
 * `confidenceMeaning`). It rises with sample size but is capped, and the source
 * rights gate can override it: an empty/disallowed `sourcePolicy` fails the
 * metric closed to HIGH uncertainty and low confidence regardless of sample.
 *
 * `status` is always SHADOW — this metric is computed and audited but not priced.
 *
 * Factor trail (`drivers`) limitation: the trail surfaces the top structural
 * contributors and is NOT an exhaustive attribution of `environmentIndex`. Two
 * mid-weight factors — run-direction leverage (0.14) and game-script
 * run-friendliness (0.10) — are intentionally omitted, so the listed driver
 * contributions do not sum to `environmentIndex`. See the inline note on the
 * drivers array for the rationale.
 */
export function rushEnvironmentIndex(input: RushEnvironmentInput): RushEnvironmentIndex {
  const downStress = normalizeClamped(clamp(input.down, 1, 4), 1, 4);
  const distanceStress = normalizeClamped(clamp(input.yardsToGo, 1, 20), 2, 14);
  const downDistanceEnvironment = clamp01(1 - 0.38 * downStress - 0.28 * distanceStress);
  const boxRelief = 1 - clamp01(input.boxPressureProxy ?? 0.5);
  const frontRelief = 1 - clamp01(input.defensiveFrontPressureProxy ?? 0.5);
  const lineContinuity = clamp01(input.offensiveLineContinuityProxy ?? 0.5);
  const directionLeverage = clamp01(input.runDirectionLeverageProxy ?? 0.5);
  const script = clamp01(input.gameScriptRunFriendliness ?? 0.5);
  const weatherRelief = 1 - clamp01(input.weatherPenalty ?? 0);
  // Weights sum to exactly 1.0, so `environment` stays in [0,1] and scales
  // cleanly to the 0-100 environmentIndex. Keep this in sync with the weight
  // table in the function docstring if any weight changes.
  const environment = weightedMean([
    { value: boxRelief, weight: 0.24 },
    { value: lineContinuity, weight: 0.2 },
    { value: frontRelief, weight: 0.16 },
    { value: directionLeverage, weight: 0.14 },
    { value: downDistanceEnvironment, weight: 0.12 },
    { value: script, weight: 0.1 },
    { value: weatherRelief, weight: 0.04 },
  ]);
  const uncertaintyBand = uncertaintyFromEvidence({
    proxyCount: proxyCount([
      input.boxPressureProxy,
      input.offensiveLineContinuityProxy,
      input.runDirectionLeverageProxy,
      input.gameScriptRunFriendliness,
      input.defensiveFrontPressureProxy,
      input.weatherPenalty,
    ]),
    sampleSize: input.sampleSize,
    sourcePolicy: input.sourcePolicy,
  });

  return {
    birthCertificate: requireMetricBirthCertificate("rush-environment-index"),
    confidenceMeaning: "EVIDENCE_QUALITY_NOT_RUSH_SUCCESS_PROBABILITY",
    confidenceScore: confidenceFromEvidence(input.sampleSize ?? 0, uncertaintyBand),
    // Factor trail: a top-contributors surface, NOT an exhaustive attribution.
    // Each contribution is expressed in index points (the factor's 0-1 relief
    // value times its weight*100), so the entries below intentionally do not sum
    // to environmentIndex. run-direction leverage (weight 0.14) and game-script
    // run-friendliness (weight 0.10) are deliberately excluded here even though
    // weather (weight 0.04) is shown: leverage and script are coarse team-level
    // proxies that read as opaque in a per-play trail, whereas box/line/front/
    // down-distance/weather map to concrete, explainable conditions. If these
    // proxies are ever promoted to first-class explainable factors, add them
    // here and update the docstring's factor-trail limitation note.
    drivers: sortedDrivers([
      metricDriver({
        contribution: boxRelief * 24,
        direction: "UP",
        explanation: "Lighter box-pressure proxy improves rush environment.",
        name: "box_pressure_relief",
      }),
      metricDriver({
        contribution: lineContinuity * 20,
        direction: "UP",
        explanation: "Offensive-line continuity proxy improves rush environment.",
        name: "offensive_line_continuity",
      }),
      metricDriver({
        contribution: frontRelief * 16,
        direction: "UP",
        explanation: "Lower defensive-front pressure improves rush environment.",
        name: "front_pressure_relief",
      }),
      metricDriver({
        contribution: downDistanceEnvironment * 12,
        direction: "UP",
        explanation: "Down-distance context affects how favorable a rushing lane is expected to be.",
        name: "down_distance_environment",
      }),
      metricDriver({
        contribution: -clamp01(input.weatherPenalty ?? 0) * 4,
        direction: "DOWN",
        explanation: "Weather penalty lowers rush environment quality.",
        name: "weather_penalty",
      }),
    ]),
    environmentIndex: round(environment * 100, 2),
    metricId: "rush-environment-index",
    sourcePolicy: input.sourcePolicy,
    status: "SHADOW",
    uncertaintyBand,
  };
}

/**
 * Maps evidence into an evidence-quality confidence score (0-100).
 *
 * The uncertainty band sets the base (LOW->81, MEDIUM->59, HIGH->35); sample
 * size adds at most +12 (1 point per 100 plays, capped). Because HIGH caps well
 * below the others, a large sample cannot rescue confidence once the rights gate
 * has failed closed. This is evidence quality, not a rush-success probability.
 */
function confidenceFromEvidence(sampleSize: number, uncertaintyBand: MetricUncertaintyBand): number {
  const base = uncertaintyBand === "LOW" ? 81 : uncertaintyBand === "MEDIUM" ? 59 : 35;
  return round(Math.min(100, base + Math.min(12, sampleSize / 100)), 2);
}

/** Counts how many proxy inputs were actually supplied (undefined = not observed). */
function proxyCount(values: readonly (number | undefined)[]): number {
  return values.filter((value) => value !== undefined).length;
}
