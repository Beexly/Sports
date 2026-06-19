import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ARCHETYPES, FACTIONS, CREDIT_EARN_REASONS } from "@sports/galaxy-engine";

/**
 * Guards against engine ↔ Prisma drift. The TypeScript identity registry and the
 * Prisma enums MUST stay in lockstep, or onboarding writes an invalid enum and
 * the Credit Constitution's earn-only reasons diverge from the DB.
 */

const schema = readFileSync(
  resolve(__dirname, "..", "..", "..", "packages", "db", "prisma", "schema.prisma"),
  "utf8",
);

function enumMembers(name: string): string[] {
  const m = schema.match(new RegExp(`enum\\s+${name}\\s*\\{([^}]*)\\}`));
  if (!m) return [];
  return m[1]!
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("//"));
}

describe("Galaxy schema ↔ engine sync", () => {
  it("GalaxyArchetype enum matches the engine archetype registry", () => {
    expect(enumMembers("GalaxyArchetype").sort()).toEqual(ARCHETYPES.map((a) => a.id).sort());
  });

  it("GalaxyFaction enum matches the engine faction registry", () => {
    expect(enumMembers("GalaxyFaction").sort()).toEqual(FACTIONS.map((f) => f.id).sort());
  });

  it("GalaxyCreditReason enum matches the earn-only reasons (no cash-out member)", () => {
    const members = enumMembers("GalaxyCreditReason");
    expect(members.sort()).toEqual([...CREDIT_EARN_REASONS].sort());
    for (const m of members) {
      expect(m.toUpperCase()).not.toMatch(/CASH|REDEEM|WITHDRAW|SPEND|DEBIT|PAYOUT/);
    }
  });
});
