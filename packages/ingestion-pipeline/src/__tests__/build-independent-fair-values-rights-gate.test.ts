import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Proves the package-level rights gate around the ESPN Power Index (FPI)
 * independent source in buildIndependentFairValues.
 *
 * Rights basis: the registry entry "espn-public-api" clears ESPN facts only
 * (scores, fixtures). FPI is a proprietary prediction. The gate fails closed:
 * with ESPN_POWERINDEX_LICENSED unset the network client must never be called;
 * with the exact string "true" it is.
 *
 * Mock pattern copied from process-sport.test.ts (full @sports/data-ingestion
 * stub; @sports/db stubbed so the Elo and EPA steps see no rows).
 */

const mocks = vi.hoisted(() => ({
  getCachedEspnPowerIndexMap: vi.fn<
    (league: string, season: number) => Promise<Map<string, number>>
  >(),
  sportKeyToPowerIndexLeague: vi.fn<(sportKey: string) => string | null>(),
  lookupTeamFpi: vi.fn<(map: Map<string, number>, team: string) => number | null>(),
  powerIndexToIndependentFairValue: vi.fn(),
  teamGameLogFindMany: vi.fn().mockResolvedValue([]),
  teamGameEfficiencyFindMany: vi.fn().mockResolvedValue([]),
}));

vi.mock("@sports/db", () => ({
  db: {
    teamGameLog: { findMany: mocks.teamGameLogFindMany },
    teamGameEfficiency: { findMany: mocks.teamGameEfficiencyFindMany },
  },
}));

vi.mock("@sports/data-ingestion", () => ({
  getTeamScoringRecords: vi.fn().mockResolvedValue([]),
  getLeagueAverageScored: vi.fn().mockResolvedValue(null),
  KalshiClient: vi.fn().mockImplementation(() => ({
    getFairValue: vi.fn().mockResolvedValue(null),
  })),
  toIndependentFairValue: vi.fn().mockReturnValue({
    source: "kalshi",
    homeFairProb: null,
    awayFairProb: null,
  }),
  sportKeyToPowerIndexLeague: mocks.sportKeyToPowerIndexLeague,
  getCachedEspnPowerIndexMap: mocks.getCachedEspnPowerIndexMap,
  lookupTeamFpi: mocks.lookupTeamFpi,
  defaultPowerIndexSeason: vi.fn().mockReturnValue(2026),
  sportKeyToKalshiLeagueCode: vi.fn().mockReturnValue(null),
  getSharedClubEloClient: vi.fn(),
  isClubEloSport: vi.fn().mockReturnValue(false),
  isIngestible: vi.fn().mockReturnValue(false),
  isPolymarketIndependentEnabled: vi.fn().mockReturnValue(false),
  PolymarketIndependentClient: vi.fn(),
  fetchMlbStandings: vi.fn().mockResolvedValue([]),
  buildMlbWinPctLookup: vi.fn().mockReturnValue(new Map()),
  lookupMlbWinPct: vi.fn().mockReturnValue(null),
}));

vi.mock("@sports/prediction-engine", () => ({
  isPoissonValidSport: vi.fn().mockReturnValue(false),
  poissonIndependentFairValue: vi.fn().mockReturnValue(null),
  isDixonColesValidSport: vi.fn().mockReturnValue(false),
  dixonColesIndependentFairValue: vi.fn().mockReturnValue(null),
  skellamCoverFairValue: vi.fn().mockReturnValue(null),
  SKELLAM_COVER_SOURCE: "skellam_cover",
  fitEloRatingsFromResults: vi.fn().mockReturnValue(new Map()),
  eloFairValueFromRatings: vi.fn().mockReturnValue(null),
  powerIndexToIndependentFairValue: mocks.powerIndexToIndependentFairValue,
  standingsWinPctToIndependentFairValue: vi.fn().mockReturnValue(null),
  nflEpaToIndependentFairValue: vi.fn().mockReturnValue(null),
  opponentAdjustedRatings: vi.fn().mockReturnValue([]),
}));

import {
  buildIndependentFairValues,
  type IndependentFairValueBuildInput,
} from "../build-independent-fair-values.js";
import { ESPN_POWERINDEX_LICENSE_ENV } from "../independent-source-rights.js";

const FIXED_NOW = new Date("2026-09-05T12:00:00Z");

function nflInput(
  overrides: Partial<IndependentFairValueBuildInput> = {},
): IndependentFairValueBuildInput {
  return {
    sportKey: "americanfootball_nfl",
    homeTeam: "Kansas City Chiefs",
    awayTeam: "Buffalo Bills",
    commenceTime: new Date("2026-09-06T17:00:00Z"),
    now: () => FIXED_NOW,
    ...overrides,
  };
}

