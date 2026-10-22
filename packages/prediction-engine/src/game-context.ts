// ============================================================
// Game Context Feature Computation  (v4.0.0)
//
// Computes structured contextual signals from historical data:
//   - Line movement (opening vs current)
//   - Rest days & back-to-back penalty
//   - Overall ATS form (bucketed)
//   - Venue-specific ATS form (home-at-home, away-on-road)
//   - Head-to-head ATS form between these exact opponents
//   - Cross-market consistency (spread vs ML agreement)
//   - Uncertainty penalty (conflicting signal detection)
//   - Data quality score with confidence penalty
//
// All signals are normalized to the same units as other
// scoring components so they can be added/subtracted cleanly.
// ============================================================

// Import shared types from @sports/types — single source of truth
import type { FactorDetail, GameContextInput, AtsFormBucket } from "@sports/types";
import { WEIGHTS } from "./constants.js";
import { clamp } from "./scoring.js";
import { evaluateHighAltitudeFatigueDecay } from "./signals/environmental/high-altitude-fatigue-decay.js";
import { evaluateRefereeCrewTendencies } from "./signals/situational/referee-crew-tendencies.js";
import { evaluateRedZonePersonnelGrouping } from "./signals/tactical/redzone-personnel-grouping.js";
import { evaluateCoachingTendencies } from "./signals/situational/coaching-tendencies.js";

// Re-export so consumers can import GameContextInput/AtsFormBucket from this module
export type { GameContextInput, AtsFormBucket };

// ============================================================
// Output types
// ============================================================

export interface GameContextScores {
  lineMovementScore: number;        // –15 to +15 (enhanced with sharp proxy)
  restAdvantageScore: number;       // –10 to +10
  historicalFormScore: number;      // –10 to +10 (overall ATS form)
  dataQualityPenalty: number;       // –20 to 0
  dataQualityScore: number;         // 0–100 (overall data quality, stored on game)
  // v4 additions
  headToHeadScore: number;          // –5 to +5 (H2H ATS record)
  venueFormScore: number;           // –5 to +5 (venue-specific ATS)
  uncertaintyPenalty: number;       // –8 to 0 (conflicting signals)
  crossMarketScore: number;         // –3 to +4 (spread/ML agreement)
  // v5 additions
  scheduleStressScore: number;      // –5 to +5 (schedule density fatigue)
  // v5.3 additions (Factors 2 & 3)
  injuryScore: number;              // -5 to +5 (structured practice/injury availability signal)
  ngsTrackingScore: number;         // -5 to +5 (in-season NGS tracking features: RYOE, separation, box rate)
  dispersionScore: number;          // -8 to 0 (multi-book market dispersion uncertainty penalty)
  // Situational split features
  altitudeScore?: number;
  refereeCrewScore?: number;
  personnelScore?: number;
  coachingScore?: number;
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
  if (!form) {
    return { score: 0, atsPct: null, factor: null };
  }

