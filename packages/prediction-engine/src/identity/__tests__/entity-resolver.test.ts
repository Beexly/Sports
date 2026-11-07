import { describe, expect, it } from "vitest";
import {
  EntityResolutionContaminationError,
  loadCanonicalEntities,
  resolveEntity,
  validateDatasetRowEntities,
  validateRosterPairing,
} from "../entity-resolver";

describe("Wave 4 Canonical Entity Resolver (TypeScript)", () => {
  it("loads all 32 teams, 32 venues, 96 coaches, 17 officials, and 5300+ players", () => {
    const records = loadCanonicalEntities();
    expect(records.length).toBeGreaterThanOrEqual(5400);
    const teams = records.filter((r) => r.entity_type === "team");
    const venues = records.filter((r) => r.entity_type === "venue");
    const coaches = records.filter((r) => r.entity_type === "coach");
    const officials = records.filter((r) => r.entity_type === "official");
    expect(teams.length).toBe(32);
    expect(venues.length).toBe(32);
    expect(coaches.length).toBe(96);
    expect(officials.length).toBe(17);
  });

  it("enforces Garrett's standing 2026 roster rulings (Geno Smith = NYJ, Mike Evans = SF, Chris Godwin = PULLED_NOV_1_EXCLUDED)", () => {
    const geno = validateRosterPairing("Geno Smith", "NYJ", "2026-11-06");
    expect(geno["2026_active_team"]).toBe("NYJ");
    expect(geno.position).toBe("QB");
    expect(() => validateRosterPairing("Geno Smith", "SEA", "2026-11-06")).toThrow(
      EntityResolutionContaminationError,
    );
    expect(validateRosterPairing("Geno Smith", "SEA", "2024-11-01").full_name).toBe("Geno Smith");

    const evans = validateRosterPairing("Mike Evans", "SF", "2026-11-06");
    expect(evans["2026_active_team"]).toBe("SF");
    expect(evans.position).toBe("WR");
    expect(() => validateRosterPairing("Mike Evans", "TB", "2026-11-06")).toThrow(
      EntityResolutionContaminationError,
    );
    expect(validateRosterPairing("Mike Evans", "TB", "2025-11-01").full_name).toBe("Mike Evans");

    expect(() => resolveEntity("Chris Godwin", "TB", "2026-11-06")).toThrow(
      EntityResolutionContaminationError,
    );
    const godwinAllowed = resolveEntity("Chris Godwin", {
      expectedTeam: "TB",
      asOfDate: "2026-11-06",
      allowPulledOrInactive: true,
    });
    expect(godwinAllowed.pulled_play_guard_status).toBe("PULLED_NOV_1_EXCLUDED");
    expect(godwinAllowed.injury_status_2026_w09).toBe("OUT");
  });

  it("validates dataset rows and rejects unresolved entities", () => {
    const rowRes = validateDatasetRowEntities({
      player_display_name: "Geno Smith",
      team: "NYJ",
      opponent_team: "BUF",
      as_of_date: "2026-11-06",
    });
    expect(rowRes.valid).toBe(true);
    expect(rowRes.resolvedEntities.team).toBe("TEAM_NYJ");

    expect(() => resolveEntity("Phantom Unresolved Player 2099")).toThrow(
      EntityResolutionContaminationError,
    );
  });
});
