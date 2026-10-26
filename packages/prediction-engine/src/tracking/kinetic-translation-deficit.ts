/**
 * BDB 2027 Combine-to-NFL Kinematic Translation & Pass-Block Uncertainty
 *
 * - kineticTranslationDeficit: MIT formula from usufalbaz/nfl-big-data-bowl-2027-ktd
 * - relativeMirrorRecovery, shrinkPassBlockPressureRate, minDetectablePassBlockSnaps:
 *   MIT formulas from Hermes-25/nfl-bdb-2027-mirror-recovery (LICENSES.md)
 */

export const KTD_SEPARATION_EPS = 0.01;
export const RMR_RECOVERY_EPS_SEC = 0.05;
export const OL_PRESSURE_PRIOR_MEAN = 0.068;
export const OL_PRESSURE_PRIOR_KAPPA = 150;

export function kineticTranslationDeficit(
  sMax: number,
  sCut: number,
  meanSeparationYards: number,
): number | null {
  const values = [sMax, sCut, meanSeparationYards];
  if (values.some((v) => !Number.isFinite(v) || v < 0)) return null;
  const denom = meanSeparationYards + KTD_SEPARATION_EPS;
  if (denom === 0) return null;
  return (sMax - sCut) / denom;
}

/**
 * Relative Mirror Recovery (RMR) for offensive line Combine mirror drill.
 * RMR = (vPost / vPre) / (tauRecoverySec + 0.05)
 */
export function relativeMirrorRecovery(
  vPreMps: number,
  vPostMps: number,
  tauRecoverySec: number,
): number | null {
  const values = [vPreMps, vPostMps, tauRecoverySec];
  if (values.some((v) => !Number.isFinite(v) || v < 0) || vPreMps <= 0) {
    return null;
  }
  const denom = tauRecoverySec + RMR_RECOVERY_EPS_SEC;
  if (denom <= 0) return null;
  return (vPostMps / vPreMps) / denom;
}

export interface ShrunkPressureRate {
  rawRate: number;
  ebRate: number;
  standardError: number;
  shrinkageWeight: number;
}

/**
 * Count-aware Empirical Bayes Beta-Binomial shrinkage for rookie OL pressure rate.
 * Prevents small-sample (<150 snaps) over-interpretation.
 */
export function shrinkPassBlockPressureRate(
  pressuresAllowed: number,
  passBlockSnaps: number,
  priorMean: number = OL_PRESSURE_PRIOR_MEAN,
  priorKappa: number = OL_PRESSURE_PRIOR_KAPPA,
): ShrunkPressureRate | null {
  if (
    !Number.isFinite(pressuresAllowed) ||
    !Number.isFinite(passBlockSnaps) ||
    !Number.isFinite(priorMean) ||
    !Number.isFinite(priorKappa) ||
    pressuresAllowed < 0 ||
    passBlockSnaps <= 0 ||
    pressuresAllowed > passBlockSnaps ||
    priorMean <= 0 ||
    priorMean >= 1 ||
    priorKappa <= 0
  ) {
    return null;
  }
  const rawRate = pressuresAllowed / passBlockSnaps;
  const totalEffective = passBlockSnaps + priorKappa;
  const ebRate = (pressuresAllowed + priorKappa * priorMean) / totalEffective;
  const standardError = Math.sqrt((ebRate * (1 - ebRate)) / (totalEffective + 1));
  const shrinkageWeight = passBlockSnaps / totalEffective;
  return {
    rawRate,
    ebRate,
    standardError,
    shrinkageWeight,
  };
}

/**
 * Minimum pass-block snaps required to detect a pressure-rate delta (deltaP)
 * at two-sided alpha=0.05 (z=1.959964) and power=0.80 (z=0.841621).
 */
export function minDetectablePassBlockSnaps(
  deltaP: number,
  priorMean: number = OL_PRESSURE_PRIOR_MEAN,
  zAlphaHalf: number = 1.959964,
  zBeta: number = 0.841621,
): number | null {
  if (
    !Number.isFinite(deltaP) ||
    !Number.isFinite(priorMean) ||
    deltaP <= 0 ||
    deltaP >= 1 ||
    priorMean <= 0 ||
    priorMean >= 1
  ) {
    return null;
  }
  const zSum = zAlphaHalf + zBeta;
  return Math.ceil((zSum * zSum * priorMean * (1 - priorMean)) / (deltaP * deltaP));
}
