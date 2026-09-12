import { describe, expect, it } from "vitest";
import {
  PER_TEAM_BOUND,
  SHOWDOWN_RULES,
  bestShowdownLineups,
  boundPool,
  showdownAlternates,
  type ShowdownPlayer,
} from "@/lib/fantasy/showdown";

const P = (
  id: string,
  pos: string,
  team: string,
  salary: number,
  proj: number,
  ceiling?: number,
): ShowdownPlayer => ({ id, name: id.toUpperCase(), pos, team, salary, proj, ...(ceiling === undefined ? {} : { ceiling }) });

// One game: team A vs team B, eight candidates.
const GAME: ShowdownPlayer[] = [
  P("a1", "QB", "A", 10000, 20, 30),
  P("a2", "RB", "A", 8000, 15, 25),
  P("a3", "WR", "A", 6000, 12, 24),
  P("a4", "TE", "A", 4000, 8, 18),
  P("b1", "QB", "B", 11000, 22, 33),
  P("b2", "RB", "B", 7000, 14, 22),
  P("b3", "WR", "B", 5000, 10, 20),
  P("b4", "DST", "B", 3000, 5, 12),
];

/**
 * Independent brute-force oracle: every 6-subset of the pool, every member as
 * captain, cap + both-teams checked. Deliberately written differently from the
 * module so the test can disagree with it.
 */
function oracleBest(pool: readonly ShowdownPlayer[], cap = SHOWDOWN_RULES.salaryCap): number {
  const mult = SHOWDOWN_RULES.captainMultiplier;
  let best = -Infinity;
  const n = pool.length;
  const pick = [0, 1, 2, 3, 4, 5];
  for (;;) {
    const roster = pick.map((i) => pool[i]!);
    for (const cap0 of roster) {
      const flex = roster.filter((p) => p.id !== cap0.id);
      const salary = cap0.salary * mult + flex.reduce((s, p) => s + p.salary, 0);
      if (salary > cap) continue;
      const teams = new Set(roster.map((p) => p.team));
      if (teams.size < 2) continue;
      const proj = cap0.proj * mult + flex.reduce((s, p) => s + p.proj, 0);
      if (proj > best) best = proj;
    }
    let i = 5;
    while (i >= 0 && pick[i] === n - 6 + i) i -= 1;
    if (i < 0) break;
    pick[i] = pick[i]! + 1;
    for (let j = i + 1; j < 6; j++) pick[j] = pick[j - 1]! + 1;
  }
  return best;
}

describe("showdown — captain multiplier", () => {
  it("applies 1.5x to both the captain's points and the captain's salary", () => {
    const res = bestShowdownLineups(GAME, 1);
    const lu = res.lineups[0]!;
    const flexSalary = lu.flex.reduce((s, p) => s + p.salary, 0);
    const flexProj = lu.flex.reduce((s, p) => s + p.proj, 0);
    expect(lu.salary).toBeCloseTo(lu.captain.salary * 1.5 + flexSalary, 6);
    expect(lu.proj).toBeCloseTo(lu.captain.proj * 1.5 + flexProj, 6);
  });

  it("multiplies the ceiling too, falling back to proj when absent", () => {
    const res = bestShowdownLineups(GAME, 1);
    const lu = res.lineups[0]!;
    const flexCeil = lu.flex.reduce((s, p) => s + (p.ceiling ?? p.proj), 0);
    expect(lu.ceiling).toBeCloseTo((lu.captain.ceiling ?? lu.captain.proj) * 1.5 + flexCeil, 6);
  });

  it("publishes the roster rules it enforced", () => {
    expect(SHOWDOWN_RULES.captainMultiplier).toBe(1.5);
    expect(SHOWDOWN_RULES.flexSlots).toBe(5);
    expect(bestShowdownLineups(GAME, 1).lineups[0]!.flex.length).toBe(SHOWDOWN_RULES.flexSlots);
  });
});

