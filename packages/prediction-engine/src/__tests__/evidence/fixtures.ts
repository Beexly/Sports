import type { GameEvidenceBundle } from "../../evidence/types.js";
import { derived, missing, real } from "../../evidence/types.js";

export const NOW = new Date("2026-11-12T21:00:00.000Z");

function iso(minutesAgo: number): string {
  return new Date(NOW.getTime() - minutesAgo * 60000).toISOString();
}

/** A bundle where every required field is present and fresh. */
export function freshBundle(overrides: Partial<GameEvidenceBundle> = {}): GameEvidenceBundle {
  const base: GameEvidenceBundle = {
    identity: {
      gameId: "cmt4fewrc00jbeat5nq9eauqo",
      sport: "americanfootball_nfl",
      league: "NFL",
      season: 2026,
      week: 10,
      homeTeam: "NYG",
      awayTeam: "WSH",
      commenceTime: "2026-11-13T01:15:00.000Z",
      venue: real("MetLife Stadium", "espn:schedule", iso(600)),
    },
    market: {
      spread: real(2.5, "the-odds-api", iso(5)),
      total: real(41.5, "the-odds-api", iso(5)),
      homeMoneyline: real(115, "the-odds-api", iso(5)),
      awayMoneyline: real(-135, "the-odds-api", iso(5)),
      consensusNoVigHome: derived(0.462, "consensusNoVig", iso(5)),
      bookmakerCount: real(9, "the-odds-api", iso(5)),
      bestHomePrice: real(120, "the-odds-api", iso(5)),
      bestAwayPrice: real(-130, "the-odds-api", iso(5)),
    },
    injuries: real(
      [
        {
          playerName: "Test Player",
          team: "NYG",
          position: "WR",
          reportStatus: "Questionable",
          practiceStatus: "Limited",
          primaryInjury: "Hamstring",
        },
      ],
      "espn:injuries",
      iso(60),
    ),
    weather: real(
      {
        temperatureF: 48,
        windMph: 11,
        windDirectionDeg: 270,
        precipitationChance: 10,
        condition: "Clear",
        isDome: false,
      },
      "nws",
      iso(30),
    ),
    rest: real(
      { homeRestDays: 7, awayRestDays: 6, homeBackToBack: false, awayBackToBack: false },
      "schedule",
      iso(600),
    ),
    homeForm: real(
      {
        team: "NYG",
        gamesPlayed: 9,
        offEpaPerPlay: -0.02,
        defEpaPerPlay: 0.03,
        passEpaPerPlay: -0.01,
        rushEpaPerPlay: -0.04,
        successRate: 0.41,
        pointsPerGame: 19.2,
        pointsAllowedPerGame: 23.1,
        neutralPassRate: 0.55,
        proePct: -1.2,
        playActionPct: 24.0,
        weeksCovered: [1, 9] as const,
      },
      "nflverse:pbp",
      iso(1440),
    ),
    awayForm: real(
      {
        team: "WSH",
        gamesPlayed: 9,
        offEpaPerPlay: 0.01,
        defEpaPerPlay: -0.01,
        passEpaPerPlay: 0.02,
        rushEpaPerPlay: -0.03,
        successRate: 0.44,
        pointsPerGame: 21.4,
        pointsAllowedPerGame: 22.0,
        neutralPassRate: 0.58,
        proePct: 0.8,
        playActionPct: 26.5,
        weeksCovered: [1, 9] as const,
      },
      "nflverse:pbp",
      iso(1440),
    ),
    homeCharting: real(
      {
        team: "NYG",
        sackRateAllowedPct: 7.1,
        pressureRateAllowedPct: 22.4,
        passBlockWinRate: 0.61,
        runBlockWinRate: 0.7,
        weeksCovered: [1, 9] as const,
      },
      "nflverse:pbp",
      iso(1440),
    ),
    awayCharting: real(
      {
        team: "WSH",
        sackRateAllowedPct: 6.4,
        pressureRateAllowedPct: 20.1,
        passBlockWinRate: 0.64,
        runBlockWinRate: 0.69,
        weeksCovered: [1, 9] as const,
      },
      "nflverse:pbp",
      iso(1440),
    ),
    homeCoaching: real(
      {
        team: "NYG",
        headCoach: "Test Coach",
        offensiveCoordinator: "Test OC",
        defensiveCoordinator: "Test DC",
        fourthDownAggression: 0.5,
      },
      "team-staff",
      iso(10000),
    ),
    awayCoaching: real(
      {
        team: "WSH",
        headCoach: "Test Coach 2",
        offensiveCoordinator: "Test OC 2",
        defensiveCoordinator: "Test DC 2",
        fourthDownAggression: 0.5,
      },
      "team-staff",
      iso(10000),
    ),
    corpus: real(
      [{ facet: "pressure_vs_play_action", support: 0.82, citations: [] }],
      "lit.corpus_chunk",
      iso(120),
    ),
    jev: missing("no spine file for this game"),
    builtAt: iso(1),
    codeVersion: "v5.3.1+evidence-spine.1",
  };
  return { ...base, ...overrides };
}
