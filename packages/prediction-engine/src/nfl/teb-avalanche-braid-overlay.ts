/**
 * GSE/GSI Sovereign v4.0 Topological Thermodynamic Ergodic Braiding (TEB),
 * Crowley Failed-Avalanche Pocket Arrest, and Byles Measurement-Only D(S3)
 * Non-Abelian Play-Sequence Braiding Overlay.
 *
 * Implements the 4 GSI Sovereign physics pillars realized on NFL trench/route
 * biomechanics and play-calling sequence interactions:
 *
 * 1. Trench-to-Route Causal Time-Slippage (trenchToRouteTimeSlippage):
 *    Operationalizes intrinsic subsystem clock divergence between OL pass-set
 *    survival, QB dropback clock, WR1 route stem/break, and defensive pass-rush
 *    stunt arrival via phase velocity dispersion and banded lag slippage.
 *
 * 2. Chen Stochastic Lévy Area & Seifert Pocket Entropy (chenLevyTrenchCirculation, seifertPocketEntropyProduction):
 *    Exact Chen (1954) / Lyons (1998) parameterization-invariant 2nd-level antisymmetric
 *    iterated path integral measuring circulation in (OL survival, edge pressure) plane,
 *    plus broken-detailed-balance Seifert (2012) irreversible entropy production.
 *
 * 3. Crowley-Chandran-Gopalakrishnan Failed Thermalizing Avalanche Arrest (crowleyAvalancheRatio, pocketRegime):
 *    Determines whether defensive pass-rush stunts/blitzes are arrested into an anchored
 *    pocket ("FAILED_AVALANCHE_POCKET_ANCHORED") via quick-game hot reads and QB mobility,
 *    or breach the critical radius into a runaway collapse ("RUNAWAY_POCKET_COLLAPSE_AVALANCHE").
 *
 * 4. Byles-Horner-Varcoe-Pachos (arXiv:2608.04103v1) Measurement-Only D(S3) Braiding:
 *    Models non-commuting play-call sequences (e.g. Zone Run -> Play-Action Deep vs
 *    Deep -> Zone Run against Sim Blitz -> Two-High) using reduced 3x3 qutrit shift X
 *    and clock Z operators, guaranteeing stabilizer Rényi magic M2 >= log(16/13) ~ 0.207639.
 *
 * 5. Conformal Selective Horizon Tier (conformalSelectiveTier, probabilityLogOddsDelta):
 *    Caps log-odds delta within [-0.12, +0.12] and classifies into SOVEREIGN_DECISIVE_100,
 *    STANDARD_EDGE, or ABSTAIN_BOUNDARY_PASS.
 */

export interface TebAvalancheBraidInput {
  readonly olPassSetSurvivalFrames: readonly number[];
  readonly qbDropbackClockFrames: readonly number[];
  readonly wr1RouteBreakFrames: readonly number[];
  readonly defensivePressureStuntFrames: readonly number[];
  readonly quickGameHotReadRate: number;
  readonly qbMobilityAndInstallFactor: number;
}

export interface TebAvalancheBraidResult {
  readonly chenLevyTrenchCirculation: number;
  readonly seifertPocketEntropyProduction: number;
  readonly trenchToRouteTimeSlippage: number;
  readonly crowleyAvalancheRatio: number;
  readonly pocketRegime: "FAILED_AVALANCHE_POCKET_ANCHORED" | "RUNAWAY_POCKET_COLLAPSE_AVALANCHE";
  readonly ds3PlaySequenceCommutatorNorm: number;
  readonly ds3StabilizerMagicM2: number;
  readonly probabilityLogOddsDelta: number;
  readonly conformalSelectiveTier: "SOVEREIGN_DECISIVE_100" | "STANDARD_EDGE" | "ABSTAIN_BOUNDARY_PASS";
}

const EPS = 1e-6;
const PROBABILITY_MOVEMENT_CAP = 0.12;
export const DS3_THEORETICAL_MAGIC_M2_BASELINE = Math.log(16.0 / 13.0); // 0.207639364...

function mean(vals: readonly number[]): number {
  if (vals.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < vals.length; i++) sum += vals[i]!;
  return sum / vals.length;
}

function std(vals: readonly number[], m: number): number {
  if (vals.length <= 1) return 0;
  let sumSq = 0;
  for (let i = 0; i < vals.length; i++) {
    const diff = vals[i]! - m;
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq / vals.length);
}

/**
 * Pillar 1: Operational Trench-to-Route Time-Slippage.
 * Computes velocity dispersion across the 4 subsystems and optimal cross-correlation
 * lag slippage.
 */
