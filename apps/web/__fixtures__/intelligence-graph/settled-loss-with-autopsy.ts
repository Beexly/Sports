/**
 * Fixture: settled loss with autopsy
 *
 * A pick that was published, settled as a LOSS, and has a LossAutopsy
 * record attached. Tests the Galaxy Memory slot composition + pre-mortem
 * comparison.
 *
 * Expected graph output:
 *   - GameIntelligenceNode includes LossAutopsy data in Galaxy Memory slot
 *   - Pick.outcome === 'L'
 *   - Pick.eligibleForLearning === true (canonical pick, post-bootstrap)
 *   - Pre-mortem comparison data populated:
 *       Each pre-mortem bullet tagged "CALLED" / "DID_NOT_HAPPEN" / "MISSED"
 *   - Autopsy rootCause + lessonTags surfaced
 */

export const settledLossWithAutopsy = {
  scenario: "Settled losing pick with LossAutopsy authored. Tests Galaxy Memory composition.",

  input: {
    game: {
      id: "nba-lal-gsw-2026-05-15",
      externalId: "nba_2026051503",
      sport: "NBA",
      league: "NBA",
      homeTeamId: "team_gsw",
      awayTeamId: "team_lal",
      startsAt: "2026-05-15T22:30:00+00:00",
      status: "FINAL",
      currentEdgeIndex: 3.1,
      createdAt: "2026-05-15T12:00:00+00:00",
      updatedAt: "2026-05-16T02:15:00+00:00",
    },

    homeTeam: { id: "team_gsw", short: "GSW", name: "Golden State Warriors" },
    awayTeam: { id: "team_lal", short: "LAL", name: "Los Angeles Lakers" },

    picks: [
      {
        id: "pick_loss_001",
        gameId: "nba-lal-gsw-2026-05-15",
        pickKind: "MONEYLINE",
        line: "LAL +145",
        side: "AWAY",
        pickGrade: "SOLID_PLAY",
        confidence: 68,
        publishedAt: "2026-05-15T19:00:00+00:00",
        settledAt: "2026-05-16T01:55:00+00:00",
        outcome: "L",
        modelVersion: "v6.0.3",
        eligibleForLearning: true,
        isBootstrap: false,
        preMortemContent: {
          generatedAt: "2026-05-15T19:00:01+00:00",
          modelVersion: "v6.0.3",
          warning: null,
          bullets: [
            {
              factorKey: "restAdvantage",
              severityRank: 1,
              text: "If rest advantage flips, our edge evaporates.",
            },
            {
              factorKey: "venueForm",
              severityRank: 2,
              text: "If venue-form signal is weaker than the sample size suggests, we overweighted this factor.",
            },
            {
              factorKey: "lineMovement",
              severityRank: 3,
              text: "If sharp money moves the line >5 cents against us, we published too early.",
            },
          ],
        },
        preMortemAt: "2026-05-15T19:00:01+00:00",
        preMortemVersion: "v6.0.3",
      },
    ],

    pickSignalSnapshots: [
      {
        id: "pss_loss_001",
        pickId: "pick_loss_001",
        snapshotAt: "2026-05-15T19:00:00+00:00",
        factors: {
          consensus: 0.61,
          depth: 0.58,
          edge: 3.1,
          lineMovement: 0.42,
          volatility: 0.28,
          headToHead: 0.55,
          venueForm: 0.71,
          scheduleStress: 0.45,
          restAdvantage: 0.66,
          crossMarket: 0.41,
          dataQuality: 0.94,
        },
        modelVersion: "v6.0.3",
      },
    ],

    gameSignals: [],

    sourceSnapshots: [],

    ingestionRuns: [],

    lossAutopsies: [
      {
        id: "autopsy_001",
        pickId: "pick_loss_001",
        authorEmail: "baxley.garrett@gmail.com",
        authoredAt: "2026-05-16T14:00:00+00:00",
        status: "PUBLISHED",
        headline: "Late injury flipped the rest-advantage read on LAL +145.",
        whatWeSaw:
          "At publish, LAL had 2 days rest vs GSW's back-to-back. Schedule stress score 0.45 on GSW. " +
          "Venue-form factor read positive at 0.71 for LAL on the road in this matchup. Line moved from +150 " +
          "to +145 in the 4 hours before publish, which the engine read as soft confirmation of our side.",
        whatHappened:
          "30 minutes before tip, LAL's starting PG was downgraded from probable to out. The rest-advantage " +
          "read was based on a healthy roster; with the PG out, LAL's effective rest advantage became " +
          "irrelevant. GSW won by 14.",
        whatWeLearned:
          "This is partially variance (late injury news is genuinely unpredictable) and partially a coverage " +
          "gap — our injury feed lags Twitter beat reporters by 8–12 minutes on average. The v6.0.4 model " +
          "version (shipping next week) tightens the injury-news cutoff for publish: any starter injury " +
          "report less than 60 min before tip pushes the pick to a re-evaluation cycle. We are NOT changing " +
          "the rest-advantage factor weight — the factor read was correct given the inputs.",
        rootCause: "INJURY_SHOCK",
        lessonTags: ["late-injury", "feed-latency", "v6.0.4-improvement"],
        modelVersion: "v6.0.3",
        isPublic: true,
        evidenceRefs: {
          injuryReportMissed: "twitter-beat-reporter-2026-05-15T22:00:00",
          lineMovementPostInjury: "ODDS_API-2026-05-15T22:25:00",
        },
        createdAt: "2026-05-16T14:00:00+00:00",
        updatedAt: "2026-05-16T14:00:00+00:00",
      },
    ],
  },

  expected: {
    gameId: "nba-lal-gsw-2026-05-15",
    sport: "NBA",
    edgeIndex: 3.1,
    publishThresholdCleared: true,
    modelVersion: "v6.0.3",
    isBootstrap: false,
    bootstrapReason: null,
    picksCount: 1,
    gateDecision: {
      outcome: "PUBLISHED",
      reason: null,
    },
    galaxyMemory: {
      outcome: "L",
      autopsyAttached: true,
      autopsyId: "autopsy_001",
      rootCause: "INJURY_SHOCK",
      preMortemComparison: {
        called: [], // none of the pre-mortem bullets named injury-shock
        didNotHappen: ["restAdvantage", "venueForm", "lineMovement"],
        missed: ["INJURY_SHOCK"], // the actual cause wasn't in the pre-mortem
        coverage: "INCOMPLETE",
      },
    },
  },
} as const;
