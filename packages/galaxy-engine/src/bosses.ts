/**
 * Galaxy Dynasty — The Depths boss registry (bible Stage 2: 5 PvM bosses).
 *
 * Each boss is a "bad-logic" antagonist embodying a cognitive bias (AUGUR's
 * adaptive antagonist, re-skinned §1). A boss is a sequence of Signal-Check
 * steps: the TRAP side is the bias the crowd falls for; the VALUE side is the
 * disciplined read. Resist on a 2/3 majority to clear and unlock the boss's merch
 * entitlement. Deterministic + seeded — always playable solo (anti-ghost-town).
 *
 * Boss #1 (The Public Trap) reuses the canonical scenarios from public-trap.ts so
 * there is a single source of truth for it.
 */

import { evaluateSignalCheck, type SignalCheckOutcome } from "./signal-check.js";
import {
  PUBLIC_TRAP_SCENARIOS,
  PUBLIC_TRAP_BOSS_KEY,
  PUBLIC_TRAP_MERCH_SKU,
  type PublicTrapScenario,
} from "./public-trap.js";

export type BossSide = "TRAP" | "VALUE";

export interface BossScenario {
  readonly id: string;
  readonly sportKey: string;
  readonly matchup: string;
  /** The biased read the crowd falls for. */
  readonly trapLabel: string;
  /** The disciplined, value read. */
  readonly valueLabel: string;
  /** Share of the crowd on the trap side (0..1). */
  readonly biasPct: number;
  readonly lesson: string;
}

export interface BossDef {
  readonly key: string;
  readonly name: string;
  readonly bias: string;
  readonly blurb: string;
  readonly merchSku: string;
  readonly merchName: string;
  readonly scenarios: readonly BossScenario[];
}

function fromTrapScenario(s: PublicTrapScenario): BossScenario {
  return {
    id: s.id,
    sportKey: s.sportKey,
    matchup: s.matchup,
    trapLabel: s.publicLabel,
    valueLabel: s.valueLabel,
    biasPct: s.publicPct,
    lesson: s.lesson,
  };
}

export const BOSSES: readonly BossDef[] = [
  {
    key: PUBLIC_TRAP_BOSS_KEY,
    name: "The Public Trap",
    bias: "Crowd bias",
    blurb: "The crowd piles onto the popular side. Read value over the public.",
    merchSku: PUBLIC_TRAP_MERCH_SKU,
    merchName: "Signal Keeper Tee",
    scenarios: PUBLIC_TRAP_SCENARIOS.map(fromTrapScenario),
  },
  {
    key: "overconfidence_king",
    name: "The Overconfidence King",
    bias: "Overconfidence",
    blurb: "He bets the world on chalk. Calibration beats certainty.",
    merchSku: "calibrated-cap",
    merchName: "Calibrated Cap",
    scenarios: [
      {
        id: "ock-1",
        sportKey: "americanfootball_nfl",
        matchup: "Heavy chalk favorite at a big number",
        trapLabel: "Lay the -13.5 chalk, max conviction",
        valueLabel: "Respect the points — take +13.5",
        biasPct: 0.74,
        lesson: "Big favorites get over-laid. The bigger the number, the more the value drifts to the dog.",
      },
      {
        id: "ock-2",
        sportKey: "americanfootball_nfl",
        matchup: "A 'sure' road favorite",
        trapLabel: "Slam the favorite moneyline",
        valueLabel: "Pass — the price already paid for certainty",
        biasPct: 0.69,
        lesson: "Certainty is the most expensive thing to buy. The price has already priced it in.",
      },
      {
        id: "ock-3",
        sportKey: "americanfootball_nfl",
        matchup: "Confident Over on two good offenses",
        trapLabel: "Hammer the Over with full conviction",
        valueLabel: "Read the Under — defenses travel",
        biasPct: 0.66,
        lesson: "Overconfidence inflates totals. Match your confidence to the evidence, not the names.",
      },
    ],
  },
  {
    key: "recency_chaser",
    name: "The Recency Chaser",
    bias: "Recency bias",
    blurb: "Last week is all he sees. The market already moved.",
    merchSku: "process-hoodie",
    merchName: "Process Hoodie",
    scenarios: [
      {
        id: "rc-1",
        sportKey: "americanfootball_nfl",
        matchup: "Team off a 40-point explosion",
        trapLabel: "Ride the hot team, lay the points",
        valueLabel: "Fade the overreaction — take the points",
        biasPct: 0.72,
        lesson: "One huge week pulls the line too far. The overreaction is the edge.",
      },
      {
        id: "rc-2",
        sportKey: "americanfootball_nfl",
        matchup: "Team off an ugly blowout loss",
        trapLabel: "Bury them again — fade the loser",
        valueLabel: "Buy low — the bounce-back value",
        biasPct: 0.63,
        lesson: "Recency cuts both ways. A blowout loss can overprice the fade.",
      },
      {
        id: "rc-3",
        sportKey: "americanfootball_nfl",
        matchup: "A 'streaking' Over team",
        trapLabel: "Chase the Over streak",
        valueLabel: "Read the number, not the streak",
        biasPct: 0.61,
        lesson: "Streaks are stories the market has already priced. Read the matchup, not the run.",
      },
    ],
  },
  {
    key: "narrative_trap",
    name: "The Narrative Trap",
    bias: "Story over number",
    blurb: "The story sells the side. The number is the truth.",
    merchSku: "number-first-tee",
    merchName: "Number-First Tee",
    scenarios: [
      {
        id: "nt-1",
        sportKey: "americanfootball_nfl",
        matchup: "Revenge-game storyline",
        trapLabel: "Back the revenge narrative",
        valueLabel: "Read the matchup, ignore the storyline",
        biasPct: 0.68,
        lesson: "Revenge games are a media story, not a market edge. The number doesn't care.",
      },
      {
        id: "nt-2",
        sportKey: "americanfootball_nfl",
        matchup: "Prime-time 'statement' spot",
        trapLabel: "Trust the prime-time team to show up",
        valueLabel: "Take the quiet value side",
        biasPct: 0.7,
        lesson: "Prime-time names draw public money and inflate the line.",
      },
      {
        id: "nt-3",
        sportKey: "americanfootball_nfl",
        matchup: "Backup QB 'collapse' narrative",
        trapLabel: "Fade the backup, lay big",
        valueLabel: "Check the scheme — value on the points",
        biasPct: 0.6,
        lesson: "The 'collapse' story overprices the fade. Scheme and points matter more than the name.",
      },
    ],
  },
  {
    key: "anchor",
    name: "The Anchor",
    bias: "Anchoring",
    blurb: "He clings to the opening number. The close is what matters.",
    merchSku: "closing-line-pin",
    merchName: "Closing Line Pin",
    scenarios: [
      {
        id: "an-1",
        sportKey: "americanfootball_nfl",
        matchup: "Line moved 3 points off the open",
        trapLabel: "Anchor to the opener — it's 'free' value",
        valueLabel: "Respect the move — the close is sharper",
        biasPct: 0.65,
        lesson: "Anchoring on the opener ignores new information. The closing line is the market's best read.",
      },
      {
        id: "an-2",
        sportKey: "americanfootball_nfl",
        matchup: "Total bid up all week",
        trapLabel: "Trust the opening total",
        valueLabel: "Follow the steam to the current number",
        biasPct: 0.62,
        lesson: "If the total moved with money, the move usually carries information.",
      },
      {
        id: "an-3",
        sportKey: "americanfootball_nfl",
        matchup: "Key injury after the opener",
        trapLabel: "Use the stale pre-injury number",
        valueLabel: "Re-read with the injury priced in",
        biasPct: 0.58,
        lesson: "Anchoring to a stale number after real news is how you get picked off.",
      },
    ],
  },
] as const;

