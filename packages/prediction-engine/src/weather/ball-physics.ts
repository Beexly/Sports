/**
 * Cold-weather ball physics (arXiv 2202.03034).
 *
 * Restitution coefficient epsilon(T) vs temperature, anchored at
 * regulation 12.5-13.5 psi at 70F: convert game-day temperature to a
 * pressure drop via the ideal gas law, then to a delta-epsilon, and map
 * to kickoff/punt touchback-rate and fumble adjustments. The lambda
 * parameters are fit from broadcast data: below-32F vs matched above-50F
 * games (2020-2024), producing a cold-weather ball-effects table
 * (pressure drop -> epsilon drop -> touchback/fumble adjustments).
 *
 * ACCEPTANCE GATE: ADOPT the epsilon(T) adjustment iff predicted
 * delta-epsilon explains residual touchback variance with the correct
 * sign at p < 0.05 on the 2024 holdout; either way keep the ideal-gas-law
 * pressure correction (that's just physics).
 *
 * Research-only module. Not wired into any live weather path.
 */

const PSI_REG = 13.0; // midpoint of regulation 12.5-13.5 psi
const TEMP_REG_F = 70;

function fahrenheitToRankine(f: number): number {
  return f + 459.67;
}

/**
 * Ball pressure (psi) at game-day temperature via the ideal gas law,
 * anchored at regulation pressure at 70F. Gauge pressure scales with the
 * absolute-temperature ratio (absolute pressures; atmospheric ~14.7 psi
 * cancels in the ratio to first order — we apply it to gauge directly
 * as the paper's approximation).
 */
export function pressureAtTemp(tempF: number, psiReg = PSI_REG): number {
  if (psiReg <= 0) throw new Error("pressureAtTemp: psiReg must be positive");
  return psiReg * (fahrenheitToRankine(tempF) / fahrenheitToRankine(TEMP_REG_F));
}

/** Pressure drop (psi) vs the 70F regulation anchor. */
export function pressureDrop(tempF: number, psiReg = PSI_REG): number {
  return psiReg - pressureAtTemp(tempF, psiReg);
}

/**
 * Restitution coefficient at game-day temperature. Linearized around the
 * anchor: epsilon(T) = eps0 - lambda * pressureDrop(T).
 * lambda is fit from broadcast data (below-32F vs matched above-50F).
 */
export function restitutionAtTemp(
  tempF: number,
  eps0 = 0.82,
  lambda = 0.012,
  psiReg = PSI_REG,
): number {
  if (eps0 <= 0 || eps0 >= 1) throw new Error("restitutionAtTemp: eps0 in (0,1)");
  if (lambda < 0) throw new Error("restitutionAtTemp: lambda >= 0");
  return Math.max(0.5, eps0 - lambda * pressureDrop(tempF, psiReg));
}

export interface BallEffects {
  tempF: number;
  pressurePsi: number;
  pressureDropPsi: number;
  epsilon: number;
  deltaEpsilon: number;
  /** Multiplicative touchback-rate adjustment (< 1 in the cold). */
  touchbackFactor: number;
  /** Additive fumble-rate adjustment in percentage points. */
  fumblePp: number;
}

/**
 * Cold-weather ball-effects table row: pressure drop -> epsilon drop ->
 * touchback/fumble adjustments. kappa/lambdaFumble are the fitted
 * broadcast-data parameters.
 */
export function ballEffects(
  tempF: number,
  opts: { eps0?: number; lambda?: number; kappa?: number; lambdaFumble?: number } = {},
): BallEffects {
  const { eps0 = 0.82, lambda = 0.012, kappa = 0.9, lambdaFumble = 0.35 } = opts;
  const pressurePsi = pressureAtTemp(tempF);
  const drop = pressureDrop(tempF);
  const epsilon = restitutionAtTemp(tempF, eps0, lambda);
  const deltaEpsilon = epsilon - eps0;
  // Deader ball: shorter kicks (fewer touchbacks), harder handling (more fumbles).
  const touchbackFactor = Math.max(0.5, 1 + kappa * deltaEpsilon);
  const fumblePp = Math.max(0, -lambdaFumble * deltaEpsilon * 100);
  return {
    tempF,
    pressurePsi,
    pressureDropPsi: drop,
    epsilon,
    deltaEpsilon,
    touchbackFactor,
    fumblePp,
  };
}

/**
 * Fit lambda (epsilon loss per psi) from paired cold/warm games:
 * lambda = mean(deltaEpsilon_observed / pressureDrop).
 */
export function fitLambda(
  pairs: ReadonlyArray<{ tempF: number; epsilonObserved: number }>,
  eps0 = 0.82,
): number {
  if (pairs.length === 0) throw new Error("fitLambda: no data");
  let num = 0;
  let den = 0;
  for (const p of pairs) {
    const drop = pressureDrop(p.tempF);
    if (drop <= 1e-9) continue;
    const dEps = eps0 - p.epsilonObserved;
    num += dEps * drop;
    den += drop * drop;
  }
  if (den <= 0) throw new Error("fitLambda: no cold games");
  return Math.max(0, num / den);
}
