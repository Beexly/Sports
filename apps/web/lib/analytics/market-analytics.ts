/**
 * market-analytics.ts
 *
 * Pure TypeScript analytics/math library for sports betting market analysis.
 * Zero external dependencies. No API calls, no DB access, no secrets.
 *
 * noUncheckedIndexedAccess: all array reads use ?? fallback.
 */

// ---------------------------------------------------------------------------
// 1. LINE MOVEMENT ANALYSIS
// ---------------------------------------------------------------------------

/** Key NFL margins of victory (most common). */
export function keyNumbers(): number[] {
  return [3, 4, 6, 7, 10, 13, 14];
}

/** True if the absolute value of spread falls on a key number. */
export function isKeyNumber(spread: number): boolean {
  return keyNumbers().includes(Math.abs(spread));
}

/** Absolute change between opening and current spread. */
export function spreadMovementSize(open: number, current: number): number {
  return Math.abs(current - open);
}

/**
 * Classify spread line movement direction.
 *
 * - steam      : moved > 3 pts toward favorite (current more negative, or
 *                positive open that shrunk by > 3)
 * - fade       : moved > 3 pts away from favorite (underdog side)
 * - key_number : movement crosses a key number
 * - flat       : otherwise
 *
 * Convention: spread is from the favourite's perspective
 * (negative = favourite giving points, positive = underdog getting points).
 */
export function lineMovementDirection(
  openingLine: number,
  currentLine: number,
): "steam" | "fade" | "key_number" | "flat" {
  const delta = currentLine - openingLine; // negative delta = moved toward favourite
  const size = Math.abs(delta);

  // Key numbers specifically for line movement direction (most impactful margins).
  // The movement crosses a key number when one value is strictly on each side of k.
  const lineKeys = [3, 7, 10, 14];
  const lo = Math.min(openingLine, currentLine);
  const hi = Math.max(openingLine, currentLine);
  for (const k of lineKeys) {
    // Crossing means k is strictly between open and current (exclusive on both ends)
    if (lo < k && k < hi) {
      return "key_number";
    }
    // Also check the negative mirror (e.g. -7)
    const kNeg = -k;
    if (lo < kNeg && kNeg < hi) {
      return "key_number";
    }
  }

  if (size > 3) {
    // delta < 0 means line moved toward favourite (steam)
    if (delta < 0) return "steam";
    return "fade";
  }

  return "flat";
}

/**
 * Speed of line movement in points per minute.
 * Returns 0 if fewer than 2 snapshots.
 */
export function lineMovementVelocity(
  snapshots: { timestampMs: number; spread: number }[],
): number {
  if (snapshots.length < 2) return 0;

  let totalMovement = 0;
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1] ?? { spread: 0 };
    const curr = snapshots[i] ?? { spread: 0 };
    totalMovement += Math.abs(curr.spread - prev.spread);
  }

  const first = snapshots[0] ?? { timestampMs: 0 };
  const last = snapshots[snapshots.length - 1] ?? { timestampMs: 0 };
  const totalMinutes = (last.timestampMs - first.timestampMs) / 60_000;

  if (totalMinutes <= 0) return 0;
  return totalMovement / totalMinutes;
}

/**
 * Reverse Line Movement (RLM) detector.
 *
 * True when public is betting the favourite (moneylineAction > 50%) but the
 * spread moved toward the underdog (currentSpread > openingSpread, i.e. the
 * favorite is giving fewer points).
 *
 * @param moneylineAction  % of bets on the favourite (0–100)
 * @param spread           current spread (negative = favourite giving points)
 * @param openingSpread    opening spread
 */
export function reverseLineMovement(
  moneylineAction: number,
  spread: number,
  openingSpread: number,
): boolean {
  const publicOnFavorite = moneylineAction > 50;
  // Line moved toward underdog means favourite gives fewer points:
  // e.g. -7 → -5.5 means spread went from -7 to -5.5 (increased / less negative)
  const movedTowardUnderdog = spread > openingSpread;
  return publicOnFavorite && movedTowardUnderdog;
}

// ---------------------------------------------------------------------------
// 2. ODDS ANALYSIS
// ---------------------------------------------------------------------------

/** Convert American odds to implied probability. */
function americanToImplied(odds: number): number {
  if (odds >= 0) {
    return 100 / (odds + 100);
  }
  const absOdds = Math.abs(odds);
  return absOdds / (absOdds + 100);
}

