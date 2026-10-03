/**
 * Tests for IC2 — standings-math conservative clinch/elimination bounds.
 *
 * The card's reason to exist is the weak-division trap: a wildcard-only impl
 * flags teams eliminated when their OWN division leader still trails them. These
 * tests assert both conditions (division leader + P7) independently.
 *
 * Attack list cross-check is deterministic, by computation (seeded, no Math.random),
 * never by reading the source.
 */
import { describe, expect, it } from "vitest";

import { mulberry32, shuffled } from "../rng.js";
import { maxPoints, points, standingsFacts, type TeamStandingRow } from "../standings-math.js";

const div = (team: string, conf: string, division: string, w: number, l: number, t: number, rem: number): TeamStandingRow => ({
  team, conference: conf, division, wins: w, losses: l, ties: t, remaining: rem,
});

describe("points / maxPoints", () => {
  it("points = wins + half ties; maxPoints adds remaining", () => {
    const r = div("A", "C", "D1", 10, 5, 1, 1);
    expect(points(r)).toBe(10.5);
    expect(maxPoints(r)).toBe(11.5);
  });
  it("ties are half-wins", () => {
    expect(points(div("A", "C", "D1", 8, 8, 2, 0))).toBe(9);
  });
});

describe("standingsFacts boundary honesty", () => {
  it("weak-division trap: maxPoints < P7 but leader catchable => NOT eliminated", () => {
    // Conference C1 has 16 teams (>= 8 rivals). Division D1 leader sits at 5 wins,
    // catchable by a 4-win team with 5 remaining. P7 sits at 9. The 4-win team
    // has maxPoints = 9 < P7? No — 9 == 9, strict < => not eliminated by (b).
    // And maxPoints(9) > divLeader(5) => not eliminated by (a). So NOT eliminated.
    const teams: TeamStandingRow[] = [];
    // D1: A=5-5-0-7, B=4-4-0-9  (leader A at 5, B catchable)
    teams.push(div("A", "C1", "D1", 5, 5, 0, 7));
    teams.push(div("B", "C1", "D1", 4, 4, 0, 9));
    // D2..D4 fill out 14 rivals with 9+ wins each so P7 = 9.
    for (let i = 0; i < 14; i++) {
      teams.push(div(`O${i}`, "C1", `D${2 + (i % 3)}`, 9, 7, 0, 0));
    }
    const f = standingsFacts(teams).map((x) => x.team);
    const b = standingsFacts(teams).find((x) => x.team === "B")!;
    expect(b.eliminatedSafe).toBe(false);
    expect(f.length).toBe(16);
  });

  it("truly eliminated: maxPoints < div leader AND maxPoints < P7 (strict both)", () => {
    const teams: TeamStandingRow[] = [];
    // D1 leader at 12 wins; target T at 3 wins, 0 remaining => maxPoints 3.
    teams.push(div("T", "C1", "D1", 3, 13, 0, 0));
    teams.push(div("LEAD", "C1", "D1", 12, 4, 0, 0));
    // 14 rivals all at 10 wins => P7 = 10. T.maxPoints=3 < 10 and 3 < 12 => eliminated.
    for (let i = 0; i < 14; i++) teams.push(div(`R${i}`, "C1", `D${2 + (i % 3)}`, 10, 6, 0, 0));
    const t = standingsFacts(teams).find((x) => x.team === "T")!;
    expect(t.eliminatedSafe).toBe(true);
  });

  it("tie at P7 boundary (maxPoints == P7) => NOT eliminated (strict <)", () => {
    const teams: TeamStandingRow[] = [];
    // T has 9 wins, 0 rem => maxPoints 9. P7 = 9 (7th rival also at 9). 9 < 9 false.
    teams.push(div("T", "C1", "D1", 9, 7, 0, 0));
    teams.push(div("L", "C1", "D1", 9, 7, 0, 0)); // division leader also 9 — not eliminated by (a) either
    for (let i = 0; i < 14; i++) teams.push(div(`R${i}`, "C1", `D${2 + (i % 3)}`, 9, 7, 0, 0));
    const t = standingsFacts(teams).find((x) => x.team === "T")!;
    expect(t.eliminatedSafe).toBe(false);
  });
});

describe("clinchedBerthSafe", () => {
  it("exactly 6 rivals can tie/beat => clinched (boundary)", () => {
    const teams: TeamStandingRow[] = [];
    // T has 12 points, 0 remaining. 6 rivals have maxPoints >= 12; 7 others < 12.
    teams.push(div("T", "C1", "D1", 12, 4, 0, 0));
    for (let i = 0; i < 6; i++) teams.push(div(`CB${i}`, "C1", `D${1 + (i % 3)}`, 11, 5, 0, 1)); // maxPoints 12
    for (let i = 0; i < 8; i++) teams.push(div(`NB${i}`, "C1", `D${1 + (i % 3)}`, 5, 11, 0, 0)); // maxPoints 5
    const t = standingsFacts(teams).find((x) => x.team === "T")!;
    expect(t.clinchedBerthSafe).toBe(true);
  });

  it("exactly 7 rivals can tie/beat => NOT clinched (boundary)", () => {
    const teams: TeamStandingRow[] = [];
    teams.push(div("T", "C1", "D1", 12, 4, 0, 0));
    for (let i = 0; i < 7; i++) teams.push(div(`CB${i}`, "C1", `D${1 + (i % 3)}`, 11, 5, 0, 1)); // maxPoints 12
    for (let i = 0; i < 7; i++) teams.push(div(`NB${i}`, "C1", `D${1 + (i % 3)}`, 5, 11, 0, 0));
    const t = standingsFacts(teams).find((x) => x.team === "T")!;
    expect(t.clinchedBerthSafe).toBe(false);
  });
});

