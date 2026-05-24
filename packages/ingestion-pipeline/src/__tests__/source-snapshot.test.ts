import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";

vi.mock("@sports/db", () => ({
  db: {
    sourceSnapshot: {
      create: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

import { recordSourceSnapshot } from "../source-snapshot.js";
import { db } from "@sports/db";

const mockCreate = vi.mocked(
  (db.sourceSnapshot as unknown as { create: ReturnType<typeof vi.fn> }).create
);

// stableStringify is private; we exercise it indirectly through recordSourceSnapshot
// by inspecting the payloadHash and payloadBytes arguments passed to db.sourceSnapshot.create.
function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

describe("stableStringify — key ordering", () => {
  it("produces identical hash regardless of object key insertion order", async () => {
    const fetchedAt = new Date("2026-01-01T00:00:00Z");

    await recordSourceSnapshot({
      provider: "p",
      sourceKind: "ODDS_EVENTS",
      fetchedAt,
      payload: { z: 1, a: 2, m: 3 },
    });
    const call1 = mockCreate.mock.calls[0]?.[0] as { data: { payloadHash: string } };

    mockCreate.mockClear();

    await recordSourceSnapshot({
      provider: "p",
      sourceKind: "ODDS_EVENTS",
      fetchedAt,
      payload: { a: 2, m: 3, z: 1 },
    });
    const call2 = mockCreate.mock.calls[0]?.[0] as { data: { payloadHash: string } };

    expect(call1.data.payloadHash).toBe(call2.data.payloadHash);
  });

  it("produces different hashes for different values", async () => {
    const fetchedAt = new Date("2026-01-01T00:00:00Z");

    await recordSourceSnapshot({
      provider: "p",
      sourceKind: "ODDS_EVENTS",
      fetchedAt,
      payload: { a: 1 },
    });
    const callA = mockCreate.mock.calls[0]?.[0] as { data: { payloadHash: string } };

    mockCreate.mockClear();

    await recordSourceSnapshot({
      provider: "p",
      sourceKind: "ODDS_EVENTS",
      fetchedAt,
      payload: { a: 2 },
    });
    const callB = mockCreate.mock.calls[0]?.[0] as { data: { payloadHash: string } };

    expect(callA.data.payloadHash).not.toBe(callB.data.payloadHash);
  });
});

describe("stableStringify — nested objects", () => {
  it("sorts keys in nested objects too", async () => {
    const fetchedAt = new Date("2026-01-01T00:00:00Z");

    await recordSourceSnapshot({
      provider: "p",
      sourceKind: "ODDS_EVENTS",
      fetchedAt,
      payload: { outer: { z: 9, a: 1 } },
    });
    const callA = mockCreate.mock.calls[0]?.[0] as { data: { payloadHash: string } };

    mockCreate.mockClear();

    await recordSourceSnapshot({
      provider: "p",
      sourceKind: "ODDS_EVENTS",
      fetchedAt,
      payload: { outer: { a: 1, z: 9 } },
    });
    const callB = mockCreate.mock.calls[0]?.[0] as { data: { payloadHash: string } };

    expect(callA.data.payloadHash).toBe(callB.data.payloadHash);
  });
});

describe("stableStringify — arrays", () => {
  it("preserves array element order", async () => {
    const fetchedAt = new Date("2026-01-01T00:00:00Z");

    await recordSourceSnapshot({
      provider: "p",
      sourceKind: "ODDS_EVENTS",
      fetchedAt,
      payload: [1, 2, 3],
    });
    const callA = mockCreate.mock.calls[0]?.[0] as { data: { payloadHash: string } };

    mockCreate.mockClear();

    await recordSourceSnapshot({
      provider: "p",
      sourceKind: "ODDS_EVENTS",
      fetchedAt,
      payload: [3, 2, 1],
    });
    const callB = mockCreate.mock.calls[0]?.[0] as { data: { payloadHash: string } };

    expect(callA.data.payloadHash).not.toBe(callB.data.payloadHash);
  });
});

describe("stableStringify — primitives", () => {
  it("handles null payload", async () => {
    const fetchedAt = new Date("2026-01-01T00:00:00Z");

    await recordSourceSnapshot({
      provider: "p",
      sourceKind: "ODDS_EVENTS",
      fetchedAt,
      payload: null,
    });

    const call = mockCreate.mock.calls[0]?.[0] as { data: { payloadHash: string } };
    expect(call.data.payloadHash).toBe(sha256("null"));
  });

  it("handles string payload", async () => {
    const fetchedAt = new Date("2026-01-01T00:00:00Z");

    await recordSourceSnapshot({
      provider: "p",
      sourceKind: "ODDS_EVENTS",
      fetchedAt,
      payload: "hello",
    });

    const call = mockCreate.mock.calls[0]?.[0] as { data: { payloadHash: string } };
    expect(call.data.payloadHash).toBe(sha256('"hello"'));
  });
});

describe("recordSourceSnapshot — hash stability", () => {
  it("same input always produces the same hash", async () => {
    const fetchedAt = new Date("2026-05-01T12:00:00Z");
    const payload = { events: [{ id: "abc", odds: 1.95 }] };

    for (let i = 0; i < 3; i++) {
      mockCreate.mockClear();
      await recordSourceSnapshot({
        provider: "the-odds-api",
        sourceKind: "ODDS_EVENTS",
        fetchedAt,
        payload,
      });
    }

    const hashes = mockCreate.mock.calls.map(
      (c) => (c[0] as { data: { payloadHash: string } }).data.payloadHash
    );
    expect(new Set(hashes).size).toBe(1);
  });
});

describe("recordSourceSnapshot — payloadBytes", () => {
  it("payloadBytes equals UTF-8 byte length of stable-stringified payload", async () => {
    const fetchedAt = new Date("2026-01-01T00:00:00Z");
    const payload = { z: "hello", a: 42 };

    await recordSourceSnapshot({
      provider: "p",
      sourceKind: "ODDS_EVENTS",
      fetchedAt,
      payload,
    });

    const call = mockCreate.mock.calls[0]?.[0] as {
      data: { payloadBytes: number; payloadHash: string };
    };

    // stableStringify sorts keys: { a: 42, z: "hello" }
    const expectedText = JSON.stringify({ a: 42, z: "hello" });
    expect(call.data.payloadBytes).toBe(Buffer.byteLength(expectedText, "utf8"));
  });

  it("payloadBytes is positive for non-empty payloads", async () => {
    const fetchedAt = new Date("2026-01-01T00:00:00Z");

    await recordSourceSnapshot({
      provider: "p",
      sourceKind: "ODDS_EVENTS",
      fetchedAt,
      payload: { x: 1 },
    });

    const call = mockCreate.mock.calls[0]?.[0] as { data: { payloadBytes: number } };
    expect(call.data.payloadBytes).toBeGreaterThan(0);
  });
});

describe("recordSourceSnapshot — db fields", () => {
  it("passes all SourceSnapshotInput fields to db.sourceSnapshot.create", async () => {
    const fetchedAt = new Date("2026-03-15T10:00:00Z");

    await recordSourceSnapshot({
      provider: "the-odds-api",
      sourceKind: "ODDS_EVENTS",
      sport: "americanfootball_nfl",
      externalId: "ext-001",
      ingestionRunId: "run-abc",
      fetchedAt,
      payload: { value: 1 },
    });

    expect(mockCreate).toHaveBeenCalledOnce();
    const arg = mockCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(arg.data.provider).toBe("the-odds-api");
    expect(arg.data.sourceKind).toBe("ODDS_EVENTS");
    expect(arg.data.sport).toBe("americanfootball_nfl");
    expect(arg.data.externalId).toBe("ext-001");
    expect(arg.data.ingestionRunId).toBe("run-abc");
    expect(arg.data.fetchedAt).toBe(fetchedAt);
  });

  it("sets sport/externalId/ingestionRunId to null when omitted", async () => {
    const fetchedAt = new Date("2026-01-01T00:00:00Z");

    await recordSourceSnapshot({
      provider: "p",
      sourceKind: "ODDS_EVENTS",
      fetchedAt,
      payload: {},
    });

    const arg = mockCreate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(arg.data.sport).toBeNull();
    expect(arg.data.externalId).toBeNull();
    expect(arg.data.ingestionRunId).toBeNull();
  });

  it("propagates db errors", async () => {
    mockCreate.mockRejectedValueOnce(new Error("db down"));

    await expect(
      recordSourceSnapshot({
        provider: "p",
        sourceKind: "ODDS_EVENTS",
        fetchedAt: new Date(),
        payload: {},
      })
    ).rejects.toThrow("db down");
  });
});

// Reset between each test so mock call counts are clean.
beforeEach(() => {
  mockCreate.mockClear();
  mockCreate.mockResolvedValue(undefined);
});
