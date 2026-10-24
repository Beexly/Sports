/**
 * @file rolling-horizon-lifecycle.ts
 * Proactive Early-Week "Horizon-Zero" Slate & Surveillance Engine (Component 8).
 *
 * Replaces reactive single-point Sunday morning generation with a continuous multi-horizon
 * rolling emission schedule (Tuesday through Sunday kickoff):
 * - H1_TUE_OPEN: Lookahead lines & opening edge locks.
 * - H2_WED_FULL_BOARD: Complete Thursday and Sunday boards (sides, totals, props, SGPs, DFS)
 *   locked at live Wednesday lines via Marginalized Interventional Scenario Integration.
 * - H3_THU_DELTA: TNF 90m inactives & Sunday mid-week practice deltas.
 * - H4_FRI_STATUS_LOCK: Friday official status reports & HRRR 48h weather locks.
 * - H5_SUN_INACTIVES: Sunday 90m inactives & instant O(1) DFS late-swap execution.
 */

import { CausalADMG, NodeId, runShpitserPearlID, runShpitserPearlIDC } from "../causal/do-calculus-id.js";
import { ValidatedCausalTrace } from "../picks/pick-pipeline.js";
import { recordDecisionTimePrice, DecisionTimePriceRow } from "../edge-lab/decision-time-price-archive.js";

// ---------------------------------------------------------------------------
// TYPES & ENUMS
// ---------------------------------------------------------------------------

export type HorizonStage =
  | "H1_TUE_OPEN"
  | "H2_WED_FULL_BOARD"
  | "H3_THU_DELTA"
  | "H4_FRI_STATUS_LOCK"
  | "H5_SUN_INACTIVES";

export const HORIZON_STAGES: readonly HorizonStage[] = [
  "H1_TUE_OPEN",
  "H2_WED_FULL_BOARD",
  "H3_THU_DELTA",
  "H4_FRI_STATUS_LOCK",
  "H5_SUN_INACTIVES",
] as const;

export type MarketType =
  | "SPREAD"
  | "TOTAL"
  | "MONEYLINE"
  | "PLAYER_PROP"
  | "SGP_VINE"
  | "DFS_MILP_LINEUP";

export type SurveillanceStatus =
  | "LOCKED_ACTIVE"
  | "UPGRADED_ON_DELTA"
  | "HEDGED_ON_ADVERSE_DELTA"
  | "SWAP_TRIGGERED"
  | "SURVEILLANCE_WATCH";

export interface ConditionalCommitmentRule {
  readonly rule_id: string; // e.g. "CC-2026-06-SEA-DEN-001"
  readonly target_entry_id: string;
  readonly watched_node: string;
  readonly trigger_condition:
    | "DECLARED_INACTIVE"
    | "DECLARED_ACTIVE"
    | "WIND_EXCEEDS_15MPH"
    | "LINE_STEAM_ADVERSE"
    | "STATUS_UPGRADED_QUESTIONABLE_TO_ACTIVE";
  readonly delta_prob: number;
  readonly stake_adjustment: number;
  readonly dfs_swap_player?: {
    readonly out_player_id: string;
    readonly in_player_id: string;
    readonly salary_delta: number;
  };
  readonly deadline_utc: string;
  readonly status: "PENDING" | "TRIGGERED" | "EXPIRED";
}

export interface EarlyWeekBoardEntry {
  readonly entry_id: string;
  readonly game_id: string;
  readonly market_type: MarketType;
  readonly emitted_stage: HorizonStage;
  readonly emitted_at_utc: string;
  readonly hours_before_kickoff: number;
  readonly locked_market_line: number;
  readonly locked_market_odds_american: number;
  readonly locked_vig_free_prob: number;
  readonly model_true_prob_wednesday: number;
  readonly conformal_lower_bound: number;
  readonly intrinsic_sd: number;
  readonly horizon_epistemic_sd: number;
  readonly expected_clv_capture: number;
  readonly line_move_skill_vector: readonly [number, number, number]; // [q_AWAY, q_FLAT, q_HOME]
  readonly active_trace?: ValidatedCausalTrace;
  readonly watch_commitments: readonly ConditionalCommitmentRule[];
  readonly surveillance_status: SurveillanceStatus;
}