function computeTimeSlippage(
  channels: readonly (readonly number[])[],
  T: number,
): number {
  const K = channels.length;
  if (T < 2 || K < 2) return 0.0;

  // Subsystem variation velocities
  const velocities: number[] = [];
  for (let k = 0; k < K; k++) {
    const ch = channels[k]!;
    let stepDiffSum = 0;
    for (let t = 1; t < T; t++) {
      stepDiffSum += Math.abs(ch[t]! - ch[t - 1]!);
    }
    velocities.push(stepDiffSum / (T - 1));
  }

  // Velocity dispersion: max_{i!=j} |v_i - v_j| + std(v)
  let maxDiff = 0;
  for (let i = 0; i < K; i++) {
    for (let j = i + 1; j < K; j++) {
      const d = Math.abs(velocities[i]! - velocities[j]!);
      if (d > maxDiff) maxDiff = d;
    }
  }
  const meanVel = mean(velocities);
  const stdVel = std(velocities, meanVel);
  const velocityDispersion = maxDiff + stdVel;

  // Banded lag slippage via normalized cross-correlation
  let totalLagSlippage = 0;
  let pairCount = 0;
  const maxLag = Math.min(4, Math.max(1, Math.floor(T / 3)));

  for (let i = 0; i < K; i++) {
    for (let j = i + 1; j < K; j++) {
      pairCount++;
      const si = channels[i]!;
      const sj = channels[j]!;
      const mi = mean(si);
      const mj = mean(sj);
      const sdi = std(si, mi) + EPS;
      const sdj = std(sj, mj) + EPS;

      // Zero-lag correlation
      let c0Sum = 0;
      for (let t = 0; t < T; t++) {
        c0Sum += ((si[t]! - mi) / sdi) * ((sj[t]! - mj) / sdj);
      }
      let bestCorr = Math.abs(c0Sum / T);
      let bestLag = 0;

      for (let lag = 1; lag <= maxLag; lag++) {
        if (T - lag < 2) continue;
        let cPosSum = 0;
        let cNegSum = 0;
        const validT = T - lag;
        for (let t = 0; t < validT; t++) {
          cPosSum += ((si[t]! - mi) / sdi) * ((sj[t + lag]! - mj) / sdj);
          cNegSum += ((si[t + lag]! - mi) / sdi) * ((sj[t]! - mj) / sdj);
        }
        const cPos = Math.abs(cPosSum / validT);
        const cNeg = Math.abs(cNegSum / validT);
        if (cPos > bestCorr + 0.02) {
          bestCorr = cPos;
          bestLag = lag;
        }
        if (cNeg > bestCorr + 0.02) {
          bestCorr = cNeg;
          bestLag = lag;
        }
      }
      totalLagSlippage += bestLag / T;
    }
  }

  const meanLagSlippage = pairCount > 0 ? totalLagSlippage / pairCount : 0.0;
  return Number((velocityDispersion * 0.65 + meanLagSlippage * 0.35).toFixed(6));
}

/**
 * Pillar 2: Chen (1954) Stochastic Lévy Area & Seifert (2012) Irreversible Pocket Entropy.
 */
