/**
 * IG Consolidated Conformal, Kats & Fleet Systems Signals
 * ========================================================
 * Implements deferred items from the consolidated research archive
 * (`docs/data-sources/research/2026-10-29/INSTAGRAM-ALL-SWEEPS-CONSOLIDATED.md`):
 *
 * 1. Stream B Seq 7291: Conformal Selective Abstention with Equalized Group Coverage
 *    (Romano et al. arXiv:1908.05428, SCoRE arXiv:2603.24704, SASF arXiv:2610.08322, CROS arXiv:2609.09678)
 * 2. Borghesi Weather Non-Linearity + Rosen QB Backup Transition Model
 *    (Borghesi 2007/2008 wind/cold non-linearity, Rosen 2026 QB starter-to-backup decay,
 *     Lopez & Bliss 2024 post-2011 bye advantage, Nichols 2014 West-to-East travel penalty)
 * 3. Stream D: Kats CUSUM Change-Point Detector & Harmonic Diurnal Steam Regime
 *    (facebookresearch/Kats CUSUM test statistic + 24h harmonic diurnal amplitude)
 * 4. Stream E1: Laya/OpenJev Gate Evaluation Harness
 *    (Pre-registered §5.1/§5.2 holdout evaluation bar + <= 700 token state truncation canary)
 */

export interface ConformalSelectiveAbstentionInput {
  calibratedProb: number;
  nonconformityQuantileQHat: number;
  groupType: "FAVORITE" | "UNDERDOG";
  groupEmpiricalCoverage: number;
  targetCoverageAlpha?: number;
}

export interface ConformalSelectiveAbstentionResult {
  lowerProb: number;
  upperProb: number;
  straddlesFiftyPct: boolean;
  equalizedCoverageGap: number;
  verdict: "ABSTAIN_CONFORMAL" | "COMMIT";
}

/**
 * Evaluates whether to commit to a pick or selectively abstain based on conformal
 * prediction intervals and group-equalized coverage (Favorite vs Underdog).
 */
export function evaluateConformalSelectiveAbstention(
  input: ConformalSelectiveAbstentionInput
): ConformalSelectiveAbstentionResult {
  const alpha = input.targetCoverageAlpha ?? 0.10;
  const targetCoverage = 1 - alpha;

  const lowerProb = Math.max(
    0,
    Number((input.calibratedProb - input.nonconformityQuantileQHat).toFixed(4))
  );
  const upperProb = Math.min(
    1,
    Number((input.calibratedProb + input.nonconformityQuantileQHat).toFixed(4))
  );

  const straddlesFiftyPct = lowerProb < 0.50 && upperProb > 0.50;
  const equalizedCoverageGap = Number(
    Math.abs(input.groupEmpiricalCoverage - targetCoverage).toFixed(4)
  );

  const verdict: "ABSTAIN_CONFORMAL" | "COMMIT" =
    straddlesFiftyPct || equalizedCoverageGap > 0.05
      ? "ABSTAIN_CONFORMAL"
      : "COMMIT";

  return {
    lowerProb,
    upperProb,
    straddlesFiftyPct,
    equalizedCoverageGap,
    verdict,
  };
}

export interface BorghesiWeatherAndRosenQbInput {
  windMph: number;
  tempF: number;
  isPrecipitation: boolean;
  isIndoor: boolean;
  qbStarterOut: boolean;
  backupPriorStartsThisSeason: number;
  hasPost2011ByeRestAdvantage: boolean;
  isWestToEastEarlyKickoff: boolean;
}

export interface BorghesiWeatherAndRosenQbResult {
  borghesiTotalDelta: number;
  rosenQbSpreadDelta: number;
  lopezByeSpreadDelta: number;
  nicholsTravelSpreadDelta: number;
  netSpreadAdjustmentPts: number;
}

/**
 * Computes non-linear weather total adjustments (Borghesi 2007/2008) and
 * structural spread adjustments including QB backup transition with exponential start decay
 * (Rosen 2026), post-2011 CBA bye advantage (Lopez & Bliss 2024), and West-to-East kickoff travel (Nichols 2014).
 */
export function computeBorghesiWeatherAndRosenQbBackupTransition(
  input: BorghesiWeatherAndRosenQbInput
): BorghesiWeatherAndRosenQbResult {
  const borghesiTotalDelta = input.isIndoor
    ? 0
    : (input.windMph > 20 ? -2.8 : input.windMph > 15 ? -1.9 : 0) +
      (input.tempF < 32 && input.isPrecipitation ? -1.1 : 0);

  const rosenQbSpreadDelta = !input.qbStarterOut
    ? 0
    : Number(
        (
          -5.4 *
          Math.exp(-0.22 * Math.max(0, input.backupPriorStartsThisSeason))
        ).toFixed(2)
      );

  const lopezByeSpreadDelta = input.hasPost2011ByeRestAdvantage ? 0.15 : 0;
  const nicholsTravelSpreadDelta = input.isWestToEastEarlyKickoff ? -0.45 : 0;

  const netSpreadAdjustmentPts = Number(
    (
      rosenQbSpreadDelta +
      lopezByeSpreadDelta +
      nicholsTravelSpreadDelta
    ).toFixed(2)
  );

  return {
    borghesiTotalDelta: Number(borghesiTotalDelta.toFixed(2)),
    rosenQbSpreadDelta,
    lopezByeSpreadDelta,
    nicholsTravelSpreadDelta,
    netSpreadAdjustmentPts,
  };
}

