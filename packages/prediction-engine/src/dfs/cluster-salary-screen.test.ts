import { describe, expect, it } from "vitest";
import {
  flagUndervalued,
  kMeansClusters,
  teammateDifferential,
} from "./cluster-salary-screen";

const mk = (id: string, salary: number, f: number[]) => ({
  id,
  position: "WR",
  salary,
  features: f,
});

describe("cluster-salary-screen", () => {
  it("k-means separates two feature blobs deterministically", () => {
    // Seeds (first k players) are far apart so init is unambiguous.
    const players = [
      mk("a1", 5000, [2, 2]),
      mk("b1", 7000, [-2, -2]),
      mk("a2", 5100, [2.1, 1.9]),
      mk("b2", 7100, [-1.9, -2.1]),
    ];
    const c = kMeansClusters(players, 2);
    expect(c[0]).toBe(c[2]);
    expect(c[1]).toBe(c[3]);
    expect(c[0]).not.toBe(c[1]);
    expect(kMeansClusters([], 3)).toEqual([]);
  });

  it("flags a cheap outlier in a rich cluster", () => {
    // 20 similarly-priced WRs + 1 extreme bargain in the same cluster
    const players = Array.from({ length: 20 }, (_, i) => mk(`w${i}`, 8000 + i * 50, [1, 1]));
    players.push(mk("bargain", 3000, [1, 1]));
    const clusters = kMeansClusters(players, 1);
    const flags = flagUndervalued(players, clusters, 0.05);
    const bargain = flags.find((f) => f.id === "bargain")!;
    expect(bargain.undervalued).toBe(true);
    expect(bargain.salaryPercentile).toBeLessThan(0.05);
    const normal = flags.find((f) => f.id === "w0")!;
    expect(normal.undervalued).toBe(false);
  });

  it("rejects mismatched inputs", () => {
    const players = [mk("a", 5000, [1])];
    expect(() => flagUndervalued(players, [0, 1])).toThrow("mismatch");
    expect(() => kMeansClusters(players, 0)).toThrow();
  });

  it("teammate differential is the to-role minus off-role gap", () => {
    expect(teammateDifferential(9.5, 6.2)).toBeCloseTo(3.3, 10);
    expect(teammateDifferential(5, 7)).toBeLessThan(0);
  });
});
