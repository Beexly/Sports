/**
 * PvM BOSS — "The Public Trap" (bible §4.1, Phase 4).
 *
 * The re-skinned descendant of AUGUR's adaptive antagonist: a bad-logic boss
 * that embodies crowd bias. Each step shows a game the public is piling onto;
 * the lesson is that the popular side is over-bet, so the value read is usually
 * the other side. You defeat the Trap by reading value over the crowd — and by
 * being well-calibrated about it.
 *
 * Deterministic, seeded scenarios so the encounter is always playable with zero
 * other humans (anti-ghost-town tenet §4.3). No live data dependency, no
 * casino/wager framing — it is a teaching encounter about discipline.
 */

import { evaluateSignalCheck, type SignalCheckOutcome } from "./signal-check.js";

export type TrapSide = "PUBLIC" | "VALUE";

export interface PublicTrapScenario {
  readonly id: string;
  readonly sportKey: string;
  readonly matchup: string;
  /** The side the crowd is hammering (the trap). */
  readonly publicLabel: string;
  /** The disciplined, value side (the correct read for the lesson). */
  readonly valueLabel: string;
  /** Share of public action on the public side (0..1), for the teaching note. */
  readonly publicPct: number;
  /** Why the crowd is wrong here — the lesson. */
  readonly lesson: string;
}

export const PUBLIC_TRAP_SCENARIOS: readonly PublicTrapScenario[] = [
  {
    id: "trap-1",
    sportKey: "americanfootball_nfl",
    matchup: "Prime-time favorite vs quiet road team",
    publicLabel: "Lay the popular favorite -7.5",
    valueLabel: "Take the road team +7.5",
    publicPct: 0.82,
    lesson:
      "82% of tickets are on the prime-time name. Inflated by attention, the favorite is laying too many points — the disciplined read is the points.",
  },
  {
    id: "trap-2",
    sportKey: "americanfootball_nfl",
    matchup: "High-scoring narrative game",
    publicLabel: "Bet the OVER on the 'shootout'",
    valueLabel: "Read the UNDER",
    publicPct: 0.76,
    lesson:
      "The 'shootout' story sells the Over. Totals get bid up by the narrative; the number already priced the points in.",
  },
  {
    id: "trap-3",
    sportKey: "americanfootball_nfl",
    matchup: "Comeback hype off one big win",
    publicLabel: "Ride the hot team's moneyline",
    valueLabel: "Pass / take the underdog value",
    publicPct: 0.71,
    lesson:
      "Recency bias: one statement win pulls the crowd in. The price has already moved past the edge.",
  },
] as const;

export interface PublicTrapStepResult {
  readonly scenario: PublicTrapScenario;
  /** Which side the player read. */
  readonly chosen: TrapSide;
  /** True if the player resisted the crowd (chose the value side). */
  readonly resisted: boolean;
  readonly outcome: SignalCheckOutcome;
  readonly teaching: string;
}

/** Grade a single Public Trap step. Resisting the crowd = the correct read. */
export function evaluatePublicTrapStep(
  scenario: PublicTrapScenario,
  chosen: TrapSide,
  confidence: number,
): PublicTrapStepResult {
  const resisted = chosen === "VALUE";
  const outcome = evaluateSignalCheck("BOSS", resisted ? "WIN" : "LOSS", confidence);
  const pct = Math.round(scenario.publicPct * 100);
  const teaching = resisted
    ? `Held the line. ${pct}% of the crowd was on the other side — ${scenario.lesson}`
    : `The Trap got you. You followed the ${pct}% — ${scenario.lesson}`;
  return { scenario, chosen, resisted, outcome, teaching };
}

export interface PublicTrapEncounterResult {
  readonly steps: readonly PublicTrapStepResult[];
  readonly resistedCount: number;
  readonly totalSteps: number;
  /** Cleared when the player resisted the crowd on a 2/3 majority of steps. */
  readonly cleared: boolean;
  readonly totalXp: number;
  readonly totalCredits: number;
  /** SKU unlocked on a clear — the achievement-gated merch entitlement (Phase 6). */
  readonly merchUnlockSku: string | null;
}

export const PUBLIC_TRAP_BOSS_KEY = "public_trap";
export const PUBLIC_TRAP_MERCH_SKU = "signal-keeper-tee";

/** Aggregate a full Public Trap encounter into a clear/no-clear result + rewards. */
export function evaluatePublicTrapEncounter(
  answers: readonly { scenario: PublicTrapScenario; chosen: TrapSide; confidence: number }[],
): PublicTrapEncounterResult {
  const steps = answers.map((a) =>
    evaluatePublicTrapStep(a.scenario, a.chosen, a.confidence),
  );
  const resistedCount = steps.filter((s) => s.resisted).length;
  const totalSteps = steps.length;
  const threshold = Math.ceil((totalSteps * 2) / 3);
  const cleared = totalSteps > 0 && resistedCount >= threshold;

  const totalXp = steps.reduce((sum, s) => sum + s.outcome.reward.xp, 0);
  const totalCredits = steps.reduce((sum, s) => sum + s.outcome.reward.credits, 0);

  return {
    steps,
    resistedCount,
    totalSteps,
    cleared,
    totalXp,
    totalCredits,
    merchUnlockSku: cleared ? PUBLIC_TRAP_MERCH_SKU : null,
  };
}