export interface KatsMarketCusumInput {
  lineSeries: readonly number[];
  timestampsHoursBeforeKickoff: readonly number[];
}

export interface KatsMarketCusumResult {
  cusumMaxAbs: number;
  changePointDetected: boolean;
  netLineSteamDelta: number;
  regimeTag: "SHARP_STEAM_BREAK" | "STATIONARY_NOISE";
  harmonicDiurnalAmplitude?: number;
}

/**
 * Detects structural change-points and harmonic diurnal patterns in market line movements
 * using facebookresearch/Kats CUSUM formulation and diurnal Fourier harmonic regression.
 */
export function detectKatsMarketCusumAndHarmonicRegime(
  input: KatsMarketCusumInput
): KatsMarketCusumResult {
  const n = input.lineSeries.length;
  if (n < 2) {
    return {
      cusumMaxAbs: 0,
      changePointDetected: false,
      netLineSteamDelta: 0,
      regimeTag: "STATIONARY_NOISE",
      harmonicDiurnalAmplitude: 0,
    };
  }

  const mean = input.lineSeries.reduce((acc, val) => acc + val, 0) / n;
  const variance =
    input.lineSeries.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
  const std = Math.sqrt(variance);

  let cusumMaxAbs = 0;
  if (std > 1e-9) {
    let runningSum = 0;
    for (let i = 0; i < n; i++) {
      const val = input.lineSeries[i] ?? mean;
      runningSum += val - mean;
      const stat = Math.abs(runningSum) / (std * Math.sqrt(n));
      if (stat > cusumMaxAbs) {
        cusumMaxAbs = stat;
      }
    }
  }

  const changePointDetected = cusumMaxAbs >= 1.25;
  const netLineSteamDelta = Number(
    (
      (input.lineSeries[input.lineSeries.length - 1] ?? 0) -
      (input.lineSeries[0] ?? 0)
    ).toFixed(2)
  );

  const regimeTag: "SHARP_STEAM_BREAK" | "STATIONARY_NOISE" = changePointDetected
    ? "SHARP_STEAM_BREAK"
    : "STATIONARY_NOISE";

  // Harmonic diurnal amplitude (24-hour cycle)
  let harmonicDiurnalAmplitude = 0;
  const m = Math.min(n, input.timestampsHoursBeforeKickoff.length);
  if (m >= 2) {
    const omega = Math.PI / 12; // 2 * PI / 24 hours
    let cosSum = 0;
    let sinSum = 0;
    for (let i = 0; i < m; i++) {
      const t = input.timestampsHoursBeforeKickoff[i] ?? 0;
      const val = input.lineSeries[i] ?? mean;
      const residual = val - mean;
      cosSum += residual * Math.cos(omega * t);
      sinSum += residual * Math.sin(omega * t);
    }
    const a = (2 / m) * cosSum;
    const b = (2 / m) * sinSum;
    harmonicDiurnalAmplitude = Number(Math.sqrt(a * a + b * b).toFixed(3));
  }

  return {
    cusumMaxAbs: Number(cusumMaxAbs.toFixed(3)),
    changePointDetected,
    netLineSteamDelta,
    regimeTag,
    harmonicDiurnalAmplitude,
  };
}

export interface LayaGateHoldoutInput {
  statePromptTokens: number;
  ece: number;
  brier: number;
  auc: number;
  beatCloseRate: number;
  abstentionLiftPp: number;
}

export interface LayaGateHoldoutResult {
  truncationCanaryPassed: boolean;
  metricsPassed: boolean;
  promotionVerdict: "PROMOTE_LAYA_GATE" | "HOLD_SHADOW_ONLY";
}

/**
 * Evaluates the Laya / OpenJev gate model on settled holdout data against the pre-registered
 * Section 5.1/5.2 thresholds and verifies the strict <= 700 token state prompt truncation canary.
 */
export function evaluateLayaGateOnSettledHoldout(
  input: LayaGateHoldoutInput
): LayaGateHoldoutResult {
  const truncationCanaryPassed = input.statePromptTokens <= 700;

  const metricsPassed =
    input.ece <= 0.07 &&
    input.brier <= 0.24 &&
    input.auc >= 0.58 &&
    input.beatCloseRate >= 0.524 &&
    input.abstentionLiftPp > 0;

  const promotionVerdict: "PROMOTE_LAYA_GATE" | "HOLD_SHADOW_ONLY" =
    truncationCanaryPassed && metricsPassed
      ? "PROMOTE_LAYA_GATE"
      : "HOLD_SHADOW_ONLY";

  return {
    truncationCanaryPassed,
    metricsPassed,
    promotionVerdict,
  };
}
