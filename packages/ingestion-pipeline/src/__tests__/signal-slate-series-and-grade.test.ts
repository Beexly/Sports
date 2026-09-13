import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Two defects in the model-signal lane, both measured on the 124 published
 * PENDING rows of 2026-09-13, both fixed withhold-only.
 *
 * 1. ONE READ SOLD AS N READS. The estimator conditions on
 *    (sportKey, homeTeam, awayTeam) plus a `gameDate < commenceTime` history
 *    cutoff, and for two not-yet-played games of the same series that cutoff
 *    selects identical history. So every game of an upcoming series got a
 *    BYTE-IDENTICAL trueProb and each was minted as its own published pick:
 *    San Diego Padres ML at 0.7509071950876358 on four separate dates, Tampa
 *    Bay Rays ML at 0.8597101874244611 on three. 18 of 124 published rows — 40%
 *    of the 45 model signals — were exact repeats across 9 matchups.
 *
 * 2. A SECOND GRADE LADDER. This lane graded on confidence alone at looser
 *    cut-points while book-priced rows were graded on confidence AND a measured
 *    pricing edge, and both wrote the same `pickGrade` column. Of the 44 rows
 *    graded SOLID_PLAY or better, 35 (80%) had bookmakerCount 0.
 *
 * Neither fix scores, re-prices, re-ranks or unpublishes anything. The DB is
 * mocked, following the generate-signal-slate-guard.test.ts pattern.
 */

const mocks = vi.hoisted(() => ({
  gameFindMany: vi.fn<() => Promise<unknown[]>>(),
  gameUpdate: vi.fn<(args: unknown) => Promise<unknown>>(),
  pickFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  pickUpdateMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(),
  pickCreate: vi.fn<(args: unknown) => Promise<unknown>>(),
  buildIndependents: vi.fn<() => Promise<unknown[]>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    game: { findMany: mocks.gameFindMany, update: mocks.gameUpdate, count: vi.fn(async () => 1) },
    pick: { findUnique: mocks.pickFindUnique, updateMany: mocks.pickUpdateMany, create: mocks.pickCreate },
  },
}));

vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: () => ({ canExposePublicPicks: true, canPersistCanonicalHistory: true }),
  MODEL_VERSION: "vtest",
  MIN_PUBLISH_CONFIDENCE: 50,
  PREMIUM_CONFIDENCE_THRESHOLD: 70,
}));

vi.mock("../build-independent-fair-values.js", () => ({
  buildIndependentFairValues: mocks.buildIndependents,
}));

import { generateSignalSlate } from "../generate-signal-slate.js";

const NOW = new Date("2026-09-05T15:00:00.000Z");
const HOME = "Cincinnati Reds";
const AWAY = "Milwaukee Brewers";

/** Three games of one series: same two teams, three consecutive nights. */
const SERIES = [
  { id: "g1", at: "2026-09-05T23:10:00.000Z", espn: "501" },
  { id: "g2", at: "2026-09-06T23:10:00.000Z", espn: "502" },
  { id: "g3", at: "2026-09-07T23:10:00.000Z", espn: "503" },
].map((g) => ({
  id: g.id,
  homeTeamName: HOME,
  awayTeamName: AWAY,
  commenceTime: new Date(g.at),
  createdAt: new Date("2026-09-01T10:00:00.000Z"),
  sport: { key: "baseball_mlb", name: "MLB" },
  _espn: g.espn,
}));

const BOARD = {
  events: SERIES.map((g) => ({
    id: g._espn,
    date: g.commenceTime.toISOString(),
    status: { type: { state: "pre", completed: false } },
    competitions: [{ competitors: [
      { homeAway: "home", team: { displayName: HOME } },
      { homeAway: "away", team: { displayName: AWAY } },
    ] }],
  })),
};

const espnFetch = vi.fn<(url: string) => Promise<Response>>();

const runSlate = () =>
  generateSignalSlate({ now: NOW, skipSeed: true, fetchImpl: espnFetch as unknown as typeof fetch });

