/**
 * Betting math — the pure formulas behind the free public calculator suite
 * (`/tools`). Every function here is deterministic, has no I/O, and takes
 * only plain numbers in and plain numbers (or `null` for invalid input) out.
 *
 * Two formulas MUST match the prediction engine's own convention exactly,
 * because the whole point of the public tools is that a visitor can verify
 * our math by hand and it agrees with what powers the product:
 *
 *   - `noVigFairProbabilities` mirrors `proportionalDevig` in
 *     packages/prediction-engine/src/edge-lab/devig.ts
 *   - `computeClvBpsTool` mirrors `computeClvBps` in
 *     packages/prediction-engine/src/edge-lab/ledger-chain.ts
 *
 * Both are reimplemented here rather than imported: apps/web does not (and
 * should not) depend on the engine package's internal edge-lab module for a
 * five-line formula. `betting-math.test.ts` pins the exact fixture values
 * each engine module's own test suite uses, so any drift between the two
 * copies fails a test immediately instead of silently diverging.
 *
 * No picks, no performance claims, no "our" numbers — these are generic
 * tools any bettor could reproduce with a calculator. See /tools for the
 * compliance posture (no banned language, no affiliate links).
 */

// ───────────────────────────── validity gates ─────────────────────────────

/**
 * American odds are valid only at magnitude >= 100 — real sportsbook American
 * odds are never 0 and never sit strictly between -100 and +100 (there is no
 * such thing as "+50" or "-50" American odds; that range is impossible under
 * the notation). The boundary values +100 and -100 are both valid (a fair
 * coin-flip price, quoted from either side).
 */
export function isValidAmericanOdds(american: number): boolean {
  return Number.isFinite(american) && Math.abs(american) >= 100;
}

/**
 * Decimal odds are valid only when finite and strictly greater than 1 — a
 * decimal price of 1 or below implies zero or negative payout, which is not
 * a real tradeable price. Mirrors the same gate `hasValidPrices` (devig.ts)
 * and `assertDecimalPrice` (ledger-chain.ts) both enforce in the engine.
 */
export function isValidDecimalOdds(decimal: number): boolean {
  return Number.isFinite(decimal) && decimal > 1;
}

// ───────────────────── American <-> decimal <-> implied probability ─────────────────────

/**
 * American -> decimal.
 *
 *   positive American A (A >= 100):  decimal = 1 + A / 100
 *   negative American A (A <= -100): decimal = 1 + 100 / |A|
 *
 * +100 and -100 both map to decimal 2.0 (the fair coin-flip price quoted
 * from either side) — that is expected, not a bug; see `decimalToAmerican`
 * for how the reverse conversion resolves that boundary.
 *
 * Returns `null` for invalid input (0, magnitude < 100, non-finite).
 */
export function americanToDecimal(american: number): number | null {
  if (!isValidAmericanOdds(american)) return null;
  return american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american);
}

/**
 * Decimal -> American.
 *
 *   decimal >= 2.0: American = (decimal - 1) * 100    (underdog / plus form)
 *   decimal <  2.0: American = -100 / (decimal - 1)   (favorite / minus form)
 *
 * At exactly decimal = 2.0 both conventions describe the identical fair
 * price; this function always returns the canonical "+100" form there (the
 * >= branch), the same convention standard odds converters use. Rounded to
 * the nearest integer, since American odds are always quoted as whole
 * numbers. Returns `null` for invalid decimal input (<= 1, non-finite).
 */
export function decimalToAmerican(decimal: number): number | null {
  if (!isValidDecimalOdds(decimal)) return null;
  const american = decimal >= 2 ? (decimal - 1) * 100 : -100 / (decimal - 1);
  return Math.round(american);
}

/**
 * Decimal price -> raw implied probability (1/d). Same one-line convention
 * as `impliedFromDecimal` in packages/prediction-engine/src/edge-lab/devig.ts
 * — reimplemented here (see file header). Returns `null` instead of
 * NaN/Infinity for invalid input, since this feeds user-facing UI directly.
 */
