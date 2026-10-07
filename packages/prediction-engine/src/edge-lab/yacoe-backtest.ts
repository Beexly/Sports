/** YAC-over-expected rolling-signal backtest harness — pure function, no market input.
 * SYNTHETIC-only backtest; real-data backtest BLOCKED pending ingestion run.
 */
export interface YacoeRow {
  readonly playerId: string;
  readonly week: number;
  readonly season: number;
  readonly yacAboveExpected: number;
  readonly avgExpectedYac: number;
  readonly targetShare: number;
}

export interface RollingSignalResult {
  readonly playerId: string;
  readonly rollingMeanYacoe: number;
  readonly signal: number; // rollingMean / sqrt(n)
  readonly n: number;
  readonly priced: false;
}

export function computeYacoeSignal(
  rows: readonly YacoeRow[],
  minRows = 1,
): ReadonlyArray<RollingSignalResult> {
  const byPlayer = new Map<string, YacoeRow[]>();
  for (const r of rows) {
    const arr = byPlayer.get(r.playerId) ?? [];
    arr.push(r);
    byPlayer.set(r.playerId, arr);
  }
  const out: RollingSignalResult[] = [];
  for (const [playerId, arr] of byPlayer) {
    const sorted = [...arr].sort((a, b) => (a.season - b.season) || (a.week - b.week));
    const values = sorted.map((r) => r.yacAboveExpected);
    const sum = values.reduce((s, v) => s + v, 0);
    const n = sorted.length;
    const rollingMean = n >= minRows ? sum / n : null;
    if (rollingMean === null || !Number.isFinite(rollingMean)) {
      out.push({ playerId, rollingMeanYacoe: 0, signal: 0, n, priced: false });
    } else {
      const signal = rollingMean / Math.sqrt(Math.max(n, 1));
      out.push({ playerId, rollingMeanYacoe: rollingMean, signal, n, priced: false });
    }
  }
  return out;
}
