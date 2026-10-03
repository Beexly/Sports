/**
 * Fixture: happy-path canonical
 *
 * A normal NBA game with 12 books reporting, evidence health A, published
 * pick at 73% confidence. Tests baseline composition behavior of the
 * Intelligence Graph.
 *
 * Expected graph output:
 *   - GameIntelligenceNode.isBootstrap === false
 *   - MarketPulse.consensus high (0.72)
 *   - EvidenceHealth.overall === 'A'
 *   - publishThresholdCleared === true
 *   - One Pick attached, factor breakdown populated
 *   - PreMortem present with 4 bullets
 *   - LossAutopsy absent (game has not settled in this fixture)
 */

export const happyPathCanonical = {
  scenario: "Normal canonical game, 12 books, evidence health A, published pick at 73% confidence",

  input: {
    game: {
      id: "nba-bos-nyk-2026-05-22",
      externalId: "nba_2026052201",
      sport: "NBA",
      league: "NBA",
      homeTeamId: "team_nyk",
      awayTeamId: "team_bos",
      startsAt: "2026-05-22T23:30:00+00:00",
      status: "SCHEDULED",
      currentEdgeIndex: 2.7,
      createdAt: "2026-05-22T12:00:00+00:00",
      updatedAt: "2026-05-22T20:45:00+00:00",
    },

    homeTeam: { id: "team_nyk", short: "NYK", name: "New York Knicks" },
    awayTeam: { id: "team_bos", short: "BOS", name: "Boston Celtics" },

    picks: [
      {
        id: "pick_canonical_001",
        gameId: "nba-bos-nyk-2026-05-22",
        pickKind: "SPREAD",
        line: "-3.5",
        side: "AWAY",
        pickGrade: "SOLID_PLAY",
        confidence: 73,
        publishedAt: "2026-05-22T20:00:00+00:00",
        settledAt: null,
        outcome: null,
        modelVersion: "v6.0.4",
        eligibleForLearning: false,
        isBootstrap: false,
        preMortemContent: {
          generatedAt: "2026-05-22T20:00:01+00:00",
          modelVersion: "v6.0.4",
          warning: null,
          bullets: [
            {
              factorKey: "restAdvantage",
              severityRank: 1,
              text: "If rest advantage flips — BOS catches a same-day travel issue or NYK's fatigue projection updates downward — our edge on this pick evaporates.",
            },
            {
              factorKey: "lineMovement",
              severityRank: 2,
              text: "If sharp money moves the line >2 points against us in the next 4 hours, the consensus we saw at publish doesn't hold.",
            },
            {
              factorKey: "scheduleStress",
              severityRank: 3,
              text: "If schedule density on BOS misread — they may be more fatigued than the factor reads — the -3.5 number is too steep.",
            },
            {
              factorKey: "dataQuality",
              severityRank: 4,
              text: "If data quality drops below grade B between publish and game time, we should be considered to have published prematurely.",
            },
          ],
        },
        preMortemAt: "2026-05-22T20:00:01+00:00",
        preMortemVersion: "v6.0.4",
      },
    ],

    pickSignalSnapshots: [
      {
        id: "pss_001",
        pickId: "pick_canonical_001",
        snapshotAt: "2026-05-22T20:00:00+00:00",
        factors: {
          consensus: 0.72,
          depth: 0.68,
          edge: 2.7,
          lineMovement: 0.45,
          volatility: 0.22,
          headToHead: 0.18,
          venueForm: 0.31,
          scheduleStress: 0.74,
          restAdvantage: 0.81,
          crossMarket: 0.39,
          dataQuality: 0.95,
        },
        modelVersion: "v6.0.4",
      },
    ],

    gameSignals: [
      // Three signals across the last 4 hours, showing line stability
      {
        id: "gs_001",
        gameId: "nba-bos-nyk-2026-05-22",
        observedAt: "2026-05-22T16:00:00+00:00",
        source: "ODDS_API",
        kind: "CONSENSUS",
        value: { metric: "consensus_awayspread", value: 0.71, booksReporting: 11 },
      },
      {
        id: "gs_002",
        gameId: "nba-bos-nyk-2026-05-22",
        observedAt: "2026-05-22T18:00:00+00:00",
        source: "ODDS_API",
        kind: "CONSENSUS",
        value: { metric: "consensus_awayspread", value: 0.72, booksReporting: 12 },
      },
      {
        id: "gs_003",
        gameId: "nba-bos-nyk-2026-05-22",
        observedAt: "2026-05-22T20:00:00+00:00",
        source: "ODDS_API",
        kind: "CONSENSUS",
        value: { metric: "consensus_awayspread", value: 0.72, booksReporting: 12 },
      },
    ],

    sourceSnapshots: [
      {
        id: "ss_001",
        gameId: "nba-bos-nyk-2026-05-22",
        observedAt: "2026-05-22T20:00:00+00:00",
        sourceKey: "ODDS_API",
        evidenceGrade: "A",
        body: { description: "Multi-book consensus across 12 reporting books" },
      },
      {
        id: "ss_002",
        gameId: "nba-bos-nyk-2026-05-22",
        observedAt: "2026-05-22T20:00:00+00:00",
        sourceKey: "BALLDONTLIE",
        evidenceGrade: "A",
        body: { description: "Recent NBA stats including rest day differential" },
      },
    ],

    ingestionRuns: [
      {
        id: "ir_001",
        startedAt: "2026-05-22T20:00:00+00:00",
        completedAt: "2026-05-22T20:00:12+00:00",
        success: true,
        adapter: "ODDS_API",
        booksReporting: 12,
      },
    ],

    lossAutopsies: [],
  },

  expected: {
    gameId: "nba-bos-nyk-2026-05-22",
    sport: "NBA",
    edgeIndex: 2.7,
    publishThresholdCleared: true,
    modelVersion: "v6.0.4",
    isBootstrap: false,
    bootstrapReason: null,
    marketPulse: {
      consensus: { value: 0.72, confidence: 0.95, dataQualityFlag: "OK" },
      booksPolled: 14,
      booksReporting: 12,
    },
    evidenceHealth: {
      overall: "A",
      bootstrapShare: 0.0,
      freshnessSeconds: 0,
    },
    picksCount: 1,
    gateDecision: {
      outcome: "PUBLISHED",
      reason: null,
    },
  },
} as const;
