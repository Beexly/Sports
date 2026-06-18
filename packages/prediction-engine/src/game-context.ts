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
//   - Media context (Airwave APPROVED claims, weight 0 / inert — J9)
//
// All signals are normalized to the same units as other
// scoring components so they can be added/subtracted cleanly.
// ============================================================

// Import shared types from @sports/types — single source of truth
import type { FactorDetail, GameContextInput, AtsFormBucket, ApprovedMediaClaimInput } from "@sports/types";
import { WEIGHTS } from "./constants.js";
import { clamp } from "./scoring.js";

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
  // J9 — Airwave media context (inert: weight 0, never priced into confidence)
  mediaContextScore: number;        // directional signal for glass box only; always 0 in confidence sum
  factors: FactorDetail[];
}

// ============================================================
// Airwave media context input (J9)
//
// An ApprovedMediaClaimInput is a ClaimCandidate with operator_status === "APPROVED"
// that has been linked to the game being scored. The prediction engine consumes
// a pre-filtered slice — only APPROVED claims, never PENDING/DRAFT/REJECTED.
//
// LINKAGE REALITY (2026-06-18): ClaimCandidate carries no game-id FK. Claims
// reference games only via the free-text `entity` + `entity_type` fields.
// Until a structured game-id link is built in the ingestion layer and persisted
// (e.g. a `gameId: string` FK added to the claim DB model and populated by a
// matching step), this field will always be an empty array and the factor will
// always be NEUTRAL / score 0. The factor is still surfaced in the glass box so
// the shape is ready when the data arrives.
//
// TO ACTIVATE (non-zero weight, non-neutral signal):
//   1. Add `gameId: string` FK to the claim persistence model (Prisma).
//   2. Wire a matching step in the ingestion layer that resolves claim.entity
//      (entity_type === "game") → Game.id and writes the FK.
//   3. Pass the linked claims into GameContextInput.approvedMediaClaims.
//   4. Bump MODEL_VERSION and add a docs/calibration-proposals entry before
//      changing `weight` from 0 to any non-zero value — NEVER an automatic flip.
// ============================================================

// ApprovedMediaClaimInput is defined in @sports/types (single source of truth).
// Re-export it from this module so consumers can import from the engine package.
export type { ApprovedMediaClaimInput };

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
 *   - Data freshness: 0–30 pts (full credit at 0 min, linear decay to 0 at 90 min)
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
  if (!h2hForm || h2hForm.sampleSize < MIN_SAMPLE) {
    return { score: 0, atsPct: null, factor: null };
  }

  const decided = h2hForm.wins + h2hForm.losses;
  if (decided === 0) return { score: 0, atsPct: null, factor: null };

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
  if (!atsFormAtVenue || atsFormAtVenue.sampleSize < MIN_SAMPLE) {
    return { score: 0, factor: null };
  }

  const decided = atsFormAtVenue.wins + atsFormAtVenue.losses;
  if (decided === 0) return { score: 0, factor: null };

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

  // Normalize: 2-game diff = half score, 3+-game diff = full signal
  const magnitude = clamp(Math.abs(diff) / 3, 0, 1);
  const maxScore = WEIGHTS.SCHEDULE_STRESS_COMPONENT_MAX; // 5

  // diff > 0: home is more fatigued → negative for HOME pick, positive for AWAY pick
  const rawHomeScore = diff > 0 ? -(magnitude * maxScore) : magnitude * maxScore;
  const sideScore = pickedSide === "HOME" ? rawHomeScore : -rawHomeScore;
  const score = clamp(Math.round(sideScore), -maxScore, maxScore);

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
// Media context signal — Airwave APPROVED claims (J9)
// INERT: weight 0, priced: false. Never contributes to confidence sum.
//
// Activating this factor (giving it a non-zero weight) requires:
//   a) Approved-claim → game-id linkage data to exist (see ApprovedMediaClaimInput
//      JSDoc for the exact fields + migration steps needed).
//   b) A MODEL_VERSION bump.
//   c) A docs/calibration-proposals entry proving directional accuracy vs outcomes.
// These are hard gates, not soft preferences. Do NOT flip weight to non-zero
// without completing all three steps.
// ============================================================