/** Convert American odds to decimal odds. */
function americanToDecimal(odds: number): number {
  if (odds >= 0) {
    return odds / 100 + 1;
  }
  return 100 / Math.abs(odds) + 1;
}

/** Convert decimal odds back to American odds. */
function decimalToAmerican(decimal: number): number {
  if (decimal >= 2) {
    return (decimal - 1) * 100;
  }
  return -100 / (decimal - 1);
}

/**
 * Overround (vig) = sum of implied probabilities - 1.
 * Accepts American odds array.
 */
export function overroundFromOdds(odds: number[]): number {
  if (odds.length === 0) return 0;
  const sum = odds.reduce((acc, o) => acc + americanToImplied(o), 0);
  return sum - 1;
}

/**
 * Remove vig from a single side's implied probability.
 *
 * @param americanOdds  the side's American odds
 * @param bookTotal     sum of implied probs for the entire market (1 + overround)
 */
export function noVigProbability(
  americanOdds: number,
  bookTotal: number,
): number {
  if (bookTotal <= 0) return 0;
  return americanToImplied(americanOdds) / bookTotal;
}

/**
 * Median of a list of lines (spreads or totals).
 * Returns 0 for empty input.
 */
export function consensusLine(lines: number[]): number {
  if (lines.length === 0) return 0;
  const sorted = [...lines].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid] ?? 0;
  }
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

/**
 * Handle-weighted average American odds.
 *
 * When all books have 0 handle, each book is weighted equally.
 * Averages decimal odds, then converts back to American.
 */
