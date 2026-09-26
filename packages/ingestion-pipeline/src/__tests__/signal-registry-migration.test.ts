import { describe, expect, it, vi } from "vitest";
import {
  buildIndependentFairValues,
  type IndependentFairValueBuildInput,
} from "../build-independent-fair-values.js";
import { runSignalRegistry } from "../signal-registry-runner.js";

// Mock DB and external dependencies to provide stable deterministic test values
vi.mock("@sports/db", () => ({
  db: {
    teamGameLog: {
      findMany: vi.fn().mockResolvedValue([
        {
          gameId: "g1",
          teamName: "Kansas City Chiefs",
          opponentName: "Baltimore Ravens",
          teamScore: 27,
          opponentScore: 20,
          isHome: true,
          gameDate: new Date("2026-09-01"),
        },
      ]),
    },
    teamGameEfficiency: {
      findMany: vi.fn().mockResolvedValue([
        {
          team: "KC",
          opponent: "BAL",
          offEpaPerPlay: 0.15,
          defEpaPerPlay: -0.05,
        },
        {
          team: "BAL",
          opponent: "KC",
          offEpaPerPlay: 0.08,
          defEpaPerPlay: 0.02,
        },
      ]),
    },
  },
}));

vi.mock("@sports/data-ingestion", () => ({
  getTeamScoringRecords: vi.fn().mockResolvedValue([
    { scored: 2, conceded: 1 },
    { scored: 3, conceded: 0 },
  ]),
  getLeagueAverageScored: vi.fn().mockResolvedValue(1.35),
  KalshiClient: vi.fn().mockImplementation(() => ({
    getFairValue: vi.fn().mockResolvedValue({
      yesPrice: 58,
      noPrice: 42,
    }),
  })),
  toIndependentFairValue: vi.fn().mockReturnValue({
    source: "kalshi",
    homeFairProb: 0.58,
    awayFairProb: 0.42,
    capturedAt: "2026-09-13T12:00:00.000Z",
  }),
  sportKeyToKalshiLeagueCode: vi.fn().mockReturnValue("KXNFL"),
  sportKeyToPowerIndexLeague: vi.fn().mockReturnValue("nfl"),
  getCachedEspnPowerIndexMap: vi.fn().mockResolvedValue(
    new Map([
      ["kansas city chiefs", 8.2],
      ["baltimore ravens", 6.5],
    ])
  ),
  lookupTeamFpi: vi.fn().mockImplementation((map, team) => map.get(team.toLowerCase()) ?? null),
  defaultPowerIndexSeason: vi.fn().mockReturnValue(2026),
  getSharedClubEloClient: vi.fn().mockReturnValue({
    getFairValue: vi.fn().mockResolvedValue({
      source: "clubelo",
      homeFairProb: 0.61,
      awayFairProb: 0.39,
      capturedAt: "2026-09-13T12:00:00.000Z",
    }),
  }),
  isClubEloSport: vi.fn().mockImplementation((s) => s.startsWith("soccer_")),
  isIngestible: vi.fn().mockReturnValue(true),
  isPolymarketIndependentEnabled: vi.fn().mockReturnValue(false),
  PolymarketIndependentClient: vi.fn(),
  fetchMlbStandings: vi.fn().mockResolvedValue([
    { name: "New York Yankees", wins: 85, losses: 55 },
    { name: "Boston Red Sox", wins: 75, losses: 65 },
  ]),
  buildMlbWinPctLookup: vi.fn().mockReturnValue(
    new Map([
      ["new york yankees", 0.607],
      ["boston red sox", 0.535],
    ])
  ),
  lookupMlbWinPct: vi.fn().mockImplementation((map, team) => map.get(team.toLowerCase()) ?? null),
  isResearchPowerRatingsEnabled: vi.fn().mockReturnValue(false),
}));

describe("Signal Registry Migration — Deterministic Parity under v5.2.7", () => {
  const fixedNow = () => new Date("2026-09-13T12:00:00.000Z");

  const testFixtures: IndependentFairValueBuildInput[] = [
    // 1. NFL Game with spread (tests EPA, FPI, Kalshi)
    {
      sportKey: "americanfootball_nfl",
      homeTeam: "Kansas City Chiefs",
      awayTeam: "Baltimore Ravens",
      commenceTime: new Date("2026-09-14T00:20:00.000Z"),
      spreadHome: -3.0,
      now: fixedNow,
      env: { ESPN_POWERINDEX_LICENSED: "true" } as any,
    },
    // 2. Soccer EPL Game (tests ClubElo, Dixon-Coles, Poisson)
    {
      sportKey: "soccer_epl",
      homeTeam: "Arsenal",
      awayTeam: "Chelsea",
      commenceTime: new Date("2026-09-15T15:00:00.000Z"),
      spreadHome: -0.5,
      now: fixedNow,
    },
    // 3. MLB Game with spread (tests MLB Standings, Poisson, Skellam cover)
    {
      sportKey: "baseball_mlb",
      homeTeam: "New York Yankees",
      awayTeam: "Boston Red Sox",
      commenceTime: new Date("2026-09-16T23:05:00.000Z"),
      spreadHome: -1.5,
      now: fixedNow,
    },
    // 4. NHL Hockey Game (tests Poisson, Skellam)
    {
      sportKey: "icehockey_nhl",
      homeTeam: "Edmonton Oilers",
      awayTeam: "Calgary Flames",
      commenceTime: new Date("2026-10-10T02:00:00.000Z"),
      spreadHome: -1.5,
      now: fixedNow,
    },
    // 5. Prefetched game (tests prefetched passthrough)
    {
      sportKey: "americanfootball_nfl",
      homeTeam: "Detroit Lions",
      awayTeam: "Green Bay Packers",
      commenceTime: new Date("2026-09-20T17:00:00.000Z"),
      now: fixedNow,
      prefetched: [
        {
          source: "kalshi",
          homeFairProb: 0.54,
          awayFairProb: 0.46,
          capturedAt: "2026-09-13T12:00:00.000Z",
        },
      ],
    },
    // 6. Network disabled (tests offline resilience)
    {
      sportKey: "americanfootball_nfl",
      homeTeam: "Kansas City Chiefs",
      awayTeam: "Baltimore Ravens",
      commenceTime: new Date("2026-09-14T00:20:00.000Z"),
      now: fixedNow,
      skipNetworkIndependents: true,
    },
  ];

  it("produces identical signal counts and source keys for every fixture", async () => {
    for (const fixture of testFixtures) {
      const legacyResult = await buildIndependentFairValues(fixture);
      const registryResult = await runSignalRegistry(fixture);

      expect(registryResult.length).toBe(legacyResult.length);
      for (let i = 0; i < legacyResult.length; i++) {
        expect(registryResult[i]!.source).toBe(legacyResult[i]!.source);
      }
    }
  });

  it("produces byte-identical probabilities to 15 decimal places", async () => {
    for (const fixture of testFixtures) {
      const legacyResult = await buildIndependentFairValues(fixture);
      const registryResult = await runSignalRegistry(fixture);

      for (let i = 0; i < legacyResult.length; i++) {
        const leg = legacyResult[i]!;
        const reg = registryResult[i]!;

        expect(reg.homeFairProb).toBeCloseTo(leg.homeFairProb!, 15);
        expect(reg.awayFairProb).toBeCloseTo(leg.awayFairProb!, 15);
      }
    }
  });
});
