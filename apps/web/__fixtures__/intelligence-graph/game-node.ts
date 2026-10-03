import type {
  IntelligenceGameInput,
  IntelligencePickInput,
  IntelligenceSignalInput,
} from "@/lib/intelligence-graph";

export const fixtureGame: IntelligenceGameInput = {
  id: "game-bos-mil",
  homeTeamName: "Boston Celtics",
  awayTeamName: "Milwaukee Bucks",
  sport: "NBA",
  commenceTime: "2026-05-22T23:00:00.000Z",
  currentEdgeIndex: 71,
  bookmakerCoverageMax: 11,
  dataQualityScore: 88,
  lineMovementSpread: -1.5,
  lineMovementTotal: 2,
  isBootstrap: false,
};

export const fixturePick: IntelligencePickInput = {
  id: "pick-bos-1",
  selection: "Boston Celtics -4.5",
  market: "ATS_SPREAD",
  confidence: 71,
  edgeScore: 3.8,
  isPublished: true,
  isBootstrap: false,
  result: "PENDING",
  generatedAt: "2026-05-22T18:00:00.000Z",
};

export const fixtureSignals: IntelligenceSignalInput[] = [
  {
    sourceCategory: "MARKET",
    sourceName: "odds-api",
    signalKey: "book_depth",
    fetchedAt: "2026-05-22T18:00:00.000Z",
    expiresAt: "2026-05-23T00:00:00.000Z",
    trustLevel: 0.95,
    isBootstrap: false,
  },
  {
    sourceCategory: "SCHEDULE",
    sourceName: "schedule-internal",
    signalKey: "rest_days_home",
    fetchedAt: "2026-05-22T18:00:00.000Z",
    expiresAt: null,
    trustLevel: 0.9,
    isBootstrap: false,
  },
  {
    sourceCategory: "MARKET",
    sourceName: "line-history",
    signalKey: "spread_delta",
    fetchedAt: "2026-05-22T18:00:00.000Z",
    expiresAt: "2026-05-22T17:00:00.000Z",
    trustLevel: 0.8,
    isBootstrap: true,
  },
];
