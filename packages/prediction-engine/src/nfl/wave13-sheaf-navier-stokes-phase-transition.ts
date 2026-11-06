/**
 * Workstream 3 — Wave 13 Cellular Sheaf CRC, Navier–Stokes Laboratory Phase Resultant,
 * Theorem 9 Spin-Glass Cavity Susceptibility, Theorem 12 Mahler-Dual Conformal Score,
 * Padé [3/3] & [4/4] Rational Approximants, and Shin Closed-Form De-Vigging
 * (`packages/prediction-engine/src/nfl/wave13-sheaf-navier-stokes-phase-transition.ts`)
 *
 * Parity with Python modules:
 *   - `intelligence/sheaf_integrity/` (`Beexly/Project-Tree` Certified Repair Class `CRC`)
 *   - `intelligence/math/universal_phase_transition_theorems_1_to_12.py`
 *   - `scripts/ops/gse_connected_game_workflow.py`
 */

export type CertifiedRepairClass = "CRC_CLEAN_GLOBAL_SECTION" | "CRC_BOUNDED_HARMONIC_REPAIR" | "CRC_COHOMOLOGY_OBSTRUCTION_VETO";

export interface CellularSheafIntegrityResult {
  readonly dirichletEnergy: number;
  readonly coboundaryNorm: number;
  readonly harmonicSectionMean: number;
  readonly cohomologyDefectRatio: number;
  readonly certifiedRepairClass: CertifiedRepairClass;
  readonly repairedStalkVector: readonly number[];
}

export interface NavierStokesPhaseResult {
  readonly kuramotoPhaseResultantR: number;
  readonly bkmVorticityIntegral: number;
  readonly constantinFeffermanDirectionCurvature: number;
  readonly houLi36thOrderFilterAttenuation: number;
  readonly blowupRegularitySafe: boolean;
}

export interface Theorem9SpinGlassCavityResult {
  readonly edwardsAndersonOverlapQ: number;
  readonly spinGlassSusceptibilityChiSG: number;
  readonly deAlmeidaThoulessEigenvalue: number;
  readonly replicaSymmetryBreaking1RSB: boolean;
}

export interface Theorem12MahlerDualConformalResult {
  readonly mahlerDualNormScore: number;
  readonly blaschkeSantaloVolumeRatio: number;
  readonly conformalRadiusMultiplier: number;
}

export interface PadeRationalApproximantResult {
  readonly zInput: number;
  readonly pade33Value: number;
  readonly pade44Value: number;
  readonly rationalConvergenceResidual: number;
}

export interface ShinDevigResult {
  readonly impliedProbs: readonly number[];
  readonly overroundBooksum: number;
  readonly insiderFractionZ: number;
  readonly fairProbs: readonly number[];
}

export interface Wave13EvaluationInput {
  readonly stalkObservations: readonly number[];
  readonly restrictionWeights?: readonly number[];
  readonly oscillatorPhasesRad: readonly number[];
  readonly vorticitySnapSeries: readonly number[];
  readonly directionAngleSeriesRad: readonly number[];
  readonly spinGlassCouplingJ?: number;
  readonly inverseTemperatureBeta?: number;
  readonly residualVector: readonly number[];
  readonly covarianceDiagonal: readonly number[];
  readonly padeArgumentZ: number;
  readonly marketImpliedProbs: readonly number[];
}

export interface Wave13EvaluationReceipt {
  readonly sheafIntegrity: CellularSheafIntegrityResult;
  readonly navierStokes: NavierStokesPhaseResult;
  readonly theorem9SpinGlass: Theorem9SpinGlassCavityResult;
  readonly theorem12MahlerDual: Theorem12MahlerDualConformalResult;
  readonly padeApproximants: PadeRationalApproximantResult;
  readonly shinDevig: ShinDevigResult;
  readonly wave13LogOddsModulation: number;
  readonly wave13PublishGatePassed: boolean;
}

/**
 * 1. Beexly/Project-Tree Cellular Sheaf Integrity & Certified Repair Class (CRC):
 *    Evaluates sheaf coboundary delta(x), Dirichlet energy x^T L_F x, and Hodge harmonic projection.
 */
