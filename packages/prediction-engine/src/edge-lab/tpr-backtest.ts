/**
 * TPR backtest harness — Laplace-smoothed targets-per-route rate.
 * SYNTHETIC ONLY until real pbp_participation data lands locally.
 */
export interface TprRow {
  readonly playerId: string;
  readonly week: number;
  readonly season: number;
  readonly targets: number;
  readonly routes: number;
}

export interface TprBacktestRow {
  readonly playerId: string;
  readonly week: number;
  readonly season: number;
  readonly targets: number;
  readonly routes: number;
  readonly smoothedRate: number | null;
  readonly signal: number | null;
  readonly seasonBaseline: number | null;
}

export function computeTprBacktest(
  rows: readonly TprRow[],
  opts?: { k?: number; minSample?: number },
): readonly TprBacktestRow[] {
  const k = opts?.k ?? 2;
  const minSample = opts?.minSample ?? 20;
  const seasonTargets: Record<string, { targets: number; routes: number }> = {};
  for (const r of rows) {
    const key = `${r.playerId}:${r.season}`;
    if (!seasonTargets[key]) seasonTargets[key] = { targets: 0, routes: 0 };
    seasonTargets[key].targets += r.targets;
    seasonTargets[key].routes += r.routes;
  }
  return rows.map((r) => {
    const seasonKey = `${r.playerId}:${r.season}`;
    const season = seasonTargets[seasonKey] || { targets: 0, routes: 0 };
    const seasonBaseline = season.routes > 0 ? (season.targets + k) / (season.routes + 2 * k) : null;
    if (r.routes < minSample) {
      return {
        ...r,
        smoothedRate: null,
        signal: null,
        seasonBaseline,
      };
    }
    const smoothedRate = (r.targets + k) / (r.routes + 2 * k);
    const signal = seasonBaseline !== null ? smoothedRate - seasonBaseline : null;
    return { ...r, smoothedRate, signal, seasonBaseline };
  });
}
