import { beforeEach, describe, expect, it, vi } from "vitest";
import { flagEnabled, waitlistGated } from "@/lib/env/flags";
import { resolveBoardSurface } from "@/lib/board/board-surface-policy";
import { passesPublicSelectiveFilter } from "@/lib/calibration/selective-publish-runtime";

// The dual-freshness gate reads `pick.findFirst` twice: the generation-SLA
// probe, then the upcoming-signal fallback. Mocked here so the product law can
// be exercised without a database.
const freshnessMocks = vi.hoisted(() => ({ pickFindFirst: vi.fn() }));

vi.mock("@sports/db", () => ({
  db: {
    pick: { findFirst: freshnessMocks.pickFindFirst },
    ingestionRun: { findFirst: vi.fn(async () => null) },
  },
  isDemoPicksEnabled: () => false,
  isStubMode: () => false,
}));

import { isSignalBoardSlateStale } from "@/lib/data-reliability/public-freshness-gate";

describe("founding env defaults", () => {
  it("waitlist open when gate true but FORCE unset (legacy)", () => {
    expect(
      waitlistGated({ GSE_WAITLIST_GATE_ENABLED: "true" }),
    ).toBe(false);
  });

  it("waitlist gated only with both flags", () => {
    expect(
      waitlistGated({
        GSE_WAITLIST_GATE_ENABLED: "true",
        GSE_WAITLIST_BASIC_FORCE: "true",
      }),
    ).toBe(true);
  });

  it("flagEnabled unset is false", () => {
    expect(flagEnabled("SELECTIVE_PUBLISH_ENABLED", {})).toBe(false);
  });

  it("board auto signal when odds stale", () => {
    expect(resolveBoardSurface({}, { oddsFresh: false })).toBe("signal");
    expect(resolveBoardSurface({}, { oddsFresh: true })).toBe("market");
  });

  it("selective filter default ON drops coin-flips", () => {
    expect(passesPublicSelectiveFilter({ confidence: 50 }, {})).toBe(false);
  });

  it("selective filter on drops coin-flips", () => {
    const env = { SELECTIVE_PUBLISH_ENABLED: "true", SELECTIVE_PUBLISH_DELTA: "0.10" };
    expect(passesPublicSelectiveFilter({ confidence: 50 }, env)).toBe(false);
    expect(passesPublicSelectiveFilter({ confidence: 65 }, env)).toBe(true);
  });

  it("pause groups", () => {
    const env = {
      SELECTIVE_PUBLISH_ENABLED: "true",
      SELECTIVE_PAUSE_GROUPS: "mlb|ml",
    };
    expect(
      passesPublicSelectiveFilter(
        { confidence: 70, sportKey: "mlb", pickType: "ml" },
        env,
      ),
    ).toBe(false);
  });
});

describe("signal board product law", () => {
  /**
   * THIS SUITE USED TO BE `expect(true).toBe(true)` UNDER A DOCSTRING CLAIMING
   * TO COVER THE DUAL-FRESHNESS RULE. A test that cannot fail is worse than no
   * test: it reports coverage of CLAUDE.md rule 5 (no stale data) while
   * asserting nothing, so any regression in the gate ships green.
   *
   * The rule it now actually exercises: the signal board is FRESH if EITHER a
   * published non-seed pick was generated inside the refresh SLA, OR a
   * published non-seed PENDING pick exists on a game commencing in the next 7
   * days. The second clause is what keeps the board open during a quiet odds
   * cycle, and it is the half a naive "last pick is old" check would drop.
   */
  const NOW = new Date("2026-09-08T12:00:00.000Z");
  const STALE_GENERATION = new Date("2026-09-01T12:00:00.000Z");

  beforeEach(() => {
    freshnessMocks.pickFindFirst.mockReset();
  });

  it("is FRESH when a published pick was generated inside the SLA", async () => {
    freshnessMocks.pickFindFirst.mockResolvedValueOnce({ generatedAt: NOW });
    await expect(isSignalBoardSlateStale(NOW)).resolves.toBe(false);
    // The upcoming-signal fallback must not even be consulted on this branch.
    expect(freshnessMocks.pickFindFirst).toHaveBeenCalledTimes(1);
  });

  it("is FRESH on a stale generation time when an upcoming PENDING signal exists", async () => {
    freshnessMocks.pickFindFirst
      .mockResolvedValueOnce({ generatedAt: STALE_GENERATION })
      .mockResolvedValueOnce({ id: "pick-upcoming" });
    await expect(isSignalBoardSlateStale(NOW)).resolves.toBe(false);

    // Pinned on the QUERY: the fallback only counts a PUBLISHED, non-bootstrap,
    // non-seed PENDING pick on a game inside the 7-day horizon. Loosening any
    // of those would keep the board open on evidence it should not accept.
    const where = (freshnessMocks.pickFindFirst.mock.calls[1]?.[0] as {
      where: {
        isPublished: boolean;
        isBootstrap: boolean;
        result: string;
        NOT: { modelVersion: string };
        game: { commenceTime: { gte: Date; lte: Date } };
      };
    }).where;
    expect(where.isPublished).toBe(true);
    expect(where.isBootstrap).toBe(false);
    expect(where.result).toBe("PENDING");
    expect(where.NOT.modelVersion).toBe("v5.0.0-seed");
    const horizonDays =
      (where.game.commenceTime.lte.getTime() - where.game.commenceTime.gte.getTime()) /
      (24 * 60 * 60 * 1000);
    expect(horizonDays).toBe(7);
  });

  it("is STALE when generation is old AND no upcoming signal exists", async () => {
    freshnessMocks.pickFindFirst
      .mockResolvedValueOnce({ generatedAt: STALE_GENERATION })
      .mockResolvedValueOnce(null);
    await expect(isSignalBoardSlateStale(NOW)).resolves.toBe(true);
  });

  it("is STALE when there has never been a published pick at all", async () => {
    // The empty-board case. A null generation time must not read as fresh.
    freshnessMocks.pickFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    await expect(isSignalBoardSlateStale(NOW)).resolves.toBe(true);
  });
});