export function computeCellularSheafIntegrityCRC(
  stalkValues: readonly number[],
  restrictionWeights?: readonly number[],
  alphaStep = 0.35,
): CellularSheafIntegrityResult {
  const n = stalkValues.length;
  if (n === 0) {
    return {
      dirichletEnergy: 0,
      coboundaryNorm: 0,
      harmonicSectionMean: 0,
      cohomologyDefectRatio: 0,
      certifiedRepairClass: "CRC_CLEAN_GLOBAL_SECTION",
      repairedStalkVector: [],
    };
  }
  const weights =
    restrictionWeights && restrictionWeights.length >= n
      ? restrictionWeights
      : stalkValues.map(() => 1.0);

  let energy = 0;
  const laplacianAction = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const wij = 0.5 * (weights[i]! + weights[j]!) / n;
      const diff = stalkValues[i]! - stalkValues[j]!;
      energy += wij * diff * diff;
      laplacianAction[i] = laplacianAction[i]! + wij * diff;
      laplacianAction[j] = laplacianAction[j]! - wij * diff;
    }
  }
  const coboundaryNorm = Math.sqrt(Math.max(0, 2 * energy));
  const signalNormSq = stalkValues.reduce((acc, v) => acc + v * v, 0) + 1e-9;
  const defectRatio = energy / signalNormSq;

  // One-step sheaf diffusion harmonic repair: x_rep = (I - alpha * L_F) x
  const repaired = stalkValues.map((v, i) =>
    Number((v - alphaStep * laplacianAction[i]!).toFixed(6)),
  );
  const harmonicMean = repaired.reduce((a, b) => a + b, 0) / n;

  let crc: CertifiedRepairClass = "CRC_CLEAN_GLOBAL_SECTION";
  if (defectRatio > 0.45) {
    crc = "CRC_COHOMOLOGY_OBSTRUCTION_VETO";
  } else if (defectRatio > 0.08) {
    crc = "CRC_BOUNDED_HARMONIC_REPAIR";
  }

  return {
    dirichletEnergy: Number(energy.toFixed(6)),
    coboundaryNorm: Number(coboundaryNorm.toFixed(6)),
    harmonicSectionMean: Number(harmonicMean.toFixed(6)),
    cohomologyDefectRatio: Number(defectRatio.toFixed(6)),
    certifiedRepairClass: crc,
    repairedStalkVector: repaired,
  };
}

/**
 * 2. Navier–Stokes Laboratory Phase Resultant R, Beale–Kato–Majda (BKM) vorticity integral,
 *    Constantin–Fefferman vorticity direction Lipschitz curvature, and Hou–Li 36th-order filter.
 */
export function computeNavierStokesPhaseResultantAndBkm(
  phasesRad: readonly number[],
  vorticitySeries: readonly number[],
  directionAnglesRad: readonly number[],
  normalizedWavenumberXi = 0.72,
): NavierStokesPhaseResult {
  const kCount = Math.max(1, phasesRad.length);
  let sumCos = 0;
  let sumSin = 0;
  for (const theta of phasesRad) {
    sumCos += Math.cos(theta);
    sumSin += Math.sin(theta);
  }
  const resultantR = Math.sqrt(sumCos * sumCos + sumSin * sumSin) / kCount;

  // Beale-Kato-Majda (BKM) integral: sum_t ||omega(t)||_{L^inf} * dt
  const dt = 1 / Math.max(1, vorticitySeries.length);
  const bkmIntegral = vorticitySeries.reduce((acc, w) => acc + Math.abs(w) * dt, 0);

  // Constantin-Fefferman direction curvature ||grad xi|| across consecutive snaps
  let dirCurvature = 0;
  for (let i = 1; i < directionAnglesRad.length; i += 1) {
    const dTheta = Math.abs(directionAnglesRad[i]! - directionAnglesRad[i - 1]!);
    const wrapped = Math.min(dTheta, Math.abs(2 * Math.PI - dTheta));
    dirCurvature += wrapped;
  }
  if (directionAnglesRad.length > 1) {
    dirCurvature /= directionAnglesRad.length - 1;
  }

  // Hou-Li 36th-order spectral filter: sigma(xi) = exp(-36 * |xi|^36)
  const xiClamped = Math.max(0, Math.min(1, Math.abs(normalizedWavenumberXi)));
  const houLiFilter = Math.exp(-36 * Math.pow(xiClamped, 36));
  const regularitySafe = bkmIntegral < 4.5 && dirCurvature < 1.85;

  return {
    kuramotoPhaseResultantR: Number(resultantR.toFixed(6)),
    bkmVorticityIntegral: Number(bkmIntegral.toFixed(6)),
    constantinFeffermanDirectionCurvature: Number(dirCurvature.toFixed(6)),
    houLi36thOrderFilterAttenuation: Number(houLiFilter.toFixed(6)),
    blowupRegularitySafe: regularitySafe,
  };
}

