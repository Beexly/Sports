import { describe, expect, it } from "vitest";
import {
  getMlbIndependentModelProb,
  MLB_INDEPENDENT_MODEL_ENABLED,
  MLB_INDEPENDENT_MODEL_MODE,
  MLB_INDEPENDENT_MODEL_VERSION,
  type MlbIndependentModelInput,
} from "../mlb-independent-model.js";

const input = (target: MlbIndependentModelInput["target"]): MlbIndependentModelInput => ({
  gameId: "mlb-shadow-001",
  target,
  pitcher: {
    home: {
      starterId: "home-starter",
      sourceId: "baseball-savant",
      restDays: 4,
      runsAllowedPerNine: 3.2,
      inningsPerStart: 6.1,
      starts: 18,
      asOf: "2026-09-23T17:00:00.000Z",
    },
    away: {
      starterId: "away-starter",
      sourceId: "baseball-savant",
      restDays: 3,
      runsAllowedPerNine: 3.8,
      inningsPerStart: 5.9,
      starts: 20,
      asOf: "2026-09-23T17:00:00.000Z",
    },
  },
  park: {
    parkId: "shadow-park",
    sourceId: "retrosheet",
    runsPerGameFactor: 1.04,
    handednessFactor: 1.01,
    roofStatus: "open",
    sampleSize: 240,
    asOf: "2026-09-23T17:00:00.000Z",
  },
  lineup: {
    home: {
      playerIds: ["home-1", "home-2", "home-3"],
      sourceId: "retrosheet",
      status: "projected",
      projectedShare: 0.75,
      asOf: "2026-09-23T17:00:00.000Z",
    },
    away: {
      playerIds: ["away-1", "away-2", "away-3"],
      sourceId: "retrosheet",
      status: "confirmed",
      projectedShare: 1,
      asOf: "2026-09-23T17:00:00.000Z",
    },
  },
  weather: {
    sourceId: "nws-weather",
    temperatureF: 71,
    windSpeedMph: 8,
    outwardWindMph: 3,
    precipitationProbability: 0.1,
    precipitationType: "none",
    asOf: "2026-09-23T17:00:00.000Z",
  },
  teamRatings: {
    home: {
      teamId: "home-team",
      sourceId: "retrosheet",
      offenseRating: 0.12,
      defenseRating: 0.04,
      gamesUsed: 150,
      asOf: "2026-09-23T17:00:00.000Z",
    },
    away: {
      teamId: "away-team",
      sourceId: "retrosheet",
      offenseRating: -0.03,
      defenseRating: 0.09,
      gamesUsed: 150,
      asOf: "2026-09-23T17:00:00.000Z",
    },
  },
  totalLine: 8.5,
});

describe("MLB independent model shadow scaffold", () => {
  it("is disabled and shadow-only by default", () => {
    expect(MLB_INDEPENDENT_MODEL_ENABLED).toBe(false);
    expect(MLB_INDEPENDENT_MODEL_MODE).toBe("shadow");
    expect(MLB_INDEPENDENT_MODEL_VERSION).toBe("mlb-independent-shadow-v0");
  });

  it("returns no probability or forecast before the model is enabled", () => {
    const result = getMlbIndependentModelProb(input("over"));

    expect(result.target).toBe("over");
    expect(result.status).toBe("shadow");
    expect(result.enabled).toBe(false);
    expect(result.modelProb).toBeNull();
    expect(result.expectedHomeRuns).toBeNull();
    expect(result.expectedAwayRuns).toBeNull();
    expect(result.expectedTotalRuns).toBeNull();
    expect(result.runDistribution).toBeNull();
    expect(result.reason).toBe("MODEL_DISABLED");
  });

  it("cannot produce a publishable result", () => {
    expect(getMlbIndependentModelProb(input("home-win")).publishable).toBe(false);
  });

  it("accepts every initial target without fabricating a market fallback", () => {
    for (const target of ["home-win", "away-win", "over", "under"] as const) {
      const result = getMlbIndependentModelProb(input(target));
      expect(result.modelProb).toBeNull();
      expect(result.publishable).toBe(false);
    }
  });
});
