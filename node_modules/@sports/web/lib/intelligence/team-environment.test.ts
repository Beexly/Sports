import { describe, expect, it } from "vitest";
import { buildTeamEnvironment } from "./team-environment";

type CsvRecord = Record<string, string>;

/**
 * Tiny synthetic play-by-play fixture. Columns mirror the real nflverse pbp
 * names the builder reads. TMA and TMB face each other, so each team accrues both
 * offensive (posteam) and defensive (defteam) plays. Play #4 is a fourth-quarter
 * play that the neutral-script filter must EXCLUDE — its absurd pass_oe of 999
 * would blow up TMA's PROE if it were (wrongly) counted.
 */
const PLAYS: CsvRecord[] = [
  // TMA offense vs TMB defense — three neutral, early-down, pre-Q4 plays.
  { posteam: "TMA", defteam: "TMB", down: "1", wp: "0.50", qtr: "1", pass: "1", rush: "0", epa: "0.5", success: "1", pass_oe: "10", no_huddle: "0" },
  { posteam: "TMA", defteam: "TMB", down: "2", wp: "0.40", qtr: "2", pass: "1", rush: "0", epa: "0.3", success: "1", pass_oe: "20", no_huddle: "1" },
  { posteam: "TMA", defteam: "TMB", down: "1", wp: "0.60", qtr: "3", pass: "0", rush: "1", epa: "-0.1", success: "0", pass_oe: "30", no_huddle: "0" },
  // EXCLUDED: fourth quarter. Must not touch TMA's offense or PROE.
  { posteam: "TMA", defteam: "TMB", down: "1", wp: "0.50", qtr: "4", pass: "1", rush: "0", epa: "9", success: "1", pass_oe: "999", no_huddle: "1" },
  // TMB offense vs TMA defense — two neutral, early-down, pre-Q4 plays.
  { posteam: "TMB", defteam: "TMA", down: "1", wp: "0.50", qtr: "1", pass: "1", rush: "0", epa: "-0.2", success: "0", pass_oe: "5", no_huddle: "0" },
  { posteam: "TMB", defteam: "TMA", down: "2", wp: "0.50", qtr: "2", pass: "0", rush: "1", epa: "0.1", success: "1", pass_oe: "15", no_huddle: "0" },
];

describe("buildTeamEnvironment", () => {
  it("excludes fourth-quarter plays and computes PROE as mean(pass_oe) over the neutral filter", () => {
    const rows = buildTeamEnvironment(PLAYS, 2);

    const tma = rows.find((r) => r.team === "TMA");
    expect(tma).toBeDefined();

    // Only the three pre-Q4 neutral plays count on offense — the qtr-4 play drops out.
    expect(tma!.offPlays).toBe(3);
    // PROE = mean(pass_oe) over those three plays = (10 + 20 + 30) / 3 = 20.
    // If the qtr-4 row (pass_oe 999) leaked in, this would be far higher.
    expect(tma!.proe).toBe(20);
    // The excluded qtr-4 play's epa of 9 must not contaminate offensive EPA/play.
    // (Builder rounds to 3 decimals: (0.5 + 0.3 - 0.1) / 3 = 0.2333… -> 0.233.)
    expect(tma!.offEpaPerPlay).toBe(0.233);
  });

  it("attributes defensive plays to the defteam and keeps offense/defense separate", () => {
    const rows = buildTeamEnvironment(PLAYS, 2);

    const tma = rows.find((r) => r.team === "TMA")!;
    const tmb = rows.find((r) => r.team === "TMB")!;

    // TMA defends TMB's two neutral plays; TMB defends TMA's three neutral plays.
    expect(tma.defPlays).toBe(2);
    expect(tmb.offPlays).toBe(2);
    expect(tmb.defPlays).toBe(3);

    // TMA defensive EPA/play is the mean of TMB's offensive EPA on those plays.
    expect(tma.defEpaPerPlay).toBeCloseTo((-0.2 + 0.1) / 2, 6);

    // Within-league offensive EPA percentile: TMA (better offense) ranks above TMB.
    expect(tma.offEpaPct).toBeGreaterThan(tmb.offEpaPct);
  });

  it("returns no rows when a team lacks the minimum neutral-script sample", () => {
    // Default minPlays (30) cannot be met by a six-play fixture.
    expect(buildTeamEnvironment(PLAYS)).toEqual([]);
  });
});
