/**
 * Falsification Loop (Pillar F)
 *
 * Converts narrative pre-mortems into gradeable, machine-checkable records.
 *
 * Two public entry points:
 *   buildFalsificationConditions — called at publish time; derives conditions
 *     from the pick's fragility snapshot. The returned records are written to
 *     DB with capturedAt set by @default(now()). They are NEVER updated after
 *     creation (capturedAt is immutable provenance).
 *
 *   evaluateFalsification — called at settlement; checks each condition against
 *     real settlement values and writes triggered + triggeredAt to DB.
 *     It never touches capturedAt.
 */

import { db } from "@sports/db";
import { computeFragilityScore } from "./fragility";
import type { PickPremortemSnapshotInput } from "./build";
import type { LossRootCause } from "../pre-mortem/compare";

// ============================================================
// Public types
// ============================================================

export type FalsificationOperator =
  | "moves_against_by" // line_movement_delta < -threshold
  | "drops_below" // value < threshold (consensus, bookmaker count)
  | "flips_to" // boolean value flips (injury_status, weather_flag)
  | "rises_above"; // value > threshold

export interface FalsificationConditionInput {
  pickId: string;
  signalKey: string;
  operator: FalsificationOperator;
  threshold: number;
  rationale: string;
}

/**
 * Signal values measured at settlement time.
 * All fields are optional — only the ones that are available should be supplied.
 */
export interface SettlementSignalValues {
  line_movement_delta?: number;
  consensus_pct?: number;
  bookmaker_count?: number;
  injury_status?: boolean; // true = injury materialized
  weather_flag?: boolean;
}

// ============================================================
// Input shape for buildFalsificationConditions
// ============================================================

/**
 * The minimum pick fields needed to derive falsification conditions.
 */
export interface FalsificationPickInput {
  id: string;
  selection: string;
  confidence: number;
}

/**
 * The fields from PickPremortemSnapshotInput that buildFalsificationConditions
 * reads.  We keep this a structural sub-type so callers can pass the full
 * PickPremortemSnapshotInput without any extra casting.
 */
export type FragilityScoreInput = PickPremortemSnapshotInput;

// ============================================================
// Condition derivation (publish-time)
// ============================================================

/**
 * Derive falsification conditions from the pick's fragility snapshot.
 *
 * Rules:
 *   - bookDepth component score < 15  → bookmaker_count drops_below 3
 *   - hadLineMovementSignal            → line_movement_delta moves_against_by 1.5
 *   - hadAtsFormSignal                 → consensus_pct drops_below 0.55
 *   - hadInjurySignal                  → injury_status flips_to 1
 *   - hadWeatherSignal                 → weather_flag flips_to 1
 *
 * Returns an empty array when snapshot is null (no conditions can be derived).
 */
export function buildFalsificationConditions(
  pick: FalsificationPickInput,
  snapshot: FragilityScoreInput | null,
): FalsificationConditionInput[] {
  if (!snapshot) return [];

  const conditions: FalsificationConditionInput[] = [];

  // Book depth check: compute fragility to get the bookDepth component score.
  const fragility = computeFragilityScore(snapshot);
  if (fragility !== null) {
    const bookDepthComponent = fragility.components.find(
      (c) => c.name === "Book depth",
    );
    if (bookDepthComponent !== undefined && bookDepthComponent.points < 15) {
      conditions.push({
        pickId: pick.id,
        signalKey: "bookmaker_count",
        operator: "drops_below",
        threshold: 3,
        rationale:
          "Thin market: if fewer than 3 books quote this market at settlement, signal is suspect",
      });
    }
  }

  if (snapshot.hadLineMovementSignal) {
    conditions.push({
      pickId: pick.id,
      signalKey: "line_movement_delta",
      operator: "moves_against_by",
      threshold: 1.5,
      rationale:
        "Line movement confirmed our side — if it reverses >1.5pts, market reversed on us",
    });
  }

  if (snapshot.hadAtsFormSignal) {
    conditions.push({
      pickId: pick.id,
      signalKey: "consensus_pct",
      operator: "drops_below",
      threshold: 0.55,
      rationale:
        "Consensus was active — if it drops below 55%, public turned against us",
    });
  }

  if (snapshot.hadInjurySignal) {
    conditions.push({
      pickId: pick.id,
      signalKey: "injury_status",
      operator: "flips_to",
      threshold: 1,
      rationale:
        "Key player health was part of our case — any materialized injury invalidates it",
    });
  }

  if (snapshot.hadWeatherSignal) {
    conditions.push({
      pickId: pick.id,
      signalKey: "weather_flag",
      operator: "flips_to",
      threshold: 1,
      rationale:
        "Weather was a factor — adverse weather change invalidates the spread assumption",
    });
  }

  return conditions;
}

