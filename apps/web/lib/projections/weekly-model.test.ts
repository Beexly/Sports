import { describe, it, expect } from "vitest";
import {
  projectWeekly,
  type PlayerWeeklyAnchors,
  type MatchupEnvironment,
} from "./weekly-model";

function anchor(over: Partial<PlayerWeeklyAnchors> = {}): PlayerWeeklyAnchors {
  return {
    playerId: "p1",
    name: "Test Player",
    team: "KC",
    position: "WR",
    xfpPerGame: 14,
    processGrade: 50, // neutral
    ...over,
  };
}

describe("projectWeekly — anchoring + gating", () => {
  it("returns xFP per game unchanged when every adjustment is neutral", () => {
    const result = projectWeekly([anchor()]);
    expect(result.projections[0]!.point).toBeCloseTo(14, 2);
  });

  it("ALWAYS ships gated (canPublishProjections:false) and classified as a derived signal", () => {
    const result = projectWeekly([anchor()]);
    expect(result.canPublishProjections).toBe(false);
    expect(result.classification).toBe("derived_signal");
    expect(result.provenance.source).toContain("nflverse");
    expect(result.provenance.weakness).toContain("backtest");
  });

  it("is deterministic with an injected clock", () => {
    const now = new Date("2026-09-09T12:00:00.000Z");
    const a = projectWeekly([anchor()], () => ({}), { now });
    const b = projectWeekly([anchor()], () => ({}), { now });
    expect(a).toEqual(b);
    expect(a.generatedAt).toBe("2026-09-09T12:00:00.000Z");
  });
});

describe("projectWeekly — opponent adjustment (our DVOA)", () => {
  it("raises the projection vs a soft defense and lowers it vs a tough one", () => {
    const soft: MatchupEnvironment = { opponentDefAdj: 0.1 }; // allows +0.1 EPA/play = bad D
    const tough: MatchupEnvironment = { opponentDefAdj: -0.1 }; // stingy D
    const up = projectWeekly([anchor()], () => soft).projections[0]!.point;
    const down = projectWeekly([anchor()], () => tough).projections[0]!.point;
    expect(up).toBeGreaterThan(14);
    expect(down).toBeLessThan(14);
    expect(up).toBeGreaterThan(down);
  });

  it("caps the opponent adjustment (no runaway swing on an extreme defAdj)", () => {
    const extreme: MatchupEnvironment = { opponentDefAdj: 5 };
    const point = projectWeekly([anchor()], () => extreme).projections[0]!.point;
    // capped at +12% ⇒ 14 * 1.12 = 15.68
    expect(point).toBeCloseTo(15.68, 1);
  });
});

describe("projectWeekly — game environment", () => {
  it("scales up with a high implied team total and down with a low one", () => {
    const high = projectWeekly([anchor()], () => ({ impliedTeamTotal: 30 })).projections[0]!.point;
    const low = projectWeekly([anchor()], () => ({ impliedTeamTotal: 15 })).projections[0]!.point;
    expect(high).toBeGreaterThan(14);
    expect(low).toBeLessThan(14);
  });

  it("applies a short-week penalty", () => {
    const short = projectWeekly([anchor()], () => ({ daysRest: 4 })).projections[0]!.point;
    expect(short).toBeLessThan(14);
  });
});

describe("projectWeekly — process grade monotonicity", () => {
  it("a higher process grade yields a higher projection", () => {
    const lo = projectWeekly([anchor({ processGrade: 20 })]).projections[0]!.point;
    const mid = projectWeekly([anchor({ processGrade: 50 })]).projections[0]!.point;
    const hi = projectWeekly([anchor({ processGrade: 90 })]).projections[0]!.point;
    expect(lo).toBeLessThan(mid);
    expect(mid).toBeLessThan(hi);
  });
});

describe("projectWeekly — availability (widen band, never shift mean)", () => {
  it("widens floor/ceiling without moving the point estimate", () => {
    const base = projectWeekly([anchor()]).projections[0]!;
    const risky = projectWeekly([anchor({ availabilityBandWiden: 0.3 })]).projections[0]!;
    expect(risky.point).toBeCloseTo(base.point, 2);
    expect(risky.floor).toBeLessThan(base.floor);
    expect(risky.ceiling).toBeGreaterThan(base.ceiling);
  });

  it("zeroes the projection for an official Out (no fabricated production)", () => {
    const out = projectWeekly([anchor({ isOut: true })]).projections[0]!;
    expect(out.point).toBe(0);
    expect(out.floor).toBe(0);
    expect(out.ceiling).toBe(0);
    expect(out.drivers.join(" ")).toContain("OUT");
  });
});

describe("projectWeekly — slate behavior", () => {
  it("sorts the slate by projected points descending", () => {
    const result = projectWeekly([
      anchor({ playerId: "a", xfpPerGame: 8 }),
      anchor({ playerId: "b", xfpPerGame: 20 }),
      anchor({ playerId: "c", xfpPerGame: 14 }),
    ]);
    expect(result.projections.map((p) => p.playerId)).toEqual(["b", "c", "a"]);
  });

  it("floor ≤ point ≤ ceiling for every projection", () => {
    const result = projectWeekly([
      anchor({ position: "QB", xfpPerGame: 22 }),
      anchor({ position: "RB", xfpPerGame: 16 }),
      anchor({ position: "TE", xfpPerGame: 9 }),
    ]);
    for (const p of result.projections) {
      expect(p.floor).toBeLessThanOrEqual(p.point);
      expect(p.point).toBeLessThanOrEqual(p.ceiling);
    }
  });
});
