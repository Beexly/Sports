/**
 * Film-derived probability priors — the HONEST math for props.
 *
 * The props lane needs real model probabilities, not placeholders. These
 * priors are computed from film features with fully documented,
 * UNCALIBRATED heuristic coefficients. They are the "treatment" arm of
 * the shadow harness: computed, logged, and applied at weight 0.
 *
 * The blend law is the whole honesty contract:
 *
 *     P(prop hits) = (1 − w) · P_base + w · P_film,   with w = 0
 *
 * w is typed as the literal 0, so no call site can smuggle film weight
 * into a published number. When the calibrate step runs, it fits w on
 * held-out slates and widens the type in a reviewed commit — that is
 * explicitly NOT this stream.
 *
 * Coefficient values below are starting heuristics, NOT fitted values.
 * Every prior is labeled UNCALIBRATED and must never reach a public
 * projection, ranking, or pick.
 *
 * Original implementation for GSE.
 */

import type { PlayerFilmFeatures } from "./player-film-features.js";
import { filmProvenance } from "./film-provenance.js";

/** A film prior for one player × market. */
export interface FilmPropPrior {
  readonly playerId: string;
  /** e.g. "receiving_yards_over", "anytime_td". */
  readonly market: string;
  /** Line the prior is scored against, if any. */
  readonly line: number | null;
  /** Film-derived P(hit), 0..1. UNCALIBRATED. */
  readonly prior: number;
  /** Named sub-terms so the prior is auditable, not a black box. */
  readonly components: Readonly<Record<string, number>>;
  readonly n: number;
  readonly confidence: number;
  readonly calibration: "UNCALIBRATED";
  /** Literal 0 until validated. */
  readonly weight: 0;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}

/**
 * Blend law: P = (1−w)·base + w·filmPrior. w is the literal 0 — the
 * type system enforces that film cannot move the output until the
 * calibrate step widens this type in a reviewed commit.
 */
export function blendProbability(
  base: number,
  filmPrior: number,
  weight: 0,
): number {
  return (1 - weight) * base + weight * filmPrior;
}

/**
 * Film prior for a receiving-yards over/under.
 *
 * Heuristic (UNCALIBRATED): target share dominates (targets are the
 * best predictor of receiving yards), separation at the catch adds
 * yards-after-catch upside, route depth scales the yardage mean.
 * Coefficients are starting guesses — the calibrate step fits them.
 */
export function receivingYardsPrior(
  features: PlayerFilmFeatures,
  line: number | null = null,
): FilmPropPrior {
  const targetShare =
    Object.values(features.targetShareByFormation).reduce(
      (a, b) => a + b,
      0,
    ) > 0
      ? Math.max(...Object.values(features.targetShareByFormation))
      : 0;
  const sep = features.avgSepAtCatchYd ?? 2.5;
  const depth = features.avgDepthYards ?? 8;

  const components = {
    targetShareTerm: round3(1.2 * (targetShare - 0.2)),
    separationTerm: round3(0.08 * (sep - 2.5)),
    depthTerm: round3(0.015 * (depth - 8)),
    base: 0.5,
  };
  const prior = clamp(
    components.base +
      components.targetShareTerm +
      components.separationTerm +
      components.depthTerm,
    0.05,
    0.95,
  );

  return {
    playerId: features.playerId,
    market: "receiving_yards_over",
    line,
    prior: round3(prior),
    components,
    n: features.nRoutes,
    confidence: features.provenance.confidence,
    calibration: "UNCALIBRATED",
    weight: 0,
  };
}

/**
 * Film prior for anytime touchdown.
 *
 * Heuristic (UNCALIBRATED): red-zone route share dominates (TDs come
 * from the red zone), target concentration adds opportunity, separation
 * at the break adds conversion. Coefficients are starting guesses.
 */
export function anytimeTdPrior(
  features: PlayerFilmFeatures,
  line: number | null = null,
): FilmPropPrior {
  const rzShare = features.redZoneRouteShare ?? 0.15;
  const targetShare =
    Object.values(features.targetShareByFormation).length > 0
      ? Math.max(...Object.values(features.targetShareByFormation))
      : 0.2;
  const sepBreak = features.avgSepAtBreakYd ?? 2.0;

  const components = {
    redZoneTerm: round3(1.5 * (rzShare - 0.15)),
    targetShareTerm: round3(0.9 * (targetShare - 0.2)),
    separationTerm: round3(0.05 * (sepBreak - 2.0)),
    base: 0.18,
  };
  const prior = clamp(
    components.base +
      components.redZoneTerm +
      components.targetShareTerm +
      components.separationTerm,
    0.02,
    0.85,
  );

  return {
    playerId: features.playerId,
    market: "anytime_td",
    line,
    prior: round3(prior),
    components,
    n: features.nRoutes,
    confidence: features.provenance.confidence,
    calibration: "UNCALIBRATED",
    weight: 0,
  };
}

/** Provenance for a prior bundle (re-exported for the harness). */
export { filmProvenance };
