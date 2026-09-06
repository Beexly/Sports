import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tripwire for the 2026-09-05 writer-collision fix.
 *
 * refresh-odds and board-fill run generateSignalSlate in the same tick AFTER
 * refreshOdds. A same-side, book-priced MONEYLINE pick used to fall through to
 * the signal path's updateMany, which rewrote it to "X ML (model signal)",
 * line 0, bookmakerCount 0, confidence = trueProb*100 and marketFairProb null,
 * while the immutable proof receipt still committed the book price. The DB is
 * mocked (freeze-slate-commitments.test.ts pattern); the blend math is real.
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

import {
  buildSignalReasoningShort,
  generateSignalSlate,
  isSignalSlateRow,
  SIGNAL_SELECTION_SUFFIX,
} from "../generate-signal-slate.js";

const NOW = new Date("2026-09-05T15:00:00.000Z");
const GAME = {
  id: "game-1",
  homeTeamName: "Cincinnati Bearcats",
  awayTeamName: "Boston College Eagles",
  commenceTime: new Date("2026-09-05T19:30:00.000Z"),
  createdAt: new Date("2026-09-01T10:00:00.000Z"),
  sport: { key: "americanfootball_ncaaf", name: "NCAAF" },
};

/**
 * Fixture confirmation guard (C-111): the slate confirms every game against the
 * day's free ESPN scoreboard through an injected fetch. TEST FIXTURE shaped like
 * ESPN's public scoreboard JSON; the 09-06 rows mirror what the public board
 * listed on 2026-09-06 for the two "phantom" pairs (a day after our rows).
 */
function espnEvent(id: string, date: string, home: string, away: string): Record<string, unknown> {
  return {
    id,
    date,
    status: { type: { state: "pre", completed: false } },
    competitions: [{ competitors: [
      { homeAway: "home", team: { displayName: home } },
      { homeAway: "away", team: { displayName: away } },
    ] }],
  };
}
const CFB_BOARD = {
  events: [
    espnEvent("402", "2026-09-05T19:30Z", "Cincinnati Bearcats", "Boston College Eagles"),
    espnEvent("403", "2026-09-06T20:00Z", "Washington Huskies", "Washington State Cougars"),
    espnEvent("404", "2026-09-06T23:30Z", "Ole Miss Rebels", "Louisville Cardinals"),
  ],
};
const espnFetch = vi.fn<(url: string) => Promise<Response>>();
function boardResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
function runSlate() {
  return generateSignalSlate({ now: NOW, skipSeed: true, fetchImpl: espnFetch as unknown as typeof fetch });
}

beforeEach(() => {
  vi.clearAllMocks();
  espnFetch.mockImplementation(async () => boardResponse(CFB_BOARD));
  mocks.gameFindMany.mockResolvedValue([GAME]);
  mocks.gameUpdate.mockResolvedValue({});
  mocks.pickUpdateMany.mockResolvedValue({ count: 1 });
  mocks.pickCreate.mockResolvedValue({});
  // Home side favoured well past the coin-flip filter (blend + stretch => ~0.72 home).
  mocks.buildIndependents.mockResolvedValue([
    { source: "espn_powerindex", homeFairProb: 0.68, awayFairProb: 0.32, capturedAt: NOW.toISOString() },
  ]);
});

describe("isSignalSlateRow", () => {
  it("is true only for a signal selection with no book behind it", () => {
    expect(isSignalSlateRow({ selection: `Cincinnati Bearcats ML ${SIGNAL_SELECTION_SUFFIX}`, bookmakerCount: 0 })).toBe(true);
    expect(isSignalSlateRow({ selection: "Cincinnati Bearcats ML (-150)", bookmakerCount: 5 })).toBe(false);
    // A book row whose selection happens to end with the marker is still a book row.
    expect(isSignalSlateRow({ selection: `Cincinnati Bearcats ML ${SIGNAL_SELECTION_SUFFIX}`, bookmakerCount: 3 })).toBe(false);
  });
});

describe("buildSignalReasoningShort", () => {
  it("carries no percentage or probability for viewers who cannot see confidence", () => {
    const s = buildSignalReasoningShort("Cincinnati Bearcats", "espn_powerindex");
    expect(s).not.toMatch(/\d+\s*%/);
    expect(s).not.toMatch(/@/);
    expect(s).toContain("Cincinnati Bearcats");
    expect(s).toContain("not a book price");
  });
});

