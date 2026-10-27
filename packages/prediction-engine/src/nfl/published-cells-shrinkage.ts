/**
 * Published 32-team trench & blitz cells with Baranchik (1970) positive-part
 * James-Stein shrinkage.
 *
 * Class A. No book tokens. These are measured league tables, shrunk toward a
 * cross-team mean so that a 32-team sample does not pretend each team's raw
 * number is its true ability.
 *
 * Source: GSE-INTEL-MASTER-2026-10-24.md Part 1 (@RyanPaganetti 2026 W1-W6
 * 32-team tables):
 *   - 2026-10-20T22:10:54Z  Yards Before Contact per rush
 *   - 2026-10-20T22:45:01Z  Share of runs hit at or behind the line of scrimmage
 *   - 2026-10-21T00:32:52Z  EPA per play vs blitz
 *
 * The shrink targets (mu0), cross-team sample variances, within-team sampling
 * noise variances (sigma^2), and the ||X - mu0||^2 norms are the measured
 * quantities. The JS+ factor is computed from them, not asserted.
 */

export type NflTeamCode =
  | "ARI"
  | "ATL"
  | "BAL"
  | "BUF"
  | "CAR"
  | "CHI"
  | "CIN"
  | "CLE"
  | "DAL"
  | "DEN"
  | "DET"
  | "GB"
  | "HOU"
  | "IND"
  | "JAX"
  | "KC"
  | "LAC"
  | "LAR"
  | "LV"
  | "MIA"
  | "MIN"
  | "NE"
  | "NO"
  | "NYG"
  | "NYJ"
  | "PHI"
  | "PIT"
  | "SEA"
  | "SF"
  | "TB"
  | "TEN"
  | "WAS";

/** 32-team Yards Before Contact per rush, W1-W6 2026. */
export const YBC_PER_RUSH_32: Record<NflTeamCode, number> = {
  BUF: 2.29,
  LAR: 1.82,
  KC: 1.76,
  DET: 1.72,
  SF: 1.71,
  MIA: 1.69,
  CHI: 1.44,
  CAR: 1.42,
  MIN: 1.42,
  BAL: 1.38,
  PIT: 1.36,
  WAS: 1.22,
  DEN: 1.2,
  IND: 1.13,
  CIN: 1.12,
  TEN: 1.04,
  DAL: 1.03,
  NE: 1.03,
  NYG: 0.99,
  NYJ: 0.95,
  GB: 0.93,
  NO: 0.93,
  LAC: 0.92,
  HOU: 0.92,
  TB: 0.91,
  ARI: 0.88,
  ATL: 0.86,
  PHI: 0.84,
  SEA: 0.8,
  JAX: 0.68,
  LV: 0.57,
  CLE: 0.38,
};

/** 32-team share of runs hit at or behind the line of scrimmage, W1-W6 2026. */
export const AT_OR_BEHIND_LOS_RATE_32: Record<NflTeamCode, number> = {
  CLE: 0.567,
  HOU: 0.528,
  SEA: 0.526,
  LV: 0.521,
  LAC: 0.521,
  WAS: 0.519,
  PHI: 0.514,
  TB: 0.508,
  ARI: 0.507,
  NYJ: 0.507,
  GB: 0.5,
  IND: 0.487,
  NE: 0.484,
  DAL: 0.481,
  TEN: 0.478,
  NO: 0.478,
  BAL: 0.465,
  KC: 0.465,
  JAX: 0.463,
  DEN: 0.447,
  PIT: 0.446,
  MIA: 0.444,
  NYG: 0.438,
  ATL: 0.436,
  CHI: 0.428,
  MIN: 0.427,
  DET: 0.408,
  CAR: 0.405,
  BUF: 0.404,
  SF: 0.37,
  LAR: 0.363,
  CIN: 0.35,
};

/** 32-team EPA per play vs blitz, W1-W6 2026. */
export const EPA_VS_BLITZ_32: Record<NflTeamCode, number> = {
  DET: 0.38,
  HOU: 0.28,
  CAR: 0.2,
  BUF: 0.19,
  BAL: 0.18,
  SF: 0.15,
  JAX: 0.09,
  IND: 0.07,
  KC: 0.06,
  LV: 0.01,
  CHI: 0.0,
  WAS: 0.0,
  ATL: -0.01,
  GB: -0.01,
  NE: -0.02,
  DAL: -0.02,
  SEA: -0.03,
  LAR: -0.07,
  NYG: -0.09,
  TB: -0.1,
  NO: -0.1,
  MIN: -0.12,
  NYJ: -0.12,
  CIN: -0.14,
  TEN: -0.17,
  ARI: -0.17,
  DEN: -0.2,
  CLE: -0.23,
  MIA: -0.23,
  PHI: -0.27,
  PIT: -0.3,
  LAC: -0.34,
};

/**
 * Measured shrinkage priors, one block per cell.
 *
 * sigma^2 is the within-team sampling noise variance. normDiffSquared is
 * ||X - mu0||^2 over the 32 team values. Both are measured, not chosen.
 */
export const MEASURED_CELL_PRIORS = {
  ybcPerRush: {
    shrinkTargetMu0: 1.166875,
    crossTeamSampleVar: 0.16999,
    withinTeamNoiseSigma2: 0.024,
    normDiffSquared: 5.2696875,
    dimensionD: 32,
  },
  atOrBehindLosRate: {
    shrinkTargetMu0: 0.46515625,
    crossTeamSampleVar: 0.002789,
    withinTeamNoiseSigma2: 0.00095,
    normDiffSquared: 0.0864602,
    dimensionD: 32,
  },
  epaVsBlitz: {
    shrinkTargetMu0: -0.0353125,
    crossTeamSampleVar: 0.028903,
    withinTeamNoiseSigma2: 0.011,
    normDiffSquared: 0.8959969,
    dimensionD: 32,
  },
} as const;

