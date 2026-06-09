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

  it("excludes postseason plays (season_type != REG) so the baseline stays regular-season-repeatable", () => {
    // Real pbp mixes season_type REG and POST. Only the ~14 playoff teams play
    // POST, so blending it in would skew their per-team EPA and the within-league
    // percentiles. We add a wildly skewed POST play for TMA that, if counted,
    // would blow up its offensive EPA and PROE.
    const withPost: CsvRecord[] = [
      { posteam: "TMA", defteam: "TMB", season_type: "REG", down: "1", wp: "0.50", qtr: "1", pass: "1", rush: "0", epa: "0.5", success: "1", pass_oe: "10", no_huddle: "0" },
      { posteam: "TMA", defteam: "TMB", season_type: "REG", down: "2", wp: "0.40", qtr: "2", pass: "1", rush: "0", epa: "0.3", success: "1", pass_oe: "20", no_huddle: "1" },
      { posteam: "TMA", defteam: "TMB", season_type: "REG", down: "1", wp: "0.60", qtr: "3", pass: "0", rush: "1", epa: "-0.1", success: "0", pass_oe: "30", no_huddle: "0" },
      // EXCLUDED: postseason. Neutral/early-down/pre-Q4 so it would otherwise
      // count, but season_type POST must drop it before anything is tallied.
      { posteam: "TMA", defteam: "TMB", season_type: "POST", down: "1", wp: "0.50", qtr: "1", pass: "1", rush: "0", epa: "9", success: "1", pass_oe: "999", no_huddle: "1" },
      { posteam: "TMB", defteam: "TMA", season_type: "REG", down: "1", wp: "0.50", qtr: "1", pass: "1", rush: "0", epa: "-0.2", success: "0", pass_oe: "5", no_huddle: "0" },
      { posteam: "TMB", defteam: "TMA", season_type: "REG", down: "2", wp: "0.50", qtr: "2", pass: "0", rush: "1", epa: "0.1", success: "1", pass_oe: "15", no_huddle: "0" },
    ];

    const rows = buildTeamEnvironment(withPost, 2);
    const tma = rows.find((r) => r.team === "TMA")!;
    expect(tma).toBeDefined();

    // Only the three REG plays count — the POST play drops out entirely.
    expect(tma.offPlays).toBe(3);
    expect(tma.offScrimmagePlays).toBe(3);
    // PROE = mean(pass_oe) over the three REG plays = (10 + 20 + 30) / 3 = 20.
    // The POST row's pass_oe 999 must not leak in.
    expect(tma.proe).toBe(20);
    // The POST row's epa of 9 must not contaminate offensive EPA/play.
    expect(tma.offEpaPerPlay).toBe(0.233);
  });
});

/**
 * A1 situational metrics. These accrue over ALL of a team's offensive scrimmage
 * plays (posteam), not just the neutral-script slice, and each is null when its
 * backing column is absent (honest dash, never fabricated).
 */
