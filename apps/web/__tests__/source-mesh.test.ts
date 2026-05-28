import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  findUniqueOrThrow: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  upsert: vi.fn(),
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
      upsert: mocks.upsert,
    },
    sourceHealthEvent: {
      create: mocks.sourceHealthEvent.create,
      findMany: mocks.sourceHealthEvent.findMany,
    },
  },
  Prisma: {},
}));

import { recordPollResult, registerSource, approveLicense } from "@/lib/source-mesh";

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

    const updateCall = mocks.update.mock.calls[0]![0]! as { data: Record<string, unknown> };
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

    const updateCall = mocks.update.mock.calls[0]![0]! as { data: Record<string, unknown> };
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

    const updateCall = mocks.update.mock.calls[0]![0]! as { data: Record<string, unknown> };
    expect(updateCall.data.circuitOpen).toBe(true);
    expect(updateCall.data.consecutiveFails).toBe(5);
  });

  it("does not re-open an already-open circuit on further failures", async () => {
    const source = makeSource({ consecutiveFails: 8, circuitOpen: true });
    mocks.findUniqueOrThrow.mockResolvedValueOnce(source);
    mocks.update.mockResolvedValueOnce({ ...source, consecutiveFails: 9, circuitOpen: true });

    await recordPollResult("src-1", { success: false, errorMessage: "still broken" });

    const updateCall = mocks.update.mock.calls[0]![0]! as { data: Record<string, unknown> };
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

describe("Source Mesh — registerSource", () => {
  beforeEach(() => {
    mocks.upsert.mockReset();
  });

  it("upserts source with licenseApproved=false by default", async () => {
    const source = makeSource({ slug: "new-source", licenseApproved: false, isActive: false });
    mocks.upsert.mockResolvedValueOnce(source);

    await registerSource({
      slug: "new-source",
      displayName: "New Source",
      tier: 2,
    });

    const call = mocks.upsert.mock.calls[0]![0]! as { create: Record<string, unknown> };
    expect(call.create.licenseApproved).toBe(false);
    expect(call.create.isActive).toBe(false);
  });

  it("registers with correct tier and display name", async () => {
    const source = makeSource({ slug: "espn-injuries", tier: 2 });
    mocks.upsert.mockResolvedValueOnce(source);

    await registerSource({
      slug: "espn-injuries",
      displayName: "ESPN Injuries",
      tier: 2,
      pollIntervalMs: 900_000,
    });

    const call = mocks.upsert.mock.calls[0]![0]! as { where: { slug: string }; create: Record<string, unknown> };
    expect(call.where.slug).toBe("espn-injuries");
    expect(call.create.displayName).toBe("ESPN Injuries");
    expect(call.create.tier).toBe(2);
    expect(call.create.pollIntervalMs).toBe(900_000);
  });
});

describe("Source Mesh — approveLicense", () => {
  beforeEach(() => {
    mocks.update.mockReset();
  });

  it("sets licenseApproved=true and isActive=true", async () => {
    const approved = makeSource({ licenseApproved: true, isActive: true });
    mocks.update.mockResolvedValueOnce(approved);

    await approveLicense("the-odds-api");

    const call = mocks.update.mock.calls[0]![0]! as { where: { slug: string }; data: Record<string, unknown> };
    expect(call.where.slug).toBe("the-odds-api");
    expect(call.data.licenseApproved).toBe(true);
    expect(call.data.isActive).toBe(true);
  });
});
