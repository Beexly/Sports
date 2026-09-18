/**
 * 5-percentage-point market-calibration violation mill.
 *
 * The de-vigged market is used as a FIXED offset on the priceable rung.
 * That is only honest if the market's claimed p matches realized rate
 * inside a named tolerance. The named tolerance is 5pp. It is a
 * measurement, not a claim that "the market is 5% off".
 *
 * No database. Empty input throws. Underpowered bins are not violations
 * and are not a pass. A sport with no evaluable bin is `underpowered`.
 *
 * SHADOW. priced false.
 */

export const MARKET_CALIBRATION_VIOLATION_PP = 0.05;
export const MARKET_CALIBRATION_MIN_BIN_N = 30;
export const MARKET_CALIBRATION_BINS = 10;

export type MarketCalibRow = {
  readonly sport: string;
  readonly marketP: number;
  readonly y: 0 | 1;
};

export type MarketCalibBin = {
  readonly lo: number;
  readonly hi: number;
  readonly n: number;
  readonly meanP: number;
  readonly meanY: number;
  readonly absGap: number;
  readonly evaluable: boolean;
  readonly violates: boolean;
};

export type MarketCalibSportCard = {
  readonly sport: string;
  readonly n: number;
  readonly binsEvaluable: number;
  readonly binsUnderpowered: number;
  readonly binsViolating: number;
  readonly violationRate: number | null;
  readonly verdict: "underpowered" | "measured";
  readonly bins: readonly MarketCalibBin[];
};

export type MarketCalibReport = {
  readonly n: number;
  readonly violationPp: typeof MARKET_CALIBRATION_VIOLATION_PP;
  readonly minBinN: number;
  readonly overall: MarketCalibSportCard;
  readonly bySport: readonly MarketCalibSportCard[];
  readonly priced: false;
  readonly status: "shadow";
  readonly dbQueried: false;
};

function binIndex(p: number): number {
  if (p >= 1) return MARKET_CALIBRATION_BINS - 1;
  if (p <= 0) return 0;
  return Math.min(MARKET_CALIBRATION_BINS - 1, Math.floor(p * MARKET_CALIBRATION_BINS));
}

function scoreGroup(sport: string, rows: readonly MarketCalibRow[]): MarketCalibSportCard {
  const acc = Array.from({ length: MARKET_CALIBRATION_BINS }, () => ({
    n: 0,
    sumP: 0,
    sumY: 0,
  }));
  for (const row of rows) {
    const i = binIndex(row.marketP);
    acc[i]!.n += 1;
    acc[i]!.sumP += row.marketP;
    acc[i]!.sumY += row.y;
  }
  const bins: MarketCalibBin[] = acc.map((cell, i) => {
    const lo = i / MARKET_CALIBRATION_BINS;
    const hi = (i + 1) / MARKET_CALIBRATION_BINS;
    const meanP = cell.n > 0 ? cell.sumP / cell.n : Number.NaN;
    const meanY = cell.n > 0 ? cell.sumY / cell.n : Number.NaN;
    const absGap = cell.n > 0 ? Math.abs(meanP - meanY) : Number.NaN;
    const evaluable = cell.n >= MARKET_CALIBRATION_MIN_BIN_N;
    const violates = evaluable && absGap > MARKET_CALIBRATION_VIOLATION_PP;
    return { lo, hi, n: cell.n, meanP, meanY, absGap, evaluable, violates };
  });
  const binsEvaluable = bins.filter((b) => b.evaluable).length;
  const binsUnderpowered = bins.filter((b) => b.n > 0 && !b.evaluable).length;
  const binsViolating = bins.filter((b) => b.violates).length;
  return {
    sport,
    n: rows.length,
    binsEvaluable,
    binsUnderpowered,
    binsViolating,
    violationRate: binsEvaluable > 0 ? binsViolating / binsEvaluable : null,
    verdict: binsEvaluable > 0 ? "measured" : "underpowered",
    bins,
  };
}

/**
 * Score de-vigged market p against settled y. Throws on empty or
 * non-finite/out-of-range p. Does not invent a 5% number.
 */
export function measureMarketCalibrationViolation(rows: readonly MarketCalibRow[]): MarketCalibReport {
  if (rows.length === 0) {
    throw new RangeError("measureMarketCalibrationViolation: empty sample");
  }
  for (const row of rows) {
    if (!(row.marketP >= 0 && row.marketP <= 1) || !Number.isFinite(row.marketP)) {
      throw new RangeError(`measureMarketCalibrationViolation: marketP out of [0,1]: ${row.marketP}`);
    }
    if (row.y !== 0 && row.y !== 1) {
      throw new RangeError("measureMarketCalibrationViolation: y must be 0 or 1");
    }
  }
  const bySportMap = new Map<string, MarketCalibRow[]>();
  for (const row of rows) {
    const list = bySportMap.get(row.sport) ?? [];
    list.push(row);
    bySportMap.set(row.sport, list);
  }
  const bySport = [...bySportMap.keys()].sort().map((sport) => scoreGroup(sport, bySportMap.get(sport)!));
  return {
    n: rows.length,
    violationPp: MARKET_CALIBRATION_VIOLATION_PP,
    minBinN: MARKET_CALIBRATION_MIN_BIN_N,
    overall: scoreGroup("ALL", rows),
    bySport,
    priced: false,
    status: "shadow",
    dbQueried: false,
  };
}
