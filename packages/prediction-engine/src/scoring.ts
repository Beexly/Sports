import type {
  OddsInput,
  BookmakerOddsInput,
  ScoredPick,
  PickType,
  PickTier,
} from "@sports/types";
import {
  MODEL_VERSION,
  PREMIUM_CONFIDENCE_THRESHOLD,
  MIN_PUBLISH_CONFIDENCE,
  WEIGHTS,
  MIN_BOOKMAKERS,
} from "./constants.js";

// ============================================================
// Utility: convert American odds to implied probability
// ============================================================

export function americanToImpliedProbability(americanOdds: number): number {
  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  } else {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
}

// ============================================================
// Utility: clamp a number between min and max
// ============================================================

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================================
// Compute consensus score across bookmakers for a given side
// Returns: { consensusPct: 0–1, avgLine: number | null }
// ============================================================

function computeSpreadConsensus(
  odds: BookmakerOddsInput[]
): { homeFavoredPct: number; avgSpread: number | null } {
  const spreads = odds
    .filter((o) => o.market === "SPREADS" && o.spread !== undefined)
    .map((o) => o.spread as number);

  if (spreads.length === 0) return { homeFavoredPct: 0.5, avgSpread: null };

  const homeFavored = spreads.filter((s) => s < 0).length;
  const homeFavoredPct = homeFavored / spreads.length;
  const avgSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length;

  return { homeFavoredPct, avgSpread };
}

function computeTotalConsensus(
  odds: BookmakerOddsInput[]
): { avgTotal: number | null; overFavoredPct: number } {
  const totals = odds
    .filter((o) => o.market === "TOTALS")
    .map((o) => ({
      total: o.total,
      overPrice: o.overPrice,
      underPrice: o.underPrice,
    }))
    .filter((o) => o.total !== undefined);

  if (totals.length === 0) return { avgTotal: null, overFavoredPct: 0.5 };

  const avgTotal =
    (totals.reduce((a, b) => a + (b.total ?? 0), 0)) / totals.length;

  // Over is favored when its price is lower (less negative) = easier to back
  const overFavored = totals.filter(
    (o) =>
      o.overPrice !== undefined &&
      o.underPrice !== undefined &&
      o.overPrice < o.underPrice
  ).length;

  const overFavoredPct = totals.length > 0 ? overFavored / totals.length : 0.5;

  return { avgTotal, overFavoredPct };
}

function computeMoneylineConsensus(
  odds: BookmakerOddsInput[],
  homeTeam: string,
  awayTeam: string
): { homeImpliedProb: number; awayImpliedProb: number } {
  const h2hOdds = odds.filter(
    (o) => o.market === "H2H" && o.homePrice !== undefined
  );

  if (h2hOdds.length === 0) {
    return { homeImpliedProb: 0.5, awayImpliedProb: 0.5 };
  }

  const homeProbs = h2hOdds.map((o) =>
    americanToImpliedProbability(o.homePrice!)
  );
  const awayProbs = h2hOdds.map((o) =>
    americanToImpliedProbability(o.awayPrice!)
  );

  const avgHome = homeProbs.reduce((a, b) => a + b, 0) / homeProbs.length;
  const avgAway = awayProbs.reduce((a, b) => a + b, 0) / awayProbs.length;

  return { homeImpliedProb: avgHome, awayImpliedProb: avgAway };
}

// ============================================================
// Score a single pick
// ============================================================

