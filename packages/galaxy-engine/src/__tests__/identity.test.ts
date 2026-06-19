import { describe, it, expect } from "vitest";
import {
  ARCHETYPES,
  FACTIONS,
  getArchetype,
  getFaction,
  isArchetypeId,
  isFactionId,
} from "../archetypes.js";
import {
  SPORTS_IQ_SKILLS,
  PRIMARY_SKILL_KEY,
  unlockedPerks,
  nextPerk,
  getSkillDef,
} from "../skills.js";
import { isBrandSafe } from "../language-law.js";

// These MUST match the Prisma enums GalaxyArchetype / GalaxyFaction.
const EXPECTED_ARCHETYPES = [
  "SHARP",
  "SCOUT",
  "COLLECTOR",
  "GM",
  "CAPTAIN",
  "SHOWMAN",
  "STREET_LEGEND",
];
const EXPECTED_FACTIONS = [
  "SHARPS",
  "SCOUTS",
  "BUILDERS",
  "COLLECTORS",
  "MAVERICKS",
  "CAPTAINS",
  "SHOWMEN",
  "GRINDERS",
];

describe("Identity — archetypes & factions", () => {
  it("exposes exactly the canon archetypes", () => {
    expect(ARCHETYPES.map((a) => a.id).sort()).toEqual([...EXPECTED_ARCHETYPES].sort());
  });

  it("exposes exactly the canon factions", () => {
    expect(FACTIONS.map((f) => f.id).sort()).toEqual([...EXPECTED_FACTIONS].sort());
  });

  it("every archetype's default faction exists", () => {
    for (const a of ARCHETYPES) {
      expect(isFactionId(a.defaultFaction)).toBe(true);
      expect(() => getFaction(a.defaultFaction)).not.toThrow();
    }
  });

  it("type guards work", () => {
    expect(isArchetypeId("SHARP")).toBe(true);
    expect(isArchetypeId("NOPE")).toBe(false);
    expect(getArchetype("GM").name).toBe("GM");
  });

  it("all identity copy passes the Language Law", () => {
    for (const a of ARCHETYPES) {
      expect(isBrandSafe(`${a.name} ${a.tagline} ${a.blurb} ${a.signaturePerk}`)).toBe(true);
    }
    for (const f of FACTIONS) {
      expect(isBrandSafe(`${f.name} ${f.creed} ${f.blurb}`)).toBe(true);
    }
  });
});

describe("Sports IQ skills & perk gates", () => {
  it("includes the primary slice skill", () => {
    expect(SPORTS_IQ_SKILLS.some((s) => s.key === PRIMARY_SKILL_KEY)).toBe(true);
    expect(getSkillDef(PRIMARY_SKILL_KEY)).not.toBeNull();
  });

  it("perks unlock progressively with skill level", () => {
    expect(unlockedPerks(1).length).toBe(0);
    expect(unlockedPerks(99).length).toBeGreaterThan(0);
    const next = nextPerk(1);
    expect(next).not.toBeNull();
    expect(unlockedPerks(next!.skillLevel).some((p) => p.id === next!.id)).toBe(true);
  });
});