const FPI_ROW = {
  source: "espn_powerindex",
  homeFairProb: 0.58,
  awayFairProb: 0.42,
  capturedAt: FIXED_NOW.toISOString(),
};

describe("buildIndependentFairValues: ESPN Power Index rights gate", () => {
  const originalEnv = process.env[ESPN_POWERINDEX_LICENSE_ENV];

  beforeEach(() => {
    mocks.getCachedEspnPowerIndexMap.mockReset();
    mocks.getCachedEspnPowerIndexMap.mockResolvedValue(
      new Map([
        ["Kansas City Chiefs", 6.1],
        ["Buffalo Bills", 4.9],
      ]),
    );
    mocks.sportKeyToPowerIndexLeague.mockReset();
    mocks.sportKeyToPowerIndexLeague.mockReturnValue("nfl");
    mocks.lookupTeamFpi.mockReset();
    mocks.lookupTeamFpi.mockImplementation((map, team) => map.get(team) ?? null);
    mocks.powerIndexToIndependentFairValue.mockReset();
    mocks.powerIndexToIndependentFairValue.mockReturnValue(FPI_ROW);
    delete process.env[ESPN_POWERINDEX_LICENSE_ENV];
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env[ESPN_POWERINDEX_LICENSE_ENV];
    } else {
      process.env[ESPN_POWERINDEX_LICENSE_ENV] = originalEnv;
    }
  });

  it("never calls the FPI client when the env is unset (default closed)", async () => {
    const out = await buildIndependentFairValues(nflInput({ env: {} }));

    expect(mocks.getCachedEspnPowerIndexMap).not.toHaveBeenCalled();
    expect(mocks.powerIndexToIndependentFairValue).not.toHaveBeenCalled();
    expect(out.some((fv) => fv.source === "espn_powerindex")).toBe(false);
  });

  it("stays closed for near-miss values such as 1, TRUE, yes", async () => {
    for (const value of ["1", "TRUE", "yes", "on"]) {
      const out = await buildIndependentFairValues(
        nflInput({ env: { [ESPN_POWERINDEX_LICENSE_ENV]: value } }),
      );
      expect(out.some((fv) => fv.source === "espn_powerindex")).toBe(false);
    }
    expect(mocks.getCachedEspnPowerIndexMap).not.toHaveBeenCalled();
  });

  it("calls the FPI client and emits the row when the env is exactly \"true\"", async () => {
    const out = await buildIndependentFairValues(
      nflInput({ env: { [ESPN_POWERINDEX_LICENSE_ENV]: "true" } }),
    );

    expect(mocks.getCachedEspnPowerIndexMap).toHaveBeenCalledTimes(1);
    expect(mocks.getCachedEspnPowerIndexMap).toHaveBeenCalledWith("nfl", 2026);
    expect(mocks.powerIndexToIndependentFairValue).toHaveBeenCalledWith(
      { homeFpi: 6.1, awayFpi: 4.9, sportKey: "americanfootball_nfl" },
      { now: expect.any(Function) },
    );
    expect(out.filter((fv) => fv.source === "espn_powerindex")).toEqual([FPI_ROW]);
  });

  it("falls back to process.env when no env is injected: unset stays closed", async () => {
    await buildIndependentFairValues(nflInput());
    expect(mocks.getCachedEspnPowerIndexMap).not.toHaveBeenCalled();
  });

  it("falls back to process.env when no env is injected: \"true\" opens", async () => {
    process.env[ESPN_POWERINDEX_LICENSE_ENV] = "true";
    const out = await buildIndependentFairValues(nflInput());
    expect(mocks.getCachedEspnPowerIndexMap).toHaveBeenCalledTimes(1);
    expect(out.some((fv) => fv.source === "espn_powerindex")).toBe(true);
  });

  it("skipNetworkIndependents still wins even when the license env is set", async () => {
    await buildIndependentFairValues(
      nflInput({
        skipNetworkIndependents: true,
        env: { [ESPN_POWERINDEX_LICENSE_ENV]: "true" },
      }),
    );
    expect(mocks.getCachedEspnPowerIndexMap).not.toHaveBeenCalled();
  });

  it("leaves the other independents untouched when the gate is closed", async () => {
    // Elo step still runs (db is consulted); the closed FPI gate only removes step 3.
    await buildIndependentFairValues(nflInput({ env: {} }));
    expect(mocks.teamGameLogFindMany).toHaveBeenCalled();
  });
});
