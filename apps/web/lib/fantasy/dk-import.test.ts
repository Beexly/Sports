import { describe, it, expect } from "vitest";
import { parseDkCsv, validateSlate } from "./dk-import";

const CSV = `Position,Name + ID,Name,ID,Roster Position,Salary,Game Info,TeamAbbrev,AvgPointsPerGame
QB,Silas Hart (111),Silas Hart,111,QB,7600,DAL@PHI 09/07/2026 01:00PM ET,PHI,22.5
RB,Marcus Vale (222),Marcus Vale,222,RB/FLEX,8200,TB@ATL 09/07/2026 01:00PM ET,ATL,20.0
WR,Julian Roe (333),Julian Roe,333,WR/FLEX,8000,MIA@NYJ 09/07/2026 01:00PM ET,MIA,19.0
TE,Rocco Vance (444),Rocco Vance,444,TE/FLEX,6500,KC@DEN 09/07/2026 01:00PM ET,KC,15.0
DST,Ravens  (555),Ravens ,555,DST,3800,CIN@BAL 09/07/2026 01:00PM ET,BAL,9.0
CPT,Showdown Guy (666),Showdown Guy,666,CPT,12000,A@B,XYZ,30.0`;

describe("dk csv import", () => {
  it("parses players, salaries, teams, and opponents from a DK export", () => {
    const r = parseDkCsv(CSV);
    const hart = r.players.find((p) => p.name === "Silas Hart")!;
    expect(hart.pos).toBe("QB");
    expect(hart.salary).toBe(7600);
    expect(hart.team).toBe("PHI");
    expect(hart.opp).toBe("DAL"); // DAL@PHI, team PHI → opp DAL
    expect(hart.proj).toBe(22.5); // from AvgPointsPerGame
    expect(r.modeled).toBe(true);
  });

  it("models a floor/ceiling band and an ownership estimate", () => {
    const r = parseDkCsv(CSV);
    const vale = r.players.find((p) => p.name === "Marcus Vale")!;
    expect(vale.floor).toBeLessThan(vale.proj);
    expect(vale.ceiling).toBeGreaterThan(vale.proj);
    expect(vale.own).toBeGreaterThan(0);
    expect(vale.own).toBeLessThanOrEqual(0.45);
  });

  it("skips unsupported (showdown) positions with a warning", () => {
    const r = parseDkCsv(CSV);
    expect(r.players.some((p) => p.pos === ("CPT" as never))).toBe(false);
    expect(r.warnings.join(" ")).toContain("CPT");
  });

  it("rejects a non-DK file", () => {
    const r = parseDkCsv("foo,bar,baz\n1,2,3");
    expect(r.players.length).toBe(0);
    expect(r.warnings[0]).toMatch(/required columns/i);
  });

  it("validateSlate flags an incomplete roster", () => {
    const r = parseDkCsv(CSV);
    // only 1 WR in the sample → needs 3
    expect(validateSlate(r.players).join(" ")).toContain("WR");
  });

  it("handles empty input", () => {
    expect(parseDkCsv("").players.length).toBe(0);
  });
});
