/**
 * FANTASY DISCOVERY LAYER — Lineup Court (Invention F10).
 *
 * Start/sit is not a ranking — it is a verdict that must survive prosecution. Every candidate is
 * attacked by a role, matchup, injury, volatility, roster-context, correlation, light-cone, and
 * ghost prosecutor. The same player can be a START on one roster and a SIT on another: an underdog
 * needs ceiling, a favorite wants floor. Pure + deterministic. Decides nothing live.
 */

import type { FantasyLightConeStatus } from "./fantasy-light-cone.js";

export type LineupAction =
  | "START" | "SIT" | "FLEX" | "CEILING_PLAY" | "FLOOR_PLAY" | "INJURY_DEPENDENT" | "LATE_SWAP_REQUIRED" | "PASS";

export type LineupChargeVerdict = "PASS" | "WARNING" | "FAIL";

export type LineupProsecutor =
  | "RoleProsecutor" | "MatchupProsecutor" | "InjuryProsecutor" | "VolatilityProsecutor"
  | "RosterContextProsecutor" | "CorrelationProsecutor" | "LightConeProsecutor" | "GhostProsecutor";

export interface LineupCharge {
  readonly prosecutor: LineupProsecutor;
  readonly verdict: LineupChargeVerdict;
  readonly reason: string;
}

export interface LineupEvidence {
  /** Expected fantasy-point delta vs the alternative (can be negative). */
  readonly expectedPointsDelta: number;
  readonly roleQuality: number;       // 0..1
  readonly matchupRating: number;     // 0..1 (1 = great matchup)
  readonly injuryRisk: number;        // 0..1
  readonly volatility: number;        // 0..1
  readonly needCeiling: boolean;      // underdog — needs upside
  readonly needFloor: boolean;        // favorite — wants safety
  readonly correlationWithRoster: number; // 0..1 (stack / bring-back)
  readonly lightCone: FantasyLightConeStatus;
  readonly ghostSuppressed: boolean;
  readonly lateSwapAvailable: boolean;
  readonly questionableTag: boolean;  // active/inactive dependent
}

export interface LineupResult {
  readonly charges: readonly LineupCharge[];
  readonly fails: readonly LineupProsecutor[];
  readonly startEdge: number;
  readonly action: LineupAction;
  readonly survives: boolean;
  readonly note: string;
}

/** Convene the lineup court over one start/sit candidate. */
export function conveneLineupCourt(e: LineupEvidence): LineupResult {
  const charges: LineupCharge[] = [
    { prosecutor: "RoleProsecutor", verdict: e.roleQuality < 0.25 ? "FAIL" : e.roleQuality < 0.45 ? "WARNING" : "PASS", reason: `role quality ${e.roleQuality.toFixed(2)}` },
    { prosecutor: "MatchupProsecutor", verdict: e.matchupRating < 0.35 ? "WARNING" : "PASS", reason: `matchup ${e.matchupRating.toFixed(2)}` },
    { prosecutor: "InjuryProsecutor", verdict: e.questionableTag || e.injuryRisk > 0.5 ? "WARNING" : "PASS", reason: e.questionableTag ? "questionable tag — active/inactive dependent" : `injury risk ${e.injuryRisk.toFixed(2)}` },
    { prosecutor: "VolatilityProsecutor", verdict: e.needFloor && e.volatility > 0.6 ? "WARNING" : "PASS", reason: `volatility ${e.volatility.toFixed(2)}${e.needFloor ? " (floor needed)" : ""}` },
    { prosecutor: "RosterContextProsecutor", verdict: "PASS", reason: e.needCeiling ? "underdog — ceiling needed" : e.needFloor ? "favorite — floor preferred" : "neutral game context" },
    { prosecutor: "CorrelationProsecutor", verdict: "PASS", reason: `roster correlation ${e.correlationWithRoster.toFixed(2)}` },
    { prosecutor: "LightConeProsecutor", verdict: e.lightCone === "INSIDE_LIGHT_CONE" ? "PASS" : "FAIL", reason: `light cone ${e.lightCone}` },
    { prosecutor: "GhostProsecutor", verdict: e.ghostSuppressed ? "FAIL" : "PASS", reason: e.ghostSuppressed ? "resembles a buried start/sit ghost" : "no ghost match" },
  ];
  const fails = charges.filter((c) => c.verdict === "FAIL").map((c) => c.prosecutor);

  const ceilingNeedBonus = e.needCeiling ? 0.5 * e.volatility : 0;
  const floorNeedBonus = e.needFloor ? 0.5 * (1 - e.volatility) : 0;
  const startEdge = e.expectedPointsDelta + ceilingNeedBonus + floorNeedBonus
    + 0.3 * e.correlationWithRoster + 0.3 * (e.matchupRating - 0.5)
    - (e.needFloor ? 0.4 * e.volatility : 0) - 0.4 * e.injuryRisk * (e.questionableTag ? 0 : 1);

  let action: LineupAction;
  if (fails.includes("LightConeProsecutor") || fails.includes("GhostProsecutor")) action = "PASS";
  else if (e.questionableTag) action = e.lateSwapAvailable ? "LATE_SWAP_REQUIRED" : "INJURY_DEPENDENT";
  else if (startEdge > 0.15 && e.needCeiling) action = "CEILING_PLAY";
  else if (startEdge > 0.15 && e.needFloor) action = "FLOOR_PLAY";
  else if (startEdge > 0.15) action = "START";
  else if (startEdge > -0.05) action = "FLEX";
  else action = "SIT";

  return {
    charges, fails, startEdge: Number(startEdge.toFixed(4)), action, survives: fails.length === 0,
    note: action === "PASS" ? "Cannot responsibly act (not knowable or ghost-matched)." : `Lineup verdict: ${action} (start edge ${startEdge.toFixed(2)}).`,
  };
}
