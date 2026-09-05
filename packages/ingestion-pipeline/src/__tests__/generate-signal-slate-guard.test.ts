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
  sport: { key: "americanfootball_ncaaf", name: "NCAAF" },
};

beforeEach(() => {
  vi.clearAllMocks();
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
    const out = await generateSignalSlate({ now: NOW, skipSeed: true });
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
    const out = await generateSignalSlate({ now: NOW, skipSeed: true });
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
    const out = await generateSignalSlate({ now: NOW, skipSeed: true });
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

  it("never writes a two-way moneyline signal for soccer (three-way market)", async () => {
    mocks.gameFindMany.mockResolvedValue([
      { ...GAME, id: "game-mls", homeTeamName: "Portland Timbers", awayTeamName: "Austin FC", sport: { key: "soccer_usa_mls", name: "MLS" } },
    ]);
    mocks.pickFindUnique.mockResolvedValue(null);
    const out = await generateSignalSlate({ now: NOW, skipSeed: true });
    expect(mocks.buildIndependents).not.toHaveBeenCalled();
    expect(mocks.pickCreate).not.toHaveBeenCalled();
    expect(mocks.pickUpdateMany).not.toHaveBeenCalled();
    expect(out.picksUpserted).toBe(0);
    expect(out.picksSkipped).toBe(1);
  });
});
