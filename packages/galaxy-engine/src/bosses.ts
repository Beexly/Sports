/**
 * Galaxy Dynasty — The Depths boss registry (bible Stage 2: 5 PvM bosses).
 *
 * Each boss is a "bad-logic" antagonist embodying a specific sports-thinking
 * FAILURE (AUGUR's adaptive antagonist re-skinned §1). A boss is a sequence of
 * Signal-Check steps: the TRAP side is the bias; the VALUE side is the
 * disciplined read. Resist on a 2/3 majority to clear, unlock the boss's merch
 * entitlement, and earn a clear bonus. Deterministic + seeded — always playable
 * solo (anti-ghost-town). Each boss is a reusable educational engine, not a
 * mascot: lesson, difficulty, reward, card/merch/GSE tie-ins, crew + hard-mode
 * stubs, and a compliant Higgsfield asset brief.
 *
 * Boss #1 (The Public Trap) reuses the canonical scenarios from public-trap.ts.
 */

import { evaluateSignalCheck, type SignalCheckOutcome } from "./signal-check.js";
import { buildAssetBrief, type AssetBrief } from "./asset-brief.js";
import {
  PUBLIC_TRAP_SCENARIOS,
  PUBLIC_TRAP_BOSS_KEY,
  PUBLIC_TRAP_MERCH_SKU,
  type PublicTrapScenario,
} from "./public-trap.js";

export type BossSide = "TRAP" | "VALUE";
export type BossDifficulty = "Rookie" | "Sharp" | "Elite";

export interface BossScenario {
  readonly id: string;
  readonly sportKey: string;
  readonly matchup: string;
  readonly trapLabel: string;
  readonly valueLabel: string;
  readonly biasPct: number;
  readonly lesson: string;
}

