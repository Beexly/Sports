/**
 * Unit tests for drive aggregation — partition completeness is the headline.
 */

import { describe, expect, it } from "vitest";
import { buildDrives, type DrivePlay } from "../drives.js";

function play(partial: Partial<DrivePlay> & { playId: string; playIndex: number }): DrivePlay {
  return {
    gameId: "G1",
    driveId: null,
    posteam: "AAA",
    yardline100: 75,
    pointsScored: 0,
    isSuccess: null,
    epa: null,
    ...partial,
  };
}

/** Assert the partition invariant: every input play lands in exactly one drive. */
function assertPartition(plays: readonly DrivePlay[]): void {
  const drives = buildDrives(plays);
  const totalPlayCount = drives.reduce((s, d) => s + d.playCount, 0);
  expect(totalPlayCount).toBe(plays.length);
  const emitted = drives.flatMap((d) => [...d.playIds]).sort();
  const input = plays.map((p) => p.playId).sort();
  expect(emitted).toEqual(input);
}

describe("buildDrives — partition completeness", () => {
  it("partitions completely in explicit-driveId mode across multiple games", () => {
    const plays: DrivePlay[] = [
      play({ playId: "a", playIndex: 1, gameId: "G1", driveId: 1 }),
      play({ playId: "b", playIndex: 2, gameId: "G1", driveId: 1 }),
      play({ playId: "c", playIndex: 3, gameId: "G1", driveId: 2, posteam: "BBB" }),
      play({ playId: "d", playIndex: 1, gameId: "G2", driveId: 1, posteam: "CCC" }),
    ];
    assertPartition(plays);
  });

  it("partitions completely in detect mode (null driveId)", () => {
    const plays: DrivePlay[] = [
      play({ playId: "a", playIndex: 1, posteam: "AAA" }),
      play({ playId: "b", playIndex: 2, posteam: "AAA" }),
      play({ playId: "c", playIndex: 3, posteam: "BBB" }),
      play({ playId: "d", playIndex: 4, posteam: "AAA" }),
    ];
    assertPartition(plays);
    const drives = buildDrives(plays);
    expect(drives).toHaveLength(3); // AAA, BBB, AAA
  });
});

describe("explicit-id mode", () => {
  it("groups plays sharing (gameId, driveId) regardless of interleaved playIndex", () => {
    const plays: DrivePlay[] = [
      play({ playId: "a", playIndex: 3, driveId: 1 }),
      play({ playId: "b", playIndex: 1, driveId: 1 }),
      play({ playId: "c", playIndex: 2, driveId: 1 }),
    ];
    const drives = buildDrives(plays);
    expect(drives).toHaveLength(1);
    expect(drives[0]?.playCount).toBe(3);
    // Ordered by playIndex inside the drive.
    expect(drives[0]?.playIds).toEqual(["b", "c", "a"]);
  });
});

describe("detect mode", () => {
  it("starts a new drive on posteam change and on gameId change", () => {
    const plays: DrivePlay[] = [
      play({ playId: "a", playIndex: 1, gameId: "G1", posteam: "AAA" }),
      play({ playId: "b", playIndex: 2, gameId: "G1", posteam: "BBB" }),
      play({ playId: "c", playIndex: 1, gameId: "G2", posteam: "BBB" }),
    ];
    const drives = buildDrives(plays);
    expect(drives).toHaveLength(3);
  });

  it("attaches an empty-posteam play to the open drive", () => {
    const plays: DrivePlay[] = [
      play({ playId: "a", playIndex: 1, posteam: "AAA" }),
      play({ playId: "b", playIndex: 2, posteam: "" }), // non-scrimmage continuation
      play({ playId: "c", playIndex: 3, posteam: "AAA" }),
    ];
    const drives = buildDrives(plays);
    expect(drives).toHaveLength(1);
    expect(drives[0]?.playCount).toBe(3);
  });

  it("starts a drive for an empty-posteam FIRST play (never orphaned)", () => {
    const plays: DrivePlay[] = [
      play({ playId: "a", playIndex: 1, posteam: "" }),
      play({ playId: "b", playIndex: 2, posteam: "AAA" }),
    ];
    assertPartition(plays);
    const drives = buildDrives(plays);
    // First play opens a drive; the AAA play differs from "" so it opens a second.
    expect(drives.reduce((s, d) => s + d.playCount, 0)).toBe(2);
  });
});

