/**
 * DECISION FIELD RUNTIME — Missed Observation (an OVI input).
 *
 * What did GSE LACK that would have changed a card's strength or decision? Every unsatisfied required
 * fact group is a missed observation: it names the fact class that would unlock a stronger, safer card
 * and points the acquisition governor at what to buy. This is the demand side of intelligent data
 * hunger. Pure + deterministic.
 */

import type { FactType } from "@sports/data-intelligence";
import type { MaxPermittedStrength, RequiredStatAudit } from "./decision-state-stat-contract.js";

export interface MissedObservation {
  readonly entityId: string;
  readonly missingFactGroup: string;
  readonly wouldUnlockFacts: readonly FactType[];
  readonly currentCeiling: MaxPermittedStrength;
  readonly note: string;
}

/** Derive the missed observations for an entity from its required-stat audit. */
export function detectMissedObservations(entityId: string, audit: RequiredStatAudit): MissedObservation[] {
  if (audit.satisfied) return [];
  // The audit knows which group labels are missing; reconstruct their unlock sets from the contract.
  return audit.missingGroups.map((label) => ({
    entityId,
    missingFactGroup: label,
    wouldUnlockFacts: MISSING_GROUP_UNLOCKS[label] ?? [],
    currentCeiling: audit.maxStrength,
    note: `No creditable "${label}" fact at decision time — a stronger card is blocked until one is acquired.`,
  }));
}

// Minimal unlock map for the seeded contracts (kept in sync with decision-state-stat-contract.ts).
const MISSING_GROUP_UNLOCKS: Readonly<Record<string, readonly FactType[]>> = {
  role_delta: ["route_rate", "snap_share", "target_share", "carry_share"],
  fantasy_belief_snapshot: ["platform_projection", "roster_pct", "adp", "start_pct"],
  edge_basis: ["snap_share", "route_rate", "target_share", "injury_report"],
  live_price: ["player_prop", "spread", "total", "moneyline"],
  crowd_move: ["betting_splits", "roster_pct", "add_drop_velocity", "social_trend"],
  reality_check: ["snap_share", "route_rate", "target_share", "injury_report"],
  any_signal: ["injury_report", "practice_status", "snap_share", "player_prop"],
  any_credible_fact: ["injury_report", "snap_share", "player_prop", "platform_projection"],
};
