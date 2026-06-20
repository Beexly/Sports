/**
 * Galaxy Dynasty — Signal Duel server lib (async PvP, Stage 2).
 *
 * Two players read the same War Room scenario; each is engine-graded, scored on
 * outcome + calibration + process, and ratings update Elo-style. Always playable
 * solo via Ghost opponents (anti-ghost-town §4.3). Crash-safe in DB-stub mode.
 */

import { db, isStubMode } from "@sports/db";
import {
  gradeMarketSignalCheck,
  evaluateSignalCheck,
  resolveDuel,
  updateRating,
  ratingTier,
  BASE_RATING,
  type SignalCheckOutcome,
  type SettlementResult,
  type DuelResolution,
} from "@sports/galaxy-engine";
import { applyReward } from "./profile.js";
import { getWarRoomScenario, GHOST_PROFILES, type WarRoomScenario } from "./content.js";
import { DUEL_WIN_CREDITS, DUEL_WIN_XP } from "@sports/galaxy-engine";
import type { LeaderboardEntry, DuelView } from "./types.js";

function clampConfidence(c: number): number {
  if (!Number.isFinite(c)) return 50;
  return Math.max(1, Math.min(99, Math.round(c)));
}

function optionFor(scenario: WarRoomScenario, key: "A" | "B") {
  const o = scenario.options.find((x) => x.key === key);
  if (!o) throw new Error(`Unknown option ${key} for ${scenario.id}`);
  return o;
}

function gradeRead(scenario: WarRoomScenario, key: "A" | "B", confidence: number): SignalCheckOutcome {
  const o = optionFor(scenario, key);
  return gradeMarketSignalCheck(
    "DUEL",
    { pickType: o.pickType, selection: o.selection, line: o.line, homeTeam: scenario.homeTeam },
    { homeScore: scenario.homeScore, awayScore: scenario.awayScore, sportKey: scenario.sportKey },
    confidence,
  );
}

export interface DuelResult {
  readonly resolution: DuelResolution;
  readonly youWon: boolean;
  readonly opponentHandle: string;
  readonly newRating: number;
  readonly ratingDelta: number;
  readonly ratingTier: string;
  readonly creditsAwarded: number;
  readonly persisted: boolean;
}

/** Deterministic Ghost rating from its calibration (skill-tiered seeding). */
function ghostRating(calibration: number): number {
  return Math.round(900 + calibration * 8);
}

/** Pick a Ghost opponent near the player's rating (skill-tiered matchmaking). */
function pickGhost(rating: number) {
  let best = GHOST_PROFILES[0]!;
  let bestDiff = Infinity;
  for (const g of GHOST_PROFILES) {
    const diff = Math.abs(ghostRating(g.calibration) - rating);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = g;
    }
  }
  return best;
}

/**
 * Duel against a Ghost (always available). Grades the player's read and a
 * deterministic Ghost read, resolves, updates the player's rating, rewards reps +
 * a win bonus.
 */