// ============================================================
// Root-cause mapping
// ============================================================

/**
 * Map a triggered signalKey to a LossRootCause suggestion.
 * Used by the loss-autopsy pipeline to pre-populate rootCause.
 */
export function suggestRootCause(signalKey: string): LossRootCause | null {
  switch (signalKey) {
    case "line_movement_delta":
      return "STALE_LINE";
    case "injury_status":
      return "INJURY_SHOCK";
    case "weather_flag":
      return "WEATHER";
    case "consensus_pct":
    case "bookmaker_count":
      return "DATA_GAP";
    default:
      return null;
  }
}

// ============================================================
// Settlement evaluation (settlement-time)
// ============================================================

/**
 * Check each stored FalsificationCondition for a pick against the supplied
 * settlement signal values and write triggered=true + triggeredAt=now() to
 * any condition whose operator test passes.
 *
 * Conditions whose signalKey is not present in settlementValues are skipped
 * (we never mark an un-observable condition as triggered).
 *
 * capturedAt is NEVER touched here — it is immutable provenance set at
 * record creation time.
 */
export async function evaluateFalsification(
  pickId: string,
  settlementValues: SettlementSignalValues,
): Promise<void> {
  const conditions = await db.falsificationCondition.findMany({
    where: { pickId },
  });

  const now = new Date();

  for (const condition of conditions) {
    const triggered = isTriggered(condition, settlementValues);
    if (triggered === null) {
      // Signal not available in settlementValues — skip, do not write false.
      continue;
    }

    await db.falsificationCondition.update({
      where: { id: condition.id },
      data: {
        triggered,
        triggeredAt: triggered ? now : null,
      },
    });
  }
}

// ============================================================
// Internal helpers
// ============================================================

interface StoredCondition {
  signalKey: string;
  operator: string;
  threshold: number;
}

/**
 * Evaluate one condition against the settlement signal values.
 *
 * Returns:
 *   true  — the condition's falsification criterion was met
 *   false — the criterion was NOT met (signal was available but benign)
 *   null  — the signal for this condition was not present in settlementValues
 */
function isTriggered(
  condition: StoredCondition,
  values: SettlementSignalValues,
): boolean | null {
  const { signalKey, operator, threshold } = condition;

  switch (signalKey) {
    case "line_movement_delta": {
      if (values.line_movement_delta === undefined) return null;
      // moves_against_by: delta < -threshold means market moved >threshold pts against us
      if (operator === "moves_against_by") {
        return values.line_movement_delta < -threshold;
      }
      return null;
    }

    case "consensus_pct": {
      if (values.consensus_pct === undefined) return null;
      if (operator === "drops_below") {
        return values.consensus_pct < threshold;
      }
      return null;
    }

    case "bookmaker_count": {
      if (values.bookmaker_count === undefined) return null;
      if (operator === "drops_below") {
        return values.bookmaker_count < threshold;
      }
      return null;
    }

    case "injury_status": {
      if (values.injury_status === undefined) return null;
      // flips_to: threshold=1 means "injury materialized" (true)
      if (operator === "flips_to") {
        return values.injury_status === (threshold === 1);
      }
      return null;
    }

    case "weather_flag": {
      if (values.weather_flag === undefined) return null;
      // flips_to: threshold=1 means "adverse weather activated" (true)
      if (operator === "flips_to") {
        return values.weather_flag === (threshold === 1);
      }
      return null;
    }

    default:
      return null;
  }
}
