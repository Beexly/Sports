/**
 * market_clv_features — market-relative CLV features for the Elite
 * line-value ledger and the ESTABLISHED ladder gate.
 *
 * WHAT THIS IS
 * ------------
 * A pure feature extractor over data the repo already stores and already
 * grades: the decision-time (locked) price/line and the closing price/line.
 * It produces the CLV-side feature vector the promotion contract and the
 * ESTABLISHED gate need (`docs` ladder: ≥500 settled + verified CLV
 * ≥52.4%), without inventing a pricing ladder and without a new schema.
 *
 * DATA PATH (all already exist — nothing new is ingested):
 *   - Decision price/line: `Pick.clvLockLine` / `Pick.clvLockPrice` /
 *     `clvLock*` family written once at mint
 *     (`packages/ingestion-pipeline/src/process-sport.ts` ~:1310).
 *   - Closing price/line: `deriveClosingSnapshotFromOdds`
 *     (`packages/prediction-engine/src/clv-capture.ts:90`), graded at
 *     settlement (`packages/ingestion-pipeline/src/settle-sport.ts` ~:617).
 *   - Verdict: `Pick.clvVerdict` ∈ {BEAT_CLOSE, LOST_TO_CLOSE, MATCHED_CLOSE}.
 *   - Shared CLV math: `computeClvBps` in
 *     `packages/prediction-engine/src/edge-lab/ledger-chain.ts` (~:444) and
 *     `selfClvFromArchive` in `packages/stats-api/src/formulas/derived.ts:133`.
 *
 * FLAG (disabled by default; additive):
 *   MARKET_CLV_FEATURES_ENABLED=true
 * When false the extractor returns `enabled: false` and an empty feature
 * set. Nothing in the live pick path reads this module until the flag is
 * on; MODEL_VERSION is untouched.
 *
 * Pure, no I/O, TypeScript-strict, no `any`.
 */

export const MARKET_CLV_FEATURES_FLAG = "MARKET_CLV_FEATURES_ENABLED";

export interface MarketClvPrices {
  /** Decision-time decimal price for the chosen side (must be > 1). */
  readonly decisionPriceDecimal: number | null;
  /** Closing decimal price for the chosen side (must be > 1). */
  readonly closingPriceDecimal: number | null;
  /** Decision-time line (spread/total). Null for moneyline. */
  readonly decisionLine: number | null;
  /** Closing line (spread/total). Null for moneyline. */
  readonly closingLine: number | null;
  /** Market kind, used only for unit labeling. */
  readonly market: "MONEYLINE" | "SPREAD" | "TOTAL" | "PROP";
}

export interface MarketClvFeatures {
  /** True only when MARKET_CLV_FEATURES_ENABLED is on. */
  readonly enabled: boolean;
  /**
   * Closing-line value in basis points (10000 * ln(close/dec) on decimal
   * odds; positive = beat the close). Null when prices are missing or
   * invalid — silence, never 0.
   */
  readonly clvBps: number | null;
  /**
   * Signed line movement against the chosen side (close − decision, in
   * line units). Positive on SPREAD/TOTAL means the market moved AWAY
   * from our side (we captured the better number). Null when either line
   * is missing (moneyline has no line).
   */
  readonly lineMoveForUs: number | null;
  /** 1 when clvBps > 0, 0 when clvBps ≤ 0, null when clvBps is null. */
  readonly beatClose: 0 | 1 | null;
  /** Reasons a feature could not be derived (empty when complete). */
  readonly gaps: readonly string[];
}

function positiveFinite(x: number | null | undefined): x is number {
  return typeof x === "number" && Number.isFinite(x) && x > 1;
}

/**
 * CLV in basis points from two decimal prices.
 * Mirrors `computeClvBps` in ledger-chain.ts (sign convention: positive
 * when the close is LONGER than our entry — we beat the close).
 * Returns null on any missing/invalid input. Never invents 0.
 */
