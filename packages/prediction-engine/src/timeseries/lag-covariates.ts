
export const SPORTS_LAGS = [1, 2, 3, 4, 8, 16] as const;

/** Build the lag feature matrix: row t holds series[t - lag] for each lag (NaN when unavailable). */
export function buildLagMatrix(series: readonly number[], lags: readonly number[] = SPORTS_LAGS): number[][] {
  return series.map((_, t) =>
    lags.map((lag) => {
      const idx = t - lag;
      return idx >= 0 ? (series[idx] ?? NaN) : NaN;
    }),
  );
}

export interface SportsCovariates {
  readonly restDiffDays: number;
  readonly travelMiles: number;
  readonly dome: boolean;
  readonly opponentRollingEpa: number;
  readonly lineMove: number;
}

/** Sports-native covariates replacing date-time features. */
export function sportsCovariateRow(c: SportsCovariates): number[] {
  return [
    c.restDiffDays,
    Math.log1p(Math.max(c.travelMiles, 0)),
    c.dome ? 1 : 0,
    c.opponentRollingEpa,
    c.lineMove,
  ];
}

/** Full feature row: lags ++ sports covariates. */
export function lagCovariateRow(
  series: readonly number[],
  t: number,
  cov: SportsCovariates,
  lags: readonly number[] = SPORTS_LAGS,
): number[] {
  const lagRow = lags.map((lag) => {
    const idx = t - lag;
    return idx >= 0 ? (series[idx] ?? NaN) : NaN;
  });
  return [...lagRow, ...sportsCovariateRow(cov)];
}
