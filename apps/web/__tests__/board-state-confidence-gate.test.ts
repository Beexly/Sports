import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BoardStatePayload, BoardStateRow } from "@/lib/board/state";

/**
 * Server-side paywall enforcement for /api/board/state.
 *
 * Confidence is a PRO+ metric (canSeeConfidence). The board API is
 * public, but the numeric confidence must be redacted for anonymous
 * and FREE viewers — CLAUDE.md rule #3: no frontend-only paywalls.
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<{ user?: { id: string } } | null>>(),
  getUserEntitlements: vi.fn<(userId: string) => Promise<{ canSeeConfidence: boolean }>>(),
  loadBoardState: vi.fn<() => Promise<BoardStatePayload>>(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/entitlements", () => ({ getUserEntitlements: mocks.getUserEntitlements }));
vi.mock("@/lib/board/state", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/board/state")>();
  return { ...actual, loadBoardState: mocks.loadBoardState };
});

import { GET } from "@/app/api/board/state/route";
import { redactBoardConfidence } from "@/lib/board/state";

function row(overrides: Partial<BoardStateRow> = {}): BoardStateRow {
  return {
    id: "row-1",
    gameId: "game-1",
    matchup: "BOS @ NYY",
    sport: "MLB",
    market: "SPREAD",
    status: "PUBLISHED_TODAY",
    edgeIndex: 61,
    confidence: 74,
    gateReason: null,
    updatedAt: "2026-06-11T15:00:00.000Z",
    ...overrides,
  };
}

function payload(rows: BoardStateRow[]): BoardStatePayload {
  return {
    data: {
      sportsWatched: 1,
      booksPolled: 11,
      openPicks: rows.length,
      gatedToday: 0,
      lastRefresh: "2026-06-11T15:00:00.000Z",
      modelVersion: "v5.0.0",
      bootstrap: false,
      scoringNow: [],
      publishedToday: rows,
      gatedTodayRows: [],
    },
    meta: {
      degradations: [],
      health: {
        draftOnly: true,
        generatedAt: "2026-06-11T15:00:00.000Z",
        label: "Healthy",
        priced: false,
        rowCount: rows.length,
        status: "HEALTHY",
      },
      isSampleData: false,
      traceId: "board-20260611T15000-test0001",
      boardClass: {
        state: "HAS_ROWS",
        publicMessage: "Board has active rows.",
        refusePublicFire: false,
        honestEmpty: false,
      },
    },
  };
}

describe("GET /api/board/state — confidence paywall", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.getUserEntitlements.mockReset();
    mocks.loadBoardState.mockReset();
  });

  it("redacts confidence for anonymous viewers", async () => {
    mocks.auth.mockResolvedValue(null);
    mocks.loadBoardState.mockResolvedValue(payload([row({ confidence: 74 })]));

    const res = await GET();
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data.publishedToday[0].confidence).toBeNull();
    expect(mocks.getUserEntitlements).not.toHaveBeenCalled();
  });

  it("redacts confidence for FREE-tier viewers", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "free-user" } });
    mocks.getUserEntitlements.mockResolvedValue({ canSeeConfidence: false });
    mocks.loadBoardState.mockResolvedValue(payload([row({ confidence: 88 })]));

    const res = await GET();
    const body = await res.json();

    expect(body.data.publishedToday[0].confidence).toBeNull();
    expect(mocks.getUserEntitlements).toHaveBeenCalledWith("free-user");
  });

  it("returns confidence for PRO+ viewers", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "pro-user" } });
    mocks.getUserEntitlements.mockResolvedValue({ canSeeConfidence: true });
    mocks.loadBoardState.mockResolvedValue(payload([row({ confidence: 88 })]));

    const res = await GET();
    const body = await res.json();

    expect(body.data.publishedToday[0].confidence).toBe(88);
  });

  it("keeps non-confidence board data public after redaction", async () => {
    mocks.auth.mockResolvedValue(null);
    mocks.loadBoardState.mockResolvedValue(payload([row({ confidence: 74, edgeIndex: 61 })]));

    const res = await GET();
    const body = await res.json();

    const published = body.data.publishedToday[0];
    expect(published.edgeIndex).toBe(61);
    expect(published.matchup).toBe("BOS @ NYY");
    expect(body.data.openPicks).toBe(1);
  });
});

describe("redactBoardConfidence", () => {
  it("nulls confidence across all three lanes", () => {
    const input = payload([]);
    input.data.scoringNow = [row({ id: "s1", status: "SCORING_NOW", confidence: 55 })];
    input.data.publishedToday = [row({ id: "p1", confidence: 74 })];
    input.data.gatedTodayRows = [row({ id: "g1", status: "GATED_TODAY", confidence: 33 })];

    const redacted = redactBoardConfidence(input);

    expect(redacted.data.scoringNow[0]!.confidence).toBeNull();
    expect(redacted.data.publishedToday[0]!.confidence).toBeNull();
    expect(redacted.data.gatedTodayRows[0]!.confidence).toBeNull();
  });

  it("does not mutate the original payload", () => {
    const input = payload([row({ confidence: 74 })]);
    redactBoardConfidence(input);
    expect(input.data.publishedToday[0]!.confidence).toBe(74);
  });

  it("preserves rows that already have null confidence", () => {
    const input = payload([row({ confidence: null, gateReason: "Market depth below publish threshold." })]);
    const redacted = redactBoardConfidence(input);
    expect(redacted.data.publishedToday[0]!.confidence).toBeNull();
    expect(redacted.data.publishedToday[0]!.gateReason).toBe("Market depth below publish threshold.");
  });
});
