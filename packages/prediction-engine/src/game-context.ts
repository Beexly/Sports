// ============================================================
// Game Context Feature Computation
//
// Computes structured contextual signals from historical data:
//   - Line movement (opening vs current)
//   - Rest days & back-to-back penalty
//   - Historical ATS form (bucketed)
//   - Data quality score with confidence penalty
//
// All signals are normalized to the same units as other
// scoring components so they can be added/subtracted cleanly.
// ============================================================

// Import shared types from @sports/types — single source of truth
import type { FactorDetail, GameContextInput, AtsFormBucket } from "@sports/types";
import { WEIGHTS } from "./constants.js";
import { clamp } from "./scoring.js";

// Re-export so consumers can import GameContextInput/AtsFormBucket from this module
export type { GameContextInput, AtsFormBucket };

// ============================================================
// Output types
// ============================================================

export interface GameContextScores {
  lineMovementScore: number;        // –15 to +15
  restAdvantageScore: number;       // –10 to +10 (positive = home advantage)
  historicalFormScore: number;      // –10 to +10 (positive = strong ATS record)
  dataQualityPenalty: number;       // –20 to 0
  dataQualityScore: number;         // 0–100 (overall data quality, stored on game)
  factors: FactorDetail[];
}

// ============================================================
// Line movement signal
// ============================================================

/**
 * Returns a score from –15 to +15 and a factor.
 * Positive = line moved in favor of the pick (sharp money following),
 * Negative = line moving against the pick (fade signal).
 *
 * For spread picks: provide pickedSide = "HOME" | "AWAY"
 * A negative spread moving further negative (home favored more) is a positive signal for HOME.
 */
export function computeLineMovementScore(
  openingLine: number | null | undefined,
  currentLine: number | null | undefined,
  marketType: "SPREAD" | "TOTAL",
  pickedSide?: "HOME" | "AWAY" | "OVER" | "UNDER"
): { score: number; delta: number | null; factor: FactorDetail | null } {
  if (openingLine == null || currentLine == null) {
    return { score: 0, delta: null, factor: null };
  }

  const delta = currentLine - openingLine;
  if (Math.abs(delta) < 0.1) {
    // No meaningful movement
    return {
      score: 0,
      delta: 0,
      factor: {
        name: "Line Movement",
        impact: "neutral",
        description: "Line unchanged since open — stable market",
        weight: 0,
      },
    };
  }

  // Determine if movement confirms or fades the pick
  let confirmsPick = false;
  if (marketType === "SPREAD") {
    // Spread moves negative → home being bet (home favored more)
    if (pickedSide === "HOME") confirmsPick = delta < 0;
    else if (pickedSide === "AWAY") confirmsPick = delta > 0;
    else confirmsPick = false;
  } else {
    // Total movement
    if (pickedSide === "OVER") confirmsPick = delta > 0;  // total going up = over bet
    else if (pickedSide === "UNDER") confirmsPick = delta < 0;
    else confirmsPick = false;
  }

  // Magnitude: 0.5pt = small, 1.5pt+ = significant, 3pt+ = strong steam
  const magnitude = Math.abs(delta);
  const rawSignal = clamp(magnitude / 3.0, 0, 1); // 0–1 at 3pt movement
  const score = confirmsPick
    ? clamp(rawSignal * WEIGHTS.LINE_MOVEMENT_COMPONENT_MAX, 0, WEIGHTS.LINE_MOVEMENT_COMPONENT_MAX)
    : clamp(-rawSignal * WEIGHTS.LINE_MOVEMENT_COMPONENT_MAX, -WEIGHTS.LINE_MOVEMENT_COMPONENT_MAX, 0);

  const direction = confirmsPick ? "confirming" : "fading";
  const description =
    `Line moved ${delta > 0 ? "+" : ""}${delta.toFixed(1)} pts from open — ${direction} pick direction`;

  return {
    score,
    delta,
    factor: {
      name: "Line Movement",
      impact: confirmsPick ? "positive" : "negative",
      description,
      weight: score,
    },
  };
}

// ============================================================
// Rest / back-to-back advantage
// ============================================================

/**
 * Returns a score from –10 to +10 for the home team's rest advantage.
 * Positive = home team has more rest. Negative = home is disadvantaged.
 * B2B flag overrides rest day math.
 */