export function decimalToImpliedProbability(decimal: number): number | null {
  if (!isValidDecimalOdds(decimal)) return null;
  return 1 / decimal;
}

/**
 * Implied probability -> decimal price. Probability must be strictly
 * between 0 and 1: 0 implies an infinite price and 1 implies decimal 1.0
 * (no payout) — neither is a real tradeable price.
 */
export function impliedProbabilityToDecimal(probability: number): number | null {
  if (!Number.isFinite(probability) || probability <= 0 || probability >= 1) return null;
  return 1 / probability;
}

/** American -> implied probability, composed through decimal so there is exactly one implied-probability formula to keep in sync. */
export function americanToImpliedProbability(american: number): number | null {
  const decimal = americanToDecimal(american);
  return decimal === null ? null : decimalToImpliedProbability(decimal);
}

/** Implied probability -> American, composed through decimal. */
export function impliedProbabilityToAmerican(probability: number): number | null {
  const decimal = impliedProbabilityToDecimal(probability);
  return decimal === null ? null : decimalToAmerican(decimal);
}

/** Which notation a raw text odds input is in — shared by every /tools client component's format toggle. */
export type OddsFormat = "american" | "decimal";

/**
 * Parse a raw text-input value into a decimal price, given which format the
 * field is currently in. The single parsing rule every calculator's odds
 * input shares, so "American" vs "decimal" mode behaves identically across
 * all four tools. Returns `null` for empty, non-numeric, or
 * invalid-for-its-format input (never throws on a bad keystroke).
 */
export function parseOddsInputToDecimal(raw: string, format: OddsFormat): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return format === "american" ? americanToDecimal(n) : isValidDecimalOdds(n) ? n : null;
}

// ───────────────────────────── expected value ─────────────────────────────

/**
 * Expected value per $1 staked, given your own estimate of the true win
 * probability and the decimal price offered.
 *
 *   EV = probability * decimalPrice - 1
 *
 * Derivation: stake $1. Win -> receive decimalPrice back, profit =
 * decimalPrice - 1. Lose -> profit = -1. EV = p*(d-1) + (1-p)*(-1) =
 * p*d - p - 1 + p = p*d - 1.
 *
 * EV is exactly zero when `probability === decimalToImpliedProbability(decimalPrice)`
 * — your estimate agrees with what the price already implies, so there's no
 * edge either way. Positive means your probability estimate is more
 * favorable than the price implies; negative means less.
 */
export function expectedValuePerDollar(probability: number, decimalPrice: number): number | null {
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) return null;
  if (!isValidDecimalOdds(decimalPrice)) return null;
  return probability * decimalPrice - 1;
}

// ─────────────────── no-vig fair probability (proportional de-vig) ───────────────────

/**
 * Other de-vig methods exist (e.g. Shin's model, which corrects the
 * favourite-longshot bias); this calculator intentionally shows only the
 * simpler, fully-explainable proportional method. Surfaced next to every
 * no-vig result so nobody mistakes "the fair probability" for the only
 * possible fair probability.
 */
export const NO_VIG_METHOD_NOTE =
  "This uses the proportional method: it splits the vig evenly across every outcome. Other de-vig methods exist (e.g. Shin's model), and they can return slightly different fair probabilities, especially for longshots.";

/**
 * Proportional de-vig — the SAME formula and SAME refusal guard as the house
 * convention, `proportionalDevig` in
 * packages/prediction-engine/src/edge-lab/devig.ts:
 *
 *   implied_i = 1 / decimalOdds_i
 *   fair_i    = implied_i / sum(implied)      (sum(implied) is the "overround")
 *
 * Null when any price is invalid, or when the market is sub-vig
 * (overround < 1): a two-sided market whose implied probabilities sum to
 * less than 1 cannot come from honest pricing — it is crossed, stale, or a
 * mixed-format input error — and de-vigging it would manufacture a fabricated
 * split, so this refuses rather than emit one. See file header for why this
 * is reimplemented rather than imported, and betting-math.test.ts for the
 * parity fixtures pinned against devig.test.ts's own values.
 */