export interface BossDef {
  readonly key: string;
  readonly name: string;
  readonly bias: string;
  /** The sports-thinking lesson this boss teaches. */
  readonly lesson: string;
  readonly blurb: string;
  readonly difficulty: BossDifficulty;
  readonly merchSku: string;
  readonly merchName: string;
  /** Card that pairs with this boss (informational tie-in). */
  readonly cardTieInSlug: string;
  /** A GSE War-Room study prompt surfaced after the encounter. */
  readonly gsePrompt: string;
  /** Bonus granted on a clear (on top of per-step rewards). */
  readonly clearBonusCredits: number;
  readonly clearBonusXp: number;
  /** Stubs: crew co-op and hard mode are scaffolded for Stage 3+. */
  readonly hasCrewVersion: boolean;
  readonly hasHardMode: boolean;
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
    lesson: "The popular side is over-bet. Read value over the public.",
    blurb: "The crowd piles onto the popular side. Read value over the public.",
    difficulty: "Rookie",
    merchSku: PUBLIC_TRAP_MERCH_SKU,
    merchName: "Signal Keeper Tee",
    cardTieInSlug: "signal-core",
    gsePrompt: "Study public-pressure splits in the War Room before your next read.",
    clearBonusCredits: 60,
    clearBonusXp: 80,
    hasCrewVersion: true,
    hasHardMode: true,
    scenarios: PUBLIC_TRAP_SCENARIOS.map(fromTrapScenario),
  },
  {
    key: "recency_wraith",
    name: "The Recency Wraith",
    bias: "Recency bias",
    lesson: "One game is a tiny sample. Don't overreact to last week.",
    blurb: "Last week is all it sees. The market already moved on the overreaction.",
    difficulty: "Rookie",
    merchSku: "process-hoodie",
    merchName: "Process Hoodie",
    cardTieInSlug: "rookie-scout-kit",
    gsePrompt: "Pull season-long form, not one-week splits, before fading or chasing.",
    clearBonusCredits: 70,
    clearBonusXp: 90,
    hasCrewVersion: true,
    hasHardMode: true,
    scenarios: [
      {
        id: "rw-1",
        sportKey: "americanfootball_nfl",
        matchup: "Team off a 40-point explosion",
        trapLabel: "Ride the hot team, lay the points",
        valueLabel: "Fade the overreaction — take the points",
        biasPct: 0.72,
        lesson: "One huge week pulls the line too far. The overreaction is the edge.",
      },
      {
        id: "rw-2",
        sportKey: "americanfootball_nfl",
        matchup: "Team off an ugly blowout loss",
        trapLabel: "Bury them again — fade the loser",
        valueLabel: "Buy low — the bounce-back value",
        biasPct: 0.63,
        lesson: "Recency cuts both ways. A blowout loss can overprice the fade.",
      },
      {
        id: "rw-3",
        sportKey: "americanfootball_nfl",
        matchup: "A 'streaking' Over team",
        trapLabel: "Chase the Over streak",
        valueLabel: "Read the matchup, not the streak",
        biasPct: 0.61,
        lesson: "Streaks are stories the market already priced. Read the matchup.",
      },
    ],
  },
  {
    key: "injury_fog",
    name: "The Injury Fog",
    bias: "Misreading injuries",
    lesson: "Price replacement value and uncertainty — not the headline.",
    blurb: "A name goes down and the room panics. The fog hides the real value.",
    difficulty: "Sharp",
    merchSku: "replacement-value-tee",
    merchName: "Replacement Value Tee",
    cardTieInSlug: "war-room-pass",
    gsePrompt: "Check depth-chart and replacement context in the War Room before reacting to injury news.",
    clearBonusCredits: 90,
    clearBonusXp: 120,
    hasCrewVersion: true,
    hasHardMode: true,
    scenarios: [
      {
        id: "if-1",
        sportKey: "americanfootball_nfl",
        matchup: "Star out; line moved a touchdown",
        trapLabel: "Over-fade the team — the star is gone",
        valueLabel: "Price the capable backup — take the value back",
        biasPct: 0.7,
        lesson: "The market often over-adjusts to a star absence. Replacement value matters.",
      },
      {
        id: "if-2",
        sportKey: "americanfootball_nfl",
        matchup: "Questionable tag, status unclear",
        trapLabel: "Bet big before the status is known",
        valueLabel: "Wait / size down — the uncertainty isn't priced for you",
        biasPct: 0.66,
        lesson: "Uncertainty is risk. Don't pay full conviction on an unknown status.",
      },
      {
        id: "if-3",
        sportKey: "americanfootball_nfl",
        matchup: "Key defender ruled out",
        trapLabel: "Slam the Over — defense is gutted",
        valueLabel: "Check scheme depth before assuming a shootout",
        biasPct: 0.6,
        lesson: "One absence rarely guts a unit. Read the scheme, not the name.",
      },
    ],
  },
  {
    key: "line_move_mimic",
    name: "The Line-Move Mimic",
    bias: "False steam",
    lesson: "Tell real, informed movement from noise and anchoring.",
    blurb: "It apes every line move as if it's sharp. Most movement is noise.",
    difficulty: "Sharp",
    merchSku: "closing-line-pin",
    merchName: "Closing Line Pin",
    cardTieInSlug: "signal-core",
    gsePrompt: "Compare opener vs current vs your number in the War Room — is the move informed?",
    clearBonusCredits: 90,
    clearBonusXp: 120,
    hasCrewVersion: true,
    hasHardMode: true,
    scenarios: [
      {
        id: "lm-1",
        sportKey: "americanfootball_nfl",
        matchup: "Line moved 3 points off the open",
        trapLabel: "Anchor to the opener — it's 'free' value",
        valueLabel: "Respect the move — the close is sharper",
        biasPct: 0.65,
        lesson: "Anchoring on the opener ignores new information. The close is the market's best read.",
      },
      {
        id: "lm-2",
        sportKey: "americanfootball_nfl",
        matchup: "Total ticked up on a casual narrative",
        trapLabel: "Follow the move blindly as 'steam'",
        valueLabel: "Confirm it's informed before trusting it",
        biasPct: 0.62,
        lesson: "Not every move is sharp. Public-driven moves can be false steam.",
      },
      {
        id: "lm-3",
        sportKey: "americanfootball_nfl",
        matchup: "Key news after the opener",
        trapLabel: "Use the stale pre-news number",
        valueLabel: "Re-read with the news priced in",
        biasPct: 0.58,
        lesson: "Anchoring to a stale number after real news is how you get picked off.",
      },
    ],
  },
  {
    key: "parlay_hydra",
    name: "The Parlay Hydra",
    bias: "Compounding risk",
    lesson: "Stacked legs multiply risk; correlation isn't free edge.",
    blurb: "Cut one head, it grows two. Every added leg multiplies the risk.",
    difficulty: "Elite",
    merchSku: "one-edge-tee",
    merchName: "One Clean Edge Tee",
    cardTieInSlug: "war-room-pass",
    gsePrompt: "In the War Room, isolate your single best edge instead of stacking marginal ones.",
    clearBonusCredits: 110,
    clearBonusXp: 150,
    hasCrewVersion: true,
    hasHardMode: true,
    scenarios: [
      {
        id: "ph-1",
        sportKey: "americanfootball_nfl",
        matchup: "A tempting six-leg stack",
        trapLabel: "Add more legs for a bigger payout",
        valueLabel: "Take your one cleanest read",
        biasPct: 0.74,
        lesson: "Each added leg compounds the chance of one miss sinking the whole thing.",
      },
      {
        id: "ph-2",
        sportKey: "americanfootball_nfl",
        matchup: "'Correlated' legs that look free",
        trapLabel: "Treat correlation as automatic edge",
        valueLabel: "Respect that correlation cuts both ways",
        biasPct: 0.64,
        lesson: "Correlation can amplify losses as easily as wins. It is not a free edge.",
      },
      {
        id: "ph-3",
        sportKey: "americanfootball_nfl",
        matchup: "Chasing a big number with longshots",
        trapLabel: "Stack longshots for the dream payout",
        valueLabel: "Size the read you can actually defend",
        biasPct: 0.6,
        lesson: "Payout dreams hide a brutal hit rate. Defend the read, not the number.",
      },
    ],
  },
] as const;

