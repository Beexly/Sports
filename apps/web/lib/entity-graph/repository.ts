import { db as defaultDb } from "@sports/db";
import type { Entity, EntityEdge, EntityType } from "@prisma/client";
import { normalizeEntityName } from "./normalize";

const DEFAULT_SPORT = "";
const DEFAULT_CONFIDENCE = 50;
const DEFAULT_NEIGHBOR_LIMIT = 100;
const MAX_NEIGHBOR_LIMIT = 500;

type EntityKey = {
  readonly entity_type: EntityType;
  readonly normalized_name: string;
  readonly sport: string;
};

type EntityCreateData = {
  readonly entityType: EntityType;
  readonly canonicalName: string;
  readonly normalizedName: string;
  readonly sport: string;
  readonly externalIds?: Record<string, string>;
  readonly sourceTier: number;
  readonly attributes?: Record<string, unknown>;
  readonly firstSeenAt: Date;
  readonly lastSeenAt: Date;
};

type EntityUpdateData = {
  readonly canonicalName: string;
  readonly externalIds?: Record<string, string>;
  readonly sourceTier: number;
  readonly attributes?: Record<string, unknown>;
  readonly lastSeenAt: Date;
};

type EntityUpsertArgs = {
  readonly where: { readonly entity_type_normalized_name_sport: EntityKey };
  readonly create: EntityCreateData;
  readonly update: EntityUpdateData;
};

type EntityFindArgs = {
  readonly where: { readonly entity_type_normalized_name_sport: EntityKey };
};

type EdgeKey = {
  readonly from_entity_id: string;
  readonly relation: string;
  readonly to_entity_id: string;
  readonly observed_at: Date;
};

type EdgeCreateData = {
  readonly fromEntityId: string;
  readonly toEntityId: string;
  readonly relation: string;
  readonly sourceTier: number;
  readonly sourceRef: string;
  readonly observedAt: Date;
  readonly validFrom: Date | null;
  readonly validTo: Date | null;
  readonly confidence: number;
};

type EdgeUpdateData = EdgeCreateData;

type EdgeUpsertArgs = {
  readonly where: { readonly from_entity_id_relation_to_entity_id_observed_at: EdgeKey };
  readonly create: EdgeCreateData;
  readonly update: EdgeUpdateData;
};

type EdgeFindWhere =
  | { readonly from_entity_id: string; readonly relation?: string }
  | { readonly to_entity_id: string; readonly relation?: string }
  | {
      readonly OR: readonly (
        | { readonly from_entity_id: string }
        | { readonly to_entity_id: string }
      )[];
      readonly relation?: string;
    };

type EdgeFindManyArgs = {
  readonly where: EdgeFindWhere;
  readonly take: number;
};

/** The small Prisma surface needed by the entity graph repository. */
export interface EntityGraphDb {
  readonly entity: {
    readonly upsert: (args: EntityUpsertArgs) => Promise<Entity>;
    readonly findUnique: (args: EntityFindArgs) => Promise<Entity | null>;
  };
  readonly entityEdge: {
    readonly upsert: (args: EdgeUpsertArgs) => Promise<EntityEdge>;
    readonly findMany: (args: EdgeFindManyArgs) => Promise<readonly EntityEdge[]>;
  };
}

export interface EntityInput {
  readonly entityType: EntityType;
  readonly canonicalName: string;
  readonly sport?: string;
  readonly externalIds?: Record<string, string>;
  readonly sourceTier: number;
  readonly attributes?: Record<string, unknown>;
  readonly observedAt?: Date;
}

export interface EntityLinkInput {
  readonly fromEntityId: string;
  readonly toEntityId: string;
  readonly relation: string;
  readonly sourceTier: number;
  readonly sourceRef: string;
  readonly observedAt: Date;
  readonly confidence?: number;
  readonly validFrom?: Date | null;
  readonly validTo?: Date | null;
}

export interface EntityNeighborOptions {
  readonly relation?: string;
  readonly direction?: "out" | "in" | "both";
  readonly limit?: number;
}

