import { describe, it, expect } from "vitest";
import { computeDriveFailureRates } from "../drive-failure-rate.js";
import type { Drive } from "../drives.js";
import type { ExpectedMetricProvenance } from "../types.js";

const stubProvenance: ExpectedMetricProvenance = {
  modelVersion: "gse-drives-v1",
  method: "drive-segmentation",
  featureKeys: ["driveId", "posteam", "playIndex"],
  featureSchemaHash: "test",
  sampleSize: 1,
};

function makeDrive(gameId: string, posteam: string, result: Drive["result"]): Drive {
  return {
    gameId,
    driveId: 1,
    posteam,
    result,
    startYardline100: 80,
    endYardline100: 20,
    playCount: 5,
    points: 0,
    epaTotal: 0,
    successRate: 0,
    playIds: [],
    provenance: stubProvenance,
  };
}

describe("computeDriveFailureRates", () => {
  it("computes exact fraction math", () => {
    // 10 punts + 4 turnovers + 1 missed fg out of 30 drives -> 15/30 = 0.5
    const drives: Drive[] = [];
    for (let i = 0; i < 10; i++) drives.push(makeDrive("2026_01_ATL_PHI", "PHI", "PUNT"));
    for (let i = 0; i < 4; i++) drives.push(makeDrive("2026_01_ATL_PHI", "PHI", "TURNOVER"));
    for (let i = 0; i < 1; i++) drives.push(makeDrive("2026_01_ATL_PHI", "PHI", "MISSED_FG"));
    for (let i = 0; i < 15; i++) drives.push(makeDrive("2026_01_ATL_PHI", "PHI", "TD"));

    const result = computeDriveFailureRates(drives, "PHI", "2026_02_PHI_DAL");
    expect(result.offense.season).toBe(0.5);
    expect(result.offense.last8).toBe(0.5);
    expect(result.offense.last16).toBe(0.5);
  });

  it("excludes END_OF_HALF, END_OF_GAME, OTHER from denominator", () => {
    const drives = [
      makeDrive("2026_01_ATL_PHI", "PHI", "PUNT"),
      makeDrive("2026_01_ATL_PHI", "PHI", "TD"),
      makeDrive("2026_01_ATL_PHI", "PHI", "END_OF_HALF"),
      makeDrive("2026_01_ATL_PHI", "PHI", "END_OF_GAME"),
      makeDrive("2026_01_ATL_PHI", "PHI", "OTHER"),
    ];
    const result = computeDriveFailureRates(drives, "PHI", "2026_02_PHI_DAL");
    // Only 2 rated drives (1 PUNT, 1 TD). 1 failure out of 2.
    expect(result.offense.season).toBe(0.5);
  });

  it("counts SAFETY as offensive failure", () => {
    const drives = [
      makeDrive("2026_01_ATL_PHI", "PHI", "SAFETY"),
      makeDrive("2026_01_ATL_PHI", "PHI", "TD"),
    ];
    const result = computeDriveFailureRates(drives, "PHI", "2026_02_PHI_DAL");
    expect(result.offense.season).toBe(0.5);
  });

  it("returns 0 (not NaN) for zero rated drives", () => {
    const drives = [
      makeDrive("2026_01_ATL_PHI", "PHI", "END_OF_HALF"),
    ];
    const result = computeDriveFailureRates(drives, "PHI", "2026_02_PHI_DAL");
    expect(result.offense.season).toBe(0);
  });

  it("returns null when there are zero games in the window", () => {
    const drives: Drive[] = [];
    const result = computeDriveFailureRates(drives, "PHI", "2026_02_PHI_DAL");
    expect(result.offense.season).toBe(null);
  });

  it("computes offense and defense independently", () => {
    const drives = [
      makeDrive("2026_01_ATL_PHI", "PHI", "PUNT"), // Offense fail
      makeDrive("2026_01_ATL_PHI", "PHI", "TD"),   // Offense success
      makeDrive("2026_01_ATL_PHI", "ATL", "PUNT"), // Defense fail (defense killed it)
      makeDrive("2026_01_ATL_PHI", "ATL", "PUNT"), // Defense fail
      makeDrive("2026_01_ATL_PHI", "ATL", "PUNT"), // Defense fail
      makeDrive("2026_01_ATL_PHI", "ATL", "TD"),   // Defense success
    ];
    const result = computeDriveFailureRates(drives, "PHI", "2026_02_PHI_DAL");
    expect(result.offense.season).toBe(0.5); // 1/2
    expect(result.defense.season).toBe(0.75); // 3/4
  });

  it("enforces point-in-time discipline", () => {
    const drives = [
      makeDrive("2026_01_ATL_PHI", "PHI", "PUNT"), // Week 1 (past)
      makeDrive("2026_02_PHI_DAL", "PHI", "PUNT"), // Week 2 (current)
      makeDrive("2026_03_PHI_NYG", "PHI", "PUNT"), // Week 3 (future)
    ];
    const result = computeDriveFailureRates(drives, "PHI", "2026_02_PHI_DAL");
    // Only week 1 should be included
    expect(result.offense.season).toBe(1.0);
  });
});
