/**
 * Galaxy Dynasty — leveling math.
 *
 * Pure functions that turn accumulated XP into Sports IQ skill levels (1–99) and
 * character levels. Levels gate tools/perks, never raw power (bible §4.1
 * anti-pay-to-win). A "Level N" is earned proof of graded calibration.
 */

import {
  SKILL_MIN_LEVEL,
  SKILL_MAX_LEVEL,
  CHARACTER_MIN_LEVEL,
  CHARACTER_MAX_LEVEL,
  skillXpToNextLevel,
  characterXpToNextLevel,
} from "./constants.js";

export interface LevelState {
  readonly level: number;
  /** XP accumulated within the current level (toward the next). */
  readonly xpIntoLevel: number;
  /** XP required to reach the next level (0 if at max). */
  readonly xpToNext: number;
  /** Fractional progress through the current level, 0..1. */
  readonly progress: number;
  /** True if the level changed in the last apply. */
  readonly leveledUp: boolean;
  /** New level minus old level (0 if unchanged). */
  readonly levelsGained: number;
}

function applyXp(
  totalXp: number,
  minLevel: number,
  maxLevel: number,
  xpToNext: (level: number) => number,
  previousLevel: number,
): LevelState {
  let level = minLevel;
  let remaining = Math.max(0, Math.floor(totalXp));

  while (level < maxLevel) {
    const need = xpToNext(level);
    if (remaining < need) break;
    remaining -= need;
    level += 1;
  }

  const xpToNextVal = level >= maxLevel ? 0 : xpToNext(level);
  const progress = xpToNextVal === 0 ? 1 : remaining / xpToNextVal;
  const levelsGained = Math.max(0, level - previousLevel);

  return {
    level,
    xpIntoLevel: remaining,
    xpToNext: xpToNextVal,
    progress: Math.round(progress * 10000) / 10000,
    leveledUp: levelsGained > 0,
    levelsGained,
  };
}

/** Resolve a Sports IQ skill level from total XP earned in that skill. */
export function skillLevelFromXp(totalXp: number, previousLevel = SKILL_MIN_LEVEL): LevelState {
  return applyXp(totalXp, SKILL_MIN_LEVEL, SKILL_MAX_LEVEL, skillXpToNextLevel, previousLevel);
}

/** Resolve the overall character level from total XP across all skills. */
export function characterLevelFromXp(
  totalXp: number,
  previousLevel = CHARACTER_MIN_LEVEL,
): LevelState {
  return applyXp(
    totalXp,
    CHARACTER_MIN_LEVEL,
    CHARACTER_MAX_LEVEL,
    characterXpToNextLevel,
    previousLevel,
  );
}

/** Total XP required to reach exactly `targetLevel` of a skill from level 1. */
export function totalSkillXpForLevel(targetLevel: number): number {
  let sum = 0;
  for (let l = SKILL_MIN_LEVEL; l < Math.min(targetLevel, SKILL_MAX_LEVEL); l++) {
    sum += skillXpToNextLevel(l);
  }
  return sum;
}
