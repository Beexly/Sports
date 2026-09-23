import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Flag-gated external power-ratings fair values (research corpus + TeamRankings).
 * Both sources are disabled-by-default: unset env must yield null with zero
 * side effects (no filesystem read, no network).
 */

const mocks = vi.hoisted(() => ({
  loadResearchPowerRatings: vi.fn(),
  lookupResearchRating: vi.fn(),
  isResearchPowerRatingsEnabled: vi.fn(),
  TeamRankingsClient: vi.fn(),
  isIngestible: vi.fn(),
  envFlagEnabled: vi.fn(),
  powerRatingsToIndependentFairValue: vi.fn(),
  winPctVsAverageToIndependentFairValue: vi.fn(),
  resolveKalshiTeamAbbr: vi.fn(),
}));

vi.mock("@sports/data-ingestion", () => ({
  isResearchPowerRatingsEnabled: (...a: unknown[]) => mocks.isResearchPowerRatingsEnabled(...a),
  loadResearchPowerRatings: (...a: unknown[]) => mocks.loadResearchPowerRatings(...a),
  lookupResearchRating: (...a: unknown[]) =>
    mocks.lookupResearchRating(...(a as [unknown, string])),
  RESEARCH_POWER_RATINGS_SOURCE: "research_power_ratings",
  TeamRankingsClient: mocks.TeamRankingsClient,
  TEAMRANKINGS_RATINGS_ATTRIBUTION: "Power ratings via TeamRankings.",
  TEAMRANKINGS_RATINGS_SOURCE_ID: "teamrankings-ratings",
  isIngestible: (...a: unknown[]) => mocks.isIngestible(...a),
  envFlagEnabled: (...a: unknown[]) =>
    mocks.envFlagEnabled(...(a as [NodeJS.ProcessEnv, string])),
}));

vi.mock("@sports/prediction-engine", () => ({
  powerRatingsToIndependentFairValue: (...a: unknown[]) =>
    mocks.powerRatingsToIndependentFairValue(...a),
  winPctVsAverageToIndependentFairValue: (...a: unknown[]) =>
    mocks.winPctVsAverageToIndependentFairValue(...a),
}));

vi.mock("./kalshi-team-abbr.js", () => ({
  resolveKalshiTeamAbbr: (...a: unknown[]) => mocks.resolveKalshiTeamAbbr(...(a as [])),
}));

import {
  isTeamRankingsFairValueEnabled,
  resetExternalRatingsCachesForTests,
  tryResearchPowerRatingsFairValue,
  tryTeamRankingsFairValue,
} from "../external-ratings-fair-value.js";

const FIXED_NOW = new Date("2026-09-23T12:00:00Z");

const NFL_INPUT = {
  sportKey: "americanfootball_nfl",
  homeTeam: "Buffalo Bills",
  awayTeam: "Miami Dolphins",
  now: () => FIXED_NOW,
};

const FV = {
  source: "research_power_ratings",
  homeFairProb: 0.7,
  awayFairProb: 0.3,
  capturedAt: FIXED_NOW.toISOString(),
};

beforeEach(() => {
  resetExternalRatingsCachesForTests();
  mocks.loadResearchPowerRatings.mockReset();
  mocks.lookupResearchRating.mockReset();
  mocks.isResearchPowerRatingsEnabled.mockReset();
  mocks.TeamRankingsClient.mockReset();
  mocks.isIngestible.mockReset();
  mocks.envFlagEnabled.mockReset();
  mocks.powerRatingsToIndependentFairValue.mockReset();
  mocks.winPctVsAverageToIndependentFairValue.mockReset();
  mocks.resolveKalshiTeamAbbr.mockReset();
  mocks.isIngestible.mockReturnValue(true);
  mocks.powerRatingsToIndependentFairValue.mockReturnValue(FV);
});

afterEach(() => {
  resetExternalRatingsCachesForTests();
});

