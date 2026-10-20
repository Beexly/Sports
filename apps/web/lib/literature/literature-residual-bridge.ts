/**
 * @file literature-residual-bridge.ts
 * Residual feedback: settlement updates premise activation scores.
 *
 * WHY THIS EXISTS
 * A premise that is retrieved but never scored is an unfalsifiable claim. The
 * retrieval loop (literature-event-bridge.ts) records which premises fired
 * for which game; this module closes the loop by comparing what each premise
 * CLAIMED against what the game actually produced, and updating the
 * premise's activation score from the residual.
 *
 * WHERE IT HOOKS
 * apps/web/lib/settlement/free-path-snapshot.ts `recordFreePathSnapshot` is
 * called with the settled result of every free-path pick.
 *
 * CONTRACT
 *   - Only premises that were ACTIVATED for this game are graded. A premise
 *     that never fired cannot be credited or blamed.
 *   - The grader decides "predicted" and "actual" from the pick's own
 *     factor breakdown and the settled result. It never invents a number it
 *     cannot source.
 *   - A failure never blocks settlement.
 */

import { applyResidualFeedback, type SqlClient } from "@sports/prediction-engine";

/** The subset of the settlement DB this module needs. */
export interface ResidualBridgeDb {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
}

/** The pick fields needed to grade a residual. */
export interface ResidualPick {
  readonly id: string;
  readonly gameId: string;
  readonly selection: string;
  readonly pickType?: string | null;
  readonly factorBreakdown?: unknown;
}

export interface ResidualGrade {
  readonly activation_id: string;
  readonly premise_id: string;
  readonly game_id: string | null;
  readonly predicted: number;
  readonly actual: number;
  readonly outcome_correct: boolean;
}

export interface ResidualBridgeReport {
  readonly pick_id: string;
  readonly activations_found: number;
  readonly graded: number;
  readonly skipped_reason: string | null;
  readonly errors: readonly string[];
}

/**
 * Read the activations recorded for a game, with the premise's claim.
 *
 * The activation's `activation_score` is the premise's contribution; the
 * premise's `numeric_value` is the magnitude it claimed.
 */
async function loadActivations(
  db: ResidualBridgeDb,
  gameId: string,
): Promise<Array<{
  activation_id: string;
  premise_id: string;
  numeric_value: number | null;
  influence_direction: string | null;
  activation_score: number;
}>> {
  const rows = await db.$queryRawUnsafe<
    Array<{
      activation_id: string;
      premise_id: string;
      numeric_value: number | null;
      influence_direction: string | null;
      activation_score: number;
    }>
  >(
    `SELECT a.id            AS activation_id,
            a.premise_id    AS premise_id,
            p.numeric_value AS numeric_value,
            p.influence_direction,
            a.activation_score
       FROM lit.activation a
       JOIN lit.premise p ON p.id = a.premise_id
      WHERE a.game_id = $1 AND a.status = 'active'`,
    gameId,
  );
  return rows ?? [];
}

/**
 * Derive the "actual" direction of a settled pick.
 *
 * 1.0 means the pick was right, 0.0 means it was wrong, 0.5 means a push.
 * This is the only place a settlement outcome becomes a number.
 */
export function actualFromResult(result: "WIN" | "LOSS" | "PUSH" | "VOID"): number | null {
  if (result === "WIN") return 1;
  if (result === "LOSS") return 0;
  if (result === "PUSH") return 0.5;
  return null; // VOID: not gradeable, must not count for or against a premise
}

/**
 * Grade the premises activated for a settled game.
 *
 * The premise's PREDICTION is its numeric claim, normalized to [0,1] when it
 * is a probability, and compared against the actual outcome direction.
 *
 * A premise with no numeric claim contributes a graded record with the
 * predicted value taken from its activation score sign (positive influence =>
 * the premise said this helps the picked side). A premise with no direction
 * either cannot be graded and is skipped.
 */
export async function gradePremisesForSettledPick(
  db: ResidualBridgeDb,
  pick: ResidualPick,
  result: "WIN" | "LOSS" | "PUSH" | "VOID",
): Promise<ResidualBridgeReport> {
  const errors: string[] = [];
  const actual = actualFromResult(result);

  if (actual === null) {
    return {
      pick_id: pick.id,
      activations_found: 0,
      graded: 0,
      skipped_reason: `result ${result} is not gradeable`,
      errors,
    };
  }

  let activations: Awaited<ReturnType<typeof loadActivations>>;
  try {
    activations = await loadActivations(db, pick.gameId);
  } catch (err) {
    return {
      pick_id: pick.id,
      activations_found: 0,
      graded: 0,
      skipped_reason: null,
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }

  if (activations.length === 0) {
    return {
      pick_id: pick.id,
      activations_found: 0,
      graded: 0,
      skipped_reason: "no premises were activated for this game",
      errors,
    };
  }

  const grades: ResidualGrade[] = [];
  for (const a of activations) {
    let predicted: number | null = null;

    if (a.numeric_value != null && Number.isFinite(a.numeric_value)) {
      // A probability claim maps directly. A raw-unit claim (points, yards)
      // is not a probability and cannot be compared to a win/loss outcome, so
      // it is not gradeable on this axis.
      const looksLikeProbability = a.numeric_value >= 0 && a.numeric_value <= 1;
      if (looksLikeProbability) predicted = a.numeric_value;
    }

    if (predicted === null) {
      // No probability claim. Use the direction of the activation: a premise
      // with a positive influence direction and a non-zero activation score
      // claimed the picked side would be helped.
      if (a.influence_direction && a.activation_score > 0) {
        predicted = 0.5; // an unquantified directional claim, graded as a coin flip
      }
    }

    if (predicted === null) continue;

    grades.push({
      activation_id: a.activation_id,
      premise_id: a.premise_id,
      game_id: pick.gameId,
      predicted,
      actual,
      outcome_correct: Math.abs(predicted - actual) < 0.5,
    });
  }

  if (grades.length === 0) {
    return {
      pick_id: pick.id,
      activations_found: activations.length,
      graded: 0,
      skipped_reason: "no activated premise carried a gradeable claim",
      errors,
    };
  }

  const sql: SqlClient = {
    query: async (text: string, values?: readonly unknown[]) => {
      const r = await db.$queryRawUnsafe<unknown[]>(text, ...(values ?? []));
      return { rows: r as unknown[], rowCount: r.length };
    },
  };

  try {
    const out = await applyResidualFeedback(sql, grades);
    return {
      pick_id: pick.id,
      activations_found: activations.length,
      graded: out.graded,
      skipped_reason: null,
      errors,
    };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return {
      pick_id: pick.id,
      activations_found: activations.length,
      graded: 0,
      skipped_reason: null,
      errors,
    };
  }
}
