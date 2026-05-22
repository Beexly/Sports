/**
 * Fixture: slate weather with notable conditions
 *
 * A daily slate with notable conditions: heavy outdoor weather, schedule
 * cluster, and an injury news flag. Tests SlateWeather composition.
 *
 * Expected graph output:
 *   - SlateWeather.slateDensity === "HEAVY"
 *   - SlateWeather.notableConditions includes weather, cluster, news flags
 *   - Total games tracked === 8
 *   - Published === 2, Gated === 6 (typical restraint behavior)
 */

export const slateWeatherNotable = {
  scenario: "Daily slate with notable conditions: outdoor weather, schedule cluster, injury news",

  input: {
    dateKey: "2026-05-22",
    timezone: "America/New_York",

    games: [
      // 4 NBA games
      { id: "nba-bos-nyk-2026-05-22", sport: "NBA", published: true, gated: false, edgeIndex: 2.7 },
      { id: "nba-lal-gsw-2026-05-22", sport: "NBA", published: false, gated: true, edgeIndex: 0.8 },
      { id: "nba-mia-orl-2026-05-22", sport: "NBA", published: false, gated: true, edgeIndex: 0.3 },
      { id: "nba-phi-mil-2026-05-22", sport: "NBA", published: false, gated: true, edgeIndex: 1.1 },
      // 3 MLB games
      { id: "mlb-nyy-bos-2026-05-22", sport: "MLB", published: false, gated: true, edgeIndex: 0.9 },
      { id: "mlb-tor-bos-2026-05-22", sport: "MLB", published: false, gated: true, edgeIndex: null },
      { id: "mlb-lad-sf-2026-05-22", sport: "MLB", published: true, gated: false, edgeIndex: 2.2 },
      // 1 NHL game
      { id: "nhl-tor-mtl-2026-05-22", sport: "NHL", published: false, gated: true, edgeIndex: 0.6 },
    ],

    weatherSignals: [
      {
        gameId: "mlb-nyy-bos-2026-05-22",
        kind: "WEATHER",
        condition: "OUTDOOR_WIND",
        value: "Wind 22mph crosswinds. Marked for over/under volatility flag.",
      },
      {
        gameId: "mlb-lad-sf-2026-05-22",
        kind: "WEATHER",
        condition: "OUTDOOR_RAIN",
        value: "Light rain forecast, 40% chance of game delay.",
      },
    ],

    scheduleSignals: [
      {
        gameId: "nba-bos-nyk-2026-05-22",
        kind: "SCHEDULE_DENSITY",
        condition: "BOS_BACK_TO_BACK",
        value: "BOS playing 2nd of back-to-back, 0 days rest.",
      },
      {
        gameId: "nba-mia-orl-2026-05-22",
        kind: "SCHEDULE_DENSITY",
        condition: "MIA_LONG_TRAVEL",
        value: "MIA flying cross-country same day after late-night game.",
      },
    ],

    newsSignals: [
      {
        gameId: "nba-lal-gsw-2026-05-22",
        kind: "INJURY",
        condition: "LAL_PG_DOUBTFUL",
        value: "LAL starting PG listed as doubtful (game-time decision).",
        observedAt: "2026-05-22T19:30:00+00:00",
      },
    ],
  },

  expected: {
    dateKey: "2026-05-22",
    sportsActive: ["NBA", "MLB", "NHL"],
    totalGamesTracked: 8,
    totalGamesPublished: 2,
    totalGamesGated: 6,
    averageEdgeIndex: 1.32, // average of non-null edge indices
    slateDensity: "HEAVY", // 8 games is heavy for a non-Sunday weeknight
    notableConditions: [
      { kind: "WEATHER", count: 2 },
      { kind: "SCHEDULE_DENSITY", count: 2 },
      { kind: "INJURY", count: 1 },
    ],
  },
} as const;
