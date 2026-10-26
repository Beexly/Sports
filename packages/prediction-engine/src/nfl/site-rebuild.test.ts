import { describe, expect, it } from "vitest";
import { dvoaTable, lineupTag, quarterbackPressure, teamMotion, week7Lineups } from "./site-rebuild";

describe("rebuilt public sites", () => {
  it("has a real 2026 pressure split and the 49ers at the top of both motion and DVOA", () => {
    const qbs = quarterbackPressure();
    const darnold = qbs.find((q) => q.name === "Sam Darnold");
    const purdy = qbs.find((q) => q.name === "Brock Purdy");
    expect(darnold).toBeTruthy();
    expect(purdy).toBeTruthy();
    expect(darnold!.dropbacks).toBeGreaterThan(140);
    expect(darnold!.pressure_rate).toBeGreaterThan(0.3);
    expect(purdy!.pressure_rate).toBeLessThan(0.2);
    const motion = teamMotion();
    expect(motion[0]?.team).toBe("SF");
    expect(motion[0]!.motion_rate).toBeGreaterThan(0.55);
    expect(motion[0]!.charted_plays).toBeGreaterThan(400);
    const dvoa = dvoaTable();
    expect(dvoa).toHaveLength(32);
    expect(dvoa[0]).toMatchObject({ team: "SF", record: "6-0" });
    expect(dvoa[0]!.total_dvoa).toBeGreaterThan(40);
    expect(dvoa[31]?.team).toBe("MIA");
    const vikings = dvoa.find((t) => t.team === "MIN");
    expect(vikings?.off_dvoa).toBeLessThan(0);
    expect(vikings?.def_rank).toBe(1);
  });

  it("reads the week-7 lineup card, including who is questionable", () => {
    const games = week7Lineups();
    expect(games).toHaveLength(14);
    expect(games[0]).toMatchObject({ away: "NE", home: "CHI", status: "started" });
    expect(lineupTag("Lamar Jackson")).toMatchObject({ team: "BAL", pos: "QB", tag: "Q" });
    expect(lineupTag("Puka Nacua")).toMatchObject({ team: "LAR", tag: "Q" });
    expect(lineupTag("Saquon Barkley")).toMatchObject({ team: "PHI", tag: "Q" });
  });
});