export function clvBpsFromPrices(
  decisionPriceDecimal: number | null | undefined,
  closingPriceDecimal: number | null | undefined,
): number | null {
  if (!positiveFinite(decisionPriceDecimal) || !positiveFinite(closingPriceDecimal)) {
    return null;
  }
  // 10000 * ln(close/dec) = 10000 * (ln(close) - ln(dec)).
  // Positive when close > dec (price drifted up = we beat the close).
  const bps = 10000 * Math.log(closingPriceDecimal / decisionPriceDecimal);
  if (!Number.isFinite(bps)) return null;
  // Fixed 2-decimal rounding, same convention as ledger-chain / betting-math.
  return Math.round(bps * 100) / 100;
}

/**
 * Signed line movement in our favor. close < decision on a spread we laid
 * (negative side) means the market moved toward our number — but the
 * module keeps the raw (close − decision) in the CHOSE side's units and
 * lets the caller interpret sign; this helper only fills `lineMoveForUs`
 * with (decision − close) for SPREAD/TOTAL so POSITIVE = we hold the
 * better number (the market moved past our entry toward our side).
 */
export function lineMoveForUs(
  decisionLine: number | null | undefined,
  closingLine: number | null | undefined,
  market: MarketClvPrices["market"],
): number | null {
  if (market === "MONEYLINE" || market === "PROP") return null;
  if (typeof decisionLine !== "number" || !Number.isFinite(decisionLine)) return null;
  if (typeof closingLine !== "number" || !Number.isFinite(closingLine)) return null;
  const move = decisionLine - closingLine;
  return Math.round(move * 1000) / 1000;
}

export interface MarketClvOptions {
  /** MARKET_CLV_FEATURES_ENABLED. Default false. */
  readonly enabled?: boolean;
}

/**
 * Extract the market CLV feature set from already-stored lock/close
 * prices. When `enabled` is false, returns an empty disabled feature set
 * and does not compute (identity of the disable path).
 */
export function extractMarketClvFeatures(
  prices: MarketClvPrices,
  options: MarketClvOptions = {},
): MarketClvFeatures {
  const enabled = options.enabled === true;
  const gaps: string[] = [];
  if (!enabled) {
    return {
      enabled: false,
      clvBps: null,
      lineMoveForUs: null,
      beatClose: null,
      gaps: ["MARKET_CLV_FEATURES_ENABLED is off"],
    };
  }

  if (prices.decisionPriceDecimal === null) gaps.push("missing decision price");
  if (prices.closingPriceDecimal === null) gaps.push("missing closing price");

  const clvBps = clvBpsFromPrices(
    prices.decisionPriceDecimal,
    prices.closingPriceDecimal,
  );
  if (clvBps === null && gaps.length === 0) gaps.push("invalid price pair");

  const move = lineMoveForUs(prices.decisionLine, prices.closingLine, prices.market);
  if (move === null && prices.market !== "MONEYLINE" && prices.market !== "PROP") {
    if (prices.decisionLine === null) gaps.push("missing decision line");
    if (prices.closingLine === null) gaps.push("missing closing line");
  }

  const beatClose: 0 | 1 | null = clvBps === null ? null : clvBps > 0 ? 1 : 0;

  return {
    enabled: true,
    clvBps,
    lineMoveForUs: move,
    beatClose,
    gaps,
  };
}

/**
 * Aggregate beat-close rate over a set of already-derived features —
 * the ESTABLISHED ladder's `verified CLV ≥52.4%` numerator/denominator.
 * Pure. Refuses to return a rate on an empty sample (null), matching the
 * public-clv-policy discipline of never inventing a number.
 */
export function beatCloseRate(
  features: readonly MarketClvFeatures[],
): { readonly n: number; readonly beat: number; readonly rate: number | null } {
  const decided = features.filter((f) => f.beatClose !== null);
  const n = decided.length;
  const beat = decided.filter((f) => f.beatClose === 1).length;
  return { n, beat, rate: n > 0 ? beat / n : null };
}