describe("generateSignalSlate never overwrites a book-priced pick", () => {
  it("skips a same-side book pick and leaves the row untouched", async () => {
    mocks.pickFindUnique.mockResolvedValue({
      id: "pick-book",
      result: "PENDING",
      selection: "Cincinnati Bearcats ML (-150)",
      bookmakerCount: 5,
    });
    const out = await runSlate();
    expect(mocks.pickUpdateMany).not.toHaveBeenCalled();
    expect(mocks.pickCreate).not.toHaveBeenCalled();
    expect(mocks.gameUpdate).not.toHaveBeenCalled();
    expect(out.picksUpserted).toBe(0);
    expect(out.picksSkipped).toBe(1);
    expect(out.candidatesWithIndependents).toBe(1);
  });

  it("still refreshes a row the signal path wrote itself", async () => {
    mocks.pickFindUnique.mockResolvedValue({
      id: "pick-signal",
      result: "PENDING",
      selection: `Cincinnati Bearcats ML ${SIGNAL_SELECTION_SUFFIX}`,
      bookmakerCount: 0,
    });
    const out = await runSlate();
    expect(mocks.pickUpdateMany).toHaveBeenCalledTimes(1);
    const args = mocks.pickUpdateMany.mock.calls[0]?.[0] as { where: unknown; data: { selection: string; reasoningShort: string; line: number } };
    expect(args.where).toEqual({ id: "pick-signal", result: "PENDING" });
    expect(args.data.selection).toBe(`Cincinnati Bearcats ML ${SIGNAL_SELECTION_SUFFIX}`);
    expect(args.data.line).toBe(0);
    expect(args.data.reasoningShort).not.toMatch(/\d+\s*%/);
    expect(out.picksUpserted).toBe(1);
  });

  it("creates a signal pick when the game has no MONEYLINE row at all", async () => {
    mocks.pickFindUnique.mockResolvedValue(null);
    const out = await runSlate();
    expect(mocks.pickCreate).toHaveBeenCalledTimes(1);
    expect(mocks.pickUpdateMany).not.toHaveBeenCalled();
    const args = mocks.pickCreate.mock.calls[0]?.[0] as { data: { gameId: string; pickType: string; bookmakerCount: number; selection: string; reasoning: string; factorBreakdown: { independentEdge: { rationale: string } } } };
    expect(args.data.gameId).toBe("game-1");
    expect(args.data.pickType).toBe("MONEYLINE");
    expect(args.data.bookmakerCount).toBe(0);
    expect(isSignalSlateRow(args.data)).toBe(true);
    expect(out.picksUpserted).toBe(1);
    // Paid viewers read `reasoning` verbatim: an estimate with its status, and
    // no operator vocabulary or "priced at" language (a price needs a book).
    for (const text of [args.data.reasoning, args.data.factorBreakdown.independentEdge.rationale]) {
      expect(text).not.toMatch(/RankingP=|Eligibility RED|PROVEN|priced at|prices /);
      expect(text).toMatch(/uncalibrated/);
      expect(text).toMatch(/not a (sportsbook quote|book price)/);
    }
  });

  it("publishes from the readiness gate and prices the tier from PREMIUM_CONFIDENCE_THRESHOLD", async () => {
    // Default fixture: home 0.68 blends past the paywall threshold (mock: 70).
    mocks.pickFindUnique.mockResolvedValue(null);
    await runSlate();
    const args = mocks.pickCreate.mock.calls[0]?.[0] as { data: { confidence: number; tier: string; isPublished: boolean } };
    expect(args.data.isPublished).toBe(true); // gates.canExposePublicPicks (mocked true)
    expect(args.data.confidence).toBeGreaterThanOrEqual(70);
    expect(args.data.tier).toBe("PREMIUM");
  });

  it("writes a FREE-tier row when the blended estimate clears the coin-flip filter but not the paywall threshold", async () => {
    mocks.buildIndependents.mockResolvedValue([
      { source: "espn_powerindex", homeFairProb: 0.6, awayFairProb: 0.4, capturedAt: NOW.toISOString() },
    ]);
    mocks.pickFindUnique.mockResolvedValue(null);
    const out = await runSlate();
    expect(mocks.pickCreate).toHaveBeenCalledTimes(1);
    const args = mocks.pickCreate.mock.calls[0]?.[0] as { data: { confidence: number; tier: string } };
    expect(args.data.confidence).toBeGreaterThanOrEqual(60);
    expect(args.data.confidence).toBeLessThan(70);
    expect(args.data.tier).toBe("FREE");
    expect(out.picksUpserted).toBe(1);
  });

  it("skips a coin-flip estimate (|p - 0.5| < 0.1) instead of upserting a row /api/picks would filter out", async () => {
    mocks.buildIndependents.mockResolvedValue([
      { source: "espn_powerindex", homeFairProb: 0.52, awayFairProb: 0.48, capturedAt: NOW.toISOString() },
    ]);
    mocks.pickFindUnique.mockResolvedValue(null);
    const out = await runSlate();
    expect(mocks.pickCreate).not.toHaveBeenCalled();
    expect(mocks.pickUpdateMany).not.toHaveBeenCalled();
    expect(out.candidatesWithIndependents).toBe(1);
    expect(out.picksSkipped).toBe(1);
    expect(out.picksUpserted).toBe(0);
  });

  it("never writes a two-way moneyline signal for soccer (three-way market)", async () => {
    mocks.gameFindMany.mockResolvedValue([
      { ...GAME, id: "game-mls", homeTeamName: "Portland Timbers", awayTeamName: "Austin FC", sport: { key: "soccer_usa_mls", name: "MLS" } },
    ]);
    mocks.pickFindUnique.mockResolvedValue(null);
    const out = await runSlate();
    expect(mocks.buildIndependents).not.toHaveBeenCalled();
    expect(mocks.pickCreate).not.toHaveBeenCalled();
    expect(mocks.pickUpdateMany).not.toHaveBeenCalled();
    expect(out.picksUpserted).toBe(0);
    expect(out.picksSkipped).toBe(1);
    // Soccer is refused before the guard runs: no scoreboard fetch is spent on it.
    expect(espnFetch).not.toHaveBeenCalled();
  });
});

