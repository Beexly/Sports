import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BoardStatePayload } from "@/lib/board/state";

/**
 * C-351 — LP0 /gsn failure says it failed.
 *
 * SAMPLE_TRANSMISSION is banned from the buildDailyTransmission fallback
 * path. Empty, suppressed-demo, data-error, and load-failed all return an
 * explicit unavailable Transmission: source "unavailable", empty summary
 * (zero invented counts), empty segments.
 */

const mocks = vi.hoisted(() => ({
  loadBoardState: vi.fn<() => Promise<BoardStatePayload>>(),
}));

vi.mock("@/lib/board/state", () => ({ loadBoardState: mocks.loadBoardState }));

import { buildDailyTransmission, unavailableTransmission } from "@/lib/gsn/build-transmission";
import { SAMPLE_TRANSMISSION } from "@/lib/gsn/transmission";

const NOW = new Date("2026-09-15T12:00:00.000Z");

function payload(overrides: Partial<BoardStatePayload["meta"]> = {}): BoardStatePayload {
  return {
    data: {
      sportsWatched: 0,
      booksPolled: 0,
      openPicks: 0,
      gatedToday: 0,
      lastRefresh: NOW.toISOString(),
      modelVersion: "test",
      bootstrap: false,
      scoringNow: [],
      publishedToday: [],
      gatedTodayRows: [],
    },
    meta: {
      isSampleData: false,
      traceId: "test-trace",
      degradations: [],
      health: {
        draftOnly: true,
        generatedAt: NOW.toISOString(),
        label: "Healthy",
        priced: false,
        rowCount: 0,
        status: "HEALTHY",
      },
      boardClass: {
        state: "HONEST_EMPTY_NO_ELIGIBLE",
        publicMessage: "Empty.",
        refusePublicFire: true,
        honestEmpty: true,
      },
      degradationCharacter: "genuinely_quiet",
      ...overrides,
    },
  };
}

/** SAMPLE_TRANSMISSION's invented marketing numbers must never reappear. */
const SAMPLE_MARKERS = [
  "Market Mirages",
  "Roster Shocks",
  "Coaching Edges",
  "Games Under Review",
  "Seventeen games under review",
];

function assertUnavailable(
  t: Awaited<ReturnType<typeof buildDailyTransmission>>,
  reason: string,
): void {
  expect(t.source).toBe("unavailable");
  expect(t.unavailableReason).toBe(reason);
  expect(t.illustrative).toBe(false);
  // Zero invented counts — summary must be empty, never SAMPLE counts.
  expect(t.summary).toEqual([]);
  expect(t.segments).toEqual([]);
  const serialized = JSON.stringify(t);
  for (const marker of SAMPLE_MARKERS) {
    expect(serialized).not.toContain(marker);
  }
}

describe("buildDailyTransmission — unavailable fallbacks (C-351)", () => {
  beforeEach(() => {
    mocks.loadBoardState.mockReset();
  });

  it("empty board → unavailable empty-board, no SAMPLE_TRANSMISSION", async () => {
    mocks.loadBoardState.mockResolvedValue(payload());
    const t = await buildDailyTransmission(NOW);
    assertUnavailable(t, "empty-board");
  });

  it("suppressed demo → unavailable suppressed-demo, no SAMPLE_TRANSMISSION", async () => {
    mocks.loadBoardState.mockResolvedValue(payload({ suppressedDemoData: true }));
    const t = await buildDailyTransmission(NOW);
    assertUnavailable(t, "suppressed-demo");
  });

  it("dataError → unavailable data-error, no SAMPLE_TRANSMISSION", async () => {
    mocks.loadBoardState.mockResolvedValue(payload({ dataError: "DB_UNREACHABLE" }));
    const t = await buildDailyTransmission(NOW);
    assertUnavailable(t, "data-error");
  });

  it("loadBoardState throw → unavailable load-failed, no SAMPLE_TRANSMISSION", async () => {
    mocks.loadBoardState.mockRejectedValue(new Error("db down"));
    const t = await buildDailyTransmission(NOW);
    assertUnavailable(t, "load-failed");
  });

  it("unavailableTransmission helper is count-free by construction", () => {
    const t = unavailableTransmission(NOW, "load-failed");
    assertUnavailable(t, "load-failed");
    // Guard the pin against a future SAMPLE re-import into this path.
    expect(t.summary.every((s) => s.count === 0)).toBe(true);
    expect(SAMPLE_TRANSMISSION.summary.some((s) => s.count > 0)).toBe(true);
  });
});