  // Gate on DECIDED games (wins + losses), NOT total sample size. sampleSize
  // includes pushes, so a mostly-push bucket (e.g. 1-0-4) would otherwise clear
  // the >=5-game guard and emit a full-strength signal off a single decided
  // game. Gating on decided also subsumes the old decided===0 guard.
  const decided = form.wins + form.losses;
  if (decided < MIN_SAMPLE) return { score: 0, atsPct: null, factor: null };

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
 * Computes an overall data-quality score (0–100) and a confidence penalty.
 * Low-quality data lowers confidence and surfaces a flagged factor.
 *
 * Score components (additive, sum to 0–100):
 *   - Bookmaker coverage: 0–40 pts (linear in book count, full credit at 10+ books)
 *   - Data freshness:     0–30 pts (full credit at 0 min old, linear decay to 0 at 90 min)
 *   - Market coverage:    0–30 pts (10 pts each for spread / total / h2h present)
 *
 * Penalty bands (the penalty is a confidence adjustment applied downstream):
 *   - qualityScore < 30  → penalty -15 ("low data quality")
 *   - qualityScore < 50  → penalty  -8 ("limited data coverage")
 *   - qualityScore >= 50 → penalty   0 (no penalty; also no boost)
 *
 * HONESTY GATE — freshness default. `dataFreshnessMinutes` defaults to 0, which
 * means "measured as perfectly fresh" and grants the full 30 freshness points.
 * It is NOT an "unknown" sentinel: an omitted value is scored as freshest-
 * possible, so missing freshness understates the penalty rather than triggering
 * one. Per the platform's "no stale data" rule, supplying a real measured age is
 * the caller's responsibility; this function trusts the value it is given.
 */
export function computeDataQuality(
  bookmakerCoverageMax: number = 0,
  // Minutes since the odds were fetched. 0 = freshest possible (full credit), NOT
  // "unknown" — see the HONESTY GATE note above; callers must pass a real age.
  dataFreshnessMinutes: number = 0,
  hasSpreadMarket: boolean = false,
  hasTotalMarket: boolean = false,
  hasH2HMarket: boolean = false
): { qualityScore: number; penalty: number; factor: FactorDetail | null } {
  // Bookmaker coverage score (0–40): ideal = 10+ books; 20 base for verified single book
  const coverageScore = bookmakerCoverageMax >= 1 ? Math.max(20, clamp((bookmakerCoverageMax / 10) * 40, 0, 40)) : 0;

  // Freshness score (0–30): full credit at 0min, linear decay to 0 at 90min
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
// Head-to-head ATS form
// ============================================================

/**
 * Returns a score from –5 to +5 based on the picked team's ATS record
 * against this specific opponent. Stricter minimum sample (5 games) and
 * tighter scoring range than overall form — H2H data is sparser.
 */
export function computeHeadToHeadScore(
  h2hForm: AtsFormBucket | null | undefined
): { score: number; atsPct: number | null; factor: FactorDetail | null } {
  const MIN_SAMPLE = 5;
  if (!h2hForm) {
    return { score: 0, atsPct: null, factor: null };
  }

  // Gate on DECIDED games (wins + losses), not sampleSize (which counts pushes),
  // so a mostly-push H2H bucket cannot mint a full ±5 signal off one decided game.
  const decided = h2hForm.wins + h2hForm.losses;
  if (decided < MIN_SAMPLE) return { score: 0, atsPct: null, factor: null };

  const atsPct = h2hForm.wins / decided;

  let score = 0;
  let impact: FactorDetail["impact"] = "neutral";
  let description = "";

  if (atsPct >= 0.70) {
    score = 5;
    impact = "positive";
    description = `Strong H2H ATS: ${h2hForm.wins}-${h2hForm.losses} vs this opponent (${Math.round(atsPct * 100)}%)`;
  } else if (atsPct >= 0.60) {
    score = 3;
    impact = "positive";
    description = `Favorable H2H ATS: ${h2hForm.wins}-${h2hForm.losses} vs this opponent`;
  } else if (atsPct <= 0.30) {
    score = -5;
    impact = "negative";
    description = `Poor H2H ATS: ${h2hForm.wins}-${h2hForm.losses} vs this opponent (${Math.round(atsPct * 100)}%)`;
  } else if (atsPct <= 0.40) {
    score = -3;
    impact = "negative";
    description = `Below-average H2H ATS: ${h2hForm.wins}-${h2hForm.losses} vs this opponent`;
  }

  return {
    score,
    atsPct,
    factor:
      score !== 0
        ? { name: "Head-to-Head Form", impact, description, weight: score }
        : null,
  };
}

// ============================================================
// Venue-specific ATS form
// ============================================================

/**
 * Returns a score from –5 to +5 using the team's ATS record in their
 * specific venue role (home team at home, away team away).
 * Venue splits are more predictive than overall form for certain matchup types.
 */
export function computeVenueFormScore(
  atsFormAtVenue: AtsFormBucket | null | undefined,
  venueLabel: string   // "Home" | "Away" for descriptions
): { score: number; factor: FactorDetail | null } {
  const MIN_SAMPLE = 5;
  if (!atsFormAtVenue) {
    return { score: 0, factor: null };
  }

  // Gate on DECIDED games (wins + losses), not sampleSize (which counts pushes),
  // so a mostly-push venue bucket cannot mint a full ±5 signal off one decided game.
  const decided = atsFormAtVenue.wins + atsFormAtVenue.losses;
  if (decided < MIN_SAMPLE) return { score: 0, factor: null };

  const atsPct = atsFormAtVenue.wins / decided;

  let score = 0;
  let impact: FactorDetail["impact"] = "neutral";
  let description = "";

  if (atsPct >= 0.65) {
    score = 5;
    impact = "positive";
    description = `${venueLabel} covering at ${Math.round(atsPct * 100)}% at ${venueLabel.toLowerCase()} (${atsFormAtVenue.wins}-${atsFormAtVenue.losses} last ${atsFormAtVenue.sampleSize})`;
  } else if (atsPct >= 0.58) {
    score = 3;
    impact = "positive";
    description = `${venueLabel} solid at ${venueLabel.toLowerCase()}: ${atsFormAtVenue.wins}-${atsFormAtVenue.losses} ATS`;
  } else if (atsPct <= 0.35) {
    score = -5;
    impact = "negative";
    description = `${venueLabel} struggling at ${venueLabel.toLowerCase()}: ${atsFormAtVenue.wins}-${atsFormAtVenue.losses} ATS (${Math.round(atsPct * 100)}%)`;
  } else if (atsPct <= 0.42) {
    score = -3;
    impact = "negative";
    description = `${venueLabel} below average at ${venueLabel.toLowerCase()}: ${atsFormAtVenue.wins}-${atsFormAtVenue.losses} ATS`;
  }

  return {
    score,
    factor:
      score !== 0
        ? { name: `${venueLabel} Venue Form`, impact, description, weight: score }
        : null,
  };
}

// ============================================================
// Cross-market consistency
// ============================================================

/**
 * Compares spread pick direction against moneyline market consensus.
 * When both markets independently agree on the same team, conviction increases.
 * When they disagree, a small uncertainty signal is raised.
 *
 * mlFairProbHome: the H2H-derived fair probability for the home team (0–1).
 * If > 0.5, ML market favors home. Use null if no H2H data.
 */
export function computeCrossMarketScore(
  pickedSide: "HOME" | "AWAY" | "OVER" | "UNDER",
  mlFairProbHome: number | null | undefined,
  marketType: "SPREAD" | "TOTAL" | "MONEYLINE"
): { score: number; factor: FactorDetail | null } {
  // Cross-market only applies to SPREAD picks vs ML market
  if (marketType !== "SPREAD" || mlFairProbHome == null) {
    return { score: 0, factor: null };
  }
  // Avoid noise — only signal when ML has clear conviction (≥55%)
  if (Math.abs(mlFairProbHome - 0.5) < 0.05) {
    return { score: 0, factor: null };
  }

  const mlFavorsHome = mlFairProbHome > 0.5;
  const spreadFavorsHome = pickedSide === "HOME";
  const agree = mlFavorsHome === spreadFavorsHome;

  if (agree) {
    return {
      score: WEIGHTS.CROSS_MARKET_AGREE_BONUS,
      factor: {
        name: "Cross-Market Alignment",
        impact: "positive",
        description: `Spread and moneyline markets independently agree — conviction reinforced`,
        weight: WEIGHTS.CROSS_MARKET_AGREE_BONUS,
      },
    };
  } else {
    return {
      score: WEIGHTS.CROSS_MARKET_DISAGREE_PENALTY,
      factor: {
        name: "Cross-Market Divergence",
        impact: "negative",
        description: `Spread and moneyline markets favor opposite sides — conflicting signals`,
        weight: WEIGHTS.CROSS_MARKET_DISAGREE_PENALTY,
      },
    };
  }
}

// ============================================================
// Schedule density / stress signal (v5)
// ============================================================

/**
 * Returns a score from –5 to +5 based on schedule density asymmetry.
 * A team that played 3+ games in the last 7 days while the opponent played 1
 * is under material fatigue pressure — this is separate from back-to-back
 * detection (which only flags the most extreme case).
 *
 * Signal is symmetric: we score from the PICKED SIDE's perspective.
 * When null/null → returns 0 (neutral). No penalty when densities are equal.
 * This signal reads from real game history (TeamGameLog dates), not ATS results,
 * so it is active even before DERIVED_MODEL_HISTORY_ENABLED is true.
 */
export function computeScheduleStressScore(
  scheduleDensityHome: number | null | undefined,
  scheduleDensityAway: number | null | undefined,
  pickedSide: "HOME" | "AWAY" | "OVER" | "UNDER"
): { score: number; factor: FactorDetail | null } {
  // Totals are not side-specific; schedule stress is directional
  if (pickedSide === "OVER" || pickedSide === "UNDER") {
    return { score: 0, factor: null };
  }
  if (scheduleDensityHome == null || scheduleDensityAway == null) {
    return { score: 0, factor: null };
  }

  const home = scheduleDensityHome;
  const away = scheduleDensityAway;

  // Only fire when there is a 2+ game asymmetry in the 7-day window
  const diff = home - away; // positive = home team played more recently
  if (Math.abs(diff) < 2) return { score: 0, factor: null };

  // Normalize on a 1/3-per-game ramp. With |diff| already gated at >= 2, a
  // 2-game diff yields magnitude ≈ 0.667 (~two-thirds of max, rounds to 3 of 5)
  // and a 3+-game diff saturates the full signal.
  const magnitude = clamp(Math.abs(diff) / 3, 0, 1);
  const maxScore = WEIGHTS.SCHEDULE_STRESS_COMPONENT_MAX; // 5

  // diff > 0: home is more fatigued → negative for HOME pick, positive for AWAY pick
  const rawHomeScore = diff > 0 ? -(magnitude * maxScore) : magnitude * maxScore;
  const sideScore = pickedSide === "HOME" ? rawHomeScore : -rawHomeScore;
  const score = clamp(Math.round(sideScore), -maxScore, maxScore);

  // Defensive: the |diff| >= 2 gate above forces |sideScore| >= 3.33, which
  // always rounds to at least 3, so this branch is currently unreachable — it
  // is kept as a guard against future changes to the ramp or maxScore.
  if (score === 0) return { score: 0, factor: null };

  const stressed = diff > 0 ? "Home" : "Away";
  const fresh = diff > 0 ? "Away" : "Home";
  const description =
    `${stressed} team played ${Math.max(home, away)} games in last 7 days vs ${Math.min(home, away)} for ${fresh} — schedule density asymmetry`;

  return {
    score,
    factor: {
      name: "Schedule Density",
      impact: score > 0 ? "positive" : "negative",
      description,
      weight: score,
    },
  };
}

// ============================================================
// Uncertainty penalty — conflicting signal detector
// ============================================================

/**
 * Applies a confidence penalty when key model signals directly contradict.
 * High-conviction picks should have aligned signals.
 * Misaligned signals increase uncertainty even when the pick still scores positively overall.
 *
 * Scenarios that trigger uncertainty:
 *   1. Reverse line movement: strong public consensus but line moving against pick
 *   2. ATS form vs line movement conflict: strong form but line is moving against
 *   3. Cross-market divergence already detected (passed in as flag)
 */
export function computeUncertaintyPenalty(
  lineMovementScore: number,
  historicalFormScore: number,
  headToHeadScore: number,
  crossMarketScore: number
): { penalty: number; factor: FactorDetail | null } {
  const MAX_PENALTY = WEIGHTS.UNCERTAINTY_PENALTY_MAX; // -8

  let conflictCount = 0;
  const conflictDescriptions: string[] = [];

  // Conflict 1: strong line movement against a positive historical signal
  if (lineMovementScore < -5 && (historicalFormScore > 3 || headToHeadScore > 2)) {
    conflictCount++;
    conflictDescriptions.push("line moving against historical trend");
  }

  // Conflict 2: strong historical form but significant line fade
  if (lineMovementScore < -8 && historicalFormScore > 5) {
    conflictCount++;
    conflictDescriptions.push("market fading a historically strong side");
  }

  // Conflict 3: cross-market divergence compounds other conflicts
  if (crossMarketScore < 0 && lineMovementScore < -3) {
    conflictCount++;
    conflictDescriptions.push("spread and ML markets disagree with line direction");
  }

  if (conflictCount === 0) return { penalty: 0, factor: null };

  // Scale penalty by number of conflicts (each adds -3 to -4)
  const penalty = clamp(conflictCount * -4, MAX_PENALTY, 0);

  return {
    penalty,
    factor: {
      name: "Signal Conflict",
      impact: "negative",
      description: `Conflicting signals: ${conflictDescriptions.join("; ")} — confidence reduced`,
      weight: penalty,
    },
  };
}

// ============================================================
// Biophysical / Practice Availability (v5.3 - Factor 2)
// ============================================================

/**
 * Biophysical / Practice Availability feature (v5.3 - Factor 2).
 *
 * Evaluates practice participation delta (DNP vs LIMITED vs FULL) and DNP days.
 * Gated by injuryFreshnessHours <= 72. Stale or absent reports return 0.
 * Positive = picked side has availability advantage (opponent banged up / missing practice).
 * Negative = picked side disadvantaged by practice DNPs / key injuries.
 */
export function computeBiophysicalInjuryScore(
  practiceStatusHome: string | null | undefined,
  practiceStatusAway: string | null | undefined,
  dnpDaysHome: number | null | undefined,
  dnpDaysAway: number | null | undefined,
  injuryFreshnessHours: number | null | undefined,
  pickedSide: "HOME" | "AWAY" | "OVER" | "UNDER"
): { score: number; factor: FactorDetail | null } {
  // Side-agnostic or totals markets do not evaluate directional team injuries
  if (pickedSide === "OVER" || pickedSide === "UNDER") {
    return { score: 0, factor: null };
  }
  // Freshness gate: 72 hours max
  if (injuryFreshnessHours == null || injuryFreshnessHours > 72) {
    return { score: 0, factor: null };
  }
  if (!practiceStatusHome && !practiceStatusAway && dnpDaysHome == null && dnpDaysAway == null) {
    return { score: 0, factor: null };
  }

  const isDnp = (status?: string | null) => {
    if (!status) return false;
    const s = status.toUpperCase();
    return s.includes("DNP") || s.includes("DIDNOT") || s.includes("OUT");
  };
  const isFull = (status?: string | null) => {
    if (!status) return false;
    const s = status.toUpperCase();
    return s.includes("FULL");
  };

  const homeDnp = isDnp(practiceStatusHome) || (dnpDaysHome != null && dnpDaysHome >= 2);
  const awayDnp = isDnp(practiceStatusAway) || (dnpDaysAway != null && dnpDaysAway >= 2);
  const homeFull = isFull(practiceStatusHome) || (dnpDaysHome != null && dnpDaysHome === 0);
  const awayFull = isFull(practiceStatusAway) || (dnpDaysAway != null && dnpDaysAway === 0);

  // Net home advantage (positive = home is healthier, away is more injured)
  let homeAdvantage = 0;
  if (awayDnp && homeFull) {
    homeAdvantage = 3;
  } else if (awayDnp && !homeDnp) {
    homeAdvantage = 2;
  } else if (homeDnp && awayFull) {
    homeAdvantage = -3;
  } else if (homeDnp && !awayDnp) {
    homeAdvantage = -2;
  } else if (dnpDaysHome != null && dnpDaysAway != null) {
    const diff = dnpDaysAway - dnpDaysHome; // more away DNP days = home advantage
    homeAdvantage = clamp(diff * 1.5, -4, 4);
  }

  const rawScore = pickedSide === "HOME" ? homeAdvantage : -homeAdvantage;
  const score = clamp(Math.round(rawScore), -5, 5);

  if (score === 0) return { score: 0, factor: null };

  const sideLabel = pickedSide === "HOME" ? "Home" : "Away";
  const oppLabel = pickedSide === "HOME" ? "Away" : "Home";
  const desc = score > 0
    ? `Biophysical advantage: ${oppLabel} practice DNPs / limited availability (${injuryFreshnessHours}h fresh report)`
    : `Biophysical disadvantage: ${sideLabel} practice DNPs / injury impact (${injuryFreshnessHours}h fresh report)`;

  return {
    score,
    factor: {
      name: "Biophysical Injury Signal",
      impact: score > 0 ? "positive" : "negative",
      description: desc,
      weight: score,
    },
  };
}

// ============================================================
// In-Season NGS Tracking (v5.3 - Factor 2)
// ============================================================

/**
 * In-season NGS Tracking feature (v5.3 - Factor 2).
 *
 * Compares RYOE (Rush Yards Over Expected) and stacked box rate.
 * Gated by trackingFreshnessMinutes <= 10080 (7 days). Stale or absent data returns 0.
 * Positive = picked side has superior ground efficiency / explosive separation.
 */
export function computeNgsTrackingScore(
  ngsRyoeHome: number | null | undefined,
  ngsRyoeAway: number | null | undefined,
  ngsBoxStackedRateHome: number | null | undefined,
  ngsBoxStackedRateAway: number | null | undefined,
  trackingFreshnessMinutes: number | null | undefined,
  pickedSide: "HOME" | "AWAY" | "OVER" | "UNDER"
): { score: number; factor: FactorDetail | null } {
  if (pickedSide === "OVER" || pickedSide === "UNDER") {
    return { score: 0, factor: null };
  }
  // Freshness gate: 7 days (10,080 minutes)
  if (trackingFreshnessMinutes == null || trackingFreshnessMinutes > 10080) {
    return { score: 0, factor: null };
  }
  if (ngsRyoeHome == null && ngsRyoeAway == null) {
    return { score: 0, factor: null };
  }

  const ryoeHome = ngsRyoeHome ?? 0;
  const ryoeAway = ngsRyoeAway ?? 0;
  const ryoeDiff = pickedSide === "HOME" ? ryoeHome - ryoeAway : ryoeAway - ryoeHome;

  let raw = 0;
  if (ryoeDiff >= 100) raw += 3;
  else if (ryoeDiff >= 50) raw += 2;
  else if (ryoeDiff >= 20) raw += 1;
  else if (ryoeDiff <= -100) raw -= 3;
  else if (ryoeDiff <= -50) raw -= 2;
  else if (ryoeDiff <= -20) raw -= 1;

  // Box stacked bonus: if facing 8+ in box at high rate (> 0.25) while maintaining positive RYOE
  const pickedStacked = pickedSide === "HOME" ? ngsBoxStackedRateHome : ngsBoxStackedRateAway;
  if (pickedStacked != null && pickedStacked >= 0.25 && ryoeDiff > 0) {
    raw += 1;
  }

  const score = clamp(Math.round(raw), -5, 5);
  if (score === 0) return { score: 0, factor: null };

  const desc = `NGS tracking: RYOE differential ${ryoeDiff > 0 ? "+" : ""}${ryoeDiff.toFixed(1)} yds (${Math.round(trackingFreshnessMinutes / 60)}h freshness)`;

  return {
    score,
    factor: {
      name: "NGS Tracking Edge",
      impact: score > 0 ? "positive" : "negative",
      description: desc,
      weight: score,
    },
  };
}

// ============================================================
// Multi-Book Market Dispersion (v5.3 - Factor 3)
// ============================================================

/**
 * Multi-Book Market Dispersion Uncertainty Penalty (v5.3 - Factor 3).
 *
 * Imposes down-sizing or penalty when multi-book market spread dispersion >= 1.5
 * or ML dispersion >= 0.08, signaling wide market disagreement.
 * Scale: –8 to 0.
 */
export function computeDispersionUncertaintyScore(
  marketSpreadDispersion: number | null | undefined,
  marketMlDispersion: number | null | undefined,
  marketType: "SPREAD" | "TOTAL" | "MONEYLINE"
): { penalty: number; factor: FactorDetail | null } {
  let penalty = 0;
  const reasons: string[] = [];

  if (marketType === "SPREAD" && marketSpreadDispersion != null) {
    if (marketSpreadDispersion >= 2.0) {
      penalty = -5;
      reasons.push(`spread dispersion ${marketSpreadDispersion.toFixed(1)} pts (>= 2.0)`);
    } else if (marketSpreadDispersion >= 1.5) {
      penalty = -3;
      reasons.push(`spread dispersion ${marketSpreadDispersion.toFixed(1)} pts (>= 1.5)`);
    } else if (marketSpreadDispersion >= 1.0) {
      penalty = -1;
      reasons.push(`spread dispersion ${marketSpreadDispersion.toFixed(1)} pts (>= 1.0)`);
    }
  } else if (marketType === "MONEYLINE" && marketMlDispersion != null) {
    if (marketMlDispersion >= 0.12) {
      penalty = -5;
      reasons.push(`moneyline dispersion ${(marketMlDispersion * 100).toFixed(1)}% (>= 12%)`);
    } else if (marketMlDispersion >= 0.08) {
      penalty = -3;
      reasons.push(`moneyline dispersion ${(marketMlDispersion * 100).toFixed(1)}% (>= 8%)`);
    } else if (marketMlDispersion >= 0.05) {
      penalty = -1;
      reasons.push(`moneyline dispersion ${(marketMlDispersion * 100).toFixed(1)}% (>= 5%)`);
    }
  }

  penalty = clamp(penalty, -8, 0);
  if (penalty === 0) return { penalty: 0, factor: null };

  return {
    penalty,
    factor: {
      name: "Multi-Book Dispersion Penalty",
      impact: "negative",
      description: `Market uncertainty elevated: ${reasons.join(", ")} — multi-book disagreement`,
      weight: penalty,
    },
  };
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

  // 3. Historical form for the picked side (overall ATS)
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

  // 4. Venue-specific ATS form (v4)
  let venueFormScore = 0;
  if (pickedSide === "HOME" && context.homeAtsFormAtHome) {
    const vf = computeVenueFormScore(context.homeAtsFormAtHome, "Home");
    venueFormScore = vf.score;
    if (vf.factor) factors.push(vf.factor);
  } else if (pickedSide === "AWAY" && context.awayAtsFormAway) {
    const vf = computeVenueFormScore(context.awayAtsFormAway, "Away");
    venueFormScore = vf.score;
    if (vf.factor) factors.push(vf.factor);
  }

  // 5. Head-to-head form (v4)
  let headToHeadScore = 0;
  if (context.headToHeadForm && (pickedSide === "HOME" || pickedSide === "AWAY")) {
    const h2h = computeHeadToHeadScore(context.headToHeadForm);
    headToHeadScore = h2h.score;
    if (h2h.factor) factors.push(h2h.factor);
  }

  // 6. Cross-market consistency (v4) — only meaningful for SPREAD vs ML
  const crossMarket = computeCrossMarketScore(
    pickedSide,
    context.mlFairProbHome,
    marketType
  );
  const crossMarketScore = crossMarket.score;
  if (crossMarket.factor) factors.push(crossMarket.factor);

  // 7. Uncertainty penalty (v4) — detects conflicting signal combinations
  const up = computeUncertaintyPenalty(
    lineMovementScore,
    historicalFormScore,
    headToHeadScore,
    crossMarketScore
  );
  const uncertaintyPenalty = up.penalty;
  if (up.factor) factors.push(up.factor);

  // 8. Schedule density / stress (v5) — fatigue asymmetry from game frequency
  // Active even in bootstrap mode — reads real game schedule, not ATS results.
  const ss = computeScheduleStressScore(
    context.scheduleDensityHome,
    context.scheduleDensityAway,
    pickedSide
  );
  const scheduleStressScore = ss.score;
  if (ss.factor) factors.push(ss.factor);

  // 9. Data quality
  const dq = computeDataQuality(
    context.bookmakerCoverageMax,
    context.dataFreshnessMinutes,
    context.hasSpreadMarket,
    context.hasTotalMarket,
    context.hasH2HMarket
  );
  const dataQualityPenalty = dq.penalty;
  if (dq.factor) factors.push(dq.factor);

  // 10. Biophysical Injury Score (v5.3 - Factor 2)
  const injury = computeBiophysicalInjuryScore(
    context.practiceStatusHome,
    context.practiceStatusAway,
    context.dnpDaysHome,
    context.dnpDaysAway,
    context.injuryFreshnessHours,
    pickedSide
  );
  const injuryScore = injury.score;
  if (injury.factor) factors.push(injury.factor);

  // 11. In-Season NGS Tracking Score (v5.3 - Factor 2)
  const ngs = computeNgsTrackingScore(
    context.ngsRyoeHome,
    context.ngsRyoeAway,
    context.ngsBoxStackedRateHome,
    context.ngsBoxStackedRateAway,
    context.trackingFreshnessMinutes,
    pickedSide
  );
  const ngsTrackingScore = ngs.score;
  if (ngs.factor) factors.push(ngs.factor);

  // 12. Multi-Book Market Dispersion Penalty (v5.3 - Factor 3)
  const disp = computeDispersionUncertaintyScore(
    context.marketSpreadDispersion,
    context.marketMlDispersion,
    marketType
  );
  const dispersionScore = disp.penalty;
  if (disp.factor) factors.push(disp.factor);

  // 13. High-Altitude Environmental Fatigue & Aerodynamics
  let altitudeScore = 0;
  const altitudeFeet = context.altitudeFt ?? context.venueAltitudeFeet ?? 0;
  if (altitudeFeet >= 4000) {
    const isAway = pickedSide === "AWAY";
    const altResult = evaluateHighAltitudeFatigueDecay({
      venueAltitudeFeet: altitudeFeet,
      isVisitingTeam: isAway,
      visitingTeamArrivalDaysPrior: 1,
      defensiveSnapCountPaceProjection: 68,
    });
    if (altResult.isHighAltitudeVenue) {
      if (marketType === "SPREAD" || marketType === "MONEYLINE") {
        altitudeScore = pickedSide === "HOME" ? 2 : pickedSide === "AWAY" ? -2 : 0;
      } else if (marketType === "TOTAL") {
        altitudeScore = pickedSide === "OVER" ? 1 : -1;
      }
      factors.push({
        name: "High-Altitude Venue Fatigue",
        impact: altitudeScore > 0 ? "positive" : altitudeScore < 0 ? "negative" : "neutral",
        description: altResult.explanation,
        weight: altitudeScore,
      });
    }
  }

  // 14. Officiating Crew Tendencies & Crowd Acoustics
  let refereeCrewScore = 0;
  if (context.refereeCrewFlagsPerGame != null && context.refereeCrewFlagsPerGame > 0) {
    const refResult = evaluateRefereeCrewTendencies({
      refereeName: context.refereeName || "Officiating Crew",
      crewFlagsPerGame: context.refereeCrewFlagsPerGame,
      leagueAvgFlagsPerGame: 12.4,
      defensiveHoldingFlagsPerGame: 1.9,
      passInterferenceFlagsPerGame: 1.4,
      homePenaltyRateRatio: 0.46,
    });
    if (marketType === "TOTAL") {
      refereeCrewScore = refResult.penaltyPaceTier === "HEAVY_FLAGS"
        ? (pickedSide === "UNDER" ? 2 : -2)
        : refResult.penaltyPaceTier === "LET_THEM_PLAY"
          ? (pickedSide === "OVER" ? 2 : -2)
          : 0;
    } else if (marketType === "SPREAD" || marketType === "MONEYLINE") {
      if (refResult.homeFieldPenaltyYardageAdvantage > 5) {
        refereeCrewScore = pickedSide === "HOME" ? 1 : pickedSide === "AWAY" ? -1 : 0;
      }
    }
    if (refereeCrewScore !== 0) {
      factors.push({
        name: "Officiating Crew Tendency",
        impact: refereeCrewScore > 0 ? "positive" : "negative",
        description: `Referee flag tier: ${refResult.penaltyPaceTier} (${context.refereeCrewFlagsPerGame.toFixed(1)} flags/gm)`,
        weight: refereeCrewScore,
      });
    }
  }

  // 15. Red Zone Personnel Grouping Leverage (12/13/21 jumbo vs 11)
  let personnelScore = 0;
  if (context.primaryPersonnelGrouping) {
    const rzResult = evaluateRedZonePersonnelGrouping({
      primaryRedZonePersonnelGrouping: context.primaryPersonnelGrouping,
      offensiveLineRunBlockGrade: context.offensiveLineRunBlockGrade ?? 70,
      opponentDefensiveFrontSevenGrade: context.opponentDefensiveFrontSevenGrade ?? 70,
      goalLineDistanceYards: 3.0,
    });
    if (rzResult.defensivePersonnelMismatchTier === "HEAVY_RUN_LEVERAGE") {
      personnelScore = pickedSide === "HOME" || pickedSide === "OVER" ? 2 : -1;
    }
    if (personnelScore !== 0) {
      factors.push({
        name: "Personnel Grouping Leverage",
        impact: personnelScore > 0 ? "positive" : "negative",
        description: `Primary grouping: ${context.primaryPersonnelGrouping} (Run Prob: ${(rzResult.expectedRunProbability * 100).toFixed(0)}%, PA Bonus: +${rzResult.playActionEpaBonus.toFixed(2)} EPA)`,
        weight: personnelScore,
      });
    }
  }

  // 16. Coaching Situational Tendency & 4th-Down Aggressiveness
  let coachingScore = 0;
  if (context.coachAggressivenessScore != null) {
    const coachResult = evaluateCoachingTendencies({
      down: 4,
      distance: 2,
      coachAggressivenessScore: context.coachAggressivenessScore,
    });
    if (coachResult.fourthDownGoForItEdgeEv > 0.15) {
      coachingScore = pickedSide === "HOME" ? 1 : 0;
    } else if (coachResult.fourthDownGoForItEdgeEv < -0.15) {
      coachingScore = pickedSide === "HOME" ? -1 : 0;
    }
    if (coachingScore !== 0) {
      factors.push({
        name: "Coaching Situational Tendency",
        impact: coachingScore > 0 ? "positive" : "negative",
        description: `Coach aggressiveness: ${context.coachAggressivenessScore.toFixed(2)} (4th-down edge: +${coachResult.fourthDownGoForItEdgeEv.toFixed(2)} EV)`,
        weight: coachingScore,
      });
    }
  }

  return {
    lineMovementScore,
    restAdvantageScore,
    historicalFormScore,
    dataQualityPenalty,
    dataQualityScore: dq.qualityScore,
    // v4
    headToHeadScore,
    venueFormScore,
    uncertaintyPenalty,
    crossMarketScore,
    // v5
    scheduleStressScore,
    // v5.3 (Factors 2 & 3)
    injuryScore,
    ngsTrackingScore,
    dispersionScore,
    // Situational splits
    altitudeScore,
    refereeCrewScore,
    personnelScore,
    coachingScore,
    factors,
  };
}

// ============================================================
// Sovereign Signal Plane Consumption (Vision + FTN + QBR + Snaps + Cognitive + NGS)
// ============================================================

/**
 * Production weights for the 17 active Week 6 Sovereign Signal Plane keys
 * persisted in the Neon DB `signals` and `game_signals` tables.
 */
export const SOVEREIGN_SIGNAL_PLANE_WEIGHTS: Readonly<Record<string, number>> = Object.freeze({
  "vision.soe_yd": 0.085,
  "vision.art_mean": 0.075,
  "vision.pocket_depth_yd": 0.065,
  "ftn.play_action_rate": 0.090,
  "ftn.motion_rate": 0.080,
  "ftn.screen_rate": 0.055,
  "ftn.rpo_rate": 0.060,
  "ftn.def_blitz_rate": 0.095,
  "qbr.total_qbr": 0.110,
  "snaps.starter_snap_share": 0.070,
  "cognitive.presser_sentiment": 0.050,
  "cognitive.coach_speak_delta": 0.065,
  "cognitive.scheme_shift": 0.075,
  "cognitive.tendency_break": 0.080,
  "ngs.avg_separation": 0.085,
  "ngs.ryoe_per_att": 0.095,
  "ngs.cpoe": 0.105,
});

export interface SovereignSignalContribution {
  readonly key: string;
  readonly weight: number;
  readonly homeValue: number;
  readonly awayValue: number;
  readonly directionalReading: number;
  readonly probContribution: number;
}

export interface SovereignSignalPlaneSummary {
  readonly equation: string;
  readonly marketFairProb: number;
  readonly structuralDeltaProb: number;
  readonly continuityDeltaProb: number;
  readonly signalPlaneDeltaProb: number;
  readonly trueProb: number;
  readonly rawEdge: number;
  readonly shrunkEdge: number;
  readonly expectedClv: number;
  readonly edgeScore: number;
  readonly signalContributions: readonly SovereignSignalContribution[];
}

/**
 * Combines persisted `signals` / `game_signals` rows for the 17 Sovereign Signal
 * Plane keys (`vision.*`, `ftn.*`, `qbr.*`, `snaps.*`, `cognitive.*`, `ngs.*`)
 * with the structural base probability and Week 5 -> Week 6 continuity deltas
 * to produce the pick's model `trueProb`, `rawEdge`, and `edgeScore`.
 *
 * Equation:
 *   c_k = weight_k * directionalReading_k * 0.065
 *   signalPlaneDeltaProb = sum_k(c_k)
 *   trueProb = clamp(marketFairProb + structuralDeltaProb + continuityDeltaProb + signalPlaneDeltaProb, 0.05, 0.95)
 *   rawEdge = trueProb - marketFairProb
 *   edgeScore = clamp(50 + 180 * rawEdge, 0, 100)
 */
export function computeSovereignSignalPlaneContribution(
  homeSignals: Readonly<Record<string, { value: number; weight?: number }>>,
  awaySignals: Readonly<Record<string, { value: number; weight?: number }>>,
  marketType: "SPREAD" | "TOTAL" | "MONEYLINE",
  pickedSide: "HOME" | "AWAY" | "OVER" | "UNDER",
  marketFairProb: number,
  structuralDeltaProb: number = 0,
  continuityDeltaProb: number = 0,
): SovereignSignalPlaneSummary {
  const PROB_SCALE = 0.25;
  const totalUnderKeys = new Set([
    "vision.art_mean",
    "ftn.def_blitz_rate",
    "ftn.screen_rate",
    "cognitive.tendency_break",
  ]);

  const contributions: SovereignSignalContribution[] = [];
  let signalPlaneDeltaProb = 0;

  for (const [key, defaultWeight] of Object.entries(SOVEREIGN_SIGNAL_PLANE_WEIGHTS)) {
    const hEntry = homeSignals[key];
    const aEntry = awaySignals[key];
    if (!hEntry && !aEntry) continue;

    const hVal = hEntry?.value ?? 0;
    const aVal = aEntry?.value ?? 0;
    const weight = hEntry?.weight ?? aEntry?.weight ?? defaultWeight;

    let directionalReading = 0;
    if (marketType === "SPREAD" || marketType === "MONEYLINE") {
      const diff = hVal - aVal;
      directionalReading = pickedSide === "HOME" ? diff : -diff;
    } else {
      // TOTAL market: combine both teams' offensive/pace vs defensive/disruption signals
      const meanSignal = (hVal + aVal) / 2;
      const overAligned = totalUnderKeys.has(key) ? -meanSignal : meanSignal;
      directionalReading = pickedSide === "OVER" ? overAligned : -overAligned;
    }

    const probContribution = Number((weight * directionalReading * PROB_SCALE).toFixed(5));
    signalPlaneDeltaProb += probContribution;
    contributions.push({
      key,
      weight: Number(weight.toFixed(4)),
      homeValue: Number(hVal.toFixed(4)),
      awayValue: Number(aVal.toFixed(4)),
      directionalReading: Number(directionalReading.toFixed(4)),
      probContribution,
    });
  }

  signalPlaneDeltaProb = Number(signalPlaneDeltaProb.toFixed(4));
  const trueProb = Number(
    clamp(
      marketFairProb + structuralDeltaProb + continuityDeltaProb + signalPlaneDeltaProb,
      0.05,
      0.95,
    ).toFixed(4),
  );
  const rawEdge = Number((trueProb - marketFairProb).toFixed(4));
  const shrunkEdge = Number((rawEdge * 0.82).toFixed(4));
  const expectedClv = Number((rawEdge * 0.75).toFixed(4));
  const edgeScore = Number(clamp(50 + 180 * rawEdge, 0, 100).toFixed(1));

  return {
    equation:
      "trueProb = clamp(marketFairProb + structuralDeltaProb + continuityDeltaProb + sum(weight_k * directionalReading_k * 0.25), 0.05, 0.95)",
    marketFairProb: Number(marketFairProb.toFixed(4)),
    structuralDeltaProb: Number(structuralDeltaProb.toFixed(4)),
    continuityDeltaProb: Number(continuityDeltaProb.toFixed(4)),
    signalPlaneDeltaProb,
    trueProb,
    rawEdge,
    shrunkEdge,
    expectedClv,
    edgeScore,
    signalContributions: contributions,
  };
}

// ============================================================================
// Stream 4: Layer-2 Situational Corpus Gap Remediation & Decision-Time Re-Pricing
// ============================================================================

export interface DecisionTimeRepricingInput {
  readonly openFairProb: number;
  readonly decisionFairProb: number;
  readonly modelTrueProb: number;
  readonly newsShockDeltaProb?: number;
}

export interface DecisionTimeRepricingResult {
  readonly edgeVsOpen: number;
  readonly edgeVsDecisionLine: number;
  readonly steamAbsorbedFraction: number;
  readonly staleSteamFadeRecommended: boolean;
  readonly action: "PUBLISH_LIVE_EDGE" | "PASS_STALE_STEAM" | "FADE_OVERREACTION";
}

export function evaluateDecisionTimeRepricing(input: DecisionTimeRepricingInput): DecisionTimeRepricingResult {
  const edgeVsOpen = Number((input.modelTrueProb - input.openFairProb).toFixed(4));
  const edgeVsDecisionLine = Number((input.modelTrueProb - input.decisionFairProb).toFixed(4));
  const move = input.decisionFairProb - input.openFairProb;
  const shock = input.newsShockDeltaProb ?? move;
  const steamAbsorbedFraction =
    Math.abs(shock) > 1e-6 ? Number(Math.min(Math.max(move / shock, 0), 2.5).toFixed(4)) : 1.0;
  const staleSteamFadeRecommended = Math.abs(move) >= 0.035 && steamAbsorbedFraction > 1.35 && edgeVsDecisionLine < 0;
  const action =
    edgeVsDecisionLine >= 0.02
      ? "PUBLISH_LIVE_EDGE"
      : staleSteamFadeRecommended
        ? "FADE_OVERREACTION"
        : "PASS_STALE_STEAM";
  return {
    edgeVsOpen,
    edgeVsDecisionLine,
    steamAbsorbedFraction,
    staleSteamFadeRecommended,
    action,
  };
}

export interface PreventDefenseRegimeResult {
  readonly preventActive: boolean;
  readonly underneathCompletionLift: number;
  readonly deepExplosiveSuppression: number;
  readonly trailingPassRateLift: number;
  readonly clockBleedSecondsPerPlay: number;
}

export function evaluatePreventDefenseRegime(
  scoreDifferential: number,
  gameSecondsRemaining: number,
): PreventDefenseRegimeResult {
  const absLead = Math.abs(scoreDifferential);
  const preventActive = absLead >= 14 && gameSecondsRemaining <= 600 && gameSecondsRemaining > 0;
  if (!preventActive) {
    return {
      preventActive: false,
      underneathCompletionLift: 0,
      deepExplosiveSuppression: 0,
      trailingPassRateLift: 0,
      clockBleedSecondsPerPlay: 0,
    };
  }
  const intensity = Math.min(1.5, (absLead - 10) / 14) * Math.min(1.2, (600 - gameSecondsRemaining) / 300 + 0.4);
  return {
    preventActive: true,
    underneathCompletionLift: Number((0.114 * intensity).toFixed(4)),
    deepExplosiveSuppression: Number((-0.42 * Math.min(intensity, 1.2)).toFixed(4)),
    trailingPassRateLift: Number((0.182 * intensity).toFixed(4)),
    clockBleedSecondsPerPlay: Number((-6.5 * Math.min(intensity, 1.2)).toFixed(2)),
  };
}

export interface CompoundScheduleFatigueInput {
  readonly consecutiveRoadGames: number;
  readonly priorGameOvertimeOrMnf: boolean;
  readonly timeZonesCrossed: number;
  readonly restDaysDelta: number;
}

export function evaluateCompoundScheduleFatigueSpot(input: CompoundScheduleFatigueInput): {
  readonly compoundFatigueActive: boolean;
  readonly q4DefensiveEpaPenalty: number;
  readonly pointSpreadPenalty: number;
} {
  const compoundFatigueActive =
    input.consecutiveRoadGames >= 2 && (input.priorGameOvertimeOrMnf || input.timeZonesCrossed >= 2);
  if (!compoundFatigueActive) {
    return { compoundFatigueActive: false, q4DefensiveEpaPenalty: 0, pointSpreadPenalty: 0 };
  }
  const tzFactor = 1 + 0.18 * Math.max(0, input.timeZonesCrossed - 1);
  const restFactor = 1 + 0.12 * Math.max(0, -input.restDaysDelta);
  const q4DefensiveEpaPenalty = Number((0.065 * tzFactor * restFactor).toFixed(4));
  const pointSpreadPenalty = Number((-1.85 * tzFactor * restFactor).toFixed(2));
  return { compoundFatigueActive: true, q4DefensiveEpaPenalty, pointSpreadPenalty };
}

export function evaluateDomeColdWindTransition(input: {
  readonly isDomeTeamOnRoadOutdoors: boolean;
  readonly temperatureF: number;
  readonly windMph: number;
}): {
  readonly transitionActive: boolean;
  readonly completionRateDelta: number;
  readonly epaPerDropbackDelta: number;
  readonly totalPointsDelta: number;
} {
  if (!input.isDomeTeamOnRoadOutdoors || (input.temperatureF > 40 && input.windMph < 13)) {
    return { transitionActive: false, completionRateDelta: 0, epaPerDropbackDelta: 0, totalPointsDelta: 0 };
  }
  const coldExcess = Math.max(0, (40 - input.temperatureF) / 15);
  const windExcess = Math.max(0, (input.windMph - 12) / 10);
  const severity = Math.min(2.0, coldExcess + windExcess + 0.5 * coldExcess * windExcess);
  return {
    transitionActive: severity > 0,
    completionRateDelta: Number((-0.048 * severity).toFixed(4)),
    epaPerDropbackDelta: Number((-0.072 * severity).toFixed(4)),
    totalPointsDelta: Number((-2.8 * severity).toFixed(2)),
  };
}

export function parseBetSlipMetadata(rawSlipText: string): {
  readonly americanOdds: number | null;
  readonly lineValue: number | null;
  readonly impliedProb: number | null;
  readonly isSameGameParlay: boolean;
} {
  const oddsMatch = rawSlipText.match(/(?:^|\s)([+-]\d{3,4})(?:\s|$)/);
  const lineMatch = rawSlipText.match(/(?:[+-]?\d+\.5)\b/);
  const americanOdds = oddsMatch ? Number.parseInt(oddsMatch[1], 10) : null;
  const lineValue = lineMatch ? Number.parseFloat(lineMatch[0]) : null;
  let impliedProb: number | null = null;
  if (americanOdds !== null && americanOdds !== 0) {
    impliedProb =
      americanOdds > 0
        ? Number((100 / (americanOdds + 100)).toFixed(4))
        : Number((Math.abs(americanOdds) / (Math.abs(americanOdds) + 100)).toFixed(4));
  }
  const isSameGameParlay = /\b(SGP|Same Game Parlay)\b/i.test(rawSlipText);
  return { americanOdds, lineValue, impliedProb, isSameGameParlay };
}

