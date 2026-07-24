import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The No-Bet detail split on the Board.
 *
 * Two properties matter here and they pull in opposite directions, so both are
 * pinned explicitly:
 *
 *  1. The REFUSAL IS NEVER GATED. Every tier, logged out included, sees that a
 *     game was passed on and the human-readable reason. That is the product's
 *     credibility claim; gating it would sell volume instead of judgement.
 *  2. The REASONING IS WITHHELD SERVER-SIDE. An unentitled caller's payload
 *     must not merely hide the audit trail in the markup — it must not contain
 *     it at all, so there is nothing to recover from the RSC flight data or a
 *     JSON route.
 */

const findMany = vi.fn();

vi.mock("@sports/db", () => ({
  db: {
    gateDecision: { findMany: (...a: unknown[]) => findMany(...a) },
    game: { findMany: async () => [] },
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

const GATED_ROW = {
  id: "gd-1",
  gameId: "game-1",
  status: "GATED",
  reason: "Market depth below publish threshold.",
  reasonCode: "MARKET_DEPTH_BELOW_FLOOR",
  edgeIndex: 41,
  confidence: 38,
  modelVersion: "v5.1.0",
  evaluatedAt: new Date("2026-07-24T12:00:00.000Z"),
  evidenceRefs: ["ref-a", "ref-b", "ref-c"],
  game: {
    awayTeamName: "Away",
    homeTeamName: "Home",
    sport: { name: "NFL" },
    currentEdgeIndex: 41,
  },
};

beforeEach(() => {
  findMany.mockReset();
  findMany.mockResolvedValue([GATED_ROW]);
});

describe("Board No-Bet — the refusal is free on every tier", () => {
  it("returns the pass and its human reason with NO entitlement passed at all", async () => {
    const result = await loadBoardPasses(new Date("2026-07-24T18:00:00.000Z"));
    const [pass] = result.data.passes;

    expect(pass).toBeDefined();
    expect(pass!.matchup).toBe("Away @ Home");
    expect(pass!.reason).toBe("Market depth below publish threshold.");
  });

  it("returns the refusal identically when detail is explicitly denied", async () => {
    const denied = await loadBoardPasses(new Date("2026-07-24T18:00:00.000Z"), {
      includeNoBetDetail: false,
    });
    const granted = await loadBoardPasses(new Date("2026-07-24T18:00:00.000Z"), {
      includeNoBetDetail: true,
    });

    // Same refusal, same reason — only the trail differs.
    expect(denied.data.passes[0]!.reason).toBe(granted.data.passes[0]!.reason);
    expect(denied.data.passes[0]!.matchup).toBe(granted.data.passes[0]!.matchup);
  });
});

describe("Board No-Bet — the reasoning is withheld server-side", () => {
  it("omits `detail` entirely when unentitled — not an empty object, not nulls", async () => {
    const result = await loadBoardPasses(new Date("2026-07-24T18:00:00.000Z"), {
      includeNoBetDetail: false,
    });
    const pass = result.data.passes[0]!;

    expect(pass.detail).toBeUndefined();
    expect(Object.keys(pass)).not.toContain("detail");
  });

  it("defaults to withholding when the option is omitted (fail-closed)", async () => {
    const result = await loadBoardPasses(new Date("2026-07-24T18:00:00.000Z"));
    expect(result.data.passes[0]!.detail).toBeUndefined();
  });

  it("the serialized unentitled payload contains no trace of the private fields", async () => {
    const result = await loadBoardPasses(new Date("2026-07-24T18:00:00.000Z"), {
      includeNoBetDetail: false,
    });
    // This is the property that matters: what crosses the wire. Checking the
    // serialized form catches a leak that a shallow key check would miss.
    const wire = JSON.stringify(result);

    expect(wire).not.toContain("MARKET_DEPTH_BELOW_FLOOR");
    expect(wire).not.toContain("v5.1.0");
    expect(wire).not.toContain("ref-a");
  });

  it("includes the full audit trail when entitled", async () => {
    const result = await loadBoardPasses(new Date("2026-07-24T18:00:00.000Z"), {
      includeNoBetDetail: true,
    });
    const detail = result.data.passes[0]!.detail;

    expect(detail).toEqual({
      reasonCode: "MARKET_DEPTH_BELOW_FLOOR",
      confidence: 38,
      modelVersion: "v5.1.0",
      evidenceRefCount: 3,
    });
  });

  it("never ships the raw evidenceRefs payload, only a count", async () => {
    findMany.mockResolvedValue([
      { ...GATED_ROW, evidenceRefs: { secretInternalKey: "do-not-ship", other: 1 } },
    ]);

    const result = await loadBoardPasses(new Date("2026-07-24T18:00:00.000Z"), {
      includeNoBetDetail: true,
    });

    expect(result.data.passes[0]!.detail!.evidenceRefCount).toBe(2);
    expect(JSON.stringify(result)).not.toContain("secretInternalKey");
    expect(JSON.stringify(result)).not.toContain("do-not-ship");
  });

  it("counts a null/absent evidenceRefs as zero rather than throwing", async () => {
    findMany.mockResolvedValue([{ ...GATED_ROW, evidenceRefs: null }]);

    const result = await loadBoardPasses(new Date("2026-07-24T18:00:00.000Z"), {
      includeNoBetDetail: true,
    });

    expect(result.data.passes[0]!.detail!.evidenceRefCount).toBe(0);
  });
});
