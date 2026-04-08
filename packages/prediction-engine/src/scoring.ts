import type {
  OddsInput,
  BookmakerOddsInput,
  ScoredPick,
  PickType,
  PickTier,
  PickGrade,
  RiskLevel,
  FactorBreakdown,
  FactorDetail,
} from "@sports/types";
import { computePickGrade } from "@sports/types";
import {
  MODEL_VERSION,
  PREMIUM_CONFIDENCE_THRESHOLD,
  MIN_PUBLISH_CONFIDENCE,
  WEIGHTS,
  RISK_THRESHOLDS,
  MIN_BOOKMAKERS,
} from "./constants.js";
import { computeGameContext } from "./game-context.js";

// ============================================================
// Utility: convert American odds to implied probability
// ============================================================

export function americanToImpliedProbability(americanOdds: number): number {
  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  }
  return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
}

// ============================================================
// Utility: remove vig to get fair-value probability
// ============================================================

export function removeVig(homeProb: number, awayProb: number): { home: number; away: number } {
  const total = homeProb + awayProb;
  if (total === 0) return { home: 0.5, away: 0.5 };
  return { home: homeProb / total, away: awayProb / total };
}

// ============================================================
// Utility: clamp a number between min and max
// ============================================================

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================================
// Compute risk level from market signals
// ============================================================

function computeRiskLevel(
  bookmakerCount: number,
  consensusPct: number,
  lineMovementScore: number
): RiskLevel {
  // Fast-moving line = steam
  if (Math.abs(lineMovementScore) >= 12) return "LINE_STEAM";

  // Very thin market
  if (bookmakerCount < RISK_THRESHOLDS.HIGH_VARIANCE_BOOK_THRESHOLD) return "HIGH_VARIANCE";

  // Low consensus = unclear direction
  if (consensusPct < RISK_THRESHOLDS.HIGH_VARIANCE_CONSENSUS_THRESHOLD) return "HIGH_VARIANCE";

  // Strong consensus + deep market = low risk
  if (
    consensusPct >= RISK_THRESHOLDS.LOW_RISK_CONSENSUS_THRESHOLD &&
    bookmakerCount >= RISK_THRESHOLDS.LOW_RISK_BOOK_THRESHOLD
  ) {
    return "LOW_RISK";
  }

  return "MODERATE";
}

// ============================================================
// Compute consensus component score (0 to WEIGHTS.CONSENSUS_COMPONENT_MAX)
// ============================================================

function computeConsensusScore(consensusPct: number): {
  score: number;
  factor: FactorDetail;
} {
  const effectivePct = Math.max(0, consensusPct - 0.5); // only count above 50%
  const normalized = effectivePct / 0.5; // 0–1 where 1 = 100% consensus
  const score = clamp(normalized * WEIGHTS.CONSENSUS_COMPONENT_MAX, 0, WEIGHTS.CONSENSUS_COMPONENT_MAX);

  const pctDisplay = Math.round(consensusPct * 100);
  const impact: FactorDetail["impact"] =
    consensusPct >= WEIGHTS.CONSENSUS_MIN_PCT ? "positive" : "negative";

  return {
    score,
    factor: {
      name: "Bookmaker Consensus",
      impact,
      description: `${pctDisplay}% of bookmakers align on this side`,
      weight: score,
    },
  };
}

// ============================================================
// Compute market depth component (0 to WEIGHTS.MARKET_DEPTH_COMPONENT_MAX)
// ============================================================

function computeMarketDepthScore(bookmakerCount: number): {
  score: number;
  factor: FactorDetail;
} {
  const normalized = Math.min(bookmakerCount / WEIGHTS.MARKET_DEPTH_IDEAL_BOOKS, 1);
  const score = normalized * WEIGHTS.MARKET_DEPTH_COMPONENT_MAX;
  const impact: FactorDetail["impact"] = bookmakerCount >= 5 ? "positive" : bookmakerCount >= 3 ? "neutral" : "negative";

  return {
    score,
    factor: {
      name: "Market Coverage",
      impact,
      description: `${bookmakerCount} bookmaker${bookmakerCount !== 1 ? "s" : ""} pricing this market`,
      weight: score,
    },
  };
}

// ============================================================
// Compute edge score — net pricing advantage (0 to WEIGHTS.EDGE_COMPONENT_MAX)
// ============================================================