export function computeRestAdvantageScore(
  restDaysHome: number | null | undefined,
  restDaysAway: number | null | undefined,
  isBackToBackHome: boolean = false,
  isBackToBackAway: boolean = false,
  pickedSide: "HOME" | "AWAY"
): { score: number; factor: FactorDetail | null } {
  if (restDaysHome == null && restDaysAway == null && !isBackToBackHome && !isBackToBackAway) {
    return { score: 0, factor: null };
  }

  const MAX = 10;
  let restScore = 0;
  const descParts: string[] = [];

  // B2B penalties are -8 for the team on short rest
  if (isBackToBackHome) {
    restScore -= 8;
    descParts.push("Home on back-to-back");
  }
  if (isBackToBackAway) {
    restScore += 8;
    descParts.push("Away on back-to-back");
  }

  // Rest day differential (only when no B2B flag)
  if (!isBackToBackHome && !isBackToBackAway && restDaysHome != null && restDaysAway != null) {
    const diff = restDaysHome - restDaysAway;
    // Each day of rest advantage = ~2 pts on scale, capped at 3 days
    restScore += clamp(diff * 2, -6, 6);
    if (Math.abs(diff) >= 2) {
      const more = diff > 0 ? "home" : "away";
      descParts.push(`${Math.abs(diff)} more rest days for ${more} team`);
    }
  }

  if (restScore === 0) return { score: 0, factor: null };

  // Flip sign if we're picking AWAY (we want score from picked side's perspective)
  const sideScore = pickedSide === "HOME" ? restScore : -restScore;
  const clampedScore = clamp(sideScore, -MAX, MAX);

  return {
    score: clampedScore,
    factor: {
      name: "Rest Advantage",
      impact: clampedScore > 0 ? "positive" : "negative",
      description: descParts.join("; ") || "Rest differential factored",
      weight: clampedScore,
    },
  };
}

// ============================================================
// Historical ATS form (bucketed)
// ============================================================

/**
 * Returns a score from –10 to +10 based on recent ATS performance.
 * Requires at least 5 games in the bucket to apply a signal.
 * Bucketed to prevent overfitting on small samples.
 */
export function computeHistoricalFormScore(
  form: AtsFormBucket | null | undefined,
  label: string  // "Home" | "Away" for descriptions
): { score: number; atsPct: number | null; factor: FactorDetail | null } {
  const MIN_SAMPLE = 5;
  if (!form || form.sampleSize < MIN_SAMPLE) {
    return { score: 0, atsPct: null, factor: null };
  }

  const decided = form.wins + form.losses;
  if (decided === 0) return { score: 0, atsPct: null, factor: null };

  const atsPct = form.wins / decided;

  // Bucket the signal: strong = 60%+, weak = 40%–, else neutral
  let score = 0;
  let impact: FactorDetail["impact"] = "neutral";
  let description = "";

  if (atsPct >= 0.65) {
    score = 10;
    impact = "positive";
    description = `${label} covering at ${Math.round(atsPct * 100)}% ATS (${form.wins}-${form.losses} last ${form.sampleSize})`;
  } else if (atsPct >= 0.58) {
    score = 5;
    impact = "positive";
    description = `${label} solid ATS record: ${form.wins}-${form.losses} last ${form.sampleSize}`;
  } else if (atsPct <= 0.35) {
    score = -10;
    impact = "negative";
    description = `${label} struggling ATS: ${form.wins}-${form.losses} last ${form.sampleSize} (${Math.round(atsPct * 100)}%)`;
  } else if (atsPct <= 0.42) {
    score = -5;
    impact = "negative";
    description = `${label} below average ATS: ${form.wins}-${form.losses} last ${form.sampleSize}`;
  } else {
    score = 0;
    impact = "neutral";
    description = `${label} neutral ATS record: ${form.wins}-${form.losses} last ${form.sampleSize}`;
  }

  return {
    score,
    atsPct,
    factor:
      score !== 0
        ? {
            name: `${label} ATS Form`,
            impact,
            description,
            weight: score,
          }
        : null,
  };
}

// ============================================================
// Data quality score (0–100) and penalty
// ============================================================

/**
 * Computes an overall data quality score and a confidence penalty.
 * Low quality data = lower confidence, flagged factor.
 *
 * Factors:
 *   - Bookmaker coverage: 0–40 pts
 *   - Data freshness: 0–30 pts (stale after 30 min, 0 at 120 min)
 *   - Market coverage: 0–30 pts (having spread + total + h2h = full)
 */
