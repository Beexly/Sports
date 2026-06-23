import { describe, it, expect } from "vitest";
import { freeTrialPool, poolForViewer, FREE_BOARD_DEPTH } from "./free-trial";
import type { Player, Pos } from "./players";

function mk(id: string, pos: Pos, proj: number): Player {
  return {
    id,
    name: id,
    pos,
    team: "KC",
    bye: 10,
    proj,
    floor: proj * 0.7,
    ceiling: proj * 1.3,
    usage: 0.5,
    schemeFit: 0.5,
    role: "starter",
    trend: "flat",
    injury: "healthy",
    note: "",
  };
}

/** Build a pool with `n` players at a position, descending projection. */
function poolAt(pos: Pos, n: number): Player[] {
  return Array.from({ length: n }, (_, i) => mk(`${pos}-${i}`, pos, 300 - i));
}

describe("freeTrialPool — server-side trial enforcement", () => {
  it("keeps only the top N per position by projection", () => {
    const pool = [...poolAt("QB", 30), ...poolAt("RB", 30), ...poolAt("WR", 30), ...poolAt("TE", 30)];
    const trial = freeTrialPool(pool, 12);
    // 12 per position × 4 positions.
    expect(trial).toHaveLength(48);
    for (const pos of ["QB", "RB", "WR", "TE"] as Pos[]) {
      const atPos = trial.filter((p) => p.pos === pos);
      expect(atPos).toHaveLength(12);
      // the kept ones are the highest-projected (300..289 for index 0..11).
      expect(atPos.map((p) => p.proj)).toEqual(Array.from({ length: 12 }, (_, i) => 300 - i));
    }
  });

  it("the paid rows are genuinely absent (not just hidden) — the leak is closed", () => {
    const pool = poolAt("WR", 50);
    const trial = freeTrialPool(pool, 12);
    const trialIds = new Set(trial.map((p) => p.id));
    // WR-20 (a paid-depth player) must NOT be present in the FREE payload.
    expect(trialIds.has("WR-20")).toBe(false);
    expect(trial.length).toBe(12);
  });

  it("does not mutate the input pool", () => {
    const pool = poolAt("RB", 20);
    const copy = [...pool];
    freeTrialPool(pool, 5);
    expect(pool).toEqual(copy);
  });

  it("handles a pool smaller than the cap and an empty pool", () => {
    expect(freeTrialPool(poolAt("QB", 3), 12)).toHaveLength(3);
    expect(freeTrialPool([], 12)).toEqual([]);
  });

  it("defaults to FREE_BOARD_DEPTH", () => {
    const trial = freeTrialPool(poolAt("WR", 40));
    expect(trial).toHaveLength(FREE_BOARD_DEPTH);
  });
});

describe("poolForViewer — gate resolution", () => {
  const pool = poolAt("WR", 40);

  it("returns the FULL pool for a paid viewer", () => {
    expect(poolForViewer(pool, true)).toBe(pool);
  });

  it("returns the TRIMMED pool for a FREE viewer", () => {
    const resolved = poolForViewer(pool, false);
    expect(resolved).toHaveLength(FREE_BOARD_DEPTH);
    expect(resolved).not.toBe(pool);
  });

  it("passes undefined (illustrative demo) through untouched for either tier", () => {
    expect(poolForViewer(undefined, false)).toBeUndefined();
    expect(poolForViewer(undefined, true)).toBeUndefined();
  });
});
