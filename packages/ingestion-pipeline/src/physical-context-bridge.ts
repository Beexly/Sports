/**
 * Physical-context bridge — wires the venue/weather/in-play physics and the
 * decision-calibrated calibration layer into the live evaluation surface.
 *
 * This is the "the stadium is real, the ball is real, the clock is real, and
 * the probability we publish is worth what it costs" layer:
 *
 *   - air density / kick distance / venue effect (altitude + temperature)
 *   - ball pressure, restitution, fumble and touchback effects (deader ball)
 *   - decision-calibrated weather source selection (decision VALUE, not RMSE)
 *   - Shin fair probability for a chosen side (method-compare honesty)
 *   - out-of-fold calibration blend: parametric Beta tail + isotonic middle,
 *     wrapped in a monotone envelope so ranking is preserved
 *   - safe-lead survival and diffusion win probability under live leads
 *
 * Fail-closed on missing or non-physical inputs. Never invents a density, a
 * payoff, a calibration map, or a survival probability.
 */

import {
  fahrenheitToKelvin,
  airDensityKgM3,
  kickDistanceScale,
  effectiveKickDistance,
  venueEffectEstimate,
} from "@sports/prediction-engine";
import {
  pressureAtTemp,
  pressureDrop,
  restitutionAtTemp,
  ballEffects,
  fitLambda,
  type BallEffects,
} from "@sports/prediction-engine";
import {
  decisionValue,
  weatherRmse,
  selectWeatherSource,
  type WeatherSource,
} from "@sports/prediction-engine";
import { shinFairForSide } from "@sports/prediction-engine";
import {
  applyBeta,
  monotoneEnvelope,
  tailBlendMap,
  type CalibrationMap,
} from "@sports/prediction-engine";
import {
  safeLeadProb,
  diffusionWinProb,
  leadSafetyFeature,
  expectedLeadChangesRemaining,
} from "@sports/prediction-engine";

export type PhysicalEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

function fail(reason: string): PhysicalEval<never> {
  return { ok: false, reason };
}

function finite(...values: number[]): boolean {
  return values.every((v) => typeof v === "number" && Number.isFinite(v));
}

// ─── Air density / kick distance / venue effect ───────────────────────────────

export interface VenueEnvironment {
  readonly airDensityKgM3: number;
  readonly kickDistanceScale: number;
  readonly effectiveKickYards: number;
}

/**
 * Air density and the kick-distance penalty it imposes at a venue.
 * Fail-closed on non-physical altitude / temperature / pressure.
 */