function computeEdgeScore(
  pickedSideFairProb: number,
  pickedSideAvgPrice: number
): {
  rawEdge: number;    // in probability units
  score: number;      // 0–EDGE_COMPONENT_MAX
  factor: FactorDetail;
} {
  // Convert avg bookmaker price to implied prob
  const offeredProb = americanToImpliedProbability(pickedSideAvgPrice);

  // Edge = fair value - offered price (positive = we have value)
  const rawEdge = pickedSideFairProb - offeredProb;

  // Normalize: edge of +5% = full score, edge of 0% = half score
  const normalized = clamp((rawEdge + 0.05) / 0.10, 0, 1);
  const score = normalized * WEIGHTS.EDGE_COMPONENT_MAX;

  const pctEdge = Math.round(rawEdge * 100 * 10) / 10;
  const impact: FactorDetail["impact"] = rawEdge > 0.01 ? "positive" : rawEdge < -0.01 ? "negative" : "neutral";

  return {
    rawEdge,
    score,
    factor: {
      name: "Pricing Edge",
      impact,
      description: rawEdge > 0.01
        ? `Model estimates +${pctEdge}% edge vs market price`
        : rawEdge < -0.01
        ? `Market price appears ${Math.abs(pctEdge)}% overvalued`
        : "Near fair value — minimal pricing edge",
      weight: score,
    },
  };
}

// ============================================================
// Compute volatility penalty (0 to WEIGHTS.VOLATILITY_PENALTY_MAX)
// ============================================================

function computeVolatilityPenalty(
  bookmakerCount: number,
  spreadOfSpreads: number  // standard deviation of spread values across books
): {
  penalty: number;
  factor: FactorDetail | null;
} {
  let penalty = 0;
  let description = "";

  // Thin market penalty
  if (bookmakerCount < 3) {
    penalty -= 10;
    description = "Thin market — limited price discovery";
  } else if (bookmakerCount < 5) {
    penalty -= 5;
    description = "Limited bookmaker coverage";
  }

  // Spread disagreement penalty
  if (spreadOfSpreads > 1.5) {
    penalty -= 5;
    description += (description ? "; " : "") + "High line variance across books";
  }

  if (penalty === 0) return { penalty: 0, factor: null };

  return {
    penalty: clamp(penalty, WEIGHTS.VOLATILITY_PENALTY_MAX, 0),
    factor: {
      name: "Market Risk",
      impact: "negative",
      description,
      weight: penalty,
    },
  };
}

// ============================================================
// Score SPREAD pick — returns null if insufficient data
// ============================================================

