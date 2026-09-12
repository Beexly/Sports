import { describe, expect, it } from "vitest";
import { gseScore, gseRankPool, gseIndex, isLiveGse } from "@/lib/fantasy/gse-score";
import { PLAYERS, type Player } from "@/lib/fantasy/players";

describe("gseScore — sample pool", () => {
  it("returns a 0-100 score labelled sample-vor on the illustrative pool", () => {
    const p = PLAYERS[0]!;
    const r = gseScore(p, PLAYERS);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.source).toBe("sample-vor");
    expect(isLiveGse(r)).toBe(false);
  });

  it("the best player in the pool scores highest", () => {
    const ranked = gseRankPool(PLAYERS);
    const scores = PLAYERS.map((p) => ranked.get(p.id)!.score);
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    expect(max).toBeGreaterThan(min);
    // At least one player sits at the top of the index.
    const top = [...ranked.entries()].find(([, r]) => r.index === 1);
    expect(top).toBeDefined();
    expect(ranked.get(top![0])!.score).toBe(max);
  });

  it("indices are 1..n with no gaps and no duplicates", () => {
    const ranked = gseRankPool(PLAYERS);
    const idx = [...ranked.values()].map((r) => r.index!).sort((a, b) => a - b);
    expect(idx[0]).toBe(1);
    expect(idx[idx.length - 1]).toBe(PLAYERS.length);
    expect(new Set(idx).size).toBe(PLAYERS.length);
  });

  it("gseIndex matches the rank map", () => {
    const ranked = gseRankPool(PLAYERS);
    const p = PLAYERS[3]!;
    expect(gseIndex(p, PLAYERS)).toBe(ranked.get(p.id)!.index);
  });
});

describe("gseScore — live process grade", () => {
  it("uses processGrade directly when present and flags it live", () => {
    const live: Player & { processGrade: number } = {
      ...PLAYERS[0]!,
      id: "live-qb-1",
      name: "Live QB",
      processGrade: 87,
    };
    const r = gseScore(live, [live, ...PLAYERS.slice(0, 5)]);
    expect(r.score).toBe(87);
    expect(r.source).toBe("live-process");
    expect(isLiveGse(r)).toBe(true);
  });

  it("ignores an out-of-range processGrade and falls back to sample", () => {
    const bad: Player & { processGrade: number } = {
      ...PLAYERS[0]!,
      processGrade: 250,
    };
    const r = gseScore(bad, PLAYERS);
    expect(r.source).toBe("sample-vor");
  });
});

describe("gseRankPool — determinism", () => {
  it("same pool, same order, every time", () => {
    const a = gseRankPool(PLAYERS);
    const b = gseRankPool(PLAYERS);
    expect([...a.keys()]).toEqual([...b.keys()]);
    expect([...a.values()]).toEqual([...b.values()]);
  });

  it("ties break on projection then name", () => {
    const mk = (id: string, name: string, proj: number): Player => ({
      ...PLAYERS[0]!,
      id,
      name,
      proj,
      floor: proj * 0.7,
      ceiling: proj * 1.3,
    });
    const tied = [mk("a", "Alpha", 100), mk("b", "Bravo", 100), mk("c", "Charlie", 90)];
    const ranked = gseRankPool(tied);
    // Alpha and Bravo tie on proj; Alpha sorts first by name.
    expect(ranked.get("a")!.index).toBe(1);
    expect(ranked.get("b")!.index).toBe(2);
    expect(ranked.get("c")!.index).toBe(3);
  });
});