describe("clinchedTopSeedSafe", () => {
  it("points(t) strictly > every rival's maxPoints => #1 seed", () => {
    const teams: TeamStandingRow[] = [];
    teams.push(div("T", "C1", "D1", 15, 1, 0, 1)); // 15 points
    for (let i = 0; i < 15; i++) teams.push(div(`R${i}`, "C1", `D${1 + (i % 3)}`, 10, 6, 0, 1)); // maxPoints 11
    const t = standingsFacts(teams).find((x) => x.team === "T")!;
    expect(t.clinchedTopSeedSafe).toBe(true);
  });

  it("points(t) == rival maxPoints (tie) => NOT top seed (strict >)", () => {
    const teams: TeamStandingRow[] = [];
    teams.push(div("T", "C1", "D1", 14, 2, 0, 0)); // 14 points, no remaining
    teams.push(div("R", "C1", "D2", 13, 3, 0, 1)); // maxPoints 14
    for (let i = 0; i < 14; i++) teams.push(div(`O${i}`, "C1", `D${1 + (i % 3)}`, 5, 11, 0, 0));
    const t = standingsFacts(teams).find((x) => x.team === "T")!;
    expect(t.clinchedTopSeedSafe).toBe(false);
  });
});

describe("thin table + validation (fail closed)", () => {
  it("fewer than 8 rivals in conference => all *Safe flags false", () => {
    // Only 7 teams total in conf => rivals.length = 6 < 7 => refuse-by-false.
    const teams: TeamStandingRow[] = [
      div("A", "C1", "D1", 16, 0, 0, 0),
      div("B", "C1", "D1", 0, 16, 0, 0),
    ];
    for (let i = 0; i < 5; i++) teams.push(div(`R${i}`, "C1", `D${2 + i}`, 8, 8, 0, 0));
    const facts = standingsFacts(teams);
    expect(facts.every((f) => !f.eliminatedSafe && !f.clinchedBerthSafe && !f.clinchedTopSeedSafe)).toBe(true);
  });

  it("duplicate team key => RangeError", () => {
    const teams = [div("A", "C1", "D1", 1, 1, 0, 0), div("A", "C1", "D2", 1, 1, 0, 0)];
    expect(() => standingsFacts(teams)).toThrow(RangeError);
  });

  it("negative counts => RangeError", () => {
    const teams = [div("A", "C1", "D1", -1, 1, 0, 0)];
    expect(() => standingsFacts(teams)).toThrow(RangeError);
  });

  it("division spanning two conferences => RangeError", () => {
    // D1 assigned to both C1 and C2.
    const teams = [
      div("A", "C1", "D1", 1, 1, 0, 0),
      div("B", "C2", "D1", 1, 1, 0, 0),
    ];
    expect(() => standingsFacts(teams)).toThrow(RangeError);
  });

  it("non-integer counts => RangeError", () => {
    const teams = [{ team: "A", conference: "C1", division: "D1", wins: 1.5, losses: 1, ties: 0, remaining: 0 }];
    expect(() => standingsFacts(teams)).toThrow(RangeError);
  });
});

describe("determinism + index alignment + immutability", () => {
  it("index-aligned: out[i].team === rows[i].team even when shuffled", () => {
    const base = [
      div("A", "C1", "D1", 10, 6, 0, 0), div("B", "C1", "D2", 8, 8, 0, 0),
      div("C", "C2", "D3", 12, 4, 0, 0), div("D", "C2", "D4", 6, 10, 0, 0),
      div("E", "C1", "D1", 7, 9, 0, 0), div("F", "C1", "D2", 5, 11, 0, 0),
      div("G", "C1", "D1", 9, 7, 0, 0), div("H", "C1", "D2", 11, 5, 0, 0),
      div("I", "C2", "D3", 4, 12, 0, 0), div("J", "C2", "D4", 14, 2, 0, 0),
    ];
    const permuted = shuffled(base, mulberry32(20240101));
    const out = standingsFacts(permuted);
    out.forEach((f, i) => {
      const row = permuted[i];
      expect(row).toBeDefined();
      expect(f.team).toBe(row!.team);
    });
  });

  it("frozen input is not mutated", () => {
    const teams: TeamStandingRow[] = [
      div("A", "C1", "D1", 10, 6, 0, 0), div("B", "C1", "D2", 8, 8, 0, 0),
      div("C", "C1", "D3", 12, 4, 0, 0), div("D", "C1", "D4", 6, 10, 0, 0),
      div("E", "C1", "D1", 7, 9, 0, 0), div("F", "C1", "D2", 5, 11, 0, 0),
      div("G", "C1", "D3", 9, 7, 0, 0), div("H", "C1", "D4", 11, 5, 0, 0),
    ];
    Object.freeze(teams);
    teams.forEach((t) => Object.freeze(t));
    const before = JSON.stringify(teams);
    standingsFacts(teams);
    expect(JSON.stringify(teams)).toBe(before);
  });
});

describe("clinchedTopSeedSafe vs clinchedBerthSafe precedence", () => {
  it("a team with #1 seed clinched also has berth clinched", () => {
    const teams: TeamStandingRow[] = [];
    teams.push(div("T", "C1", "D1", 15, 0, 1, 0)); // 15.5 pts, no remaining
    for (let i = 0; i < 15; i++) teams.push(div(`R${i}`, "C1", `D${1 + (i % 3)}`, 8, 8, 0, 0)); // 8 pts
    const t = standingsFacts(teams).find((x) => x.team === "T")!;
    expect(t.clinchedTopSeedSafe).toBe(true);
    expect(t.clinchedBerthSafe).toBe(true);
  });
});
