import { describe, expect, it } from "vitest";
import {
  mulberry32,
  synthesizeSeasonFilm,
  runFilmBacktest2024,
} from "./film-backtest-2024.js";

describe("mulberry32", () => {
  it("is deterministic per seed", () => {
    const a = mulberry32(2024);
    const b = mulberry32(2024);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe("synthesizeSeasonFilm", () => {
  it("generates a plausible deterministic season", () => {
    const s1 = synthesizeSeasonFilm(2024, 2024);
    const s2 = synthesizeSeasonFilm(2024, 2024);
    expect(s1.plays.length).toBe(s2.plays.length);
    expect(s1.plays.length).toBeGreaterThan(400);
    expect(s1.plays[0]).toEqual(s2.plays[0]);
    // actuals are graded for every rostered player
    expect(Object.keys(s1.actualReceivingYards).length).toBe(16);
  });
});

describe("runFilmBacktest2024", () => {
  it("runs the full bridge end-to-end on the REAL engine", () => {
    const result = runFilmBacktest2024(2024, 2024);
    expect(result.season).toBe(2024);
    expect(result.nPlays).toBeGreaterThan(400);
    expect(result.nPlayers).toBeGreaterThan(0);
    expect(result.rows.length).toBe(result.nPlayers);

    for (const row of result.rows) {
      // honesty contract holds on every row
      expect(row.weight).toBe(0);
      expect(row.calibration).toBe("UNCALIBRATED");
      expect(row.blendedProb).toBe(row.controlProb);
      expect(row.delta).toBe(0);
      expect(row.lane).toBe("props");
      expect(row.market).toBe("anytime_td");
      // graded: actuals flowed through from the synthetic season
      expect(row.actual).not.toBeNull();
      expect([0, 1]).toContain(row.actual);
      // engine probabilities are sane
      expect(row.controlProb).toBeGreaterThanOrEqual(0);
      expect(row.controlProb).toBeLessThanOrEqual(1);
    }
  });

  it("treatment arm actually differs from control (film moves the inputs)", () => {
    const result = runFilmBacktest2024(2024, 2024);
    const differing = result.rows.filter(
      (r) => r.wouldBeDeltaW1 !== 0,
    );
    // film overrides usage/red-zone shares, so most rows should differ
    expect(differing.length).toBeGreaterThan(result.rows.length / 2);
  });
});