export function evalVenueEnvironment(input: {
  readonly nominalKickYards: number;
  readonly altitudeFeet: number;
  readonly tempF: number;
  readonly pressureInHg?: number;
  readonly dragExponent?: number;
}): PhysicalEval<VenueEnvironment> {
  const { nominalKickYards, altitudeFeet, tempF, pressureInHg, dragExponent } = input;
  if (!finite(nominalKickYards, altitudeFeet, tempF)) {
    return fail("nominalKickYards/altitudeFeet/tempF must be finite");
  }
  if (nominalKickYards <= 0) return fail("nominalKickYards must be positive");
  if (pressureInHg !== undefined && (!finite(pressureInHg) || pressureInHg <= 0)) {
    return fail("pressureInHg must be finite and positive when supplied");
  }
  if (dragExponent !== undefined && (!finite(dragExponent) || dragExponent < 0)) {
    return fail("dragExponent must be finite and >= 0");
  }
  try {
    const rho = airDensityKgM3(altitudeFeet, tempF, pressureInHg);
    const scale = kickDistanceScale(rho, dragExponent ?? 1);
    const effective = effectiveKickDistance(nominalKickYards, altitudeFeet, tempF, pressureInHg);
    if (!finite(rho, scale, effective)) return fail("venue physics produced non-finite output");
    return {
      ok: true,
      data: { airDensityKgM3: rho, kickDistanceScale: scale, effectiveKickYards: effective },
    };
  } catch (e) {
    return fail(`air density path threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Fahrenheit to Kelvin. Fail-closed below absolute zero.
 */
export function evalFahrenheitToKelvin(input: {
  readonly tempF: number;
}): PhysicalEval<{ readonly kelvin: number }> {
  const { tempF } = input;
  if (!finite(tempF)) return fail("tempF must be finite");
  if (tempF < -459.67) return fail("tempF below absolute zero is not physical");
  try {
    return { ok: true, data: { kelvin: fahrenheitToKelvin(tempF) } };
  } catch (e) {
    return fail(`fahrenheitToKelvin threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Venue effect as difference-in-differences: the venue change net of the
 * league-wide change over the same window.
 */
export function evalVenueEffect(input: {
  readonly venueBefore: number;
  readonly venueAfter: number;
  readonly leagueBefore: number;
  readonly leagueAfter: number;
}): PhysicalEval<{ readonly effect: number }> {
  const { venueBefore, venueAfter, leagueBefore, leagueAfter } = input;
  if (!finite(venueBefore, venueAfter, leagueBefore, leagueAfter)) {
    return fail("all four rates must be finite");
  }
  try {
    const effect = venueEffectEstimate(venueBefore, venueAfter, leagueBefore, leagueAfter);
    if (!finite(effect)) return fail("venue effect is non-finite");
    return { ok: true, data: { effect } };
  } catch (e) {
    return fail(`venueEffectEstimate threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── Ball physics ────────────────────────────────────────────────────────────

/**
 * Pressure, pressure drop and restitution at game-day temperature.
 * Fail-closed on out-of-range restitution anchors.
 */
export function evalBallPhysics(input: {
  readonly tempF: number;
  readonly eps0?: number;
  readonly lambda?: number;
}): PhysicalEval<{
  readonly pressurePsi: number;
  readonly dropPsi: number;
  readonly restitution: number;
}> {
  const { tempF, eps0, lambda } = input;
  if (!finite(tempF)) return fail("tempF must be finite");
  if (eps0 !== undefined && (!finite(eps0) || eps0 <= 0 || eps0 >= 1)) {
    return fail("eps0 must lie in (0, 1)");
  }
  if (lambda !== undefined && (!finite(lambda) || lambda < 0)) {
    return fail("lambda must be finite and >= 0");
  }
  try {
    return {
      ok: true,
      data: {
        pressurePsi: pressureAtTemp(tempF),
        dropPsi: pressureDrop(tempF),
        restitution: restitutionAtTemp(tempF, eps0 ?? 0.82, lambda ?? 0.012),
      },
    };
  } catch (e) {
    return fail(`ball physics threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Full deader-ball effect set: touchback factor and fumble percentage.
 */
export function evalBallEffects(input: {
  readonly tempF: number;
  readonly eps0?: number;
  readonly lambda?: number;
  readonly kappa?: number;
  readonly lambdaFumble?: number;
}): PhysicalEval<BallEffects> {
  const { tempF, eps0, lambda, kappa, lambdaFumble } = input;
  if (!finite(tempF)) return fail("tempF must be finite");
  try {
    const effects = ballEffects(tempF, { eps0, lambda, kappa, lambdaFumble });
    if (!finite(effects.tempF)) return fail("ballEffects returned non-finite output");
    return { ok: true, data: effects };
  } catch (e) {
    return fail(`ballEffects threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Fit the temperature->restitution slope from observed broadcast pairs.
 * Fail-closed on an empty set or a degenerate pressure drop.
 */
export function evalFitLambda(input: {
  readonly pairs: readonly { readonly tempF: number; readonly epsilonObserved: number }[];
  readonly eps0?: number;
}): PhysicalEval<{ readonly lambda: number }> {
  const { pairs, eps0 } = input;
  if (!Array.isArray(pairs) || pairs.length === 0) {
    return fail("pairs must be non-empty");
  }
  for (const p of pairs) {
    if (!finite(p.tempF, p.epsilonObserved)) {
      return fail("every pair needs finite tempF and epsilonObserved");
    }
  }
  try {
    const lambda = fitLambda(
      pairs.map((p) => ({ tempF: p.tempF, epsilonObserved: p.epsilonObserved })),
      eps0 ?? 0.82,
    );
    if (!finite(lambda)) return fail("fitted lambda is non-finite");
    return { ok: true, data: { lambda } };
  } catch (e) {
    return fail(`fitLambda threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── Decision-calibrated weather ─────────────────────────────────────────────

export interface WeatherSourceVerdict {
  readonly name: string;
  readonly decisionValue: number;
  readonly rmse: number;
}

/**
 * Score a weather source by the value of acting on it, and compare it to
 * the accuracy baseline. The publishable number is decisionValue; rmse is
 * reported only so a reader can see whether value is buying skill or luck.
 */
export function evalWeatherSource(input: {
  readonly source: WeatherSource;
  readonly threshold: number;
  readonly valuePerCorrect?: number;
  readonly valuePerWrong?: number;
}): PhysicalEval<WeatherSourceVerdict> {
  const { source, threshold, valuePerCorrect, valuePerWrong } = input;
  if (!source || typeof source.name !== "string" || source.name.length === 0) {
    return fail("source.name required");
  }
  if (!finite(threshold)) return fail("threshold must be finite");
  const forecasts = source.forecasts;
  const actuals = source.actuals;
  if (!Array.isArray(forecasts) || !Array.isArray(actuals)) {
    return fail("forecasts/actuals must be arrays");
  }
  if (forecasts.length === 0) return fail("forecasts must be non-empty");
  if (forecasts.length !== actuals.length) {
    return fail("forecasts and actuals must be aligned");
  }
  for (const v of [...forecasts, ...actuals]) {
    if (!finite(v)) return fail("forecasts/actuals must be finite");
  }
  try {
    const dv = decisionValue(
      source,
      threshold,
      valuePerCorrect ?? 1,
      valuePerWrong ?? -1.1,
    );
    const err = weatherRmse(source);
    if (!finite(dv, err)) return fail("weather scoring produced non-finite output");
    return { ok: true, data: { name: source.name, decisionValue: dv, rmse: err } };
  } catch (e) {
    return fail(`weather scoring threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Select the weather source with the highest decision value (ties keep the
 * first). Fail-closed on an empty candidate set.
 */
export function evalSelectWeatherSource(input: {
  readonly sources: readonly WeatherSource[];
  readonly threshold: number;
}): PhysicalEval<{ readonly name: string; readonly decisionValue: number }> {
  const { sources, threshold } = input;
  if (!Array.isArray(sources) || sources.length === 0) {
    return fail("sources must be non-empty");
  }
  if (!finite(threshold)) return fail("threshold must be finite");
  try {
    return { ok: true, data: selectWeatherSource(sources, threshold) };
  } catch (e) {
    return fail(`selectWeatherSource threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── Honesty: Shin fair probability for a side ───────────────────────────────

/**
 * Shin-devig fair probability for the chosen side of a two-way book.
 * Fail-closed on a non-positive or non-finite book.
 */
export function evalShinFair(input: {
  readonly homeImplied: number;
  readonly awayImplied: number;
  readonly homeIsChosen: boolean;
}): PhysicalEval<{ readonly fair: number }> {
  const { homeImplied, awayImplied, homeIsChosen } = input;
  if (!finite(homeImplied, awayImplied)) return fail("both implied probabilities must be finite");
  if (homeImplied <= 0 || awayImplied <= 0) {
    return fail("implied probabilities must be positive");
  }
  if (typeof homeIsChosen !== "boolean") return fail("homeIsChosen must be a boolean");
  try {
    const fair = shinFairForSide({ homeImplied, awayImplied }, homeIsChosen);
    if (fair === null) {
      return fail("Shin devig produced no finite fair probability for this book");
    }
    if (!finite(fair)) return fail("Shin fair probability is non-finite");
    if (fair < 0 || fair > 1) return fail("Shin fair probability outside [0, 1]");
    return { ok: true, data: { fair } };
  } catch (e) {
    return fail(`shinFairForSide threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── Calibration blend ───────────────────────────────────────────────────────

export interface BetaModelView {
  readonly a: number;
  readonly b: number;
  readonly c: number;
}

/**
 * Apply a fitted Beta calibration map at a probability.
 */
export function evalApplyBeta(input: {
  readonly model: BetaModelView;
  readonly p: number;
}): PhysicalEval<{ readonly calibrated: number }> {
  const { model, p } = input;
  if (!model || !finite(model.a, model.b, model.c)) {
    return fail("model a/b/c must be finite");
  }
  if (!finite(p)) return fail("p must be finite");
  try {
    // BetaModel extends CalibratorFit, so it carries a predict closure and a
    // canonical serialization of its own parameters. applyBeta reads only
    // a/b/c, but the commitment string is what makes two fits distinguishable,
    // so it is built from the real coefficients rather than stubbed.
    const { a, b, c } = model;
    const calibrated = applyBeta(
      {
        method: "beta",
        a,
        b,
        c,
        paramsCanonical: `beta|a=${a}|b=${b}|c=${c}`,
        predict: (q: number) => {
          const pc = Math.min(1 - 1e-9, Math.max(1e-9, q));
          return 1 / (1 + Math.exp(-(a * Math.log(pc) - b * Math.log(1 - pc) + c)));
        },
      },
      p,
    );
    if (!finite(calibrated)) return fail("beta calibration produced non-finite output");
    return { ok: true, data: { calibrated } };
  } catch (e) {
    return fail(`applyBeta threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Verify a calibration map preserves ranking on a caller-supplied grid.
 * This is the honesty guard on the calibration layer: a map that reorders
 * probabilities is not a calibration, it is a different model, and it must
 * not be published as one.
 */
export function evalMonotoneEnvelope(input: {
  readonly map: CalibrationMap;
  readonly gridSize?: number;
  readonly sampleGrid?: readonly number[];
}): PhysicalEval<{ readonly map: CalibrationMap; readonly monotone: boolean }> {
  const { map, gridSize, sampleGrid } = input;
  if (typeof map !== "function") return fail("map must be a function");
  const grid =
    sampleGrid && sampleGrid.length > 1
      ? [...sampleGrid]
      : Array.from({ length: 21 }, (_, i) => i / 20);
  let enveloped: CalibrationMap;
  try {
    enveloped = monotoneEnvelope(map, gridSize ?? 2001);
  } catch (e) {
    return fail(`monotoneEnvelope threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  let prev = -Infinity;
  for (const x of grid) {
    if (!finite(x) || x < 0 || x > 1) return fail("grid values must lie in [0, 1]");
    let y: number;
    try {
      y = enveloped(x);
    } catch (e) {
      return fail(`envelope threw at x=${x}: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (!finite(y)) return fail(`envelope returned non-finite value at x=${x}`);
    if (y < prev - 1e-9) {
      return { ok: true, data: { map: enveloped, monotone: false } };
    }
    prev = y;
  }
  return { ok: true, data: { map: enveloped, monotone: true } };
}

export interface TailBlendSpec {
  readonly iso: CalibrationMap;
  readonly beta: CalibrationMap;
  readonly tailLo?: number;
  readonly tailHi?: number;
  readonly band?: number;
}

/**
 * Build the tail-blended calibration map and report whether the composite
 * is monotone. The composite is NOT automatically monotone; callers must
 * read `monotone` before publishing it.
 */
export function evalTailBlend(input: TailBlendSpec): PhysicalEval<{
  readonly map: CalibrationMap;
  readonly monotone: boolean;
}> {
  const { iso, beta, tailLo, tailHi, band } = input;
  if (typeof iso !== "function") return fail("iso map must be a function");
  if (typeof beta !== "function") return fail("beta map must be a function");
  const lo = tailLo ?? 0.15;
  const hi = tailHi ?? 0.85;
  const b = band ?? 0.05;
  if (!finite(lo, hi, b)) return fail("tailLo/tailHi/band must be finite");
  if (!(lo >= 0 && hi <= 1 && lo < hi)) return fail("require 0 <= tailLo < tailHi <= 1");
  if (b <= 0) return fail("band must be positive");
  try {
    const raw = tailBlendMap(iso, beta, { tailLo: lo, tailHi: hi, band: b });
    const grid = Array.from({ length: 21 }, (_, i) => i / 20);
    let prev = -Infinity;
    let monotone = true;
    for (const x of grid) {
      const y = raw(x);
      if (!finite(y)) return fail(`tail blend returned non-finite value at x=${x}`);
      if (y < prev - 1e-9) monotone = false;
      prev = y;
    }
    return { ok: true, data: { map: raw, monotone } };
  } catch (e) {
    return fail(`tailBlendMap threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── In-play safe lead ───────────────────────────────────────────────────────

/**
 * Probability the current lead survives to the final whistle under
 * Brownian diffusion with drift.
 */
export function evalSafeLead(input: {
  readonly lead: number;
  readonly timeRemainingMin: number;
  readonly driftPerMin: number;
  readonly diffusivity: number;
}): PhysicalEval<{ readonly survival: number }> {
  const { lead, timeRemainingMin, driftPerMin, diffusivity } = input;
  if (!finite(lead, timeRemainingMin, driftPerMin, diffusivity)) {
    return fail("lead/time/drift/diffusivity must be finite");
  }
  if (timeRemainingMin < 0) return fail("timeRemainingMin must be >= 0");
  if (diffusivity <= 0) return fail("diffusivity must be positive");
  try {
    const survival = safeLeadProb({ lead, timeRemainingMin, driftPerMin, diffusivity });
    if (!finite(survival)) return fail("safe-lead survival is non-finite");
    if (survival < 0 || survival > 1) return fail("safe-lead survival outside [0, 1]");
    return { ok: true, data: { survival } };
  } catch (e) {
    return fail(`safeLeadProb threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Diffusion win probability from a live lead.
 */
export function evalDiffusionWinProb(input: {
  readonly lead: number;
  readonly timeRemainingMin: number;
  readonly driftPerMin: number;
  readonly diffusivity: number;
}): PhysicalEval<{ readonly winProb: number }> {
  const { lead, timeRemainingMin, driftPerMin, diffusivity } = input;
  if (!finite(lead, timeRemainingMin, driftPerMin, diffusivity)) {
    return fail("lead/time/drift/diffusivity must be finite");
  }
  if (timeRemainingMin < 0) return fail("timeRemainingMin must be >= 0");
  if (diffusivity <= 0) return fail("diffusivity must be positive");
  try {
    const winProb = diffusionWinProb(lead, timeRemainingMin, driftPerMin, diffusivity);
    if (!finite(winProb)) return fail("diffusion win probability is non-finite");
    if (winProb < 0 || winProb > 1) return fail("diffusion win probability outside [0, 1]");
    return { ok: true, data: { winProb } };
  } catch (e) {
    return fail(`diffusionWinProb threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Safe-lead feature derived from a pregame spread: the drift is the spread
 * spread across a 60-minute game.
 */
export function evalLeadSafetyFeature(input: {
  readonly lead: number;
  readonly timeRemainingMin: number;
  readonly pregameSpread: number;
  readonly diffusivity: number;
}): PhysicalEval<{ readonly feature: number }> {
  const { lead, timeRemainingMin, pregameSpread, diffusivity } = input;
  if (!finite(lead, timeRemainingMin, pregameSpread, diffusivity)) {
    return fail("all inputs must be finite");
  }
  if (timeRemainingMin < 0) return fail("timeRemainingMin must be >= 0");
  if (diffusivity <= 0) return fail("diffusivity must be positive");
  try {
    const feature = leadSafetyFeature(lead, timeRemainingMin, pregameSpread, diffusivity);
    if (!finite(feature)) return fail("lead safety feature is non-finite");
    return { ok: true, data: { feature } };
  } catch (e) {
    return fail(`leadSafetyFeature threw: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Expected number of lead changes remaining given a scoring rate.
 */
export function evalExpectedLeadChanges(input: {
  readonly lead: number;
  readonly timeRemainingMin: number;
  readonly eventsPerMin: number;
  readonly meanEventPoints: number;
  readonly balance?: number;
}): PhysicalEval<{ readonly expectedChanges: number }> {
  const { lead, timeRemainingMin, eventsPerMin, meanEventPoints, balance } = input;
  if (!finite(lead, timeRemainingMin, eventsPerMin, meanEventPoints)) {
    return fail("all inputs must be finite");
  }
  if (timeRemainingMin < 0) return fail("timeRemainingMin must be >= 0");
  if (eventsPerMin < 0) return fail("eventsPerMin must be >= 0");
  if (meanEventPoints <= 0) return fail("meanEventPoints must be positive");
  const b = balance ?? 0.5;
  if (!finite(b) || b < 0 || b > 1) return fail("balance must lie in [0, 1]");
  try {
    const expectedChanges = expectedLeadChangesRemaining(
      lead,
      timeRemainingMin,
      eventsPerMin,
      meanEventPoints,
      b,
    );
    if (!finite(expectedChanges)) return fail("expected lead changes is non-finite");
    if (expectedChanges < 0) return fail("expected lead changes must be >= 0");
    return { ok: true, data: { expectedChanges } };
  } catch (e) {
    return fail(
      `expectedLeadChangesRemaining threw: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}