/**
 * 3. Theorem 9: 1-RSB Mezard–Parisi Spin-Glass Cavity Susceptibility chi_SG.
 *    chi_SG = 1 / (1 - beta^2 * J^2 * (1 - q_EA)^2).
 */
export function computeTheorem9SpinGlassCavitySusceptibility(
  localMagnetizations: readonly number[],
  couplingJ = 0.32,
  inverseTempBeta = 1.2,
): Theorem9SpinGlassCavityResult {
  const n = Math.max(1, localMagnetizations.length);
  const qEA =
    localMagnetizations.reduce((acc, m) => acc + Math.tanh(m) ** 2, 0) / n;
  const atParam = (inverseTempBeta * couplingJ * (1 - qEA)) ** 2;
  const denom = Math.max(0.05, 1 - atParam);
  const chiSG = 1 / denom;

  return {
    edwardsAndersonOverlapQ: Number(qEA.toFixed(6)),
    spinGlassSusceptibilityChiSG: Number(chiSG.toFixed(6)),
    deAlmeidaThoulessEigenvalue: Number((1 - atParam).toFixed(6)),
    replicaSymmetryBreaking1RSB: atParam >= 0.85,
  };
}

/**
 * 4. Theorem 12: Mahler-Dual Polarity Volume Product & Conformal Score s_Mahler.
 *    Evaluates the dual norm ||r||_{K^o} = sqrt(r^T Sigma^-1 r) and Santalo-bound multiplier.
 */
export function computeTheorem12MahlerDualConformalScore(
  residualVector: readonly number[],
  covarianceDiagonal: readonly number[],
): Theorem12MahlerDualConformalResult {
  const d = Math.min(residualVector.length, covarianceDiagonal.length);
  if (d === 0) {
    return {
      mahlerDualNormScore: 0,
      blaschkeSantaloVolumeRatio: 1,
      conformalRadiusMultiplier: 1,
    };
  }
  let dualSq = 0;
  let logDet = 0;
  for (let i = 0; i < d; i += 1) {
    const varI = Math.max(1e-6, covarianceDiagonal[i]!);
    dualSq += (residualVector[i]! * residualVector[i]!) / varI;
    logDet += Math.log(varI);
  }
  const sMahler = Math.sqrt(dualSq / d);
  // Normalized Blaschke-Santalo / Bourgain-Milman polarity stability ratio
  const volRatio = Math.exp(-Math.abs(logDet) / (2 * d));
  const radiusMult = Math.max(0.8, Math.min(1.35, 1 + 0.12 * (sMahler - 1)));

  return {
    mahlerDualNormScore: Number(sMahler.toFixed(6)),
    blaschkeSantaloVolumeRatio: Number(volRatio.toFixed(6)),
    conformalRadiusMultiplier: Number(radiusMult.toFixed(6)),
  };
}

/**
 * 5a. Padé [3/3] rational approximant to exp(-z):
 *     R_{3,3}(z) = (120 - 60z + 12z^2 - z^3) / (120 + 60z + 12z^2 + z^3).
 */
export function computePade33Approximant(z: number): number {
  const zClamped = Math.max(-4, Math.min(4, z));
  const z2 = zClamped * zClamped;
  const z3 = z2 * zClamped;
  const num = 120 - 60 * zClamped + 12 * z2 - z3;
  const den = 120 + 60 * zClamped + 12 * z2 + z3;
  return den !== 0 ? num / den : 1;
}

/**
 * 5b. Padé [4/4] rational approximant to exp(-z):
 *     R_{4,4}(z) = (1680 - 840z + 180z^2 - 20z^3 + z^4) / (1680 + 840z + 180z^2 + 20z^3 + z^4).
 */
export function computePade44Approximant(z: number): number {
  const zClamped = Math.max(-4, Math.min(4, z));
  const z2 = zClamped * zClamped;
  const z3 = z2 * zClamped;
  const z4 = z2 * z2;
  const num = 1680 - 840 * zClamped + 180 * z2 - 20 * z3 + z4;
  const den = 1680 + 840 * zClamped + 180 * z2 + 20 * z3 + z4;
  return den !== 0 ? num / den : 1;
}

/**
 * 6. Shin (1993) Closed-Form De-Vigging:
 *    Solves for insider-trading proportion z and exact fair probabilities p_i:
 *    p_i(z) = (sqrt(z^2 + 4*(1 - z)*q_i^2 / S) - z) / (2*(1 - z)).
 */