export function noVigFairProbabilities(decimalOdds: readonly number[]): number[] | null {
  if (decimalOdds.length === 0) return null;
  for (const d of decimalOdds) {
    if (!isValidDecimalOdds(d)) return null;
  }
  const implied = decimalOdds.map((d) => 1 / d);
  const overround = implied.reduce((sum, p) => sum + p, 0);
  if (overround < 1) return null; // sub-vig: crossed/stale, refuse rather than fabricate
  return implied.map((p) => p / overround);
}

// ───────────────────────────── vig / hold percentage ─────────────────────────────

/**
 * The book's margin on a market, expressed as a percentage of the total
 * implied probability:
 *
 *   vig% = (sum(1 / decimalOdds_i) - 1) * 100
 *
 * Unlike `noVigFairProbabilities`, a sub-vig (overround < 1) input is NOT
 * refused here: reporting a negative hold is an honest description of a
 * crossed/stale quote, not a fabrication — nothing here manufactures a
 * probability split the way de-vigging would. `null` only for structurally
 * invalid prices (non-finite, <= 1, or an empty market).
 */
export function vigPercentage(decimalOdds: readonly number[]): number | null {
  if (decimalOdds.length === 0) return null;
  for (const d of decimalOdds) {
    if (!isValidDecimalOdds(d)) return null;
  }
  const overround = decimalOdds.reduce((sum, d) => sum + 1 / d, 0);
  return (overround - 1) * 100;
}

// ───────────────────────────── parlay ─────────────────────────────

/**
 * The honesty note every parlay result must carry: the combined math below
 * assumes independent legs, and same-game (or otherwise correlated) parlays
 * violate that assumption in ways that can move the true probability
 * meaningfully in either direction.
 */
export const PARLAY_CORRELATION_CAVEAT =
  "This assumes every leg is independent. Same-game parlays and other correlated legs (e.g. a team's spread and their own player's prop) do not multiply cleanly — the real combined probability can be meaningfully higher or lower than this math shows. Correlation is not modeled here.";

export interface ParlayResult {
  readonly combinedDecimal: number;
  readonly combinedAmerican: number | null;
  readonly impliedProbability: number;
}

/**
 * Combine parlay legs assuming independence: decimal prices multiply.
 *
 *   combinedDecimal    = product(decimalOdds_i)
 *   impliedProbability = 1 / combinedDecimal
 *                       (equal to the product of each leg's own implied
 *                        probability, since implied_i = 1 / decimalOdds_i)
 *
 * Requires at least 2 legs (a single leg is not a parlay) and every leg to
 * be a valid decimal price; otherwise `null`. See `PARLAY_CORRELATION_CAVEAT`
 * — always surface it next to this result.
 */
export function combineParlayLegs(decimalOdds: readonly number[]): ParlayResult | null {
  if (decimalOdds.length < 2) return null;
  for (const d of decimalOdds) {
    if (!isValidDecimalOdds(d)) return null;
  }
  const combinedDecimal = decimalOdds.reduce((product, d) => product * d, 1);
  return {
    combinedDecimal,
    combinedAmerican: decimalToAmerican(combinedDecimal),
    impliedProbability: 1 / combinedDecimal,
  };
}

// ───────────────────────────── CLV (closing line value) ─────────────────────────────

/** Round to a fixed number of decimal digits. Same rounding convention `computeClvBps` uses in ledger-chain.ts. */
function roundTo(value: number, digits: number): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

/**
 * Per-play CLV in basis points between a decision price and a closing price
 * — the SAME formula, SAME sign convention, and SAME rounding (2 decimal
 * places) as `computeClvBps` in
 * packages/prediction-engine/src/edge-lab/ledger-chain.ts:
 *
 *   clvBps = 10000 * (1/closingPriceDecimal - 1/decisionPriceDecimal)
 *
 * POSITIVE => you got the better number than the close (you beat the close).
 * NEGATIVE => the close was better than your price (you lost value).
 *
 * Worked examples (pinned in betting-math.test.ts against the same values
 * ledger-chain.test.ts uses): decision 2.10 / close 1.95 -> +366.30;
 * decision 1.90 / close 1.95 -> -134.95.
 *
 * Reimplemented here rather than imported (see file header). Unlike the
 * engine's version, this returns `null` for invalid input instead of
 * throwing — a public form should never throw on a bad value, it should
 * just decline to show a result.
 */