export function computeDataQuality(
  bookmakerCoverageMax: number = 0,
  dataFreshnessMinutes: number = 0,
  hasSpreadMarket: boolean = false,
  hasTotalMarket: boolean = false,
  hasH2HMarket: boolean = false
): { qualityScore: number; penalty: number; factor: FactorDetail | null } {
  // Bookmaker coverage score (0–40): ideal = 10+ books
  const coverageScore = clamp((bookmakerCoverageMax / 10) * 40, 0, 40);

  // Freshness score (0–30): full credit <10min, linear decay to 0 at 90min
  const freshnessScore = clamp(((90 - dataFreshnessMinutes) / 90) * 30, 0, 30);

  // Market coverage score (0–30): 10pts per market type
  const marketScore =
    (hasSpreadMarket ? 10 : 0) +
    (hasTotalMarket ? 10 : 0) +
    (hasH2HMarket ? 10 : 0);

  const qualityScore = Math.round(coverageScore + freshnessScore + marketScore);

  // Penalty: only applied when quality is below 50
  let penalty = 0;
  let factor: FactorDetail | null = null;

  if (qualityScore < 30) {
    penalty = -15;
    factor = {
      name: "Data Quality",
      impact: "negative",
      description: `Low data quality (${qualityScore}/100) — reduced confidence`,
      weight: penalty,
    };
  } else if (qualityScore < 50) {
    penalty = -8;
    factor = {
      name: "Data Quality",
      impact: "negative",
      description: `Limited data coverage (${qualityScore}/100) — confidence adjusted`,
      weight: penalty,
    };
  } else if (qualityScore < 70) {
    // Marginal quality: no penalty but no boost
    factor = null;
  }

  return { qualityScore, penalty, factor };
}

// ============================================================
// Compute all game context scores at once
// ============================================================

export function computeGameContext(
  context: GameContextInput,
  marketType: "SPREAD" | "TOTAL" | "MONEYLINE",
  pickedSide: "HOME" | "AWAY" | "OVER" | "UNDER"
): GameContextScores {
  const factors: FactorDetail[] = [];

  // 1. Line movement
  let lineMovementScore = 0;
  if (marketType === "SPREAD") {
    const lm = computeLineMovementScore(
      context.openingSpread,
      context.currentSpread,
      "SPREAD",
      pickedSide as "HOME" | "AWAY"
    );
    lineMovementScore = lm.score;
    if (lm.factor) factors.push(lm.factor);
  } else if (marketType === "TOTAL") {
    const lm = computeLineMovementScore(
      context.openingTotal,
      context.currentTotal,
      "TOTAL",
      pickedSide as "OVER" | "UNDER"
    );
    lineMovementScore = lm.score;
    if (lm.factor) factors.push(lm.factor);
  }

  // 2. Rest advantage (only for SPREAD / ML picks — totals are side-agnostic)
  let restAdvantageScore = 0;
  if (marketType !== "TOTAL" && (pickedSide === "HOME" || pickedSide === "AWAY")) {
    const ra = computeRestAdvantageScore(
      context.restDaysHome,
      context.restDaysAway,
      context.isBackToBackHome,
      context.isBackToBackAway,
      pickedSide
    );
    restAdvantageScore = ra.score;
    if (ra.factor) factors.push(ra.factor);
  }

  // 3. Historical form for the picked side
  let historicalFormScore = 0;
  if (pickedSide === "HOME" && context.homeAtsForm) {
    const hf = computeHistoricalFormScore(context.homeAtsForm, "Home");
    historicalFormScore = hf.score;
    if (hf.factor) factors.push(hf.factor);
  } else if (pickedSide === "AWAY" && context.awayAtsForm) {
    const af = computeHistoricalFormScore(context.awayAtsForm, "Away");
    historicalFormScore = af.score;
    if (af.factor) factors.push(af.factor);
  }

  // 4. Data quality
  const dq = computeDataQuality(
    context.bookmakerCoverageMax,
    context.dataFreshnessMinutes,
    context.hasSpreadMarket,
    context.hasTotalMarket,
    context.hasH2HMarket
  );
  const dataQualityPenalty = dq.penalty;
  if (dq.factor) factors.push(dq.factor);

  return {
    lineMovementScore,
    restAdvantageScore,
    historicalFormScore,
    dataQualityPenalty,
    dataQualityScore: dq.qualityScore,
    factors,
  };
}
