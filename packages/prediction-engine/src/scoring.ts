import type {
  OddsInput,
  ScoredPick,
  PickTier,
  PickGrade,
  RiskLevel,
  FactorBreakdown,
  FactorDetail,
  IndependentMarketFairValue,
  IndependentEdgeSummary,
} from "@sports/types";
import { computePickGrade } from "@sports/types";
import { assessEdge, type IndependentEstimate } from "./edge-engine.js";
import {
  MODEL_VERSION,
  PREMIUM_CONFIDENCE_THRESHOLD,
  MIN_PUBLISH_CONFIDENCE,
  WEIGHTS,
  RISK_THRESHOLDS,
  MIN_BOOKMAKERS,
} from "./constants.js";
import { computeGameContext } from "./game-context.js";
import { deriveRankingProbability } from "./ranking-prob.js";
import { SKELLAM_COVER_SOURCE } from "./skellam.js";
import { shinFairForSide } from "./honesty/devig-method-compare.js";

// ============================================================
// Utility: convert American odds to implied probability
// ============================================================

export function americanToImpliedProbability(americanOdds: number): number {
  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  }
  return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
}

/**
 * Inverse of americanToImpliedProbability. Needed because American odds are
 * DISCONTINUOUS across the ±100 boundary (a value like +2 is not a real price),
 * so market prices must be averaged in probability space and only then converted
 * back to a representative American price. p ≥ 0.5 → favorite (negative).
 */
export function impliedProbabilityToAmerican(p: number): number {
  const q = Math.min(0.999999, Math.max(0.000001, p));
  if (q >= 0.5) {
    return -Math.round((q / (1 - q)) * 100);
  }
  return Math.round(((1 - q) / q) * 100);
}

/**
 * Average a set of same-side American prices CORRECTLY: convert each to implied
 * probability, average the probabilities, convert the mean back to a
 * representative American price. Averaging American prices directly across books
 * that straddle pick'em produces invalid prices that map to absurd implied
 * probabilities and poison CLV. Returns null for an empty set.
 */
