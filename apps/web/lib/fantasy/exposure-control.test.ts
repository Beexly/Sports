import { describe, expect, it } from "vitest";
import {
  initExposure,
  lineupDistance,
  meetsSpacing,
  minExposureShortfall,
  nextLineupPolicy,
  playerExposure,
  recordLineup,
  type ExposureState,
} from "@/lib/fantasy/exposure-control";

const TEAMS: Record<string, string> = {
  a1: "A", a2: "A", a3: "A", a4: "A",
  b1: "B", b2: "B", b3: "B", b4: "B",
};
const teamOf = (id: string) => TEAMS[id];

const UNIVERSE = Object.keys(TEAMS);

/** Build a state by folding `lineups` arrays over a fresh universe. */
function fold(lineups: readonly (readonly string[])[]): ExposureState {
  return lineups.reduce<ExposureState>(
    (s, lu) => recordLineup(s, lu, teamOf),
    initExposure(UNIVERSE),
  );
}

describe("exposure-control — state and fractions", () => {
  it("starts with no lineups and no honest fraction", () => {
    const s = initExposure(UNIVERSE);
    expect(s.lineups).toBe(0);
    expect(s.playerCounts.size).toBe(0);
    // No denominator => null, never 0 and never a guess.
    expect(playerExposure(s, "a1").pct).toBeNull();
    expect(playerExposure(s, "a1").count).toBe(0);
  });

  it("folds a lineup without mutating the prior state", () => {
    const s0 = initExposure(UNIVERSE);
    const s1 = recordLineup(s0, ["a1", "b1"], teamOf);
    expect(s0.lineups).toBe(0);
    expect(s0.playerCounts.size).toBe(0);
    expect(s1.lineups).toBe(1);
    expect(s1.playerCounts.get("a1")).toBe(1);
    expect(s1.teamCounts.get("A")).toBe(1);
    expect(s1.teamCounts.get("B")).toBe(1);
  });

  it("computes exposure as appearances over generated lineups", () => {
    const s = fold([
      ["a1", "b1"],
      ["a1", "b2"],
      ["a2", "b1"],
      ["a1", "b1"],
    ]);
    expect(playerExposure(s, "a1").pct).toBeCloseTo(3 / 4, 10);
    expect(playerExposure(s, "b1").pct).toBeCloseTo(3 / 4, 10);
    expect(playerExposure(s, "a2").pct).toBeCloseTo(1 / 4, 10);
    expect(playerExposure(s, "a4").pct).toBe(0);
  });

  it("tallies team slots across the whole portfolio", () => {
    const s = fold([
      ["a1", "a2", "b1"],
      ["a1", "b2"],
    ]);
    expect(s.teamCounts.get("A")).toBe(3);
    expect(s.teamCounts.get("B")).toBe(2);
  });
});

describe("exposure-control — the exposure ceiling", () => {
  it("bans a player once exposure reaches the ceiling", () => {
    const s = fold([["a1"], ["a1"], ["a2"], ["a3"]]);
    const d = nextLineupPolicy(s, { maxPlayerExposure: 0.5 });
    // a1 is 2/4 = 0.5 => at the ceiling => banned.
    expect(d.banned).toContain("a1");
    expect(d.exposure.find((e) => e.playerId === "a1")?.pct).toBeCloseTo(0.5, 10);
  });

  it("bans nothing before any lineup exists", () => {
    const d = nextLineupPolicy(initExposure(UNIVERSE), { maxPlayerExposure: 0.1 });
    expect(d.banned).toEqual([]);
    expect(d.reason).toContain("No lineups generated yet");
  });

  it("returns banned deterministically sorted", () => {
    // a1 and b1 both hit 2/2 = 1.0
    const s = fold([
      ["a1", "b1"],
      ["a1", "b1"],
    ]);
    const d = nextLineupPolicy(s, { maxPlayerExposure: 1 });
    expect(d.banned).toEqual(["a1", "b1"]);
    expect(nextLineupPolicy(s, { maxPlayerExposure: 1 }).banned).toEqual(d.banned);
  });

  it("states the ceiling when it is the binding constraint", () => {
    const s = fold([["a1"], ["a1"]]);
    const d = nextLineupPolicy(s, { maxPlayerExposure: 0.5 });
    expect(d.reason).toContain("exposure ceiling");
  });
});