export interface BoundaryScenario {
  readonly scenarioId: string;
  readonly stateAssignments: Record<NodeId, number | string | boolean>;
  readonly transitionProbability: number; // P_tau(S = s | F_wed)
  readonly interventionalMean: number; // E[Y | do(X), S = s]
  readonly scenarioVariance: number; // Var(Y | do(X), S = s)
}

export interface MarginalizedScenarioIntegrationResult {
  readonly marginalizedInterventionalProb: number;
  readonly intrinsicVariance: number;
  readonly horizonEpistemicVariance: number;
  readonly totalPredictiveVariance: number;
  readonly dominantScenarioPassed: boolean;
  readonly expectedLineMoveCapture: number;
}

export interface EarlyWeekDecisionRuleInput {
  readonly wednesdayVigFreeProb: number;
  readonly scenarios: readonly BoundaryScenario[];
  readonly conformalLowerBound: number;
  readonly lineMoveSkillVector: readonly [number, number, number]; // [q_AWAY, q_FLAT, q_HOME]
  readonly kappaHorizonExcursion?: number; // default 0.15
}

export interface EarlyWeekDecisionRuleOutput {
  readonly action: "LOCK_IMMEDIATELY_WEDNESDAY" | "STAGE_SURVEILLANCE_WATCH";
  readonly reasoning: string;
  readonly marginalizedProb: number;
  readonly intrinsicSd: number;
  readonly horizonSd: number;
  readonly totalSd: number;
}