export function computeClvBpsTool(decisionPriceDecimal: number, closingPriceDecimal: number): number | null {
  if (!isValidDecimalOdds(decisionPriceDecimal) || !isValidDecimalOdds(closingPriceDecimal)) return null;
  const bps = 10000 * (1 / closingPriceDecimal - 1 / decisionPriceDecimal);
  return roundTo(bps, 2);
}

// ───────────────────────────── line movement ─────────────────────────────

export type LineMovementMoneyline = {
  readonly openOdds: number;
  readonly closeOdds: number;
  readonly openImpliedProb: number;
  readonly closeImpliedProb: number;
  readonly probShift: number;
  readonly direction: "shortened" | "lengthened" | "no movement";
  readonly movedToward: "favorite" | "underdog" | "none";
};

export type LineMovementSpreadOrTotal = {
  readonly openLine: number;
  readonly closeLine: number;
  readonly lineChange: number;
  readonly direction: string;
};

/**
 * Open→close line movement (sports-skills betting.line_movement port).
 * Moneyline uses implied-prob shift; spread/total uses line delta.
 * Returns null when inputs invalid or nothing to analyze.
 */
export function analyzeLineMovement(input: {
  readonly openOdds?: number | null;
  readonly closeOdds?: number | null;
  readonly openLine?: number | null;
  readonly closeLine?: number | null;
  readonly marketType?: "moneyline" | "spread" | "total";
}): {
  readonly marketType: "moneyline" | "spread" | "total";
  readonly moneyline?: LineMovementMoneyline;
  readonly line?: LineMovementSpreadOrTotal;
} | null {
  const marketType = input.marketType ?? "moneyline";
  const hasMl =
    typeof input.openOdds === "number" &&
    typeof input.closeOdds === "number" &&
    isValidAmericanOdds(input.openOdds) &&
    isValidAmericanOdds(input.closeOdds);
  const hasLine =
    typeof input.openLine === "number" &&
    typeof input.closeLine === "number" &&
    Number.isFinite(input.openLine) &&
    Number.isFinite(input.closeLine);

  if (!hasMl && !hasLine) return null;

  const out: {
    marketType: "moneyline" | "spread" | "total";
    moneyline?: LineMovementMoneyline;
    line?: LineMovementSpreadOrTotal;
  } = { marketType };

  if (hasMl) {
    const openImpliedProb = americanToImpliedProbability(input.openOdds!)!;
    const closeImpliedProb = americanToImpliedProbability(input.closeOdds!)!;
    const probShift = closeImpliedProb - openImpliedProb;
    let direction: LineMovementMoneyline["direction"] = "no movement";
    let movedToward: LineMovementMoneyline["movedToward"] = "none";
    if (probShift > 1e-9) {
      direction = "shortened";
      movedToward = "favorite";
    } else if (probShift < -1e-9) {
      direction = "lengthened";
      movedToward = "underdog";
    }
    out.moneyline = {
      openOdds: input.openOdds!,
      closeOdds: input.closeOdds!,
      openImpliedProb,
      closeImpliedProb,
      probShift: roundTo(probShift, 6),
      direction,
      movedToward,
    };
  }

  if (hasLine) {
    const lineChange = input.closeLine! - input.openLine!;
    let direction = "no movement";
    if (marketType === "total") {
      if (lineChange > 0) direction = "total moved up";
      else if (lineChange < 0) direction = "total moved down";
    } else {
      if (lineChange < 0) direction = "moved toward favorite";
      else if (lineChange > 0) direction = "moved toward underdog";
    }
    out.line = {
      openLine: input.openLine!,
      closeLine: input.closeLine!,
      lineChange: roundTo(lineChange, 4),
      direction,
    };
  }

  return out;
}