export async function runGhostDuel(
  profileId: string,
  scenarioId: string,
  option: "A" | "B",
  rawConfidence: number,
): Promise<DuelResult> {
  const scenario = getWarRoomScenario(scenarioId);
  if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`);
  const confidence = clampConfidence(rawConfidence);

  const youOutcome = gradeRead(scenario, option, confidence);

  // Read the player's current rating (default base in stub mode).
  let rating = BASE_RATING;
  if (profileId !== "stub") {
    const row = await db.galaxyProfile.findUnique({ where: { id: profileId }, select: { rating: true } }).catch(() => null);
    if (row) rating = row.rating;
  }

  const ghost = pickGhost(rating);
  const gRating = ghostRating(ghost.calibration);

  // Ghost reads the value side with confidence tracking its calibration.
  const ghostOption: "A" | "B" = "A"; // option A is the listed/disciplined-first side
  const ghostConfidence = clampConfidence(ghost.calibration);
  const ghostOutcome = gradeRead(scenario, ghostOption, ghostConfidence);

  const resolution = resolveDuel(youOutcome, ghostOutcome);
  const youWon = resolution.winner === "CREATOR";
  const score = resolution.winner === "TIE" ? 0.5 : youWon ? 1 : 0;
  const newRating = updateRating(rating, gRating, score as 0 | 0.5 | 1);

  // Reward: the rep (always) + a win bonus (on a win).
  let credits = youOutcome.reward.credits;
  let xp = youOutcome.reward.xp;
  if (youWon) {
    credits += DUEL_WIN_CREDITS;
    xp += DUEL_WIN_XP;
  }
  await applyReward(profileId, {
    xp,
    credits,
    reason: "DUEL_REWARD",
    sportKey: scenario.sportKey,
    ref: { type: "duel_ghost", id: scenarioId },
  });

  // Persist the duel + new rating.
  let persisted = false;
  if (profileId !== "stub") {
    try {
      await db.signalDuel.create({
        data: {
          sportKey: scenario.sportKey,
          prompt: `${scenario.awayTeam} @ ${scenario.homeTeam} vs ${ghost.handle}`,
          scenarioId,
          status: "RESOLVED",
          creatorProfileId: profileId,
          winnerProfileId: youWon ? profileId : null,
          resolvedAt: new Date(),
        },
      });
      await db.galaxyProfile.update({ where: { id: profileId }, data: { rating: newRating } });
      persisted = !isStubMode();
    } catch {
      /* no DB */
    }
  }

  return {
    resolution,
    youWon,
    opponentHandle: ghost.handle,
    newRating,
    ratingDelta: newRating - rating,
    ratingTier: ratingTier(newRating).name,
    creditsAwarded: credits,
    persisted,
  };
}

/** Create an OPEN duel for another human to challenge. Rewards the creator's rep. */
export async function createOpenDuel(
  profileId: string,
  scenarioId: string,
  option: "A" | "B",
  rawConfidence: number,
): Promise<{ duelId: string; outcome: SignalCheckOutcome; persisted: boolean }> {
  const scenario = getWarRoomScenario(scenarioId);
  if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`);
  const confidence = clampConfidence(rawConfidence);
  const outcome = gradeRead(scenario, option, confidence);
  const o = optionFor(scenario, option);

  let duelId = "stub";
  if (profileId !== "stub") {
    try {
      const attempt = await db.signalCheckAttempt.create({
        data: {
          profileId,
          surface: "DUEL",
          sportKey: scenario.sportKey,
          prompt: `${scenario.awayTeam} @ ${scenario.homeTeam}`,
          pickType: o.pickType,
          selection: o.selection,
          line: o.line,
          homeTeam: scenario.homeTeam,
          confidence,
          result: outcome.result,
          correct: outcome.correct,
          brier: outcome.reward.brier,
          calibrationScore: outcome.reward.calibrationScore,
          gradedAt: new Date(),
        },
      });
      const duel = await db.signalDuel.create({
        data: {
          sportKey: scenario.sportKey,
          prompt: `${scenario.awayTeam} @ ${scenario.homeTeam} — ${scenario.market}`,
          scenarioId,
          status: "OPEN",
          creatorProfileId: profileId,
          creatorAttemptId: attempt.id,
        },
      });
      duelId = duel.id;
    } catch {
      duelId = "stub";
    }
  }

  // Reward the creator the rep (rating moves only on resolution).
  await applyReward(profileId, {
    xp: outcome.reward.xp,
    credits: outcome.reward.credits,
    reason: "SIGNAL_CHECK_REWARD",
    sportKey: scenario.sportKey,
    ref: { type: "duel_open", id: scenarioId },
  });

  return { duelId, outcome, persisted: !isStubMode() && profileId !== "stub" };
}