export function averageAmericanPrices(prices: readonly number[]): number | null {
  if (prices.length === 0) return null;
  const meanImplied =
    prices.reduce((s, price) => s + americanToImpliedProbability(price), 0) / prices.length;
  return impliedProbabilityToAmerican(meanImplied);
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
// Utility: canonical public "Edge Index" mapping
// ============================================================

/**
 * Maps a pick's engine `edgeScore` (already on a 0–100 scale — see
 * `ScoredPick.edgeScore`) to the public 0–100 "Edge Index" rendered on the
 * board / Gate Cam / Pass List.
 *
 * This is the SINGLE source of truth for the Edge Index scale. The mapping is
 * intentionally identity-with-clamp: the engine value is already normalized to
 * 0–100 in `computeEdgeScore` callers, so the only job here is to:
 *   1. Round to a whole number for display.
 *   2. Hard-clamp to [0, 100] so no upstream scale mistake (e.g. a stray ×10,
 *      or a raw-edge fraction persisted to `Game.currentEdgeIndex` /
 *      `GateDecision.edgeIndex`) can ever surface an Edge Index above 100.
 *
 * Returns `null` for nullish input so callers can render "Edge Index pending".
 *
 * A two-way market that is internally consistent can only reach an Edge Index
 * of 100 when the de-vigged fair edge is genuinely ≥ +5% (see computeEdgeScore);
 * a vanilla -110/-110 total maps to ~26, never 100.
 */
export function toEdgeIndex(edgeScore: number | null | undefined): number | null {
  if (edgeScore == null || !Number.isFinite(edgeScore)) return null;
  return clamp(Math.round(edgeScore), 0, 100);
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

function buildShadowEvidenceFactors(input: OddsInput): FactorDetail[] {
  return (input.context?.shadowEvidence ?? []).map((evidence) => ({
    name: `Shadow ${evidence.sourceCategory.replace(/_/g, " ")}`,
    impact: "neutral",
    description: evidence.whyUsedOrBlocked,
    weight: 0,
    evidence: {
      sourceCategory: evidence.sourceCategory,
      sourceName: evidence.sourceName,
      fetchedAt: evidence.fetchedAt,
      freshnessStatus: evidence.freshnessStatus,
      sampleSize: evidence.sampleSize ?? null,
      trustLevel: evidence.trustLevel,
      activationStatus: evidence.activationStatus,
      whyUsedOrBlocked: evidence.whyUsedOrBlocked,
    },
  }));
}

// ============================================================
// Independent-edge assessment — the fix for "the engine grading itself".
// Compares pre-fetched INDEPENDENT fair values (e.g. Kalshi / Poisson / Elo /
// FPI / ClubElo / Dixon–Coles, threaded through context.independentFairValues)
// against the sportsbook's own de-vigged fair probability, via the edge engine.
// After assess, deriveRankingProbability prices finite trueProb into rankingScore
// even on PASS (MODEL_VERSION v5.2.1+). Edge SPEAK/LEAN remains the glass-box
// claim only. Heuristic confidence stays market-echo for UX when we choose not
// to overwrite it; ranking uses rankingScore.
// Returns null when no independent estimate is available. We never manufacture an
// edge from the market's own price.
// ============================================================

function assessIndependentEdge(
  fairValues: IndependentMarketFairValue[] | undefined,
  homeIsChosen: boolean,
  marketFairProb: number,
  dataQualityScore: number,
  marketConsistent: boolean
): IndependentEdgeSummary | null {
  if (!fairValues || fairValues.length === 0) return null;

  const independents: IndependentEstimate[] = [];
  for (const fv of fairValues) {
    const prob = homeIsChosen ? fv.homeFairProb : fv.awayFairProb;
    if (prob == null || !Number.isFinite(prob) || prob < 0 || prob > 1) continue;
    independents.push({ source: fv.source, prob });
  }
  if (independents.length === 0) return null;

  const a = assessEdge({
    marketFairProb,
    independents,
    // Real evidence health shrinks the edge; absent → edge engine's full default.
    evidenceScore: dataQualityScore > 0 ? dataQualityScore : undefined,
    marketConsistent,
  });

  return {
    decision: a.decision,
    agreement: a.agreement,
    marketFairProb: a.marketFairProb,
    trueProb: a.trueProb,
    rawEdge: a.rawEdge,
    shrunkEdge: a.shrunkEdge,
    expectedClv: a.expectedClv,
    conviction: a.conviction,
    sources: independents.map((e) => e.source),
    priced: false, // surfaced in the glass box; not yet in the confidence math
    rationale: a.rationale,
  };
}

// ============================================================
// Compute consensus component score (0 to WEIGHTS.CONSENSUS_COMPONENT_MAX)
// ============================================================

function computeConsensusScore(
  consensusPct: number,
  // Spread/total pass the SHARE OF BOOKS agreeing on the side. Moneyline passes
  // the de-vigged WIN PROBABILITY (for a 2-outcome market the fair prob is the
  // consensus signal) — so its factor text must say "win probability", not
  // "bookmakers align", which would misread the number to the customer. The
  // score math is identical either way; only the human-readable label changes.
  metric: "book-agreement" | "win-probability" = "book-agreement",
): {
  score: number;
  factor: FactorDetail;
} {
  const effectivePct = Math.max(0, consensusPct - 0.5); // only count above 50%
  const normalized = effectivePct / 0.5; // 0–1 where 1 = 100% consensus
  const score = clamp(normalized * WEIGHTS.CONSENSUS_COMPONENT_MAX, 0, WEIGHTS.CONSENSUS_COMPONENT_MAX);

  const pctDisplay = Math.round(consensusPct * 100);
  const impact: FactorDetail["impact"] =
    consensusPct >= WEIGHTS.CONSENSUS_MIN_PCT ? "positive" : "negative";

  const description =
    metric === "win-probability"
      ? `Market implies a ${pctDisplay}% win probability for this side`
      : `${pctDisplay}% of bookmakers align on this side`;

  return {
    score,
    factor: {
      name: "Bookmaker Consensus",
      impact,
      description,
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
  pickedSideAvgPrice: number,
  // Sum of the two-way offered implied probabilities (the book's "overround").
  // A real, internally-consistent market always charges vig, so this is > 1.0.
  // When it is < 1.0 the market is inconsistent — mixed odds formats across
  // books, a missing side at some books, or crossed/stale lines — and the
  // de-vigged "fair" probability is inflated above what any honest market
  // supports. Defaults to a value ≥ 1 so callers that don't pass it (and
  // genuinely vigged markets) are unaffected.
  twoSidedImpliedSum: number = 1
): {
  rawEdge: number;    // in probability units
  score: number;      // 0–EDGE_COMPONENT_MAX
  factor: FactorDetail;
} {
  // Convert avg bookmaker price to implied prob
  const offeredProb = americanToImpliedProbability(pickedSideAvgPrice);

  // Edge = fair value - offered price (positive = we have value)
  let rawEdge = pickedSideFairProb - offeredProb;

  // Inconsistent-market guard: a negative-hold book (implied sum < 1.0) cannot
  // exist from honest two-way pricing. De-vigging such inputs manufactures a
  // spurious positive edge (this is the "Edge Index 100 on a real total" bug:
  // e.g. -120/+170 implied sum 0.916 → fabricated +5% edge → max score). We
  // never credit a *positive* pricing edge when the market is sub-vig; a true
  // edge claim requires a consistent, fully-priced two-way market.
  if (twoSidedImpliedSum < 1 && rawEdge > 0) {
    rawEdge = 0;
  }

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

  /**
   * Books that quote a COMPLETE two-sided market. Every price-derived and
   * depth-derived value below uses this set, never `spreadOdds`.
   *
   * A book carrying a line but no price is still market information about
   * WHERE the line sits, so it keeps its vote in the line consensus below
   * (avgSpread, spreadOfSpreads, consensusPct). It is not, however, "pricing
   * this market": counting it inflated market depth, softened the volatility
   * penalty, improved the risk level, and shipped as the pick's public
   * `bookmakerCount` and in the reason string "backed by N bookmakers pricing
   * this market" — a claim about a book that quoted no price (Devin Review,
   * #717).
   */
  const pricedOdds = spreadOdds.filter(
    (o) => o.homeSpreadPrice !== undefined && o.awaySpreadPrice !== undefined,
  );
  if (pricedOdds.length < MIN_BOOKMAKERS) return null;

  const spreads = spreadOdds.map((o) => o.spread as number);

  // Pick'em guard: an all-PK board (every spread === 0) has no favored side.
  // Without this, spread===0 votes AWAY (s < 0 is false) → phantom away pick
  // with consensus 1.0. Mixed boards keep existing side selection.
  if (spreads.every((s) => s === 0)) return null;

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
  // Refuse a line that cannot be placed at any book for this sport. See
  // isPublishableSpreadLine: baseball's run line is a fixed ladder, and the
  // mean of contaminated book rows lands off it.
  if (!isPublishableSpreadLine(input.sport, chosenSpread)) return null;
  // Refuse a stored line no book in this consensus set quoted. Gated OFF by
  // default: see isQuotedBookLine and lineIntegrityPublishGuardEnabled.
  if (
    lineIntegrityPublishGuardEnabled() &&
    // Real bookmakers only. A `rundown_default` row is not a book offering a
    // price, so letting it satisfy the guard would pass off an unplaceable
    // consensus mean as quoted (Devin Review, #733).
    !isQuotedBookLine(
      avgSpread,
      spreadOdds.filter((o) => isRealBookmakerKey(o.bookmaker)).map((o) => o.spread as number),
    )
  ) {
    return null;
  }
  const pickedSide = homeIsChosen ? "HOME" : "AWAY";

  // ONE book set for every price-derived value below.
  //
  // Refuse rather than invent a price. The old fallback published `-110` when
  // no book quoted the chosen side, and that number reached the subscriber as
  // the pick's odds AND was committed into the immutable proof receipt as
  // entryOdds — a price no book ever offered, which rule 1 forbids outright.
  // sanitizeAmericanPrice returns undefined for a missing, null, non-finite or
  // decimal-format price, so this is reachable from a feed shape change, not
  // only from an absent market.
  //
  // Restricting to books that quote BOTH sides is not only about vig: the edge
  // is a COMPARISON of avgPrice against fairProb, so drawing those two from
  // different book sets compares mismatched markets. A book quoting only the
  // chosen side would move avgPrice while contributing nothing to fairProb, and
  // a single one-sided outlier could manufacture an edge that no complete
  // market shows (Devin Review, #717).
  // Average price for chosen side, over the same complete books.
  const chosenPrices = pricedOdds.map((o) =>
    homeIsChosen ? o.homeSpreadPrice! : o.awaySpreadPrice!,
  );
  const avgPrice = chosenPrices.reduce((a, b) => a + b, 0) / chosenPrices.length;

  // Fair value — assume consensus spread IS fair line, edge from vig removal.
  const homeImpliedAvg =
    pricedOdds.reduce(
      (acc, o) => acc + americanToImpliedProbability(o.homeSpreadPrice!),
      0,
    ) / pricedOdds.length;
  const awayImpliedAvg =
    pricedOdds.reduce(
      (acc, o) => acc + americanToImpliedProbability(o.awaySpreadPrice!),
      0,
    ) / pricedOdds.length;
  const fair = removeVig(homeImpliedAvg, awayImpliedAvg);
  const fairProb = homeIsChosen ? fair.home : fair.away;
  const fairShinProb = shinFairForSide(
    { homeImplied: homeImpliedAvg, awayImplied: awayImpliedAvg },
    homeIsChosen,
  );
  // Overround for the inconsistent-market guard in computeEdgeScore.
  const twoSidedImpliedSum = homeImpliedAvg + awayImpliedAvg;

  // Component scores
  const { score: consensusScore, factor: consensusFactor } = computeConsensusScore(consensusPct);
  const { score: depthScore, factor: depthFactor } = computeMarketDepthScore(pricedOdds.length);
  const { score: edgeComponentScore, rawEdge, factor: edgeFactor } = computeEdgeScore(fairProb, avgPrice, twoSidedImpliedSum);
  const { penalty: volatilityPenalty, factor: volatilityFactor } =
    computeVolatilityPenalty(pricedOdds.length, spreadOfSpreads);

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
          bookmakerCoverageMax: input.context.bookmakerCoverageMax ?? pricedOdds.length,
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
  const scheduleStressScore = ctx?.scheduleStressScore ?? 0;
  const dataQualityScore = ctx?.dataQualityScore ?? 0;

  const contextFactors: FactorDetail[] = ctx?.factors ?? [];
  const shadowEvidenceFactors = buildShadowEvidenceFactors(input);

  const confidence = Math.round(
    clamp(
      consensusScore + depthScore + edgeComponentScore + volatilityPenalty +
      lineMovementScore + restAdvantageScore + historicalFormScore + dataQualityPenalty +
      headToHeadScore + venueFormScore + uncertaintyPenalty + crossMarketScore +
      scheduleStressScore + 10,
      0, 100
    )
  );

  if (confidence < MIN_PUBLISH_CONFIDENCE) return null;

  const skellamIndependents = (input.context?.independentFairValues ?? []).filter(
    (fv) => fv.source === SKELLAM_COVER_SOURCE,
  );
  const independentEdgeRaw = assessIndependentEdge(
    skellamIndependents.length > 0 ? skellamIndependents : undefined,
    homeIsChosen,
    fairProb,
    dataQualityScore,
    twoSidedImpliedSum >= 1,
  );
  const rank = deriveRankingProbability(confidence, independentEdgeRaw, {
    independentWeight: 0.7,
    rankOnAnyTrueProb: true,
  });
  const independentEdge: IndependentEdgeSummary | null = independentEdgeRaw
    ? { ...independentEdgeRaw, priced: rank.priced }
    : null;
  const independentEdgeFactors: FactorDetail[] = independentEdge
    ? [
        {
          name: `Independent Edge (${independentEdge.sources.join(", ")})`,
          impact:
            independentEdge.decision === "PASS"
              ? "neutral"
              : independentEdge.shrunkEdge > 0
                ? "positive"
                : "negative",
          description: independentEdge.rationale,
          weight: rank.priced ? Math.round((rank.rankingScore - confidence) || 0) : 0,
        },
      ]
    : [];

  const factors: FactorDetail[] = [
    consensusFactor,
    depthFactor,
    edgeFactor,
    ...(volatilityFactor ? [volatilityFactor] : []),
    ...contextFactors,
    ...shadowEvidenceFactors,
    ...independentEdgeFactors,
  ];

  const edgeScore = clamp(Math.round((edgeComponentScore / WEIGHTS.EDGE_COMPONENT_MAX) * 100), 0, 100);
  const pickGrade: PickGrade = computePickGrade(confidence, edgeScore);
  const riskLevel: RiskLevel = computeRiskLevel(pricedOdds.length, consensusPct, lineMovementScore);
  const tier: PickTier = confidence >= PREMIUM_CONFIDENCE_THRESHOLD ? "PREMIUM" : "FREE";

  const spreadDisplay =
    chosenSpread > 0 ? `+${chosenSpread.toFixed(1)}` : chosenSpread.toFixed(1);
  const selection = `${chosenTeam} ${spreadDisplay}`;

  // Build contextual reasoning clauses
  const contextClauses: string[] = [];
  if (restAdvantageScore > 3) contextClauses.push("rest advantage");
  else if (restAdvantageScore < -3) contextClauses.push("rest disadvantage");
  if (scheduleStressScore > 2) contextClauses.push("opponent on compressed schedule");
  else if (scheduleStressScore < -2) contextClauses.push("compressed schedule stress");
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
    `${chosenTeam} ${spreadDisplay} backed by ${Math.round(consensusPct * 100)}% of ${pricedOdds.length} ` +
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
    marketPriceShapeScore: edgeComponentScore,
    trueEvScore: rank.priced && independentEdge ? independentEdge.shrunkEdge : null,
    fairProbability: rank.priced ? rank.rankingP : null,
    lineMovementScore,
    volatilityPenalty,
    headToHeadScore: headToHeadScore !== 0 ? headToHeadScore : undefined,
    venueFormScore: venueFormScore !== 0 ? venueFormScore : undefined,
    uncertaintyPenalty: uncertaintyPenalty !== 0 ? uncertaintyPenalty : undefined,
    crossMarketScore: crossMarketScore !== 0 ? crossMarketScore : undefined,
    scheduleStressScore: scheduleStressScore !== 0 ? scheduleStressScore : undefined,
    dataQualityScore,
    independentEdge: independentEdge ?? undefined,
    rankingP: rank.rankingP,
    rankingSource: rank.source,
    marketFairProb: fairProb,
    marketFairMethod: "proportional",
    marketFairShinProb: fairShinProb,
    factors,
  };

  return {
    gameId: input.gameId,
    pickType: "SPREAD",
    selection,
    // `line` is stored in HOME-team perspective (= avgSpread), matching the
    // settlement convention (settlement.ts: `homeCoverMargin = homeMargin + line`),
    // the OpeningLine / Game.openingSpread fields, and the CLV helpers. The
    // chosen-side display number lives in `selection` (e.g. "Away Favs -6.0").
    // Storing chosenSpread here previously mis-graded AWAY-favored picks, because
    // chosenSpread is away-perspective for away picks while settlement reads home.
    line: avgSpread,
    confidence,
    rankingScore: rank.rankingScore,
    edgeScore,
    consensusPct,
    marketFairProb: fairProb,
    entryPrice: Math.round(avgPrice),
    bookmakerCount: pricedOdds.length,
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

  // The SPREAD twin of this check lives beside isPublishableSpreadLine. Totals
  // had no line-integrity guard of any kind (the run-line ladder is
  // spread-only), which is the sibling-lane pattern this repo keeps hitting;
  // TOTAL is in fact the worse half of the finding (369 of 599 off-grid vs 310
  // of 719). Gated OFF by default, same flag, same founder decision.
  if (
    lineIntegrityPublishGuardEnabled() &&
    !isQuotedBookLine(
      avgTotal,
      totalOdds.filter((o) => isRealBookmakerKey(o.bookmaker)).map((o) => o.total as number),
    )
  ) {
    return null;
  }

  // Consensus is only meaningful over books that quote BOTH sides. A totals row
  // with a `total` but no over/under prices carries no consensus signal, so we
  // must not let its absence fabricate a one-sided (100% UNDER) consensus.
  const pricedTotals = totalOdds.filter(
    (o) => o.overPrice !== undefined && o.underPrice !== undefined
  );
  // ONE book set for every price- and depth-derived value below, exactly as the
  // spread scorer does. Three different sets were in use here: chosenPrices
  // from `totalOdds`, each implied average from its own one-sided filter, and
  // the depth/risk/count values from `totalOdds` again. The edge is a
  // COMPARISON of avgPrice against fairProb, so mixed sets compare mismatched
  // markets, and a book quoting neither direction was still counted as pricing
  // the market in the public `bookmakerCount` (Devin Review, #717).
  //
  // Line consensus (`totals`, `avgTotal`, `totalDispersion`) deliberately keeps
  // every book carrying a total: a line without a price is still real
  // information about where the line sits.
  if (pricedTotals.length < MIN_BOOKMAKERS) return null;

  // Over is the market favorite when its SIGNED American price is <= the under
  // price: the higher-implied-probability side is the one with the smaller
  // signed price (e.g. -115 over is favored over -105 under). Using Math.abs
  // here would pick the LESS-juiced side and invert the favorite on any
  // asymmetric juice.
  //
  // Side-selection tie-break (Wave 5). LEGACY (default): a book counts as an
  // OVER vote when overPrice <= underPrice, so the standard -110/-110 quote
  // votes OVER at every book and a symmetric board reads as unanimous OVER —
  // pinned by totals-consensus-tiebreak.test.ts; changing the DEFAULT is a
  // MODEL_VERSION decision (docs/calibration-proposals/2026-09-04-…). STRICT
  // (opt-in via context.totalsTiebreak): only books whose prices DISCRIMINATE
  // vote; equal-juice books abstain, and an exact tie yields NO pick — a coin
  // flip must not become a published pick.
  const strictTiebreak = input.context?.totalsTiebreak === "strict";
  const votingTotals = strictTiebreak
    ? pricedTotals.filter((o) => o.overPrice! !== o.underPrice!)
    : pricedTotals;
  if (strictTiebreak && votingTotals.length === 0) return null;
  const overFavored = votingTotals.filter(
    (o) =>
      strictTiebreak
        ? o.overPrice! < o.underPrice!
        : o.overPrice! <= o.underPrice!,
  ).length;
  const overFavoredPct = overFavored / votingTotals.length;
  const overIsChosen = strictTiebreak
    ? overFavoredPct > 0.5
    : overFavoredPct >= 0.5;
  if (strictTiebreak && overFavoredPct === 0.5) return null;
  const consensusPct = overIsChosen ? overFavoredPct : 1 - overFavoredPct;

  if (consensusPct < WEIGHTS.CONSENSUS_MIN_PCT) return null;

  const pickedSide = overIsChosen ? "OVER" : "UNDER";

  // Avg price for chosen direction
  const chosenPrices = pricedTotals.map((o) => (overIsChosen ? o.overPrice! : o.underPrice!));
  const avgPrice = chosenPrices.reduce((a, b) => a + b, 0) / chosenPrices.length;

  // Fair value, over the same complete books.
  const overImpliedAvg =
    pricedTotals.reduce((acc, o) => acc + americanToImpliedProbability(o.overPrice!), 0) /
    pricedTotals.length;
  const underImpliedAvg =
    pricedTotals.reduce((acc, o) => acc + americanToImpliedProbability(o.underPrice!), 0) /
    pricedTotals.length;

  const fair = removeVig(overImpliedAvg, underImpliedAvg);
  const fairProb = overIsChosen ? fair.home : fair.away;
  const fairShinProb = shinFairForSide(
    { homeImplied: overImpliedAvg, awayImplied: underImpliedAvg },
    overIsChosen,
  );
  // Overround for the inconsistent-market guard in computeEdgeScore.
  const twoSidedImpliedSum = overImpliedAvg + underImpliedAvg;

  // Total dispersion
  const totalMean = avgTotal;
  const variance = totals.reduce((acc, t) => acc + Math.pow(t - totalMean, 2), 0) / totals.length;
  const totalDispersion = Math.sqrt(variance);

  const { score: consensusScore, factor: consensusFactor } = computeConsensusScore(consensusPct);
  const { score: depthScore, factor: depthFactor } = computeMarketDepthScore(pricedTotals.length);
  const { score: edgeComponentScore, rawEdge, factor: edgeFactor } = computeEdgeScore(fairProb, avgPrice, twoSidedImpliedSum);
  const { penalty: volatilityPenalty, factor: volatilityFactor } =
    computeVolatilityPenalty(pricedTotals.length, totalDispersion);

  // Game context signals
  const ctx = input.context
    ? computeGameContext(
        {
          ...input.context,
          hasSpreadMarket: input.bookmakerOdds.some((o) => o.market === "SPREADS"),
          hasTotalMarket: true,
          hasH2HMarket: input.bookmakerOdds.some((o) => o.market === "H2H"),
          bookmakerCoverageMax: input.context.bookmakerCoverageMax ?? pricedTotals.length,
        },
        "TOTAL",
        pickedSide
      )
    : null;

  const lineMovementScore = ctx?.lineMovementScore ?? 0;
  const dataQualityPenalty = ctx?.dataQualityPenalty ?? 0;
  const dataQualityScore = ctx?.dataQualityScore ?? 0;
  const contextFactors: FactorDetail[] = ctx?.factors ?? [];
  const shadowEvidenceFactors = buildShadowEvidenceFactors(input);

  const factors: FactorDetail[] = [
    consensusFactor,
    depthFactor,
    edgeFactor,
    ...(volatilityFactor ? [volatilityFactor] : []),
    ...contextFactors,
    ...shadowEvidenceFactors,
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
  const riskLevel: RiskLevel = computeRiskLevel(pricedTotals.length, consensusPct, lineMovementScore);
  const tier: PickTier = confidence >= PREMIUM_CONFIDENCE_THRESHOLD ? "PREMIUM" : "FREE";

  const direction = overIsChosen ? "OVER" : "UNDER";
  const selection = `${direction} ${avgTotal.toFixed(1)}`;

  const movementNote = lineMovementScore > 5 ? " Total line moving in pick direction." :
    lineMovementScore < -5 ? " Total line moving against pick direction." : "";

  const reasoning =
    `${direction} ${avgTotal.toFixed(1)} backed by ${Math.round(consensusPct * 100)}% of ${pricedTotals.length} ` +
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
    marketPriceShapeScore: edgeComponentScore,
    trueEvScore: null,
    fairProbability: null,
    lineMovementScore,
    volatilityPenalty,
    dataQualityScore,
    rankingP: Math.min(1 - 1e-6, Math.max(1e-6, confidence / 100)),
    rankingSource: "confidence", // no independent total model yet
    marketFairProb: fairProb,
    marketFairMethod: "proportional",
    marketFairShinProb: fairShinProb,
    factors,
  };

  return {
    gameId: input.gameId,
    pickType: "TOTAL",
    selection,
    line: avgTotal,
    confidence,
    rankingScore: confidence, // no independent ML edge on totals yet
    edgeScore,
    consensusPct,
    marketFairProb: fairProb,
    entryPrice: Math.round(avgPrice),
    bookmakerCount: pricedTotals.length,
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

/**
 * Sports whose moneyline has THREE outcomes, where a draw is a real settlement
 * result rather than a void.
 *
 * `removeVig(home, away)` renormalises two outcomes to sum to 1, giving
 * P(home wins | the match is decisive). That is the right quantity only when a
 * tie voids the bet. For soccer it is not: settlement.ts grades a draw as a
 * LOSS for either side, so the settlement-relevant number is the UNCONDITIONAL
 * P(home wins) — lower by the whole draw mass (~20-30%).
 *
 * A correct fix needs the draw price, and the engine cannot see one:
 * `BookmakerOddsInput` has no `drawPrice` field, and the default free ESPN path
 * never fetches it. Until a genuine three-way de-vig exists, the honest output
 * is no moneyline pick at all. Spreads and totals are unaffected — those settle
 * on goals, where a draw is not a special outcome.
 */
export function isThreeWayMoneylineSport(sportKey: string): boolean {
  return sportKey.toLowerCase().startsWith("soccer");
}

/**
 * Baseball's run line is a FIXED market: 1.5 standard, with 2.5 and 3.5 offered
 * as alternates. Unlike football, where books legitimately disagree (-3, -3.5,
 * -3) and a consensus between them is a real number, there is no such thing as
 * a 6.56 run line at any book.
 *
 * The published spread is the arithmetic MEAN of every book's line, so a single
 * contaminated odds row drags it off the ladder entirely. Measured on
 * production 2026-09-07: 355 of 725 published MLB spread picks carried a line
 * that is not a run line, including 4.5, 5.5 and 7.5; separately, 8 of 12
 * bookmakers carry MLB spread rows up to 19.5, which is where the contamination
 * enters.
 *
 * A subscriber cannot place "Athletics -7.5" on a baseball game anywhere, so
 * publishing it is fabricated product data. Suppress rather than mislead, the
 * same call the three-way moneyline guard above makes.
 *
 * This does NOT repair the line, which would change what the engine publishes
 * and require a MODEL_VERSION bump. It refuses the pick.
 */
export const BASEBALL_RUN_LINES: readonly number[] = [1.5, 2.5, 3.5];

/** Float tolerance: the published line is a mean, so compare with an epsilon. */
const RUN_LINE_EPSILON = 1e-9;

export function isBaseballSport(sportKey: string): boolean {
  return sportKey.toLowerCase().startsWith("baseball");
}

/** Is `line` a run line a baseball book actually offers? Non-baseball: always true. */
export function isPublishableSpreadLine(sportKey: string, line: number): boolean {
  if (!isBaseballSport(sportKey)) return true;
  if (!Number.isFinite(line)) return false;
  const abs = Math.abs(line);
  return BASEBALL_RUN_LINES.some((valid) => Math.abs(abs - valid) < RUN_LINE_EPSILON);
}

/**
 * Is `line` a value at least one book in `quotedLines` actually quoted?
 *
 * C-270 (ledger C-197). The published `line` is the arithmetic MEAN of every
 * book's line (`avgSpread`, `avgTotal` below). On a market where books agree
 * the mean IS a quoted line; where they disagree it is not, and the member is
 * shown a price nobody offers — "Missouri Tigers -53.8", stored as
 * -53.83333333333334, is the mean of three real FCS book lines, not a model
 * margin. Measured on production 2026-09-08: SPREAD 310 of 719 and TOTAL 369
 * of 599 published settled picks sit off the half-point grid.
 *
 * This predicate is the measurement. Whether the engine ACTS on it is gated by
 * lineIntegrityPublishGuardEnabled below, default OFF: enforcing it
 * suppresses roughly half the board, which is a founder decision (see
 * docs/ops/LINE_INTEGRITY_DECISION_2026-09-08.md) and directly overturns the
 * recorded C-119/C-125 call that a blanket rule would gut it.
 *
 * Deliberately NOT a half-point-grid test: books quote quarter-point Asian
 * handicaps and whole-number totals, so the grid is a proxy and the book set is
 * the fact. The baseball run-line ladder above stays as well — it catches the
 * case this one cannot, where every book quotes the same contaminated line.
 */
const QUOTED_LINE_EPSILON = 1e-9;

/**
 * Bookmaker keys that carry no book identity. CANONICAL: this is the one
 * definition, and apps/web/lib/calibration/publish-time-market-p.ts re-exports
 * it rather than keeping a second copy.
 *
 * It lives in the engine because the publish guard needs it and the engine
 * cannot import from apps/web. Grows only with evidence of a new non-book
 * writer, never to change a count.
 */
export const NON_BOOK_BOOKMAKER_KEYS: ReadonlySet<string> = new Set(["rundown_default"]);

export function isRealBookmakerKey(key: string | null | undefined): key is string {
  if (typeof key !== "string") return false;
  const trimmed = key.trim();
  if (trimmed.length === 0) return false;
  return !NON_BOOK_BOOKMAKER_KEYS.has(trimmed);
}

/**
 * Read the enforcement flag straight from the environment rather than through
 * PlatformConfig. Not a style choice: `apps/web/__tests__/env-example-coverage.test.ts`
 * requires every `process.env` key PlatformConfig reads to have a matching
 * `.env.example` entry, and AGENTS.md law 2 freezes any `.env*` file for
 * agents. The same conflict was recorded for C-108, with the same resolution:
 * keep the variable out of the shared config surface and document it in
 * docs/ops/OPERATOR.md section 5. The idiom is the repo's
 * (free-settlement-runner.ts, public-surface-truth/route.ts): trimmed,
 * lower-cased, exact "true", default false.
 */
export function lineIntegrityPublishGuardEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env["LINE_INTEGRITY_PUBLISH_GUARD_ENABLED"]?.trim().toLowerCase() === "true";
}

export function isQuotedBookLine(line: number, quotedLines: readonly number[]): boolean {
  if (!Number.isFinite(line)) return false;
  return quotedLines.some(
    (quoted) => Number.isFinite(quoted) && Math.abs(quoted - line) < QUOTED_LINE_EPSILON,
  );
}

function scoreMoneylinePick(input: OddsInput, fetchedAt: Date): ScoredPick | null {
  // Publishing a two-way number for a three-way market overstates win
  // probability, edge and confidence, and persists that overstatement into the
  // pick proof receipt. Suppress rather than mislead.
  if (isThreeWayMoneylineSport(input.sport)) return null;

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
  const fairShinProb = shinFairForSide(
    { homeImplied: avgHomeImplied, awayImplied: avgAwayImplied },
    homeIsChosen,
  );
  const consensusPct = fairProb; // for ML, fair prob IS the consensus signal

  // Need strong conviction on ML — higher threshold
  if (fairProb < 0.58) return null;

  const chosenTeam = homeIsChosen ? input.homeTeam : input.awayTeam;
  const pickedSide = homeIsChosen ? "HOME" : "AWAY";

  // Lock price is averaged in probability space (see averageAmericanPrices):
  // averaging American prices across the ±100 discontinuity mints an invalid
  // entry price that would then mis-grade CLV against the close. Non-null by
  // construction — h2hOdds is non-empty here and every price is present.
  const avgPrice = averageAmericanPrices(
    h2hOdds.map((o) => (homeIsChosen ? o.homePrice! : o.awayPrice!)),
  )!;

  const { score: consensusScore, factor: consensusFactor } = computeConsensusScore(consensusPct, "win-probability");
  const { score: depthScore, factor: depthFactor } = computeMarketDepthScore(h2hOdds.length);
  // Overround for the inconsistent-market guard in computeEdgeScore.
  const twoSidedImpliedSum = avgHomeImplied + avgAwayImplied;
  const { score: edgeComponentScore, rawEdge, factor: edgeFactor } = computeEdgeScore(fairProb, avgPrice, twoSidedImpliedSum);
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
  const scheduleStressScore = ctx?.scheduleStressScore ?? 0;
  const dataQualityScore = ctx?.dataQualityScore ?? 0;
  const contextFactors: FactorDetail[] = ctx?.factors ?? [];
  const shadowEvidenceFactors = buildShadowEvidenceFactors(input);

  // Independent-edge assessment (Kalshi / Poisson / Elo / FPI / ClubElo / Dixon–Coles).
  // rankingScore uses trueProb whenever finite (incl. PASS) — v5.2.1 ranking law.
  // Heuristic confidence stays as the market-echo composite for UX continuity.
  const independentEdgeRaw = assessIndependentEdge(
    input.context?.independentFairValues?.filter((fv) => fv.source !== SKELLAM_COVER_SOURCE),
    homeIsChosen,
    fairProb,
    dataQualityScore,
    twoSidedImpliedSum >= 1
  );

  const confidence = Math.round(
    clamp(
      consensusScore + depthScore + edgeComponentScore + volatilityPenalty +
      lineMovementScore + restAdvantageScore + historicalFormScore + dataQualityPenalty +
      headToHeadScore + venueFormScore + uncertaintyPenalty + scheduleStressScore + 10,
      0, 100
    )
  );

  if (confidence < MIN_PUBLISH_CONFIDENCE) return null;

  const rank = deriveRankingProbability(confidence, independentEdgeRaw, {
    independentWeight: 0.7,
    rankOnAnyTrueProb: true,
  });
  const independentEdge: IndependentEdgeSummary | null = independentEdgeRaw
    ? { ...independentEdgeRaw, priced: rank.priced }
    : null;

  const independentEdgeFactors: FactorDetail[] = independentEdge
    ? [
        {
          name: `Independent Edge (${independentEdge.sources.join(", ")})`,
          impact:
            independentEdge.decision === "PASS"
              ? "neutral"
              : independentEdge.shrunkEdge > 0
              ? "positive"
              : "negative",
          description: independentEdge.rationale,
          // Non-zero weight only when priced into ranking path (glass-box honesty).
          weight: rank.priced ? Math.round((rank.rankingScore - confidence) || 0) : 0,
        },
      ]
    : [];

  const factors: FactorDetail[] = [
    consensusFactor,
    depthFactor,
    edgeFactor,
    ...(volatilityFactor ? [volatilityFactor] : []),
    ...contextFactors,
    ...shadowEvidenceFactors,
    ...independentEdgeFactors,
  ];

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
  if (scheduleStressScore > 2) contextClauses.push("opponent on compressed schedule");
  else if (scheduleStressScore < -2) contextClauses.push("compressed schedule stress");
  if (headToHeadScore > 0) contextClauses.push("favorable H2H history");
  else if (headToHeadScore < 0) contextClauses.push("poor H2H history");
  if (venueFormScore > 0) contextClauses.push("strong venue form");
  if (uncertaintyPenalty < -3) contextClauses.push("conflicting signals");
  if (rank.priced) contextClauses.push("independent model edge priced into ranking");
  const contextNote = contextClauses.length > 0
    ? ` Context: ${contextClauses.join(", ")}.`
    : "";

  const reasoning =
    `${chosenTeam} ML (${priceDisplay}): fair value ${Math.round(fairProb * 100)}% ` +
    `across ${h2hOdds.length} bookmakers. ` +
    `Edge: ${rawEdge > 0 ? "+" : ""}${Math.round(rawEdge * 100 * 10) / 10}%.` +
    contextNote +
    ` Confidence: ${confidence}/100 (${pickGrade.replace(/_/g, " ")}).` +
    (rank.priced
      ? ` Ranking: ${rank.rankingScore}/100 via ${rank.source}.`
      : "");

  const reasoningShort =
    `${chosenTeam} implied at ${Math.round(fairProb * 100)}% across ${h2hOdds.length} books.` +
    (contextClauses.length > 0 ? ` ${contextClauses[0]!.charAt(0).toUpperCase() + contextClauses[0]!.slice(1)} noted.` : "");

  const factorBreakdown: FactorBreakdown = {
    consensusScore,
    marketDepthScore: depthScore,
    edgeScore: edgeComponentScore,
    marketPriceShapeScore: edgeComponentScore,
    trueEvScore: rank.priced && independentEdge ? independentEdge.shrunkEdge : null,
    fairProbability: rank.priced ? rank.rankingP : null,
    lineMovementScore,
    volatilityPenalty,
    headToHeadScore: headToHeadScore !== 0 ? headToHeadScore : undefined,
    venueFormScore: venueFormScore !== 0 ? venueFormScore : undefined,
    uncertaintyPenalty: uncertaintyPenalty !== 0 ? uncertaintyPenalty : undefined,
    scheduleStressScore: scheduleStressScore !== 0 ? scheduleStressScore : undefined,
    dataQualityScore,
    independentEdge: independentEdge ?? undefined,
    // Persist ranking law for later metrics / bake-off (never edge-as-p).
    rankingP: rank.rankingP,
    rankingSource: rank.source,
    marketFairProb: fairProb,
    marketFairMethod: "proportional",
    marketFairShinProb: fairShinProb,
    factors,
  };

  return {
    gameId: input.gameId,
    pickType: "MONEYLINE",
    selection,
    line: avgPrice,
    confidence,
    rankingScore: rank.rankingScore,
    edgeScore,
    consensusPct,
    marketFairProb: fairProb,
    entryPrice: Math.round(avgPrice),
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

/**
 * Score a single game and return every publishable pick (spread, total,
 * moneyline) ranked by confidence, highest first.
 *
 * Runs each market scorer against `input` and drops any market that fails the
 * publish gates (e.g. confidence below `MIN_PUBLISH_CONFIDENCE`, fewer than
 * `MIN_BOOKMAKERS` books), so the result holds 0–3 picks.
 *
 * @param input Normalized odds for one game (all books, all markets).
 * @param fetchedAt Ingestion timestamp of this odds snapshot. It is stamped
 *   verbatim onto every returned pick's `dataFreshnessAt` (and flows into any
 *   downstream freshness / proof-receipt `asOf`). It does NOT influence the
 *   confidence, edge, or ranking math, and it is the SOLE nondeterministic
 *   input to scoring: given identical `input` and `fetchedAt`, the returned
 *   picks are byte-identical.
 *
 *   Determinism caveat: when omitted, `fetchedAt` defaults to the wall-clock
 *   `new Date()` at call time, so `dataFreshnessAt` will differ between runs on
 *   identical odds. That argless-`new Date()` default is a convenience for
 *   ad-hoc/test callers only; production callers that need reproducible output
 *   MUST pass the real ingestion timestamp (see `process-sport.ts`, which does).
 * @returns Publishable `ScoredPick`s sorted by `confidence` descending.
 */
export function scoreGame(input: OddsInput, fetchedAt?: Date): ScoredPick[] {
  // `now` is only a freshness stamp (see `fetchedAt` docs above); it does not
  // enter the scoring math. Omitting `fetchedAt` reads the wall clock here and
  // is the one nondeterministic default in this library entrypoint.
  const now = fetchedAt ?? new Date();
  const picks: ScoredPick[] = [];

  const spreadPick = scoreSpreadPick(input, now);
  if (spreadPick) picks.push(spreadPick);

  const totalPick = scoreTotalPick(input, now);
  if (totalPick) picks.push(totalPick);

  const mlPick = scoreMoneylinePick(input, now);
  if (mlPick) picks.push(mlPick);

  return picks.sort((a, b) => (b.rankingScore ?? b.confidence) - (a.rankingScore ?? a.confidence));
}

// ============================================================
// Score multiple games — returns all picks sorted by rankingScore
// ============================================================

/**
 * Score a batch of games and return the pooled, publishable picks ranked by
 * rankingScore across all games (highest first; falls back to confidence).
 *
 * Every input game is scored against the same `fetchedAt` reference so the
 * whole batch shares one freshness stamp.
 *
 * @param inputs Normalized odds, one entry per game.
 * @param fetchedAt Ingestion timestamp for the batch; stamped onto each pick's
 *   `dataFreshnessAt` exactly as in {@link scoreGame}. Same determinism caveat:
 *   when omitted it defaults to wall-clock `new Date()` (nondeterministic), so
 *   production callers MUST pass the real ingestion timestamp.
 * @returns All publishable `ScoredPick`s across `inputs`, sorted by
 *   `rankingScore` (then confidence) descending.
 */
export function scoreGames(inputs: OddsInput[], fetchedAt?: Date): ScoredPick[] {
  const allPicks: ScoredPick[] = [];
  // Single shared freshness stamp for the batch; see {@link scoreGame} for the
  // nondeterministic-default caveat when `fetchedAt` is omitted.
  const now = fetchedAt ?? new Date();

  for (const input of inputs) {
    allPicks.push(...scoreGame(input, now));
  }

  return allPicks.sort((a, b) => (b.rankingScore ?? b.confidence) - (a.rankingScore ?? a.confidence));
}
