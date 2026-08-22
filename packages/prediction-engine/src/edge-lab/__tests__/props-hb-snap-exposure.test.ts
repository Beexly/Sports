import { describe, expect, it } from "vitest";
import {
  SNAP_EXPOSURE_METHOD_TAG,
  expectedSnapsNext,
  pooledSnapShare,
  snapShare,
} from "../props-hb-snap-exposure.js";

describe("snapShare", () => {
  it("is player/team and refuses 0-snap rows as talent", () => {
    const r = snapShare({ playerSnaps: 45, teamOffSnaps: 70 });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.share).toBeCloseTo(45 / 70, 12);
    expect(SNAP_EXPOSURE_METHOD_TAG).toBe("props_hb_snap_exposure_v1");
    expect(snapShare({ playerSnaps: 0, teamOffSnaps: 70 }).ok).toBe(false);
    expect(snapShare({ playerSnaps: 10, teamOffSnaps: 0 }).ok).toBe(false);
  });
});

describe("expectedSnapsNext", () => {
  it("is ZIP at injury-out and at 0 team snaps", () => {
    const s = pooledSnapShare([
      { playerSnaps: 50, teamOffSnaps: 65 },
      { playerSnaps: 48, teamOffSnaps: 62 },
    ]);
    expect(s).not.toBeNull();
    expect(expectedSnapsNext(s, 68, false)).toBeCloseTo(s! * 68, 12);
    expect(expectedSnapsNext(s, 68, true)).toBe(0);
    expect(expectedSnapsNext(s, 0, false)).toBe(0);
  });
});