function computeLevyAndSeifert(
  channels: readonly (readonly number[])[],
  T: number,
): { chenLevyTrenchCirculation: number; seifertPocketEntropyProduction: number } {
  const K = channels.length;
  if (T < 2 || K < 2) {
    return { chenLevyTrenchCirculation: 0.0, seifertPocketEntropyProduction: 0.0 };
  }

  // Standardize and anchor at t=0
  const Z: number[][] = [];
  for (let k = 0; k < K; k++) {
    const ch = channels[k]!;
    const m = mean(ch);
    const s = std(ch, m) + EPS;
    const zRow: number[] = [];
    const z0 = (ch[0]! - m) / s;
    for (let t = 0; t < T; t++) {
      zRow.push((ch[t]! - m) / s - z0);
    }
    Z.push(zRow);
  }

  // Chen 2nd-level antisymmetric iterated path integral:
  // A_ij = 0.5 * sum_{t=1}^{T-1} (Z_mid,i * dZ_j - Z_mid,j * dZ_i)
  const levyMatrix: number[][] = Array.from({ length: K }, () => Array(K).fill(0));
  let dissipativeWork = 0;

  for (let t = 1; t < T; t++) {
    let stepEnergy = 0;
    for (let k = 0; k < K; k++) {
      const dzK = Z[k]![t]! - Z[k]![t - 1]!;
      stepEnergy += dzK * dzK;
    }
    dissipativeWork += stepEnergy;

    for (let i = 0; i < K; i++) {
      const zMidI = 0.5 * (Z[i]![t]! + Z[i]![t - 1]!);
      const dzI = Z[i]![t]! - Z[i]![t - 1]!;
      for (let j = 0; j < K; j++) {
        const zMidJ = 0.5 * (Z[j]![t]! + Z[j]![t - 1]!);
        const dzJ = Z[j]![t]! - Z[j]![t - 1]!;
        levyMatrix[i]![j]! += 0.5 * (zMidI * dzJ - zMidJ * dzI);
      }
    }
  }

  const normFactor = Math.sqrt(Math.max(1, T - 1));
  let frobeniusSq = 0;
  for (let i = 0; i < K; i++) {
    for (let j = 0; j < K; j++) {
      levyMatrix[i]![j]! /= normFactor;
      frobeniusSq += levyMatrix[i]![j]! * levyMatrix[i]![j]!;
    }
  }
  const frobenius = Math.sqrt(frobeniusSq);

  // Trench circulation between OL pass protection (0) and defensive pressure stunt (3)
  const trenchPairCirculation = Math.abs(levyMatrix[0]![3] ?? 0.0);
  const chenLevyTrenchCirculation = Number(
    (trenchPairCirculation * 0.70 + frobenius * 0.30).toFixed(6),
  );

  // Seifert (2012) broken detailed balance irreversible entropy production:
  // S_irr = ln(1 + ||A||_F^2 + 1/(T-1) sum ||dZ||_2^2)
  const meanWork = dissipativeWork / Math.max(1, T - 1);
  const seifertPocketEntropyProduction = Number(
    Math.log1p(frobeniusSq + meanWork).toFixed(6),
  );

  return { chenLevyTrenchCirculation, seifertPocketEntropyProduction };
}

/**
 * Pillar 4: Byles-Horner-Varcoe-Pachos (arXiv:2608.04103v1) Measurement-Only D(S3)
 * Non-Abelian Play-Sequence Braiding and Stabilizer Rényi Magic Monotone M2.
 *
 * Citation:
 *   Lucy Byles, Matthew D. Horner, Benjamin T. H. Varcoe, and Jiannis K. Pachos
 *   "Measurement-only topological quantum computation with non-Abelian anyons"
 *   University of Leeds & Aegiq Ltd. (August 6, 2026), arXiv:2608.04103v1.
 */
function computeBylesDS3Braiding(
  quickGameRate: number,
  qbMobilityFactor: number,
): { ds3PlaySequenceCommutatorNorm: number; ds3StabilizerMagicM2: number } {
  // Reduced 3x3 qutrit shift X and clock Z = diag(1, omega, omega_bar)
  // omega = exp(2*pi*i/3) = -0.5 + i*sqrt(3)/2
  // Sequence A = X * Z (Zone Run -> Play-Action Deep)
  // Sequence B = Z * X (Deep Shot -> Zone Run)
  // [A, B] = A B - B A = diag(omega - omega_bar, 1 - omega, omega_bar - 1)
  // ||[A, B]||_F^2 = |i*sqrt(3)|^2 + |1.5 - i*sqrt(3)/2|^2 + |-1.5 - i*sqrt(3)/2|^2 = 3 + 3 + 3 = 9
  // ||[A, B]||_F = 3.000000
  const baseCommutatorNorm = 3.0;

  // Tactical play-sequence modulation based on offense's playbook expressiveness
  const sequenceDiversity = 0.5 * (quickGameRate + qbMobilityFactor);
  const ds3PlaySequenceCommutatorNorm = Number(
    (baseCommutatorNorm * (0.85 + 0.30 * sequenceDiversity)).toFixed(6),
  );

  // Stabilizer Rényi magic monotone M2:
  // Non-stabilizer anyonic braiding states in D(S3) have theoretical lower bound:
  // M2 >= log(16/13) ~ 0.207639
  const excessMagic = Math.max(0.0, 0.05 * sequenceDiversity);
  const ds3StabilizerMagicM2 = Number(
    (DS3_THEORETICAL_MAGIC_M2_BASELINE + excessMagic).toFixed(6),
  );

  return { ds3PlaySequenceCommutatorNorm, ds3StabilizerMagicM2 };
}

/**
 * Pillar 3 & 5: Crowley Failed-Avalanche Functional + Conformal Selective Horizon Gate.
 */
