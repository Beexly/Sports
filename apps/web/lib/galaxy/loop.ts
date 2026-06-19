/**
 * Galaxy Dynasty — the core loop, server side (bible §7).
 *
 * Each runner grades a Signal Check via the engine, persists the attempt
 * (best-effort), applies the calibration-weighted reward, completes quests, and
 * returns a transparent outcome. The returned outcome is ALWAYS real
 * (engine-computed) even in DB-stub mode — persistence is the only thing that
 * no-ops without a database.
 */

import { db, isStubMode } from "@sports/db";
import {
  gradeMarketSignalCheck,
  gradeBinarySignalCheck,
  evaluatePublicTrapEncounter,
  PUBLIC_TRAP_SCENARIOS,
  PUBLIC_TRAP_BOSS_KEY,
  PUBLIC_TRAP_MERCH_SKU,
  type SignalCheckOutcome,
  type PublicTrapEncounterResult,
  type TrapSide,
} from "@sports/galaxy-engine";
import { applyReward } from "./profile.js";
import {
  getWarRoomScenario,
  getBlacktopQuestion,
  ACADEMY_FIRST_CHECK,
} from "./content.js";
import type { SignalCheckResponse, RewardSummary } from "./types.js";

async function completeQuest(profileId: string, questKey: string): Promise<boolean> {
  if (profileId === "stub") return false;
  try {
    const existing = await db.galaxyQuestCompletion.findUnique({
      where: { profileId_questKey: { profileId, questKey } },
    });
    if (existing) return false;
    await db.galaxyQuestCompletion.create({ data: { profileId, questKey } });
    return true;
  } catch {
    return false;
  }
}

async function persistAttempt(
  profileId: string,
  data: {
    surface: "ACADEMY" | "WAR_ROOM" | "BLACKTOP" | "BOSS" | "DUEL" | "DAILY";
    sportKey: string;
    prompt: string;
    pickType?: string;
    selection?: string;
    line?: number;
    homeTeam?: string;
    confidence: number;
    outcome: SignalCheckOutcome;
    resolvedOutcome?: string;
  },
): Promise<void> {
  if (profileId === "stub") return;
  try {
    await db.signalCheckAttempt.create({
      data: {
        profileId,
        surface: data.surface,
        sportKey: data.sportKey,
        prompt: data.prompt,
        pickType: data.pickType ?? null,
        selection: data.selection ?? null,
        line: data.line ?? null,
        homeTeam: data.homeTeam ?? null,
        confidence: data.confidence,
        result: data.outcome.result,
        correct: data.outcome.correct,
        brier: data.outcome.reward.brier,
        calibrationScore: data.outcome.reward.calibrationScore,
        xpAwarded: data.outcome.reward.xp,
        creditsAwarded: data.outcome.reward.credits,
        resolvedOutcome: data.resolvedOutcome ?? null,
        gradedAt: new Date(),
      },
    });
  } catch {
    /* no DB — no-op */
  }
}

function clampConfidence(c: number): number {
  if (!Number.isFinite(c)) return 50;
  return Math.max(1, Math.min(99, Math.round(c)));
}

// ── War Room ──────────────────────────────────────────────────────────────────

export async function runWarRoomCheck(
  profileId: string,
  scenarioId: string,
  optionKey: "A" | "B",
  rawConfidence: number,
): Promise<SignalCheckResponse> {
  const scenario = getWarRoomScenario(scenarioId);
  if (!scenario) throw new Error(`Unknown War Room scenario: ${scenarioId}`);
  const option = scenario.options.find((o) => o.key === optionKey);
  if (!option) throw new Error(`Unknown option ${optionKey} for ${scenarioId}`);

  const confidence = clampConfidence(rawConfidence);
  const outcome = gradeMarketSignalCheck(
    "WAR_ROOM",
    {
      pickType: option.pickType,
      selection: option.selection,
      line: option.line,
      homeTeam: scenario.homeTeam,
    },
    { homeScore: scenario.homeScore, awayScore: scenario.awayScore, sportKey: scenario.sportKey },
    confidence,
  );

  await persistAttempt(profileId, {
    surface: "WAR_ROOM",
    sportKey: scenario.sportKey,
    prompt: `${scenario.awayTeam} @ ${scenario.homeTeam} — ${scenario.market}`,
    pickType: option.pickType,
    selection: option.selection,
    line: option.line,
    homeTeam: scenario.homeTeam,
    confidence,
    outcome,
    resolvedOutcome: `${scenario.homeTeam} ${scenario.homeScore}–${scenario.awayScore} ${scenario.awayTeam}`,
  });

  const reward = await applyReward(profileId, {
    xp: outcome.reward.xp,
    credits: outcome.reward.credits,
    reason: "SIGNAL_CHECK_REWARD",
    sportKey: scenario.sportKey,
    ref: { type: "war_room", id: scenarioId },
  });

  const questsCompleted: string[] = [];
  if (await completeQuest(profileId, "first-war-room-read")) questsCompleted.push("first-war-room-read");
  if (await completeQuest(profileId, "daily-signal")) questsCompleted.push("daily-signal");

  return { outcome, reward, persisted: !isStubMode() && profileId !== "stub", questsCompleted };
}

// ── Blacktop mini-game ───────────────────────────────────────────────────────