function scoreSpreadPick(
  input: OddsInput
): ScoredPick | null {
  const spreadOdds = input.bookmakerOdds.filter(
    (o) => o.market === "SPREADS" && o.spread !== undefined
  );

  if (spreadOdds.length < MIN_BOOKMAKERS) return null;

  const { homeFavoredPct, avgSpread } = computeSpreadConsensus(input.bookmakerOdds);

  if (avgSpread === null) return null;

  const homeIsChosen = homeFavoredPct >= 0.5;
  const consensusPct = homeIsChosen ? homeFavoredPct : 1 - homeFavoredPct;
  const chosenTeam = homeIsChosen ? input.homeTeam : input.awayTeam;
  const chosenSpread = homeIsChosen ? avgSpread : -avgSpread;

  // Base score from consensus implied probability
  const baseScore = clamp(consensusPct * 100, 0, 60);

  // Consensus bonus (only if strong consensus)
  const consensusBonus =
    consensusPct >= WEIGHTS.CONSENSUS_MIN_PCT
      ? (consensusPct - 0.5) * 2 * WEIGHTS.CONSENSUS_MAX_BONUS
      : 0;

  // Market depth bonus
  const marketDepthBonus = clamp(
    (spreadOdds.length / WEIGHTS.MARKET_DEPTH_IDEAL_COUNT) *
      WEIGHTS.MARKET_DEPTH_MAX_BONUS,
    0,
    WEIGHTS.MARKET_DEPTH_MAX_BONUS
  );

  const confidence = Math.round(
    clamp(baseScore + consensusBonus + marketDepthBonus, 0, 100)
  );

  if (confidence < MIN_PUBLISH_CONFIDENCE) return null;

  const spreadDisplay = chosenSpread > 0 ? `+${chosenSpread.toFixed(1)}` : chosenSpread.toFixed(1);
  const selection = `${chosenTeam} ${spreadDisplay}`;
  const tier: PickTier =
    confidence >= PREMIUM_CONFIDENCE_THRESHOLD ? "PREMIUM" : "FREE";

  const reasoning =
    `${spreadOdds.length} bookmakers price ${chosenTeam} ${spreadDisplay}. ` +
    `${Math.round(consensusPct * 100)}% bookmaker consensus on this side. ` +
    `Avg spread: ${chosenSpread.toFixed(1)}. Confidence: ${confidence}/100.`;

  return {
    gameId: input.gameId,
    pickType: "SPREAD",
    selection,
    line: chosenSpread,
    confidence,
    tier,
    reasoning,
    modelVersion: MODEL_VERSION,
  };
}

function scoreTotalPick(input: OddsInput): ScoredPick | null {
  const totalOdds = input.bookmakerOdds.filter(
    (o) => o.market === "TOTALS" && o.total !== undefined
  );

  if (totalOdds.length < MIN_BOOKMAKERS) return null;

  const { avgTotal, overFavoredPct } = computeTotalConsensus(input.bookmakerOdds);

  if (avgTotal === null) return null;

  const overIsChosen = overFavoredPct >= 0.5;
  const consensusPct = overIsChosen ? overFavoredPct : 1 - overFavoredPct;

  if (consensusPct < 0.55) return null; // Need at least slight consensus for totals

  const baseScore = clamp(consensusPct * 100, 0, 60);
  const consensusBonus =
    consensusPct >= WEIGHTS.CONSENSUS_MIN_PCT
      ? (consensusPct - 0.5) * 2 * WEIGHTS.CONSENSUS_MAX_BONUS
      : 0;
  const marketDepthBonus = clamp(
    (totalOdds.length / WEIGHTS.MARKET_DEPTH_IDEAL_COUNT) *
      WEIGHTS.MARKET_DEPTH_MAX_BONUS,
    0,
    WEIGHTS.MARKET_DEPTH_MAX_BONUS
  );

  const confidence = Math.round(
    clamp(baseScore + consensusBonus + marketDepthBonus, 0, 100)
  );

  if (confidence < MIN_PUBLISH_CONFIDENCE) return null;

  const direction = overIsChosen ? "OVER" : "UNDER";
  const selection = `${direction} ${avgTotal.toFixed(1)}`;
  const tier: PickTier =
    confidence >= PREMIUM_CONFIDENCE_THRESHOLD ? "PREMIUM" : "FREE";

  const reasoning =
    `${totalOdds.length} bookmakers set total at ${avgTotal.toFixed(1)}. ` +
    `${Math.round(consensusPct * 100)}% favor the ${direction}. ` +
    `Confidence: ${confidence}/100.`;

  return {
    gameId: input.gameId,
    pickType: "TOTAL",
    selection,
    line: avgTotal,
    confidence,
    tier,
    reasoning,
    modelVersion: MODEL_VERSION,
  };
}

