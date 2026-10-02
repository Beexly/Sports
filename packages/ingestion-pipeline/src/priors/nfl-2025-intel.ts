/**
 * 2025 public-file indices from gse-competitive-intel/fantasyguru.
 * trench_smash.csv: higher OL_idx is better protection, higher DL_idx is a better pass rush.
 * team_defense.csv cov_rat: passer rating allowed. Lower is a better coverage.
 * rolling_form.csv PROE_delta: last four 2025 weeks minus the 2025 season, in percentage points.
 * Not 2026. A missing club abstains.
 */
export interface IntelPrior {
  readonly olIdx: number;
  readonly dlIdx: number;
  readonly covRatAllowed: number;
  readonly proeDeltaPp: number;
}
export const NFL_2025_INTEL: Readonly<Record<string, IntelPrior>> = {
  ARI: { olIdx: 40.9, dlIdx: 36.2, covRatAllowed: 97.5, proeDeltaPp: -4.4 },
  ATL: { olIdx: 62.3, dlIdx: 57.3, covRatAllowed: 90.9, proeDeltaPp: -2.5 },
  BAL: { olIdx: 50.3, dlIdx: 43.6, covRatAllowed: 89.4, proeDeltaPp: -10.6 },
  BUF: { olIdx: 66.2, dlIdx: 44.4, covRatAllowed: 82.8, proeDeltaPp: -3.3 },
  CAR: { olIdx: 47.8, dlIdx: 31.9, covRatAllowed: 88.3, proeDeltaPp: 4.0 },
  CHI: { olIdx: 62.3, dlIdx: 43.7, covRatAllowed: 95.2, proeDeltaPp: -1.0 },
  CIN: { olIdx: 47.9, dlIdx: 41.5, covRatAllowed: 98.6, proeDeltaPp: -1.5 },
  CLE: { olIdx: 32.2, dlIdx: 57.2, covRatAllowed: 90.6, proeDeltaPp: 2.1 },
  DAL: { olIdx: 56.8, dlIdx: 60.7, covRatAllowed: 109.9, proeDeltaPp: -5.3 },
  DEN: { olIdx: 66.5, dlIdx: 69.9, covRatAllowed: 84.5, proeDeltaPp: 1.4 },
  DET: { olIdx: 49.1, dlIdx: 58.9, covRatAllowed: 95.3, proeDeltaPp: 2.5 },
  GB: { olIdx: 49.8, dlIdx: 58.0, covRatAllowed: 97.5, proeDeltaPp: -1.7 },
  HOU: { olIdx: 50.0, dlIdx: 49.0, covRatAllowed: 80.2, proeDeltaPp: -4.6 },
  IND: { olIdx: 53.6, dlIdx: 59.8, covRatAllowed: 93.2, proeDeltaPp: -6.4 },
  JAX: { olIdx: 43.8, dlIdx: 55.6, covRatAllowed: 79.4, proeDeltaPp: 5.8 },
  KC: { olIdx: 42.4, dlIdx: 45.3, covRatAllowed: 98.4, proeDeltaPp: -6.1 },
  LA: { olIdx: 68.7, dlIdx: 64.5, covRatAllowed: 89.3, proeDeltaPp: -1.6 },
  LAC: { olIdx: 36.0, dlIdx: 52.1, covRatAllowed: 78.8, proeDeltaPp: -2.4 },
  LV: { olIdx: 37.4, dlIdx: 38.5, covRatAllowed: 97.3, proeDeltaPp: -6.7 },
  MIA: { olIdx: 39.7, dlIdx: 45.8, covRatAllowed: 103.4, proeDeltaPp: -0.9 },
  MIN: { olIdx: 35.6, dlIdx: 56.8, covRatAllowed: 88.6, proeDeltaPp: -0.8 },
  NE: { olIdx: 50.1, dlIdx: 39.6, covRatAllowed: 93.2, proeDeltaPp: -1.8 },
  NO: { olIdx: 42.1, dlIdx: 52.4, covRatAllowed: 94.0, proeDeltaPp: 6.1 },
  NYG: { olIdx: 42.9, dlIdx: 51.0, covRatAllowed: 95.2, proeDeltaPp: 0.2 },
  NYJ: { olIdx: 43.7, dlIdx: 29.7, covRatAllowed: 108.6, proeDeltaPp: -3.8 },
  PHI: { olIdx: 60.1, dlIdx: 53.6, covRatAllowed: 78.7, proeDeltaPp: -1.8 },
  PIT: { olIdx: 53.2, dlIdx: 60.2, covRatAllowed: 93.4, proeDeltaPp: -0.8 },
  SEA: { olIdx: 55.1, dlIdx: 64.9, covRatAllowed: 79.9, proeDeltaPp: 0.8 },
  SF: { olIdx: 63.6, dlIdx: 35.3, covRatAllowed: 100.0, proeDeltaPp: 3.3 },
  TB: { olIdx: 60.0, dlIdx: 44.8, covRatAllowed: 98.7, proeDeltaPp: 1.3 },
  TEN: { olIdx: 36.2, dlIdx: 54.7, covRatAllowed: 109.3, proeDeltaPp: -3.8 },
  WAS: { olIdx: 53.6, dlIdx: 43.0, covRatAllowed: 104.6, proeDeltaPp: -4.4 },
};
