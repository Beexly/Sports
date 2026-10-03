import { describe, it, expect } from "vitest";
import {
  createTeamIndexRegistry,
  assignTeamIndex,
  lookupTeamIndex,
  normalizeTeamKey,
  teamCount,
  isValidTeamIndexRegistry,
  DEFAULT_TEAM_CAPACITY,
  type TeamIndexRegistry,
} from "../team-index-registry.js";

function assignAll(scope: string, teams: readonly string[], capacity = DEFAULT_TEAM_CAPACITY) {
  let registry = createTeamIndexRegistry(scope, capacity);
  const indices: number[] = [];
  for (const t of teams) {
    const r = assignTeamIndex(registry, t);
    if (r.ok) {
      registry = r.registry;
      indices.push(r.index);
    }
  }
  return { registry, indices };
}

describe("team-index-registry", () => {
  it("assigns contiguous indices from 0 and is stable on re-lookup", () => {
    const { registry, indices } = assignAll("nba", ["Celtics", "Lakers", "Heat"]);
    expect(indices).toEqual([0, 1, 2]);
    expect(lookupTeamIndex(registry, "Lakers")).toBe(1);
    // Re-assigning an existing team returns the SAME index and does not grow.
    const again = assignTeamIndex(registry, "Lakers");
    expect(again.ok && again.index).toBe(1);
    expect(again.ok && again.created).toBe(false);
    expect(teamCount(registry)).toBe(3);
  });

  it("NEVER reassigns an index — the identity-merge bug this exists to prevent", () => {
    let { registry } = assignAll("nba", ["A", "B", "C"]);
    const before = { ...registry.indexByTeam };
    // Adding more teams must not disturb any existing assignment.
    for (const t of ["D", "E", "F"]) {
      const r = assignTeamIndex(registry, t);
      if (r.ok) registry = r.registry;
    }
    for (const [team, idx] of Object.entries(before)) {
      expect(registry.indexByTeam[team]).toBe(idx);
    }
    // And no two teams ever share a slot.
    const all = Object.values(registry.indexByTeam);
    expect(new Set(all).size).toBe(all.length);
  });

  it("normalizes case and whitespace so one team cannot occupy two slots", () => {
    expect(normalizeTeamKey("  Boston   Celtics ")).toBe("boston celtics");
    const { registry, indices } = assignAll("nba", ["Boston Celtics", "boston celtics ", "BOSTON  CELTICS"]);
    expect(indices).toEqual([0, 0, 0]);
    expect(teamCount(registry)).toBe(1);
  });

  it("does NOT merge genuinely different names (no guessing at aliases)", () => {
    const { registry } = assignAll("nba", ["LA Lakers", "Los Angeles Lakers"]);
    expect(teamCount(registry)).toBe(2);
  });

  it("REFUSES when full rather than wrapping onto an occupied slot", () => {
    const { registry } = assignAll("tiny", ["A", "B"], 2);
    const overflow = assignTeamIndex(registry, "C");
    expect(overflow.ok).toBe(false);
    expect(!overflow.ok && overflow.reason).toBe("full");
    // Existing assignments untouched.
    expect(lookupTeamIndex(registry, "A")).toBe(0);
    expect(lookupTeamIndex(registry, "B")).toBe(1);
  });

  it("rejects an empty/whitespace team key", () => {
    const registry = createTeamIndexRegistry("nba");
    const r = assignTeamIndex(registry, "   ");
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toBe("invalid-key");
  });

  it("lookupTeamIndex returns null for an unknown team (never a fabricated 0)", () => {
    const { registry } = assignAll("nba", ["A"]);
    expect(lookupTeamIndex(registry, "Nobody")).toBeNull();
  });

  it("survives a JSON round trip unchanged", () => {
    const { registry } = assignAll("nba", ["A", "B", "C"]);
    const revived = JSON.parse(JSON.stringify(registry)) as TeamIndexRegistry;
    expect(isValidTeamIndexRegistry(revived)).toBe(true);
    expect(revived.indexByTeam).toEqual(registry.indexByTeam);
  });

  describe("isValidTeamIndexRegistry rejects the corrupt shapes that cause silent merges", () => {
    const base = assignAll("nba", ["A", "B", "C"]).registry;

    it("accepts a well-formed registry", () => {
      expect(isValidTeamIndexRegistry(base)).toBe(true);
      expect(isValidTeamIndexRegistry(createTeamIndexRegistry("empty"))).toBe(true);
    });

    it("rejects duplicate indices (two teams in one slot)", () => {
      expect(isValidTeamIndexRegistry({ ...base, indexByTeam: { a: 0, b: 0 } })).toBe(false);
    });

    it("rejects a hole (would make the next assignment collide)", () => {
      expect(isValidTeamIndexRegistry({ ...base, indexByTeam: { a: 0, b: 2 } })).toBe(false);
    });

    it("rejects an out-of-range or non-integer index", () => {
      expect(isValidTeamIndexRegistry({ ...base, capacity: 2, indexByTeam: { a: 0, b: 5 } })).toBe(false);
      expect(isValidTeamIndexRegistry({ ...base, indexByTeam: { a: 1.5 } })).toBe(false);
      expect(isValidTeamIndexRegistry({ ...base, indexByTeam: { a: -1 } })).toBe(false);
    });

    it("rejects malformed containers", () => {
      expect(isValidTeamIndexRegistry(null)).toBe(false);
      expect(isValidTeamIndexRegistry({ scope: 1, capacity: 4, indexByTeam: {} })).toBe(false);
      expect(isValidTeamIndexRegistry({ scope: "x", capacity: 1, indexByTeam: {} })).toBe(false);
      expect(isValidTeamIndexRegistry({ scope: "x", capacity: 4 })).toBe(false);
    });
  });
});
