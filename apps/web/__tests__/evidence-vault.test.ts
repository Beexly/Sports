import { describe, it, expect, vi } from "vitest";

// The public-safe logic: tier 1-2 + non-rumor/non-sharp_action = true
// Tested here by checking the insertEvidenceItem behavior via mock inspection.

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  findMany: vi.fn(),
  findFirst: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("@sports/db", () => ({
  db: {
    evidenceItem: {
      create: mocks.create,
      findMany: mocks.findMany,
      findFirst: mocks.findFirst,
      updateMany: mocks.updateMany,
    },
  },
  Prisma: {
    InputJsonValue: {},
  },
}));

import { beforeEach } from "vitest";
import { insertEvidenceItem, lookupEvidence, latestEvidence, type EvidenceInsert } from "@/lib/evidence-vault";

function baseInsert(overrides: Partial<EvidenceInsert> = {}): EvidenceInsert {
  return {
    sourceId: "the-odds-api",
    sourceTier: 1,
    entityType: "game",
    entityId: "game-123",
    claimType: "odds_snapshot",
    observedAt: new Date("2026-05-28T10:00:00Z"),
    content: { spread: -3.5, total: 47.5 },
    ttlSeconds: 1800,
    confidence: 1.0,
    ...overrides,
  };
}

describe("Evidence Vault — public-safety gate logic", () => {
  beforeEach(() => {
    mocks.create.mockReset();
  });

  it("sets publicSafe=true for tier-1 odds_snapshot", async () => {
    mocks.create.mockResolvedValueOnce({ id: "ev-1", publicSafe: true });
    await insertEvidenceItem(baseInsert({ sourceTier: 1, claimType: "odds_snapshot" }));
    const call = mocks.create.mock.calls[0]![0]! as { data: { publicSafe: boolean } };
    expect(call.data.publicSafe).toBe(true);
  });

  it("sets publicSafe=true for tier-2 injury_status", async () => {
    mocks.create.mockResolvedValueOnce({ id: "ev-2", publicSafe: true });
    await insertEvidenceItem(baseInsert({ sourceTier: 2, claimType: "injury_status" }));
    const call = mocks.create.mock.calls[0]![0]! as { data: { publicSafe: boolean } };
    expect(call.data.publicSafe).toBe(true);
  });

  it("sets publicSafe=false for tier-3+ evidence", async () => {
    mocks.create.mockResolvedValueOnce({ id: "ev-3", publicSafe: false });
    await insertEvidenceItem(baseInsert({ sourceTier: 3 as const, claimType: "odds_snapshot" }));
    const call = mocks.create.mock.calls[0]![0]! as { data: { publicSafe: boolean } };
    expect(call.data.publicSafe).toBe(false);
  });

  it("sets publicSafe=false for tier-1 rumor", async () => {
    mocks.create.mockResolvedValueOnce({ id: "ev-4", publicSafe: false });
    await insertEvidenceItem(baseInsert({ sourceTier: 1, claimType: "rumor" }));
    const call = mocks.create.mock.calls[0]![0]! as { data: { publicSafe: boolean } };
    expect(call.data.publicSafe).toBe(false);
  });

  it("sets publicSafe=false for tier-1 sharp_action", async () => {
    mocks.create.mockResolvedValueOnce({ id: "ev-5", publicSafe: false });
    await insertEvidenceItem(baseInsert({ sourceTier: 1, claimType: "sharp_action" }));
    const call = mocks.create.mock.calls[0]![0]! as { data: { publicSafe: boolean } };
    expect(call.data.publicSafe).toBe(false);
  });

  it("sets publicSafe=true for tier-2 line_movement", async () => {
    mocks.create.mockResolvedValueOnce({ id: "ev-6", publicSafe: true });
    await insertEvidenceItem(baseInsert({ sourceTier: 2, claimType: "line_movement" }));
    const call = mocks.create.mock.calls[0]![0]! as { data: { publicSafe: boolean } };
    expect(call.data.publicSafe).toBe(true);
  });
});

describe("Evidence Vault — insert data shape", () => {
  beforeEach(() => {
    mocks.create.mockReset();
  });

  it("passes sourceId, sourceTier, entityType, entityId, claimType to DB", async () => {
    mocks.create.mockResolvedValueOnce({ id: "ev-7" });
    await insertEvidenceItem(baseInsert({ sourceId: "espn", sourceTier: 2, entityId: "player-42", entityType: "player", claimType: "injury_status" }));
    const call = mocks.create.mock.calls[0]![0]! as { data: Record<string, unknown> };
    expect(call.data.sourceId).toBe("espn");
    expect(call.data.sourceTier).toBe(2);
    expect(call.data.entityType).toBe("player");
    expect(call.data.entityId).toBe("player-42");
    expect(call.data.claimType).toBe("injury_status");
  });
});

describe("Evidence Vault — lookupEvidence", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
  });

  it("returns matching items from DB", async () => {
    const items = [
      { id: "ev-8", entityId: "game-1", entityType: "game", claimType: "odds_snapshot" },
      { id: "ev-9", entityId: "game-1", entityType: "game", claimType: "odds_snapshot" },
    ];
    mocks.findMany.mockResolvedValueOnce(items);

    const result = await lookupEvidence({ entityType: "game", entityId: "game-1" });
    expect(result).toHaveLength(2);
  });

  it("returns empty array when no items match", async () => {
    mocks.findMany.mockResolvedValueOnce([]);
    const result = await lookupEvidence({ entityType: "player", entityId: "player-999" });
    expect(result).toEqual([]);
  });
});

describe("Evidence Vault — latestEvidence", () => {
  beforeEach(() => {
    mocks.findFirst.mockReset();
  });

  it("returns the latest non-expired item", async () => {
    const item = { id: "ev-10", entityId: "game-1", claimType: "odds_snapshot", publicSafe: true };
    mocks.findFirst.mockResolvedValueOnce(item);

    const result = await latestEvidence("game-1", "odds_snapshot");
    expect(result?.id).toBe("ev-10");
  });

  it("returns null when no item found", async () => {
    mocks.findFirst.mockResolvedValueOnce(null);
    const result = await latestEvidence("game-999", "odds_snapshot");
    expect(result).toBeNull();
  });
});