const BOSS_INDEX: ReadonlyMap<string, BossDef> = new Map(BOSSES.map((b) => [b.key, b]));

export function getBoss(key: string): BossDef | null {
  return BOSS_INDEX.get(key) ?? null;
}

export interface BossStepResult {
  readonly scenario: BossScenario;
  readonly chosen: BossSide;
  readonly resisted: boolean;
  readonly outcome: SignalCheckOutcome;
  readonly teaching: string;
}

export function evaluateBossStep(
  scenario: BossScenario,
  chosen: BossSide,
  confidence: number,
): BossStepResult {
  const resisted = chosen === "VALUE";
  const outcome = evaluateSignalCheck("BOSS", resisted ? "WIN" : "LOSS", confidence);
  const pct = Math.round(scenario.biasPct * 100);
  const teaching = resisted
    ? `Held the line. ${pct}% leaned the other way — ${scenario.lesson}`
    : `Caught by the bias. You followed the ${pct}% — ${scenario.lesson}`;
  return { scenario, chosen, resisted, outcome, teaching };
}

export interface BossEncounterResult {
  readonly bossKey: string;
  readonly bossName: string;
  readonly steps: readonly BossStepResult[];
  readonly resistedCount: number;
  readonly totalSteps: number;
  readonly cleared: boolean;
  readonly totalXp: number;
  readonly totalCredits: number;
  readonly merchUnlockSku: string | null;
  readonly merchUnlockName: string | null;
}

export function evaluateBossEncounter(
  bossKey: string,
  answers: readonly { scenarioId: string; chosen: BossSide; confidence: number }[],
): BossEncounterResult {
  const boss = getBoss(bossKey);
  if (!boss) throw new Error(`Unknown boss: ${bossKey}`);

  const steps = answers.map((a) => {
    const scenario = boss.scenarios.find((s) => s.id === a.scenarioId);
    if (!scenario) throw new Error(`Unknown scenario ${a.scenarioId} for boss ${bossKey}`);
    return evaluateBossStep(scenario, a.chosen, a.confidence);
  });

  const resistedCount = steps.filter((s) => s.resisted).length;
  const totalSteps = steps.length;
  const threshold = Math.ceil((totalSteps * 2) / 3);
  const cleared = totalSteps > 0 && resistedCount >= threshold;
  const totalXp = steps.reduce((sum, s) => sum + s.outcome.reward.xp, 0);
  const totalCredits = steps.reduce((sum, s) => sum + s.outcome.reward.credits, 0);

  return {
    bossKey,
    bossName: boss.name,
    steps,
    resistedCount,
    totalSteps,
    cleared,
    totalXp,
    totalCredits,
    merchUnlockSku: cleared ? boss.merchSku : null,
    merchUnlockName: cleared ? boss.merchName : null,
  };
}