export interface ShrunkCell {
  readonly shrunkValue: number;
  readonly jsPlusFactor: number;
  readonly shrinkageDelta: number;
}

/**
 * Baranchik (1970) positive-part James-Stein estimator toward shrinkTargetMu0.
 *
 *   theta_hat_JS+ = mu0 + (1 - (d - 3) * sigma^2 / ||X - mu0||^2)_+ * (X - mu0)
 *
 * The positive part matters: when the estimated shrinkage weight goes negative
 * the estimator falls back to the raw value rather than flipping the sign of
 * the correction. d <= 3 is the classical degenerate case and also returns raw.
 */
export function shrinkPublishedCell(
  rawValue: number,
  shrinkTargetMu0: number,
  withinTeamNoiseSigma2: number,
  normDiffSquared: number,
  dimensionD = 32,
): ShrunkCell {
  if (normDiffSquared <= 1e-12 || dimensionD <= 3) {
    return { shrunkValue: rawValue, jsPlusFactor: 1.0, shrinkageDelta: 0.0 };
  }
  const rawFactor = 1.0 - ((dimensionD - 3) * withinTeamNoiseSigma2) / normDiffSquared;
  const jsPlusFactor = Math.max(0.0, Math.min(1.0, rawFactor));
  const shrunkValue = shrinkTargetMu0 + jsPlusFactor * (rawValue - shrinkTargetMu0);
  return {
    shrunkValue: +shrunkValue.toFixed(6),
    jsPlusFactor: +jsPlusFactor.toFixed(6),
    shrinkageDelta: +(shrunkValue - rawValue).toFixed(6),
  };
}

export interface TeamTrenchAndBlitzCell {
  readonly team: NflTeamCode;
  readonly ybc: ShrunkCell;
  readonly behindLos: ShrunkCell;
  readonly blitzEpa: ShrunkCell;
}

/**
 * Apply all three measured priors to one team's raw published cells.
 * Every team carries the same sigma^2 and the same ||X - mu0||^2 norm, so the
 * JS+ factor is identical across teams within a cell; only the raw value moves.
 */
export function getTeamShrunkTrenchAndBlitzCell(team: NflTeamCode): TeamTrenchAndBlitzCell {
  const ybc = shrinkPublishedCell(
    YBC_PER_RUSH_32[team],
    MEASURED_CELL_PRIORS.ybcPerRush.shrinkTargetMu0,
    MEASURED_CELL_PRIORS.ybcPerRush.withinTeamNoiseSigma2,
    MEASURED_CELL_PRIORS.ybcPerRush.normDiffSquared,
    32,
  );
  const behindLos = shrinkPublishedCell(
    AT_OR_BEHIND_LOS_RATE_32[team],
    MEASURED_CELL_PRIORS.atOrBehindLosRate.shrinkTargetMu0,
    MEASURED_CELL_PRIORS.atOrBehindLosRate.withinTeamNoiseSigma2,
    MEASURED_CELL_PRIORS.atOrBehindLosRate.normDiffSquared,
    32,
  );
  const blitzEpa = shrinkPublishedCell(
    EPA_VS_BLITZ_32[team],
    MEASURED_CELL_PRIORS.epaVsBlitz.shrinkTargetMu0,
    MEASURED_CELL_PRIORS.epaVsBlitz.withinTeamNoiseSigma2,
    MEASURED_CELL_PRIORS.epaVsBlitz.normDiffSquared,
    32,
  );
  return { team, ybc, behindLos, blitzEpa };
}

/**
 * Canonical PIT @ NO cell — the Week 7 Paris International Game.
 *
 * PIT raw YBC 1.36 -> shrunk 1.3345; behind-LOS 0.446 -> 0.4521; blitz EPA
 * -0.30 -> -0.2058.
 * NO  raw YBC 0.93 -> shrunk 0.9613; behind-LOS 0.478 -> 0.4739; blitz EPA
 * -0.10 -> -0.0770.
 *
 * ybcEdgePitVsNo = +0.3732 yd/rush for PIT.
 * behindLosEdgePitVsNo = +0.0218 stuff-avoidance edge for PIT (higher is better
 * for the offense, so the edge is NO minus PIT on the at-or-behind rate).
 * blitzEpaDeltaPitVsNo = -0.1288 EPA/dropback blitz vulnerability on PIT.
 */
export interface PitNoYbcCellResult {
  readonly matchup: "PIT@NO";
  readonly awayTeam: "PIT";
  readonly homeTeam: "NO";
  readonly pit: TeamTrenchAndBlitzCell;
  readonly no: TeamTrenchAndBlitzCell;
  readonly ybcEdgePitVsNo: number;
  readonly behindLosEdgePitVsNo: number;
  readonly blitzEpaDeltaPitVsNo: number;
}

export function pitNoYbcCell(): PitNoYbcCellResult {
  const pit = getTeamShrunkTrenchAndBlitzCell("PIT");
  const no = getTeamShrunkTrenchAndBlitzCell("NO");
  const ybcEdgePitVsNo = +(pit.ybc.shrunkValue - no.ybc.shrunkValue).toFixed(4);
  const behindLosEdgePitVsNo = +(no.behindLos.shrunkValue - pit.behindLos.shrunkValue).toFixed(4);
  const blitzEpaDeltaPitVsNo = +(pit.blitzEpa.shrunkValue - no.blitzEpa.shrunkValue).toFixed(4);
  return {
    matchup: "PIT@NO",
    awayTeam: "PIT" as const,
    homeTeam: "NO" as const,
    pit,
    no,
    ybcEdgePitVsNo,
    behindLosEdgePitVsNo,
    blitzEpaDeltaPitVsNo,
  };
}
