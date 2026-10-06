/**
 * Kalshi trade-api calibration types + pure parsers (Wave4 #10).
 *
 * Wave4 intel: the elections-subdomain series endpoints all 404 — the working
 * path is the trade-api event/candlestick endpoints (81 daily OHLC samples
 * confirmed). This module is the pure layer: response shapes + validators +
 * summary stats for calibration evidence. No fetching here (caller supplies
 * JSON), so tests run on fixtures and nothing touches live money.
 */

export type KalshiCandle = {
  /** unix seconds, day granularity */
  readonly t: number;
  readonly o: number;
  readonly h: number;
  readonly l: number;
  readonly c: number;
  readonly v?: number;
};

export type KalshiCandles = {
  readonly ticker: string;
  readonly candles: readonly KalshiCandle[];
};

export type CandleSummary = {
  readonly ticker: string;
  readonly n: number;
  readonly first: number;
  readonly last: number;
  /** last − first in probability points */
  readonly drift: number;
  readonly meanClose: number;
  readonly high: number;
  readonly low: number;
};

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Validate one candle; null when malformed (never throw on vendor data). */
export function parseCandle(raw: unknown): KalshiCandle | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const { t, o, h, l, c } = r;
  if (!isNum(t) || !isNum(o) || !isNum(h) || !isNum(l) || !isNum(c)) return null;
  const v = r.v;
  const candle: KalshiCandle = { t, o, h, l, c };
  return v === undefined ? candle : isNum(v) ? { ...candle, v } : null;
}

/** Validate a candles payload; malformed rows skipped, ticker required. */
export function parseCandles(raw: unknown): KalshiCandles | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.ticker !== "string" || r.ticker.length === 0) return null;
  const list = Array.isArray(r.candles) ? r.candles : (Array.isArray(r.values) ? r.values : null);
  if (!list) return null;
  const candles = list.map(parseCandle).filter((x): x is KalshiCandle => x !== null);
  return { ticker: r.ticker, candles };
}

const r4 = (n: number): number => Math.round(n * 10000) / 10000;

/** Summarize validated candles for calibration evidence; null when empty. */
export function summarizeCandles(data: KalshiCandles): CandleSummary | null {
  if (data.candles.length === 0) return null;
  const closes = data.candles.map((x) => x.c);
  const first = closes[0];
  const last = closes[closes.length - 1];
  if (first === undefined || last === undefined) return null;
  return {
    ticker: data.ticker,
    n: closes.length,
    first,
    last,
    drift: r4(last - first),
    meanClose: r4(closes.reduce((s, x) => s + x, 0) / closes.length),
    high: Math.max(...data.candles.map((x) => x.h)),
    low: Math.min(...data.candles.map((x) => x.l)),
  };
}