export async function upsertEntity(
  input: EntityInput,
  db: EntityGraphDb = defaultDb as unknown as EntityGraphDb,
): Promise<{ id: string; normalizedName: string }> {
  const normalizedName = normalizeEntityName(input.canonicalName);
  const sport = input.sport ?? DEFAULT_SPORT;
  const observedAt = input.observedAt ?? new Date();
  const externalIds = input.externalIds;
  const attributes = input.attributes;

  const entity = await db.entity.upsert({
    where: {
      entity_type_normalized_name_sport: {
        entity_type: input.entityType,
        normalized_name: normalizedName,
        sport,
      },
    },
    create: {
      entityType: input.entityType,
      canonicalName: input.canonicalName,
      normalizedName,
      sport,
      ...(externalIds === undefined ? {} : { externalIds }),
      sourceTier: input.sourceTier,
      ...(attributes === undefined ? {} : { attributes }),
      firstSeenAt: observedAt,
      lastSeenAt: observedAt,
    },
    update: {
      canonicalName: input.canonicalName,
      ...(externalIds === undefined ? {} : { externalIds }),
      sourceTier: input.sourceTier,
      ...(attributes === undefined ? {} : { attributes }),
      lastSeenAt: observedAt,
    },
  });

  return { id: entity.id, normalizedName };
}

export async function linkEntities(
  input: EntityLinkInput,
  db: EntityGraphDb = defaultDb as unknown as EntityGraphDb,
): Promise<void> {
  if (input.sourceRef.trim().length === 0) {
    throw new Error("linkEntities requires a non-empty sourceRef");
  }
  if (!Number.isFinite(input.sourceTier)) {
    throw new Error("linkEntities requires a finite sourceTier");
  }

  const sourceRef = input.sourceRef.trim();
  const confidence = clampConfidence(input.confidence);
  const edgeData: EdgeCreateData = {
    fromEntityId: input.fromEntityId,
    toEntityId: input.toEntityId,
    relation: input.relation,
    sourceTier: input.sourceTier,
    sourceRef,
    observedAt: input.observedAt,
    validFrom: input.validFrom ?? null,
    validTo: input.validTo ?? null,
    confidence,
  };

  await db.entityEdge.upsert({
    where: {
      from_entity_id_relation_to_entity_id_observed_at: {
        from_entity_id: input.fromEntityId,
        relation: input.relation,
        to_entity_id: input.toEntityId,
        observed_at: input.observedAt,
      },
    },
    create: edgeData,
    update: edgeData,
  });
}

export async function findEntity(
  entityType: EntityType,
  name: string,
  sport = DEFAULT_SPORT,
  db: EntityGraphDb = defaultDb as unknown as EntityGraphDb,
): Promise<Entity | null> {
  return db.entity.findUnique({
    where: {
      entity_type_normalized_name_sport: {
        entity_type: entityType,
        normalized_name: normalizeEntityName(name),
        sport: sport ?? DEFAULT_SPORT,
      },
    },
  });
}

export async function neighbors(
  entityId: string,
  opts: EntityNeighborOptions = {},
  db: EntityGraphDb = defaultDb as unknown as EntityGraphDb,
): Promise<readonly EntityEdge[]> {
  const direction = opts.direction ?? "both";
  const take = clampLimit(opts.limit);
  const relation = opts.relation;

  let where: EdgeFindWhere;
  if (direction === "out") {
    where = {
      from_entity_id: entityId,
      ...(relation === undefined ? {} : { relation }),
    };
  } else if (direction === "in") {
    where = {
      to_entity_id: entityId,
      ...(relation === undefined ? {} : { relation }),
    };
  } else {
    where = {
      OR: [{ from_entity_id: entityId }, { to_entity_id: entityId }],
      ...(relation === undefined ? {} : { relation }),
    };
  }

  return db.entityEdge.findMany({ where, take });
}

function clampConfidence(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_CONFIDENCE;
  return Math.min(100, Math.max(0, value));
}

function clampLimit(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_NEIGHBOR_LIMIT;
  return Math.min(MAX_NEIGHBOR_LIMIT, Math.max(0, Math.floor(value)));
}
