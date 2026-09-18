import { describe, expect, it } from "vitest";
import {
  inPlayExclusionNote,
  isInPlayGenerated,
  partitionInPlay,
  partitionInPlayForTraining,
} from "@/lib/calibration/in-play-exclusion";

/**
 * The in-play rule has one definition (this module) and three readers. Until now
 * it was only exercised THROUGH them, so a defect at the boundary would have
 * shown up as a changed published number rather than as a red test. These are
 * the cases the readers cannot see: equality, one millisecond either side,
 * unreadable clocks, scale, and the failure mode when a caller hands in
 * something that is not a Date.
 */

const KICKOFF = new Date("2026-09-10T23:00:00Z");

describe("isInPlayGenerated — the boundary", () => {
  it("excludes a pick generated at EXACTLY kickoff: the rule is at-or-after, per C-298", () => {
    expect(isInPlayGenerated(new Date(KICKOFF.getTime()), KICKOFF)).toBe(true);
  });

  it("keeps a pick generated one millisecond before kickoff", () => {
    expect(isInPlayGenerated(new Date(KICKOFF.getTime() - 1), KICKOFF)).toBe(false);
  });

  it("excludes a pick generated during play, and one generated after the game ended", () => {
    expect(isInPlayGenerated(new Date(KICKOFF.getTime() + 90 * 60_000), KICKOFF)).toBe(true);
    expect(isInPlayGenerated(new Date(KICKOFF.getTime() + 8 * 3600_000), KICKOFF)).toBe(true);
  });

  it("keeps the row when either clock is absent or unreadable — absent means CANNOT TELL", () => {
    expect(isInPlayGenerated(null, KICKOFF)).toBe(false);
    expect(isInPlayGenerated(KICKOFF, null)).toBe(false);
    expect(isInPlayGenerated(undefined, undefined)).toBe(false);
    expect(isInPlayGenerated(new Date(Number.NaN), KICKOFF)).toBe(false);
    expect(isInPlayGenerated(KICKOFF, new Date("nonsense"))).toBe(false);
  });

  it("reads a string clock instead of ignoring it, and never throws on one", () => {
    expect(isInPlayGenerated("2026-09-10T23:30:00Z", KICKOFF)).toBe(true);
    expect(isInPlayGenerated("2026-09-10T09:00:00Z", KICKOFF)).toBe(false);
    expect(isInPlayGenerated(KICKOFF.toISOString(), KICKOFF.toISOString())).toBe(true);
    expect(isInPlayGenerated(KICKOFF.getTime(), KICKOFF.getTime())).toBe(true);
  });

  it("keeps the row, without throwing, when a clock is a value it cannot read at all", () => {
    expect(isInPlayGenerated({} as unknown as Date, KICKOFF)).toBe(false);
    expect(isInPlayGenerated(true as unknown as Date, KICKOFF)).toBe(false);
    expect(isInPlayGenerated(new Date("nonsense"), KICKOFF)).toBe(false);
  });
});

describe("partitionInPlay — partition invariants and scale", () => {
  it("loses none and invents none: 100k rows straddling kickoff, exactly half withheld", () => {
    const rows = Array.from({ length: 100_000 }, (_, i) => ({
      id: i,
      offsetMinutes: (i % 200) - 100,
      generatedAt: new Date(KICKOFF.getTime() + ((i % 200) - 100) * 60_000),
      commenceTime: KICKOFF,
    }));

    const started = performance.now();
    const { scored, excludedInPlay } = partitionInPlay(rows, (r) => r);
    const elapsedMs = performance.now() - started;

    expect(scored.length + excludedInPlay.length).toBe(100_000);
    expect(excludedInPlay.length).toBe(50_000);
    expect(scored.length).toBe(50_000);
    expect(excludedInPlay.filter((r) => r.offsetMinutes === 0).length).toBe(500);
    expect(scored.some((r) => r.offsetMinutes === 0)).toBe(false);
    expect(scored[0]?.offsetMinutes).toBe(-100);
    expect(excludedInPlay[0]?.offsetMinutes).toBe(0);
    expect(elapsedMs).toBeLessThan(2_000);
  });

  it("returns empty halves for an empty population rather than throwing", () => {
    const { scored, excludedInPlay } = partitionInPlay([], () => ({
      generatedAt: KICKOFF,
      commenceTime: KICKOFF,
    }));
    expect(scored).toEqual([]);
    expect(excludedInPlay).toEqual([]);
  });
});

describe("training vs eligibility clock asymmetry (deliberate)", () => {
  const nullClockRow = {
    id: "null-clock",
    generatedAt: null as Date | null,
    commenceTime: KICKOFF,
  };
  const readablePreGame = {
    id: "pre",
    generatedAt: new Date(KICKOFF.getTime() - 60_000),
    commenceTime: KICKOFF,
  };

  it("partitionInPlay KEEPS a null-clock row (eligibility sample, unchanged)", () => {
    const { scored, excludedInPlay } = partitionInPlay(
      [nullClockRow, readablePreGame],
      (r) => r,
    );
    expect(scored.map((r) => r.id)).toEqual(["null-clock", "pre"]);
    expect(excludedInPlay).toEqual([]);
  });

  it("partitionInPlayForTraining EXCLUDES a null-clock row and tags the reason", () => {
    const { kept, excluded } = partitionInPlayForTraining(
      [nullClockRow, readablePreGame],
      (r) => r,
    );
    expect(kept.map((r) => r.id)).toEqual(["pre"]);
    expect(excluded).toHaveLength(1);
    expect(excluded[0]?.row.id).toBe("null-clock");
    expect(excluded[0]?.reason).toBe("unreadable_generated_at");
  });
});

describe("inPlayExclusionNote — the number always travels with its denominator", () => {
  it("names the empty population instead of printing a 0-of-0 fraction", () => {
    const note = inPlayExclusionNote(0, 0);
    expect(note).toMatch(/No settled rows in this population/);
    expect(note).not.toMatch(/0 of 0/);
  });

  it("states the zero case positively rather than silently", () => {
    const note = inPlayExclusionNote(0, 2043);
    expect(note).toContain("2043");
    expect(note).toMatch(/Excluded 0 of 2043/);
    expect(note).toMatch(/none was generated at or after kickoff/);
  });

  it("carries both numbers and the reason when rows are withheld", () => {
    const note = inPlayExclusionNote(113, 477);
    expect(note).toContain("113");
    expect(note).toContain("477");
    expect(note).toMatch(/live price/);
    expect(note).toMatch(/never scored/);
  });
});
