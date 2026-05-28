import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  findUniqueOrThrow: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  sourceHealthEvent: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock("@sports/db", () => ({
  db: {
    dataSource: {
      findUniqueOrThrow: mocks.findUniqueOrThrow,
      update: mocks.update,
      create: mocks.create,
      findFirst: mocks.findFirst,
      findMany: mocks.findMany,
      upsert: vi.fn(),
    },
    sourceHealthEvent: {
      create: mocks.sourceHealthEvent.create,
      findMany: mocks.sourceHealthEvent.findMany,
    },
  },
  Prisma: {},
}));

import { recordPollResult } from "@/lib/source-mesh";

function makeSource(overrides: Record<string, unknown> = {}) {
  return {
    id: "src-1",
    slug: "the-odds-api",
    displayName: "The Odds API",
    tier: 1,
    licenseApproved: true,
    isActive: true,
    circuitOpen: false,
    consecutiveFails: 0,
    lastPolledAt: null,
    lastSuccessAt: null,
    pollIntervalMs: 1800000,
    ttlSeconds: 1800,
    rateLimitRpm: 60,
    crawlDelayMs: 0,
    authType: "api_key",
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("Source Mesh — recordPollResult circuit breaker logic", () => {
  beforeEach(() => {
    mocks.findUniqueOrThrow.mockReset();
    mocks.update.mockReset();
    mocks.sourceHealthEvent.create.mockReset();
    mocks.sourceHealthEvent.create.mockResolvedValue({ id: "evt-1" });
  });

  it("resets consecutiveFails and closes circuit on success", async () => {
    const source = makeSource({ consecutiveFails: 3, circuitOpen: false });
    mocks.findUniqueOrThrow.mockResolvedValueOnce(source);
    mocks.update.mockResolvedValueOnce({ ...source, consecutiveFails: 0, circuitOpen: false });

    await recordPollResult("src-1", { success: true, latencyMs: 150, recordCount: 5 });

    const updateCall = mocks.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(updateCall.data.consecutiveFails).toBe(0);
    expect(updateCall.data.circuitOpen).toBe(false);
  });

  it("increments consecutiveFails on failure", async () => {
    const source = makeSource({ consecutiveFails: 2, circuitOpen: false });
    mocks.findUniqueOrThrow.mockResolvedValueOnce(source);
    mocks.update.mockResolvedValueOnce({ ...source, consecutiveFails: 3 });

    await recordPollResult("src-1", {
      success: false,
      errorMessage: "timeout",
      latencyMs: 5000,
    });

    const updateCall = mocks.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(updateCall.data.consecutiveFails).toBe(3);
  });

  it("opens circuit after 5 consecutive failures", async () => {
    const source = makeSource({ consecutiveFails: 4, circuitOpen: false });
    mocks.findUniqueOrThrow.mockResolvedValueOnce(source);
    mocks.update.mockResolvedValueOnce({ ...source, consecutiveFails: 5, circuitOpen: true });

    await recordPollResult("src-1", {
      success: false,
      errorMessage: "connection refused",
    });

    const updateCall = mocks.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(updateCall.data.circuitOpen).toBe(true);
    expect(updateCall.data.consecutiveFails).toBe(5);
  });

  it("does not re-open an already-open circuit on further failures", async () => {
    const source = makeSource({ consecutiveFails: 8, circuitOpen: true });
    mocks.findUniqueOrThrow.mockResolvedValueOnce(source);
    mocks.update.mockResolvedValueOnce({ ...source, consecutiveFails: 9, circuitOpen: true });

    await recordPollResult("src-1", { success: false, errorMessage: "still broken" });

    const updateCall = mocks.update.mock.calls[0][0] as { data: Record<string, unknown> };
    // circuitOpen stays true but no circuit_opened event fires (shouldOpenCircuit = false)
    expect(updateCall.data.circuitOpen).toBe(true);
  });

  it("skips poll if license not approved, returning early", async () => {
    const source = makeSource({ licenseApproved: false });
    mocks.findUniqueOrThrow.mockResolvedValueOnce(source);

    const returned = await recordPollResult("src-1", { success: true, recordCount: 10 });

    // No DB update should have been called
    expect(mocks.update).not.toHaveBeenCalled();
    expect(returned).toEqual(source);
  });
});
