/**
 * Fixture: gated game
 *
 * A game with full canonical evidence (12 books, evidence A) where the
 * Edge Index does not clear the publish threshold. Tests the gate
 * decision path of the Intelligence Graph.
 *
 * Expected graph output:
 *   - isBootstrap === false (data is canonical)
 *   - publishThresholdCleared === false (edge too thin)
 *   - gateDecision.outcome === "GATED"
 *   - gateDecision.reason === "EDGE_BELOW_THRESHOLD"
 *   - No picks attached (engine refused to publish)
 *   - Edge Index visible publicly (DEC-003)
 *   - Game appears on the Pass List with the gate reason
 */

export const gatedGame = {
  scenario: "Canonical game with full evidence, gated due to edge below publish threshold",

  input: {
    game: {
      id: "nfl-mia-buf-2026-05-22",
      externalId: "nfl_2026052207",
      sport: "NFL",
      league: "NFL",
      homeTeamId: "team_buf",
      awayTeamId: "team_mia",
      startsAt: "2026-05-22T20:00:00+00:00",
      status: "SCHEDULED",
      currentEdgeIndex: 0.4,
      createdAt: "2026-05-22T12:00:00+00:00",
      updatedAt: "2026-05-22T18:00:00+00:00",
    },

    homeTeam: { id: "team_buf", short: "BUF", name: "Buffalo Bills" },
    awayTeam: { id: "team_mia", short: "MIA", name: "Miami Dolphins" },

    picks: [],

    pickSignalSnapshots: [],

    gameSignals: [
      {
        id: "gs_gated_001",
        gameId: "nfl-mia-buf-2026-05-22",
        observedAt: "2026-05-22T16:00:00+00:00",
        source: "ODDS_API",
        kind: "CONSENSUS",
        value: { metric: "consensus_homespread", value: 0.51, booksReporting: 12 },
      },
      {
        id: "gs_gated_002",
        gameId: "nfl-mia-buf-2026-05-22",
        observedAt: "2026-05-22T18:00:00+00:00",
        source: "ODDS_API",
        kind: "CONSENSUS",
        value: { metric: "consensus_homespread", value: 0.51, booksReporting: 12 },
      },
    ],

    sourceSnapshots: [
      {
        id: "ss_gated_001",
        gameId: "nfl-mia-buf-2026-05-22",
        observedAt: "2026-05-22T18:00:00+00:00",
        sourceKey: "ODDS_API",
        evidenceGrade: "A",
        body: { description: "12 books reporting; consensus near 50/50" },
      },
      {
        id: "ss_gated_002",
        gameId: "nfl-mia-buf-2026-05-22",
        observedAt: "2026-05-22T18:00:00+00:00",
        sourceKey: "SPORTSDATAIO",
        evidenceGrade: "A",
        body: { description: "NFL Next Gen stats; team form parity" },
      },
    ],

    ingestionRuns: [
      {
        id: "ir_gated_001",
        startedAt: "2026-05-22T18:00:00+00:00",
        completedAt: "2026-05-22T18:00:15+00:00",
        success: true,
        adapter: "ODDS_API",
        booksReporting: 12,
      },
    ],

    lossAutopsies: [],
  },

  expected: {
    gameId: "nfl-mia-buf-2026-05-22",
    sport: "NFL",
    edgeIndex: 0.4,
    publishThresholdCleared: false,
    modelVersion: "v6.0.4",
    isBootstrap: false,
    bootstrapReason: null,
    marketPulse: {
      consensus: { value: 0.51, confidence: 0.92, dataQualityFlag: "OK" },
      booksPolled: 14,
      booksReporting: 12,
    },
    evidenceHealth: {
      overall: "A",
      bootstrapShare: 0.0,
      freshnessSeconds: 0,
    },
    picksCount: 0,
    gateDecision: {
      outcome: "GATED",
      reason: "EDGE_BELOW_THRESHOLD",
      friendlyText: "Spread balanced at 51% consensus across 12 books. Edge Index 0.4, below publish threshold.",
    },
  },
} as const;
