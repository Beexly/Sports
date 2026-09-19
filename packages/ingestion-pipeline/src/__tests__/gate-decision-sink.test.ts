import { describe, expect, it, vi, beforeEach } from "vitest";
import { persistGateDecisions, type GateDecisionInput } from "../gate-decision-sink.js";
import { db } from "@sports/db";

/**
 * The rows handed to createMany, read without `as any` (forbidden by AGENTS.md)
 * and without unchecked indexing. A mock call that never happened is a test
 * failure, not an undefined to propagate, so this throws with a clear message
 * instead of letting the assertion below fail on a confusing property read.
 */
interface PersistedGateDecisionRow {
  readonly gameId: string;
  readonly status: string;
  readonly reasonCode: string;
  readonly reason: string;
}

function persistedRows(mock: { mock: { calls: unknown[][] } }): readonly PersistedGateDecisionRow[] {
  const firstCall = mock.mock.calls[0];
  if (firstCall === undefined) throw new Error("createMany was never called");
  const arg = firstCall[0] as { data?: readonly PersistedGateDecisionRow[] } | undefined;
  if (arg?.data === undefined) throw new Error("createMany was called without a data array");
  return arg.data;
}


vi.mock("@sports/db", () => ({
  db: {
    gateDecision: {
      createMany: vi.fn(),
    },
  },
}));

describe("gate-decision-sink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns { attempted: 0, persisted: 0 } for an empty input batch without DB calls", async () => {
    const res = await persistGateDecisions([]);
    expect(res).toEqual({ attempted: 0, persisted: 0 });
    expect(db.gateDecision.createMany).not.toHaveBeenCalled();
  });

  it("deduplicates multiple decisions for the same gameId in a single cycle", async () => {
    const mockCreateMany = vi.mocked(db.gateDecision.createMany);
    mockCreateMany.mockResolvedValue({ count: 2 });

    const now = new Date("2026-09-18T20:00:00.000Z");
    const input: GateDecisionInput[] = [
      {
        gameId: "game-1",
        status: "PUBLISHED",
        reasonCode: "PUBLISHED",
        reason: "Published spread pick KC -3.5",
        confidence: 65,
        edgeIndex: 0.12,
        modelVersion: "v5.2.7",
        isBootstrap: false,
        evaluatedAt: now,
      },
      {
        gameId: "game-1", // duplicate gameId in same cycle
        status: "GATED",
        reasonCode: "NO_CONVICTION_EDGE",
        reason: "Overruled",
        modelVersion: "v5.2.7",
        isBootstrap: false,
        evaluatedAt: now,
      },
      {
        gameId: "game-2",
        status: "GATED",
        reasonCode: "INSUFFICIENT_BOOKMAKERS",
        reason: "Only 1 bookmaker quoting line",
        modelVersion: "v5.2.7",
        isBootstrap: false,
        evaluatedAt: now,
      },
    ];

    const res = await persistGateDecisions(input);

    expect(res.attempted).toBe(3);
    expect(res.persisted).toBe(2);
    expect(mockCreateMany).toHaveBeenCalledTimes(1);

    const rows = persistedRows(mockCreateMany);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.gameId).toBe("game-1");
    expect(rows[0]?.status).toBe("PUBLISHED");
    expect(rows[1]?.gameId).toBe("game-2");
    expect(rows[1]?.reasonCode).toBe("INSUFFICIENT_BOOKMAKERS");
  });

  it("truncates reason to 240 chars and reasonCode to 80 chars to conform to schema bounds", async () => {
    const mockCreateMany = vi.mocked(db.gateDecision.createMany);
    mockCreateMany.mockResolvedValue({ count: 1 });

    const longReason = "A".repeat(300);
    const longReasonCode = "B".repeat(120);

    const res = await persistGateDecisions([
      {
        gameId: "game-overflow",
        status: "GATED",
        reasonCode: longReasonCode,
        reason: longReason,
        modelVersion: "v5.2.7",
        isBootstrap: false,
        evaluatedAt: new Date(),
      },
    ]);

    expect(res.persisted).toBe(1);
    const persistedRow = persistedRows(mockCreateMany)[0];
    expect(persistedRow?.reason.length).toBe(240);
    expect(persistedRow?.reasonCode.length).toBe(80);
  });

  it("fails safely when db.gateDecision.createMany throws, returning error without throwing", async () => {
    const mockCreateMany = vi.mocked(db.gateDecision.createMany);
    mockCreateMany.mockRejectedValue(new Error("Database connection timeout"));

    const res = await persistGateDecisions([
      {
        gameId: "game-err",
        status: "GATED",
        reasonCode: "NO_CONVICTION_EDGE",
        reason: "Failed write test",
        modelVersion: "v5.2.7",
        isBootstrap: false,
        evaluatedAt: new Date(),
      },
    ]);

    expect(res.attempted).toBe(1);
    expect(res.persisted).toBe(0);
    expect(res.error).toContain("Database connection timeout");
  });
});