/** Challenge (join) an OPEN duel: grade the opponent, resolve, update both ratings. */
export async function joinDuel(
  profileId: string,
  duelId: string,
  option: "A" | "B",
  rawConfidence: number,
): Promise<DuelResult> {
  const duel = await db.signalDuel
    .findUnique({ where: { id: duelId }, include: { creator: true } })
    .catch(() => null);
  if (!duel) throw new Error("Duel not found.");
  if (duel.status !== "OPEN") throw new Error("Duel already resolved.");
  if (duel.creatorProfileId === profileId) throw new Error("You can't challenge your own duel.");
  if (!duel.scenarioId) throw new Error("Duel scenario missing.");

  const scenario = getWarRoomScenario(duel.scenarioId);
  if (!scenario) throw new Error("Unknown duel scenario.");
  const confidence = clampConfidence(rawConfidence);

  // Reconstruct the creator's outcome from the stored attempt.
  let creatorResult: SettlementResult = "PUSH";
  let creatorConfidence = 50;
  if (duel.creatorAttemptId) {
    const ca = await db.signalCheckAttempt
      .findUnique({ where: { id: duel.creatorAttemptId } })
      .catch(() => null);
    if (ca) {
      creatorResult = (ca.result === "PENDING" ? "PUSH" : ca.result) as SettlementResult;
      creatorConfidence = ca.confidence;
    }
  }
  const creatorOutcome = evaluateSignalCheck("DUEL", creatorResult, creatorConfidence);
  const opponentOutcome = gradeRead(scenario, option, confidence);
  const resolution = resolveDuel(creatorOutcome, opponentOutcome);

  const youWon = resolution.winner === "OPPONENT"; // joiner is "opponent" side
  const creatorWon = resolution.winner === "CREATOR";

  // Ratings.
  const oppRow = await db.galaxyProfile.findUnique({ where: { id: profileId }, select: { rating: true } }).catch(() => null);
  const myRating = oppRow?.rating ?? BASE_RATING;
  const creatorRating = duel.creator?.rating ?? BASE_RATING;
  const myScore = resolution.winner === "TIE" ? 0.5 : youWon ? 1 : 0;
  const creatorScore = resolution.winner === "TIE" ? 0.5 : creatorWon ? 1 : 0;
  const newMyRating = updateRating(myRating, creatorRating, myScore as 0 | 0.5 | 1);
  const newCreatorRating = updateRating(creatorRating, myRating, creatorScore as 0 | 0.5 | 1);

  let credits = opponentOutcome.reward.credits;
  let xp = opponentOutcome.reward.xp;
  if (youWon) {
    credits += DUEL_WIN_CREDITS;
    xp += DUEL_WIN_XP;
  }
  await applyReward(profileId, {
    xp,
    credits,
    reason: "DUEL_REWARD",
    sportKey: scenario.sportKey,
    ref: { type: "duel_join", id: duelId },
  });

  let persisted = false;
  try {
    const oppAttempt = await db.signalCheckAttempt.create({
      data: {
        profileId,
        surface: "DUEL",
        sportKey: scenario.sportKey,
        prompt: scenario.market,
        confidence,
        result: opponentOutcome.result,
        correct: opponentOutcome.correct,
        brier: opponentOutcome.reward.brier,
        calibrationScore: opponentOutcome.reward.calibrationScore,
        gradedAt: new Date(),
      },
    });
    await db.signalDuel.update({
      where: { id: duelId },
      data: {
        status: "RESOLVED",
        opponentProfileId: profileId,
        opponentAttemptId: oppAttempt.id,
        winnerProfileId: youWon ? profileId : creatorWon ? duel.creatorProfileId : null,
        resolvedAt: new Date(),
      },
    });
    await db.galaxyProfile.update({ where: { id: profileId }, data: { rating: newMyRating } });
    await db.galaxyProfile.update({ where: { id: duel.creatorProfileId }, data: { rating: newCreatorRating } });
    // Award the creator a win bonus if they won (their rep was paid at creation).
    if (creatorWon) {
      await applyReward(duel.creatorProfileId, {
        xp: DUEL_WIN_XP,
        credits: DUEL_WIN_CREDITS,
        reason: "DUEL_REWARD",
        sportKey: scenario.sportKey,
        ref: { type: "duel_win", id: duelId },
      });
    }
    persisted = !isStubMode();
  } catch {
    /* no DB */
  }

  return {
    resolution,
    youWon,
    opponentHandle: duel.creator?.handle ?? "Challenger",
    newRating: newMyRating,
    ratingDelta: newMyRating - myRating,
    ratingTier: ratingTier(newMyRating).name,
    creditsAwarded: credits,
    persisted,
  };
}

export async function listOpenDuels(excludeProfileId?: string): Promise<DuelView[]> {
  try {
    const rows = await db.signalDuel.findMany({
      where: { status: "OPEN", ...(excludeProfileId ? { creatorProfileId: { not: excludeProfileId } } : {}) },
      include: { creator: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return rows.map((d) => ({
      id: d.id,
      sportKey: d.sportKey,
      prompt: d.prompt,
      status: d.status as "OPEN" | "RESOLVED",
      creatorHandle: d.creator?.handle ?? "Player",
      opponentHandle: null,
      winnerHandle: null,
      createdAt: d.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

/** Ranked ladder — real profiles by rating, merged with Ghost seeds. */
export async function leaderboard(currentProfileId?: string): Promise<LeaderboardEntry[]> {
  let real: { handle: string; rating: number; archetype: string; id: string; isGhost: boolean }[] = [];
  try {
    const rows = await db.galaxyProfile.findMany({
      orderBy: { rating: "desc" },
      take: 25,
      select: { id: true, handle: true, rating: true, archetype: true, isGhost: true },
    });
    real = rows.map((r) => ({ ...r }));
  } catch {
    real = [];
  }

  const ghosts = GHOST_PROFILES.map((g) => ({
    handle: g.handle,
    rating: ghostRating(g.calibration),
    archetype: g.archetype,
    id: `ghost:${g.handle}`,
    isGhost: true,
  }));

  const merged = [...real, ...ghosts]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 25);

  return merged.map((e, i) => ({
    rank: i + 1,
    handle: e.handle,
    rating: e.rating,
    tier: ratingTier(e.rating).name,
    archetype: e.archetype,
    isGhost: e.isGhost,
    isYou: currentProfileId != null && e.id === currentProfileId,
  }));
}