describe("result classification", () => {
  it("prefers an explicit terminalOutcome", () => {
    const drives = buildDrives([
      play({ playId: "a", playIndex: 1, driveId: 1, pointsScored: 0, terminalOutcome: "PUNT" }),
    ]);
    expect(drives[0]?.result).toBe("PUNT");
  });

  it("classifies by points fallback: >=6 → TD, 3 → FG", () => {
    const td = buildDrives([play({ playId: "a", playIndex: 1, driveId: 1, pointsScored: 6 })]);
    const fg = buildDrives([play({ playId: "b", playIndex: 1, driveId: 1, pointsScored: 3 })]);
    expect(td[0]?.result).toBe("TD");
    expect(fg[0]?.result).toBe("FG");
  });

  it("does NOT auto-classify a 2-point drive as SAFETY without terminalOutcome", () => {
    const drives = buildDrives([play({ playId: "a", playIndex: 1, driveId: 1, pointsScored: 2 })]);
    expect(drives[0]?.result).toBe("OTHER");
    expect(drives[0]?.result).not.toBe("SAFETY");
  });

  it("classifies from the DRIVE TOTAL, not the last play — TD then PAT (points 1) → TD", () => {
    // Trailing play is the PAT (a separate play in the same fixed_drive, pointsScored 1).
    // Classifying off last.pointsScored would misread this TD drive as OTHER.
    const drives = buildDrives([
      play({ playId: "td", playIndex: 1, driveId: 1, pointsScored: 6 }),
      play({ playId: "pat", playIndex: 2, driveId: 1, pointsScored: 1 }),
    ]);
    expect(drives).toHaveLength(1);
    expect(drives[0]?.points).toBe(7);
    expect(drives[0]?.result).toBe("TD");
  });

  it("still never infers SAFETY from a drive-total point sum (total 2 → OTHER)", () => {
    const drives = buildDrives([
      play({ playId: "a", playIndex: 1, driveId: 1, pointsScored: 0 }),
      play({ playId: "b", playIndex: 2, driveId: 1, pointsScored: 2 }),
    ]);
    expect(drives[0]?.points).toBe(2);
    expect(drives[0]?.result).toBe("OTHER");
    expect(drives[0]?.result).not.toBe("SAFETY");
  });
});

describe("aggregates", () => {
  it("sums points and epa (0 when epa null) and takes start/end from playIndex order", () => {
    const drives = buildDrives([
      play({ playId: "a", playIndex: 2, driveId: 1, yardline100: 60, pointsScored: 3, epa: 0.5 }),
      play({ playId: "b", playIndex: 1, driveId: 1, yardline100: 75, pointsScored: 0, epa: null }),
    ]);
    expect(drives[0]?.points).toBe(3);
    expect(drives[0]?.epaTotal).toBe(0.5);
    expect(drives[0]?.startYardline100).toBe(75); // playIndex 1
    expect(drives[0]?.endYardline100).toBe(60); // playIndex 2
  });

  it("computes successRate over ratable plays only", () => {
    const drives = buildDrives([
      play({ playId: "a", playIndex: 1, driveId: 1, isSuccess: true }),
      play({ playId: "b", playIndex: 2, driveId: 1, isSuccess: false }),
      play({ playId: "c", playIndex: 3, driveId: 1, isSuccess: null }), // excluded
    ]);
    expect(drives[0]?.successRate).toBe(0.5);
  });

  it("returns successRate 0 (not NaN) when every play is unratable", () => {
    const drives = buildDrives([
      play({ playId: "a", playIndex: 1, driveId: 1, isSuccess: null }),
      play({ playId: "b", playIndex: 2, driveId: 1, isSuccess: null }),
    ]);
    expect(drives[0]?.successRate).toBe(0);
    expect(Number.isNaN(drives[0]?.successRate)).toBe(false);
  });
});

describe("determinism", () => {
  it("sorts output by (gameId, driveId) and is stable across runs", () => {
    const plays: DrivePlay[] = [
      play({ playId: "d", playIndex: 1, gameId: "G2", driveId: 1 }),
      play({ playId: "a", playIndex: 1, gameId: "G1", driveId: 2 }),
      play({ playId: "b", playIndex: 1, gameId: "G1", driveId: 1 }),
    ];
    const first = buildDrives(plays);
    const second = buildDrives(plays);
    expect(first.map((d) => `${d.gameId}:${d.driveId}`)).toEqual(["G1:1", "G1:2", "G2:1"]);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
