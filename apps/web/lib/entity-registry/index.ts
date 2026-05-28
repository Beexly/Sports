/**
 * Entity Registry Service (ADR 006)
 *
 * Canonical entity store for players, teams, games, markets, and leagues.
 * All EvidenceItem, Pick, and GameSignal rows reference entity slugs from
 * this registry. EntityRef provides the mapping from external source IDs
 * (e.g. ESPN player ID "3139477") to our canonical entity.
 *
 * Design: upsert-based. Inserting the same slug twice is idempotent.
 * External ID resolution is cached in EntityRef so the mesh doesn't need
 * to re-resolve on every poll.
 */

import { db as prisma, Prisma } from "@sports/db";
import type { Entity, EntityRef } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────

export type EntityType = "player" | "team" | "game" | "market" | "league" | "coach";

export interface EntityUpsert {
  slug: string;
  entityType: EntityType;
  displayName: string;
  sport?: string;
  league?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

export interface EntityRefUpsert {
  entityId: string;
  sourceId: string;
  externalId: string;
}

export type EntityWithRefs = Entity & { refs: EntityRef[] };

// ── Write ─────────────────────────────────────────────────────────────────

export async function upsertEntity(input: EntityUpsert): Promise<Entity> {
  return prisma.entity.upsert({
    where: { slug: input.slug },
    create: {
      slug: input.slug,
      entityType: input.entityType,
      displayName: input.displayName,
      sport: input.sport,
      league: input.league,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      isActive: input.isActive ?? true,
    },
    update: {
      displayName: input.displayName,
      sport: input.sport,
      league: input.league,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      isActive: input.isActive ?? true,
    },
  });
}

export async function upsertEntityRef(input: EntityRefUpsert): Promise<EntityRef> {
  return prisma.entityRef.upsert({
    where: {
      sourceId_externalId: {
        sourceId: input.sourceId,
        externalId: input.externalId,
      },
    },
    create: {
      entityId: input.entityId,
      sourceId: input.sourceId,
      externalId: input.externalId,
    },
    update: {
      entityId: input.entityId,
    },
  });
}

/** Deactivate an entity (soft delete). */
export async function deactivateEntity(slug: string): Promise<Entity> {
  return prisma.entity.update({
    where: { slug },
    data: { isActive: false },
  });
}

// ── Read ──────────────────────────────────────────────────────────────────

export async function getEntityBySlug(slug: string): Promise<EntityWithRefs | null> {
  return prisma.entity.findUnique({
    where: { slug },
    include: { refs: true },
  });
}

/** Resolve a source's external ID to our canonical Entity. */
export async function resolveExternalId(
  sourceId: string,
  externalId: string,
): Promise<Entity | null> {
  const ref = await prisma.entityRef.findUnique({
    where: { sourceId_externalId: { sourceId, externalId } },
    include: { entity: true },
  });
  return ref?.entity ?? null;
}

export async function listEntitiesByType(
  entityType: EntityType,
  sport?: string,
): Promise<Entity[]> {
  return prisma.entity.findMany({
    where: {
      entityType,
      isActive: true,
      ...(sport ? { sport } : {}),
    },
    orderBy: { displayName: "asc" },
  });
}

/** Search entities by display name prefix. */
export async function searchEntities(
  query: string,
  entityType?: EntityType,
  limit = 20,
): Promise<Entity[]> {
  return prisma.entity.findMany({
    where: {
      isActive: true,
      displayName: { contains: query, mode: "insensitive" },
      ...(entityType ? { entityType } : {}),
    },
    take: limit,
    orderBy: { displayName: "asc" },
  });
}