describe("tryResearchPowerRatingsFairValue — default OFF", () => {
  it("returns null and never loads when the flag is unset", async () => {
    mocks.isResearchPowerRatingsEnabled.mockReturnValue(false);
    const out = await tryResearchPowerRatingsFairValue({ ...NFL_INPUT, env: {} });
    expect(out).toBeNull();
    expect(mocks.loadResearchPowerRatings).not.toHaveBeenCalled();
  });

  it("returns null for non-NFL sports even when flagged", async () => {
    mocks.isResearchPowerRatingsEnabled.mockReturnValue(true);
    const out = await tryResearchPowerRatingsFairValue({
      ...NFL_INPUT,
      sportKey: "baseball_mlb",
      env: { RESEARCH_POWER_RATINGS_ENABLED: "true" },
    });
    expect(out).toBeNull();
    expect(mocks.loadResearchPowerRatings).not.toHaveBeenCalled();
  });

  it("emits a points-vs-average fair value when both ratings exist", async () => {
    mocks.isResearchPowerRatingsEnabled.mockReturnValue(true);
    mocks.loadResearchPowerRatings.mockResolvedValue({
      teams: new Map(),
      asOf: FIXED_NOW.toISOString(),
      source: "research_power_ratings",
      rowCount: 2,
    });
    mocks.lookupResearchRating.mockImplementation((_t: unknown, name: string) =>
      name.includes("Buffalo")
        ? { team: "BUF", rating: 5.8, winPctVsAvg: 0.7, rank: 1 }
        : { team: "MIA", rating: -8.0, winPctVsAvg: 0.2, rank: 32 },
    );
    const out = await tryResearchPowerRatingsFairValue({
      ...NFL_INPUT,
      env: { RESEARCH_POWER_RATINGS_ENABLED: "true" },
    });
    expect(out).toEqual(FV);
    expect(mocks.powerRatingsToIndependentFairValue).toHaveBeenCalled();
    expect(mocks.winPctVsAverageToIndependentFairValue).not.toHaveBeenCalled();
  });

  it("falls back to win%-vs-average when points are missing", async () => {
    mocks.isResearchPowerRatingsEnabled.mockReturnValue(true);
    mocks.loadResearchPowerRatings.mockResolvedValue({
      teams: new Map(),
      asOf: FIXED_NOW.toISOString(),
      source: "research_power_ratings",
      rowCount: 2,
    });
    mocks.lookupResearchRating.mockImplementation((_t: unknown, name: string) =>
      name.includes("Buffalo")
        ? { team: "BUF", rating: null, winPctVsAvg: 0.7, rank: 1 }
        : { team: "MIA", rating: null, winPctVsAvg: 0.2, rank: 32 },
    );
    mocks.winPctVsAverageToIndependentFairValue.mockReturnValue(FV);
    const out = await tryResearchPowerRatingsFairValue({
      ...NFL_INPUT,
      env: { RESEARCH_POWER_RATINGS_ENABLED: "true" },
    });
    expect(out).toEqual(FV);
    expect(mocks.winPctVsAverageToIndependentFairValue).toHaveBeenCalled();
    expect(mocks.powerRatingsToIndependentFairValue).not.toHaveBeenCalled();
  });

  it("returns null when either team is missing from the table", async () => {
    mocks.isResearchPowerRatingsEnabled.mockReturnValue(true);
    mocks.loadResearchPowerRatings.mockResolvedValue({
      teams: new Map(),
      asOf: FIXED_NOW.toISOString(),
      source: "research_power_ratings",
      rowCount: 1,
    });
    mocks.lookupResearchRating.mockReturnValue(null);
    const out = await tryResearchPowerRatingsFairValue({
      ...NFL_INPUT,
      env: { RESEARCH_POWER_RATINGS_ENABLED: "true" },
    });
    expect(out).toBeNull();
    expect(mocks.powerRatingsToIndependentFairValue).not.toHaveBeenCalled();
  });
});

describe("tryTeamRankingsFairValue — default OFF", () => {
  it("returns null and never constructs the client when the flag is unset", async () => {
    mocks.envFlagEnabled.mockReturnValue(false);
    const out = await tryTeamRankingsFairValue({ ...NFL_INPUT, env: {} });
    expect(out).toBeNull();
    expect(mocks.TeamRankingsClient).not.toHaveBeenCalled();
  });

  it("returns null on skipNetworkIndependents even when flagged", async () => {
    mocks.envFlagEnabled.mockReturnValue(true);
    const out = await tryTeamRankingsFairValue({
      ...NFL_INPUT,
      env: { TEAMRANKINGS_FAIR_VALUE_ENABLED: "true" },
      skipNetworkIndependents: true,
    });
    expect(out).toBeNull();
    expect(mocks.TeamRankingsClient).not.toHaveBeenCalled();
  });

  it("returns null when the source registry is not ingestible", async () => {
    mocks.envFlagEnabled.mockReturnValue(true);
    mocks.isIngestible.mockReturnValue(false);
    const out = await tryTeamRankingsFairValue({
      ...NFL_INPUT,
      env: { TEAMRANKINGS_FAIR_VALUE_ENABLED: "true" },
    });
    expect(out).toBeNull();
    expect(mocks.TeamRankingsClient).not.toHaveBeenCalled();
  });

  it("emits a points-vs-average fair value when ratings resolve", async () => {
    mocks.envFlagEnabled.mockReturnValue(true);
    const getRatings = vi.fn().mockResolvedValue([
      { rank: 1, team: "Buffalo Bills", rating: 5.8, projW: 12, projL: 5, playoffsPct: 90, winSbPct: 10 },
      { rank: 32, team: "Miami Dolphins", rating: -8.0, projW: 4, projL: 13, playoffsPct: 1, winSbPct: 0 },
    ]);
    mocks.TeamRankingsClient.mockImplementation(() => ({ getRatings }));
    mocks.resolveKalshiTeamAbbr.mockReturnValue(null);
    const out = await tryTeamRankingsFairValue({
      ...NFL_INPUT,
      env: { TEAMRANKINGS_FAIR_VALUE_ENABLED: "true" },
    });
    expect(out).toEqual(FV);
    expect(getRatings).toHaveBeenCalledTimes(1);
    expect(mocks.powerRatingsToIndependentFairValue).toHaveBeenCalled();
  });

  it("swallows client errors as null (no silent stub rating)", async () => {
    mocks.envFlagEnabled.mockReturnValue(true);
    mocks.TeamRankingsClient.mockImplementation(() => ({
      getRatings: vi.fn().mockRejectedValue(new Error("http 503")),
    }));
    const out = await tryTeamRankingsFairValue({
      ...NFL_INPUT,
      env: { TEAMRANKINGS_FAIR_VALUE_ENABLED: "true" },
    });
    expect(out).toBeNull();
  });
});
