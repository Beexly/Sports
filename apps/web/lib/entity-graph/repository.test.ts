import { describe, expect, it } from "vitest";
import type { Entity, EntityEdge, EntityType } from "@prisma/client";
import {
  findEntity,
  linkEntities,
  neighbors,
  upsertEntity,
  type EntityGraphDb,
} from "./repository";

type EntityUpsertArgs = Parameters<EntityGraphDb["entity"]["upsert"]>[0];
type EdgeUpsertArgs = Parameters<EntityGraphDb["entityEdge"]["upsert"]>[0];
type EntityFindArgs = Parameters<EntityGraphDb["entity"]["findUnique"]>[0];
type EdgeFindManyArgs = Parameters<EntityGraphDb["entityEdge"]["findMany"]>[0];

type FakeState = {
  readonly entityUpserts: EntityUpsertArgs[];
  readonly edgeUpserts: EdgeUpsertArgs[];
  readonly entityLookups: EntityFindArgs[];
  readonly edgeLookups: EdgeFindManyArgs[];
  readonly entities: Map<string, Entity>;
  readonly edges: EntityEdge[];
  nextEntityId: number;
  nextEdgeId: number;
};

function makeEntity(
  state: FakeState,
  data: {
    id: string;
    entityType: EntityType;
    canonicalName: string;
    normalizedName: string;
    sport: string;
  },
): Entity {
  return {
    ...data,
    externalIds: null,
    sourceTier: 1,
    attributes: null,
    firstSeenAt: new Date("2026-01-01T00:00:00.000Z"),
    lastSeenAt: new Date("2026-01-01T00:00:00.000Z"),
    outgoingEdges: [],
    incomingEdges: [],
  } as Entity;
}

function makeEdge(
  state: FakeState,
  data: {
    id: string;
    fromEntityId: string;
    toEntityId: string;
    relation: string;
    observedAt: Date;
  },
): EntityEdge {
  return {
    ...data,
    sourceTier: 1,
    sourceRef: "test-source",
    validFrom: null,
    validTo: null,
    confidence: 50,
    metadata: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  } as EntityEdge;
}

function makeFakeDb(): { db: EntityGraphDb; state: FakeState } {
  const state: FakeState = {
    entityUpserts: [],
    edgeUpserts: [],
    entityLookups: [],
    edgeLookups: [],
    entities: new Map(),
    edges: [],
    nextEntityId: 1,
    nextEdgeId: 1,
  };

  const db: EntityGraphDb = {
    entity: {
      upsert: async (args) => {
        state.entityUpserts.push(args);
        const where = args.where.entity_type_normalized_name_sport;
        const existing = [...state.entities.values()].find(
          (entity) =>
            entity.entityType === where.entity_type &&
            entity.normalizedName === where.normalized_name &&
            entity.sport === where.sport,
        );
        if (existing) return existing;
        const created = makeEntity(state, {
          id: `entity-${state.nextEntityId++}`,
          entityType: args.create.entityType,
          canonicalName: args.create.canonicalName,
          normalizedName: args.create.normalizedName,
          sport: args.create.sport,
        });
        state.entities.set(created.id, created);
        return created;
      },
      findUnique: async (args) => {
        state.entityLookups.push(args);
        const where = args.where.entity_type_normalized_name_sport;
        return (
          [...state.entities.values()].find(
            (entity) =>
              entity.entityType === where.entity_type &&
              entity.normalizedName === where.normalized_name &&
              entity.sport === where.sport,
          ) ?? null
        );
      },
    },
    entityEdge: {
      upsert: async (args) => {
        state.edgeUpserts.push(args);
        const where = args.where.from_entity_id_relation_to_entity_id_observed_at;
        const existing = state.edges.find(
          (edge) =>
            edge.fromEntityId === where.from_entity_id &&
            edge.relation === where.relation &&
            edge.toEntityId === where.to_entity_id &&
            edge.observedAt.getTime() === where.observed_at.getTime(),
        );
        if (existing) return existing;
        const created = makeEdge(state, {
          id: `edge-${state.nextEdgeId++}`,
          fromEntityId: args.create.fromEntityId,
          toEntityId: args.create.toEntityId,
          relation: args.create.relation,
          observedAt: args.create.observedAt,
        });
        state.edges.push(created);
        return created;
      },
      findMany: async (args) => {
        state.edgeLookups.push(args);
        return state.edges
          .filter((edge) => {
            if (args.where.from_entity_id !== undefined && edge.fromEntityId !== args.where.from_entity_id) {
              return false;
            }
            if (args.where.to_entity_id !== undefined && edge.toEntityId !== args.where.to_entity_id) {
              return false;
            }
            return args.where.relation === undefined || edge.relation === args.where.relation;
          })
          .slice(0, args.take);
      },
    },
  };

  return { db, state };
}

