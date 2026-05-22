/**
 * Fixture: bootstrap game
 *
 * A game with only 2 books reporting, no PickSignalSnapshot, scored but
 * pre-publish-threshold. Tests bootstrap propagation through the
 * Intelligence Graph.
 *
 * Expected graph output:
 *   - GameIntelligenceNode.isBootstrap === true
 *   - bootstrapReason populated with specific explanation
 *   - publishThresholdCleared === false (regardless of edgeIndex value)
 *   - EvidenceHealth.overall === 'D' or worse
 *   - EvidenceHealth.bootstrapShare > 0.5
 *   - No picks attached
 *   - Edge Index may be null OR present with a "tentative" annotation
 *   - The Model Court (Phase 4) should REFUSE on this game
 */

export const bootstrapGame = {
  scenario: "Bootstrap-state game with 2 books reporting, no canonical signals",

  input: {
    game: {
      id: "mlb-tor-bos-2026-05-22",
      externalId: "mlb_2026052204",
      sport: "MLB",
      league: "MLB",
      homeTeamId: "team_bos",
      awayTeamId: "team_tor",
      startsAt: "2026-05-22T23:05:00+00:00",
      status: "SCHEDULED",
      currentEdgeIndex: null,
      createdAt: "2026-05-22T18:00:00+00:00",
      updatedAt: "2026-05-22T20:30:00+00:00",
    },

    homeTeam: { id: "team_bos", short: "BOS", name: "Boston Red Sox" },
    awayTeam: { id: "team_tor", short: "TOR", name: "Toronto Blue Jays" },

    picks: [],

    pickSignalSnapshots: [],

    gameSignals: [
      {
        id: "gs_boot_001",
        gameId: "mlb-tor-bos-2026-05-22",
        observedAt: "2026-05-22T20:30:00+00:00",
        source: "ODDS_API",
        kind: "CONSENSUS",
        value: { metric: "consensus_homeline", value: 0.51, booksReporting: 2 },
      },
    ],

    sourceSnapshots: [
      {
        id: "ss_boot_001",
        gameId: "mlb-tor-bos-2026-05-22",
        observedAt: "2026-05-22T20:30:00+00:00",
        sourceKey: "ODDS_API",
        evidenceGrade: "D",
        body: { description: "Only 2 books reporting; bootstrap coverage" },
      },
    ],

    ingestionRuns: [
      {
        id: "ir_boot_001",
        startedAt: "2026-05-22T20:30:00+00:00",
        completedAt: "2026-05-22T20:30:08+00:00",
        success: true,
        adapter: "ODDS_API",
        booksReporting: 2,
      },
    ],

    lossAutopsies: [],
  },

  expected: {
    gameId: "mlb-tor-bos-2026-05-22",
    sport: "MLB",
    edgeIndex: null,
    publishThresholdCleared: false,
    modelVersion: "v6.0.4",
    isBootstrap: true,
    bootstrapReason: "BOOKS_REPORTING_BELOW_THRESHOLD",
    marketPulse: {
      consensus: { value: 0.51, confidence: 0.20, dataQualityFlag: "THIN_COVERAGE" },
      booksPolled: 14,
      booksReporting: 2,
    },
    evidenceHealth: {
      overall: "D",
      bootstrapShare: 1.0,
      freshnessSeconds: 0,
    },
    picksCount: 0,
    gateDecision: {
      outcome: "BOOTSTRAP",
      reason: "BOOKS_REPORTING_BELOW_THRESHOLD",
    },
  },
} as const;
