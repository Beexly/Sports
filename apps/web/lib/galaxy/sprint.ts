/**
 * Galaxy Dynasty — Signal Sprint server lib (Phase 8).
 *
 * Grades a 5-prompt rapid sports-IQ run server-side (D-012), awards aggregate
 * XP/Credits/Season Points once, and returns per-prompt reveals + the signal tags
 * the player got right (their emerging "sports brain map"). Crash-safe in stub.
 */

import { isStubMode } from "@sports/db";
import { gradeBinarySignalCheck } from "@sports/galaxy-engine";
import { SIGNAL_SPRINT_QUESTIONS, type SprintQuestion } from "./content.js";
import { applyReward } from "./profile.js";

const SPRINT_CONFIDENCE = 65; // implicit conviction for the rapid format

export interface SprintReveal {
  readonly id: string;
  readonly tag: string;
  readonly correct: boolean;
  readonly explanation: string;
}

export interface SprintResult {
  readonly reveals: readonly SprintReveal[];
  readonly correctCount: number;
  readonly total: number;
  readonly xp: number;
  readonly credits: number;
  readonly strongTags: readonly string[];
  readonly weakTags: readonly string[];
  readonly persisted: boolean;
}

export async function runSignalSprint(
  profileId: string,
  answers: readonly { id: string; choice: "A" | "B" }[],
): Promise<SprintResult> {
  const reveals: SprintReveal[] = [];
  const strongTags: string[] = [];
  const weakTags: string[] = [];
  let xp = 0;
  let credits = 0;
  let correctCount = 0;

  for (const a of answers) {
    const q: SprintQuestion | undefined = SIGNAL_SPRINT_QUESTIONS.find((x) => x.id === a.id);
    if (!q) continue;
    const correct = a.choice === q.correct;
    const outcome = gradeBinarySignalCheck("BLACKTOP", correct, SPRINT_CONFIDENCE);
    xp += outcome.reward.xp;
    credits += outcome.reward.credits;
    if (correct) {
      correctCount++;
      strongTags.push(q.tag);
    } else {
      weakTags.push(q.tag);
    }
    reveals.push({ id: q.id, tag: q.tag, correct, explanation: q.explanation });
  }

  if (xp > 0 || credits > 0) {
    await applyReward(profileId, {
      xp,
      credits,
      reason: "BLACKTOP_REWARD",
      sportKey: "americanfootball_nfl",
      ref: { type: "signal_sprint", id: `n${answers.length}` },
    });
  }

  return {
    reveals,
    correctCount,
    total: answers.length,
    xp,
    credits,
    strongTags,
    weakTags,
    persisted: !isStubMode() && profileId !== "stub",
  };
}
