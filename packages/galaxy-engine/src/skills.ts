/**
 * Galaxy Dynasty — Sports IQ skills & perk gates.
 *
 * A Sports IQ skill is keyed by the Odds API sport key (DECISION D-009) so skills
 * map 1:1 to real graded markets. Levels gate TOOLS/PERKS — never raw power
 * (bible §4.1). This module is the registry of slice-supported skills and the
 * level thresholds at which perks unlock.
 */

export interface SportsIqSkillDef {
  /** Odds API sport key, e.g. "americanfootball_nfl". */
  readonly key: string;
  readonly label: string;
  /** Short name for the skill chip. */
  readonly shortLabel: string;
}

/**
 * Slice-supported skills. NFL is the live sport for Rookie Season (D-010); the
 * others are seeded so a profile can branch later without a schema change.
 */
export const SPORTS_IQ_SKILLS: readonly SportsIqSkillDef[] = [
  { key: "americanfootball_nfl", label: "Football IQ (NFL)", shortLabel: "NFL" },
  { key: "basketball_nba", label: "Basketball IQ (NBA)", shortLabel: "NBA" },
  { key: "baseball_mlb", label: "Baseball IQ (MLB)", shortLabel: "MLB" },
  { key: "icehockey_nhl", label: "Hockey IQ (NHL)", shortLabel: "NHL" },
] as const;

const SKILL_INDEX: ReadonlyMap<string, SportsIqSkillDef> = new Map(
  SPORTS_IQ_SKILLS.map((s) => [s.key, s]),
);

export function getSkillDef(key: string): SportsIqSkillDef | null {
  return SKILL_INDEX.get(key) ?? null;
}

export function isSupportedSkill(key: string): boolean {
  return SKILL_INDEX.has(key);
}

/** The live skill for Rookie Season. */
export const PRIMARY_SKILL_KEY = "americanfootball_nfl";

/**
 * Perk gates — tools unlocked at skill levels. These are READ tools and quality-of
 * life, never confidence boosts or guaranteed outcomes. Crossing a gate is earned
 * proof of calibration, the honest version of "unlocking power".
 */
export interface PerkGate {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly skillLevel: number;
}

export const PERK_GATES: readonly PerkGate[] = [
  {
    id: "factor_trail",
    label: "Factor Trail",
    description: "See the full factor breakdown behind each line.",
    skillLevel: 3,
  },
  {
    id: "line_movement",
    label: "Line Movement Lens",
    description: "Watch how the number moved before lock.",
    skillLevel: 7,
  },
  {
    id: "war_room_depth",
    label: "War Room Depth",
    description: "Multi-game context and the Season Program view.",
    skillLevel: 12,
  },
  {
    id: "ghost_replays",
    label: "Ghost Replays",
    description: "Study how seeded Ghost profiles read the same game.",
    skillLevel: 20,
  },
] as const;

/** Perks a given skill level has unlocked. */
export function unlockedPerks(skillLevel: number): readonly PerkGate[] {
  return PERK_GATES.filter((p) => skillLevel >= p.skillLevel);
}

/** The next perk to chase at a given skill level (null if all unlocked). */
export function nextPerk(skillLevel: number): PerkGate | null {
  return PERK_GATES.find((p) => skillLevel < p.skillLevel) ?? null;
}
