import { describe, expect, it } from "vitest";
import { postLockReadout, type PostLockPlayer } from "./postlock";

const p = (
  id: string,
  name: string,
  proj: number,
  ceiling: number,
  salary: number,
): PostLockPlayer => ({ id, name, proj, ceiling, salary });

const A = p("a", "Alpha", 20, 30, 8000);
const B = p("b", "Beta", 15, 25, 7000);
const C = p("c", "Gamma", 10, 18, 6000);
const D = p("d", "Delta", 12, 22, 6500);

describe("postLockReadout", () => {
  it("reports no changes for identical lineups", () => {
    const r = postLockReadout([A, B], [A, B], new Set(["a"]));
    expect(r.lockedKept).toBe(true);
    expect(r.lockedCoreKept).toBe(true);
    expect(r.lockedCoreKeptIds).toEqual(["a"]);
    expect(r.swappedOut).toEqual([]);
    expect(r.swappedIn).toEqual([]);
    expect(r.projDelta).toBe(0);
    expect(r.ceilDelta).toBe(0);
    expect(r.salaryDelta).toBe(0);
  });

  it("detects swapped names and deltas", () => {
    const r = postLockReadout([A, B, C], [A, B, D], new Set(["a"]));
    expect(r.swappedOut).toEqual(["Gamma"]);
    expect(r.swappedIn).toEqual(["Delta"]);
    expect(r.preProj).toBeCloseTo(45, 6);
    expect(r.postProj).toBeCloseTo(47, 6);
    expect(r.projDelta).toBeCloseTo(2, 6);
    expect(r.ceilDelta).toBeCloseTo(4, 6);
    expect(r.salaryDelta).toBe(500);
    expect(r.lockedKept).toBe(true);
    expect(r.lockedCoreKept).toBe(true);
  });

  it("flags a dropped locked player", () => {
    const r = postLockReadout([A, B], [B, D], new Set(["a"]));
    expect(r.lockedKept).toBe(false);
    expect(r.lockedCoreKept).toBe(false);
    expect(r.lockedCoreKeptIds).toEqual([]);
    expect(r.swappedOut).toEqual(["Alpha"]);
    expect(r.swappedIn).toEqual(["Delta"]);
  });

  it("lockedCoreKept ignores locked ids never in pre", () => {
    const r = postLockReadout([B], [B, D], new Set(["zzz"]));
    expect(r.lockedKept).toBe(false); // zzz not in post
    expect(r.lockedCoreKept).toBe(true); // no locked member of pre was dropped
    expect(r.lockedCoreKeptIds).toEqual([]);
  });

  it("handles empty inputs without throwing", () => {
    const r = postLockReadout([], [], new Set());
    expect(r.lockedKept).toBe(true);
    expect(r.lockedCoreKept).toBe(true);
    expect(r.projDelta).toBe(0);
    expect(r.salaryDelta).toBe(0);
  });

  it("is order-insensitive (compares by id)", () => {
    const r = postLockReadout([A, B], [B, A], new Set(["a", "b"]));
    expect(r.swappedOut).toEqual([]);
    expect(r.swappedIn).toEqual([]);
    expect(r.lockedKept).toBe(true);
    expect(r.lockedCoreKept).toBe(true);
  });
});
