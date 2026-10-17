import { describe, expect, it } from "vitest";
import { computeSequencingVolatility, type SequencingVolatilityResult } from "../sequencing-volatility.js";
import type { SequencingPlay } from "../nflverse-pbp-mapper.js";
import type { DrivePlay } from "../drives.js";

const p = (id: string, gameId: string, season: number, week: number, teamId: string, driveId: number | null, playIndex: number, playType: "pass" | "run"): SequencingPlay => ({
  playId: id,
  gameId,
  season,
  week,
  teamId,
  driveId,
  playIndex,
  playType
});

const d = (id: string, gameId: string, driveId: number | null, posteam: string, playIndex: number): DrivePlay => ({
  playId: id,
  gameId,
  driveId,
  posteam,
  playIndex,
  yardline100: 50,
  pointsScored: 0,
  isSuccess: null,
  epa: null
});

describe("Sequencing Volatility", () => {
  it("computes point-in-time correct windows and team-window floors", () => {
      // we need to set up drives
      const sPlays: SequencingPlay[] = [];
      const dPlays: DrivePlay[] = [];

      let pIdx = 0;
      let globalDriveId = 0;

      const makeDrive = (season: number, week: number, gameId: string, teamId: string, types: ("pass"|"run")[]) => {
          globalDriveId++;
          for (const t of types) {
              const id = `p_${pIdx}`;
              sPlays.push(p(id, gameId, season, week, teamId, globalDriveId, pIdx, t));
              dPlays.push(d(id, gameId, globalDriveId, teamId, pIdx));
              pIdx++;
          }
      };

      // Make 20 drives to meet the floor for team A, all in week 1
      for (let i = 0; i < 20; i++) {
          makeDrive(2025, 1, "g1", "TeamA", ["pass", "pass", "run", "run", "pass", "run"]);
      }

      // Make 5 drives for team B in week 1 (under floor)
      for (let i = 0; i < 5; i++) {
          makeDrive(2025, 1, "g1", "TeamB", ["pass", "pass", "run", "run", "pass", "run"]);
      }

      // Make drives for team A in week 2
      makeDrive(2025, 2, "g2", "TeamA", ["pass", "pass", "run", "run", "pass", "run"]);

      // Make drives for team A in week 3 (target week)
      makeDrive(2025, 3, "g3", "TeamA", ["pass", "pass", "run", "run", "pass", "run"]);

      // Make drives for team A in week 4 (future)
      makeDrive(2025, 4, "g4", "TeamA", ["pass", "pass", "run", "run", "pass", "run"]);

      const results = computeSequencingVolatility(sPlays, dPlays, 2025, 3);
      const teamA = results.find(r => r.teamId === "TeamA")!;
      const teamB = results.find(r => r.teamId === "TeamB")!;

      // Team A should have 21 drives (20 from w1 + 1 from w2)
      expect(teamA.seasonToDate?.drivesUsed).toBe(21);

      // Team B under floor returns null
      expect(teamB.seasonToDate).toBeNull();
  });

  it("calculates entropy degenerate cases and excludes short drives", () => {
      const sPlays: SequencingPlay[] = [];
      const dPlays: DrivePlay[] = [];
      let pIdx = 0;

      // Short drive (<6 plays)
      sPlays.push(p("p1", "g1", 2025, 1, "TeamA", 1, pIdx++, "pass"));
      sPlays.push(p("p2", "g1", 2025, 1, "TeamA", 1, pIdx++, "pass"));
      sPlays.push(p("p3", "g1", 2025, 1, "TeamA", 1, pIdx++, "pass"));
      dPlays.push(d("p1", "g1", 1, "TeamA", pIdx - 3));
      dPlays.push(d("p2", "g1", 1, "TeamA", pIdx - 2));
      dPlays.push(d("p3", "g1", 1, "TeamA", pIdx - 1));

      // All same type -> predictability 1
      for (let i = 0; i < 6; i++) {
        const id = `p_${pIdx}`;
        sPlays.push(p(id, "g1", 2025, 1, "TeamA", 2, pIdx, "pass"));
        dPlays.push(d(id, "g1", 2, "TeamA", pIdx));
        pIdx++;
      }

      // Add 20 more of same type so we have enough
      for (let d_i = 0; d_i < 20; d_i++) {
          for (let i = 0; i < 6; i++) {
            const id = `p_${pIdx}`;
            sPlays.push(p(id, "g1", 2025, 1, "TeamA", d_i + 3, pIdx, "pass"));
            dPlays.push(d(id, "g1", d_i + 3, "TeamA", pIdx));
            pIdx++;
          }
      }

      const results = computeSequencingVolatility(sPlays, dPlays, 2025, 2);
      const teamA = results.find(r => r.teamId === "TeamA")!;
      // Should have 21 drives (short drive excluded)
      expect(teamA.seasonToDate?.drivesUsed).toBe(21);
      expect(teamA.seasonToDate?.meanPredictability).toBe(1);
      expect(teamA.seasonToDate?.volatility).toBe(0);
  });

  it("calculates hand-computed predictability correctly", () => {
      const sPlays: SequencingPlay[] = [];
      const dPlays: DrivePlay[] = [];
      let pIdx = 0;

      // Drive 1: pass, pass, run, run, run, run
      // Transitions (5): P->P, P->R, R->R, R->R, R->R
      // Next counts: P(1), R(4). H(next) = -(1/5 * log2(1/5) + 4/5 * log2(4/5)) = 0.721928
      // currentCounts: P(2), R(3)
      // currentNext P: P->P(1), P->R(1) -> H(next|P) = -(1/2*log2(1/2) + 1/2*log2(1/2)) = 1
      // currentNext R: R->R(3) -> H(next|R) = 0
      // H(next|current) = 2/5 * 1 + 3/5 * 0 = 0.4
      // Predictability 1 = 1 - 0.4 / 0.721928 = 0.4459
      const types1: ("pass"|"run")[] = ["pass", "pass", "run", "run", "run", "run"];
      for (const t of types1) {
          const id = `p_${pIdx}`;
          sPlays.push(p(id, "g1", 2025, 1, "TeamA", 1, pIdx, t));
          dPlays.push(d(id, "g1", 1, "TeamA", pIdx));
          pIdx++;
      }

      // Drive 2: pass, run, pass, run, pass, run
      // Transitions (5): P->R, R->P, P->R, R->P, P->R
      // Next counts: P(2), R(3). H(next) = -(2/5 * log2(2/5) + 3/5 * log2(3/5)) = 0.97095
      // currentCounts: P(3), R(2)
      // currentNext P: P->R(3) -> H(next|P) = 0
      // currentNext R: R->P(2) -> H(next|R) = 0
      // H(next|current) = 0
      // Predictability 2 = 1 - 0 = 1
      const types2: ("pass"|"run")[] = ["pass", "run", "pass", "run", "pass", "run"];
      for (const t of types2) {
          const id = `p_${pIdx}`;
          sPlays.push(p(id, "g1", 2025, 1, "TeamA", 2, pIdx, t));
          dPlays.push(d(id, "g1", 2, "TeamA", pIdx));
          pIdx++;
      }

      // Make 18 more copies of Drive 1 so we pass the 20 drive floor
      for (let i=0; i<18; i++) {
          for (const t of types1) {
              const id = `p_${pIdx}`;
              sPlays.push(p(id, "g1", 2025, 1, "TeamA", i+3, pIdx, t));
              dPlays.push(d(id, "g1", i+3, "TeamA", pIdx));
              pIdx++;
          }
      }

      // Expected stats:
      // Drive 1 predictability: 0.4459
      // Drive 2 predictability: 1.0
      // 18 more Drive 1s: 0.4459
      // Mean = (19 * 0.4459 + 1 * 1.0) / 20 = 0.4736

      const results = computeSequencingVolatility(sPlays, dPlays, 2025, 2);
      const teamA = results.find(r => r.teamId === "TeamA")!;

      expect(teamA.seasonToDate).not.toBeNull();

      const m = teamA.seasonToDate!.meanPredictability;
      expect(Math.abs(m - 0.4736)).toBeLessThan(0.01);

      // shrunk mean: since TeamA is the only team, leagueMean = TeamA mean
      expect(teamA.seasonToDate!.shrunkMeanPredictability).toBe(m);
  });

  it("implements rolling-8 exclusion correctly", () => {
      const sPlays: SequencingPlay[] = [];
      const dPlays: DrivePlay[] = [];
      let pIdx = 0;
      let globalDriveId = 0;

      // Create 9 distinct games for TeamA
      for (let w = 1; w <= 9; w++) {
          const gameId = `g${w}`;
          // 3 drives per game to get enough drives (9*3 = 27)
          for (let d_i = 0; d_i < 3; d_i++) {
              globalDriveId++;
              const types: ("pass"|"run")[] = ["pass", "pass", "run", "run", "pass", "run"];
              for (const t of types) {
                  const id = `p_${pIdx}`;
                  sPlays.push(p(id, gameId, 2025, w, "TeamA", globalDriveId, pIdx, t));
                  dPlays.push(d(id, gameId, globalDriveId, "TeamA", pIdx));
                  pIdx++;
              }
          }
      }

      const results = computeSequencingVolatility(sPlays, dPlays, 2025, 10);
      const teamA = results.find(r => r.teamId === "TeamA")!;

      expect(teamA.seasonToDate?.drivesUsed).toBe(27);
      expect(teamA.rolling8?.drivesUsed).toBe(24); // 8 games * 3 drives
  });

  it("shrinks correctly", () => {
      // Need two teams to have different mean/league mean
      const sPlays: SequencingPlay[] = [];
      const dPlays: DrivePlay[] = [];
      let pIdx = 0;
      let globalDriveId = 0;

      const makeDrive = (teamId: string, types: ("pass"|"run")[]) => {
          globalDriveId++;
          for (const t of types) {
              const id = `p_${pIdx}`;
              sPlays.push(p(id, "g1", 2025, 1, teamId, globalDriveId, pIdx, t));
              dPlays.push(d(id, "g1", globalDriveId, teamId, pIdx));
              pIdx++;
          }
      };

      // Team A: 20 drives of all passes -> predictability 1
      for (let i=0; i<20; i++) {
          makeDrive("TeamA", ["pass", "pass", "pass", "pass", "pass", "pass"]);
      }
      // Team B: 20 drives of alternating -> predictability 1 (as seen above)
      // wait, alternating P, R, P, R, P, R -> H(next)=0.97, H(next|current)=0 -> predictability 1.
      // Let's use a lower predictability drive for B: pass, pass, pass, run, run, run
      // Transitions: P->P, P->P, P->R, R->R, R->R
      // H(next) = -(3/5 log(3/5) + 2/5 log(2/5)) = 0.97
      // H(next|P) = -(2/3 log(2/3) + 1/3 log(1/3)) = 0.918
      // H(next|R) = 0
      // H(next|current) = 3/5 * 0.918 = 0.55
      // Pred = 1 - 0.55/0.97 = 0.43
      for (let i=0; i<20; i++) {
          makeDrive("TeamB", ["pass", "pass", "pass", "run", "run", "run"]);
      }

      const results = computeSequencingVolatility(sPlays, dPlays, 2025, 2);
      const teamA = results.find(r => r.teamId === "TeamA")!;
      const teamB = results.find(r => r.teamId === "TeamB")!;

      const meanA = teamA.seasonToDate!.meanPredictability; // 1
      const meanB = teamB.seasonToDate!.meanPredictability; // ~0.43

      const leagueMean = teamA.seasonToDate!.leagueMeanPredictability; // (1*20 + 0.43*20) / 40 = ~0.715

      expect(meanA).toBe(1);
      expect(meanB).toBeLessThan(1);

      // shrunk mean formula: (drives * mean + 20 * leagueMean) / (drives + 20)
      // For A: (20 * 1 + 20 * 0.715) / 40 = 0.8575
      const expectedShrunkA = (20 * meanA + 20 * leagueMean) / 40;
      expect(teamA.seasonToDate!.shrunkMeanPredictability).toBeCloseTo(expectedShrunkA, 3);
  });

  it("determinisim", () => {
      // Just check the stable output order
      const sPlays: SequencingPlay[] = [];
      const dPlays: DrivePlay[] = [];
      let pIdx = 0;
      let globalDriveId = 0;

      const makeDrive = (teamId: string) => {
          globalDriveId++;
          for (let i=0; i<6; i++) {
              const id = `p_${pIdx}`;
              sPlays.push(p(id, "g1", 2025, 1, teamId, globalDriveId, pIdx, "pass"));
              dPlays.push(d(id, "g1", globalDriveId, teamId, pIdx));
              pIdx++;
          }
      };

      for (let i=0; i<20; i++) {
          makeDrive("BTeam");
          makeDrive("ATeam");
      }

      const results = computeSequencingVolatility(sPlays, dPlays, 2025, 2);
      expect(results[0]!.teamId).toBe("ATeam");
      expect(results[1]!.teamId).toBe("BTeam");
  });
});
