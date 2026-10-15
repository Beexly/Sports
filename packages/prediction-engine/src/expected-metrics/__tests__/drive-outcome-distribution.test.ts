import { describe, expect, it } from "vitest";
import {
  computeDriveOutcomeDistributions,
  DRIVE_OUTCOME_BUCKETS,
  mapResultToBucket,
  MIN_DRIVES_TO_REPORT,
} from "../drive-outcome-distribution.js";
import type { Drive, DriveResult } from "../drives.js";

function mockDrive(
  gameId: string,
  posteam: string,
  result: DriveResult,
  points: number
): Drive {
  return {
    gameId,
    posteam,
    result,
    points,
    driveId: 1,
    startYardline100: 80,
    endYardline100: 0,
    playCount: 10,
    epaTotal: 0,
    successRate: 0.5,
    playIds: [],
    provenance: {
      modelVersion: "mock",
      method: "mock",
      featureKeys: [],
      featureSchemaHash: "mock",
      sampleSize: 1,
    },
  };
}

describe("drive-outcome-distribution", () => {
  it("mapping completeness: every member of the DriveResult union maps to exactly one bucket", () => {
    // This asserts that we have correctly covered all current members of the DriveResult union.
    // At runtime, if a type changes, typescript will ideally flag it but we strictly check the keys.
    const allExpectedResults: DriveResult[] = [
      "TD",
      "FG",
      "PUNT",
      "TURNOVER",
      "TURNOVER_ON_DOWNS",
      "SAFETY",
      "END_OF_HALF",
      "END_OF_GAME",
      "MISSED_FG",
      "OTHER",
    ];

    for (const result of allExpectedResults) {
      const bucket = mapResultToBucket(result);
      expect(DRIVE_OUTCOME_BUCKETS.includes(bucket)).toBe(true);
    }
  });

  it("partition: bucket counts sum to total drives; shares sum to 1 when above floor", () => {
    const drives: Drive[] = [];
    // We add 12 drives (above MIN_DRIVES_TO_REPORT = 10)
    for (let i = 0; i < 4; i++) drives.push(mockDrive("2026_01_AWAY_HOME", "AAA", "TD", 7));
    for (let i = 0; i < 3; i++) drives.push(mockDrive("2026_01_AWAY_HOME", "AAA", "FG", 3));
    for (let i = 0; i < 3; i++) drives.push(mockDrive("2026_01_AWAY_HOME", "AAA", "PUNT", 0));
    for (let i = 0; i < 2; i++) drives.push(mockDrive("2026_01_AWAY_HOME", "AAA", "TURNOVER", 0));

    const result = computeDriveOutcomeDistributions(drives, 2026, 2);
    expect(result.excludedUnparseable).toBe(0);
    const dist = result.distributions[0]!.seasonWindow;

    // Counts sum
    const totalCounts = Object.values(dist.counts).reduce((a, b) => a + b, 0);
    expect(totalCounts).toBe(12);
    expect(dist.drives).toBe(12);

    // Shares sum (we are > 10 floor)
    expect(dist.shares).not.toBeNull();
    const totalShares = Object.values(dist.shares!).reduce((a, b) => a + b, 0);
    // Tolerate rounding
    expect(totalShares).toBeCloseTo(1.0, 3);
  });

  it("reconciliation: pointsPerDrive matches total bucket points sum / drives", () => {
    const drives: Drive[] = [
      mockDrive("2026_01_AWAY_HOME", "AAA", "TD", 7),
      mockDrive("2026_01_AWAY_HOME", "AAA", "FG", 3),
      mockDrive("2026_01_AWAY_HOME", "AAA", "TD", 6), // Missed PAT
      ...Array.from({ length: 7 }, () => mockDrive("2026_01_AWAY_HOME", "AAA", "PUNT", 0)),
    ];
    // Total drives = 10 (floor met). Total points = 7 + 3 + 6 = 16.
    const result = computeDriveOutcomeDistributions(drives, 2026, 2);
    const dist = result.distributions[0]!.seasonWindow;

    expect(dist.drives).toBe(10);
    const sumPointsByBucket = Object.values(dist.pointsByBucket).reduce((a, b) => a + b, 0);
    expect(sumPointsByBucket).toBe(16);

    expect(dist.pointsPerDrive).toBeCloseTo(16 / 10, 4);

    expect(dist.pointsByBucket.TD).toBe(13); // 7 + 6
    expect(dist.pointsByBucket.FG).toBe(3);
  });

  it("a TD drive with trailing PAT (drive points 7) lands in the TD bucket with 7 points", () => {
    // Already covered in above test, but specifically asserting here:
    const drives: Drive[] = [
      mockDrive("2026_01_AWAY_HOME", "AAA", "TD", 7),
      mockDrive("2026_01_AWAY_HOME", "AAA", "TD", 8), // 2pt conversion
    ];
    // Below floor
    const result = computeDriveOutcomeDistributions(drives, 2026, 2);
    const dist = result.distributions[0]!.seasonWindow;

    expect(dist.counts.TD).toBe(2);
    expect(dist.pointsByBucket.TD).toBe(15);
  });

  it("point-in-time: drives from the target week itself (and later) change nothing", () => {
    const drives: Drive[] = [
      mockDrive("2026_01_AWAY_HOME", "AAA", "TD", 7),
      mockDrive("2026_02_AWAY_HOME", "AAA", "FG", 3), // Should be excluded if targetWeek = 2
      mockDrive("2026_03_AWAY_HOME", "AAA", "PUNT", 0), // Excluded
      mockDrive("2025_10_AWAY_HOME", "AAA", "TD", 7), // Excluded (wrong season)
    ];

    const result = computeDriveOutcomeDistributions(drives, 2026, 2);
    const dist = result.distributions[0]!.seasonWindow;

    expect(dist.counts.TD).toBe(1);
    expect(dist.counts.FG).toBe(0);
    expect(dist.drives).toBe(1);
  });

  it("windows: with 5+ distinct PIT games, roll4 uses only the last 4 distinct game IDs", () => {
    const drives: Drive[] = [
      mockDrive("2026_01_AWAY_HOME", "AAA", "PUNT", 0), // Game 1
      mockDrive("2026_02_AWAY_HOME", "AAA", "FG", 3),   // Game 2
      mockDrive("2026_03_AWAY_HOME", "AAA", "TD", 7),   // Game 3
      mockDrive("2026_04_AWAY_HOME", "AAA", "PUNT", 0), // Game 4
      mockDrive("2026_05_AWAY_HOME", "AAA", "TD", 7),   // Game 5
    ];

    const result = computeDriveOutcomeDistributions(drives, 2026, 10);
    const teamDist = result.distributions[0]!;

    expect(teamDist.seasonWindow.drives).toBe(5);
    expect(teamDist.roll4.drives).toBe(4);
    
    // roll4 should exclude Game 1 (PUNT 0)
    expect(teamDist.roll4.counts.PUNT).toBe(1); // Only Game 4 PUNT
    expect(teamDist.roll4.counts.TD).toBe(2); // Game 3, Game 5
    expect(teamDist.roll4.counts.FG).toBe(1); // Game 2
  });

  it("floor: below 10 drives, shares and pointsPerDrive are null while counts remain correct", () => {
    const drives: Drive[] = Array.from({ length: 9 }, () => mockDrive("2026_01_AWAY_HOME", "AAA", "TD", 7));
    const result = computeDriveOutcomeDistributions(drives, 2026, 2);
    const dist = result.distributions[0]!.seasonWindow;

    expect(dist.drives).toBe(9);
    expect(dist.counts.TD).toBe(9);
    expect(dist.pointsByBucket.TD).toBe(63);

    expect(dist.shares).toBeNull();
    expect(dist.pointsPerDrive).toBeNull();
    expect(dist.scoringDriveShare).toBeNull();
    expect(dist.turnoverShare).toBeNull();
  });

  it("unparseable gameId drive is excluded and reflected in tally; empty input is safe", () => {
    const drives: Drive[] = [
      mockDrive("2026_01_AWAY_HOME", "AAA", "TD", 7),
      mockDrive("UNPARSEABLE_ID", "AAA", "FG", 3),
      mockDrive("2026-02-AWAY-HOME", "AAA", "PUNT", 0), // Not underscore split nicely
    ];

    const result = computeDriveOutcomeDistributions(drives, 2026, 2);
    expect(result.excludedUnparseable).toBe(2);
    expect(result.distributions.length).toBe(1);
    expect(result.distributions[0]!.seasonWindow.drives).toBe(1);

    const emptyResult = computeDriveOutcomeDistributions([], 2026, 2);
    expect(emptyResult.distributions.length).toBe(0);
    expect(emptyResult.excludedUnparseable).toBe(0);
  });
});