/**
 * Computes a directional media-context signal from APPROVED Airwave claims.
 *
 * The returned score is a raw directional number (–5 to +5) for glass-box
 * display. The returned FactorDetail carries **weight: 0** unconditionally —
 * the signal is surfaced but NEVER added to the confidence sum.
 *
 * When no approved claims are linked to this game (the current reality as of
 * 2026-06-18), returns score 0 / factor with impact "neutral". This is the
 * honest default: we do not fabricate a signal from absent data.
 *
 * @param claims    Pre-filtered APPROVED claims linked to this game.
 *                  Pass [] when no approved-claim → game linkage exists yet.
 * @param pickedSide  The side being scored (HOME/AWAY/OVER/UNDER).
 */
export function computeMediaContextScore(
  claims: ApprovedMediaClaimInput[],
  pickedSide: "HOME" | "AWAY" | "OVER" | "UNDER"
): { score: number; factor: FactorDetail } {
  // NEUTRAL always — totals picks have no home/away direction to align claims to.
  // Totals claims could be future work; scope here is directional side picks only.
  if (pickedSide === "OVER" || pickedSide === "UNDER" || claims.length === 0) {
    return {
      score: 0,
      factor: {
        name: "Media Context",
        impact: "neutral",
        description:
          claims.length === 0
            ? "No approved media claims linked to this game — awaiting game-id linkage (see ApprovedMediaClaimInput JSDoc)"
            : "Media context not directional for totals picks",
        weight: 0, // INERT — never changes without MODEL_VERSION bump
      },
    };
  }

  // Each claim contributes a directional vote weighted by accountabilityIndex
  // and confidence language. The sum is then mapped to a –5 to +5 range.
  // Because weight is always 0, this arithmetic only affects the glass-box
  // description — it NEVER enters the confidence integer.
  const confidenceMultiplier = (lang: ApprovedMediaClaimInput["confidenceLanguage"]): number => {
    switch (lang) {
      case "EMPHATIC": return 1.0;
      case "LEAN":     return 0.6;
      case "HEDGED":   return 0.3;
      default:         return 0.4; // UNKNOWN — conservative default
    }
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const claim of claims) {
    if (claim.direction === "NEUTRAL") continue;

    const accountability = clamp(claim.accountabilityIndex, 0, 100) / 100; // 0–1
    const langMult = confidenceMultiplier(claim.confidenceLanguage);
    const claimWeight = accountability * langMult;

    // BACKS = aligns with HOME pick; FADES = fades home (aligns with AWAY pick)
    const vote = pickedSide === "HOME"
      ? (claim.direction === "BACKS" ? 1 : -1)
      : (claim.direction === "FADES" ? 1 : -1); // FADES home = backs away

    weightedSum += vote * claimWeight;
    totalWeight += claimWeight;
  }

  if (totalWeight === 0) {
    return {
      score: 0,
      factor: {
        name: "Media Context",
        impact: "neutral",
        description: `${claims.length} approved claim(s) — all directionally neutral`,
        weight: 0,
      },
    };
  }

  // Normalize to –5…+5 (saturates when all top-accountability emphatic claims agree)
  const normalizedSignal = weightedSum / totalWeight; // –1 to +1
  const rawScore = clamp(Math.round(normalizedSignal * 5), -5, 5);

  const direction = rawScore > 0 ? "supporting" : rawScore < 0 ? "opposing" : "neutral";
  const countDirectional = claims.filter((c) => c.direction !== "NEUTRAL").length;
  const description =
    `${countDirectional} approved media claim(s) ${direction} picked side ` +
    `(accountability-weighted; inert — weight 0 until activation gates met)`;

  return {
    score: rawScore,
    factor: {
      name: "Media Context",
      impact: rawScore > 0 ? "positive" : rawScore < 0 ? "negative" : "neutral",
      description,
      weight: 0, // INERT — activating requires MODEL_VERSION bump + calibration-proposals entry
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

  // 10. Media context — J9 (INERT: weight 0, never added to confidence sum).
  // The factor is always surfaced in the glass box (even when neutral / no claims).
  // Do NOT add mediaContextScore to any confidence arithmetic — it is display-only.
  // Activating it (non-zero weight) requires MODEL_VERSION bump + calibration-proposals entry.
  const mc = computeMediaContextScore(
    context.approvedMediaClaims ?? [],
    pickedSide
  );
  const mediaContextScore = mc.score;
  factors.push(mc.factor); // always push — weight is 0, impact may be neutral

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
    // J9 — inert, display-only
    mediaContextScore,
    factors,
  };
}