export function marketConsensusOdds(
  books: { odds: number; handle: number }[],
): number {
  if (books.length === 0) return 0;

  const totalHandle = books.reduce((acc, b) => acc + b.handle, 0);
  const equalWeight = totalHandle === 0;

  let weightedSum = 0;
  let totalWeight = 0;
  for (const book of books) {
    const decimal = americanToDecimal(book.odds);
    const weight = equalWeight ? 1 : book.handle;
    weightedSum += decimal * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  const avgDecimal = weightedSum / totalWeight;
  return decimalToAmerican(avgDecimal);
}

/**
 * Magnitude of odds movement expressed as change in implied probability.
 * |impliedProb(close) - impliedProb(open)|
 */
export function oddsMovementMagnitude(open: number, close: number): number {
  return Math.abs(americanToImplied(close) - americanToImplied(open));
}

/**
 * Pinnacle margin — same as overround for both sides of a market.
 * Pinnacle typically runs ~2.5%.
 */
export function pinnacleMargin(sides: number[]): number {
  return overroundFromOdds(sides);
}

// ---------------------------------------------------------------------------
// 3. SHARP MONEY INDICATORS
// ---------------------------------------------------------------------------

/**
 * Classify bettor profile by average bet size.
 *
 * - sharp  : avg > $1 000
 * - square : avg < $200
 * - mixed  : in between
 */
export function sharpMoneyThreshold(
  betCount: number,
  betAmount: number,
): "sharp" | "square" | "mixed" {
  if (betCount <= 0) return "square";
  const avg = betAmount / betCount;
  if (avg > 1000) return "sharp";
  if (avg < 200) return "square";
  return "mixed";
}

/**
 * Public bet percentage split between two sides.
 * Always sums to 100.
 */
export function publicBetPercentage(
  sideABets: number,
  sideBBets: number,
): { sideA: number; sideB: number } {
  const total = sideABets + sideBBets;
  if (total === 0) return { sideA: 50, sideB: 50 };
  return {
    sideA: (sideABets / total) * 100,
    sideB: (sideBBets / total) * 100,
  };
}

/**
 * Money (handle) percentage split between two sides.
 */
export function moneyPercentage(
  sideAMoney: number,
  sideBMoney: number,
): { sideA: number; sideB: number } {
  const total = sideAMoney + sideBMoney;
  if (total === 0) return { sideA: 50, sideB: 50 };
  return {
    sideA: (sideAMoney / total) * 100,
    sideB: (sideBMoney / total) * 100,
  };
}

/**
 * Steam move indicator.
 *
 * True if bet arrival rate exceeds 10 bets/min AND line moved > 1.5 pts.
 */
export function steamMoveIndicator(
  betCountChange: number,
  lineChange: number,
  timeWindowMinutes: number,
): boolean {
  if (timeWindowMinutes <= 0) return false;
  const betsPerMin = betCountChange / timeWindowMinutes;
  return betsPerMin > 10 && Math.abs(lineChange) > 1.5;
}

/**
 * Sharpness score on a logarithmic scale.
 *
 * score = avgBetSize * ln(1 + profitFactor)
 */
export function sharpnessScore(
  avgBetSize: number,
  profitFactor: number,
): number {
  return avgBetSize * Math.log(1 + profitFactor);
}

/**
 * Detect possible wiseguy (sharp) activity.
 *
 * True when the line moved against the public's preferred side AND the public
 * bet percentage on that side is below 40% (meaning the sharp side got the
 * books to move the number despite low public volume).
 *
 * @param lineMove    how many points the line moved (positive = moved away from public side)
 * @param publicSide  which side the public is on (+1 = side A / favourite, -1 = side B / underdog)
 * @param betPct      public bet percentage on the public side (0–100)
 */
export function wiseguyActivity(
  lineMove: number,
  publicSide: number,
  betPct: number,
): boolean {
  // Line moved against public: if public is on favourite (publicSide > 0),
  // a positive lineMove means the line went toward underdog (against public).
  const movedAgainstPublic = publicSide > 0 ? lineMove > 0 : lineMove < 0;
  return movedAgainstPublic && betPct < 40;
}

// ---------------------------------------------------------------------------
// 4. MARKET EFFICIENCY METRICS
// ---------------------------------------------------------------------------

/**
 * Closing Line Value.
 *
 * CLV = impliedProb(closingOdds) - impliedProb(betOdds)
 * Positive = bet odds were better than closing odds (beat the market).
 */
export function closingLineValue(
  betOdds: number,
  closingOdds: number,
): number {
  return americanToImplied(closingOdds) - americanToImplied(betOdds);
}

/**
 * CLV as a percentage of the bet's implied probability.
 */
export function clvPercentage(betOdds: number, closingOdds: number): number {
  const betProb = americanToImplied(betOdds);
  if (betProb === 0) return 0;
  return (closingLineValue(betOdds, closingOdds) / betProb) * 100;
}

/**
 * Mean CLV across a portfolio of bets.
 * Positive = consistently beating the closing market.
 */
export function marketEfficiencyScore(clvValues: number[]): number {
  if (clvValues.length === 0) return 0;
  const sum = clvValues.reduce((acc, v) => acc + v, 0);
  return sum / clvValues.length;
}

/**
 * Expected Value of a bet.
 *
 * EV = (prob * profitIfWin) + ((1 - prob) * -1)
 *
 * profitIfWin per $1 staked:
 *   positive odds: odds / 100
 *   negative odds: 100 / |odds|
 */
export function expectedValue(
  probability: number,
  americanOdds: number,
): number {
  const profitIfWin =
    americanOdds >= 0 ? americanOdds / 100 : 100 / Math.abs(americanOdds);
  return probability * profitIfWin + (1 - probability) * -1;
}

/**
 * Full Kelly Criterion fraction.
 *
 * Kelly = (b*p - q) / b
 *   b = decimal odds - 1
 *   p = probability of winning
 *   q = 1 - p
 *
 * Clamped to [0, 1].
 */
export function kellyFraction(
  probability: number,
  americanOdds: number,
): number {
  const decimal = americanToDecimal(americanOdds);
  const b = decimal - 1;
  if (b <= 0) return 0;
  const q = 1 - probability;
  const kelly = (b * probability - q) / b;
  return Math.max(0, Math.min(1, kelly));
}

// ---------------------------------------------------------------------------
// 5. HANDLE AND VOLUME
// ---------------------------------------------------------------------------

/** Map each game ID to its total handle. */
export function handleByGame(
  games: { id: string; handle: number }[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const game of games) {
    map.set(game.id, game.handle);
  }
  return map;
}

/**
 * Volume-Weighted Average Price.
 * Returns 0 if total volume is 0.
 */
export function volumeWeightedPrice(
  prices: number[],
  volumes: number[],
): number {
  const len = Math.min(prices.length, volumes.length);
  let numerator = 0;
  let totalVolume = 0;
  for (let i = 0; i < len; i++) {
    const p = prices[i] ?? 0;
    const v = volumes[i] ?? 0;
    numerator += p * v;
    totalVolume += v;
  }
  if (totalVolume === 0) return 0;
  return numerator / totalVolume;
}

/**
 * Order-book depth summary.
 *
 * Bids sorted descending (best bid = highest price).
 * Asks sorted ascending (best ask = lowest price).
 */
export function marketDepth(
  bids: { price: number; size: number }[],
  asks: { price: number; size: number }[],
): {
  bestBid: number;
  bestAsk: number;
  spread: number;
  bidVolume: number;
  askVolume: number;
} {
  const sortedBids = [...bids].sort((a, b) => b.price - a.price);
  const sortedAsks = [...asks].sort((a, b) => a.price - b.price);

  const bestBid = sortedBids[0]?.price ?? 0;
  const bestAsk = sortedAsks[0]?.price ?? 0;
  const bidVolume = bids.reduce((acc, b) => acc + b.size, 0);
  const askVolume = asks.reduce((acc, a) => acc + a.size, 0);

  return {
    bestBid,
    bestAsk,
    spread: bestAsk - bestBid,
    bidVolume,
    askVolume,
  };
}

/**
 * Herfindahl-Hirschman Index.
 *
 * HHI = sum(share_i^2) where shares sum to 1.
 * Range: 0 (perfectly competitive) to 1 (monopoly).
 *
 * Normalises input shares so they sum to 1.
 */
export function herfindahlIndex(marketShares: number[]): number {
  if (marketShares.length === 0) return 0;
  const total = marketShares.reduce((acc, s) => acc + s, 0);
  if (total === 0) return 0;
  return marketShares.reduce((acc, s) => {
    const share = s / total;
    return acc + share * share;
  }, 0);
}

// ---------------------------------------------------------------------------
// 6. RISK AND EXPOSURE
// ---------------------------------------------------------------------------

/**
 * Calculate total book exposure per side.
 *
 * Liability per bet = payout - stake = stake * (decimalOdds - 1).
 * netExposure = maxLiability - minLiability.
 */
export function bookExposure(
  bets: { side: "A" | "B"; amount: number; odds: number }[],
): { sideALiability: number; sideBLiability: number; netExposure: number } {
  let sideALiability = 0;
  let sideBLiability = 0;

  for (const bet of bets) {
    const decimal = americanToDecimal(bet.odds);
    const liability = bet.amount * (decimal - 1);
    if (bet.side === "A") {
      sideALiability += liability;
    } else {
      sideBLiability += liability;
    }
  }

  const netExposure = Math.abs(sideALiability - sideBLiability);
  return { sideALiability, sideBLiability, netExposure };
}

/**
 * Hedge amount to lock in profit on the other side.
 *
 * hedge = (originalBet * decimalOdds(original)) / decimalOdds(hedge)
 */
export function hedgeAmount(
  originalBet: number,
  originalOdds: number,
  hedgeOdds: number,
): number {
  const origDecimal = americanToDecimal(originalOdds);
  const hedgeDecimal = americanToDecimal(hedgeOdds);
  if (hedgeDecimal <= 0) return 0;
  return (originalBet * origDecimal) / hedgeDecimal;
}

/**
 * Guaranteed profit after hedging, regardless of outcome.
 *
 * If original wins:  profit = originalBet * (origDecimal - 1) - hedgeAmount
 * If hedge wins:     profit = hedge * (hedgeDecimal - 1) - originalBet
 * Guaranteed profit = minimum of the two.
 */
export function guaranteedProfit(
  originalBet: number,
  originalOdds: number,
  hedge: number,
  hedgeOdds: number,
): number {
  const origDecimal = americanToDecimal(originalOdds);
  const hedgeDecimal = americanToDecimal(hedgeOdds);

  const profitIfOriginalWins =
    originalBet * (origDecimal - 1) - hedge;
  const profitIfHedgeWins =
    hedge * (hedgeDecimal - 1) - originalBet;

  return Math.min(profitIfOriginalWins, profitIfHedgeWins);
}

/**
 * Two-way arbitrage detection.
 *
 * isArb: 1/dec1 + 1/dec2 < 1
 * edge: 1 - sum of inverse decimal odds
 * Stakes split for equal profit on $100 total:
 *   stake1 = 100 / dec1 / (1/dec1 + 1/dec2)
 *   stake2 = 100 / dec2 / (1/dec1 + 1/dec2)
 *
 * Note: the function name in the spec contains a space ("arb Opportunity")
 * which is not valid JS, so we export it as arbOpportunity.
 */
export function arbOpportunity(
  side1Odds: number,
  side2Odds: number,
): { isArb: boolean; edge: number; stake1: number; stake2: number } {
  const dec1 = americanToDecimal(side1Odds);
  const dec2 = americanToDecimal(side2Odds);

  const inv1 = 1 / dec1;
  const inv2 = 1 / dec2;
  const sumInv = inv1 + inv2;

  const isArb = sumInv < 1;
  const edge = 1 - sumInv;

  // Equal-profit stakes on $100 total
  const stake1 = isArb ? (100 * inv1) / sumInv : 0;
  const stake2 = isArb ? (100 * inv2) / sumInv : 0;

  return { isArb, edge, stake1, stake2 };
}

// ---------------------------------------------------------------------------
// 7. PREDICTION CALIBRATION METRICS
// ---------------------------------------------------------------------------

/**
 * Brier Score = mean squared error between predicted probabilities and binary outcomes.
 *
 * Lower is better. Perfect = 0.
 */
export function brierScore(
  predictions: number[],
  outcomes: number[],
): number {
  const len = Math.min(predictions.length, outcomes.length);
  if (len === 0) return 0;
  let sum = 0;
  for (let i = 0; i < len; i++) {
    const p = predictions[i] ?? 0;
    const o = outcomes[i] ?? 0;
    sum += (p - o) ** 2;
  }
  return sum / len;
}

/**
 * Log Loss (binary cross-entropy).
 *
 * Predictions clamped to [0.001, 0.999] to avoid log(0).
 */
export function logLoss(
  predictions: number[],
  outcomes: number[],
): number {
  const len = Math.min(predictions.length, outcomes.length);
  if (len === 0) return 0;
  let sum = 0;
  for (let i = 0; i < len; i++) {
    const raw = predictions[i] ?? 0;
    const p = Math.max(0.001, Math.min(0.999, raw));
    const o = outcomes[i] ?? 0;
    sum += o * Math.log(p) + (1 - o) * Math.log(1 - p);
  }
  return -sum / len;
}

/**
 * Reliability diagram data.
 *
 * Bins predictions into `bins` equal-width buckets [0,1) and computes
 * average predicted probability and observed outcome rate per bin.
 */
export function reliability(
  predictions: number[],
  outcomes: number[],
  bins: number = 10,
): { bin: number; avgPred: number; avgOutcome: number; count: number }[] {
  const len = Math.min(predictions.length, outcomes.length);
  const numBins = bins > 0 ? bins : 10;

  interface BinAcc {
    predSum: number;
    outcomeSum: number;
    count: number;
  }

  const buckets: BinAcc[] = Array.from({ length: numBins }, () => ({
    predSum: 0,
    outcomeSum: 0,
    count: 0,
  }));

  for (let i = 0; i < len; i++) {
    const p = predictions[i] ?? 0;
    const o = outcomes[i] ?? 0;
    const binIdx = Math.min(Math.floor(p * numBins), numBins - 1);
    const bucket = buckets[binIdx];
    if (bucket) {
      bucket.predSum += p;
      bucket.outcomeSum += o;
      bucket.count += 1;
    }
  }

  return buckets.map((b, idx) => ({
    bin: idx / numBins,
    avgPred: b.count > 0 ? b.predSum / b.count : (idx + 0.5) / numBins,
    avgOutcome: b.count > 0 ? b.outcomeSum / b.count : 0,
    count: b.count,
  }));
}

/**
 * Expected Calibration Error.
 *
 * ECE = sum_bins(|avgPred - avgOutcome| * count / N)
 */
export function calibrationError(
  predictions: number[],
  outcomes: number[],
): number {
  const len = Math.min(predictions.length, outcomes.length);
  if (len === 0) return 0;
  const bins = reliability(predictions, outcomes);
  let ece = 0;
  for (const b of bins) {
    ece += Math.abs(b.avgPred - b.avgOutcome) * (b.count / len);
  }
  return ece;
}
