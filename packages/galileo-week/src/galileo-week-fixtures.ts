/**
 * GALILEO WEEK — fixtures (a deterministic "week" + a candidate budget).
 *
 * A fixture week of frames + settled cards + a ledger series, plus the dual-observer acquisition
 * candidates the `--plan` dry-run prices. No network, no keys.
 */

import { runDecisionFieldFrame, field001Input } from "@sports/decision-field-runtime";
import { makeTwinInput, settledTrapCard, settledUnluckyCard, type LedgerSample } from "@sports/decision-factory";
import type { BudgetCandidate } from "@sports/data-intelligence";
import type { WeekInputs } from "./atlas-builder.js";

function sample(cycleId: string, detectionValue: number): LedgerSample {
  return {
    cycleId,
    detectionValue,
    trapAvoidanceValue: 0.5,
    falseSuppressionCost: 0.1,
    trueTrapSuppressions: 2,
    falseBlocks: 0,
    ghostSuppressions: 4,
    decisionLeverageCreated: 0.6,
    falseConfidenceCost: 0.1,
    sourceCost: 0.1,
    cardDecisionLeverage: 0.5,
    factVolumeCostNoise: 1,
    decisionLeverageDisplayed: 0.5,
    cognitiveLoad: 1,
    theories: [],
  };
}

// Detection improves on a real trend; the other ledgers stay flat (so only a genuine gain reads).
const LEDGER_SAMPLES: readonly LedgerSample[] = [0.2, 0.31, 0.39, 0.52, 0.58, 0.72, 0.79].map((d, i) => sample(`c${i}`, d));

export const GALILEO_WEEK_FIXTURE: WeekInputs = {
  week: "Galileo Week 001",
  frames: [runDecisionFieldFrame(field001Input), runDecisionFieldFrame(makeTwinInput([]))],
  settled: [settledTrapCard, settledUnluckyCard],
  ledgerSamples: LEDGER_SAMPLES,
};

/**
 * The acquisition candidates the dry-run prices — observer triangulation, not vendor collection.
 * Free first (nflverse, Sleeper); dual market observers (The Odds API + SportsGameOdds); a paid
 * fantasy/DFS evaluation (FantasyData); a forbidden source that can never be purchased.
 */
export const GALILEO_WEEK_CANDIDATES: readonly BudgetCandidate[] = [
  { sourceId: "nflverse", costPerMonth: 0, priority: 0.9, recommendation: "EXPAND_EXISTING" },
  { sourceId: "sleeper", costPerMonth: 0, priority: 0.8, recommendation: "ADD_ADAPTER" },
  { sourceId: "the_odds_api", costPerMonth: 119, priority: 0.95, recommendation: "USE_NOW" },
  { sourceId: "sportsgameodds", costPerMonth: 99, priority: 0.7, recommendation: "PAID_EVALUATION" },
  { sourceId: "fantasydata", costPerMonth: 199, priority: 0.6, recommendation: "PAID_EVALUATION" },
  { sourceId: "draftkings_unofficial", costPerMonth: 0, priority: 0.1, recommendation: "DO_NOT_USE" },
];
