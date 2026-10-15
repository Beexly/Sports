import { describe, expect, it } from "vitest";
import { type Drive, type DriveResult } from "../drives.js";
import {
  computeDriveOutcomeDistributions,
  DRIVE_OUTCOME_BUCKETS,
  mapDriveResultToBucket,
  MIN_DRIVES_TO_REPORT,
} from "../drive-outcome-distribution.js";

function mockDrive(
  gameId: string,
  posteam: string,
  result: DriveResult,
  points: number,
  overrideFields?: Partial<Drive>
): Drive {
  return {
    gameId,
    driveId: 1,
    posteam,
    result,
    startYardline100: 80,
    endYardline100: 20,
    playCount: 5,
    points,
    epaTotal: 0,
    successRate: 0.5,
    playIds: [],
    provenance: {
      modelVersion: "test",
      method: "test",
      featureKeys: [],
      featureSchemaHash: "hash",
      sampleSize: 1,
    },
    ...overrideFields,
  };
}

describe("Drive Outcome Distribution", () => {
  it("Mapping completeness: every member of DriveResult maps to exactly one bucket", () => {
    // Array of all DriveResult possible values
    const allResults: DriveResult[] = [
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

    for (const res of allResults) {
      const bucket = mapDriveResultToBucket(res);
      expect(DRIVE_OUTCOME_BUCKETS).toContain(bucket);
    }
  });

  it("Partition: bucket counts sum to total drives, shares sum to 1", () => {
    const drives: Drive[] = [];
    // Give team AAA 10 drives (meets MIN_DRIVES_TO_REPORT floor)
    // gameId format: YYYY_WW_AWAY_HOME
    for (let i = 0; i < 5; i++) {
      drives.push(mockDrive("2026_01_AWAY_AAA", "AAA", "TD", 7));
    }
    for (let i = 0; i < 3; i++) {
      drives.push(mockDrive("2026_01_AWAY_AAA", "AAA", "FG", 3));
    }
    for (let i = 0; i < 2; i++) {
      drives.push(mockDrive("2026_01_AWAY_AAA", "AAA", "PUNT", 0));
    }

    const { metrics, excludedUnparseable } = computeDriveOutcomeDistributions(drives, 2026, 2);
    expect(excludedUnparseable).toBe(0);
    expect(metrics.length).toBe(1);

    const teamMetric = metrics[0]!;
    expect(teamMetric.seasonWindow.drives).toBe(10);

    // Sum of bucket counts
    const totalCounts = Object.values(teamMetric.seasonWindow.counts).reduce((a, b) => a + b, 0);
    expect(totalCounts).toBe(10);

    // Sum of shares should be very close to 1
    const totalShares = Object.values(teamMetric.seasonWindow.shares).reduce((a, b) => (a || 0) + (b || 0), 0);
    expect(totalShares).toBeCloseTo(1, 4);
  });

  it("Reconciliation: pointsPerDrive * drives equals sum of pointsByBucket equals sum of drive points", () => {
    const drives: Drive[] = [
      mockDrive("2026_01_AWAY_AAA", "AAA", "TD", 7),
      mockDrive("2026_01_AWAY_AAA", "AAA", "FG", 3),
      mockDrive("2026_01_AWAY_AAA", "AAA", "TD", 6),
      mockDrive("2026_01_AWAY_AAA", "AAA", "PUNT", 0),
      mockDrive("2026_01_AWAY_AAA", "AAA", "TURNOVER", 0),
      mockDrive("2026_01_AWAY_AAA", "AAA", "SAFETY", 0),
      mockDrive("2026_01_AWAY_AAA", "AAA", "OTHER", 0),
      mockDrive("2026_01_AWAY_AAA", "AAA", "TD", 8), // 2pt conversion
      mockDrive("2026_01_AWAY_AAA", "AAA", "MISSED_FG", 0),
      mockDrive("2026_01_AWAY_AAA", "AAA", "END_OF_HALF", 0),
    ];

    const { metrics } = computeDriveOutcomeDistributions(drives, 2026, 2);
    const m = metrics[0]!.seasonWindow;

    const drivePointsSum = drives.reduce((sum, d) => sum + d.points, 0); // 7 + 3 + 6 + 8 = 24
    expect(drivePointsSum).toBe(24);

    const sumPointsByBucket = Object.values(m.pointsByBucket).reduce((a, b) => a + b, 0);
    expect(sumPointsByBucket).toBe(drivePointsSum);

    // pointsPerDrive * drives should equal drivePointsSum (within rounding)
    // drives = 10, pointsPerDrive = 24 / 10 = 2.4
    expect(m.pointsPerDrive).not.toBeNull();
    expect(m.pointsPerDrive! * m.drives).toBeCloseTo(drivePointsSum, 4);
  });

  it("A TD drive with a trailing PAT play (drive points 7) lands in the TD bucket with 7 points", () => {
    const drives: Drive[] = [];
    for (let i = 0; i < 10; i++) {
      drives.push(mockDrive("2026_01_AWAY_AAA", "AAA", "TD", 7));
    }

    const { metrics } = computeDriveOutcomeDistributions(drives, 2026, 2);
    const m = metrics[0]!.seasonWindow;

    expect(m.counts.TD).toBe(10);
    expect(m.pointsByBucket.TD).toBe(70);
  });

  it("Point-in-time: drives from the target week itself (and later) change nothing", () => {
    const drives: Drive[] = [
      mockDrive("2026_01_AWAY_AAA", "AAA", "TD", 7),
      mockDrive("2026_02_AWAY_AAA", "AAA", "TD", 7), // target week
      mockDrive("2026_03_AWAY_AAA", "AAA", "TD", 7), // after target week
    ];

    const { metrics } = computeDriveOutcomeDistributions(drives, 2026, 2);
    const m = metrics[0]!.seasonWindow;

    // Only week 1 should be counted
    expect(m.drives).toBe(1);
    expect(m.counts.TD).toBe(1);
  });

  it("Windows: with 5+ distinct PIT games, roll4 uses only the last 4 distinct game IDs", () => {
    const drives: Drive[] = [
      // Game 1 (Week 1)
      mockDrive("2026_01_AWAY_AAA", "AAA", "TD", 7),
      mockDrive("2026_01_AWAY_AAA", "AAA", "TD", 7),
      // Game 2 (Week 2)
      mockDrive("2026_02_AWAY_AAA", "AAA", "TD", 7),
      // Game 3 (Week 3)
      mockDrive("2026_03_AWAY_AAA", "AAA", "FG", 3),
      // Game 4 (Week 4)
      mockDrive("2026_04_AWAY_AAA", "AAA", "PUNT", 0),
      // Game 5 (Week 5)
      mockDrive("2026_05_AWAY_AAA", "AAA", "TURNOVER", 0),
    ];

    const { metrics } = computeDriveOutcomeDistributions(drives, 2026, 6);
    const roll4 = metrics[0]!.roll4;

    // Game 1 (Week 1) has 2 drives. It should be excluded from roll4 since games 2,3,4,5 are the last 4.
    // So roll4 drives: Game 2 (1) + Game 3 (1) + Game 4 (1) + Game 5 (1) = 4 drives
    expect(roll4.drives).toBe(4);
    // Since Game 1 is excluded, TD count should be 1 (from Game 2)
    expect(roll4.counts.TD).toBe(1);
    expect(roll4.counts.FG).toBe(1);
    expect(roll4.counts.PUNT).toBe(1);
    expect(roll4.counts.TURNOVER).toBe(1);
  });

  it("Floor: below 10 drives, shares and pointsPerDrive are null while counts remain correct", () => {
    const drives: Drive[] = [
      mockDrive("2026_01_AWAY_AAA", "AAA", "TD", 7),
      mockDrive("2026_01_AWAY_AAA", "AAA", "FG", 3),
    ];

    const { metrics } = computeDriveOutcomeDistributions(drives, 2026, 2);
    const m = metrics[0]!.seasonWindow;

    expect(m.drives).toBe(2);
    expect(m.counts.TD).toBe(1);
    expect(m.counts.FG).toBe(1);
    expect(m.pointsByBucket.TD).toBe(7);
    expect(m.pointsByBucket.FG).toBe(3);

    // Below floor (10), these should be null
    expect(m.shares.TD).toBeNull();
    expect(m.pointsPerDrive).toBeNull();
    expect(m.scoringDriveShare).toBeNull();
    expect(m.turnoverShare).toBeNull();
  });

  it("An unparseable gameId drive is excluded and reflected in the excluded tally", () => {
    const drives: Drive[] = [
      mockDrive("2026_01_AWAY_AAA", "AAA", "TD", 7),
      mockDrive("UNPARSEABLE", "AAA", "TD", 7),
    ];

    const { metrics, excludedUnparseable } = computeDriveOutcomeDistributions(drives, 2026, 2);
    expect(excludedUnparseable).toBe(1);

    const m = metrics[0]!.seasonWindow;
    expect(m.drives).toBe(1); // Only the parsed one counts
  });

  it("Empty input returns an empty result (no throw, no NaN)", () => {
    const { metrics, excludedUnparseable } = computeDriveOutcomeDistributions([], 2026, 1);
    expect(metrics).toEqual([]);
    expect(excludedUnparseable).toBe(0);
  });
});