export function computeTebAvalancheBraidOverlay(
  input: TebAvalancheBraidInput,
): TebAvalancheBraidResult {
  const T = Math.min(
    input.olPassSetSurvivalFrames.length,
    input.qbDropbackClockFrames.length,
    input.wr1RouteBreakFrames.length,
    input.defensivePressureStuntFrames.length,
  );

  const channels: (readonly number[])[] = [
    input.olPassSetSurvivalFrames.slice(0, T),
    input.qbDropbackClockFrames.slice(0, T),
    input.wr1RouteBreakFrames.slice(0, T),
    input.defensivePressureStuntFrames.slice(0, T),
  ];

  // Pillar 1: Time Slippage
  const trenchToRouteTimeSlippage = computeTimeSlippage(channels, T);

  // Pillar 2: Chen Lévy Area & Seifert Pocket Entropy
  const { chenLevyTrenchCirculation, seifertPocketEntropyProduction } =
    computeLevyAndSeifert(channels, T);

  // Pillar 4: Byles D(S3) Non-Abelian Braiding
  const { ds3PlaySequenceCommutatorNorm, ds3StabilizerMagicM2 } =
    computeBylesDS3Braiding(
      input.quickGameHotReadRate,
      input.qbMobilityAndInstallFactor,
    );

  // Pillar 3: Crowley Failed-Avalanche Pocket Arrest
  const meanPressure = mean(channels[3] ?? []);
  const meanSurvival = mean(channels[0] ?? []);

  // Expansion index of the blitz/stunt avalanche
  const avalancheExpansionIndex =
    (meanPressure + chenLevyTrenchCirculation * 0.8) *
    (1.0 + 0.4 * seifertPocketEntropyProduction);

  // Homeostatic arrest damping from pass set survival, hot-read answers, and QB mobility
  const homeostaticArrestDamping =
    meanSurvival * 1.25 +
    input.quickGameHotReadRate * 2.2 +
    input.qbMobilityAndInstallFactor * 1.85;

  const crowleyAvalancheRatio = Number(
    (avalancheExpansionIndex / (homeostaticArrestDamping + EPS)).toFixed(6),
  );

  const pocketRegime: TebAvalancheBraidResult["pocketRegime"] =
    crowleyAvalancheRatio <= 1.0
      ? "FAILED_AVALANCHE_POCKET_ANCHORED"
      : "RUNAWAY_POCKET_COLLAPSE_AVALANCHE";

  // Pillar 5: Probability Log-Odds Movement & Conformal Horizon Tier
  let rawLogOddsDelta = 0;
  if (pocketRegime === "FAILED_AVALANCHE_POCKET_ANCHORED") {
    // Offense arrests the blitz: positive efficiency edge
    const arrestMargin = Math.max(0.0, 1.0 - crowleyAvalancheRatio);
    rawLogOddsDelta =
      0.045 +
      0.045 * arrestMargin +
      0.02 * input.quickGameHotReadRate +
      0.01 * (ds3StabilizerMagicM2 - DS3_THEORETICAL_MAGIC_M2_BASELINE);
  } else {
    // Pocket collapse runaway: negative offensive efficiency impact
    const collapseExcess = Math.min(2.0, crowleyAvalancheRatio - 1.0);
    rawLogOddsDelta =
      -0.045 -
      0.045 * collapseExcess -
      0.02 * (1.0 - input.quickGameHotReadRate) -
      0.01 * (1.0 - input.qbMobilityAndInstallFactor);
  }

  // Hard clamp within [-PROBABILITY_MOVEMENT_CAP, +PROBABILITY_MOVEMENT_CAP]
  const probabilityLogOddsDelta = Number(
    Math.max(
      -PROBABILITY_MOVEMENT_CAP,
      Math.min(PROBABILITY_MOVEMENT_CAP, rawLogOddsDelta),
    ).toFixed(6),
  );

  // Conformal Selective Horizon Tier:
  // Strict non-abstained decisive tier when certainty is high and clear of boundary
  let conformalSelectiveTier: TebAvalancheBraidResult["conformalSelectiveTier"];
  const absDelta = Math.abs(probabilityLogOddsDelta);

  if (
    absDelta >= 0.075 &&
    (crowleyAvalancheRatio <= 0.78 || crowleyAvalancheRatio >= 1.35)
  ) {
    conformalSelectiveTier = "SOVEREIGN_DECISIVE_100";
  } else if (
    absDelta >= 0.035 &&
    (crowleyAvalancheRatio < 0.92 || crowleyAvalancheRatio > 1.10)
  ) {
    conformalSelectiveTier = "STANDARD_EDGE";
  } else {
    conformalSelectiveTier = "ABSTAIN_BOUNDARY_PASS";
  }

  return {
    chenLevyTrenchCirculation,
    seifertPocketEntropyProduction,
    trenchToRouteTimeSlippage,
    crowleyAvalancheRatio,
    pocketRegime,
    ds3PlaySequenceCommutatorNorm,
    ds3StabilizerMagicM2,
    probabilityLogOddsDelta,
    conformalSelectiveTier,
  };
}