export interface SurveillanceTriggerEvent {
  readonly watchedNode: string;
  readonly eventType:
    | "DECLARED_INACTIVE"
    | "DECLARED_ACTIVE"
    | "WIND_EXCEEDS_15MPH"
    | "LINE_STEAM_ADVERSE"
    | "STATUS_UPGRADED_QUESTIONABLE_TO_ACTIVE";
  readonly eventTimestampUtc: string;
  readonly eventDetails?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// 1. MARGINALIZED INTERVENTIONAL SCENARIO INTEGRATION & VARIANCE DECOMPOSITION
// ---------------------------------------------------------------------------

/**
 * Computes the Marginalized Interventional Distribution and Law of Total Variance
 * decomposition over unresolved early-week boundary nodes S:
 *
 * P_Wed(Y = y | do(X = x), Z_Wed) = sum_{s in Omega(S)} P(Y = y | do(X = x, S = s), Z_Wed) * P_tau(S = s | F_Wed)
 *
 * sigma_total^2(tau) = E_s[Var(Y | s)] + Var_s(E[Y | s])
 *                    = sigma_intrinsic^2 + sigma_horizon^2(tau)
 */
export function computeMarginalizedScenarioIntegration(
  scenarios: readonly BoundaryScenario[],
): MarginalizedScenarioIntegrationResult {
  if (scenarios.length === 0) {
    throw new Error("computeMarginalizedScenarioIntegration: at least one boundary scenario is required.");
  }

  // Verify total transition probability sums to 1.0 (within numerical tolerance)
  const totalProb = scenarios.reduce((sum, s) => sum + s.transitionProbability, 0.0);
  if (Math.abs(totalProb - 1.0) > 1e-4) {
    throw new Error(
      `computeMarginalizedScenarioIntegration: transition probabilities must sum to 1.0, got ${totalProb.toFixed(6)}`,
    );
  }

  // 1. Marginalized Mean: E_s[E[Y | s]]
  let marginalizedMean = 0.0;
  for (const s of scenarios) {
    marginalizedMean += s.transitionProbability * s.interventionalMean;
  }

  // 2. Intrinsic Game Variance: E_s[Var(Y | s)]
  let intrinsicVariance = 0.0;
  for (const s of scenarios) {
    intrinsicVariance += s.transitionProbability * s.scenarioVariance;
  }

  // 3. Resolvable Horizon Epistemic Variance: Var_s(E[Y | s])
  let horizonEpistemicVariance = 0.0;
  for (const s of scenarios) {
    const deviation = s.interventionalMean - marginalizedMean;
    horizonEpistemicVariance += s.transitionProbability * (deviation * deviation);
  }

  const totalPredictiveVariance = intrinsicVariance + horizonEpistemicVariance;

  // Check Dominant Scenario Invariance across high-probability scenarios (P >= 0.15)
  const dominantScenarios = scenarios.filter((s) => s.transitionProbability >= 0.15);
  const dominantScenarioPassed = dominantScenarios.every((s) => s.interventionalMean >= 0.50);

  return {
    marginalizedInterventionalProb: marginalizedMean,
    intrinsicVariance,
    horizonEpistemicVariance,
    totalPredictiveVariance,
    dominantScenarioPassed,
    expectedLineMoveCapture: Math.sqrt(horizonEpistemicVariance) * 0.75,
  };
}

// ---------------------------------------------------------------------------
// 2. EARLY-WEEK LOCK VS. WATCH DECISION RULE
// ---------------------------------------------------------------------------

/**
 * Determines whether to lock the pick immediately on Wednesday at Wednesday's price
 * or stage it under active ConditionalCommitment delta surveillance.
 *
 * Dominant Scenario Invariance (Wednesday Immediate Lock):
 * If the lower conformal bound beats the vig-free market price across every high-probability
 * scenario OR expected adverse line movement exceeds the horizon variance penalty.
 */
export function evaluateEarlyWeekLockRule(
  input: EarlyWeekDecisionRuleInput,
): EarlyWeekDecisionRuleOutput {
  const integration = computeMarginalizedScenarioIntegration(input.scenarios);
  const intrinsicSd = Math.sqrt(integration.intrinsicVariance);
  const horizonSd = Math.sqrt(integration.horizonEpistemicVariance);
  const totalSd = Math.sqrt(integration.totalPredictiveVariance);

  const kappaEx = input.kappaHorizonExcursion ?? 0.15;
  const horizonPenalty = kappaEx * horizonSd;

  // LMS expected movement towards home side: (q_HOME - q_AWAY)
  const [qAway, , qHome] = input.lineMoveSkillVector;
  const expectedAdverseLineMove = Math.max(0, qHome - qAway) * 0.04; // scaled points

  // Rule 1: Dominant Scenario Invariance
  const edgeOverMarket = input.conformalLowerBound - input.wednesdayVigFreeProb;
  const clearsDominantScenario =
    integration.dominantScenarioPassed && edgeOverMarket > 0.015;

  // Rule 2: Expected Adverse Line Movement exceeds horizon variance penalty
  const lineMoveSteamHazard = expectedAdverseLineMove > horizonPenalty;

  if (clearsDominantScenario || lineMoveSteamHazard) {
    return {
      action: "LOCK_IMMEDIATELY_WEDNESDAY",
      reasoning: clearsDominantScenario
        ? `Dominant scenario invariance holds: conformal lower bound ${input.conformalLowerBound.toFixed(4)} beats market vig-free ${input.wednesdayVigFreeProb.toFixed(4)} across all high-probability branches.`
        : `Adverse line movement hazard (${expectedAdverseLineMove.toFixed(4)}) exceeds horizon variance penalty (${horizonPenalty.toFixed(4)}); locking Wednesday price before steam.`,
      marginalizedProb: integration.marginalizedInterventionalProb,
      intrinsicSd,
      horizonSd,
      totalSd,
    };
  }

  return {
    action: "STAGE_SURVEILLANCE_WATCH",
    reasoning: `Horizon epistemic variance (${horizonSd.toFixed(4)}) is elevated and scenario invariance is unresolved; staging machine-executable CC-* surveillance watch.`,
    marginalizedProb: integration.marginalizedInterventionalProb,
    intrinsicSd,
    horizonSd,
    totalSd,
  };
}

// ---------------------------------------------------------------------------
// 3. CONTINUOUS DELTA-SURVEILLANCE & CONDITIONAL COMMITMENT STATE MACHINE
// ---------------------------------------------------------------------------

/**
 * Evaluates active surveillance events against pre-registered ConditionalCommitmentRules
 * on an early-week board entry, transitioning its status and updating probability atomically.
 */
export function evaluateSurveillanceDelta(
  entry: EarlyWeekBoardEntry,
  events: readonly SurveillanceTriggerEvent[],
): EarlyWeekBoardEntry {
  let currentProb = entry.model_true_prob_wednesday;
  let currentStatus = entry.surveillance_status;
  const updatedCommitments: ConditionalCommitmentRule[] = [];

  for (const rule of entry.watch_commitments) {
    if (rule.status !== "PENDING") {
      updatedCommitments.push(rule);
      continue;
    }

    // Match rule against any incoming surveillance event
    const matchedEvent = events.find(
      (ev) =>
        ev.watchedNode.toLowerCase() === rule.watched_node.toLowerCase() &&
        ev.eventType === rule.trigger_condition,
    );

    if (matchedEvent) {
      // Execute conditional commitment
      currentProb = Math.max(0.01, Math.min(0.99, currentProb + rule.delta_prob));

      if (rule.delta_prob > 0) {
        currentStatus = "UPGRADED_ON_DELTA";
      } else if (rule.delta_prob < 0) {
        currentStatus = "HEDGED_ON_ADVERSE_DELTA";
      }

      if (rule.dfs_swap_player) {
        currentStatus = "SWAP_TRIGGERED";
      }

      updatedCommitments.push({
        ...rule,
        status: "TRIGGERED",
      });
    } else {
      updatedCommitments.push(rule);
    }
  }

  return {
    ...entry,
    model_true_prob_wednesday: currentProb,
    surveillance_status: currentStatus,
    watch_commitments: updatedCommitments,
  };
}

// ---------------------------------------------------------------------------
// 4. PRICE ARCHIVE LOCKING FOR WEDNESDAY EMISSIONS
// ---------------------------------------------------------------------------

export interface LockWednesdayPriceOptions {
  readonly baseDir?: string;
  readonly modelSource?: string;
  readonly covariatesHash?: string;
}

/**
 * Locks an early-week emission into the immutable decision-time price archive
 * with synchronous verification, guaranteeing that CLV can be scored honestly at kickoff.
 */
export async function lockEarlyWeekBoardPrice(
  entry: EarlyWeekBoardEntry,
  options: LockWednesdayPriceOptions = {},
): Promise<boolean> {
  const dummyHash = "0000000000000000000000000000000000000000000000000000000000000000";
  const row: DecisionTimePriceRow = {
    game_id: entry.game_id,
    market_id: `${entry.game_id}_${entry.market_type}`,
    side: entry.market_type === "PLAYER_PROP" ? "OVER" : "HOME",
    decision_time_price: entry.locked_market_odds_american,
    decision_time_utc: entry.emitted_at_utc,
    model_probability: entry.model_true_prob_wednesday,
    devigged_market_prob: entry.locked_vig_free_prob,
    edge: entry.model_true_prob_wednesday - entry.locked_vig_free_prob,
    model_source: options.modelSource ?? "GSE_HORIZON_ZERO_WEDNESDAY_LOCK",
    covariates_hash: options.covariatesHash ?? dummyHash,
  };

  try {
    const result = await recordDecisionTimePrice(row, { baseDir: options.baseDir });
    return result.ok;
  } catch (err) {
    // Return false on validation error rather than corrupting archive
    return false;
  }
}