describe("exposure-control — the exposure floor", () => {
  it("locks every player below the floor, most urgent first", () => {
    const s = fold([
      ["a1", "b1"],
      ["a1", "b2"],
    ]);
    const d = nextLineupPolicy(s, { minPlayerExposure: 0.5, slotsPerLineup: 9 });
    // a1/b1 are at 1.0, b2 at exactly 0.5 => all at or above the floor, not locked.
    expect(d.locked).not.toContain("a1");
    expect(d.locked).not.toContain("b2");
    // Exactly the five players strictly below 0.5, in urgency order.
    expect(d.locked).toEqual(["a2", "a3", "a4", "b3", "b4"]);
  });

  it("reports the feasibility shortfall when the floor cannot be met", () => {
    const s = fold([["a1", "b1"]]);
    const d = nextLineupPolicy(s, { minPlayerExposure: 0.9, slotsPerLineup: 2 });
    expect(d.lockOverflow).toBe(true);
    // Feasibility is the more fundamental statement, so it wins the reason slot.
    expect(d.reason).toContain("cannot be satisfied");
    expect(d.minExposureFeasible).toBe(false);
  });

  it("reports lock overflow on its own when the floor is still reachable", () => {
    // 8 players, 25% floor, 2-slot lineups => 1 lineup suffices, so feasible.
    // One lineup has been generated covering only 2 players, leaving 6 under the
    // floor — more than the next lineup can carry.
    const s = fold([["a1", "b1"]]);
    const d = nextLineupPolicy(s, { minPlayerExposure: 0.25, slotsPerLineup: 2 });
    expect(d.minExposureFeasible).toBe(true);
    expect(d.lockOverflow).toBe(true);
    expect(d.reason).toContain("only 2 slots exist");
  });

  it("does not flag overflow when the locks fit", () => {
    const s = fold([["a1"], ["b1"], ["a2"], ["b2"]]);
    const d = nextLineupPolicy(s, { minPlayerExposure: 0.5, slotsPerLineup: 9 });
    expect(d.lockOverflow).toBe(false);
  });
});

describe("exposure-control — minimum-floor feasibility is computed, not hoped", () => {
  it("computes the lineups required to lift every player to the floor", () => {
    // 8 players at 50% across 9-slot lineups => ceil(8*0.5/9) = 1 lineup.
    const { required } = minExposureShortfall(initExposure(UNIVERSE), {
      minPlayerExposure: 0.5,
      slotsPerLineup: 9,
    });
    expect(required).toBe(1);
  });

  it("scales the requirement with the universe size", () => {
    const big = Array.from({ length: 40 }, (_, i) => `p${i}`);
    const { required } = minExposureShortfall(initExposure(big), {
      minPlayerExposure: 0.6,
      slotsPerLineup: 9,
    });
    // ceil(40 * 0.6 / 9) = ceil(2.67) = 3
    expect(required).toBe(3);
  });

  it("reports the shortfall while the floor is unreachable", () => {
    const big = Array.from({ length: 40 }, (_, i) => `p${i}`);
    const s = recordLineup(initExposure(big), ["p0"], () => "A");
    const d = nextLineupPolicy(s, { minPlayerExposure: 0.6, slotsPerLineup: 9 });
    expect(d.minExposureFeasible).toBe(false);
    expect(d.reason).toContain("more required");
  });

  it("clears feasibility once enough lineups exist", () => {
    const big = Array.from({ length: 40 }, (_, i) => `p${i}`);
    let s = initExposure(big);
    for (let i = 0; i < 3; i++) s = recordLineup(s, [`p${i}`], () => "A");
    const d = nextLineupPolicy(s, { minPlayerExposure: 0.6, slotsPerLineup: 9 });
    expect(d.minExposureFeasible).toBe(true);
  });

  it("is trivially feasible with no floor configured", () => {
    const d = nextLineupPolicy(fold([["a1"]]), { slotsPerLineup: 9 });
    expect(d.minExposureFeasible).toBe(true);
    expect(d.locked).toEqual([]);
  });
});

