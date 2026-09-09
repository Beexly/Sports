import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("@sports/db", () => ({
  prisma: { teamGameLog: { findMany: mocks.findMany } },
  db: { teamGameLog: { findMany: mocks.findMany } },
}));

import { getAtsForm, getHeadToHeadForm } from "../context-enrichment.js";

/**
 * C-187. THE FORM WINDOWS HAD NO DATE BOUND.
 *
 * `getAtsForm` and `getHeadToHeadForm` took "the most recent N settled games"
 * with no cutoff, while their two siblings in the same file - computeRestDays
 * and computeScheduleDensity - both filter `gameDate: { lt: gameDate }` and
 * always did. The correct pattern and the incorrect one sat side by side.
 *
 * Unbounded is safe ONLY while every call happens in real time, because a game
 * that has not been played cannot be in TeamGameLog yet. On any reprocess,
 * backfill, or re-run after later fixtures settled - and this repo's history
 * includes backfill-ordering bugs - the window silently starts including
 * results from AFTER the game being predicted. That is the leak that makes a
 * model look excellent in testing and fall apart live.
 *
 * Asserted on the QUERY, because the bound has to be applied in the database:
 * filtering in memory after `take: N` would return the newest N rows overall
 * and then drop the future ones, leaving a window shorter than asked for -
 * and the same cap-before-the-filter shape this codebase keeps producing.
 */

const ROWS = Array.from({ length: 8 }, (_unused, i) => ({
  atsResult: i % 2 === 0 ? "WIN" : "LOSS",
  gameDate: new Date(`2026-08-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`),
}));

const KICKOFF = new Date("2026-09-08T17:00:00.000Z");

describe("form windows are bounded at the fixture's own kickoff", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
    mocks.findMany.mockResolvedValue(ROWS);
  });

  it("getAtsForm asks the database for games strictly BEFORE the as-of instant", async () => {
    await getAtsForm("Kansas City Chiefs", "americanfootball_nfl", KICKOFF, 15, undefined, true);

    const where = (mocks.findMany.mock.calls[0]?.[0] as {
      where: { gameDate?: { lt?: Date } };
      take?: number;
    });
    expect(where.where.gameDate?.lt).toEqual(KICKOFF);
    // Strictly before, never `lte` - a log row stamped at kickoff is the game
    // itself, which is the single row this bound exists to exclude.
    expect(where.where.gameDate).not.toHaveProperty("lte");
    // The window size is still honoured; the bound narrows, it does not replace.
    expect(where.take).toBe(15);
  });

  it("getHeadToHeadForm applies the same bound", async () => {
    await getHeadToHeadForm(
      "Kansas City Chiefs",
      "Denver Broncos",
      "americanfootball_nfl",
      KICKOFF,
      10,
      true,
    );

    const where = (mocks.findMany.mock.calls[0]?.[0] as {
      where: { gameDate?: { lt?: Date } };
      take?: number;
    });
    expect(where.where.gameDate?.lt).toEqual(KICKOFF);
    expect(where.take).toBe(10);
  });

  it("still returns a form reading when enough bounded history exists", async () => {
    // The control. A bound that returned nothing would also pass the two tests
    // above, and would silently delete a real feature from the engine.
    const form = await getAtsForm("Kansas City Chiefs", "americanfootball_nfl", KICKOFF);
    expect(form).not.toBeNull();
    expect(form?.sampleSize).toBe(8);
    expect((form?.wins ?? 0) + (form?.losses ?? 0) + (form?.pushes ?? 0)).toBe(8);
  });
});