export async function runBlacktopCheck(
  profileId: string,
  questionId: string,
  answer: "A" | "B",
  rawConfidence: number,
): Promise<SignalCheckResponse> {
  const q = getBlacktopQuestion(questionId);
  if (!q) throw new Error(`Unknown Blacktop question: ${questionId}`);
  const confidence = clampConfidence(rawConfidence);
  const correct = answer === q.correct;
  const outcome = gradeBinarySignalCheck("BLACKTOP", correct, confidence);

  await persistAttempt(profileId, {
    surface: "BLACKTOP",
    sportKey: "americanfootball_nfl",
    prompt: q.prompt,
    confidence,
    outcome,
    resolvedOutcome: correct ? "Correct" : "Incorrect",
  });

  const reward = await applyReward(profileId, {
    xp: outcome.reward.xp,
    credits: outcome.reward.credits,
    reason: "BLACKTOP_REWARD",
    sportKey: "americanfootball_nfl",
    ref: { type: "blacktop", id: questionId },
  });

  const questsCompleted: string[] = [];
  if (await completeQuest(profileId, "daily-signal")) questsCompleted.push("daily-signal");

  return { outcome, reward, persisted: !isStubMode() && profileId !== "stub", questsCompleted };
}

// ── Academy first check (onboarding rep) ─────────────────────────────────────

export async function runAcademyCheck(
  profileId: string,
  answer: "A" | "B",
  rawConfidence: number,
): Promise<SignalCheckResponse> {
  const q = ACADEMY_FIRST_CHECK;
  const confidence = clampConfidence(rawConfidence);
  const correct = answer === q.correct;
  const outcome = gradeBinarySignalCheck("ACADEMY", correct, confidence);

  await persistAttempt(profileId, {
    surface: "ACADEMY",
    sportKey: "americanfootball_nfl",
    prompt: q.prompt,
    confidence,
    outcome,
    resolvedOutcome: correct ? "Correct" : "Incorrect",
  });

  const reward = await applyReward(profileId, {
    xp: outcome.reward.xp,
    credits: outcome.reward.credits,
    reason: "SIGNAL_CHECK_REWARD",
    sportKey: "americanfootball_nfl",
    ref: { type: "academy", id: q.id },
  });

  return { outcome, reward, persisted: !isStubMode() && profileId !== "stub", questsCompleted: [] };
}

// ── PvM boss — The Public Trap ───────────────────────────────────────────────

export interface PublicTrapResponse {
  readonly result: PublicTrapEncounterResult;
  readonly reward: RewardSummary;
  readonly merchUnlocked: { sku: string; name: string } | null;
  readonly questsCompleted: readonly string[];
  readonly persisted: boolean;
}

export async function runPublicTrap(
  profileId: string,
  answers: readonly { scenarioId: string; chosen: TrapSide; confidence: number }[],
): Promise<PublicTrapResponse> {
  const mapped = answers.map((a) => {
    const scenario = PUBLIC_TRAP_SCENARIOS.find((s) => s.id === a.scenarioId);
    if (!scenario) throw new Error(`Unknown Public Trap scenario: ${a.scenarioId}`);
    return { scenario, chosen: a.chosen, confidence: clampConfidence(a.confidence) };
  });

  const result = evaluatePublicTrapEncounter(mapped);

  // Persist one summary attempt for the boss encounter.
  if (profileId !== "stub" && result.steps[0]) {
    await persistAttempt(profileId, {
      surface: "BOSS",
      sportKey: "americanfootball_nfl",
      prompt: `The Public Trap — resisted ${result.resistedCount}/${result.totalSteps}`,
      confidence: Math.round(
        mapped.reduce((s, m) => s + m.confidence, 0) / Math.max(mapped.length, 1),
      ),
      outcome: result.steps[0].outcome,
      resolvedOutcome: result.cleared ? "CLEARED" : "NOT_CLEARED",
    });
  }

  const reward = await applyReward(profileId, {
    xp: result.totalXp,
    credits: result.totalCredits,
    reason: "BOSS_REWARD",
    sportKey: "americanfootball_nfl",
    ref: { type: "boss", id: PUBLIC_TRAP_BOSS_KEY },
  });

  // Boss progress.
  if (profileId !== "stub") {
    try {
      await db.bossProgress.upsert({
        where: { profileId_bossKey: { profileId, bossKey: PUBLIC_TRAP_BOSS_KEY } },
        update: {
          attempts: { increment: 1 },
          cleared: result.cleared,
          bestScore: result.resistedCount,
          clearedAt: result.cleared ? new Date() : null,
        },
        create: {
          profileId,
          bossKey: PUBLIC_TRAP_BOSS_KEY,
          attempts: 1,
          cleared: result.cleared,
          bestScore: result.resistedCount,
          clearedAt: result.cleared ? new Date() : null,
        },
      });
    } catch {
      /* no DB */
    }
  }

  let merchUnlocked: { sku: string; name: string } | null = null;
  const questsCompleted: string[] = [];
  if (result.cleared) {
    merchUnlocked = await unlockMerch(
      profileId,
      PUBLIC_TRAP_MERCH_SKU,
      "Signal Keeper Tee",
      "Cleared The Public Trap",
    );
    if (await completeQuest(profileId, "clear-the-public-trap")) {
      questsCompleted.push("clear-the-public-trap");
    }
  }

  return {
    result,
    reward,
    merchUnlocked,
    questsCompleted,
    persisted: !isStubMode() && profileId !== "stub",
  };
}

// ── Merch entitlement (achievement-gated; no custody — bible Phase 6) ─────────

export async function unlockMerch(
  profileId: string,
  sku: string,
  name: string,
  via: string,
): Promise<{ sku: string; name: string }> {
  if (profileId !== "stub") {
    try {
      await db.merchEntitlement.upsert({
        where: { profileId_sku: { profileId, sku } },
        update: {},
        create: { profileId, sku, name, unlockedVia: via },
      });
    } catch {
      /* no DB */
    }
  }
  return { sku, name };
}
