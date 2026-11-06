import { describe, expect, it } from "vitest";
import { DEFAULT_FAMILY, familyForFeature, subjectForTable } from "../family-map.js";
import { stableHash } from "../types.js";

describe("familyForFeature", () => {
  it("is deterministic across repeated calls", () => {
    const name = "Team Pressure Rate - Week";
    const first = familyForFeature(name);
    for (let i = 0; i < 100; i += 1) expect(familyForFeature(name)).toBe(first);
  });

  it("applies precedence, not the last matching rule", () => {
    // MARKET_MICROSTRUCTURE would match on "value"; TRENCHES must win because it precedes.
    expect(familyForFeature("Line Value")).toBe("TRENCHES");
    // SITUATIONAL matches "snap"; EFFICIENCY would also match the rate suffix. Situational wins.
    expect(familyForFeature("Snap Rate")).toBe("SITUATIONAL");
  });

  it("tolerates camelCase compounds the way a rival spells them", () => {
    expect(familyForFeature("ProjectedOwnership")).toBe("MARKET_MICROSTRUCTURE");
    expect(familyForFeature("TeamDefPressureRate")).toBe("TRENCHES");
  });

  it("reads percent stats as efficiency, not market", () => {
    expect(familyForFeature("Team PK% % - Month")).toBe("EFFICIENCY");
    expect(familyForFeature("Win%")).toBe("EFFICIENCY");
  });

  it("falls back to MARKET for an unknown or empty name", () => {
    expect(familyForFeature("Zuul Index")).toBe(DEFAULT_FAMILY);
    expect(familyForFeature("   ")).toBe(DEFAULT_FAMILY);
    expect(DEFAULT_FAMILY).toBe("MARKET");
  });

  it("never returns a family outside the eight", () => {
    const eight = new Set([
      "MARKET",
      "EFFICIENCY",
      "TRENCHES",
      "LUCK",
      "SITUATIONAL",
      "NARRATIVE",
      "MICROCLIMATE",
      "MARKET_MICROSTRUCTURE",
    ]);
    for (const name of ["Line", "Own%", "Weather", "Rest", "Variance", "Coach", "Target Share", "x"]) {
      expect(eight.has(familyForFeature(name))).toBe(true);
    }
  });
});

describe("subjectForTable", () => {
  it("groups by table name", () => {
    expect(subjectForTable("PlayerStats")).toBe("player");
    expect(subjectForTable("team_defense")).toBe("team");
    expect(subjectForTable("GameInfo")).toBe("game");
    expect(subjectForTable("Slate")).toBe("game");
    expect(subjectForTable("misc")).toBe("other");
  });
});

describe("stableHash", () => {
  it("is stable, length-sensitive and collision-resistant enough for dedupe", () => {
    expect(stableHash("abc")).toBe(stableHash("abc"));
    expect(stableHash("abc")).not.toBe(stableHash("abd"));
    expect(stableHash("abc")).not.toBe(stableHash("abcd"));
    expect(stableHash("")).toMatch(/^fnv[0-9a-f]{16}0$/);
  });
});