function scoreSpreadPick(input: OddsInput, fetchedAt: Date): ScoredPick | null {
  const spreadOdds = input.bookmakerOdds.filter(
    (o) => o.market === "SPREADS" && o.spread !== undefined
  );
  if (spreadOdds.length < MIN_BOOKMAKERS) return null;

  const spreads = spreadOdds.map((o) => o.spread as number);
  const avgSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length;

  const homeFavoredCount = spreads.filter((s) => s < 0).length;
  const homeFavoredPct = homeFavoredCount / spreads.length;
  const homeIsChosen = homeFavoredPct >= 0.5;
  const consensusPct = homeIsChosen ? homeFavoredPct : 1 - homeFavoredPct;

  if (consensusPct < WEIGHTS.CONSENSUS_MIN_PCT) return null;

  // Spread dispersion — measure of line disagreement
  const spreadMean = avgSpread;
  const variance = spreads.reduce((acc, s) => acc + Math.pow(s - spreadMean, 2), 0) / spreads.length;
  const spreadOfSpreads = Math.sqrt(variance);

  // Chosen side
  const chosenTeam = homeIsChosen ? input.homeTeam : input.awayTeam;
  const chosenSpread = homeIsChosen ? avgSpread : -avgSpread;
  const pickedSide = homeIsChosen ? "HOME" : "AWAY";

  // Average price for chosen side
  const chosenPrices = spreadOdds
    .map((o) => (homeIsChosen ? o.homeSpreadPrice : o.awaySpreadPrice))
    .filter((p): p is number => p !== undefined);
  const avgPrice =
    chosenPrices.length > 0
      ? chosenPrices.reduce((a, b) => a + b, 0) / chosenPrices.length
      : -110;

  // Fair value — assume consensus spread IS fair line, edge from vig removal
  const homeImpliedAvg =
    spreadOdds.reduce((acc, o) => acc + americanToImpliedProbability(o.homeSpreadPrice ?? -110), 0) /
    spreadOdds.length;
  const awayImpliedAvg =
    spreadOdds.reduce((acc, o) => acc + americanToImpliedProbability(o.awaySpreadPrice ?? -110), 0) /
    spreadOdds.length;
  const fair = removeVig(homeImpliedAvg, awayImpliedAvg);
  const fairProb = homeIsChosen ? fair.home : fair.away;

  // Component scores
  const { score: consensusScore, factor: consensusFactor } = computeConsensusScore(consensusPct);
  const { score: depthScore, factor: depthFactor } = computeMarketDepthScore(spreadOdds.length);
  const { score: edgeComponentScore, rawEdge, factor: edgeFactor } = computeEdgeScore(fairProb, avgPrice);
  const { penalty: volatilityPenalty, factor: volatilityFactor } =
    computeVolatilityPenalty(spreadOdds.length, spreadOfSpreads);

  // Compute ML fair probability for cross-market validation
  const h2hForContext = input.bookmakerOdds.filter(
    (o) => o.market === "H2H" && o.homePrice !== undefined && o.awayPrice !== undefined
  );
  let mlFairProbHome: number | null = null;
  if (h2hForContext.length >= 2) {
    const homeImplied = h2hForContext.map((o) => americanToImpliedProbability(o.homePrice!));
    const awayImplied = h2hForContext.map((o) => americanToImpliedProbability(o.awayPrice!));
    const avgH = homeImplied.reduce((a, b) => a + b, 0) / homeImplied.length;
    const avgA = awayImplied.reduce((a, b) => a + b, 0) / awayImplied.length;
    const fairML = removeVig(avgH, avgA);
    mlFairProbHome = fairML.home;
  }

  // Game context signals
  const ctx = input.context
    ? computeGameContext(
        {
          ...input.context,
          hasSpreadMarket: true,
          hasTotalMarket: input.bookmakerOdds.some((o) => o.market === "TOTALS"),
          hasH2HMarket: input.bookmakerOdds.some((o) => o.market === "H2H"),
          bookmakerCoverageMax: input.context.bookmakerCoverageMax ?? spreadOdds.length,
          mlFairProbHome,
        },
        "SPREAD",
        pickedSide
      )
    : null;

  const lineMovementScore = ctx?.lineMovementScore ?? 0;
  const restAdvantageScore = ctx?.restAdvantageScore ?? 0;
  const historicalFormScore = ctx?.historicalFormScore ?? 0;
  const dataQualityPenalty = ctx?.dataQualityPenalty ?? 0;
  const headToHeadScore = ctx?.headToHeadScore ?? 0;
  const venueFormScore = ctx?.venueFormScore ?? 0;
  const uncertaintyPenalty = ctx?.uncertaintyPenalty ?? 0;
  const crossMarketScore = ctx?.crossMarketScore ?? 0;
  const dataQualityScore = ctx?.dataQualityScore ?? 100;

  const contextFactors: FactorDetail[] = ctx?.factors ?? [];

  const factors: FactorDetail[] = [
    consensusFactor,
    depthFactor,
    edgeFactor,
    ...(volatilityFactor ? [volatilityFactor] : []),
    ...contextFactors,
  ];

  const confidence = Math.round(
    clamp(
      consensusScore + depthScore + edgeComponentScore + volatilityPenalty +
      lineMovementScore + restAdvantageScore + historicalFormScore + dataQualityPenalty +
      headToHeadScore + venueFormScore + uncertaintyPenalty + crossMarketScore + 10,
      0, 100
    )
  );

  if (confidence < MIN_PUBLISH_CONFIDENCE) return null;

  const edgeScore = clamp(Math.round((edgeComponentScore / WEIGHTS.EDGE_COMPONENT_MAX) * 100), 0, 100);
  const pickGrade: PickGrade = computePickGrade(confidence, edgeScore);
  const riskLevel: RiskLevel = computeRiskLevel(spreadOdds.length, consensusPct, lineMovementScore);
  const tier: PickTier = confidence >= PREMIUM_CONFIDENCE_THRESHOLD ? "PREMIUM" : "FREE";

  const spreadDisplay =
    chosenSpread > 0 ? `+${chosenSpread.toFixed(1)}` : chosenSpread.toFixed(1);
  const selection = `${chosenTeam} ${spreadDisplay}`;

  // Build contextual reasoning clauses
  const contextClauses: string[] = [];
  if (restAdvantageScore > 3) contextClauses.push("rest advantage");
  else if (restAdvantageScore < -3) contextClauses.push("rest disadvantage");
  if (headToHeadScore > 0) contextClauses.push("favorable H2H history");
  else if (headToHeadScore < 0) contextClauses.push("poor H2H history");
  if (venueFormScore > 0) contextClauses.push("strong venue form");
  if (lineMovementScore > 5) contextClauses.push("confirming line movement");
  else if (lineMovementScore < -5) contextClauses.push("fading line movement");
  if (uncertaintyPenalty < -3) contextClauses.push("conflicting signals noted");

  const contextNote = contextClauses.length > 0
    ? ` Context: ${contextClauses.join(", ")}.`
    : "";

  const reasoning =
    `${chosenTeam} ${spreadDisplay} backed by ${Math.round(consensusPct * 100)}% of ${spreadOdds.length} ` +
    `bookmakers. Fair value: ${Math.round(fairProb * 100)}%. ` +
    `Edge: ${rawEdge > 0 ? "+" : ""}${Math.round(rawEdge * 100 * 10) / 10}%.` +
    contextNote +
    ` Confidence: ${confidence}/100 (${pickGrade.replace(/_/g, " ")}).`;

  const reasoningShort =
    `${Math.round(consensusPct * 100)}% bookmaker consensus on ${chosenTeam} ${spreadDisplay}.` +
    (contextClauses.length > 0 ? ` ${contextClauses[0]!.charAt(0).toUpperCase() + contextClauses[0]!.slice(1)} noted.` : "");

  const factorBreakdown: FactorBreakdown = {
    consensusScore,
    marketDepthScore: depthScore,
    edgeScore: edgeComponentScore,
    lineMovementScore,
    volatilityPenalty,
    headToHeadScore: headToHeadScore !== 0 ? headToHeadScore : undefined,
    venueFormScore: venueFormScore !== 0 ? venueFormScore : undefined,
    uncertaintyPenalty: uncertaintyPenalty !== 0 ? uncertaintyPenalty : undefined,
    crossMarketScore: crossMarketScore !== 0 ? crossMarketScore : undefined,
    dataQualityScore,
    factors,
  };

  return {
    gameId: input.gameId,
    pickType: "SPREAD",
    selection,
    line: chosenSpread,
    confidence,
    edgeScore,
    consensusPct,
    bookmakerCount: spreadOdds.length,
    dataQualityScore,
    tier,
    pickGrade,
    riskLevel,
    reasoning,
    reasoningShort,
    factorBreakdown,
    modelVersion: MODEL_VERSION,
    dataFreshnessAt: fetchedAt,
  };
}