export function computeShinClosedFormDevig(impliedProbs: readonly number[]): ShinDevigResult {
  if (impliedProbs.length === 0) {
    return {
      impliedProbs: [],
      overroundBooksum: 1,
      insiderFractionZ: 0,
      fairProbs: [],
    };
  }
  const clean = impliedProbs.map((q) => Math.max(1e-6, q));
  const booksum = clean.reduce((a, b) => a + b, 0);
  if (booksum <= 1.000001 || clean.length < 2) {
    const norm = clean.map((q) => Number((q / booksum).toFixed(6)));
    return {
      impliedProbs: clean,
      overroundBooksum: Number(booksum.toFixed(6)),
      insiderFractionZ: 0,
      fairProbs: norm,
    };
  }

  const evalFair = (z: number): number[] =>
    clean.map((qi) => {
      const term = Math.sqrt(z * z + (4 * (1 - z) * qi * qi) / booksum);
      return (term - z) / (2 * (1 - z));
    });

  let lo = 0.0;
  let hi = 0.45;
  for (let iter = 0; iter < 32; iter += 1) {
    const mid = 0.5 * (lo + hi);
    const sumP = evalFair(mid).reduce((a, b) => a + b, 0);
    if (sumP > 1.0) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const zStar = 0.5 * (lo + hi);
  const rawFair = evalFair(zStar);
  const sumFair = rawFair.reduce((a, b) => a + b, 0);
  const fairProbs = rawFair.map((p) => Number((p / sumFair).toFixed(6)));

  return {
    impliedProbs: clean.map((q) => Number(q.toFixed(6))),
    overroundBooksum: Number(booksum.toFixed(6)),
    insiderFractionZ: Number(zStar.toFixed(6)),
    fairProbs,
  };
}

/**
 * Master Wave 13 evaluator combining Cellular Sheaf CRC, Navier–Stokes Phase Resultant + BKM,
 * Theorem 9 Spin-Glass Cavity Susceptibility, Theorem 12 Mahler-Dual Conformal Score,
 * Padé [3/3] & [4/4] Rational Approximants, and Shin Closed-Form De-Vigging.
 */
export function evaluateWave13SheafNavierStokesPhaseTransition(
  input: Wave13EvaluationInput,
): Wave13EvaluationReceipt {
  const sheafIntegrity = computeCellularSheafIntegrityCRC(
    input.stalkObservations,
    input.restrictionWeights,
  );
  const navierStokes = computeNavierStokesPhaseResultantAndBkm(
    input.oscillatorPhasesRad,
    input.vorticitySnapSeries,
    input.directionAngleSeriesRad,
  );
  const theorem9SpinGlass = computeTheorem9SpinGlassCavitySusceptibility(
    sheafIntegrity.repairedStalkVector,
    input.spinGlassCouplingJ ?? 0.32,
    input.inverseTemperatureBeta ?? 1.2,
  );
  const theorem12MahlerDual = computeTheorem12MahlerDualConformalScore(
    input.residualVector,
    input.covarianceDiagonal,
  );
  const p33 = computePade33Approximant(input.padeArgumentZ);
  const p44 = computePade44Approximant(input.padeArgumentZ);
  const padeApproximants: PadeRationalApproximantResult = {
    zInput: input.padeArgumentZ,
    pade33Value: Number(p33.toFixed(6)),
    pade44Value: Number(p44.toFixed(6)),
    rationalConvergenceResidual: Number(Math.abs(p44 - p33).toFixed(8)),
  };
  const shinDevig = computeShinClosedFormDevig(input.marketImpliedProbs);

  const rawModulation =
    sheafIntegrity.harmonicSectionMean *
      navierStokes.kuramotoPhaseResultantR *
      (1 / Math.sqrt(theorem9SpinGlass.spinGlassSusceptibilityChiSG)) *
      p44;
  const wave13LogOddsModulation = Number(
    Math.max(-0.08, Math.min(0.08, rawModulation)).toFixed(6),
  );
  const wave13PublishGatePassed =
    sheafIntegrity.certifiedRepairClass !== "CRC_COHOMOLOGY_OBSTRUCTION_VETO" &&
    navierStokes.blowupRegularitySafe;

  return {
    sheafIntegrity,
    navierStokes,
    theorem9SpinGlass,
    theorem12MahlerDual,
    padeApproximants,
    shinDevig,
    wave13LogOddsModulation,
    wave13PublishGatePassed,
  };
}
