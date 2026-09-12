import { describe, expect, it } from "vitest";
import {
  describeLineup,
  playerExposure,
  stackReport,
} from "@/lib/fantasy/stack-exposure";
import type { DfsPlayer } from "@/lib/fantasy/dfs-slate";

const P = (
  id: string,
  pos: DfsPlayer["pos"],
  team: string,
  opp: string,
  own = 0.1,
): DfsPlayer => ({
  id,
  name: id.toUpperCase(),
  pos,
  team,
  opp,
  salary: 5000,
  proj: 10,
  floor: 5,
  ceiling: 20,
  own,
});

// KC passing game vs BUF.
const kcStack: DfsPlayer[] = [
  P("kc-qb", "QB", "KC", "BUF"),
  P("kc-wr1", "WR", "KC", "BUF"),
  P("kc-wr2", "WR", "KC", "BUF"),
  P("kc-te", "TE", "KC", "BUF"),
  P("buf-wr", "WR", "BUF", "KC"),
  P("kc-rb", "RB", "KC", "BUF"),
];

// Same shape but the QB has no pass-catcher teammates.
const nakedQb: DfsPlayer[] = [
  P("qb", "QB", "SF", "SEA"),
  P("rb", "RB", "SEA", "SF"),
  P("wr", "WR", "SEA", "SF"),
];

// No QB at all.
const noQb: DfsPlayer[] = [P("wr", "WR", "DAL", "PHI"), P("rb", "RB", "PHI", "DAL")];

describe("stack-exposure — lineup structure", () => {
  it("counts same-team pass-catchers as the stack", () => {
    const s = describeLineup(kcStack, 0);
    expect(s.hasQb).toBe(true);
    expect(s.qbTeam).toBe("KC");
    expect(s.stack).toBe(3); // two WR + one TE; the RB is not a pass-catcher here
  });

  it("counts opposing skill players as the bring-back", () => {
    expect(describeLineup(kcStack, 0).bringBack).toBe(1);
  });

  it("counts every player on either side of the QB's game", () => {
    expect(describeLineup(kcStack, 0).sameGame).toBe(6);
  });

  it("marks a QB-less lineup and never invents a team for it", () => {
    const s = describeLineup(noQb, 3);
    expect(s.hasQb).toBe(false);
    expect(s.qbId).toBeNull();
    expect(s.qbTeam).toBeNull();
    expect(s.stack).toBe(0);
    expect(s.index).toBe(3);
  });
});

describe("stack-exposure — portfolio rates carry their denominators", () => {
  it("computes stack and bring-back rates over QB lineups only", () => {
    const rep = stackReport([kcStack, nakedQb, noQb]);
    expect(rep.lineups).toBe(3);
    expect(rep.withQb).toBe(2);
    expect(rep.stackRate).toBeCloseTo(0.5, 10);
    // Both QB lineups bring back an opposing skill player (KC→BUF, SF→SEA).
    expect(rep.bringBackRate).toBeCloseTo(1, 10);
    expect(rep.note).toContain("excluded");
  });

  it("returns null — not 0% — for an empty portfolio", () => {
    const rep = stackReport([]);
    expect(rep.lineups).toBe(0);
    expect(rep.stackRate).toBeNull();
    expect(rep.bringBackRate).toBeNull();
    expect(rep.meanStack).toBeNull();
    expect(rep.maxStack).toBeNull();
    expect(rep.note).toContain("denominator is zero");
  });

  it("returns null rates when no lineup has a QB", () => {
    const rep = stackReport([noQb, noQb]);
    expect(rep.withQb).toBe(0);
    expect(rep.stackRate).toBeNull();
    expect(rep.note).toContain("null, not zero");
  });

  it("reports max stack and max same-game concentration", () => {
    const rep = stackReport([kcStack, nakedQb]);
    expect(rep.maxStack).toBe(3);
    expect(rep.maxSameGame).toBe(6);
  });

  it("grades nothing — the report is counts, not an opinion", () => {
    const rep = stackReport([kcStack]);
    expect(Object.keys(rep)).not.toContain("score");
    expect(Object.keys(rep)).not.toContain("grade");
  });
});

describe("stack-exposure — player exposure", () => {
  it("counts how many lineups carry each player, most-exposed first", () => {
    const ex = playerExposure([kcStack, kcStack, nakedQb]);
    // kc-qb and buf-wr both appear in the two kcStack lineups → tied on count 2,
    // broken alphabetically by name (BUF-WR before KC-QB). The tie is stable.
    expect(ex[0]?.count).toBe(2);
    expect(ex[0]?.pct).toBeCloseTo(2 / 3, 10);
    expect(ex.map((e) => e.playerId)).toContain("kc-qb");
    const topCount = ex[0]!.count;
    expect(ex.filter((e) => e.count === topCount).length).toBeGreaterThan(1);
  });

  it("returns null pct for an empty portfolio", () => {
    expect(playerExposure([])).toEqual([]);
  });

  it("includes every player once per portfolio regardless of lineup spread", () => {
    const ex = playerExposure([kcStack, nakedQb]);
    const ids = ex.map((e) => e.playerId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("kc-te");
    expect(ids).toContain("qb");
  });
});