describe("generateSignalSlate fixture confirmation guard (C-111)", () => {
  // The three May-listed NCAAF rows dated 2026-09-05 (ledger C-111). The board
  // above lists two of the pairs on 09-06 and none of them on 09-05.
  const PHANTOMS = [
    { ...GAME, id: "g-olemiss", homeTeamName: "Ole Miss Rebels", awayTeamName: "Louisville Cardinals", commenceTime: new Date("2026-09-05T16:00:00.000Z"), createdAt: new Date("2026-05-22T10:00:00.000Z") },
    { ...GAME, id: "g-illinois", homeTeamName: "Illinois Fighting Illini", awayTeamName: "UAB Blazers", commenceTime: new Date("2026-09-05T16:00:00.000Z"), createdAt: new Date("2026-05-22T10:00:00.000Z") },
    { ...GAME, id: "g-washington", homeTeamName: "Washington Huskies", awayTeamName: "Washington State Cougars", commenceTime: new Date("2026-09-05T19:00:00.000Z"), createdAt: new Date("2026-05-23T10:00:00.000Z") },
  ];

  it("writes no pick on the three phantom fixtures and logs each one, while the listed fixture passes", async () => {
    mocks.gameFindMany.mockResolvedValue([...PHANTOMS, GAME]);
    mocks.pickFindUnique.mockResolvedValue(null);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const out = await runSlate();

    expect(mocks.pickCreate).toHaveBeenCalledTimes(1);
    const created = mocks.pickCreate.mock.calls[0]?.[0] as { data: { gameId: string } };
    expect(created.data.gameId).toBe("game-1");
    expect(mocks.pickUpdateMany).not.toHaveBeenCalled();
    // The phantom rows never reach the independent build, so no signal is even priced.
    expect(mocks.buildIndependents).toHaveBeenCalledTimes(1);
    expect(out.fixtureUnconfirmed).toBe(3);
    expect(out.picksSkipped).toBe(3);
    expect(out.picksUpserted).toBe(1);
    for (const p of PHANTOMS) {
      expect(
        warn.mock.calls.some((c) => /fixture not listed/.test(String(c[0])) && String(c[0]).includes(p.id) && String(c[0]).includes(p.homeTeamName)),
      ).toBe(true);
    }
    warn.mockRestore();
  });

  it("does not refresh an existing signal row to published when its fixture is not listed", async () => {
    mocks.gameFindMany.mockResolvedValue([PHANTOMS[0]!]);
    mocks.pickFindUnique.mockResolvedValue({
      id: "pick-phantom",
      result: "PENDING",
      selection: `Ole Miss Rebels ML ${SIGNAL_SELECTION_SUFFIX}`,
      bookmakerCount: 0,
    });
    const out = await runSlate();
    expect(mocks.pickUpdateMany).not.toHaveBeenCalled();
    expect(mocks.pickCreate).not.toHaveBeenCalled();
    expect(mocks.gameUpdate).not.toHaveBeenCalled();
    expect(out.fixtureUnconfirmed).toBe(1);
  });

  it("skips the whole sport this cycle and logs when the scoreboard fetch fails (fail-closed)", async () => {
    espnFetch.mockImplementation(async () => boardResponse({ events: [] }, 503));
    mocks.gameFindMany.mockResolvedValue([GAME, PHANTOMS[0]!]);
    mocks.pickFindUnique.mockResolvedValue(null);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const out = await runSlate();

    expect(mocks.buildIndependents).not.toHaveBeenCalled();
    expect(mocks.pickCreate).not.toHaveBeenCalled();
    expect(mocks.pickUpdateMany).not.toHaveBeenCalled();
    expect(out.fixtureUnconfirmed).toBe(2);
    expect(out.picksUpserted).toBe(0);
    expect(warn.mock.calls.some((c) => /fixture scoreboard unavailable for americanfootball_ncaaf/.test(String(c[0])) && /HTTP 503/.test(String(c[0])))).toBe(true);
    // Still one fetch for the sport; the failure is not retried within the cycle.
    expect(espnFetch).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("fetches the scoreboard once per ESPN group per sport per cycle across many games (CFB: FBS 80 and FCS 81)", async () => {
    mocks.gameFindMany.mockResolvedValue([
      GAME,
      ...PHANTOMS,
      { ...GAME, id: "game-2", commenceTime: new Date("2026-09-06T00:00:00.000Z") },
    ]);
    mocks.pickFindUnique.mockResolvedValue(null);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    await runSlate();

    expect(espnFetch).toHaveBeenCalledTimes(2);
    const urls = espnFetch.mock.calls.map((c) => String(c[0]));
    for (const url of urls) {
      expect(url).toContain("/football/college-football/scoreboard");
      expect(url).toContain("dates=20260905-20260906");
    }
    expect(urls.filter((u) => u.includes("groups=80"))).toHaveLength(1);
    expect(urls.filter((u) => u.includes("groups=81"))).toHaveLength(1);
    vi.restoreAllMocks();
  });

  it("corrects a confirmed old row's commenceTime from ESPN only beyond 15 minutes", async () => {
    // Row created in June (older than 30 days), kickoff within 48h, our clock 45 minutes early.
    const oldRow = {
      ...GAME,
      id: "game-old",
      commenceTime: new Date("2026-09-05T18:45:00.000Z"),
      createdAt: new Date("2026-06-01T10:00:00.000Z"),
    };
    mocks.gameFindMany.mockResolvedValue([oldRow]);
    mocks.pickFindUnique.mockResolvedValue(null);

    await runSlate();

    expect(mocks.gameUpdate).toHaveBeenCalledWith({
      where: { id: "game-old" },
      data: { commenceTime: new Date("2026-09-05T19:30:00.000Z") },
    });
    // The independent build reads the corrected kickoff.
    expect(mocks.buildIndependents).toHaveBeenCalledWith(
      expect.objectContaining({ commenceTime: new Date("2026-09-05T19:30:00.000Z") }),
    );

    // Same old row, 10 minutes of drift: no correction (the dataQualityScore update still runs).
    vi.clearAllMocks();
    espnFetch.mockImplementation(async () => boardResponse(CFB_BOARD));
    mocks.gameFindMany.mockResolvedValue([{ ...oldRow, commenceTime: new Date("2026-09-05T19:20:00.000Z") }]);
    mocks.pickFindUnique.mockResolvedValue(null);
    mocks.gameUpdate.mockResolvedValue({});
    mocks.pickCreate.mockResolvedValue({});
    mocks.buildIndependents.mockResolvedValue([
      { source: "espn_powerindex", homeFairProb: 0.68, awayFairProb: 0.32, capturedAt: NOW.toISOString() },
    ]);

    await runSlate();

    const commenceUpdates = mocks.gameUpdate.mock.calls.filter(
      (c) => Object.prototype.hasOwnProperty.call((c[0] as { data: Record<string, unknown> }).data, "commenceTime"),
    );
    expect(commenceUpdates).toHaveLength(0);
  });
});
