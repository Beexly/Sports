import { describe, it, expect } from "vitest";
import {
  TEAMS,
  canonicalTeam,
  teamMeta,
  sameTeam,
  normalizePlayerName,
} from "./entities";

describe("canonical NFL entity graph", () => {
  it("registers all 32 franchises with consistent conference/division", () => {
    expect(Object.keys(TEAMS)).toHaveLength(32);
    const divs = new Map<string, number>();
    for (const t of Object.values(TEAMS)) divs.set(t.division, (divs.get(t.division) ?? 0) + 1);
    // 8 divisions, 4 teams each
    expect(divs.size).toBe(8);
    for (const n of divs.values()) expect(n).toBe(4);
  });

  it("folds relocation + spelling variants onto one canonical code", () => {
    expect(canonicalTeam("OAK")).toBe("LV");
    expect(canonicalTeam("SD")).toBe("LAC");
    expect(canonicalTeam("STL")).toBe("LA");
    expect(canonicalTeam("LAR")).toBe("LA");
    expect(canonicalTeam("WAS")).toBe("WSH");
    expect(canonicalTeam("JAC")).toBe("JAX");
    expect(canonicalTeam("ARZ")).toBe("ARI");
    expect(canonicalTeam("BLT")).toBe("BAL");
    expect(canonicalTeam("CLV")).toBe("CLE");
    expect(canonicalTeam("HST")).toBe("HOU");
  });

  it("folds PFR 3-letter codes onto the nflverse code", () => {
    expect(canonicalTeam("GNB")).toBe("GB");
    expect(canonicalTeam("KAN")).toBe("KC");
    expect(canonicalTeam("NWE")).toBe("NE");
    expect(canonicalTeam("NOR")).toBe("NO");
    expect(canonicalTeam("SFO")).toBe("SF");
    expect(canonicalTeam("TAM")).toBe("TB");
    expect(canonicalTeam("LVR")).toBe("LV");
  });

  it("trims, uppercases, and passes through canonical/unknown codes gracefully", () => {
    expect(canonicalTeam("  wsh ")).toBe("WSH");
    expect(canonicalTeam("kc")).toBe("KC");
    expect(canonicalTeam("ZZZ")).toBe("ZZZ"); // unknown → passthrough, never throws
    expect(canonicalTeam(null)).toBe("");
    expect(canonicalTeam(undefined)).toBe("");
  });

  it("resolves metadata through any variant code", () => {
    expect(teamMeta("OAK")?.name).toBe("Las Vegas Raiders");
    expect(teamMeta("WAS")?.division).toBe("NFC East");
    expect(teamMeta("GNB")?.code).toBe("GB");
    expect(teamMeta("ZZZ")).toBeNull();
  });

  it("sameTeam collapses variants of one franchise (and rejects empty)", () => {
    expect(sameTeam("WAS", "WSH")).toBe(true);
    expect(sameTeam("OAK", "LV")).toBe(true);
    expect(sameTeam("SD", "LAC")).toBe(true);
    expect(sameTeam("LA", "LAC")).toBe(false); // Rams !== Chargers
    expect(sameTeam("", "")).toBe(false); // empty never matches
  });

  it("normalizes player names (accents, suffixes, punctuation) to a stable key", () => {
    expect(normalizePlayerName("A.J. Brown")).toBe("ajbrown");
    expect(normalizePlayerName("Marvin Harrison Jr.")).toBe("marvinharrison");
    expect(normalizePlayerName("Amon-Ra St. Brown")).toBe("amonrastbrown");
    expect(normalizePlayerName("Equanimeous St. Brown II")).toBe("equanimeousstbrown");
    // accent fold
    expect(normalizePlayerName("José")).toBe("jose");
    expect(normalizePlayerName(null)).toBe("");
  });
});
