/** Defines the canonical pick populations shared by public performance surfaces. */
import type { Prisma } from "@prisma/client";

export const SEED_MODEL_VERSION = "v5.0.0-seed";

/**
 * EVERY SETTLED PICK (owner ruling R3, 2026-07-16): once performance stats are
 * public, a settled pick appears in the public W/L totals regardless of
 * snapshot-write success or learning eligibility. Snapshot capture is
 * MANDATORY AT MINT (process-sport.ts rolls back a pick whose snapshot fails),
 * so no snapshot-based narrowing is needed here — and none is allowed: adding
 * one would let an infrastructure failure silently drop a settled pick from
 * the published record. Only seed rows and bootstrap-era picks are excluded,
 * by design, because their data quality is uncalibrated.
 */
export const CANONICAL_SETTLED_PICK_WHERE = {
  result: { in: ["WIN", "LOSS", "PUSH"] },
  isPublished: true,
  isBootstrap: false,
  NOT: { modelVersion: SEED_MODEL_VERSION },
} satisfies Prisma.PickWhereInput;

export function canonicalSettledPickWhere(
  additional?: Prisma.PickWhereInput
): Prisma.PickWhereInput {
  return additional
    ? { AND: [CANONICAL_SETTLED_PICK_WHERE, additional] }
    : CANONICAL_SETTLED_PICK_WHERE;
}

export function canonicalPendingPickWhere(): Prisma.PickWhereInput {
  return {
    result: "PENDING",
    isPublished: true,
    isBootstrap: false,
    NOT: { modelVersion: SEED_MODEL_VERSION },
  };
}

export function recentPublishedPickWhere(since: Date): Prisma.PickWhereInput {
  return {
    generatedAt: { gte: since },
    isPublished: true,
    NOT: { modelVersion: SEED_MODEL_VERSION },
  };
}