describe("entity graph repository", () => {
  it("uses an empty sport when omitted", async () => {
    const { db, state } = makeFakeDb();

    await upsertEntity(
      { entityType: "player", canonicalName: "Patrick Mahomes", sourceTier: 1 },
      db,
    );

    expect(state.entityUpserts[0]?.where.entity_type_normalized_name_sport.sport).toBe("");
    expect(state.entityUpserts[0]?.create.sport).toBe("");
  });

  it("converges equivalent names on the same normalized key", async () => {
    const { db, state } = makeFakeDb();

    const first = await upsertEntity(
      { entityType: "player", canonicalName: "A.J. Brown", sourceTier: 1 },
      db,
    );
    const second = await upsertEntity(
      { entityType: "player", canonicalName: "AJ Brown", sourceTier: 1 },
      db,
    );

    expect(first.normalizedName).toBe("aj brown");
    expect(second.normalizedName).toBe(first.normalizedName);
    expect(state.entities.size).toBe(1);
  });

  it.each(["", "   "])("rejects an empty source reference (%j)", async (sourceRef) => {
    const { db } = makeFakeDb();

    await expect(
      linkEntities(
        {
          fromEntityId: "from",
          toEntityId: "to",
          relation: "plays",
          sourceTier: 1,
          sourceRef,
          observedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        db,
      ),
    ).rejects.toThrow(/sourceRef/);
  });

  it("rejects a non-finite source tier", async () => {
    const { db } = makeFakeDb();

    await expect(
      linkEntities(
        {
          fromEntityId: "from",
          toEntityId: "to",
          relation: "plays",
          sourceTier: Number.NaN,
          sourceRef: "source",
          observedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        db,
      ),
    ).rejects.toThrow(/sourceTier/);
  });

  it("clamps confidence to the database range", async () => {
    const { db, state } = makeFakeDb();
    const observedAt = new Date("2026-01-01T00:00:00.000Z");

    await linkEntities(
      {
        fromEntityId: "from",
        toEntityId: "to",
        relation: "plays",
        sourceTier: 1,
        sourceRef: "source-high",
        observedAt,
        confidence: 150,
      },
      db,
    );
    await linkEntities(
      {
        fromEntityId: "from",
        toEntityId: "to",
        relation: "plays",
        sourceTier: 1,
        sourceRef: "source-low",
        observedAt,
        confidence: -5,
      },
      db,
    );

    expect(state.edgeUpserts[0]?.create.confidence).toBe(100);
    expect(state.edgeUpserts[1]?.create.confidence).toBe(0);
  });

  it("defaults confidence to 50", async () => {
    const { db, state } = makeFakeDb();

    await linkEntities(
      {
        fromEntityId: "from",
        toEntityId: "to",
        relation: "plays",
        sourceTier: 1,
        sourceRef: "source",
        observedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      db,
    );

    expect(state.edgeUpserts[0]?.create.confidence).toBe(50);
  });

  it("normalizes names before lookup", async () => {
    const { db, state } = makeFakeDb();

    await findEntity("player", "A.J. Brown", "", db);

    expect(state.entityLookups[0]?.where.entity_type_normalized_name_sport.normalized_name).toBe(
      "aj brown",
    );
  });

  it("caps the neighbor limit at 500", async () => {
    const { db, state } = makeFakeDb();

    await neighbors("entity-1", { limit: 9999 }, db);

    expect(state.edgeLookups[0]?.take).toBe(500);
  });

  it("queries only the outgoing side for direction out", async () => {
    const { db, state } = makeFakeDb();

    await neighbors("entity-1", { direction: "out" }, db);

    expect(state.edgeLookups[0]?.where).toEqual({ from_entity_id: "entity-1" });
  });
});