const createdData = (): Array<Record<string, unknown>> =>
  mocks.pickCreate.mock.calls.map((c) => (c[0] as { data: Record<string, unknown> }).data);

beforeEach(() => {
  vi.clearAllMocks();
  espnFetch.mockImplementation(async () =>
    new Response(JSON.stringify(BOARD), { status: 200, headers: { "content-type": "application/json" } }),
  );
  mocks.gameFindMany.mockResolvedValue(SERIES);
  mocks.gameUpdate.mockResolvedValue({});
  mocks.pickUpdateMany.mockResolvedValue({ count: 0 });
  mocks.pickCreate.mockResolvedValue({});
  mocks.pickFindUnique.mockResolvedValue(null); // nothing exists yet → create path
  // A strong, confident read. Identical for every game of the series, which is
  // exactly what the real estimator produces and the whole point of the defect.
  mocks.buildIndependents.mockResolvedValue([
    { source: "poisson", homeFairProb: 0.86, awayFairProb: 0.14, capturedAt: NOW.toISOString() },
    { source: "elo", homeFairProb: 0.84, awayFairProb: 0.16, capturedAt: NOW.toISOString() },
  ]);
});

describe("model-signal lane: one read is published once", () => {
  it("mints ONE pick for a three-game series, not three", async () => {
    const result = await runSlate();

    expect(mocks.pickCreate).toHaveBeenCalledTimes(1);
    expect(result.picksUpserted).toBe(1);
  });

  it("counts the refusals rather than dropping them silently", async () => {
    const result = await runSlate();

    // NO SILENT CAP: this is a real slate reduction and its size is reportable.
    expect(result.seriesRepeatsSkipped).toBe(2);
    expect(result.gamesConsidered).toBe(3);
  });

  it("keeps the EARLIEST fixture, whose history cutoff is least stale", async () => {
    await runSlate();

    const data = createdData()[0];
    expect(data).toBeDefined();
    if (!data) throw new Error("unreachable");
    expect(data.gameId).toBe("g1");
  });

  it("does not collapse two DIFFERENT matchups", async () => {
    // The control. Without it, a bug that mints exactly one pick per run would
    // pass every assertion above.
    mocks.gameFindMany.mockResolvedValue([
      SERIES[0],
      { ...SERIES[1], id: "other", homeTeamName: "Chicago Cubs", awayTeamName: "St. Louis Cardinals" },
    ]);
    espnFetch.mockImplementation(async () =>
      new Response(
        JSON.stringify({
          events: [
            BOARD.events[0],
            { ...BOARD.events[1], competitions: [{ competitors: [
              { homeAway: "home", team: { displayName: "Chicago Cubs" } },
              { homeAway: "away", team: { displayName: "St. Louis Cardinals" } },
            ] }] },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await runSlate();

    expect(mocks.pickCreate).toHaveBeenCalledTimes(2);
    expect(result.seriesRepeatsSkipped).toBe(0);
  });
});

describe("model-signal lane: grade is LEAN, always", () => {
  it("grades a read that would have been STRONG_PLAY as LEAN", async () => {
    await runSlate();

    const data = createdData()[0];
    expect(data).toBeDefined();
    if (!data) throw new Error("unreachable");
    const confidence = data.confidence as number;

    // Pin the premise, not a magic number: the blend weights sharp sources, so
    // this lands above the OLD ladder's 80 cut-point. Under that ladder this row
    // published as STRONG_PLAY. Assert the premise so the test cannot quietly
    // stop exercising the defect if the blend weights ever move.
    expect(confidence).toBeGreaterThanOrEqual(80);
    expect(data.pickGrade).toBe("LEAN");
  });

  it("has no book price to grade against, which is why", async () => {
    await runSlate();

    const data = createdData()[0];
    expect(data).toBeDefined();
    if (!data) throw new Error("unreachable");
    expect(data.bookmakerCount).toBe(0);
    const fb = data.factorBreakdown as { independentEdge?: { marketFairProb: unknown; expectedClv: number } };
    expect(fb.independentEdge?.marketFairProb).toBeNull();
    expect(fb.independentEdge?.expectedClv).toBe(0);
  });
});
