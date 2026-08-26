import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /board's "today" must be the platform day of the CALLER'S clock.
 *
 * `loadBoardPasses(now)` and `loadBoardState(now)` both accept an injected
 * instant and both stamp it onto the payload (`data.date`, `lastRefresh`).
 * Their day WINDOW must come from that same instant and from the one shared
 * definition (lib/time/day-boundary.ts — the UTC calendar day).
 *
 * Before this was pinned, the private `todayBounds()` helper in each module
 * got it wrong twice over:
 *
 *   1. it called `new Date()` internally, ignoring the injected `now` — so the
 *      label and the window came from two different clock reads and could land
 *      on two different days across midnight, and
 *   2. it anchored on `setHours(0, 0, 0, 0)`, i.e. the AMBIENT process
 *      timezone, so the boundary followed whatever zone the host happened to
 *      be in rather than a stated convention.
 *
 * The instant below is deliberately a straddle: 2026-09-07T03:30:00Z is
 * 11:30pm Sunday in New York and 8:30pm Sunday in Los Angeles, but 03:30 on
 * MONDAY in UTC. A midday-UTC timestamp would pass against the broken helper
 * too (whenever the suite happened to run on that calendar day) and would
 * prove nothing.
 */

const gateDecisionFindMany = vi.fn();
const gameFindMany = vi.fn();

vi.mock("@sports/db", () => ({
  db: {
    gateDecision: { findMany: (...a: unknown[]) => gateDecisionFindMany(...a) },
    game: { findMany: (...a: unknown[]) => gameFindMany(...a) },
  },
  isStubMode: () => false,
  isDemoPicksEnabled: () => false,
}));

vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: () => ({ forceNoBetIfStale: false }),
  toEdgeIndex: (v: number | null) => v,
}));

vi.mock("@/lib/data-reliability/public-freshness-gate", () => ({
  isPublicPicksSurfaceStale: async () => false,
}));

import { loadBoardPasses } from "@/lib/board/passes";
import { utcDayWindow } from "@/lib/time/day-boundary";

/** 2026-09-07 03:30 UTC — Sunday 11:30pm ET, Monday 03:30 UTC. */
const STRADDLE = new Date("2026-09-07T03:30:00.000Z");

type WhereArg = {
  where: {
    evaluatedAt?: { gte: Date; lt: Date };
    commenceTime?: { gte: Date; lt: Date };
  };
};

beforeEach(() => {
  gateDecisionFindMany.mockReset();
  gameFindMany.mockReset();
  gateDecisionFindMany.mockResolvedValue([]);
  gameFindMany.mockResolvedValue([]);
});

describe("/board pass list — the day window comes from the injected clock", () => {
  it("queries GATED decisions over the injected instant's UTC day", async () => {
    await loadBoardPasses(STRADDLE);

    const call = gateDecisionFindMany.mock.calls[0]?.[0] as WhereArg | undefined;
    expect(call, "db.gateDecision.findMany was not called").toBeDefined();

    const window = call!.where.evaluatedAt;
    expect(window, "the gated-today query lost its day window").toBeDefined();
    expect(window!.gte.toISOString()).toBe("2026-09-07T00:00:00.000Z");
    expect(window!.lt.toISOString()).toBe("2026-09-08T00:00:00.000Z");
  });

  it("queries today's games over the SAME window as the gated decisions", async () => {
    await loadBoardPasses(STRADDLE);

    const gateCall = gateDecisionFindMany.mock.calls[0]?.[0] as WhereArg;
    const gameCall = gameFindMany.mock.calls[0]?.[0] as WhereArg | undefined;
    expect(gameCall, "db.game.findMany was not called").toBeDefined();

    // Both lanes of one public board must describe one day.
    expect(gameCall!.where.commenceTime!.gte.toISOString()).toBe(
      gateCall.where.evaluatedAt!.gte.toISOString(),
    );
    expect(gameCall!.where.commenceTime!.lt.toISOString()).toBe(
      gateCall.where.evaluatedAt!.lt.toISOString(),
    );
  });

  it("labels the payload with the same day it queried", async () => {
    const result = await loadBoardPasses(STRADDLE);
    const call = gateDecisionFindMany.mock.calls[0]?.[0] as WhereArg;

    // The label and the window are the classic pair that drifts apart: a UTC
    // `toISOString()` label over a runtime-local window.
    expect(result.data.date).toBe("2026-09-07");
    expect(call.where.evaluatedAt!.gte.toISOString().slice(0, 10)).toBe(result.data.date);
  });

  it("moves the window with the clock, not with the host timezone", async () => {
    // One millisecond later than the previous UTC day's last instant, and the
    // first instant of the next UTC day: the window must step exactly once.
    for (const instant of [
      new Date("2026-09-07T00:00:00.000Z"),
      new Date("2026-09-07T23:59:59.999Z"),
      new Date("2026-09-08T00:00:00.000Z"),
    ]) {
      gateDecisionFindMany.mockClear();
      await loadBoardPasses(instant);
      const call = gateDecisionFindMany.mock.calls[0]?.[0] as WhereArg;
      const expected = utcDayWindow(instant);
      expect(
        call.where.evaluatedAt!.gte.toISOString(),
        `window drifted for ${instant.toISOString()}`,
      ).toBe(expected.start.toISOString());
      expect(call.where.evaluatedAt!.lt.toISOString()).toBe(expected.end.toISOString());
    }
  });

  it("still honours the injected clock when the host is not in UTC", async () => {
    const prev = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    try {
      gateDecisionFindMany.mockClear();
      await loadBoardPasses(STRADDLE);
      const call = gateDecisionFindMany.mock.calls[0]?.[0] as WhereArg;
      // Under TZ=America/Los_Angeles the straddle instant is 8:30pm on Sep 6
      // LOCAL, so a local-midnight helper would ask for Sep 6. The platform day
      // is Sep 7 and must stay Sep 7.
      expect(call.where.evaluatedAt!.gte.toISOString()).toBe("2026-09-07T00:00:00.000Z");
      expect(call.where.evaluatedAt!.lt.toISOString()).toBe("2026-09-08T00:00:00.000Z");
    } finally {
      if (prev === undefined) delete process.env.TZ;
      else process.env.TZ = prev;
    }
  });
});