describe("buildTeamEnvironment — A1 situational metrics", () => {
  // TMC takes EVERY offensive snap (so it clears minPlays on offense), and TMD
  // both supplies the defensive sample TMC needs to qualify AND takes its own
  // snaps. We give each row the widened A1 columns.
  function offPlay(over: Record<string, string>): Record<string, string> {
    return {
      posteam: "TMC", defteam: "TMD", down: "1", wp: "0.5", qtr: "1",
      pass: "1", rush: "0", epa: "0.1", success: "1", pass_oe: "0", no_huddle: "0",
      ydstogo: "10", yardline_100: "50", yards_gained: "5", air_yards: "5",
      yards_after_catch: "0", cpoe: "2", xpass: "0.5", qb_dropback: "1",
      shotgun: "1", score_differential: "0", third_down_converted: "0",
      third_down_failed: "0", series_success: "1", game_id: "G1",
      fixed_drive: "1", fixed_drive_result: "Touchdown", play_type: "pass",
      ...over,
    };
  }

  function build(n: number, factory: (i: number) => Record<string, string>) {
    return Array.from({ length: n }, (_, i) => factory(i));
  }

  it("computes explosive rate, success rate, shotgun rate, CPOE and red-zone EPA from real fields", () => {
    // 40 offensive plays for TMC. Half are explosive (epa 1.0), half are not
    // (epa 0.0, short gain). All shotgun, all carry cpoe=2, all success=1.
    const plays = build(40, (i) =>
      offPlay({
        epa: i < 20 ? "1.0" : "0.0",
        yards_gained: i < 20 ? "20" : "3",
        success: i < 20 ? "1" : "0",
        // 10 of them are red-zone snaps inside the 20.
        yardline_100: i < 10 ? "10" : "50",
      }),
    );
    // Defensive sample so TMC qualifies (TMD as posteam vs TMC defense).
    const defSample = build(40, () => offPlay({ posteam: "TMD", defteam: "TMC" }));

    const rows = buildTeamEnvironment([...plays, ...defSample], 30);
    const tmc = rows.find((r) => r.team === "TMC")!;
    expect(tmc).toBeDefined();

    expect(tmc.offScrimmagePlays).toBe(40);
    expect(tmc.explosiveRate).toBe(0.5); // 20 of 40 explosive
    expect(tmc.successRate).toBe(0.5); // 20 of 40 success
    expect(tmc.shotgunRate).toBe(1); // every play shotgun
    expect(tmc.cpoe).toBe(2); // mean cpoe
    // Red-zone EPA = mean epa over the 10 inside-20 snaps, all of which are epa 1.0.
    expect(tmc.redZonePlays).toBe(10);
    expect(tmc.redZoneEpaPerPlay).toBe(1);
  });

  it("computes 3rd-down conversion only from converted/failed plays and drive-score rate per unique drive", () => {
    // 30 first-down plays + a handful of 3rd-down plays (3 converted, 1 failed).
    const base = build(30, () => offPlay({ down: "1" }));
    const thirdDowns = [
      offPlay({ down: "3", third_down_converted: "1", third_down_failed: "0" }),
      offPlay({ down: "3", third_down_converted: "1", third_down_failed: "0" }),
      offPlay({ down: "3", third_down_converted: "1", third_down_failed: "0" }),
      offPlay({ down: "3", third_down_converted: "0", third_down_failed: "1" }),
    ];
    // Two distinct drives: drive 1 = Touchdown (scored), drive 2 = Punt (not).
    const driveTagged = [
      offPlay({ game_id: "G1", fixed_drive: "1", fixed_drive_result: "Touchdown" }),
      offPlay({ game_id: "G1", fixed_drive: "2", fixed_drive_result: "Punt" }),
    ];
    const defSample = build(30, () => offPlay({ posteam: "TMD", defteam: "TMC" }));

    const rows = buildTeamEnvironment([...base, ...thirdDowns, ...driveTagged, ...defSample], 30);
    const tmc = rows.find((r) => r.team === "TMC")!;

    // 3rd-down conv = 3 of 4 plays that carried a converted/failed flag.
    expect(tmc.thirdDownConvRate).toBe(0.75);
    // base + driveTagged all share G1/drive 1 (Touchdown) → one scored drive;
    // driveTagged adds G1/drive 2 (Punt). Two unique drives, one scored.
    expect(tmc.driveScoreRate).toBe(0.5);
  });

  it("returns null situational metrics when the backing columns are absent (no fabrication)", () => {
    // Plays with ONLY the neutral-script core columns — none of the A1 fields.
    const core = (over: Record<string, string>): Record<string, string> => ({
      posteam: "TME", defteam: "TMF", down: "1", wp: "0.5", qtr: "1",
      pass: "1", rush: "0", epa: "0.1", success: "1", pass_oe: "0", no_huddle: "0",
      ...over,
    });
    const off = build(30, () => core({}));
    const def = build(30, () => core({ posteam: "TMF", defteam: "TME" }));

    const rows = buildTeamEnvironment([...off, ...def], 30);
    const tme = rows.find((r) => r.team === "TME")!;
    expect(tme).toBeDefined();

    // success exists in the core, so successRate is real; epa exists so explosive
    // can be classified. But shotgun/cpoe/3rd-down/drive/red-zone columns are all
    // absent → honest null, never a fabricated 0.
    expect(tme.shotgunRate).toBeNull();
    expect(tme.cpoe).toBeNull();
    expect(tme.thirdDownConvRate).toBeNull();
    expect(tme.driveScoreRate).toBeNull();
    expect(tme.redZoneEpaPerPlay).toBeNull();
    expect(tme.redZonePlays).toBe(0);
  });
});