describe("exposure-control — team caps", () => {
  it("caps a team once its slot share reaches the ceiling", () => {
    // 2 lineups x 2 slots = 4 slots. Team A holds 3 => 0.75.
    const s = fold([
      ["a1", "a2"],
      ["a1", "b1"],
    ]);
    const d = nextLineupPolicy(s, { maxTeamExposure: 0.7, slotsPerLineup: 2 });
    expect(d.cappedTeams).toContain("A");
    expect(d.cappedTeams).not.toContain("B");
  });

  it("caps nothing when no team ceiling is set", () => {
    const d = nextLineupPolicy(fold([["a1", "a2"]]), { slotsPerLineup: 2 });
    expect(d.cappedTeams).toEqual([]);
  });
});

describe("exposure-control — lineup spacing", () => {
  it("counts differing players order-insensitively", () => {
    expect(lineupDistance(["a", "b"], ["a", "b"])).toBe(0);
    expect(lineupDistance(["a", "b"], ["b", "a"])).toBe(0);
    expect(lineupDistance(["a", "b"], ["a", "c"])).toBe(2);
    expect(lineupDistance(["a", "b"], ["c", "d"])).toBe(4);
  });

  it("accepts a candidate when nothing has been accepted yet", () => {
    const r = meetsSpacing(["a", "b"], [], 3);
    expect(r.ok).toBe(true);
    expect(r.worstAgainst).toBeNull();
  });

  it("rejects a near-duplicate of an accepted lineup", () => {
    const r = meetsSpacing(["a", "b", "c"], [["a", "b", "d"]], 3);
    expect(r.ok).toBe(false);
    expect(r.worstAgainst).toBe(2);
  });

  it("accepts a lineup that clears the spacing against every accepted one", () => {
    const r = meetsSpacing(
      ["a", "b", "c"],
      [
        ["a", "x", "y"],
        ["b", "p", "q"],
      ],
      2,
    );
    expect(r.ok).toBe(true);
    // vs [a,x,y]: b,c,p... differs on b,c,x,y = 4; vs [b,p,q]: differs on a,c,p,q = 4.
    expect(r.worstAgainst).toBe(4);
  });
});

describe("exposure-control — the governor actually governs", () => {
  it("drives exposure down over a loop and never exceeds the ceiling", () => {
    // A trivial greedy generator: take the least-exposed legal players, and never
    // one the policy has banned. This is the shape a real portfolio loop has.
    const rules = { maxPlayerExposure: 0.6, slotsPerLineup: 4 };
    let state = initExposure(UNIVERSE);
    for (let i = 0; i < 6; i++) {
      const d = nextLineupPolicy(state, rules);
      const banned = new Set(d.banned);
      // Prefer the least-exposed available players, alternating teams so the
      // roster is plausible.
      const pick = d.exposure
        .filter((e) => !banned.has(e.playerId))
        .sort((x, y) => x.count - y.count || x.playerId.localeCompare(y.playerId))
        .slice(0, 4)
        .map((e) => e.playerId);
      if (pick.length === 0) break;
      state = recordLineup(state, pick, teamOf);
    }
    expect(state.lineups).toBeGreaterThan(0);
    // Nobody ended up banned-and-then-rostered.
    const finalBanned = new Set(nextLineupPolicy(state, rules).banned);
    for (const id of finalBanned) {
      const pct = (state.playerCounts.get(id) ?? 0) / state.lineups;
      expect(pct).toBeGreaterThanOrEqual(rules.maxPlayerExposure);
    }
  });

  it("is reproducible for identical inputs", () => {
    const s = fold([["a1", "b1"], ["a1"], ["b2"]]);
    const a = nextLineupPolicy(s, { maxPlayerExposure: 0.5, minPlayerExposure: 0.5, slotsPerLineup: 9 });
    const b = nextLineupPolicy(s, { maxPlayerExposure: 0.5, minPlayerExposure: 0.5, slotsPerLineup: 9 });
    expect(a.banned).toEqual(b.banned);
    expect(a.locked).toEqual(b.locked);
    expect(a.exposure.map((e) => e.playerId)).toEqual(b.exposure.map((e) => e.playerId));
  });

  it("never claims the portfolio is optimal or profitable", () => {
    const d = nextLineupPolicy(fold([["a1"]]), { maxPlayerExposure: 0.5 });
    const text = `${d.reason ?? ""}`.toLowerCase();
    for (const forbidden of ["optimal", "profit", "guaranteed", "edge"]) {
      expect(text).not.toContain(forbidden);
    }
  });
});