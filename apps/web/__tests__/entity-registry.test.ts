import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@sports/db", () => ({
  db: {
    entity: {
      upsert: mocks.upsert,
      findUnique: mocks.findUnique,
      findMany: mocks.findMany,
      update: mocks.update,
    },
    entityRef: {
      upsert: mocks.upsert,
      findFirst: mocks.findFirst,
      findUnique: mocks.findFirst,
    },
  },
  Prisma: {},
}));

import {
  upsertEntity,
  getEntityBySlug,
  resolveExternalId,
  searchEntities,
} from "@/lib/entity-registry";

function makeEntity(overrides: Record<string, unknown> = {}) {
  return {
    id: "ent-1",
    slug: "patrick-mahomes",
    entityType: "player",
    displayName: "Patrick Mahomes",
    sport: "NFL",
    league: "NFL",
    metadata: {},
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    refs: [],
    ...overrides,
  };
}

describe("Entity Registry", () => {
  beforeEach(() => {
    mocks.upsert.mockReset();
    mocks.findUnique.mockReset();
    mocks.findFirst.mockReset();
    mocks.findMany.mockReset();
    mocks.update.mockReset();
  });

  it("upsertEntity calls DB upsert with correct slug and type", async () => {
    const entity = makeEntity();
    mocks.upsert.mockResolvedValueOnce(entity);

    await upsertEntity({
      slug: "patrick-mahomes",
      entityType: "player",
      displayName: "Patrick Mahomes",
      sport: "NFL",
      league: "NFL",
    });

    const call = mocks.upsert.mock.calls[0]![0]! as { where: { slug: string } };
    expect(call.where.slug).toBe("patrick-mahomes");
  });

  it("getEntityBySlug returns null for missing entity", async () => {
    mocks.findUnique.mockResolvedValueOnce(null);
    const result = await getEntityBySlug("missing-entity");
    expect(result).toBeNull();
  });

  it("getEntityBySlug returns entity with refs when found", async () => {
    const entity = makeEntity({ refs: [{ id: "ref-1", entityId: "ent-1", sourceId: "espn", externalId: "12345", createdAt: new Date() }] });
    mocks.findUnique.mockResolvedValueOnce(entity);

    const result = await getEntityBySlug("patrick-mahomes");
    expect(result?.slug).toBe("patrick-mahomes");
    expect(result?.refs).toHaveLength(1);
  });

  it("resolveExternalId returns null when no ref found", async () => {
    mocks.findFirst.mockResolvedValueOnce(null);
    const result = await resolveExternalId("espn", "unknown-id");
    expect(result).toBeNull();
  });

  it("searchEntities returns matching entities", async () => {
    const entities = [makeEntity(), makeEntity({ slug: "travis-kelce", displayName: "Travis Kelce" })];
    mocks.findMany.mockResolvedValueOnce(entities);

    const result = await searchEntities("mahomes", "player");
    expect(result).toHaveLength(2);
  });
});