const BOSS_INDEX: ReadonlyMap<string, BossDef> = new Map(BOSSES.map((b) => [b.key, b]));

export function getBoss(key: string): BossDef | null {
  return BOSS_INDEX.get(key) ?? null;
}

/** A compliant Higgsfield asset brief for a boss (visual line enforced). */
export function buildBossAssetBrief(bossKey: string): AssetBrief {
  const boss = getBoss(bossKey);
  if (!boss) throw new Error(`Unknown boss: ${bossKey}`);
  return buildAssetBrief({
    kind: "boss_art",
    subject: `${boss.name}, an antagonist embodying ${boss.bias.toLowerCase()} in sports decision-making`,
    directives: ["imposing abstract form, cold logic, night-arena menace"],
    seed: `boss:${boss.key}`,
  });
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
  readonly clearBonusXp: number;
  readonly clearBonusCredits: number;
  readonly merchUnlockSku: string | null;
  readonly merchUnlockName: string | null;
  readonly gsePrompt: string;
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
  const stepXp = steps.reduce((sum, s) => sum + s.outcome.reward.xp, 0);
  const stepCredits = steps.reduce((sum, s) => sum + s.outcome.reward.credits, 0);
  const clearBonusXp = cleared ? boss.clearBonusXp : 0;
  const clearBonusCredits = cleared ? boss.clearBonusCredits : 0;

  return {
    bossKey,
    bossName: boss.name,
    steps,
    resistedCount,
    totalSteps,
    cleared,
    totalXp: stepXp + clearBonusXp,
    totalCredits: stepCredits + clearBonusCredits,
    clearBonusXp,
    clearBonusCredits,
    merchUnlockSku: cleared ? boss.merchSku : null,
    merchUnlockName: cleared ? boss.merchName : null,
    gsePrompt: boss.gsePrompt,
  };
}