// ============================================================
// Score TOTAL pick
// ============================================================

function scoreTotalPick(input: OddsInput, fetchedAt: Date): ScoredPick | null {
  const totalOdds = input.bookmakerOdds.filter(
    (o) => o.market === "TOTALS" && o.total !== undefined
  );
  if (totalOdds.length < MIN_BOOKMAKERS) return null;

  const totals = totalOdds.map((o) => o.total as number);
  const avgTotal = totals.reduce((a, b) => a + b, 0) / totals.length;

  // Consensus: over is favored when over price < under price (closer to -110)
  const overFavored = totalOdds.filter(
    (o) =>
      o.overPrice !== undefined &&
      o.underPrice !== undefined &&
      Math.abs(o.overPrice) <= Math.abs(o.underPrice)
  ).length;
  const overFavoredPct = totalOdds.length > 0 ? overFavored / totalOdds.length : 0.5;
  const overIsChosen = overFavoredPct >= 0.5;
  const consensusPct = overIsChosen ? overFavoredPct : 1 - overFavoredPct;

  if (consensusPct < WEIGHTS.CONSENSUS_MIN_PCT) return null;

  const pickedSide = overIsChosen ? "OVER" : "UNDER";

  // Avg price for chosen direction
  const chosenPrices = totalOdds
    .map((o) => (overIsChosen ? o.overPrice : o.underPrice))
    .filter((p): p is number => p !== undefined);
  const avgPrice =
    chosenPrices.length > 0
      ? chosenPrices.reduce((a, b) => a + b, 0) / chosenPrices.length
      : -110;

  // Fair value
  const overImpliedAvg =
    totalOdds
      .filter((o) => o.overPrice !== undefined)
      .reduce((acc, o) => acc + americanToImpliedProbability(o.overPrice!), 0) /
    Math.max(totalOdds.filter((o) => o.overPrice !== undefined).length, 1);
  const underImpliedAvg =
    totalOdds
      .filter((o) => o.underPrice !== undefined)
      .reduce((acc, o) => acc + americanToImpliedProbability(o.underPrice!), 0) /
    Math.max(totalOdds.filter((o) => o.underPrice !== undefined).length, 1);

  const fair = removeVig(overImpliedAvg, underImpliedAvg);
  const fairProb = overIsChosen ? fair.home : fair.away;

  // Total dispersion
  const totalMean = avgTotal;
  const variance = totals.reduce((acc, t) => acc + Math.pow(t - totalMean, 2), 0) / totals.length;
  const totalDispersion = Math.sqrt(variance);

  const { score: consensusScore, factor: consensusFactor } = computeConsensusScore(consensusPct);
  const { score: depthScore, factor: depthFactor } = computeMarketDepthScore(totalOdds.length);
  const { score: edgeComponentScore, rawEdge, factor: edgeFactor } = computeEdgeScore(fairProb, avgPrice);
  const { penalty: volatilityPenalty, factor: volatilityFactor } =
    computeVolatilityPenalty(totalOdds.length, totalDispersion);

  // Game context signals
  const ctx = input.context
    ? computeGameContext(
        {
          ...input.context,
          hasSpreadMarket: input.bookmakerOdds.some((o) => o.market === "SPREADS"),
          hasTotalMarket: true,
          hasH2HMarket: input.bookmakerOdds.some((o) => o.market === "H2H"),
          bookmakerCoverageMax: input.context.bookmakerCoverageMax ?? totalOdds.length,
        },
        "TOTAL",
        pickedSide
      )
    : null;

  const lineMovementScore = ctx?.lineMovementScore ?? 0;
  const dataQualityPenalty = ctx?.dataQualityPenalty ?? 0;
  const dataQualityScore = ctx?.dataQualityScore ?? 100;
  const contextFactors: FactorDetail[] = ctx?.factors ?? [];

  const factors: FactorDetail[] = [
    consensusFactor,
    depthFactor,
    edgeFactor,
    ...(volatilityFactor ? [volatilityFactor] : []),
    ...contextFactors,
  ];

  const confidence = Math.round(
    clamp(
      consensusScore + depthScore + edgeComponentScore + volatilityPenalty +
      lineMovementScore + dataQualityPenalty + 10,
      0, 100
    )
  );

  if (confidence < MIN_PUBLISH_CONFIDENCE) return null;

  const edgeScore = clamp(Math.round((edgeComponentScore / WEIGHTS.EDGE_COMPONENT_MAX) * 100), 0, 100);
  const pickGrade: PickGrade = computePickGrade(confidence, edgeScore);
  const riskLevel: RiskLevel = computeRiskLevel(totalOdds.length, consensusPct, lineMovementScore);
  const tier: PickTier = confidence >= PREMIUM_CONFIDENCE_THRESHOLD ? "PREMIUM" : "FREE";

  const direction = overIsChosen ? "OVER" : "UNDER";
  const selection = `${direction} ${avgTotal.toFixed(1)}`;

  const movementNote = lineMovementScore > 5 ? " Total line moving in pick direction." :
    lineMovementScore < -5 ? " Total line moving against pick direction." : "";

  const reasoning =
    `${direction} ${avgTotal.toFixed(1)} backed by ${Math.round(consensusPct * 100)}% of ${totalOdds.length} ` +
    `bookmakers. Fair value: ${Math.round(fairProb * 100)}%. ` +
    `Edge: ${rawEdge > 0 ? "+" : ""}${Math.round(rawEdge * 100 * 10) / 10}%.` +
    movementNote +
    ` Confidence: ${confidence}/100 (${pickGrade.replace(/_/g, " ")}).`;

  const reasoningShort =
    `${Math.round(consensusPct * 100)}% of bookmakers favor ${direction} ${avgTotal.toFixed(1)}.`;

  const factorBreakdown: FactorBreakdown = {
    consensusScore,
    marketDepthScore: depthScore,
    edgeScore: edgeComponentScore,
    lineMovementScore,
    volatilityPenalty,
    dataQualityScore,
    factors,
  };

  return {
    gameId: input.gameId,
    pickType: "TOTAL",
    selection,
    line: avgTotal,
    confidence,
    edgeScore,
    consensusPct,
    bookmakerCount: totalOdds.length,
    dataQualityScore,
    tier,
    pickGrade,
    riskLevel,
    reasoning,
    reasoningShort,
    factorBreakdown,
    modelVersion: MODEL_VERSION,
    dataFreshnessAt: fetchedAt,
  };
}

