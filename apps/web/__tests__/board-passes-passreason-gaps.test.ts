/**
 * Gap coverage for the passReason() helper in lib/board/passes.ts.
 *
 * board-gate-decisions.test.ts covers loadBoardPasses only when gate decisions
 * are already persisted (gateDecisions.length > 0), so the fallback DB-game
 * query path is never exercised and passReason() is never reached.
 *
 * This file forces that fallback by returning an empty decisions array and
 * populating the game query — hitting all three passReason branches:
 *   - bookmakerCoverageMax < 3  → "Market depth below publish threshold."
 *   - dataQualityScore < 70     → "Evidence health below publish threshold."
 *   - else                      → "No pick cleared the publish threshold."
 */

import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  gateDecisionFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
  gameFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    gateDecision: { findMany: mocks.gateDecisionFindMany },
    game: { findMany: mocks.gameFindMany },
  },
  getSamplePicks: () => [],
  isDemoPicksEnabled: () => false,
  isStubMode: () => false,
}));

import { loadBoardPasses } from "@/lib/board/passes";

const NOW = new Date("2026-05-22T16:00:00.000Z");

function makeGame(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "game-1",
    awayTeamName: "BOS",
    homeTeamName: "NYY",
    currentEdgeIndex: 61,
    bookmakerCoverageMax: 5,
    dataQualityScore: 80,
    updatedAt: new Date("2026-05-22T15:00:00.000Z"),
    sport: { name: "MLB" },
    ...overrides,
  };
}

beforeEach(() => {
  mocks.gateDecisionFindMany.mockResolvedValue([]);
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  mocks.gateDecisionFindMany.mockReset();
  mocks.gameFindMany.mockReset();
});

// ============================================================
// passReason branch 1 — bookmakerCoverageMax < 3
// ============================================================

describe("passReason — bookmakerCoverageMax < 3", () => {
  it("returns 'Market depth below publish threshold.' when coverage < 3", async () => {
    mocks.gameFindMany.mockResolvedValue([
      makeGame({ bookmakerCoverageMax: 2, dataQualityScore: 85 }),
    ]);

    const result = await loadBoardPasses(NOW);

    expect(result.data.passes[0]?.reason).toBe("Market depth below publish threshold.");
    expect(result.meta.isSampleData).toBe(false);
  });

  it("boundary: bookmakerCoverageMax === 2 (< 3) still triggers market-depth reason", async () => {
    mocks.gameFindMany.mockResolvedValue([
      makeGame({ bookmakerCoverageMax: 2, dataQualityScore: 99 }),
    ]);

    const result = await loadBoardPasses(NOW);

    expect(result.data.passes[0]?.reason).toBe("Market depth below publish threshold.");
  });
});

// ============================================================
// passReason branch 2 — dataQualityScore < 70 (coverage >= 3)
// ============================================================

describe("passReason — dataQualityScore < 70 (coverage is sufficient)", () => {
  it("returns 'Evidence health below publish threshold.' when quality < 70", async () => {
    mocks.gameFindMany.mockResolvedValue([
      makeGame({ bookmakerCoverageMax: 5, dataQualityScore: 60 }),
    ]);

    const result = await loadBoardPasses(NOW);

    expect(result.data.passes[0]?.reason).toBe("Evidence health below publish threshold.");
  });

  it("boundary: dataQualityScore === 69 (< 70) still triggers evidence-health reason", async () => {
    mocks.gameFindMany.mockResolvedValue([
      makeGame({ bookmakerCoverageMax: 3, dataQualityScore: 69 }),
    ]);

    const result = await loadBoardPasses(NOW);

    expect(result.data.passes[0]?.reason).toBe("Evidence health below publish threshold.");
  });
});

// ============================================================
// passReason branch 3 — default (both thresholds met)
// ============================================================

describe("passReason — else branch (default: coverage OK, quality OK)", () => {
  it("returns 'No pick cleared the publish threshold.' when both thresholds are met", async () => {
    mocks.gameFindMany.mockResolvedValue([
      makeGame({ bookmakerCoverageMax: 5, dataQualityScore: 80 }),
    ]);

    const result = await loadBoardPasses(NOW);

    expect(result.data.passes[0]?.reason).toBe("No pick cleared the publish threshold.");
  });

  it("boundary: bookmakerCoverageMax === 3 and dataQualityScore === 70 → default reason", async () => {
    mocks.gameFindMany.mockResolvedValue([
      makeGame({ bookmakerCoverageMax: 3, dataQualityScore: 70 }),
    ]);

    const result = await loadBoardPasses(NOW);

    expect(result.data.passes[0]?.reason).toBe("No pick cleared the publish threshold.");
  });
});

// ============================================================
// passReason priority — coverage check fires first
// ============================================================

describe("passReason — coverage check wins over quality check", () => {
  it("when coverage < 3 and quality < 70, market-depth reason takes priority", async () => {
    mocks.gameFindMany.mockResolvedValue([
      makeGame({ bookmakerCoverageMax: 1, dataQualityScore: 50 }),
    ]);

    const result = await loadBoardPasses(NOW);

    expect(result.data.passes[0]?.reason).toBe("Market depth below publish threshold.");
  });
});

// ============================================================
// fallback path metadata
// ============================================================

describe("passes fallback path — metadata shape", () => {
  it("date slice uses now.toISOString().slice(0, 10)", async () => {
    mocks.gameFindMany.mockResolvedValue([makeGame()]);

    const result = await loadBoardPasses(NOW);

    expect(result.data.date).toBe("2026-05-22");
  });

  it("empty games array returns empty passes list (no crash)", async () => {
    mocks.gameFindMany.mockResolvedValue([]);

    const result = await loadBoardPasses(NOW);

    expect(result.data.passes).toHaveLength(0);
    expect(result.meta.isSampleData).toBe(false);
  });
});