describe("showdown — legality", () => {
  it("never exceeds the salary cap", () => {
    for (const lu of bestShowdownLineups(GAME, 5).lineups) {
      expect(lu.salary).toBeLessThanOrEqual(SHOWDOWN_RULES.salaryCap);
    }
  });

  it("spans both teams on every lineup", () => {
    for (const lu of bestShowdownLineups(GAME, 5).lineups) {
      const teams = new Set([lu.captain, ...lu.flex].map((p) => p.id[0]!.toUpperCase()));
      expect(teams.size).toBeGreaterThanOrEqual(2);
    }
  });

  it("never repeats a player within a lineup", () => {
    for (const lu of bestShowdownLineups(GAME, 5).lineups) {
      const ids = [lu.captain.id, ...lu.flex.map((p) => p.id)];
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("returns distinct lineups by player set", () => {
    const keys = bestShowdownLineups(GAME, 5).lineups.map((l) => l.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("showdown — exactness against an independent oracle", () => {
  it("matches brute force for the best projected lineup", () => {
    const res = bestShowdownLineups(GAME, 1);
    expect(res.lineups[0]!.proj).toBeCloseTo(oracleBest(GAME), 6);
  });

  it("matches brute force for a tighter cap where the constraint binds", () => {
    const res = bestShowdownLineups(GAME, 1, { salaryCap: 40000 });
    expect(res.lineups[0]!.proj).toBeCloseTo(oracleBest(GAME, 40000), 6);
  });

  it("ranks lineups by projection, best first", () => {
    const lus = bestShowdownLineups(GAME, 4).lineups;
    for (let i = 1; i < lus.length; i++) {
      expect(lus[i - 1]!.proj).toBeGreaterThanOrEqual(lus[i]!.proj);
    }
  });

  it("reports how much work it did", () => {
    const res = bestShowdownLineups(GAME, 1);
    expect(res.combosEvaluated).toBeGreaterThan(0);
    expect(res.captainCandidates).toBeGreaterThan(0);
    expect(res.poolSize).toBe(GAME.length);
    expect(res.teams).toEqual(["A", "B"]);
  });

  it("is deterministic", () => {
    const a = bestShowdownLineups(GAME, 3);
    const b = bestShowdownLineups(GAME, 3);
    expect(a.lineups.map((l) => l.key)).toEqual(b.lineups.map((l) => l.key));
  });
});

describe("showdown — refuses to invent a lineup", () => {
  it("returns nothing for an empty pool, with a reason", () => {
    const res = bestShowdownLineups([], 1);
    expect(res.lineups).toEqual([]);
    expect(res.reason).toContain("No players");
  });

  it("rejects a one-team pool because showdown requires both teams", () => {
    const oneTeam = GAME.filter((p) => p.team === "A");
    const res = bestShowdownLineups(oneTeam, 1);
    expect(res.lineups).toEqual([]);
    expect(res.reason).toContain("both teams");
  });

  it("rejects a multi-game pool", () => {
    const threeTeams = [...GAME, P("c1", "QB", "C", 9000, 18)];
    const res = bestShowdownLineups(threeTeams, 1);
    expect(res.lineups).toEqual([]);
    expect(res.reason).toContain("exactly two teams");
  });

  it("returns nothing when no lineup can fit under the cap, with the cap reason", () => {
    const res = bestShowdownLineups(GAME, 1, { salaryCap: 1000 });
    expect(res.lineups).toEqual([]);
    expect(res.reason).toContain("salary cap");
  });
});

describe("showdown — the search bound is stated, not hidden", () => {
  it("reports no bound when the pool fits", () => {
    const bounded = boundPool(GAME);
    expect(bounded.note).toBeNull();
    expect(bestShowdownLineups(GAME, 1).poolBound).toBeNull();
  });

  it("drops below-bound players and says so, naming exactness limits", () => {
    const big: ShowdownPlayer[] = [
      ...Array.from({ length: 20 }, (_, i) => P(`a${i}`, "WR", "A", 4000 + i, 5 + i)),
      ...Array.from({ length: 20 }, (_, i) => P(`b${i}`, "WR", "B", 4000 + i, 5 + i)),
    ];
    const res = bestShowdownLineups(big, 1);
    expect(res.poolSize).toBe(PER_TEAM_BOUND * 2);
    expect(res.poolBound).toContain("exactness holds over the searched pool only");
    expect(res.poolBound).toContain("per team");
  });
});

describe("showdown — alternates are diversified, not claimed as top-k", () => {
  it("returns distinct captains across alternates", () => {
    const res = showdownAlternates(GAME, 4);
    const captains = res.lineups.map((l) => l.captain.id);
    expect(new Set(captains).size).toBe(captains.length);
    expect(captains.length).toBeGreaterThan(1);
  });

  it("labels them as re-solves rather than a proven top-k", () => {
    const res = showdownAlternates(GAME, 3);
    expect(res.reason).toContain("Not a proven top-k");
  });

  it("keeps every alternate legal", () => {
    for (const lu of showdownAlternates(GAME, 4).lineups) {
      expect(lu.salary).toBeLessThanOrEqual(SHOWDOWN_RULES.salaryCap);
      const teams = new Set([lu.captain, ...lu.flex].map((p) => p.team));
      expect(teams.size).toBe(2);
    }
  });

  it("stops cleanly when the pool cannot supply more alternates", () => {
    const tiny: ShowdownPlayer[] = [
      P("a1", "QB", "A", 9000, 20),
      P("a2", "RB", "A", 8000, 15),
      P("a3", "WR", "A", 7000, 12),
      P("b1", "QB", "B", 9000, 18),
      P("b2", "RB", "B", 8000, 14),
      P("b3", "WR", "B", 7000, 11),
    ];
    const res = showdownAlternates(tiny, 10);
    expect(res.lineups.length).toBeLessThanOrEqual(3);
    for (const lu of res.lineups) expect(lu.salary).toBeLessThanOrEqual(SHOWDOWN_RULES.salaryCap);
  });
});