// ============================================================
// Score MONEYLINE pick
// ============================================================

function scoreMoneylinePick(input: OddsInput, fetchedAt: Date): ScoredPick | null {
  const h2hOdds = input.bookmakerOdds.filter(
    (o) => o.market === "H2H" && o.homePrice !== undefined && o.awayPrice !== undefined
  );
  if (h2hOdds.length < MIN_BOOKMAKERS) return null;

  // Compute avg implied probs
  const homeImplied = h2hOdds.map((o) => americanToImpliedProbability(o.homePrice!));
  const awayImplied = h2hOdds.map((o) => americanToImpliedProbability(o.awayPrice!));

  const avgHomeImplied = homeImplied.reduce((a, b) => a + b, 0) / homeImplied.length;
  const avgAwayImplied = awayImplied.reduce((a, b) => a + b, 0) / awayImplied.length;

  const fair = removeVig(avgHomeImplied, avgAwayImplied);
  const homeIsChosen = fair.home > fair.away;
  const fairProb = homeIsChosen ? fair.home : fair.away;
  const consensusPct = fairProb; // for ML, fair prob IS the consensus signal

  // Need strong conviction on ML — higher threshold
  if (fairProb < 0.58) return null;

  const chosenTeam = homeIsChosen ? input.homeTeam : input.awayTeam;
  const pickedSide = homeIsChosen ? "HOME" : "AWAY";

  const avgPrice = homeIsChosen
    ? h2hOdds.reduce((acc, o) => acc + o.homePrice!, 0) / h2hOdds.length
    : h2hOdds.reduce((acc, o) => acc + o.awayPrice!, 0) / h2hOdds.length;

  const { score: consensusScore, factor: consensusFactor } = computeConsensusScore(consensusPct);
  const { score: depthScore, factor: depthFactor } = computeMarketDepthScore(h2hOdds.length);
  const { score: edgeComponentScore, rawEdge, factor: edgeFactor } = computeEdgeScore(fairProb, avgPrice);
  const { penalty: volatilityPenalty, factor: volatilityFactor } =
    computeVolatilityPenalty(h2hOdds.length, 0);

  // Game context signals
  const ctx = input.context
    ? computeGameContext(
        {
          ...input.context,
          hasSpreadMarket: input.bookmakerOdds.some((o) => o.market === "SPREADS"),
          hasTotalMarket: input.bookmakerOdds.some((o) => o.market === "TOTALS"),
          hasH2HMarket: true,
          bookmakerCoverageMax: input.context.bookmakerCoverageMax ?? h2hOdds.length,
        },
        "MONEYLINE",
        pickedSide
      )
    : null;

  const lineMovementScore = ctx?.lineMovementScore ?? 0;
  const restAdvantageScore = ctx?.restAdvantageScore ?? 0;
  const historicalFormScore = ctx?.historicalFormScore ?? 0;
  const dataQualityPenalty = ctx?.dataQualityPenalty ?? 0;
  const headToHeadScore = ctx?.headToHeadScore ?? 0;
  const venueFormScore = ctx?.venueFormScore ?? 0;
  const uncertaintyPenalty = ctx?.uncertaintyPenalty ?? 0;
  const dataQualityScore = ctx?.dataQualityScore ?? 100;
  const contextFactors: FactorDetail[] = ctx?.factors ?? [];

  const factors: FactorDetail[] = [
    consensusFactor,
    depthFactor,
    edgeFactor,
    ...(volatilityFactor ? [volatilityFactor] : []),
    ...contextFactors,
  ];

  const confidence = Math.round(
    clamp(
      consensusScore + depthScore + edgeComponentScore + volatilityPenalty +
      lineMovementScore + restAdvantageScore + historicalFormScore + dataQualityPenalty +
      headToHeadScore + venueFormScore + uncertaintyPenalty + 10,
      0, 100
    )
  );

  if (confidence < MIN_PUBLISH_CONFIDENCE) return null;

  const edgeScore = clamp(Math.round((edgeComponentScore / WEIGHTS.EDGE_COMPONENT_MAX) * 100), 0, 100);
  const pickGrade: PickGrade = computePickGrade(confidence, edgeScore);
  const riskLevel: RiskLevel = computeRiskLevel(h2hOdds.length, consensusPct, lineMovementScore);
  const tier: PickTier = confidence >= PREMIUM_CONFIDENCE_THRESHOLD ? "PREMIUM" : "FREE";

  const priceDisplay =
    avgPrice > 0 ? `+${Math.round(avgPrice)}` : Math.round(avgPrice).toString();
  const selection = `${chosenTeam} ML (${priceDisplay})`;

  // Context-aware reasoning
  const contextClauses: string[] = [];
  if (restAdvantageScore > 3) contextClauses.push("rest advantage");
  else if (restAdvantageScore < -3) contextClauses.push("rest disadvantage");
  if (headToHeadScore > 0) contextClauses.push("favorable H2H history");
  else if (headToHeadScore < 0) contextClauses.push("poor H2H history");
  if (venueFormScore > 0) contextClauses.push("strong venue form");
  if (uncertaintyPenalty < -3) contextClauses.push("conflicting signals");
  const contextNote = contextClauses.length > 0
    ? ` Context: ${contextClauses.join(", ")}.`
    : "";

  const reasoning =
    `${chosenTeam} ML (${priceDisplay}): fair value ${Math.round(fairProb * 100)}% ` +
    `across ${h2hOdds.length} bookmakers. ` +
    `Edge: ${rawEdge > 0 ? "+" : ""}${Math.round(rawEdge * 100 * 10) / 10}%.` +
    contextNote +
    ` Confidence: ${confidence}/100 (${pickGrade.replace(/_/g, " ")}).`;

  const reasoningShort =
    `${chosenTeam} implied at ${Math.round(fairProb * 100)}% across ${h2hOdds.length} books.` +
    (contextClauses.length > 0 ? ` ${contextClauses[0]!.charAt(0).toUpperCase() + contextClauses[0]!.slice(1)} noted.` : "");

  const factorBreakdown: FactorBreakdown = {
    consensusScore,
    marketDepthScore: depthScore,
    edgeScore: edgeComponentScore,
    lineMovementScore,
    volatilityPenalty,
    headToHeadScore: headToHeadScore !== 0 ? headToHeadScore : undefined,
    venueFormScore: venueFormScore !== 0 ? venueFormScore : undefined,
    uncertaintyPenalty: uncertaintyPenalty !== 0 ? uncertaintyPenalty : undefined,
    dataQualityScore,
    factors,
  };

  return {
    gameId: input.gameId,
    pickType: "MONEYLINE",
    selection,
    line: avgPrice,
    confidence,
    edgeScore,
    consensusPct,
    bookmakerCount: h2hOdds.length,
    dataQualityScore,
    tier,
    pickGrade,
    riskLevel,
    reasoning,
    reasoningShort,
    factorBreakdown,
    modelVersion: MODEL_VERSION,
    dataFreshnessAt: fetchedAt,
  };
}

// ============================================================
// Score a single game — returns all publishable picks, ranked
// ============================================================

export function scoreGame(input: OddsInput, fetchedAt?: Date): ScoredPick[] {
  const now = fetchedAt ?? new Date();
  const picks: ScoredPick[] = [];

  const spreadPick = scoreSpreadPick(input, now);
  if (spreadPick) picks.push(spreadPick);

  const totalPick = scoreTotalPick(input, now);
  if (totalPick) picks.push(totalPick);

  const mlPick = scoreMoneylinePick(input, now);
  if (mlPick) picks.push(mlPick);

  return picks.sort((a, b) => b.confidence - a.confidence);
}

// ============================================================
// Score multiple games — returns all picks sorted by confidence
// ============================================================

export function scoreGames(inputs: OddsInput[], fetchedAt?: Date): ScoredPick[] {
  const allPicks: ScoredPick[] = [];
  const now = fetchedAt ?? new Date();

  for (const input of inputs) {
    allPicks.push(...scoreGame(input, now));
  }

  return allPicks.sort((a, b) => b.confidence - a.confidence);
}
