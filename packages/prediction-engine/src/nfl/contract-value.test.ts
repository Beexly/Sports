import { describe, expect, it } from "vitest";
import {
  rankContracts,
  valuePerDollar,
  type ContractPlayer,
} from "./contract-value";

function player(
  playerId: string,
  position: string,
  totalEPA: number,
  // Matches ContractPlayer.capHitMillions exactly. The helper was declared
  // `number | null`, which is narrower than the domain type, so the test could
  // not express the `undefined` case it was written to exercise. Narrowing a
  // test helper below the contract it mirrors hides real behaviour.
  capHitMillions: number | null | undefined,
): ContractPlayer {
  return { playerId, position, totalEPA, capHitMillions };
}

describe("contract-value valuePerDollar", () => {
  it("computes totalEPA / capHitMillions", () => {
    expect(valuePerDollar({ totalEPA: 30, capHitMillions: 10 })).toBeCloseTo(3, 12);
    expect(valuePerDollar({ totalEPA: -6, capHitMillions: 4 })).toBeCloseTo(-1.5, 12);
    expect(valuePerDollar({ totalEPA: 0, capHitMillions: 2.5 })).toBeCloseTo(0, 12);
  });

  it("returns null for zero or negative cap hits", () => {
    expect(valuePerDollar({ totalEPA: 10, capHitMillions: 0 })).toBeNull();
    expect(valuePerDollar({ totalEPA: 10, capHitMillions: -3 })).toBeNull();
    expect(valuePerDollar({ totalEPA: 10, capHitMillions: -0 })).toBeNull();
  });

  it("returns null for missing or non-finite cap data (never imputes)", () => {
    expect(valuePerDollar({ totalEPA: 10, capHitMillions: null })).toBeNull();
    expect(
      valuePerDollar({ totalEPA: 10, capHitMillions: undefined }),
    ).toBeNull();
    expect(
      valuePerDollar({ totalEPA: 10, capHitMillions: Number.NaN }),
    ).toBeNull();
    expect(valuePerDollar(null)).toBeNull();
    expect(valuePerDollar(undefined)).toBeNull();
  });

  it("returns null for non-finite totalEPA", () => {
    expect(
      valuePerDollar({ totalEPA: Number.NaN, capHitMillions: 5 }),
    ).toBeNull();
    expect(
      valuePerDollar({ totalEPA: Number.POSITIVE_INFINITY, capHitMillions: 5 }),
    ).toBeNull();
  });
});

describe("contract-value ranking", () => {
  it("higher EPA-per-dollar ranks first within position", () => {
    const ranked = rankContracts([
      player("a", "WR", 20, 10), // 2.0
      player("b", "WR", 30, 5), // 6.0 → rank 1
      player("c", "WR", 10, 10), // 1.0 → rank 3
    ]);
    expect(ranked).toHaveLength(3);
    const wr = ranked.filter((r) => r.position === "WR");
    expect(wr.map((r) => r.playerId)).toEqual(["b", "a", "c"]);
    expect(wr[0]?.rankInPosition).toBe(1);
    expect(wr[0]?.valuePerDollar).toBeCloseTo(6, 12);
    expect(wr[1]?.rankInPosition).toBe(2);
    expect(wr[2]?.rankInPosition).toBe(3);
  });

  it("ranks within position only — cross-position groups are independent", () => {
    const ranked = rankContracts([
      player("qb1", "QB", 40, 20), // 2.0
      player("qb2", "QB", 10, 10), // 1.0
      player("wr1", "WR", 12, 4), // 3.0 — best in WR, not compared to QBs
      player("wr2", "WR", 3, 3), // 1.0
    ]);
    const qb = ranked.filter((r) => r.position === "QB");
    const wr = ranked.filter((r) => r.position === "WR");
    expect(qb[0]?.playerId).toBe("qb1");
    expect(qb[0]?.rankInPosition).toBe(1);
    expect(wr[0]?.playerId).toBe("wr1");
    expect(wr[0]?.rankInPosition).toBe(1);
    expect(qb[0]?.positionGroupSize).toBe(2);
    expect(wr[0]?.positionGroupSize).toBe(2);
  });

  it("excludes zero and negative cap hits entirely", () => {
    const ranked = rankContracts([
      player("zero", "EDGE", 50, 0),
      player("neg", "EDGE", 50, -2),
      player("ok", "EDGE", 12, 6), // 2.0 — only eligible EDGE
    ]);
    expect(ranked.map((r) => r.playerId)).toEqual(["ok"]);
    expect(ranked.some((r) => r.playerId === "zero")).toBe(false);
    expect(ranked.some((r) => r.playerId === "neg")).toBe(false);
  });

  it("never ranks missing cap data", () => {
    const ranked = rankContracts([
      player("missing", "CB", 20, null),
      player("undef", "CB", 20, undefined),
      player("nan", "CB", 20, Number.NaN),
      player("real", "CB", 8, 4),
    ]);
    expect(ranked.map((r) => r.playerId)).toEqual(["real"]);
  });

  it("labels top decile surplus and bottom decile overpaid", () => {
    const players: ContractPlayer[] = [];
    // 10 QBs with strictly decreasing valuePerDollar.
    for (let i = 0; i < 10; i++) {
      players.push(player(`q${i}`, "QB", 100 - i * 10, 10)); // value 10..1
    }
    const ranked = rankContracts(players);
    expect(ranked).toHaveLength(10);
    expect(ranked[0]?.playerId).toBe("q0");
    expect(ranked[0]?.label).toBe("surplus");
    expect(ranked[9]?.playerId).toBe("q9");
    expect(ranked[9]?.label).toBe("overpaid");
    // Middle ranks are fair.
    expect(ranked[1]?.label).toBe("fair");
    expect(ranked[8]?.label).toBe("fair");
  });

  it("single-player groups are fair (no decile to occupy)", () => {
    const ranked = rankContracts([player("only", "K", 5, 2)]);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.label).toBe("fair");
  });

  it("returns an empty array for empty / null input", () => {
    expect(rankContracts([])).toEqual([]);
    expect(rankContracts(null)).toEqual([]);
    expect(rankContracts(undefined)).toEqual([]);
    expect(rankContracts([null, undefined])).toEqual([]);
  });
});
