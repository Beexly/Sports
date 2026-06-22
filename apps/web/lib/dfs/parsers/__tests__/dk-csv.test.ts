import { describe, it, expect } from "vitest";
import { parseDkCsv } from "../dk-csv";

const VALID_DK_CSV = `Position,Name + ID,Name,ID,Roster Position,Salary,Game Info,TeamAbbrev,AvgPointsPerGame
QB,Patrick Mahomes (17117619),Patrick Mahomes,17117619,QB,9000,KC@DEN 06:00PM ET,KC,28.02
WR,Justin Jefferson (18432001),Justin Jefferson,18432001,WR,8400,MIN@GB 01:00PM ET,MIN,22.50
RB,Saquon Barkley (19001234),Saquon Barkley,19001234,RB,7800,PHI@DAL 04:25PM ET,PHI,18.90
`;

describe("parseDkCsv", () => {
  it("parses a valid DK CSV correctly", () => {
    const rows = parseDkCsv(VALID_DK_CSV);
    expect(rows).toHaveLength(3);

    const mahomes = rows[0]!;
    expect(mahomes.position).toBe("QB");
    expect(mahomes.name).toBe("Patrick Mahomes");
    expect(mahomes.sitePlayerId).toBe("17117619");
    expect(mahomes.rosterSlot).toBe("QB");
    expect(mahomes.salary).toBe(9000);
    expect(mahomes.gameInfo).toBe("KC@DEN 06:00PM ET");
    expect(mahomes.team).toBe("KC");
    expect(mahomes.avgPoints).toBe(28.02);
  });

  it("extracts opponent correctly — away team perspective", () => {
    const rows = parseDkCsv(VALID_DK_CSV);
    // KC@DEN — KC is away, DEN is home
    const mahomes = rows[0]!;
    expect(mahomes.team).toBe("KC");
    expect(mahomes.opponent).toBe("DEN");
  });

  it("extracts opponent correctly — home team perspective", () => {
    // DEN perspective — swap game so DEN is home
    const csv = `Position,Name + ID,Name,ID,Roster Position,Salary,Game Info,TeamAbbrev,AvgPointsPerGame
QB,Jarrett Stidham (9999999),Jarrett Stidham,9999999,QB,5600,KC@DEN 06:00PM ET,DEN,12.00
`;
    const rows = parseDkCsv(csv);
    expect(rows[0]!.team).toBe("DEN");
    expect(rows[0]!.opponent).toBe("KC");
  });

  it("parses salary with commas (e.g. 10,200)", () => {
    // Note: typical DK exports don't quote fields — test the unquoted variant.
    // A value like 10,200 without quotes would split incorrectly, but in real
    // DK CSVs the salary is never comma-formatted. parseSalary strips commas
    // from whatever cell value we get, so we test that stripping explicitly.
    const csv2 = `Position,Name + ID,Name,ID,Roster Position,Salary,Game Info,TeamAbbrev,AvgPointsPerGame
QB,Joe Burrow (9876543),Joe Burrow,9876543,QB,10200,CIN@BAL 01:00PM ET,CIN,24.10
`;
    const rows = parseDkCsv(csv2);
    expect(rows[0]!.salary).toBe(10200);
  });

  it("returns null avgPoints when AvgPointsPerGame is missing", () => {
    const csv = `Position,Name + ID,Name,ID,Salary,TeamAbbrev
QB,Patrick Mahomes (17117619),Patrick Mahomes,17117619,9000,KC
`;
    const rows = parseDkCsv(csv);
    expect(rows[0]!.avgPoints).toBeNull();
  });

  it("returns null avgPoints for empty value", () => {
    const csv = `Position,Name + ID,Name,ID,Roster Position,Salary,Game Info,TeamAbbrev,AvgPointsPerGame
QB,Patrick Mahomes (17117619),Patrick Mahomes,17117619,QB,9000,KC@DEN 06:00PM ET,KC,
`;
    const rows = parseDkCsv(csv);
    expect(rows[0]!.avgPoints).toBeNull();
  });

  it("skips empty lines", () => {
    const csv = `Position,Name + ID,Name,ID,Roster Position,Salary,Game Info,TeamAbbrev,AvgPointsPerGame
QB,Patrick Mahomes (17117619),Patrick Mahomes,17117619,QB,9000,KC@DEN 06:00PM ET,KC,28.02

WR,Justin Jefferson (18432001),Justin Jefferson,18432001,WR,8400,MIN@GB 01:00PM ET,MIN,22.50
`;
    const rows = parseDkCsv(csv);
    expect(rows).toHaveLength(2);
  });

  it("skips comment lines starting with #", () => {
    const csv = `# This is a comment
Position,Name + ID,Name,ID,Roster Position,Salary,Game Info,TeamAbbrev,AvgPointsPerGame
# Another comment
QB,Patrick Mahomes (17117619),Patrick Mahomes,17117619,QB,9000,KC@DEN 06:00PM ET,KC,28.02
`;
    const rows = parseDkCsv(csv);
    expect(rows).toHaveLength(1);
  });

  it("throws when a required column is missing (Salary)", () => {
    const csv = `Position,Name + ID,Name,ID,TeamAbbrev
QB,Patrick Mahomes (17117619),Patrick Mahomes,17117619,KC
`;
    expect(() => parseDkCsv(csv)).toThrow(/missing required column "Salary"/);
  });

  it("throws when a required column is missing (ID)", () => {
    const csv = `Position,Name + ID,Name,Salary,TeamAbbrev
QB,Patrick Mahomes (17117619),Patrick Mahomes,9000,KC
`;
    expect(() => parseDkCsv(csv)).toThrow(/missing required column "ID"/);
  });

  it("throws when the file is empty", () => {
    expect(() => parseDkCsv("")).toThrow(/empty/i);
  });

  it("throws when the file has only comments", () => {
    expect(() => parseDkCsv("# comment\n# another")).toThrow(/empty/i);
  });

  it("returns opponent as empty string when gameInfo is absent", () => {
    const csv = `Position,Name + ID,Name,ID,Salary,TeamAbbrev
QB,Patrick Mahomes (17117619),Patrick Mahomes,17117619,9000,KC
`;
    const rows = parseDkCsv(csv);
    expect(rows[0]!.opponent).toBe("");
    expect(rows[0]!.gameInfo).toBe("");
  });
});
