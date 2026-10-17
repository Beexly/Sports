import { describe, it, expect } from "vitest";
import { evaluateArxivCorpus, type ArxivContextQuery } from "../arxiv-reasoning-bridge.js";

describe("arxiv-reasoning-bridge", () => {
  it("consults the full 2,179-paper and 429-dataset corpus", () => {
    const ctx: ArxivContextQuery = {
      sport: "NFL",
      homeTeam: "Kansas City Chiefs",
      awayTeam: "Denver Broncos",
      restDaysHome: 7,
      restDaysAway: 7,
      weatherWindMph: 5,
      altitudeFt: 800,
    };

    const res = evaluateArxivCorpus(ctx);
    expect(res.totalCorpusPapersIndexed).toBe(2179);
    expect(res.totalKaggleDatasetsIndexed).toBe(429);
    expect(res.situationalReasoningSynthesis).toContain("all situational and environmental parameters within neutral baseline");
  });

  it("detects Navier-Stokes barometric expansion and hypoxia in Denver elevation", () => {
    const ctx: ArxivContextQuery = {
      sport: "NFL",
      homeTeam: "Denver Broncos",
      awayTeam: "Seattle Seahawks",
      restDaysHome: 7,
      restDaysAway: 4,
      altitudeFt: 5280,
      styleMatchup: "PRESSURE_VS_PASS_HEAVY",
    };

    const res = evaluateArxivCorpus(ctx);
    expect(res.activePremisesCount).toBeGreaterThanOrEqual(4);
    expect(res.situationalReasoningSynthesis).toContain("Barometric air density reduced by 15-18%");
    expect(res.situationalReasoningSynthesis).toContain("Altitude hypoxia threshold exceeded");
  });

  it("detects auditory crowd acoustics referee pressure in enclosed domes", () => {
    const ctx: ArxivContextQuery = {
      sport: "NFL",
      homeTeam: "New Orleans Saints",
      awayTeam: "Atlanta Falcons",
      restDaysHome: 7,
      restDaysAway: 7,
      isDomeOrBowl: true,
      crowdDecibelsExpected: 106,
    };

    const res = evaluateArxivCorpus(ctx);
    expect(res.activePremisesCount).toBeGreaterThanOrEqual(1);
    expect(res.situationalReasoningSynthesis).toContain("Enclosed acoustic amplifier");
    expect(res.situationalReasoningSynthesis).toContain("referee 3rd-down pass interference whistle skews home");
  });

  it("detects circadian travel dysrhythmia on West-to-East travel", () => {
    const ctx: ArxivContextQuery = {
      sport: "NFL",
      homeTeam: "Miami Dolphins",
      awayTeam: "Seattle Seahawks",
      restDaysHome: 7,
      restDaysAway: 7,
      timeZoneDifferenceHours: 3,
    };

    const res = evaluateArxivCorpus(ctx);
    expect(res.activePremisesCount).toBeGreaterThanOrEqual(1);
    expect(res.situationalReasoningSynthesis).toContain("Circadian disruption");
  });
});
