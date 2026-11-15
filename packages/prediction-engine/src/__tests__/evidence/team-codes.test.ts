import { describe, expect, it } from "vitest";
import {
  canonicalTeamCode,
  sameTeam,
  tryCanonicalTeamCode,
  UnknownTeamError,
  NFL_TEAM_CODES,
} from "../../evidence/team-codes.js";

describe("canonicalTeamCode", () => {
  it("resolves the Rams from every abbreviation a feed uses", () => {
    // The slate pipeline treated LA and LAR as different teams and handed the
    // Rams another club's coaching staff. All of these are the Rams.
    expect(canonicalTeamCode("LA")).toBe("LAR");
    expect(canonicalTeamCode("LAR")).toBe("LAR");
    expect(canonicalTeamCode("STL")).toBe("LAR");
    expect(canonicalTeamCode("Los Angeles Rams")).toBe("LAR");
    expect(canonicalTeamCode("Rams")).toBe("LAR");
  });

  it("does not confuse the two Los Angeles clubs", () => {
    expect(canonicalTeamCode("Los Angeles Chargers")).toBe("LAC");
    expect(canonicalTeamCode("LAC")).toBe("LAC");
    expect(canonicalTeamCode("SD")).toBe("LAC");
    expect(sameTeam("LA", "LAC")).toBe(false);
    expect(sameTeam("LA", "LAR")).toBe(true);
  });

  it("resolves Washington and Jacksonville aliases", () => {
    expect(canonicalTeamCode("WAS")).toBe("WSH");
    expect(canonicalTeamCode("Washington Commanders")).toBe("WSH");
    expect(canonicalTeamCode("JAC")).toBe("JAX");
    expect(canonicalTeamCode("Jacksonville Jaguars")).toBe("JAX");
  });

  it("is idempotent over every canonical code", () => {
    for (const code of NFL_TEAM_CODES) {
      expect(canonicalTeamCode(code)).toBe(code);
    }
  });

  it("throws rather than guessing on an unknown team", () => {
    expect(() => canonicalTeamCode("Springfield Atoms")).toThrow(UnknownTeamError);
    expect(() => canonicalTeamCode("")).toThrow(UnknownTeamError);
    expect(tryCanonicalTeamCode("Springfield Atoms")).toBeNull();
  });
});