function scoreMoneylinePick(input: OddsInput): ScoredPick | null {
  const h2hOdds = input.bookmakerOdds.filter(
    (o) => o.market === "H2H" && o.homePrice !== undefined
  );

  if (h2hOdds.length < MIN_BOOKMAKERS) return null;

  const { homeImpliedProb, awayImpliedProb } = computeMoneylineConsensus(
    input.bookmakerOdds,
    input.homeTeam,
    input.awayTeam
  );

  const homeIsChosen = homeImpliedProb > awayImpliedProb;
  const consensusPct = homeIsChosen ? homeImpliedProb : awayImpliedProb;

  // For moneyline, only pick if strong implied probability (> 60%)
  if (consensusPct < 0.58) return null;

  const chosenTeam = homeIsChosen ? input.homeTeam : input.awayTeam;

  // Average price for chosen side
  const prices = h2hOdds.map((o) =>
    homeIsChosen ? o.homePrice! : o.awayPrice!
  ).filter((p) => p !== undefined);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

  // Base score from implied probability
  const baseScore = clamp(consensusPct * 100, 0, 70);

  // Market depth bonus
  const marketDepthBonus = clamp(
    (h2hOdds.length / WEIGHTS.MARKET_DEPTH_IDEAL_COUNT) *
      WEIGHTS.MARKET_DEPTH_MAX_BONUS,
    0,
    WEIGHTS.MARKET_DEPTH_MAX_BONUS
  );

  const confidence = Math.round(
    clamp(baseScore + marketDepthBonus, 0, 100)
  );

  if (confidence < MIN_PUBLISH_CONFIDENCE) return null;

  const priceDisplay =
    avgPrice > 0 ? `+${Math.round(avgPrice)}` : Math.round(avgPrice).toString();
  const selection = `${chosenTeam} ML (${priceDisplay})`;
  const tier: PickTier =
    confidence >= PREMIUM_CONFIDENCE_THRESHOLD ? "PREMIUM" : "FREE";

  const reasoning =
    `${h2hOdds.length} bookmakers show ${chosenTeam} with ${Math.round(consensusPct * 100)}% implied probability. ` +
    `Avg ML price: ${priceDisplay}. Confidence: ${confidence}/100.`;

  return {
    gameId: input.gameId,
    pickType: "MONEYLINE",
    selection,
    line: avgPrice,
    confidence,
    tier,
    reasoning,
    modelVersion: MODEL_VERSION,
  };
}

// ============================================================
// Main scoring function — generates picks for a game
// Returns ranked picks (highest confidence first)
// ============================================================

export function scoreGame(input: OddsInput): ScoredPick[] {
  const picks: ScoredPick[] = [];

  const spreadPick = scoreSpreadPick(input);
  if (spreadPick) picks.push(spreadPick);

  const totalPick = scoreTotalPick(input);
  if (totalPick) picks.push(totalPick);

  const moneylinePick = scoreMoneylinePick(input);
  if (moneylinePick) picks.push(moneylinePick);

  // Rank by confidence descending
  return picks.sort((a, b) => b.confidence - a.confidence);
}

// ============================================================
// Score multiple games
// ============================================================

export function scoreGames(inputs: OddsInput[]): ScoredPick[] {
  const allPicks: ScoredPick[] = [];

  for (const input of inputs) {
    const picks = scoreGame(input);
    allPicks.push(...picks);
  }

  // Sort by confidence descending
  return allPicks.sort((a, b) => b.confidence - a.confidence);
}
