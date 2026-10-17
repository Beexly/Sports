import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildDynamicGameContext,
  type BuildGameContextParams,
  type VenueInfo,
} from "../dynamic-context-builder.js";
import type { NormalizedInjuryRecord } from "@sports/data-ingestion";

describe("Dynamic Context Builder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds complete dynamic GameContext and runs interpretSituation with continuity and injury evidence", async () => {
    const injuryMap = new Map<string, NormalizedInjuryRecord[]>();

    // Home team: Green Bay Packers with severe DL injury (4 Out, 1 Q) and 1 OL Out
    injuryMap.set("green bay packers", [
      {
        id: "1",
        athleteName: "Player A",
        teamName: "Green Bay Packers",
        position: "DE",
        status: "Out",
        shortComment: "Knee injury, ruled out",
      },
      {
        id: "2",
        athleteName: "Player B",
        teamName: "Green Bay Packers",
        position: "DT",
        status: "Out",
        shortComment: "Ankle sprain",
      },
      {
        id: "3",
        athleteName: "Player C",
        teamName: "Green Bay Packers",
        position: "DE",
        status: "Out",
        shortComment: "Hamstring strain",
      },
      {
        id: "4",
        athleteName: "Player D",
        teamName: "Green Bay Packers",
        position: "NT",
        status: "Out",
        shortComment: "Elbow dislocation",
      },
      {
        id: "5",
        athleteName: "Player E",
        teamName: "Green Bay Packers",
        position: "DL",
        status: "Questionable",
        shortComment: "Shoulder soreness",
      },
      {
        id: "6",
        athleteName: "Lineman O",
        teamName: "Green Bay Packers",
        position: "OT",
        status: "Out",
        shortComment: "Concussion protocol",
      },
      {
        id: "7",
        athleteName: "Star WR",
        teamName: "Green Bay Packers",
        position: "WR",
        status: "Out",
        shortComment: "Hamstring tear, out 3 weeks",
      },
    ]);

    // Away team: Chicago Bears
    injuryMap.set("chicago bears", [
      {
        id: "8",
        athleteName: "Corner X",
        teamName: "Chicago Bears",
        position: "CB",
        status: "Questionable",
        shortComment: "Ankle soreness",
      },
    ]);

    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/points/")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            properties: { forecastHourly: "https://api.weather.gov/gridpoints/GRB/10,10/forecast/hourly" },
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          properties: {
            periods: [
              {
                temperature: 41,
                windSpeed: "15 mph",
                shortForecast: "Rain showers",
                probabilityOfPrecipitation: { value: 70 },
              },
            ],
          },
        }),
      };
    });

    const params: BuildGameContextParams = {
      gameId: "test-game-gb-chi",
      homeTeam: "Green Bay Packers",
      awayTeam: "Chicago Bears",
      sportKey: "americanfootball_nfl",
      kickoff: new Date("2026-10-18T17:00:00Z"),
      fetchedAt: new Date("2026-10-17T12:00:00Z"),
      restDaysHome: 7,
      restDaysAway: 7,
      avgSpread: -3.5,
      marketFairProb: 0.60,
      venue: {
        fullName: "Lambeau Field",
        city: "Green Bay",
        state: "WI",
      },
      injuryMap,
      customFetch: mockFetch as unknown as typeof fetch,
    };

    const result = await buildDynamicGameContext(params);

    // 1. GameContext assembly
    expect(result.gameContext.homeTeam).toBe("Green Bay Packers");
    expect(result.gameContext.awayTeam).toBe("Chicago Bears");
    expect(result.gameContext.restDaysHome).toBe(7);
    expect(result.gameContext.restDaysAway).toBe(7);

    // OL continuity: 1 Out -> -0.15
    expect(result.gameContext.olContinuityDelta).toBeCloseTo(-0.15, 2);

    // DL continuity: 4 Out * 0.15 + 1 Q * 0.08 = 0.68 -> -0.68
    expect(result.gameContext.dlContinuityDelta).toBeCloseTo(-0.68, 2);

    // DL continuity score should be degraded
    expect(result.gameContext.dlContinuityScore).toBeDefined();
    expect(result.gameContext.dlContinuityScore).toBeLessThan(0.8);

    // ACWR: Elevated to 1.48 because Star WR is Out
    expect(result.gameContext.acuteChronicWorkloadRatio).toBe(1.48);
    expect(result.gameContext.workloadRatio).toBe(1.48);

    // Weather: parsed from NWS
    expect(result.gameContext.temperatureF).toBe(41);
    expect(result.gameContext.windSpeedMph).toBe(15);
    expect(result.gameContext.precipitationRateMmHr).toBe(2.5); // rain showers

    // 2. PLAYER_AVAILABILITY EvidenceRecord
    expect(result.playerAvailabilityEvidence.sourceCategory).toBe("PLAYER_AVAILABILITY");
    expect(result.playerAvailabilityEvidence.trustLevel).toBe(0.85);
    expect(result.playerAvailabilityEvidence.sampleSize).toBe(8); // 7 GB + 1 CHI
    expect(result.playerAvailabilityEvidence.whyUsedOrBlocked).toContain("Knee injury");

    // 3. SituationalReading (interpretSituation result)
    expect(result.situationalReading).not.toBeNull();
    if (result.situationalReading) {
      expect(result.situationalReading.reasoningTrace).toContain("Chicago Bears at Green Bay Packers");
      expect(result.situationalReading.reasoningTrace).toContain("OL delta -0.15");
      expect(result.situationalReading.reasoningTrace).toContain("DL delta -0.68");
      expect(result.situationalReading.reasoningTrace).toContain("Corpus evaluator");
      expect(result.situationalReading.mindEvaluation.applicablePrinciples).toBeDefined();
      expect(Array.isArray(result.situationalReading.mindEvaluation.applicablePrinciples)).toBe(true);
      expect(result.situationalReading.olContinuityDelta).toBeCloseTo(-0.15, 2);
      expect(result.situationalReading.dlContinuityDelta).toBeCloseTo(-0.68, 2);
      expect(typeof result.situationalReading.corpusSituationalShift).toBe("number");
    }
  });

  it("sets ACWR to baseline 1.0 when no key skill players are Out", async () => {
    const injuryMap = new Map<string, NormalizedInjuryRecord[]>();
    // Only a backup kicker or defensive player is Out
    injuryMap.set("kansas city chiefs", [
      {
        id: "9",
        athleteName: "Backup DE",
        teamName: "Kansas City Chiefs",
        position: "DE",
        status: "Out",
        shortComment: "Knee",
      },
    ]);

    const params: BuildGameContextParams = {
      gameId: "test-game-kc",
      homeTeam: "Kansas City Chiefs",
      awayTeam: "Las Vegas Raiders",
      sportKey: "americanfootball_nfl",
      kickoff: new Date("2026-10-18T20:00:00Z"),
      fetchedAt: new Date("2026-10-17T12:00:00Z"),
      restDaysHome: 7,
      restDaysAway: 7,
      venue: { fullName: "GEHA Field at Arrowhead Stadium", city: "Kansas City", state: "MO" },
      injuryMap,
      customFetch: vi.fn().mockRejectedValue(new Error("skip")) as unknown as typeof fetch,
    };

    const result = await buildDynamicGameContext(params);
    expect(result.gameContext.acuteChronicWorkloadRatio).toBe(1.0);
    expect(result.gameContext.workloadRatio).toBe(1.0);
  });

  it("detects high altitude in Denver and Salt Lake City", async () => {
    const paramsDenver: BuildGameContextParams = {
      gameId: "test-altitude",
      homeTeam: "Denver Broncos",
      awayTeam: "Seattle Seahawks",
      sportKey: "americanfootball_nfl",
      kickoff: new Date(),
      fetchedAt: new Date(),
      restDaysHome: 7,
      restDaysAway: 4,
      venue: { fullName: "Empower Field at Mile High", city: "Denver", state: "CO" },
      injuryMap: new Map(),
      customFetch: vi.fn().mockRejectedValue(new Error("skip")) as unknown as typeof fetch,
    };

    const resDenver = await buildDynamicGameContext(paramsDenver);
    expect(resDenver.gameContext.altitudeFt).toBe(5280);

    const paramsUtah: BuildGameContextParams = {
      gameId: "test-utah",
      homeTeam: "Utah",
      awayTeam: "BYU",
      sportKey: "americanfootball_ncaaf",
      kickoff: new Date(),
      fetchedAt: new Date(),
      restDaysHome: 7,
      restDaysAway: 7,
      venue: { fullName: "Rice-Eccles Stadium", city: "Salt Lake City", state: "UT" },
      injuryMap: new Map(),
      customFetch: vi.fn().mockRejectedValue(new Error("skip")) as unknown as typeof fetch,
    };

    const resUtah = await buildDynamicGameContext(paramsUtah);
    expect(resUtah.gameContext.altitudeFt).toBe(4200);
  });

  it("detects dome / indoor stadiums and sets climate-controlled baseline", async () => {
    const paramsDome: BuildGameContextParams = {
      gameId: "test-dome",
      homeTeam: "Indianapolis Colts",
      awayTeam: "Houston Texans",
      sportKey: "americanfootball_nfl",
      kickoff: new Date(),
      fetchedAt: new Date(),
      restDaysHome: 7,
      restDaysAway: 7,
      venue: { fullName: "Lucas Oil Stadium", city: "Indianapolis", state: "IN", indoor: true },
      injuryMap: new Map(),
    };

    const result = await buildDynamicGameContext(paramsDome);
    expect(result.gameContext.temperatureF).toBe(72);
    expect(result.gameContext.windSpeedMph).toBe(0);
    expect(result.gameContext.precipitationRateMmHr).toBe(0);
    expect(result.weatherReading.isIndoor).toBe(true);
    expect(result.weatherReading.source).toBe("indoor");
  });
});
