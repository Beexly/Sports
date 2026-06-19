import { describe, it, expect } from "vitest";
import {
  skillLevelFromXp,
  characterLevelFromXp,
  totalSkillXpForLevel,
} from "../leveling.js";
import { SKILL_MIN_LEVEL, SKILL_MAX_LEVEL, skillXpToNextLevel } from "../constants.js";

describe("Leveling", () => {
  it("starts at the minimum level with zero XP", () => {
    const s = skillLevelFromXp(0);
    expect(s.level).toBe(SKILL_MIN_LEVEL);
    expect(s.xpIntoLevel).toBe(0);
    expect(s.leveledUp).toBe(false);
  });

  it("level 1→2 happens at exactly skillXpToNextLevel(1)", () => {
    const need = skillXpToNextLevel(1);
    expect(skillLevelFromXp(need - 1).level).toBe(1);
    expect(skillLevelFromXp(need).level).toBe(2);
  });

  it("reports levelsGained relative to a previous level", () => {
    const need = totalSkillXpForLevel(4); // enough for level 4
    const s = skillLevelFromXp(need, 1);
    expect(s.level).toBe(4);
    expect(s.levelsGained).toBe(3);
    expect(s.leveledUp).toBe(true);
  });

  it("totalSkillXpForLevel is the cumulative sum of per-level costs", () => {
    const manual = skillXpToNextLevel(1) + skillXpToNextLevel(2);
    expect(totalSkillXpForLevel(3)).toBe(manual);
  });

  it("caps at the max skill level and reports full progress", () => {
    const huge = 10_000_000;
    const s = skillLevelFromXp(huge);
    expect(s.level).toBe(SKILL_MAX_LEVEL);
    expect(s.xpToNext).toBe(0);
    expect(s.progress).toBe(1);
  });

  it("character leveling advances with accumulated XP", () => {
    const c0 = characterLevelFromXp(0);
    const c1 = characterLevelFromXp(5000, c0.level);
    expect(c1.level).toBeGreaterThan(c0.level);
  });

  it("progress is a fraction in [0,1)", () => {
    const s = skillLevelFromXp(Math.floor(skillXpToNextLevel(1) / 2));
    expect(s.progress).toBeGreaterThan(0);
    expect(s.progress).toBeLessThan(1);
  });
});
